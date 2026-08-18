import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { AuthRequest, assertNgoAccess, currentUserNgo } from '../middleware/auth.middleware';
import {
  handler, badRequest, notFound, forbidden,
  requireString, optionalString, requireAmount
} from '../lib/http';
import { logAudit } from '../lib/audit';
import { notifyNgoOwner } from '../services/notification.service';
import { recomputeScores } from '../services/scoring.service';
import { BlockchainService, GENESIS_HASH } from '../services/blockchain.service';
import { CAUSE_CATEGORIES } from './ngoAssets.controller';

const prisma = new PrismaClient();

/** Retries for the rare case where two donations race for the same block number. */
const BLOCK_WRITE_ATTEMPTS = 5;

function newTxnId(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  // 48 bits of randomness — a collision needs ~17 million donations in one day.
  return `TXN-${stamp}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

export const DonationController = {
  /**
   * Starts a donation.
   *
   * The record is created as PENDING and the organisation's UPI details are
   * returned so the donor can pay. Nothing is treated as money received until
   * the donor comes back with a reference — a claim of payment is not payment.
   */
  create: handler(async (req: AuthRequest, res: Response) => {
    const ngoId = requireString(req.body?.ngoId, 'Organisation', 100);
    const amount = requireAmount(req.body?.amount, 'Donation amount');
    const category = optionalString(req.body?.category, 60) ?? 'Other';

    if (!CAUSE_CATEGORIES.includes(category as any)) {
      throw badRequest(`Choose a cause from: ${CAUSE_CATEGORIES.join(', ')}.`);
    }

    const ngo = await prisma.nGO.findUnique({
      where: { id: ngoId },
      include: { paymentDetails: true }
    });

    if (!ngo) throw notFound('That organisation could not be found.');
    if (ngo.status !== 'VERIFIED') {
      throw badRequest('This organisation is not verified yet, so it cannot receive donations.');
    }

    // A project is optional: a donor may give to a cause instead.
    const projectId = optionalString(req.body?.projectId, 100);
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw notFound('That project could not be found.');
      if (project.ngoId !== ngoId) throw badRequest('That project belongs to another organisation.');
    }

    if (!ngo.paymentDetails?.upiId && !ngo.paymentDetails?.qrCodePath) {
      throw badRequest('This organisation has not added payment details yet, so it cannot accept donations.');
    }

    const donation = await prisma.donation.create({
      data: {
        donorId: req.user!.id,
        ngoId,
        projectId: projectId ?? null,
        amount,
        category,
        purpose: optionalString(req.body?.purpose, 300) ?? category,
        paymentMethod: optionalString(req.body?.paymentMethod, 20)?.toUpperCase() ?? 'UPI',
        paymentStatus: 'PENDING',
        txnId: newTxnId()
      }
    });

    await logAudit(req.user!.id, req.user!.role, 'DONATION_STARTED', 'Money', donation.id,
      `₹${amount} pledged to ${ngo.name} for ${category}`);

    return res.status(201).json({
      donation,
      payTo: {
        ngoName: ngo.name,
        upiId: ngo.paymentDetails.upiId,
        qrCodeAvailable: Boolean(ngo.paymentDetails.qrCodePath),
        qrCodeUrl: ngo.paymentDetails.qrCodePath ? `/api/ngos/${ngo.id}/qr` : null
      },
      instructions: 'Pay using the UPI ID or QR code, then enter your UPI reference number to confirm.'
    });
  }),

  /**
   * Confirms a pending donation with the donor's UPI reference, and appends it
   * to the record chain. The block is written only now, so the ledger contains
   * completed donations rather than intentions.
   */
  confirm: handler(async (req: AuthRequest, res: Response) => {
    const referenceId = requireString(req.body?.referenceId, 'UPI reference number', 60);
    if (referenceId.length < 6) {
      throw badRequest('That reference number looks too short. Check your payment app.');
    }

    const donation = await prisma.donation.findUnique({
      where: { id: req.params.id },
      include: { ngo: { select: { id: true, name: true } } }
    });

    if (!donation) throw notFound('That donation could not be found.');
    if (donation.donorId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw forbidden('You can only confirm your own donations.');
    }
    if (donation.paymentStatus === 'SUCCESSFUL') {
      throw badRequest('This donation has already been confirmed.');
    }

    const duplicate = await prisma.donation.findFirst({
      where: { referenceId, paymentStatus: 'SUCCESSFUL', id: { not: donation.id } },
      select: { id: true }
    });
    if (duplicate) throw badRequest('That reference number has already been used.');

    let blockNumber = 0;

    for (let attempt = 0; attempt < BLOCK_WRITE_ATTEMPTS; attempt++) {
      try {
        blockNumber = await prisma.$transaction(async tx => {
          const latest = await tx.blockchainBlock.findFirst({
            orderBy: { blockNumber: 'desc' },
            select: { blockNumber: true, currentHash: true }
          });

          const nextNumber = (latest?.blockNumber ?? 0) + 1;
          const prevHash = latest?.currentHash ?? GENESIS_HASH;
          const timestamp = new Date();

          const currentHash = BlockchainService.calculateHash({
            blockNumber: nextNumber,
            prevHash,
            txnId: donation.txnId,
            amount: donation.amount,
            donorId: donation.donorId,
            ngoId: donation.ngoId,
            projectId: donation.projectId ?? '',
            timestamp
          });

          const block = await tx.blockchainBlock.create({
            data: {
              blockNumber: nextNumber,
              prevHash,
              currentHash,
              txnId: donation.txnId,
              amount: donation.amount,
              donorId: donation.donorId,
              ngoId: donation.ngoId,
              projectId: donation.projectId,
              timestamp
            }
          });

          await tx.donation.update({
            where: { id: donation.id },
            data: {
              paymentStatus: 'SUCCESSFUL',
              referenceId,
              blockId: block.id,
              date: timestamp
            }
          });

          return nextNumber;
        });
        break;
      } catch (err) {
        const isRace = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!isRace || attempt === BLOCK_WRITE_ATTEMPTS - 1) throw err;
      }
    }

    await logAudit(req.user!.id, req.user!.role, 'DONATION_CONFIRMED', 'Money', donation.id,
      `₹${donation.amount} to ${donation.ngo.name} confirmed (ref ${referenceId})`);

    await notifyNgoOwner(donation.ngoId, 'You received a donation',
      `₹${donation.amount.toLocaleString('en-IN')} was donated for ${donation.category}.`,
      'SUCCESS', '/ngo/donations');

    await recomputeScores(donation.ngoId);

    const updated = await prisma.donation.findUnique({
      where: { id: donation.id },
      include: { block: { select: { blockNumber: true, currentHash: true } } }
    });

    return res.json({ donation: updated, blockNumber, message: 'Thank you. Your donation is recorded.' });
  }),

  /** Donation history. Donors see their own; organisations see money received. */
  list: handler(async (req: AuthRequest, res: Response) => {
    const { ngoId, projectId, status } = req.query;
    const where: any = {};

    if (typeof projectId === 'string' && projectId) where.projectId = projectId;
    if (typeof status === 'string' && status) where.paymentStatus = status.toUpperCase();

    if (req.user?.role === 'ADMIN') {
      if (typeof ngoId === 'string' && ngoId) where.ngoId = ngoId;
    } else if (req.user?.role === 'NGO') {
      const owned = await currentUserNgo(req);
      if (!owned) return res.json([]);
      where.ngoId = owned.id;
    } else {
      where.donorId = req.user!.id;
    }

    const donations = await prisma.donation.findMany({
      where,
      include: {
        ngo: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
        donor: req.user?.role === 'DONOR' ? false : { select: { id: true, name: true } },
        block: { select: { blockNumber: true, currentHash: true } }
      },
      orderBy: { date: 'desc' },
      take: 200
    });

    return res.json(donations);
  })
};

export const ExpenseController = {
  create: handler(async (req: AuthRequest, res: Response) => {
    const owned = req.body?.ngoId
      ? await assertNgoAccess(req, res, requireString(req.body.ngoId, 'Organisation', 100))
      : await currentUserNgo(req);

    if (!owned) {
      if (!res.headersSent) throw badRequest('Set up your organisation profile first.');
      return;
    }

    const projectId = requireString(req.body?.projectId, 'Project', 100);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw notFound('That project could not be found.');
    if (project.ngoId !== owned.id) throw forbidden('That project belongs to a different organisation.');

    const expense = await prisma.expense.create({
      data: {
        ngoId: owned.id,
        projectId,
        category: requireString(req.body?.category, 'Category', 120),
        amount: requireAmount(req.body?.amount, 'Amount'),
        description: requireString(req.body?.description, 'What it was spent on', 1000),
        receiptUrl: optionalString(req.body?.receiptUrl, 500),
        approvedBy: req.user!.name
      }
    });

    await logAudit(req.user!.id, req.user!.role, 'ADD_EXPENSE', 'Money', expense.id,
      `₹${expense.amount} recorded for ${project.title}`);
    await recomputeScores(owned.id);

    return res.status(201).json(expense);
  }),

  list: handler(async (req: AuthRequest, res: Response) => {
    const { ngoId, projectId } = req.query;
    const where: any = {};
    if (typeof ngoId === 'string' && ngoId) where.ngoId = ngoId;
    if (typeof projectId === 'string' && projectId) where.projectId = projectId;

    // Expense records are public for verified organisations — that is the
    // transparency the platform exists to provide.
    if (!where.ngoId && !where.projectId) {
      const owned = await currentUserNgo(req);
      if (owned) where.ngoId = owned.id;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { project: { select: { id: true, title: true } } },
      orderBy: { date: 'desc' },
      take: 300
    });

    return res.json(expenses);
  })
};

export const LedgerController = {
  /** The full public chain, newest last. */
  getChain: handler(async (_req: AuthRequest, res: Response) => {
    const blocks = await prisma.blockchainBlock.findMany({
      include: {
        ngo: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
        donation: { select: { purpose: true, txnId: true } }
      },
      orderBy: { blockNumber: 'asc' }
    });

    return res.json(blocks);
  }),

  /** Re-hashes every block and checks each link to the one before it. */
  verifyChain: handler(async (req: AuthRequest, res: Response) => {
    const blocks = await prisma.blockchainBlock.findMany({ orderBy: { blockNumber: 'asc' } });
    const verification = BlockchainService.verifyChainIntegrity(blocks);

    await logAudit(req.user?.id, req.user?.role ?? 'PUBLIC', 'VERIFY_LEDGER', 'Ledger', null,
      `Checked ${blocks.length} records: ${verification.isValid ? 'all intact' : 'PROBLEM FOUND'}`);

    return res.json({ totalBlocks: blocks.length, ...verification });
  })
};

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
   * Records a donation and appends it to the hash chain.
   *
   * The block number is read and written inside one transaction, so two
   * simultaneous donations cannot claim the same slot and fork the chain.
   */
  create: handler(async (req: AuthRequest, res: Response) => {
    const ngoId = requireString(req.body?.ngoId, 'Organisation', 100);
    const projectId = requireString(req.body?.projectId, 'Project', 100);
    const amount = requireAmount(req.body?.amount, 'Donation amount');

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { ngo: { select: { id: true, name: true, status: true } } }
    });

    if (!project) throw notFound('That project could not be found.');
    if (project.ngoId !== ngoId) throw badRequest('That project does not belong to the chosen organisation.');
    if (project.ngo.status !== 'VERIFIED') {
      throw badRequest('This organisation is not verified yet, so it cannot receive donations.');
    }

    // The donor is always the signed-in account. No guessing, no placeholder ids.
    const donorId = req.user!.id;
    const purpose = optionalString(req.body?.purpose, 300) ?? `Support for ${project.title}`;

    let result: { donation: unknown; block: unknown; txnId: string } | null = null;

    for (let attempt = 0; attempt < BLOCK_WRITE_ATTEMPTS; attempt++) {
      const txnId = newTxnId();
      try {
        result = await prisma.$transaction(async tx => {
          const latest = await tx.blockchainBlock.findFirst({
            orderBy: { blockNumber: 'desc' },
            select: { blockNumber: true, currentHash: true }
          });

          const blockNumber = (latest?.blockNumber ?? 0) + 1;
          const prevHash = latest?.currentHash ?? GENESIS_HASH;
          const timestamp = new Date();

          const currentHash = BlockchainService.calculateHash({
            blockNumber, prevHash, txnId, amount, donorId, ngoId, projectId, timestamp
          });

          const block = await tx.blockchainBlock.create({
            data: { blockNumber, prevHash, currentHash, txnId, amount, donorId, ngoId, projectId, timestamp }
          });

          const donation = await tx.donation.create({
            data: { donorId, ngoId, projectId, amount, purpose, txnId, blockId: block.id, date: timestamp }
          });

          return { donation, block, txnId };
        });
        break;
      } catch (err) {
        // P2002 = unique constraint. Another donation took the slot; try again.
        const isRace = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!isRace || attempt === BLOCK_WRITE_ATTEMPTS - 1) throw err;
      }
    }

    if (!result) throw badRequest('The ledger is busy right now. Please try again.');

    await logAudit(donorId, req.user!.role, 'DONATION', 'Money', (result.donation as any).id,
      `₹${amount} donated to ${project.title} (${result.txnId})`);

    await notifyNgoOwner(ngoId, 'You received a donation',
      `₹${amount.toLocaleString('en-IN')} was donated to "${project.title}".`, 'SUCCESS', '/ngo/money');

    await recomputeScores(ngoId);

    return res.status(201).json(result);
  }),

  /** Donation history. Donors see their own; NGOs see money received. */
  list: handler(async (req: AuthRequest, res: Response) => {
    const { ngoId, projectId } = req.query;
    const where: any = {};

    if (typeof projectId === 'string' && projectId) where.projectId = projectId;

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

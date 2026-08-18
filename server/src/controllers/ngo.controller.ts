import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { AuthRequest, assertNgoAccess, currentUserNgo } from '../middleware/auth.middleware';
import {
  handler, badRequest, notFound, forbidden,
  requireString, optionalString, pick
} from '../lib/http';
import { logAudit } from '../lib/audit';
import { notifyNgoOwner, notifyAdmins } from '../services/notification.service';
import { recomputeScores } from '../services/scoring.service';
import { isValidIndianPhone, isValidPinCode, maskIdentity } from '../services/identity.service';

const prisma = new PrismaClient();

/** Fields an NGO may edit about itself. Status and scores are earned, not set. */
const EDITABLE_NGO_FIELDS = [
  'name', 'description', 'presidentName', 'csrReg', 'address', 'city',
  'state', 'district', 'pinCode', 'phone', 'email', 'website', 'mission',
  'areaOfWork', 'establishedYear', 'employees', 'volunteers'
] as const;

function withSector<T extends { areaOfWork: string }>(ngo: T) {
  return { ...ngo, sector: ngo.areaOfWork };
}

export const NGOController = {
  /**
   * Public directory. Only organisations an auditor has verified are listed,
   * which is the whole point of the platform — unverified NGOs must not get
   * public visibility. Admins see everything.
   */
  list: handler(async (req: AuthRequest, res: Response) => {
    const { state, sector, search, status } = req.query;
    const isAdmin = req.user?.role === 'ADMIN';

    const where: any = {};
    if (isAdmin && typeof status === 'string' && status) {
      where.status = status;
    } else if (!isAdmin) {
      where.status = 'VERIFIED';
    }
    if (typeof state === 'string' && state) where.state = state;
    if (typeof sector === 'string' && sector) where.areaOfWork = { contains: sector };
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { areaOfWork: { contains: q } },
        { mission: { contains: q } },
        { district: { contains: q } }
      ];
    }

    const ngos = await prisma.nGO.findMany({
      where,
      include: {
        govVerification: true,
        _count: { select: { projects: true, beneficiaries: true, documents: true } }
      },
      orderBy: [{ transparencyScore: 'desc' }, { name: 'asc' }]
    });

    const totals = await prisma.donation.groupBy({
      by: ['ngoId'],
      _sum: { amount: true },
      where: { ngoId: { in: ngos.map(n => n.id) } }
    });
    const receivedByNgo = new Map(totals.map(t => [t.ngoId, t._sum.amount ?? 0]));

    return res.json(
      ngos.map(ngo => ({
        ...withSector(ngo),
        totalReceived: receivedByNgo.get(ngo.id) ?? 0,
        projectCount: ngo._count.projects,
        beneficiaryCount: ngo._count.beneficiaries,
        documentCount: ngo._count.documents
      }))
    );
  }),

  /** Full public profile for one organisation, including its money trail. */
  getById: handler(async (req: AuthRequest, res: Response) => {
    return res.json(await buildNgoProfile(req, req.params.id));
  }),

  /** The signed-in NGO's own workspace data, with no ngoId needed from the client. */
  myOrganisation: handler(async (req: AuthRequest, res: Response) => {
    const owned = await currentUserNgo(req);
    if (!owned) {
      return res.json({ ngo: null, message: 'You have not set up an organisation profile yet.' });
    }
    return res.json(await buildNgoProfile(req, owned.id));
  }),

  create: handler(async (req: AuthRequest, res: Response) => {
    const existing = await prisma.nGO.findUnique({ where: { userId: req.user!.id } });
    if (existing) throw badRequest('Your account already has an organisation profile.');

    const regNum = requireString(req.body?.regNum, 'Registration number', 100);
    const clash = await prisma.nGO.findUnique({ where: { regNum } });
    if (clash) throw badRequest('An organisation with this registration number is already on the platform.');

    const ngo = await prisma.nGO.create({
      data: {
        userId: req.user!.id,
        name: requireString(req.body?.name, 'Organisation name', 200),
        description: optionalString(req.body?.description, 2000) ?? '',
        presidentName: optionalString(req.body?.presidentName, 200) ?? '',
        regNum,
        csrReg: optionalString(req.body?.csrReg, 80),
        address: optionalString(req.body?.address, 500) ?? '',
        city: optionalString(req.body?.city, 100) ?? '',
        state: optionalString(req.body?.state, 100) ?? '',
        district: optionalString(req.body?.district, 100) ?? optionalString(req.body?.city, 100) ?? '',
        pinCode: optionalString(req.body?.pinCode, 10) ?? '',
        phone: optionalString(req.body?.phone, 40) ?? '',
        email: optionalString(req.body?.email, 200) ?? req.user!.email,
        website: optionalString(req.body?.website, 300),
        mission: optionalString(req.body?.mission, 2000) ?? '',
        areaOfWork: optionalString(req.body?.areaOfWork, 300) ?? 'General social welfare',
        establishedYear: Number(req.body?.establishedYear) || new Date().getFullYear(),
        employees: Math.max(0, Number(req.body?.employees) || 0),
        volunteers: Math.max(0, Number(req.body?.volunteers) || 0),
        status: 'PENDING'
      }
    });

    await logAudit(req.user!.id, req.user!.role, 'CREATE_NGO', 'Organisations', ngo.id,
      `Organisation profile created: ${ngo.name} (${ngo.regNum})`);
    await notifyAdmins('New organisation awaiting review',
      `${ngo.name} (${ngo.regNum}) is waiting for verification.`, 'INFO', '/admin');
    await recomputeScores(ngo.id);

    return res.status(201).json(withSector(ngo));
  }),

  /**
   * Updates an organisation. Only the owner or an admin may call this, and only
   * descriptive fields can change — verification status and the transparency
   * and risk scores are computed by the platform, never supplied by the client.
   */
  update: handler(async (req: AuthRequest, res: Response) => {
    const ngo = await assertNgoAccess(req, res, req.params.id);
    if (!ngo) return;

    const data = pick(req.body, EDITABLE_NGO_FIELDS);
    if ('establishedYear' in data) data.establishedYear = Number(data.establishedYear) || ngo.establishedYear;
    if ('employees' in data) data.employees = Math.max(0, Number(data.employees) || 0);
    if ('volunteers' in data) data.volunteers = Math.max(0, Number(data.volunteers) || 0);

    if (Object.keys(data).length === 0) throw badRequest('There was nothing to update.');

    const updated = await prisma.nGO.update({ where: { id: ngo.id }, data });

    await logAudit(req.user!.id, req.user!.role, 'UPDATE_NGO', 'Organisations', ngo.id,
      `Updated: ${Object.keys(data).join(', ')}`);
    await recomputeScores(ngo.id);

    return res.json(withSector(updated));
  })
};

/** Assembles the full organisation profile, enforcing public-visibility rules. */
async function buildNgoProfile(req: AuthRequest, id: string) {
  const ngo = await prisma.nGO.findUnique({
    where: { id },
    include: {
      // Identity numbers and storage paths are deliberately excluded here.
      // Only the masked last-four is exposed, and only to the owner or an admin
      // (filtered below once we know who is asking).
      documents: {
        select: {
          id: true, docType: true, fileName: true, hash: true, status: true,
          numberLast4: true, mimeType: true, sizeBytes: true,
          reviewNotes: true, uploadDate: true, verifiedAt: true
        },
        orderBy: { uploadDate: 'desc' }
      },
      paymentDetails: true,
      causes: true,
      govVerification: true,
      projects: {
        include: {
          evidence: { orderBy: { capturedAt: 'desc' } },
          _count: { select: { beneficiaries: true, donations: true, expenses: true, communityVerifications: true } }
        },
        orderBy: { createdAt: 'desc' }
      },
      transparencyScores: { orderBy: { lastUpdated: 'desc' }, take: 12 }
    }
  });

  if (!ngo) throw notFound('That organisation could not be found.');

  const isOwner = req.user?.id === ngo.userId;
  const isAdmin = req.user?.role === 'ADMIN';
  if (ngo.status !== 'VERIFIED' && !isOwner && !isAdmin) {
    throw forbidden('This organisation has not been verified yet, so its profile is not public.');
  }

  const [received, spent, beneficiaryCount, alerts] = await Promise.all([
    prisma.donation.aggregate({ where: { ngoId: id }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { ngoId: id }, _sum: { amount: true } }),
    prisma.beneficiary.count({ where: { ngoId: id } }),
    isOwner || isAdmin
      ? prisma.fraudAlert.findMany({ where: { ngoId: id }, orderBy: { date: 'desc' }, take: 5 })
      : Promise.resolve([])
  ]);

  const totalReceived = received._sum.amount ?? 0;
  const totalSpent = spent._sum.amount ?? 0;
  const privileged = isOwner || isAdmin;

  // Identity documents (Aadhaar, PAN, Voter ID, certificate) are visible only
  // to the organisation itself and to admins. The public payload omits them
  // entirely — not merely hidden in the UI, absent from the response.
  const documents = privileged
    ? ngo.documents.map(d => ({ ...d, masked: maskIdentity(d.docType, d.numberLast4) }))
    : [];

  // Donors need somewhere to pay, but never the bank account details.
  const payment = ngo.paymentDetails
    ? privileged
      ? ngo.paymentDetails
      : {
          upiId: ngo.paymentDetails.upiId,
          qrCodeAvailable: Boolean(ngo.paymentDetails.qrCodePath)
        }
    : null;

  const { paymentDetails: _omit, ...rest } = ngo as any;

  return {
    ...withSector(rest),
    documents,
    payment,
    causes: ngo.causes.map(c => c.category),
    finance: {
      totalReceived,
      totalSpent,
      remaining: Math.max(0, totalReceived - totalSpent),
      utilisationPercent: totalReceived > 0 ? Math.round((totalSpent / totalReceived) * 100) : 0
    },
    beneficiaryCount,
    alerts,
    viewerIsOwner: isOwner,
    viewerIsAdmin: isAdmin
  };
}


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
import { MockGovernmentVerificationService } from '../services/govVerification.service';

const prisma = new PrismaClient();

/** Fields an NGO may edit about itself. Status and scores are earned, not set. */
const EDITABLE_NGO_FIELDS = [
  'name', 'pan', 'certificate12A', 'certificate80G', 'csrReg', 'address',
  'state', 'district', 'phone', 'email', 'website', 'mission', 'areaOfWork',
  'establishedYear', 'employees', 'volunteers'
] as const;

const DOC_TYPES = [
  'REGISTRATION', 'PAN', '12A', '80G', 'AUDIT_REPORT', 'ANNUAL_REPORT', 'BANK_DOC'
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
        regNum,
        pan: optionalString(req.body?.pan, 40) ?? '',
        certificate12A: optionalString(req.body?.certificate12A, 80) ?? '',
        certificate80G: optionalString(req.body?.certificate80G, 80) ?? '',
        csrReg: optionalString(req.body?.csrReg, 80),
        address: optionalString(req.body?.address, 500) ?? '',
        state: optionalString(req.body?.state, 100) ?? '',
        district: optionalString(req.body?.district, 100) ?? '',
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
      documents: {
        select: {
          id: true, docType: true, fileName: true, hash: true, status: true,
          verificationStatus: true, reviewNotes: true, uploadDate: true, verifiedAt: true
        },
        orderBy: { uploadDate: 'desc' }
      },
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

  return {
    ...withSector(ngo),
    finance: {
      totalReceived,
      totalSpent,
      remaining: Math.max(0, totalReceived - totalSpent),
      utilisationPercent: totalReceived > 0 ? Math.round((totalSpent / totalReceived) * 100) : 0
    },
    beneficiaryCount,
    alerts
  };
}

export const DocumentController = {
  /**
   * Stores a document and the SHA-256 digest of its exact contents.
   *
   * The payload is retained so a later integrity check can genuinely re-hash it
   * — the previous implementation echoed the stored digest back, which meant
   * tampering could never be detected.
   */
  upload: handler(async (req: AuthRequest, res: Response) => {
    const owned = req.body?.ngoId
      ? await assertNgoAccess(req, res, requireString(req.body.ngoId, 'Organisation', 100))
      : await currentUserNgo(req);

    if (!owned) {
      if (!res.headersSent) throw badRequest('Set up your organisation profile before uploading documents.');
      return;
    }

    const docType = requireString(req.body?.docType, 'Document type', 40).toUpperCase();
    if (!DOC_TYPES.includes(docType as any)) {
      throw badRequest(`Document type must be one of: ${DOC_TYPES.join(', ')}.`);
    }

    const fileName = requireString(req.body?.fileName, 'File name', 260);
    // In this build the "file" is a text payload. Real deployments swap this
    // for the uploaded bytes; the hashing and verification logic is unchanged.
    const content = optionalString(req.body?.content, 200_000)
      ?? `${fileName}|${owned.id}|${docType}`;

    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');

    const document = await prisma.nGODocument.create({
      data: {
        ngoId: owned.id,
        docType,
        fileName,
        filePath: `/uploads/${owned.id}/${docType.toLowerCase()}-${hash.slice(0, 12)}.pdf`,
        content,
        hash,
        status: 'PENDING',
        verificationStatus: 'INTEGRITY_VERIFIED'
      },
      select: {
        id: true, ngoId: true, docType: true, fileName: true, filePath: true,
        hash: true, status: true, verificationStatus: true, uploadDate: true
      }
    });

    await logAudit(req.user!.id, req.user!.role, 'UPLOAD_DOCUMENT', 'Documents', document.id,
      `${fileName} uploaded (SHA-256 ${hash.slice(0, 12)}…)`);
    await notifyAdmins('Document awaiting review',
      `${owned.name} uploaded ${fileName}.`, 'INFO', '/admin');
    await recomputeScores(owned.id);

    return res.status(201).json(document);
  }),

  /** Re-computes the digest from the stored payload and compares it. */
  verifyIntegrity: handler(async (req: AuthRequest, res: Response) => {
    const doc = await prisma.nGODocument.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound('That document could not be found.');

    const recalculatedHash = crypto.createHash('sha256').update(doc.content, 'utf8').digest('hex');
    const isIntegrityValid = recalculatedHash === doc.hash;

    await logAudit(req.user?.id, req.user?.role ?? 'PUBLIC', 'VERIFY_DOCUMENT', 'Documents', doc.id,
      `Integrity check on ${doc.fileName}: ${isIntegrityValid ? 'unchanged' : 'MODIFIED'}`);

    return res.json({
      documentId: doc.id,
      fileName: doc.fileName,
      storedHash: doc.hash,
      recalculatedHash,
      isIntegrityValid,
      // Explicit inverse so a client cannot fail open by reading a missing field.
      isTampered: !isIntegrityValid,
      message: isIntegrityValid
        ? 'This document has not been changed since it was uploaded.'
        : 'Warning: this document does not match its original fingerprint. It may have been altered.'
    });
  }),

  /** Auditor decision on a document. */
  review: handler(async (req: AuthRequest, res: Response) => {
    const status = requireString(req.body?.status, 'Decision', 30).toUpperCase();
    if (!['VERIFIED', 'REJECTED', 'REQUIRES_CORRECTION'].includes(status)) {
      throw badRequest('Decision must be VERIFIED, REJECTED or REQUIRES_CORRECTION.');
    }

    const doc = await prisma.nGODocument.findUnique({ where: { id: req.params.id }, include: { ngo: true } });
    if (!doc) throw notFound('That document could not be found.');

    const reviewNotes = optionalString(req.body?.notes, 1000);
    if (status !== 'VERIFIED' && !reviewNotes) {
      throw badRequest('Please explain what needs to change so the organisation can fix it.');
    }

    await prisma.nGODocument.update({
      where: { id: doc.id },
      data: { status, reviewNotes, verifiedAt: status === 'VERIFIED' ? new Date() : null }
    });

    await logAudit(req.user!.id, 'ADMIN', 'REVIEW_DOCUMENT', 'Documents', doc.id,
      `${doc.fileName} marked ${status}`);

    await notifyNgoOwner(
      doc.ngoId,
      status === 'VERIFIED' ? 'Document accepted' : 'Document needs attention',
      status === 'VERIFIED'
        ? `${doc.fileName} has been accepted.`
        : `${doc.fileName}: ${reviewNotes}`,
      status === 'VERIFIED' ? 'SUCCESS' : 'WARNING',
      '/ngo/documents'
    );

    const scores = await recomputeScores(doc.ngoId);
    return res.json({ message: 'Decision saved.', scores });
  })
};

export const GovController = {
  /**
   * Runs the simulated NGO Darpan / Income Tax check. Requires ownership: this
   * writes verification status, so it cannot be an open endpoint.
   */
  verify: handler(async (req: AuthRequest, res: Response) => {
    const owned = req.body?.ngoId
      ? await assertNgoAccess(req, res, requireString(req.body.ngoId, 'Organisation', 100))
      : await currentUserNgo(req);

    if (!owned) {
      if (!res.headersSent) throw badRequest('Set up your organisation profile first.');
      return;
    }

    const result = MockGovernmentVerificationService.verify({
      regNum: owned.regNum,
      pan: owned.pan,
      certificate12A: owned.certificate12A,
      certificate80G: owned.certificate80G
    });

    await prisma.govVerification.upsert({
      where: { ngoId: owned.id },
      update: {
        regNumStatus: result.regNumStatus,
        panStatus: result.panStatus,
        cert12AStatus: result.cert12AStatus,
        cert80GStatus: result.cert80GStatus,
        overallStatus: result.overallStatus,
        notes: result.notes,
        verifiedAt: new Date()
      },
      create: {
        ngoId: owned.id,
        regNumStatus: result.regNumStatus,
        panStatus: result.panStatus,
        cert12AStatus: result.cert12AStatus,
        cert80GStatus: result.cert80GStatus,
        overallStatus: result.overallStatus,
        notes: result.notes
      }
    });

    await logAudit(req.user!.id, req.user!.role, 'GOV_VERIFICATION', 'Government check', owned.id,
      `Government check for ${owned.name}: ${result.overallStatus}`);

    // A passing government check does not by itself make an NGO public — an
    // auditor still approves it. This keeps a human in the loop.
    if (result.overallStatus === 'VERIFIED') {
      await notifyAdmins('Government check passed',
        `${owned.name} passed the government check and is ready for final approval.`, 'SUCCESS', '/admin');
    }

    const scores = await recomputeScores(owned.id);
    return res.json({ ...result, scores });
  })
};

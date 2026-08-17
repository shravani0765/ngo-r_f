import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest, assertNgoAccess, currentUserNgo } from '../middleware/auth.middleware';
import {
  handler, badRequest, notFound, forbidden,
  requireString, optionalString, optionalNumber, requireAmount
} from '../lib/http';
import { logAudit } from '../lib/audit';
import { notifyNgoOwner, notifyAdmins } from '../services/notification.service';
import { recomputeScores } from '../services/scoring.service';
import { SDGClassifierService } from '../services/sdgClassifier.service';
import { DuplicateCheckService } from '../services/duplicateCheck.service';
import { distanceKm, classifyDistance, describeGeoStatus } from '../services/geo.service';

const prisma = new PrismaClient();

/** How many existing records the duplicate scan will consider at once. */
const DUPLICATE_SCAN_LIMIT = 500;

/** Resolves the project and confirms the caller may write to it. */
async function assertProjectAccess(req: AuthRequest, res: Response, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { ngo: { select: { id: true, userId: true, name: true } } }
  });

  if (!project) {
    res.status(404).json({ message: 'That project could not be found.' });
    return null;
  }

  if (req.user?.role !== 'ADMIN' && project.ngo.userId !== req.user?.id) {
    res.status(403).json({ message: 'You can only change projects belonging to your own organisation.' });
    return null;
  }

  return project;
}

export const ProjectController = {
  list: handler(async (req: AuthRequest, res: Response) => {
    const { category, state, status, ngoId, search } = req.query;
    const isAdmin = req.user?.role === 'ADMIN';

    const where: any = {};
    if (typeof category === 'string' && category) where.category = category;
    if (typeof state === 'string' && state) where.state = state;
    if (typeof status === 'string' && status) where.status = status;
    if (typeof ngoId === 'string' && ngoId) where.ngoId = ngoId;
    if (typeof search === 'string' && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { description: { contains: search.trim() } }
      ];
    }

    // Projects are only public once their organisation is verified.
    if (!isAdmin) where.ngo = { status: 'VERIFIED' };

    const projects = await prisma.project.findMany({
      where,
      include: {
        ngo: { select: { id: true, name: true, transparencyScore: true, status: true } },
        _count: { select: { beneficiaries: true, donations: true, expenses: true, evidence: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return res.json(projects);
  }),

  getById: handler(async (req: AuthRequest, res: Response) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        ngo: { select: { id: true, name: true, status: true, transparencyScore: true, state: true } },
        evidence: { orderBy: { capturedAt: 'desc' } },
        communityVerifications: { orderBy: { createdAt: 'desc' } },
        expenses: { orderBy: { date: 'desc' } },
        _count: { select: { beneficiaries: true, donations: true } }
      }
    });

    if (!project) throw notFound('That project could not be found.');

    const isOwner = req.user?.id && project.ngo.id
      ? (await prisma.nGO.findUnique({ where: { id: project.ngo.id }, select: { userId: true } }))?.userId === req.user.id
      : false;

    if (project.ngo.status !== 'VERIFIED' && !isOwner && req.user?.role !== 'ADMIN') {
      throw forbidden('This project is not public yet.');
    }

    const [received, spent] = await Promise.all([
      prisma.donation.aggregate({ where: { projectId: project.id }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { projectId: project.id }, _sum: { amount: true } })
    ]);

    const totalReceived = received._sum.amount ?? 0;
    const totalSpent = spent._sum.amount ?? 0;

    return res.json({
      ...project,
      finance: {
        totalReceived,
        totalSpent,
        remaining: Math.max(0, totalReceived - totalSpent),
        utilisationPercent: totalReceived > 0 ? Math.round((totalSpent / totalReceived) * 100) : 0
      }
    });
  }),

  create: handler(async (req: AuthRequest, res: Response) => {
    const owned = req.body?.ngoId
      ? await assertNgoAccess(req, res, requireString(req.body.ngoId, 'Organisation', 100))
      : await currentUserNgo(req);

    if (!owned) {
      if (!res.headersSent) throw badRequest('Set up your organisation profile before adding a project.');
      return;
    }

    const title = requireString(req.body?.title, 'Project title', 200);
    const description = requireString(req.body?.description, 'Project description', 5000);

    // Suggest SDGs from the description when the client has not chosen any.
    const provided = req.body?.sdgGoals;
    const sdgGoals =
      typeof provided === 'string' && provided.trim() && provided.trim() !== '[]'
        ? provided
        : Array.isArray(provided) && provided.length
        ? JSON.stringify(provided)
        : JSON.stringify(
            SDGClassifierService.classify(`${title} ${description}`).map(s => `${s.code} — ${s.title}`)
          );

    const project = await prisma.project.create({
      data: {
        ngoId: owned.id,
        title,
        description,
        category: optionalString(req.body?.category, 100) ?? 'General',
        sdgGoals,
        location: optionalString(req.body?.location, 300) ?? owned.district,
        state: optionalString(req.body?.state, 100) ?? owned.state,
        district: optionalString(req.body?.district, 100) ?? owned.district,
        startDate: optionalString(req.body?.startDate, 40) ?? new Date().toISOString().split('T')[0],
        endDate: optionalString(req.body?.endDate, 40) ?? '',
        budget: requireAmount(req.body?.budget ?? 100000, 'Budget'),
        expectedBeneficiaries: Math.max(1, Number(req.body?.expectedBeneficiaries) || 100),
        lat: optionalNumber(req.body?.lat),
        lng: optionalNumber(req.body?.lng),
        image: optionalString(req.body?.image, 500),
        status: 'ACTIVE'
      }
    });

    await logAudit(req.user!.id, req.user!.role, 'CREATE_PROJECT', 'Projects', project.id,
      `Project created: ${title}`);
    await recomputeScores(owned.id);

    return res.status(201).json(project);
  }),

  update: handler(async (req: AuthRequest, res: Response) => {
    const project = await assertProjectAccess(req, res, req.params.id);
    if (!project) return;

    const data: Prisma.ProjectUpdateInput = {};
    const title = optionalString(req.body?.title, 200);
    const description = optionalString(req.body?.description, 5000);
    const category = optionalString(req.body?.category, 100);
    const status = optionalString(req.body?.status, 40);

    if (title) data.title = title;
    if (description) data.description = description;
    if (category) data.category = category;
    if (req.body?.budget !== undefined) data.budget = requireAmount(req.body.budget, 'Budget');
    if (req.body?.expectedBeneficiaries !== undefined) {
      data.expectedBeneficiaries = Math.max(1, Number(req.body.expectedBeneficiaries) || 1);
    }
    if (status && ['DRAFT', 'ACTIVE', 'COMPLETED'].includes(status.toUpperCase())) {
      data.status = status.toUpperCase();
    }
    if (req.body?.lat !== undefined) data.lat = optionalNumber(req.body.lat);
    if (req.body?.lng !== undefined) data.lng = optionalNumber(req.body.lng);

    if (Object.keys(data).length === 0) throw badRequest('There was nothing to update.');

    const updated = await prisma.project.update({ where: { id: project.id }, data });

    await logAudit(req.user!.id, req.user!.role, 'UPDATE_PROJECT', 'Projects', project.id,
      `Updated: ${Object.keys(data).join(', ')}`);
    await recomputeScores(project.ngo.id);

    return res.json(updated);
  })
};

export const EvidenceController = {
  /**
   * Adds a geo-tagged photo to a project and records how far it was taken from
   * the declared site — the report's countermeasure for NGOs claiming to work
   * in regions they never visit.
   */
  create: handler(async (req: AuthRequest, res: Response) => {
    const project = await assertProjectAccess(req, res, req.params.id);
    if (!project) return;

    const caption = requireString(req.body?.caption, 'Caption', 300);
    const imageUrl = requireString(req.body?.imageUrl, 'Photo link', 500);

    const lat = optionalNumber(req.body?.lat);
    const lng = optionalNumber(req.body?.lng);
    if (lat === undefined || lng === undefined) {
      throw badRequest('Photo location (latitude and longitude) is required for field evidence.');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw badRequest('Those coordinates are not valid.');
    }

    const phase = (optionalString(req.body?.phase, 20) ?? 'PROGRESS').toUpperCase();
    if (!['BEFORE', 'PROGRESS', 'AFTER'].includes(phase)) {
      throw badRequest('Phase must be BEFORE, PROGRESS or AFTER.');
    }

    // Distance is only meaningful when the project declared a location.
    let km = 0;
    let geoStatus: ReturnType<typeof classifyDistance> = 'MATCH';
    if (project.lat != null && project.lng != null) {
      km = distanceKm(project.lat, project.lng, lat, lng);
      geoStatus = classifyDistance(km);
    }

    const evidence = await prisma.projectEvidence.create({
      data: {
        projectId: project.id,
        phase,
        caption,
        imageUrl,
        lat,
        lng,
        distanceKm: km,
        geoStatus,
        uploadedBy: req.user!.id
      }
    });

    await logAudit(req.user!.id, req.user!.role, 'ADD_EVIDENCE', 'Projects', project.id,
      `Evidence added to ${project.title} (${geoStatus}, ${km} km from site)`);

    if (geoStatus === 'MISMATCH') {
      await notifyAdmins('Evidence location does not match',
        `${project.ngo.name} uploaded a photo ${km} km from the stated site of "${project.title}".`,
        'WARNING', '/admin');
    }

    await recomputeScores(project.ngo.id);

    return res.status(201).json({
      ...evidence,
      message: describeGeoStatus(geoStatus, km)
    });
  }),

  remove: handler(async (req: AuthRequest, res: Response) => {
    const evidence = await prisma.projectEvidence.findUnique({
      where: { id: req.params.evidenceId },
      include: { project: { include: { ngo: { select: { id: true, userId: true } } } } }
    });

    if (!evidence) throw notFound('That photo could not be found.');
    if (req.user?.role !== 'ADMIN' && evidence.project.ngo.userId !== req.user?.id) {
      throw forbidden('You can only remove your own evidence.');
    }

    await prisma.projectEvidence.delete({ where: { id: evidence.id } });
    await recomputeScores(evidence.project.ngo.id);

    return res.json({ message: 'Photo removed.' });
  })
};

export const BeneficiaryController = {
  list: handler(async (req: AuthRequest, res: Response) => {
    const { projectId, ngoId } = req.query;

    // Beneficiary records are personal data: only the owning NGO and admins
    // may read them. The public sees counts, never names.
    const owned = await currentUserNgo(req);
    const isAdmin = req.user?.role === 'ADMIN';

    const where: any = {};
    if (typeof projectId === 'string' && projectId) where.projectId = projectId;

    if (isAdmin) {
      if (typeof ngoId === 'string' && ngoId) where.ngoId = ngoId;
    } else if (owned) {
      where.ngoId = owned.id;
    } else {
      throw forbidden('Beneficiary records are only visible to the organisation that owns them.');
    }

    const list = await prisma.beneficiary.findMany({
      where,
      include: { project: { select: { title: true } } },
      orderBy: { registrationDate: 'desc' },
      take: 500
    });

    return res.json(list);
  }),

  /** Scores a candidate against existing records without saving anything. */
  checkDuplicate: handler(async (req: AuthRequest, res: Response) => {
    const owned = await currentUserNgo(req);
    if (!owned && req.user?.role !== 'ADMIN') {
      throw forbidden('Only registered organisations can run duplicate checks.');
    }

    const candidates = await findDuplicateCandidates(req.body?.name);
    return res.json(DuplicateCheckService.checkDuplicate(req.body ?? {}, candidates));
  }),

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
    if (project.ngoId !== owned.id) {
      throw forbidden('That project belongs to a different organisation.');
    }

    const name = requireString(req.body?.name, 'Name', 200);
    const age = Number(req.body?.age);
    if (!Number.isFinite(age) || age < 0 || age > 120) {
      throw badRequest('Please enter an age between 0 and 120.');
    }

    const candidates = await findDuplicateCandidates(name);
    const dupCheck = DuplicateCheckService.checkDuplicate(
      { name, age, gender: req.body?.gender, location: req.body?.location, program: req.body?.program },
      candidates
    );

    // A high-confidence duplicate is refused rather than silently recorded.
    // The client can override deliberately once a human has looked at it.
    const acknowledged = req.body?.confirmNotDuplicate === true;
    if (dupCheck.riskLevel === 'HIGH' && !acknowledged) {
      return res.status(409).json({
        message: dupCheck.details,
        duplicateCheck: dupCheck,
        needsConfirmation: true
      });
    }

    const beneficiary = await prisma.$transaction(async tx => {
      const created = await tx.beneficiary.create({
        data: {
          projectId,
          ngoId: owned.id,
          beneficiaryCode: await nextBeneficiaryCode(tx),
          name,
          age: Math.round(age),
          gender: optionalString(req.body?.gender, 40) ?? 'Not stated',
          location: optionalString(req.body?.location, 200) ?? project.location,
          program: optionalString(req.body?.program, 200) ?? project.title,
          supportType: optionalString(req.body?.supportType, 200) ?? 'Programme support',
          duplicateRisk: dupCheck.riskLevel,
          duplicateDetails: dupCheck.isDuplicateRisk ? dupCheck.details : null
        }
      });

      await tx.project.update({
        where: { id: projectId },
        data: { actualBeneficiaries: { increment: 1 } }
      });

      return created;
    });

    await logAudit(req.user!.id, req.user!.role, 'ADD_BENEFICIARY', 'Beneficiaries', beneficiary.id,
      `${beneficiary.beneficiaryCode} added to ${project.title} (duplicate risk ${dupCheck.riskLevel})`);

    if (dupCheck.riskLevel !== 'LOW') {
      await notifyNgoOwner(owned.id, 'Possible duplicate beneficiary',
        `${beneficiary.beneficiaryCode}: ${dupCheck.details}`, 'WARNING', '/ngo/beneficiaries');
    }

    await recomputeScores(owned.id);

    return res.status(201).json({ beneficiary, duplicateCheck: dupCheck });
  })
};

/**
 * Narrows the duplicate scan to plausible candidates instead of loading every
 * beneficiary on the platform. Matches across all organisations, which is what
 * makes cross-NGO double-counting detectable.
 */
async function findDuplicateCandidates(rawName: unknown) {
  const name = String(rawName ?? '').trim();
  if (!name) return [];

  // The longest token is the most distinctive part of the name to filter on.
  const token = name
    .split(/\s+/)
    .filter(t => t.length >= 3)
    .sort((a, b) => b.length - a.length)[0];

  return prisma.beneficiary.findMany({
    where: token ? { name: { contains: token } } : { name: { contains: name } },
    select: {
      id: true, beneficiaryCode: true, name: true, age: true,
      gender: true, location: true, ngoId: true, projectId: true
    },
    take: DUPLICATE_SCAN_LIMIT
  });
}

/** Sequential, human-readable beneficiary ID, unique across the platform. */
async function nextBeneficiaryCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BEN-${year}-`;

  const latest = await tx.beneficiary.findFirst({
    where: { beneficiaryCode: { startsWith: prefix } },
    orderBy: { beneficiaryCode: 'desc' },
    select: { beneficiaryCode: true }
  });

  const lastNumber = latest ? Number(latest.beneficiaryCode.slice(prefix.length)) : 0;
  const next = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;

  return `${prefix}${String(next).padStart(6, '0')}`;
}

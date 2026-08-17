import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import { handler, badRequest, notFound, requireString, optionalString } from '../lib/http';
import { logAudit } from '../lib/audit';
import { notifyAdmins } from '../services/notification.service';
import { recomputeScores } from '../services/scoring.service';

const prisma = new PrismaClient();

const REPORT_CATEGORIES = [
  'Financial Misuse', 'Fake Beneficiaries', 'Fake Documents', 'Location Fraud', 'Other'
] as const;

export const WhistleblowerController = {
  /**
   * Anonymous concern report.
   *
   * Deliberately records nothing about the reporter — no user id, no audit
   * entry tied to an account — because the report promises zero identity
   * disclosure. The tracking code is the only handle back to the report.
   */
  submit: handler(async (req: AuthRequest, res: Response) => {
    const description = requireString(req.body?.description, 'Description', 5000);
    if (description.length < 20) {
      throw badRequest('Please add a little more detail so this can be investigated.');
    }

    const category = optionalString(req.body?.category, 60) ?? 'Other';
    if (!REPORT_CATEGORIES.includes(category as any)) {
      throw badRequest(`Category must be one of: ${REPORT_CATEGORIES.join(', ')}.`);
    }

    const ngoId = optionalString(req.body?.ngoId, 100);
    if (ngoId) {
      const exists = await prisma.nGO.findUnique({ where: { id: ngoId }, select: { id: true } });
      if (!exists) throw badRequest('That organisation could not be found.');
    }

    const projectId = optionalString(req.body?.projectId, 100);
    if (projectId) {
      const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!exists) throw badRequest('That project could not be found.');
    }

    const trackingCode = `WB-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const report = await prisma.whistleblowerReport.create({
      data: {
        trackingCode,
        ngoId: ngoId ?? null,
        projectId: projectId ?? null,
        category,
        description,
        evidenceUrl: optionalString(req.body?.evidenceUrl, 500),
        status: 'SUBMITTED'
      },
      select: { id: true, trackingCode: true, category: true, status: true, createdAt: true }
    });

    // Logged without any user id, to keep the report anonymous.
    await logAudit(null, 'ANONYMOUS', 'REPORT_SUBMITTED', 'Whistleblower', report.id,
      `Anonymous report ${trackingCode} received (${category})`);

    await notifyAdmins('New anonymous report',
      `${trackingCode}: ${category}`, 'WARNING', '/admin');

    return res.status(201).json(report);
  }),

  /** Public status lookup by tracking code — no personal data returned. */
  track: handler(async (req: AuthRequest, res: Response) => {
    const code = requireString(req.params.code, 'Tracking code', 40).toUpperCase();
    const report = await prisma.whistleblowerReport.findUnique({
      where: { trackingCode: code },
      select: { trackingCode: true, category: true, status: true, createdAt: true }
    });

    if (!report) throw notFound('No report found with that tracking code.');

    const explanations: Record<string, string> = {
      SUBMITTED: 'Received and waiting to be picked up by an auditor.',
      UNDER_INVESTIGATION: 'An auditor is actively looking into this.',
      RESOLVED: 'This has been investigated and closed.',
      DISMISSED: 'This was reviewed and no further action was taken.'
    };

    return res.json({ ...report, explanation: explanations[report.status] ?? '' });
  }),

  list: handler(async (_req: AuthRequest, res: Response) => {
    const reports = await prisma.whistleblowerReport.findMany({
      include: {
        ngo: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(reports);
  })
};

export const CommunityController = {
  /**
   * Ground-level confirmation (or dispute) of what an NGO claims about a
   * project — the human counterpart to the automated checks.
   */
  submit: handler(async (req: AuthRequest, res: Response) => {
    const projectId = requireString(req.params.id, 'Project', 100);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { ngo: { select: { id: true, name: true } } }
    });
    if (!project) throw notFound('That project could not be found.');

    const verdict = (optionalString(req.body?.verdict, 20) ?? 'CONFIRMED').toUpperCase();
    if (!['CONFIRMED', 'DISPUTED'].includes(verdict)) {
      throw badRequest('Please say whether you can confirm or dispute the work.');
    }

    const verification = await prisma.communityVerification.create({
      data: {
        projectId,
        observerName: optionalString(req.body?.observerName, 120) ?? 'Community member',
        location: optionalString(req.body?.location, 200) ?? project.location,
        observation: requireString(req.body?.observation, 'What you saw', 2000),
        imageUrl: optionalString(req.body?.imageUrl, 500),
        verdict,
        status: 'PENDING'
      }
    });

    await logAudit(req.user?.id, req.user?.role ?? 'PUBLIC', 'COMMUNITY_VERIFICATION', 'Projects',
      verification.id, `${verdict} report on "${project.title}"`);

    if (verdict === 'DISPUTED') {
      await notifyAdmins('Community dispute reported',
        `Someone disputed the work claimed on "${project.title}" by ${project.ngo.name}.`,
        'WARNING', '/admin');
    }

    await recomputeScores(project.ngo.id);

    return res.status(201).json({
      ...verification,
      message: 'Thank you. Your report has been recorded and will be reviewed.'
    });
  }),

  listForProject: handler(async (req: AuthRequest, res: Response) => {
    const list = await prisma.communityVerification.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(list);
  })
};

export const NotificationController = {
  list: handler(async (req: AuthRequest, res: Response) => {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } })
    ]);

    return res.json({ items, unreadCount });
  }),

  markRead: handler(async (req: AuthRequest, res: Response) => {
    // Scoped by userId so one account cannot mark another's notifications.
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true }
    });
    return res.json({ message: 'Marked as read.' });
  }),

  markAllRead: handler(async (req: AuthRequest, res: Response) => {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true }
    });
    return res.json({ message: `${count} notification${count === 1 ? '' : 's'} marked as read.` });
  })
};

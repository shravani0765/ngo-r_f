import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { handler, badRequest, notFound, requireString, optionalString } from '../lib/http';
import { logAudit } from '../lib/audit';
import { notifyNgoOwner } from '../services/notification.service';
import { recomputeScores } from '../services/scoring.service';

const prisma = new PrismaClient();

const DECISIONS = ['VERIFIED', 'REJECTED', 'REQUIRES_CORRECTION'] as const;

export const AdminController = {
  /** Live platform counts. Every figure is a real query — no placeholders. */
  statistics: handler(async (_req: AuthRequest, res: Response) => {
    const [
      totalNGOs, verifiedNGOs, pendingNGOs, rejectedNGOs,
      totalProjects, activeProjects, totalBeneficiaries, duplicateBeneficiaries,
      donationAgg, expenseAgg, totalBlocks,
      openAlerts, openReports, pendingDocuments, scoreAgg
    ] = await Promise.all([
      prisma.nGO.count(),
      prisma.nGO.count({ where: { status: 'VERIFIED' } }),
      prisma.nGO.count({ where: { status: 'PENDING' } }),
      prisma.nGO.count({ where: { status: 'REJECTED' } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.beneficiary.count(),
      prisma.beneficiary.count({ where: { duplicateRisk: { not: 'LOW' } } }),
      prisma.donation.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.blockchainBlock.count(),
      prisma.fraudAlert.count({ where: { status: { not: 'RESOLVED' } } }),
      prisma.whistleblowerReport.count({ where: { status: 'SUBMITTED' } }),
      prisma.nGODocument.count({ where: { status: 'PENDING' } }),
      prisma.nGO.aggregate({ _avg: { transparencyScore: true }, where: { status: 'VERIFIED' } })
    ]);

    const totalDonated = donationAgg._sum.amount ?? 0;
    const totalSpent = expenseAgg._sum.amount ?? 0;

    return res.json({
      totalNGOs,
      verifiedNGOs,
      pendingNGOs,
      rejectedNGOs,
      totalProjects,
      activeProjects,
      totalBeneficiaries,
      duplicateBeneficiaries,
      totalDonatedAmount: totalDonated,
      totalExpensedAmount: totalSpent,
      remainingAmount: Math.max(0, totalDonated - totalSpent),
      totalLedgerBlocks: totalBlocks,
      openAlerts,
      openReports,
      pendingDocuments,
      // null rather than a made-up number when there is nothing to average.
      avgTransparencyScore: scoreAgg._avg.transparencyScore != null
        ? Math.round(scoreAgg._avg.transparencyScore)
        : null,
      // Everything an auditor still has to act on, in one number.
      actionsWaiting: pendingNGOs + pendingDocuments + openAlerts + openReports
    });
  }),

  /** The auditor's work queue, ordered by what needs attention first. */
  reviewQueue: handler(async (_req: AuthRequest, res: Response) => {
    const [organisations, documents, alerts, reports] = await Promise.all([
      prisma.nGO.findMany({
        where: { status: { in: ['PENDING', 'REQUIRES_CORRECTION'] } },
        include: {
          govVerification: true,
          _count: { select: { documents: true, projects: true, beneficiaries: true } }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.nGODocument.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true, docType: true, fileName: true, hash: true, uploadDate: true,
          ngo: { select: { id: true, name: true } }
        },
        orderBy: { uploadDate: 'asc' },
        take: 100
      }),
      prisma.fraudAlert.findMany({
        where: { status: { not: 'RESOLVED' } },
        include: { ngo: { select: { id: true, name: true } } },
        orderBy: [{ riskScore: 'desc' }, { date: 'desc' }]
      }),
      prisma.whistleblowerReport.findMany({
        where: { status: { in: ['SUBMITTED', 'UNDER_INVESTIGATION'] } },
        include: { ngo: { select: { id: true, name: true } }, project: { select: { title: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return res.json({ organisations, documents, alerts, reports });
  }),

  /**
   * The single decision point for an organisation's public visibility.
   *
   * Replaces the previous unauthenticated status endpoint, and no longer lets
   * the caller supply a transparency score — that is always recomputed here.
   */
  decideNgo: handler(async (req: AuthRequest, res: Response) => {
    const decision = requireString(req.body?.decision, 'Decision', 40).toUpperCase();
    if (!DECISIONS.includes(decision as any)) {
      throw badRequest(`Decision must be one of: ${DECISIONS.join(', ')}.`);
    }

    const notes = optionalString(req.body?.notes, 1000);
    if (decision !== 'VERIFIED' && !notes) {
      throw badRequest('Please explain the decision so the organisation knows what to fix.');
    }

    const ngo = await prisma.nGO.findUnique({ where: { id: req.params.id } });
    if (!ngo) throw notFound('That organisation could not be found.');

    await prisma.nGO.update({
      where: { id: ngo.id },
      data: {
        status: decision,
        verifiedAt: decision === 'VERIFIED' ? new Date() : null
      }
    });

    if (notes) {
      await prisma.govVerification.upsert({
        where: { ngoId: ngo.id },
        update: { notes },
        create: { ngoId: ngo.id, notes, overallStatus: decision === 'VERIFIED' ? 'VERIFIED' : 'REQUIRES_REVIEW' }
      });
    }

    await logAudit(req.user!.id, 'ADMIN', 'NGO_DECISION', 'Verification', ngo.id,
      `${ngo.name} marked ${decision}${notes ? `: ${notes}` : ''}`);

    const messages: Record<string, { title: string; body: string; type: 'SUCCESS' | 'WARNING' | 'DANGER' }> = {
      VERIFIED: {
        title: 'Your organisation is verified',
        body: 'You are now listed in the public directory and can receive donations.',
        type: 'SUCCESS'
      },
      REQUIRES_CORRECTION: {
        title: 'Changes needed before we can verify you',
        body: notes ?? 'Please review your submission.',
        type: 'WARNING'
      },
      REJECTED: {
        title: 'Your verification was not approved',
        body: notes ?? 'Please contact the platform team.',
        type: 'DANGER'
      }
    };

    const msg = messages[decision];
    await notifyNgoOwner(ngo.id, msg.title, msg.body, msg.type, '/ngo');

    const scores = await recomputeScores(ngo.id);

    return res.json({ message: `${ngo.name} marked ${decision.toLowerCase().replace('_', ' ')}.`, scores });
  }),

  auditLogs: handler(async (req: AuthRequest, res: Response) => {
    const take = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take
    });
    return res.json(logs);
  }),

  resolveAlert: handler(async (req: AuthRequest, res: Response) => {
    const status = requireString(req.body?.status, 'Status', 40).toUpperCase();
    if (!['INVESTIGATING', 'RESOLVED'].includes(status)) {
      throw badRequest('Status must be INVESTIGATING or RESOLVED.');
    }

    const alert = await prisma.fraudAlert.findUnique({ where: { id: req.params.id } });
    if (!alert) throw notFound('That alert could not be found.');

    await prisma.fraudAlert.update({ where: { id: alert.id }, data: { status } });
    await logAudit(req.user!.id, 'ADMIN', 'ALERT_UPDATED', 'Risk', alert.id, `Alert marked ${status}`);

    return res.json({ message: `Alert marked ${status.toLowerCase()}.` });
  }),

  updateReport: handler(async (req: AuthRequest, res: Response) => {
    const status = requireString(req.body?.status, 'Status', 40).toUpperCase();
    if (!['UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED'].includes(status)) {
      throw badRequest('Status must be UNDER_INVESTIGATION, RESOLVED or DISMISSED.');
    }

    const report = await prisma.whistleblowerReport.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound('That report could not be found.');

    await prisma.whistleblowerReport.update({ where: { id: report.id }, data: { status } });
    await logAudit(req.user!.id, 'ADMIN', 'REPORT_UPDATED', 'Whistleblower', report.id,
      `Report ${report.trackingCode} marked ${status}`);

    return res.json({ message: `Report marked ${status.toLowerCase().replace(/_/g, ' ')}.` });
  })
};

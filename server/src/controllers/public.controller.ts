import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { handler, badRequest, requireString } from '../lib/http';
import { SDGClassifierService } from '../services/sdgClassifier.service';

const prisma = new PrismaClient();

export const AnalyticsController = {
  /**
   * Aggregate public impact figures.
   *
   * Every number here is measured. When the platform is empty the response
   * says so via `hasData: false` rather than substituting invented totals.
   */
  overview: handler(async (_req: AuthRequest, res: Response) => {
    const [
      verifiedNgos, totalNgos, projects, activeProjects,
      beneficiaries, donationAgg, expenseAgg, blocks,
      sectors, states, evidenceCount, confirmedVerifications
    ] = await Promise.all([
      prisma.nGO.count({ where: { status: 'VERIFIED' } }),
      prisma.nGO.count(),
      prisma.project.count({ where: { ngo: { status: 'VERIFIED' } } }),
      prisma.project.count({ where: { status: 'ACTIVE', ngo: { status: 'VERIFIED' } } }),
      prisma.beneficiary.count({ where: { ngo: { status: 'VERIFIED' } } }),
      prisma.donation.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.blockchainBlock.count(),
      prisma.project.groupBy({
        by: ['category'],
        _count: { _all: true },
        where: { ngo: { status: 'VERIFIED' } }
      }),
      prisma.nGO.groupBy({
        by: ['state'],
        _count: { _all: true },
        where: { status: 'VERIFIED' }
      }),
      prisma.projectEvidence.count(),
      prisma.communityVerification.count({ where: { verdict: 'CONFIRMED' } })
    ]);

    const totalDonated = donationAgg._sum.amount ?? 0;
    const totalSpent = expenseAgg._sum.amount ?? 0;
    const projectTotal = sectors.reduce((sum, s) => sum + s._count._all, 0);

    return res.json({
      hasData: verifiedNgos > 0 || totalDonated > 0,
      verifiedNgos,
      totalNgos,
      totalProjects: projects,
      activeProjects,
      totalBeneficiaries: beneficiaries,
      totalDonatedAmount: totalDonated,
      totalExpensedAmount: totalSpent,
      remainingAmount: Math.max(0, totalDonated - totalSpent),
      utilisationPercent: totalDonated > 0 ? Math.round((totalSpent / totalDonated) * 100) : 0,
      ledgerRecords: blocks,
      evidencePhotos: evidenceCount,
      communityConfirmations: confirmedVerifications,
      // Cost per person reached — a real ratio, computed only when both sides exist.
      costPerBeneficiary: beneficiaries > 0 && totalSpent > 0
        ? Math.round(totalSpent / beneficiaries)
        : null,
      sectorDistribution: sectors
        .map(s => ({
          sector: s.category,
          projects: s._count._all,
          percentage: projectTotal > 0 ? Math.round((s._count._all / projectTotal) * 100) : 0
        }))
        .sort((a, b) => b.projects - a.projects),
      stateDistribution: states
        .map(s => ({ state: s.state, organisations: s._count._all }))
        .sort((a, b) => b.organisations - a.organisations)
    });
  })
};

export const AIController = {
  /** Suggests UN Sustainable Development Goals from a project description. */
  classify: handler(async (req: AuthRequest, res: Response) => {
    const description = requireString(req.body?.description, 'Description', 5000);
    if (description.length < 10) {
      throw badRequest('Please write a little more so we can suggest the right goals.');
    }
    return res.json({ recommendations: SDGClassifierService.classify(description) });
  }),

  /** Rule-based help assistant. Answers are grounded in live platform counts. */
  chat: handler(async (req: AuthRequest, res: Response) => {
    const message = requireString(req.body?.message, 'Message', 1000);
    const q = message.toLowerCase();

    const answer = async (): Promise<string> => {
      if (/(find|search|directory|browse|ngo list)/.test(q)) {
        const count = await prisma.nGO.count({ where: { status: 'VERIFIED' } });
        return count > 0
          ? `There ${count === 1 ? 'is' : 'are'} ${count} verified organisation${count === 1 ? '' : 's'} in the directory right now. Open "Find NGOs" to filter them by cause and state.`
          : 'No organisations have completed verification yet. Once an auditor approves one, it will appear under "Find NGOs".';
      }

      if (/(donat|track|ledger|fund|money|where.*go)/.test(q)) {
        const blocks = await prisma.blockchainBlock.count();
        return blocks > 0
          ? `Every donation is written to a linked record chain — ${blocks} so far. Open "Fund Records" and press "Check records" to re-verify all of them yourself.`
          : 'When a donation is made it is written to a tamper-evident record chain that anyone can re-check from the "Fund Records" page.';
      }

      if (/(score|transparen|rating|rank)/.test(q)) {
        return 'A transparency score out of 100 comes from five things: government registration (25), documents reviewed (25), the money trail (25), project evidence (15) and community feedback (10). Open risk flags subtract up to 20.';
      }

      if (/(register|sign ?up|account|join)/.test(q)) {
        return 'Choose "Register" and pick NGO. You will be asked for your registration number, PAN, 12A and 80G details. After you submit, an auditor reviews your documents before you appear publicly.';
      }

      if (/(fraud|whistle|report|suspicious|complain)/.test(q)) {
        return 'Use the "Report a concern" page. It is completely anonymous — no account needed and nothing about you is stored. You get a tracking code to follow the outcome.';
      }

      if (/(duplicate|beneficiar)/.test(q)) {
        return 'Every person supported gets a unique ID. When a new record is added we compare the name, age, gender and location against all existing records — including other organisations — and block obvious duplicates.';
      }

      if (/(verify|verification|darpan|12a|80g)/.test(q)) {
        return 'Verification has two steps: an automated check of your registration number, PAN, 12A and 80G, and then a human auditor who reviews your uploaded documents. Both must pass before you are listed publicly.';
      }

      return 'I can help with finding verified organisations, tracking where donations go, understanding transparency scores, registering an NGO, or reporting a concern. Which would you like?';
    };

    return res.json({ response: await answer() });
  })
};

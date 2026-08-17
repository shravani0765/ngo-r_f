import { PrismaClient } from '@prisma/client';
import { FraudDetectionService, FraudAnalysisResult } from './fraudEngine.service';
import { TransparencyScoreService, TransparencyResult } from './transparencyEngine.service';
import { notifyNgoOwner, notifyAdmins } from './notification.service';

const prisma = new PrismaClient();

export interface ScoreSnapshot {
  fraud: FraudAnalysisResult;
  transparency: TransparencyResult;
}

/**
 * Recomputes both engines for one NGO from live data, stores the results, and
 * raises a fraud alert when risk crosses into MEDIUM or above.
 *
 * Called after any event that can move the numbers (documents, projects,
 * beneficiaries, money, evidence, community reports) so scores are never stale.
 */
export async function recomputeScores(ngoId: string): Promise<ScoreSnapshot | null> {
  const ngo = await prisma.nGO.findUnique({
    where: { id: ngoId },
    include: {
      documents: true,
      govVerification: true,
      projects: { include: { evidence: true, communityVerifications: true } },
      beneficiaries: true,
      donations: true,
      expenses: true
    }
  });

  if (!ngo) return null;

  const verifiedDocs = ngo.documents.filter(d => d.status === 'VERIFIED').length;
  const duplicates = ngo.beneficiaries.filter(b => b.duplicateRisk !== 'LOW').length;
  const totalDonations = ngo.donations.reduce((sum, d) => sum + d.amount, 0);
  const totalExpenses = ngo.expenses.reduce((sum, e) => sum + e.amount, 0);
  const govVerified = ngo.govVerification?.overallStatus === 'VERIFIED';

  const allEvidence = ngo.projects.flatMap(p => p.evidence);
  const allVerifications = ngo.projects.flatMap(p => p.communityVerifications);
  const geoMismatchCount = allEvidence.filter(e => e.geoStatus === 'MISMATCH').length;
  const disputedCount = allVerifications.filter(v => v.verdict === 'DISPUTED').length;
  const confirmedCount = allVerifications.filter(v => v.verdict === 'CONFIRMED').length;
  const overReportingProjectsCount = ngo.projects.filter(
    p => p.expectedBeneficiaries > 0 && p.actualBeneficiaries > p.expectedBeneficiaries
  ).length;

  const fraud = FraudDetectionService.analyze({
    documentsCount: ngo.documents.length,
    verifiedDocsCount: verifiedDocs,
    govVerified,
    beneficiaryCount: ngo.beneficiaries.length,
    duplicateBeneficiariesCount: duplicates,
    totalDonations,
    totalExpenses,
    geoMismatchCount,
    disputedVerificationsCount: disputedCount,
    overReportingProjectsCount
  });

  const transparency = TransparencyScoreService.calculate({
    govVerified,
    docCount: ngo.documents.length,
    verifiedDocCount: verifiedDocs,
    projectCount: ngo.projects.length,
    activeProjectCount: ngo.projects.filter(p => p.status === 'ACTIVE').length,
    totalDonations,
    totalExpenses,
    beneficiaryCount: ngo.beneficiaries.length,
    fraudRiskScore: fraud.riskScore,
    evidenceCount: allEvidence.length,
    confirmedVerifications: confirmedCount,
    disputedVerifications: disputedCount
  });

  await prisma.nGO.update({
    where: { id: ngoId },
    data: { fraudRiskScore: fraud.riskScore, transparencyScore: transparency.overallScore }
  });

  await prisma.transparencyScore.create({
    data: {
      ngoId,
      overallScore: transparency.overallScore,
      categoryGrade: transparency.grade,
      breakdownJson: JSON.stringify(transparency.bands)
    }
  });

  await syncFraudAlert(ngoId, ngo.name, fraud);

  return { fraud, transparency };
}

/**
 * Keeps at most one open alert per NGO. Raises one when risk reaches MEDIUM,
 * and resolves it automatically once the organisation cleans things up.
 */
async function syncFraudAlert(ngoId: string, ngoName: string, fraud: FraudAnalysisResult) {
  const open = await prisma.fraudAlert.findFirst({
    where: { ngoId, status: { not: 'RESOLVED' } },
    orderBy: { date: 'desc' }
  });

  const problems = fraud.signals.filter(s => s.points > 0);

  if (fraud.riskLevel === 'LOW') {
    if (open) {
      await prisma.fraudAlert.update({
        where: { id: open.id },
        data: { status: 'RESOLVED', riskScore: fraud.riskScore, riskLevel: fraud.riskLevel }
      });
      await notifyNgoOwner(
        ngoId,
        'Risk flag cleared',
        'The issues on your account have been resolved. Your organisation is back in good standing.',
        'SUCCESS',
        '/ngo'
      );
    }
    return;
  }

  const reason = problems.map(s => s.label).join('; ') || fraud.headline;
  const affected = problems.length ? problems[0].label : 'General compliance';

  if (open) {
    await prisma.fraudAlert.update({
      where: { id: open.id },
      data: { riskScore: fraud.riskScore, riskLevel: fraud.riskLevel, reason, affectedRecord: affected }
    });
    return;
  }

  await prisma.fraudAlert.create({
    data: {
      ngoId,
      riskScore: fraud.riskScore,
      riskLevel: fraud.riskLevel,
      reason,
      affectedRecord: affected,
      status: 'UNRESOLVED'
    }
  });

  await notifyAdmins(
    `${fraud.riskLevel} risk flagged: ${ngoName}`,
    reason,
    fraud.riskLevel === 'HIGH' ? 'DANGER' : 'WARNING',
    '/admin'
  );

  await notifyNgoOwner(
    ngoId,
    'Some things need your attention',
    fraud.recommendations[0] ?? reason,
    'WARNING',
    '/ngo'
  );
}

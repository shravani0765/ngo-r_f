export interface FraudAnalysisInput {
  documentsCount: number;
  verifiedDocsCount: number;
  govVerified: boolean;
  beneficiaryCount: number;
  duplicateBeneficiariesCount: number;
  totalDonations: number;
  totalExpenses: number;
  /** Project evidence photos whose GPS position is far from the declared site. */
  geoMismatchCount?: number;
  /** Community observers who disputed the NGO's claims on the ground. */
  disputedVerificationsCount?: number;
  /** Projects reporting more people helped than they set out to help. */
  overReportingProjectsCount?: number;
}

export interface FraudSignal {
  /** Plain-language summary for NGO and public audiences. */
  label: string;
  /** What it counts against, 0 when the check passed. */
  points: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  /** What to actually do about it. */
  advice?: string;
}

export interface FraudAnalysisResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  headline: string;
  signals: FraudSignal[];
  reasons: string[];
  recommendations: string[];
}

/**
 * The report's "Impact Integrity Engine": a transparent, rule-based anomaly
 * scan over documents, government status, beneficiary data, money flow and the
 * geographic consistency of field evidence.
 *
 * Rules are deliberately explainable rather than a black box — an auditor has
 * to be able to justify a flag to the organisation it affects.
 */
export class FraudDetectionService {
  static analyze(input: FraudAnalysisInput): FraudAnalysisResult {
    const signals: FraudSignal[] = [];

    // 1. Government registration status.
    if (!input.govVerified) {
      signals.push({
        label: 'Government registration is not confirmed yet',
        points: 25,
        status: 'CRITICAL',
        advice: 'Run the government check from your dashboard, then upload matching certificates.'
      });
    } else {
      signals.push({ label: 'Government registration confirmed', points: 0, status: 'OK' });
    }

    // 2. Document review backlog.
    const unverifiedDocs = Math.max(0, input.documentsCount - input.verifiedDocsCount);
    if (input.documentsCount === 0) {
      signals.push({
        label: 'No supporting documents uploaded',
        points: 20,
        status: 'CRITICAL',
        advice: 'Upload your registration certificate, PAN, 12A, 80G and latest audit report.'
      });
    } else if (unverifiedDocs > 0) {
      signals.push({
        label: `${unverifiedDocs} document${unverifiedDocs > 1 ? 's' : ''} still waiting for review`,
        points: Math.min(20, unverifiedDocs * 7),
        status: 'WARNING',
        advice: 'An auditor will review these. No action needed unless they ask for a correction.'
      });
    } else {
      signals.push({ label: 'All documents reviewed and accepted', points: 0, status: 'OK' });
    }

    // 3. Duplicate beneficiaries.
    if (input.duplicateBeneficiariesCount > 0) {
      const share = input.beneficiaryCount > 0
        ? input.duplicateBeneficiariesCount / input.beneficiaryCount
        : 1;
      signals.push({
        label: `${input.duplicateBeneficiariesCount} beneficiary record${input.duplicateBeneficiariesCount > 1 ? 's look' : ' looks'} like a duplicate`,
        points: Math.min(30, Math.round(share * 60) + 5),
        status: share > 0.15 ? 'CRITICAL' : 'WARNING',
        advice: 'Open Beneficiaries and merge or remove the repeated entries.'
      });
    } else if (input.beneficiaryCount > 0) {
      signals.push({ label: 'No duplicate beneficiaries found', points: 0, status: 'OK' });
    }

    // 4. Money in vs money out.
    if (input.totalDonations > 0) {
      const utilisation = input.totalExpenses / input.totalDonations;
      if (utilisation > 1.25) {
        signals.push({
          label: 'Recorded spending is more than 25% above money received',
          points: 20,
          status: 'CRITICAL',
          advice: 'Check for expenses entered twice, or record the missing income.'
        });
      } else if (utilisation < 0.1 && input.totalDonations > 100000) {
        signals.push({
          label: 'Very little of the money received has been spent yet',
          points: 15,
          status: 'WARNING',
          advice: 'Add your expense records so donors can see the work in progress.'
        });
      } else {
        signals.push({ label: 'Spending is in line with money received', points: 0, status: 'OK' });
      }
    }

    // 5. Geographic consistency of field evidence.
    const geoMismatches = input.geoMismatchCount ?? 0;
    if (geoMismatches > 0) {
      signals.push({
        label: `${geoMismatches} evidence photo${geoMismatches > 1 ? 's were' : ' was'} taken far from the stated project location`,
        points: Math.min(20, geoMismatches * 10),
        status: 'CRITICAL',
        advice: 'Re-upload evidence taken at the project site, or correct the project location.'
      });
    }

    // 6. Community pushback from the ground.
    const disputes = input.disputedVerificationsCount ?? 0;
    if (disputes > 0) {
      signals.push({
        label: `${disputes} community report${disputes > 1 ? 's dispute' : ' disputes'} what was claimed`,
        points: Math.min(15, disputes * 8),
        status: 'WARNING',
        advice: 'An auditor will follow up on these observations.'
      });
    }

    // 7. Beneficiary counts above the stated target.
    const overReporting = input.overReportingProjectsCount ?? 0;
    if (overReporting > 0) {
      signals.push({
        label: `${overReporting} project${overReporting > 1 ? 's report' : ' reports'} more people helped than planned`,
        points: Math.min(10, overReporting * 5),
        status: 'WARNING',
        advice: 'Confirm the numbers, or raise the project target so the figures line up.'
      });
    }

    const score = Math.min(100, Math.max(0, signals.reduce((sum, s) => sum + s.points, 0)));

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score >= 70) riskLevel = 'HIGH';
    else if (score >= 40) riskLevel = 'MEDIUM';

    const headline =
      riskLevel === 'HIGH'
        ? 'Several things need attention before this organisation can be trusted publicly.'
        : riskLevel === 'MEDIUM'
        ? 'Mostly in good shape, with a few things to tidy up.'
        : 'Everything checks out. No problems found.';

    const recommendations = signals.filter(s => s.points > 0 && s.advice).map(s => s.advice as string);
    if (recommendations.length === 0) {
      recommendations.push('Keep uploading quarterly reports to hold this score.');
    }

    return {
      riskScore: score,
      riskLevel,
      headline,
      signals,
      // Kept for older callers and the public API contract.
      reasons: signals.map(s => s.label),
      recommendations
    };
  }
}

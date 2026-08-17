export interface TransparencyInput {
  govVerified: boolean;
  docCount: number;
  verifiedDocCount: number;
  projectCount: number;
  activeProjectCount: number;
  totalDonations: number;
  totalExpenses: number;
  beneficiaryCount: number;
  fraudRiskScore: number;
  /** Field evidence photos uploaded across the NGO's projects. */
  evidenceCount?: number;
  /** Community observers who confirmed the NGO's claims. */
  confirmedVerifications?: number;
  /** Community observers who disputed them. */
  disputedVerifications?: number;
}

export interface TransparencyBand {
  key: string;
  label: string;
  score: number;
  max: number;
  /** Plain-language explanation of how this band was earned. */
  detail: string;
}

export interface TransparencyResult {
  overallScore: number;
  grade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW';
  headline: string;
  bands: TransparencyBand[];
  breakdown: {
    govVerification: { score: number; max: number };
    documents: { score: number; max: number };
    financials: { score: number; max: number };
    projectEvidence: { score: number; max: number };
    communityFeedback: { score: number; max: number };
    fraudRiskPenalty: { score: number; max: number };
  };
  recommendations: string[];
}

/**
 * Transparency score out of 100.
 *
 * Registration 25 · Documents 25 · Money trail 25 · Evidence 15 ·
 * Community feedback 10, then up to 20 points removed for open risk flags.
 */
export class TransparencyScoreService {
  static calculate(input: TransparencyInput): TransparencyResult {
    const bands: TransparencyBand[] = [];

    // Registration -------------------------------------------------------
    const govScore = input.govVerified ? 25 : 5;
    bands.push({
      key: 'registration',
      label: 'Government registration',
      score: govScore,
      max: 25,
      detail: input.govVerified
        ? 'Registration number, PAN, 12A and 80G all confirmed.'
        : 'Government check not completed yet.'
    });

    // Documents ----------------------------------------------------------
    const docScore = input.docCount === 0
      ? 0
      : Math.min(25, Math.round((input.verifiedDocCount / input.docCount) * 25));
    bands.push({
      key: 'documents',
      label: 'Documents reviewed',
      score: docScore,
      max: 25,
      detail: input.docCount === 0
        ? 'No documents uploaded yet.'
        : `${input.verifiedDocCount} of ${input.docCount} documents accepted by an auditor.`
    });

    // Money trail --------------------------------------------------------
    let finScore = 0;
    let finDetail = 'No donations recorded yet.';
    if (input.totalDonations > 0) {
      if (input.totalExpenses <= 0) {
        finScore = 8;
        finDetail = 'Money received, but no spending recorded yet.';
      } else {
        const ratio = input.totalExpenses / input.totalDonations;
        if (ratio > 1.25) {
          finScore = 8;
          finDetail = 'Recorded spending is higher than money received.';
        } else if (ratio >= 0.5) {
          finScore = 25;
          finDetail = `${Math.round(ratio * 100)}% of money received has been spent and receipted.`;
        } else if (ratio >= 0.2) {
          finScore = 18;
          finDetail = `${Math.round(ratio * 100)}% of money received has been spent so far.`;
        } else {
          finScore = 12;
          finDetail = `Only ${Math.round(ratio * 100)}% of money received has been spent so far.`;
        }
      }
    }
    bands.push({ key: 'money', label: 'Money trail', score: finScore, max: 25, detail: finDetail });

    // Project evidence ---------------------------------------------------
    const evidenceCount = input.evidenceCount ?? 0;
    let projScore = Math.min(8, input.projectCount * 4) + Math.min(3, input.activeProjectCount * 2);
    projScore += Math.min(4, evidenceCount);
    projScore = Math.min(15, projScore);
    bands.push({
      key: 'evidence',
      label: 'Project evidence',
      score: projScore,
      max: 15,
      detail: input.projectCount === 0
        ? 'No projects added yet.'
        : `${input.projectCount} project${input.projectCount > 1 ? 's' : ''} with ${evidenceCount} geo-tagged photo${evidenceCount === 1 ? '' : 's'}.`
    });

    // Community feedback -------------------------------------------------
    const confirmed = input.confirmedVerifications ?? 0;
    const disputed = input.disputedVerifications ?? 0;
    let communityScore = 0;
    let communityDetail = 'No community reports yet.';
    if (confirmed + disputed > 0) {
      const ratio = confirmed / (confirmed + disputed);
      communityScore = Math.round(ratio * 10);
      communityDetail = `${confirmed} of ${confirmed + disputed} community report${confirmed + disputed > 1 ? 's' : ''} confirmed the work on the ground.`;
    }
    bands.push({
      key: 'community',
      label: 'Community feedback',
      score: communityScore,
      max: 10,
      detail: communityDetail
    });

    // Risk penalty -------------------------------------------------------
    const fraudPenalty = Math.round((Math.max(0, Math.min(100, input.fraudRiskScore)) / 100) * 20);

    const earned = govScore + docScore + finScore + projScore + communityScore;
    const total = Math.min(100, Math.max(0, earned - fraudPenalty));

    let grade: TransparencyResult['grade'] = 'LOW';
    if (total >= 90) grade = 'EXCELLENT';
    else if (total >= 75) grade = 'GOOD';
    else if (total >= 50) grade = 'MODERATE';

    const recommendations: string[] = [];
    if (govScore < 25) recommendations.push('Complete the government registration check.');
    if (docScore < 20) recommendations.push('Upload your latest audited financial statement.');
    if (finScore < 20) recommendations.push('Record expenses with receipts against each project.');
    if (projScore < 12) recommendations.push('Add geo-tagged photos from the project site.');
    if (communityScore < 6) recommendations.push('Invite community members to confirm your work.');
    if (fraudPenalty > 5) recommendations.push('Resolve the open risk flags on your dashboard.');
    if (recommendations.length === 0) recommendations.push('Keep reporting quarterly to hold this score.');

    const headline =
      grade === 'EXCELLENT' ? 'Fully documented and independently confirmed.'
      : grade === 'GOOD' ? 'Well documented, with a few gaps left to close.'
      : grade === 'MODERATE' ? 'Part way there — several checks are still outstanding.'
      : 'Not enough verified information published yet.';

    return {
      overallScore: total,
      grade,
      headline,
      bands,
      breakdown: {
        govVerification: { score: govScore, max: 25 },
        documents: { score: docScore, max: 25 },
        financials: { score: finScore, max: 25 },
        projectEvidence: { score: projScore, max: 15 },
        communityFeedback: { score: communityScore, max: 10 },
        fraudRiskPenalty: { score: fraudPenalty, max: 20 }
      },
      recommendations
    };
  }
}

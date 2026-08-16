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
}

export interface TransparencyResult {
  overallScore: number;
  grade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW';
  breakdown: {
    govVerification: { score: number; max: number };
    documents: { score: number; max: number };
    financials: { score: number; max: number };
    projectEvidence: { score: number; max: number };
    fraudRiskPenalty: { score: number; max: number };
  };
  recommendations: string[];
}

export class TransparencyScoreService {
  static calculate(input: TransparencyInput): TransparencyResult {
    // Breakdown max points: Gov (25), Docs (25), Financials (25), Projects (25) minus Fraud penalty
    let govScore = input.govVerified ? 25 : 5;
    let docScore = input.docCount === 0 ? 0 : Math.min(25, Math.round((input.verifiedDocCount / input.docCount) * 25));
    
    let finScore = 10;
    if (input.totalDonations > 0 && input.totalExpenses > 0) {
      const ratio = input.totalExpenses / input.totalDonations;
      if (ratio >= 0.5 && ratio <= 1.1) finScore = 25;
      else if (ratio > 0.2) finScore = 18;
      else finScore = 12;
    }

    let projScore = Math.min(25, (input.projectCount * 5) + (input.activeProjectCount * 5));

    // Penalty based on fraud risk
    let fraudPenalty = Math.round((input.fraudRiskScore / 100) * 20);

    let total = govScore + docScore + finScore + projScore - fraudPenalty;
    total = Math.min(100, Math.max(0, total));

    let grade: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW' = 'LOW';
    if (total >= 90) grade = 'EXCELLENT';
    else if (total >= 75) grade = 'GOOD';
    else if (total >= 50) grade = 'MODERATE';

    const recommendations: string[] = [];
    if (govScore < 25) recommendations.push('Complete Government NGO Darpan & Tax Verification');
    if (docScore < 20) recommendations.push('Upload recent independently audited financial statements');
    if (finScore < 20) recommendations.push('Record detailed expense receipts for active projects');
    if (fraudPenalty > 5) recommendations.push('Address flagged fraud risk indicators');

    if (recommendations.length === 0) {
      recommendations.push('Maintain current exemplary transparency standards');
    }

    return {
      overallScore: total,
      grade,
      breakdown: {
        govVerification: { score: govScore, max: 25 },
        documents: { score: docScore, max: 25 },
        financials: { score: finScore, max: 25 },
        projectEvidence: { score: projScore, max: 25 },
        fraudRiskPenalty: { score: fraudPenalty, max: 20 }
      },
      recommendations
    };
  }
}

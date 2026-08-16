export interface FraudAnalysisInput {
  documentsCount: number;
  verifiedDocsCount: number;
  govVerified: boolean;
  beneficiaryCount: number;
  duplicateBeneficiariesCount: number;
  totalDonations: number;
  totalExpenses: number;
  locationMismatchCount?: number;
}

export interface FraudAnalysisResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  recommendations: string[];
}

export class FraudDetectionService {
  static analyze(input: FraudAnalysisInput): FraudAnalysisResult {
    let score = 0;
    const reasons: string[] = [];
    const recommendations: string[] = [];

    // 1. Government verification check
    if (!input.govVerified) {
      score += 25;
      reasons.push('Government verification is pending or incomplete');
      recommendations.push('Complete NGO Darpan / PAN / Tax Certificate verification');
    } else {
      reasons.push('✓ Government compliance & registration verified');
    }

    // 2. Document verification ratio
    const unverifiedDocs = input.documentsCount - input.verifiedDocsCount;
    if (unverifiedDocs > 0) {
      score += Math.min(20, unverifiedDocs * 10);
      reasons.push(`${unverifiedDocs} supporting document(s) pending audit review`);
      recommendations.push('Upload high-resolution audit reports & bank certificates');
    } else if (input.documentsCount > 0) {
      reasons.push('✓ All uploaded financial & registration documents audited');
    }

    // 3. Beneficiary integrity & duplicates
    if (input.duplicateBeneficiariesCount > 0) {
      score += Math.min(30, input.duplicateBeneficiariesCount * 15);
      reasons.push(`⚠ Potential duplicate beneficiary count detected (${input.duplicateBeneficiariesCount} flagged entries)`);
      recommendations.push('Run deduplication review on Aadhaar/Demographic records');
    } else {
      reasons.push('✓ Beneficiary identity deduplication passed');
    }

    // 4. Financial utilization ratio anomaly
    if (input.totalDonations > 0) {
      const utilRate = input.totalExpenses / input.totalDonations;
      if (utilRate > 1.25) {
        score += 20;
        reasons.push('⚠ Reported expenses exceed total received funds by > 25%');
        recommendations.push('Audit financial expense receipts against bank ledgers');
      } else if (utilRate < 0.1 && input.totalDonations > 100000) {
        score += 15;
        reasons.push('⚠ Very low fund utilization rate (< 10%) relative to total received donations');
        recommendations.push('Provide active project deployment updates');
      } else {
        reasons.push('✓ Financial expense to donation velocity ratio is consistent');
      }
    }

    // 5. Geo-location evidence mismatch check
    if (input.locationMismatchCount && input.locationMismatchCount > 0) {
      score += 20;
      reasons.push(`⚠ Geo-tag mismatch detected on ${input.locationMismatchCount} project evidence uploads`);
      recommendations.push('Re-verify field evidence coordinates against project boundary');
    }

    score = Math.min(100, Math.max(0, score));

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score >= 70) riskLevel = 'HIGH';
    else if (score >= 40) riskLevel = 'MEDIUM';

    if (recommendations.length === 0) {
      recommendations.push('Maintain quarterly reporting consistency');
    }

    return {
      riskScore: score,
      riskLevel,
      reasons,
      recommendations
    };
  }
}

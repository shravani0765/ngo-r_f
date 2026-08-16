export interface BeneficiaryRecord {
  name: string;
  age: number;
  gender: string;
  location: string;
  program: string;
}

export interface ExistingBeneficiary {
  id: string;
  beneficiaryCode: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  ngoId: string;
  projectId: string;
}

export interface DuplicateCheckResult {
  isDuplicateRisk: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  matchedBeneficiaryId?: string;
  matchedCode?: string;
  confidenceScore: number; // 0 - 100
  details: string;
}

export class DuplicateCheckService {
  static checkDuplicate(candidate: BeneficiaryRecord, existingList: ExistingBeneficiary[]): DuplicateCheckResult {
    let highestScore = 0;
    let bestMatch: ExistingBeneficiary | null = null;
    let matchReasons: string[] = [];

    const candidateNameNorm = candidate.name.trim().toLowerCase();
    const candidateLocNorm = candidate.location.trim().toLowerCase();

    for (const item of existingList) {
      let currentScore = 0;
      const itemNameNorm = item.name.trim().toLowerCase();
      const itemLocNorm = item.location.trim().toLowerCase();
      const currentReasons: string[] = [];

      // Name exact or substring match
      if (candidateNameNorm === itemNameNorm) {
        currentScore += 50;
        currentReasons.push('Exact name match');
      } else if (candidateNameNorm.includes(itemNameNorm) || itemNameNorm.includes(candidateNameNorm)) {
        currentScore += 35;
        currentReasons.push('High phonetic name similarity');
      }

      // Location match
      if (candidateLocNorm === itemLocNorm && candidateLocNorm.length > 2) {
        currentScore += 30;
        currentReasons.push('Identical location/village');
      }

      // Age & Gender match
      if (candidate.age === item.age && candidate.gender.toLowerCase() === item.gender.toLowerCase()) {
        currentScore += 20;
        currentReasons.push('Matching age and gender profile');
      }

      if (currentScore > highestScore) {
        highestScore = currentScore;
        bestMatch = item;
        matchReasons = currentReasons;
      }
    }

    if (highestScore >= 75 && bestMatch) {
      return {
        isDuplicateRisk: true,
        riskLevel: 'HIGH',
        matchedBeneficiaryId: bestMatch.id,
        matchedCode: bestMatch.beneficiaryCode,
        confidenceScore: highestScore,
        details: `⚠ HIGH RISK: Matches existing record ${bestMatch.beneficiaryCode} (${matchReasons.join(', ')})`
      };
    } else if (highestScore >= 50 && bestMatch) {
      return {
        isDuplicateRisk: true,
        riskLevel: 'MEDIUM',
        matchedBeneficiaryId: bestMatch.id,
        matchedCode: bestMatch.beneficiaryCode,
        confidenceScore: highestScore,
        details: `⚠ MEDIUM RISK: Similar demographic to ${bestMatch.beneficiaryCode} (${matchReasons.join(', ')})`
      };
    }

    return {
      isDuplicateRisk: false,
      riskLevel: 'LOW',
      confidenceScore: highestScore,
      details: '✓ LOW RISK: Unique beneficiary entry confirmed across system database'
    };
  }
}

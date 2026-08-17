export interface BeneficiaryRecord {
  name?: string;
  age?: number | string;
  gender?: string;
  location?: string;
  program?: string;
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

export interface DuplicateMatch {
  beneficiaryId: string;
  beneficiaryCode: string;
  score: number;
  reasons: string[];
  crossOrganisation: boolean;
}

export interface DuplicateCheckResult {
  isDuplicateRisk: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  matchedBeneficiaryId?: string;
  matchedCode?: string;
  confidenceScore: number; // 0 - 100
  details: string;
  matches: DuplicateMatch[];
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Levenshtein-based similarity, 0..1. Catches transpositions and small
 * misspellings ("Aarav Kumar" vs "Aarav Kumaar") that exact matching misses.
 */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = new Array(cols);
  let curr = new Array(cols);

  for (let j = 0; j < cols; j++) prev[j] = j;

  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  const distance = prev[cols - 1];
  return 1 - distance / Math.max(a.length, b.length);
}

/** Tokens shared between two names, ignoring order ("Kumar Aarav" ≈ "Aarav Kumar"). */
function tokenOverlap(a: string, b: string): number {
  const at = new Set(a.split(' ').filter(Boolean));
  const bt = new Set(b.split(' ').filter(Boolean));
  if (!at.size || !bt.size) return 0;
  let shared = 0;
  at.forEach(t => { if (bt.has(t)) shared++; });
  return shared / Math.max(at.size, bt.size);
}

export class DuplicateCheckService {
  /**
   * Scores a candidate against existing records. Missing fields are tolerated —
   * the endpoint is public, so a partial body must never throw.
   *
   * Scoring (max 100):
   *   name similarity      up to 50
   *   same location        30
   *   same age + gender    20
   */
  static checkDuplicate(candidate: BeneficiaryRecord, existingList: ExistingBeneficiary[]): DuplicateCheckResult {
    const candName = norm(candidate.name);
    const candLoc = norm(candidate.location);
    const candGender = norm(candidate.gender);
    const candAge = Number(candidate.age);
    const hasAge = Number.isFinite(candAge);

    const matches: DuplicateMatch[] = [];

    if (candName) {
      for (const item of existingList) {
        const itemName = norm(item.name);
        const itemLoc = norm(item.location);
        const reasons: string[] = [];
        let score = 0;

        const nameScore = Math.max(similarity(candName, itemName), tokenOverlap(candName, itemName));
        if (nameScore >= 0.99) {
          score += 50;
          reasons.push('Same name');
        } else if (nameScore >= 0.82) {
          score += 35;
          reasons.push('Very similar name');
        } else if (nameScore >= 0.7) {
          score += 20;
          reasons.push('Similar name');
        }

        // Location only counts when it is specific enough to mean something.
        if (candLoc && candLoc === itemLoc && candLoc.length > 2) {
          score += 30;
          reasons.push('Same village or area');
        }

        if (hasAge && candAge === item.age && candGender && candGender === norm(item.gender)) {
          score += 20;
          reasons.push('Same age and gender');
        }

        if (score >= 50) {
          matches.push({
            beneficiaryId: item.id,
            beneficiaryCode: item.beneficiaryCode,
            score,
            reasons,
            crossOrganisation: false
          });
        }
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const top = matches[0];
    const confidenceScore = top ? Math.min(100, top.score) : 0;

    if (top && confidenceScore >= 75) {
      return {
        isDuplicateRisk: true,
        riskLevel: 'HIGH',
        matchedBeneficiaryId: top.beneficiaryId,
        matchedCode: top.beneficiaryCode,
        confidenceScore,
        details: `Looks like the same person as ${top.beneficiaryCode} (${top.reasons.join(', ').toLowerCase()}).`,
        matches: matches.slice(0, 5)
      };
    }

    if (top && confidenceScore >= 50) {
      return {
        isDuplicateRisk: true,
        riskLevel: 'MEDIUM',
        matchedBeneficiaryId: top.beneficiaryId,
        matchedCode: top.beneficiaryCode,
        confidenceScore,
        details: `Possibly the same person as ${top.beneficiaryCode} (${top.reasons.join(', ').toLowerCase()}). Worth a second look.`,
        matches: matches.slice(0, 5)
      };
    }

    return {
      isDuplicateRisk: false,
      riskLevel: 'LOW',
      confidenceScore,
      details: 'No matching record found. This looks like a new person.',
      matches: []
    };
  }
}

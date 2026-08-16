export interface GovVerifyInput {
  regNum: string;
  pan: string;
  certificate12A: string;
  certificate80G: string;
}

export interface GovVerifyOutput {
  overallStatus: 'VERIFIED' | 'PENDING' | 'FAILED' | 'REQUIRES_REVIEW';
  regNumStatus: 'VERIFIED' | 'FAILED';
  panStatus: 'VERIFIED' | 'FAILED';
  cert12AStatus: 'VERIFIED' | 'FAILED';
  cert80GStatus: 'VERIFIED' | 'FAILED';
  verificationSource: string;
  timestamp: string;
  notes: string;
}

export class MockGovernmentVerificationService {
  static verify(input: GovVerifyInput): GovVerifyOutput {
    // Deterministic simulation: If regNum contains "INVALID" or length < 5, fail regNum
    const regValid = input.regNum && input.regNum.length >= 5 && !input.regNum.toUpperCase().includes('INVALID');
    const panValid = input.pan && input.pan.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(input.pan.toUpperCase());
    const cert12AValid = input.certificate12A && input.certificate12A.length >= 4;
    const cert80GValid = input.certificate80G && input.certificate80G.length >= 4;

    const allPassed = regValid && panValid && cert12AValid && cert80GValid;

    return {
      overallStatus: allPassed ? 'VERIFIED' : 'REQUIRES_REVIEW',
      regNumStatus: regValid ? 'VERIFIED' : 'FAILED',
      panStatus: panValid ? 'VERIFIED' : 'FAILED',
      cert12AStatus: cert12AValid ? 'VERIFIED' : 'FAILED',
      cert80GStatus: cert80GValid ? 'VERIFIED' : 'FAILED',
      verificationSource: 'Mock Gov Portal API (NGO Darpan & Income Tax Dept Gateway)',
      timestamp: new Date().toISOString(),
      notes: allPassed 
        ? '✓ Registration number, PAN tax status, 12A exemption, and 80G tax deductibility status verified against government databases.'
        : '⚠ Discrepancies detected in registration or tax certificates. Admin review recommended.'
    };
  }
}

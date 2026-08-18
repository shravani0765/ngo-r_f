import crypto from 'crypto';

/**
 * Handling of identity numbers (Aadhaar, PAN, Voter ID).
 *
 * Full numbers are never stored. We keep a salted hash — enough to detect the
 * same document being submitted twice — plus the last four characters so the
 * UI can show a masked value. A database dump therefore cannot be turned back
 * into a list of Aadhaar numbers.
 */

const PEPPER = process.env.IDENTITY_PEPPER ?? process.env.JWT_SECRET ?? 'dev-identity-pepper';

/* -- Validation ---------------------------------------------------------- */

/** Aadhaar: 12 digits, first digit 2-9. Verified with the Verhoeff checksum. */
export function isValidAadhaar(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^[2-9]\d{11}$/.test(digits)) return false;
  return verhoeffValid(digits);
}

/** PAN: five letters, four digits, one letter — e.g. AAATH1234F. */
export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());
}

/** Voter ID (EPIC): three letters followed by seven digits. */
export function isValidVoterId(value: string): boolean {
  return /^[A-Z]{3}[0-9]{7}$/.test(value.trim().toUpperCase());
}

/** Indian mobile: 10 digits starting 6-9, with an optional +91 prefix. */
export function isValidIndianPhone(value: string): boolean {
  const digits = value.replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)/, '');
  return /^[6-9]\d{9}$/.test(digits);
}

/** PIN code: six digits, cannot start with zero. */
export function isValidPinCode(value: string): boolean {
  return /^[1-9]\d{5}$/.test(value.trim());
}

/** UPI ID: handle@provider. */
export function isValidUpiId(value: string): boolean {
  return /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/.test(value.trim());
}

/** IFSC: four letters, a zero, then six alphanumerics. */
export function isValidIfsc(value: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.trim().toUpperCase());
}

/* -- Storage helpers ----------------------------------------------------- */

/** Salted, peppered hash used only to spot the same number submitted twice. */
export function hashIdentityNumber(value: string): string {
  const normalised = value.replace(/[\s-]/g, '').toUpperCase();
  return crypto.createHmac('sha256', PEPPER).update(normalised).digest('hex');
}

export function lastFour(value: string): string {
  const normalised = value.replace(/[\s-]/g, '');
  return normalised.slice(-4);
}

/** Renders a stored last-four value for display, never the full number. */
export function maskIdentity(docType: string, last4: string | null | undefined): string {
  if (!last4) return 'Not provided';
  switch (docType) {
    case 'AADHAAR':
      return `XXXX XXXX ${last4}`;
    case 'PAN':
      return `XXXXX${last4}`;
    case 'VOTER_ID':
      return `XXX${last4}`;
    default:
      return `••••${last4}`;
  }
}

/** Keeps only the last four digits of a bank account number. */
export function maskAccountNumber(last4: string | null | undefined): string {
  return last4 ? `XXXXXX${last4}` : 'Not provided';
}

/* -- Verhoeff checksum (used by UIDAI for Aadhaar) ------------------------ */

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

function verhoeffValid(num: string): boolean {
  let c = 0;
  const reversed = num.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D[c][P[i % 8][Number(reversed[i])]];
  }
  return c === 0;
}

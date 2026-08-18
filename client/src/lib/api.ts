/** Thin fetch wrapper. Surfaces the server's own message on failure. */

const TOKEN_KEY = 'ngo-commons-token';

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function send<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that it is running.');
  }

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? 'Something went wrong. Please try again.');
  }

  return data as T;
}

export const api = {
  get: <T>(p: string) => send<T>('GET', p),
  post: <T>(p: string, b?: unknown) => send<T>('POST', p, b ?? {}),
  put: <T>(p: string, b?: unknown) => send<T>('PUT', p, b ?? {}),
  patch: <T>(p: string, b?: unknown) => send<T>('PATCH', p, b ?? {}),
  del: <T>(p: string) => send<T>('DELETE', p),
  upload: <T>(p: string, form: FormData) => send<T>('POST', p, form, true)
};

/* -- Shared shapes ------------------------------------------------------- */

export type Role = 'ADMIN' | 'NGO' | 'DONOR' | 'PUBLIC';

export type NgoStatus =
  | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_CORRECTION' | 'SUSPENDED';

export interface User {
  id: string; email: string; name: string; role: Role; phone?: string;
  ngo?: { id: string; name: string; status: NgoStatus } | null;
}

export interface Doc {
  id: string;
  docType: string;
  fileName: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  numberLast4?: string | null;
  masked?: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  reviewNotes?: string | null;
  uploadDate: string;
  ngo?: { id: string; name: string };
}

export interface Payment {
  upiId?: string | null;
  qrCodeAvailable?: boolean;
  qrCodeUrl?: string | null;
  bankAccountName?: string | null;
  accountNumberLast4?: string | null;
  accountNumberMasked?: string;
  ifsc?: string | null;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  activityDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string | null;
  createdAt: string;
  ngo?: { id: string; name: string; city: string; state: string };
}

export interface Finance {
  totalReceived: number; totalSpent: number; remaining: number; utilisationPercent: number;
}

export interface Ngo {
  id: string; userId: string;
  name: string; description: string; presidentName: string;
  regNum: string; address: string; city: string; state: string;
  district: string; pinCode: string; phone: string; email: string;
  website?: string | null; mission: string; areaOfWork: string; sector?: string;
  status: NgoStatus; statusReason?: string | null;
  transparencyScore: number; fraudRiskScore: number;
  establishedYear?: number;
  createdAt: string; verifiedAt?: string | null;
  totalReceived?: number; totalDonations?: number; donationCount?: number;
  documents?: Doc[]; payment?: Payment | null; causes?: string[];
  activities?: Activity[]; finance?: Finance;
  viewerIsOwner?: boolean; viewerIsAdmin?: boolean;
  _count?: { documents: number; activities?: number; projects?: number };
}

export interface Donation {
  id: string; amount: number; category: string; purpose: string;
  date: string; txnId: string; referenceId?: string | null;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  ngo?: { id: string; name: string };
  donor?: { id: string; name: string; email?: string };
  block?: { blockNumber: number; currentHash: string } | null;
}

/** One record in the donation hash chain. */
export interface Block {
  id: string; blockNumber: number; prevHash: string; currentHash: string;
  txnId: string; amount: number; timestamp: string;
  ngo?: { id: string; name: string };
  project?: { id: string; title: string } | null;
}

export interface PayTo {
  ngoName: string;
  upiId?: string | null;
  qrCodeAvailable: boolean;
  qrCodeUrl?: string | null;
}

export interface AdminStats {
  totalNGOs: number; verifiedNGOs: number; pendingNGOs: number; rejectedNGOs: number;
  totalDonatedAmount: number; totalLedgerBlocks: number;
  openAlerts: number; openReports: number; pendingDocuments: number;
  avgTransparencyScore: number | null; actionsWaiting: number;
  totalBeneficiaries: number; duplicateBeneficiaries: number;
}

export interface Overview {
  hasData: boolean;
  verifiedNgos: number; totalNgos: number; totalProjects: number;
  totalBeneficiaries: number; totalDonatedAmount: number; totalExpensedAmount: number;
  utilisationPercent: number; ledgerRecords: number; evidencePhotos: number;
  costPerBeneficiary: number | null;
  sectorDistribution: { sector: string; projects: number; percentage: number }[];
  stateDistribution: { state: string; organisations: number }[];
}

export interface Note {
  id: string; title: string; message: string; type: string;
  link?: string | null; read: boolean; createdAt: string;
}

export interface Report {
  id: string; trackingCode: string; category: string; description: string;
  status: string; createdAt: string; ngo?: { id: string; name: string } | null;
}

/* -- Reference data ------------------------------------------------------ */

export const CAUSES = [
  'Free Education',
  'Free Food',
  'Medical Support',
  'Child Welfare',
  'Women Empowerment',
  'Old Age Support',
  'Disaster Relief',
  'Community Development',
  'Other'
] as const;

export const DOCUMENT_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar card', needsNumber: true, hint: '12 digits' },
  { value: 'PAN', label: 'PAN card', needsNumber: true, hint: 'e.g. AAATH1234F' },
  { value: 'VOTER_ID', label: 'Voter ID', needsNumber: true, hint: 'e.g. ABC1234567' },
  { value: 'GOV_CERTIFICATE', label: 'Government NGO certificate', needsNumber: false, hint: '' },
  { value: 'REGISTRATION', label: 'Registration certificate', needsNumber: false, hint: '' },
  { value: 'AUDIT_REPORT', label: 'Audited financial statement', needsNumber: false, hint: '' }
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

/* -- Client-side validation (mirrors the server) -------------------------- */

export const validate = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  phone: (v: string) => /^[6-9]\d{9}$/.test(v.replace(/[\s\-()+]/g, '').replace(/^(91|0)/, '')),
  pin: (v: string) => /^[1-9]\d{5}$/.test(v.trim()),
  pan: (v: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase()),
  aadhaar: (v: string) => /^[2-9]\d{11}$/.test(v.replace(/[\s-]/g, '')),
  voterId: (v: string) => /^[A-Z]{3}[0-9]{7}$/.test(v.trim().toUpperCase()),
  upi: (v: string) => /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/.test(v.trim()),
  ifsc: (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase())
};

/* -- Formatting ---------------------------------------------------------- */

export const money = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

export function shortMoney(n: number): string {
  const v = n || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return money(v);
}

export const num = (n: number) => new Intl.NumberFormat('en-IN').format(n || 0);

export const date = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const docLabel = (t: string) =>
  DOCUMENT_TYPES.find(d => d.value === t)?.label ?? t.replace(/_/g, ' ').toLowerCase();

/** Human wording for a verification status. */
export const statusLabel = (s: string) => ({
  PENDING: 'Awaiting review',
  UNDER_REVIEW: 'Being reviewed',
  VERIFIED: 'Verified',
  REJECTED: 'Not approved',
  REQUIRES_CORRECTION: 'Changes needed',
  SUSPENDED: 'Suspended',
  APPROVED: 'Approved',
  SUCCESSFUL: 'Successful',
  FAILED: 'Failed'
}[s] ?? s.replace(/_/g, ' ').toLowerCase());

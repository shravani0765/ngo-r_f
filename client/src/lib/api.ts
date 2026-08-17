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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that it is running.');
  }

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;

  if (!res.ok) {
    // The server always sends a human-readable `message`; never show a raw status.
    throw new ApiError(res.status, data?.message ?? 'Something went wrong. Please try again.');
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path)
};

/* -- Shared shapes ------------------------------------------------------- */

export type Role = 'ADMIN' | 'NGO' | 'DONOR' | 'PUBLIC';

export interface User {
  id: string; email: string; name: string; role: Role;
  ngo?: { id: string; name: string; status: string } | null;
}

export interface Ngo {
  id: string; name: string; regNum: string; pan: string;
  certificate12A: string; certificate80G: string;
  state: string; district: string; address: string; mission: string;
  areaOfWork: string; sector?: string; website?: string; email: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_CORRECTION';
  transparencyScore: number; fraudRiskScore: number;
  totalReceived?: number; projectCount?: number; beneficiaryCount?: number;
  documents?: Doc[]; projects?: Project[]; govVerification?: GovCheck | null;
  finance?: Finance; alerts?: Alert[];
  _count?: { projects: number; beneficiaries: number; documents: number };
}

export interface Finance {
  totalReceived: number; totalSpent: number; remaining: number; utilisationPercent: number;
}

export interface Doc {
  id: string; docType: string; fileName: string; hash: string;
  status: string; reviewNotes?: string | null; uploadDate: string;
  ngo?: { id: string; name: string };
}

export interface GovCheck {
  regNumStatus: string; panStatus: string; cert12AStatus: string;
  cert80GStatus: string; overallStatus: string; notes?: string | null;
}

export interface Evidence {
  id: string; phase: string; caption: string; imageUrl: string;
  lat: number; lng: number; distanceKm: number; geoStatus: string; capturedAt: string;
}

export interface Project {
  id: string; ngoId: string; title: string; description: string; category: string;
  sdgGoals: string; location: string; state: string; district: string;
  budget: number; expectedBeneficiaries: number; actualBeneficiaries: number;
  status: string; lat?: number | null; lng?: number | null; image?: string | null;
  ngo?: { id: string; name: string; status: string; transparencyScore: number };
  evidence?: Evidence[]; finance?: Finance;
  communityVerifications?: CommunityReport[];
  expenses?: Expense[];
  _count?: { beneficiaries: number; donations: number; expenses: number; evidence?: number };
}

export interface Expense {
  id: string; category: string; amount: number; description: string;
  date: string; receiptUrl?: string | null; project?: { id: string; title: string };
}

export interface Donation {
  id: string; amount: number; purpose: string; date: string; txnId: string;
  ngo?: { id: string; name: string }; project?: { id: string; title: string };
  block?: { blockNumber: number; currentHash: string };
}

export interface Block {
  id: string; blockNumber: number; prevHash: string; currentHash: string;
  txnId: string; amount: number; timestamp: string;
  ngo?: { name: string }; project?: { title: string };
}

export interface Beneficiary {
  id: string; beneficiaryCode: string; name: string; age: number; gender: string;
  location: string; program: string; supportType: string;
  duplicateRisk: 'LOW' | 'MEDIUM' | 'HIGH'; duplicateDetails?: string | null;
  registrationDate: string; project?: { title: string };
}

export interface Alert {
  id: string; riskScore: number; riskLevel: string; reason: string;
  affectedRecord: string; status: string; date: string;
  ngo?: { id: string; name: string };
}

export interface CommunityReport {
  id: string; observerName: string; location: string; observation: string;
  verdict: 'CONFIRMED' | 'DISPUTED'; status: string; createdAt: string;
}

export interface Report {
  id: string; trackingCode: string; category: string; description: string;
  status: string; createdAt: string; ngo?: { id: string; name: string } | null;
}

export interface Note {
  id: string; title: string; message: string; type: string;
  link?: string | null; read: boolean; createdAt: string;
}

export interface Overview {
  hasData: boolean;
  verifiedNgos: number; totalNgos: number; totalProjects: number; activeProjects: number;
  totalBeneficiaries: number; totalDonatedAmount: number; totalExpensedAmount: number;
  remainingAmount: number; utilisationPercent: number; ledgerRecords: number;
  evidencePhotos: number; communityConfirmations: number; costPerBeneficiary: number | null;
  sectorDistribution: { sector: string; projects: number; percentage: number }[];
  stateDistribution: { state: string; organisations: number }[];
}

export interface AdminStats {
  totalNGOs: number; verifiedNGOs: number; pendingNGOs: number; rejectedNGOs: number;
  totalProjects: number; totalBeneficiaries: number; duplicateBeneficiaries: number;
  totalDonatedAmount: number; totalExpensedAmount: number; totalLedgerBlocks: number;
  openAlerts: number; openReports: number; pendingDocuments: number;
  avgTransparencyScore: number | null; actionsWaiting: number;
}

export interface ScoreBand { key: string; label: string; score: number; max: number; detail: string }

export interface Scores {
  fraud: {
    riskScore: number; riskLevel: string; headline: string;
    signals: { label: string; points: number; status: string; advice?: string }[];
    recommendations: string[];
  };
  transparency: {
    overallScore: number; grade: string; headline: string;
    bands: ScoreBand[]; recommendations: string[];
  };
}

/* -- Formatting ---------------------------------------------------------- */

export const money = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

/** Indian short form: 12.5L, 4.85Cr — far easier to scan than full digits. */
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

export function parseSdgs(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw ? [raw] : [];
  }
}

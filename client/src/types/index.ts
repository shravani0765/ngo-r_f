export type Role = 'ADMIN' | 'NGO' | 'DONOR' | 'PUBLIC';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  ngo?: NGO;
}

export interface NGO {
  id: string;
  userId: string;
  name: string;
  regNum: string;
  pan: string;
  certificate12A: string;
  certificate80G: string;
  csrReg?: string;
  address: string;
  state: string;
  district: string;
  phone: string;
  email: string;
  website?: string;
  mission: string;
  areaOfWork: string;
  sector?: string;
  establishedYear: number;
  employees: number;
  volunteers: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_CORRECTION';
  transparencyScore: number;
  fraudRiskScore: number;
  verifiedAt?: string;
  documents?: NGODocument[];
  govVerification?: GovVerification;
  projects?: Project[];
  donations?: Donation[];
  expenses?: Expense[];
}

export interface NGODocument {
  id: string;
  ngoId: string;
  docType: string;
  fileName: string;
  filePath: string;
  hash: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_CORRECTION';
  verificationStatus: string;
  uploadDate: string;
  verifiedAt?: string;
}

export interface GovVerification {
  id: string;
  ngoId: string;
  regNumStatus: 'VERIFIED' | 'FAILED' | 'PENDING';
  panStatus: 'VERIFIED' | 'FAILED' | 'PENDING';
  cert12AStatus: 'VERIFIED' | 'FAILED' | 'PENDING';
  cert80GStatus: 'VERIFIED' | 'FAILED' | 'PENDING';
  overallStatus: 'VERIFIED' | 'FAILED' | 'PENDING' | 'REQUIRES_REVIEW';
  verifiedAt: string;
  notes?: string;
}

export interface Project {
  id: string;
  ngoId: string;
  ngo?: { id: string; name: string; transparencyScore: number; status: string };
  title: string;
  description: string;
  category: string;
  sdgGoals: string; // JSON string array
  location: string;
  state: string;
  district: string;
  startDate: string;
  endDate: string;
  budget: number;
  expectedBeneficiaries: number;
  actualBeneficiaries: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';
  lat?: number;
  lng?: number;
  image?: string;
  _count?: { beneficiaries: number; donations: number; expenses: number };
}

export interface Beneficiary {
  id: string;
  projectId: string;
  ngoId: string;
  beneficiaryCode: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  program: string;
  supportType: string;
  duplicateRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  duplicateDetails?: string;
  registrationDate: string;
  project?: { title: string };
  ngo?: { name: string };
}

export interface Donation {
  id: string;
  donorId: string;
  ngoId: string;
  projectId: string;
  amount: number;
  date: string;
  purpose: string;
  paymentStatus: string;
  txnId: string;
  blockId?: string;
  donor?: { name: string; email: string };
  ngo?: { name: string };
  project?: { title: string };
  block?: BlockchainBlock;
}

export interface Expense {
  id: string;
  ngoId: string;
  projectId: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  receiptUrl?: string;
  approvedBy: string;
  project?: { title: string };
}

export interface BlockchainBlock {
  id: string;
  blockNumber: number;
  prevHash: string;
  currentHash: string;
  txnId: string;
  amount: number;
  donorId: string;
  ngoId: string;
  projectId: string;
  timestamp: string;
  ngo?: { name: string };
  project?: { title: string };
  donation?: { purpose: string; txnId: string };
}

export interface FraudAlert {
  id: string;
  ngoId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  affectedRecord: string;
  status: 'UNRESOLVED' | 'INVESTIGATING' | 'RESOLVED';
  date: string;
  ngo?: { name: string };
}

export interface AuditLog {
  id: string;
  userId?: string;
  userRole: string;
  action: string;
  module: string;
  recordId?: string;
  details: string;
  timestamp: string;
  user?: { name: string; email: string };
}

export interface WhistleblowerReport {
  id: string;
  trackingCode: string;
  ngoId?: string;
  projectId?: string;
  category: string;
  description: string;
  evidenceUrl?: string;
  status: 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  ngo?: { name: string };
  project?: { title: string };
}

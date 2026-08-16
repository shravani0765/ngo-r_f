
# NGO Impact Data Commons

> **"Verified Impact. Transparent Funds. Trusted NGOs."**

A production-ready full-stack AI-assisted platform for NGO identity verification, SHA-256 document hashing, cryptographic donation tracking, duplicate beneficiary detection, and open transparency reporting.

---

## Key Features

1. **Role-Based Authentication**: Built-in support for NGO, Admin, Donor, and Public roles with one-click demo login presets.
2. **SHA-256 Document Hashing**: Computes real-time cryptographic SHA-256 checksums on uploaded audit reports and tax certificates, with instant tamper detection.
3. **Mock Government Verification Service**: API simulation checking NGO Darpan, Income Tax 12A/80G, and PAN registration credentials against government databases.
4. **Cryptographic Donation Ledger**: Blockchain-style immutable ledger where each donation generates a block payload (`currentHash = SHA256(previousHash + payload)`), with automated chain integrity verification.
5. **AI Impact Integrity & Fraud Detection Engine**: Computes Fraud Risk Scores (0-100), Transparency Scores (0-100), auto-tags UN Sustainable Development Goals (SDGs 1-17), and detects duplicate beneficiary entries.
6. **Visual Fund Flow & SROI Analytics**: Interactive SVG fund flow tracking money movement from Donor → NGO → Project → Expense → Beneficiary with Social Return on Investment (SROI 1.85:1) calculations.
7. **Admin Review & Audit Log System**: Comprehensive auditor control panel with real-time NGO approval, whistleblower triage, and immutable system event logs.
8. **Public Directory & Developer REST API**: Publicly searchable registry of verified NGOs, macro impact analytics, and interactive API documentation with copyable JSON response schemas.
9. **NGO Impact Assistant (AI Chatbot)**: Floating AI chatbot widget answering platform navigation, verification rules, and tax compliance queries.

---

## Technology Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router
- **Backend**: Node.js, Express.js, TypeScript
- **Database & ORM**: SQLite, Prisma ORM
- **Cryptography & Hashing**: SHA-256 (`crypto` module)
- **Authentication**: JWT, bcrypt password hashing

---

## Demo Login Credentials

For instant demonstration, use the pre-configured accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@ngocommons.demo` | `Admin@123` |
| **NGO** | `ngo@ngocommons.demo` | `NGO@123` |
| **Donor** | `donor@ngocommons.demo` | `Donor@123` |
| **Public** | `public@ngocommons.demo` | `Public@123` |

---

## Quick Start & Running Locally

### 1. Start Backend Server (Port 5000)
```bash
cd server
npm run dev
```

### 2. Start Frontend App (Port 5173)
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Architecture Diagram & Flow

```
USER REGISTRATION / LOGIN
       │
       ▼
DOCUMENT UPLOAD & SHA-256 HASHING
       │
       ▼
GOVERNMENT API VERIFICATION (/api/government/verify)
       │
       ▼
AI FRAUD DETECTION / RISK SCORING
       │
       ▼
ADMIN AUDITOR REVIEW & APPROVAL
       │
       ▼
CRYPTOGRAPHIC DONATION LEDGER (SHA-256 BLOCK CHAIN)
       │
       ▼
PUBLIC TRANSPARENCY PORTAL & SROI ANALYTICS
```


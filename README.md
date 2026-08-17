# NGO Impact Data Commons

> **"Verified Impact. Transparent Funds. Trusted NGOs."**

A full-stack platform for NGO verification, tamper-evident donation tracking, duplicate
beneficiary detection, and public transparency reporting.

---

## Quick start

You need Node.js 18+. Three commands, in order.

### 1. Set up the database (first run only)

```bash
cd server
npm install
npx prisma db push      # create the SQLite database
npm run db:seed         # load demo organisations, projects and donations
```

### 2. Start the backend (port 5001)

```bash
cd server
npm run dev
```

### 3. Start the frontend (port 5173)

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**.

> If you skip `npm run db:seed`, the app will load but every page will be empty —
> that is expected, not a bug. The platform never invents figures it does not have.

---

## Demo accounts

The sign-in page has one-click buttons for each of these.

| Role | Email | Password |
|---|---|---|
| **Auditor (admin)** | `admin@ngocommons.demo` | `Admin@123` |
| **NGO** | `ngo@ngocommons.demo` | `NGO@1234` |
| **Donor** | `donor@ngocommons.demo` | `Donor@123` |
| **Public** | `public@ngocommons.demo` | `Public@123` |

Admin accounts cannot be created through sign-up — they exist only in the seed.

---

## What it does

1. **Role-based access.** NGO, Donor, Public and Auditor roles. Every write is checked
   against the signed-in account, so an organisation can only edit its own records.

2. **Government credential check.** Simulates NGO Darpan, PAN, 12A and 80G lookups. Passing
   the check is not enough on its own — a human auditor still approves an organisation
   before it becomes publicly visible.

3. **Document integrity.** A SHA-256 digest is computed over each document's contents and
   stored alongside it. The "check it is unchanged" action re-hashes the stored payload and
   compares, so alteration is genuinely detectable.

4. **Tamper-evident donation ledger.** Each donation is written as a record containing the
   previous record's hash (`currentHash = SHA256(blockNumber : prevHash : txnId : amount :
   donorId : ngoId : projectId : timestamp)`). Editing any past record breaks every link
   after it. Anyone can re-verify the whole chain from the Fund Records page.

5. **Impact Integrity Engine.** A transparent, rule-based anomaly scan producing a fraud
   risk score (0–100) from seven signals: government status, document backlog, duplicate
   beneficiaries, spending vs income, geographic consistency of evidence, community
   disputes, and beneficiary over-reporting. Every flag states its reason and its fix.

6. **Duplicate beneficiary detection.** Each person gets a unique ID. New records are scored
   against existing ones — including other organisations' — on name similarity, location,
   age and gender. High-confidence duplicates are blocked at save time with an explicit
   override, rather than silently recorded.

7. **Geo-tagged field evidence.** Photos carry coordinates and a before/progress/after
   phase. Distance from the project's declared site is computed on upload and flagged when
   implausible.

8. **Transparency score (0–100).** Government registration (25) + documents reviewed (25) +
   money trail (25) + project evidence (15) + community feedback (10), minus up to 20 for
   open risk flags. Recomputed automatically whenever underlying data changes.

9. **Community verification.** Anyone who was there can confirm or dispute what an NGO
   claims about a project. Disputes reduce the transparency score and alert an auditor.

10. **Anonymous reporting.** Concerns can be submitted with no account and nothing recorded
    about the reporter. A tracking code lets the reporter follow the outcome.

11. **Notifications and audit log.** Organisations are told when documents are accepted,
    changes are needed, or risk flags are raised. All privileged actions are logged.

12. **Open REST API.** `/api/public/ngos`, `/api/public/projects`, `/api/public/ledger`,
    `/api/public/statistics` — read-only JSON, no key required.

---

## Technology

- **Frontend:** React 18, TypeScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript
- **Database:** SQLite via Prisma ORM
- **Hashing:** SHA-256 (Node `crypto`)
- **Auth:** JWT with bcrypt password hashing

---

## Flow

```
REGISTER / SIGN IN
       │
       ▼
UPLOAD DOCUMENTS  ──▶  SHA-256 DIGEST STORED
       │
       ▼
GOVERNMENT CREDENTIAL CHECK  (/api/government/verify)
       │
       ▼
IMPACT INTEGRITY ENGINE  ──▶  RISK SCORE + FLAGS
       │
       ▼
AUDITOR REVIEW  ──▶  APPROVED = PUBLICLY VISIBLE
       │
       ▼
DONATIONS  ──▶  HASH-CHAINED LEDGER RECORD
       │
       ▼
PUBLIC DIRECTORY, IMPACT DASHBOARD, OPEN API
```

---

## Scope and limitations

Stated plainly, so the implementation is not mistaken for something it is not.

- **The ledger is a hash chain, not a blockchain.** It is tamper-evident and independently
  re-verifiable, but it runs in a single database. There are no distributed nodes, no
  consensus mechanism and no smart contracts. This avoids the transaction cost, latency and
  accessibility problems identified across the literature survey, at the cost of
  decentralisation.

- **SDG classification is rule-based**, matching keywords across all 17 goals with a
  confidence weighting. It is not a trained language model.

- **The government verification service is simulated.** It applies format and checksum rules
  to registration numbers, PAN, 12A and 80G values. It does not call live government APIs.

- **Documents are stored as text payloads rather than uploaded binary files.** The hashing,
  storage and integrity-verification logic is real; only the file transport is simplified.

- **SQLite is used for portability.** The Prisma schema moves to PostgreSQL by changing the
  datasource provider and connection string.

- **Demo credentials are committed** in `server/prisma/seed.ts` for evaluation convenience.
  Set a strong `JWT_SECRET` and remove the seed accounts before any public deployment; the
  server refuses to start in production without a real secret.

---

## Configuration

Optional `server/.env`:

```
PORT=5001
JWT_SECRET=<at least 16 characters — required when NODE_ENV=production>
CORS_ORIGINS=http://localhost:5173
```

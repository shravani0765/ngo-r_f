# NGO Impact Data Commons

> **"Verified organisations. Traceable donations."**

A platform where NGOs register and get verified by a real person, donors give by UPI
and can see exactly where the money went, and the public can browse proof of the work.

---

## Setup

### What you need first

- **Node.js 18 or newer** — https://nodejs.org
- **Docker Desktop** — https://docker.com/products/docker-desktop
  (this runs the PostgreSQL database; it does **not** install itself)

> **Start Docker Desktop and wait until it says "Running" before continuing.**
> Nothing below works while Docker is stopped.

### Steps

Run these in order from the project folder.

**1. Start the database**

```bash
docker compose up -d
```

**2. Set up the server**

```bash
cd server
npm install
cp .env.example .env     # Windows: copy .env.example .env
npx prisma db push       # create the tables
npm run db:seed          # load the demo data
npm run dev              # starts on port 5001 — leave this running
```

**3. Set up the app (in a second terminal)**

```bash
cd client
npm install
npm run dev              # starts on port 5173
```

**4. Open it**

http://localhost:5173

---

### If something goes wrong

| Problem | Fix |
|---|---|
| `Can't reach database server at localhost:5433` | Docker Desktop is not running. Start it, then `docker compose up -d` |
| `Environment variable not found: DATABASE_URL` | You skipped `cp .env.example .env` |
| Every page is empty | You skipped `npm run db:seed` |
| Port 5433 already in use | Change the host port in `docker-compose.yml` and in `DATABASE_URL` |
| Want to start over | `docker compose down -v` then repeat from step 1 |

---

## Demo accounts

The sign-in page has one-click buttons for each of these.

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@ngocommons.demo` | `Admin@123` |
| **NGO** (verified) | `ngo@ngocommons.demo` | `NGO@1234` |
| **NGO** (pending) | `newngo@ngocommons.demo` | `NGO@1234` |
| **Donor** | `donor@ngocommons.demo` | `Donor@123` |
| **Public** | `public@ngocommons.demo` | `Public@123` |

Admin accounts cannot be created through sign-up — they exist only in the seed.
The pending NGO is there so the approval flow can be demonstrated immediately.

---

## What it does

1. **Registration in five steps.** Organisation details, contact, login, causes, review —
   validated one step at a time rather than as one long form.

2. **Identity documents.** Aadhaar, PAN, Voter ID and a government NGO certificate are
   uploaded as JPG, PNG or PDF. **Full numbers are never stored** — only a salted hash
   for duplicate detection and the last four characters for masked display
   (`XXXX XXXX 1234`). Aadhaar is checked with the Verhoeff checksum.

3. **Documents stay private.** Files are written outside the web root and can only be
   opened through an authenticated endpoint that checks you own the document or are an
   admin. The public API response omits them entirely rather than hiding them in the UI.

4. **Manual verification.** An admin reviews each organisation and approves, asks for
   changes, rejects or suspends it — with a reason that is sent to the organisation.
   Nothing appears publicly until it is approved.

5. **UPI donations.** The donor picks a cause and amount, pays using the organisation's
   UPI ID or QR code, then enters the UPI reference to confirm. Only then is the
   donation recorded, so a claim of payment is never mistaken for payment.

6. **Tamper-evident record chain.** Each confirmed donation is written as a record
   containing the previous record's hash. Changing any past record breaks every link
   after it, and anyone can re-verify the whole chain from the Fund Records page.

7. **Impact gallery.** Organisations upload photos of their work with a title,
   description, date and category. An admin approves each one before it appears publicly.

8. **Admin panel.** Organisation table with search and filters, document and photo
   approval queues, a transaction ledger, and suspend / reactivate / delete.

9. **Password reset by email.** Single-use tokens, hashed before storage, valid for one
   hour. No OTP. Works without an email provider by printing the link to the console.

---

## Technology

- **Frontend:** React 18, TypeScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL 16 (Docker) via Prisma ORM
- **Uploads:** multer, stored on disk outside the web root
- **Security:** JWT auth, bcrypt password hashing, SHA-256 file and record hashing

---

## Flow

```
REGISTER (5 steps)
       │
       ▼
UPLOAD DOCUMENTS  ──▶  SHA-256 FINGERPRINT STORED
       │                Aadhaar/PAN/Voter ID hashed, only last 4 kept
       ▼
ADD UPI ID AND QR CODE
       │
       ▼
ADMIN REVIEWS  ──▶  APPROVED = PUBLICLY VISIBLE
       │
       ▼
DONOR GIVES BY UPI  ──▶  CONFIRMS WITH REFERENCE  ──▶  LEDGER RECORD
       │
       ▼
NGO UPLOADS PHOTOS  ──▶  ADMIN APPROVES  ──▶  PUBLIC GALLERY
```

---

## Scope and limitations

Stated plainly, so the implementation is not mistaken for something it is not.

- **The ledger is a hash chain, not a blockchain.** It is tamper-evident and anyone can
  re-verify it, but it runs in a single database. There are no distributed nodes, no
  consensus and no smart contracts. This avoids the transaction cost, latency and wallet
  requirements that the literature identifies as blockchain's main barriers, at the cost
  of decentralisation.

- **There is no Aadhaar OTP verification and no government API.** Verification is done by
  a human admin reviewing the uploaded documents, which is deliberate.

- **12A and 80G are not part of this system.**

- **Payments are not automated.** The donor pays by UPI outside the platform and enters
  the reference number. A real payment gateway would replace this step.

- **SDG classification is rule-based**, matching keywords rather than using a trained
  language model.

- **Demo credentials are committed** in `server/prisma/seed.ts` for evaluation. Set a
  strong `JWT_SECRET` and remove the seed accounts before deploying anywhere public; the
  server refuses to start in production without a real secret.

---

## Open data API

Read-only, no key required.

| Endpoint | Returns |
|---|---|
| `GET /api/public/ngos` | Verified organisations |
| `GET /api/public/gallery` | Approved impact photos |
| `GET /api/public/ledger` | The donation record chain |
| `GET /api/public/statistics` | Aggregate figures |

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { BlockchainService, GENESIS_HASH } from '../src/services/blockchain.service';
import { recomputeScores } from '../src/services/scoring.service';
import { distanceKm, classifyDistance } from '../src/services/geo.service';

const prisma = new PrismaClient();

/** Builds a document row whose hash genuinely matches its stored contents. */
function document(ngoId: string, docType: string, fileName: string, body: string, status: string) {
  const content = `${docType}\n${fileName}\n${body}`;
  return {
    ngoId,
    docType,
    fileName,
    filePath: `/uploads/${ngoId}/${docType.toLowerCase()}.pdf`,
    content,
    hash: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
    status,
    verificationStatus: 'INTEGRITY_VERIFIED',
    verifiedAt: status === 'VERIFIED' ? new Date() : null
  };
}

async function main() {
  console.log('Seeding NGO Impact Data Commons…');

  // Order matters: children before parents.
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.communityVerification.deleteMany();
  await prisma.projectEvidence.deleteMany();
  await prisma.whistleblowerReport.deleteMany();
  await prisma.transparencyScore.deleteMany();
  await prisma.fraudAlert.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.blockchainBlock.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.project.deleteMany();
  await prisma.govVerification.deleteMany();
  await prisma.nGODocument.deleteMany();
  await prisma.nGO.deleteMany();
  await prisma.user.deleteMany();

  const pw = async (plain: string) => bcrypt.hash(plain, 10);

  /* -- Accounts ---------------------------------------------------------- */
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ngocommons.demo',
      password: await pw('Admin@123'),
      name: 'Platform Auditor',
      role: 'ADMIN',
      phone: '+91 98765 43210'
    }
  });

  const ngoUser1 = await prisma.user.create({
    data: { email: 'ngo@ngocommons.demo', password: await pw('NGO@1234'), name: 'Hope Foundation Team', role: 'NGO', phone: '+91 98111 22233' }
  });
  const ngoUser2 = await prisma.user.create({
    data: { email: 'ruraledu@ngocommons.demo', password: await pw('NGO@1234'), name: 'Rural Education Trust', role: 'NGO' }
  });
  const ngoUser3 = await prisma.user.create({
    data: { email: 'greenearth@ngocommons.demo', password: await pw('NGO@1234'), name: 'Green Earth Network', role: 'NGO' }
  });
  const ngoUser4 = await prisma.user.create({
    data: { email: 'newngo@ngocommons.demo', password: await pw('NGO@1234'), name: 'Sunrise Welfare Society', role: 'NGO' }
  });

  const donor = await prisma.user.create({
    data: { email: 'donor@ngocommons.demo', password: await pw('Donor@123'), name: 'Meera Iyer', role: 'DONOR', phone: '+91 99887 76655' }
  });
  await prisma.user.create({
    data: { email: 'public@ngocommons.demo', password: await pw('Public@123'), name: 'Citizen Observer', role: 'PUBLIC' }
  });

  /* -- Organisations ----------------------------------------------------- */
  const ngo1 = await prisma.nGO.create({
    data: {
      userId: ngoUser1.id,
      name: 'Hope Foundation India',
      regNum: 'DEL/2018/0019482',
      pan: 'AAATH1234F',
      certificate12A: '12A-DEL-8921-2019',
      certificate80G: '80G-DEL-4412-2020',
      csrReg: 'CSR00012948',
      address: '14 Institutional Area, Lodhi Road',
      state: 'Delhi', district: 'New Delhi',
      phone: '+91 11 2468 9900', email: 'contact@hopefoundation.demo',
      website: 'https://hopefoundation.demo',
      mission: 'Bringing quality education and healthcare to children in underserved communities across northern India.',
      areaOfWork: 'Education, Healthcare, Skill Development',
      establishedYear: 2015, employees: 28, volunteers: 120,
      status: 'VERIFIED', verifiedAt: new Date()
    }
  });

  const ngo2 = await prisma.nGO.create({
    data: {
      userId: ngoUser2.id,
      name: 'Rural Education & Health Trust',
      regNum: 'KAR/2019/008271',
      pan: 'BBBRE5678G',
      certificate12A: '12A-KAR-3321-2019',
      certificate80G: '80G-KAR-1192-2020',
      address: '42 MG Road, Indiranagar',
      state: 'Karnataka', district: 'Bengaluru',
      phone: '+91 80 4123 7788', email: 'info@ruraledu.demo',
      mission: 'Solar-powered classrooms and mobile healthcare vans for remote villages across Karnataka.',
      areaOfWork: 'Rural Education, Healthcare, Clean Energy',
      establishedYear: 2017, employees: 19, volunteers: 85,
      status: 'VERIFIED', verifiedAt: new Date()
    }
  });

  const ngo3 = await prisma.nGO.create({
    data: {
      userId: ngoUser3.id,
      name: 'Green Earth Future Network',
      regNum: 'MAH/2020/004921',
      pan: 'CCCGG9012H',
      certificate12A: '12A-MAH-9941-2021',
      certificate80G: '80G-MAH-5510-2021',
      address: '99 Marine Drive, Nariman Point',
      state: 'Maharashtra', district: 'Mumbai',
      phone: '+91 22 6789 1234', email: 'help@greenearth.demo',
      mission: 'Reforestation and river restoration across Maharashtra and the Western Ghats.',
      areaOfWork: 'Environment, Climate Action, Reforestation',
      establishedYear: 2019, employees: 14, volunteers: 310,
      status: 'VERIFIED', verifiedAt: new Date()
    }
  });

  // Left pending on purpose so the auditor queue is not empty on first run.
  const ngo4 = await prisma.nGO.create({
    data: {
      userId: ngoUser4.id,
      name: 'Sunrise Welfare Society',
      regNum: 'TN/2023/001177',
      pan: 'DDDSW3456J',
      certificate12A: '12A-TN-2210-2023',
      certificate80G: '80G-TN-7781-2023',
      address: '7 Anna Salai, Teynampet',
      state: 'Tamil Nadu', district: 'Chennai',
      phone: '+91 44 2345 6677', email: 'contact@sunrise.demo',
      mission: 'Nutrition support and after-school learning for children of daily-wage workers.',
      areaOfWork: 'Nutrition, Education',
      establishedYear: 2023, employees: 6, volunteers: 24,
      status: 'PENDING'
    }
  });

  /* -- Documents --------------------------------------------------------- */
  await prisma.nGODocument.createMany({
    data: [
      document(ngo1.id, 'REGISTRATION', 'Registration_Certificate_2018.pdf', 'Society registration, Delhi, 2018.', 'VERIFIED'),
      document(ngo1.id, 'AUDIT_REPORT', 'Audited_Statement_FY2025.pdf', 'Independent audit, FY 2024-25.', 'VERIFIED'),
      document(ngo1.id, '80G', '80G_Certificate.pdf', '80G tax deduction certificate.', 'VERIFIED'),
      document(ngo2.id, 'REGISTRATION', 'Trust_Deed_2017.pdf', 'Trust deed, Karnataka, 2017.', 'VERIFIED'),
      document(ngo2.id, 'AUDIT_REPORT', 'Audit_FY2025.pdf', 'Independent audit, FY 2024-25.', 'VERIFIED'),
      document(ngo3.id, 'REGISTRATION', 'Registration_2020.pdf', 'Society registration, Maharashtra, 2020.', 'VERIFIED'),
      document(ngo3.id, 'ANNUAL_REPORT', 'Annual_Report_2025.pdf', 'Annual activity report 2025.', 'PENDING'),
      document(ngo4.id, 'REGISTRATION', 'Registration_2023.pdf', 'Society registration, Tamil Nadu, 2023.', 'PENDING'),
      document(ngo4.id, 'PAN', 'PAN_Card.pdf', 'Organisation PAN card copy.', 'PENDING')
    ]
  });

  await prisma.govVerification.createMany({
    data: [ngo1, ngo2, ngo3].map(n => ({
      ngoId: n.id,
      regNumStatus: 'VERIFIED', panStatus: 'VERIFIED',
      cert12AStatus: 'VERIFIED', cert80GStatus: 'VERIFIED',
      overallStatus: 'VERIFIED',
      notes: 'Checked against NGO Darpan and the Income Tax exemption registry.'
    }))
  });

  /* -- Projects ---------------------------------------------------------- */
  const project1 = await prisma.project.create({
    data: {
      ngoId: ngo1.id,
      title: 'Digital Literacy for Rural Primary Schools',
      description: 'Solar-powered smart classrooms, tablets and STEM learning kits for 500 students across 10 rural schools.',
      category: 'Education',
      sdgGoals: JSON.stringify(['SDG 4 — Quality Education', 'SDG 10 — Reduced Inequalities']),
      location: 'Chharba Village, Dehradun', state: 'Uttarakhand', district: 'Dehradun',
      startDate: '2026-01-15', endDate: '2026-12-31',
      budget: 1500000, expectedBeneficiaries: 500, actualBeneficiaries: 0,
      status: 'ACTIVE', lat: 30.3411, lng: 77.7812,
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800'
    }
  });

  const project2 = await prisma.project.create({
    data: {
      ngoId: ngo2.id,
      title: 'Mobile Healthcare Vans for Tribal Hamlets',
      description: 'Equipped vans providing maternal care, diagnostics and free medicine to remote tribal villages.',
      category: 'Healthcare',
      sdgGoals: JSON.stringify(['SDG 3 — Good Health and Well-being', 'SDG 5 — Gender Equality']),
      location: 'BR Hills Tribal Settlement', state: 'Karnataka', district: 'Chamarajanagar',
      startDate: '2026-02-01', endDate: '2026-11-30',
      budget: 2200000, expectedBeneficiaries: 1200, actualBeneficiaries: 0,
      status: 'ACTIVE', lat: 11.9904, lng: 77.1350,
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800'
    }
  });

  const project3 = await prisma.project.create({
    data: {
      ngoId: ngo3.id,
      title: 'Western Ghats Afforestation Drive',
      description: 'Planting 50,000 indigenous trees and distributing seedballs to restore degraded forest patches.',
      category: 'Environment',
      sdgGoals: JSON.stringify(['SDG 13 — Climate Action', 'SDG 15 — Life on Land']),
      location: 'Mahabaleshwar Buffer Zone', state: 'Maharashtra', district: 'Satara',
      startDate: '2026-03-01', endDate: '2027-02-28',
      budget: 1800000, expectedBeneficiaries: 3000, actualBeneficiaries: 0,
      status: 'ACTIVE', lat: 17.9237, lng: 73.6586,
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800'
    }
  });

  /* -- Geo-tagged field evidence ----------------------------------------- */
  const evidence = [
    { project: project1, phase: 'BEFORE', caption: 'Classroom before renovation', lat: 30.3415, lng: 77.7820, url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800' },
    { project: project1, phase: 'AFTER', caption: 'Solar-powered smart classroom in use', lat: 30.3409, lng: 77.7808, url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800' },
    { project: project2, phase: 'PROGRESS', caption: 'Health van at the settlement', lat: 11.9910, lng: 77.1361, url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800' },
    { project: project3, phase: 'PROGRESS', caption: 'Volunteers planting saplings', lat: 17.9240, lng: 73.6590, url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800' }
  ];

  for (const e of evidence) {
    const km = distanceKm(e.project.lat!, e.project.lng!, e.lat, e.lng);
    await prisma.projectEvidence.create({
      data: {
        projectId: e.project.id,
        phase: e.phase,
        caption: e.caption,
        imageUrl: e.url,
        lat: e.lat, lng: e.lng,
        distanceKm: km,
        geoStatus: classifyDistance(km)
      }
    });
  }

  /* -- Beneficiaries (one deliberate duplicate for the demo) -------------- */
  const people = [
    { name: 'Aarav Kumar', age: 11, gender: 'Male', support: 'Solar tablet & book kit', risk: 'LOW' },
    { name: 'Ananya Sharma', age: 10, gender: 'Female', support: 'Solar tablet & book kit', risk: 'LOW' },
    { name: 'Rohan Singh', age: 12, gender: 'Male', support: 'STEM kit', risk: 'LOW' },
    { name: 'Priya Verma', age: 9, gender: 'Female', support: 'Solar tablet', risk: 'LOW' },
    { name: 'Aarav Kumar', age: 11, gender: 'Male', support: 'Second tablet request', risk: 'HIGH' }
  ];

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    await prisma.beneficiary.create({
      data: {
        projectId: project1.id,
        ngoId: ngo1.id,
        beneficiaryCode: `BEN-2026-${String(i + 1).padStart(6, '0')}`,
        name: p.name, age: p.age, gender: p.gender,
        location: 'Chharba Village', program: 'Digital Literacy',
        supportType: p.support,
        duplicateRisk: p.risk,
        duplicateDetails: p.risk === 'HIGH'
          ? 'Looks like the same person as BEN-2026-000001 (same name, same age and gender, same village).'
          : null
      }
    });
  }

  await prisma.project.update({
    where: { id: project1.id },
    data: { actualBeneficiaries: people.length }
  });

  /* -- Donations, chained ------------------------------------------------ */
  const donations = [
    { amount: 100000, purpose: 'Solar tablet distribution', ngo: ngo1, project: project1 },
    { amount: 250000, purpose: 'Diagnostic equipment for health vans', ngo: ngo2, project: project2 },
    { amount: 150000, purpose: 'Seedball preparation drive', ngo: ngo3, project: project3 },
    { amount: 50000, purpose: 'Teacher digital training', ngo: ngo1, project: project1 }
  ];

  let prevHash = GENESIS_HASH;
  for (let i = 0; i < donations.length; i++) {
    const d = donations[i];
    const blockNumber = i + 1;
    const txnId = `TXN-20260814-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const timestamp = new Date(Date.now() - (donations.length - i) * 86400000);

    const currentHash = BlockchainService.calculateHash({
      blockNumber, prevHash, txnId, amount: d.amount,
      donorId: donor.id, ngoId: d.ngo.id, projectId: d.project.id, timestamp
    });

    const block = await prisma.blockchainBlock.create({
      data: {
        blockNumber, prevHash, currentHash, txnId, amount: d.amount,
        donorId: donor.id, ngoId: d.ngo.id, projectId: d.project.id, timestamp
      }
    });

    await prisma.donation.create({
      data: {
        donorId: donor.id, ngoId: d.ngo.id, projectId: d.project.id,
        amount: d.amount, purpose: d.purpose, txnId, blockId: block.id, date: timestamp
      }
    });

    prevHash = currentHash;
  }

  /* -- Expenses ---------------------------------------------------------- */
  await prisma.expense.createMany({
    data: [
      { ngoId: ngo1.id, projectId: project1.id, category: 'Equipment', amount: 65000, description: '15 solar tablets for Class 5 students', receiptUrl: '/uploads/receipt_tablets.pdf', approvedBy: 'Hope Foundation Team' },
      { ngoId: ngo1.id, projectId: project1.id, category: 'Training', amount: 25000, description: 'Monthly stipend for the digital literacy trainer', approvedBy: 'Hope Foundation Team' },
      { ngoId: ngo2.id, projectId: project2.id, category: 'Medical supplies', amount: 140000, description: 'Diagnostic kits and medicines for two vans', approvedBy: 'Rural Education Trust' },
      { ngoId: ngo3.id, projectId: project3.id, category: 'Field operations', amount: 78000, description: 'Saplings, seedballs and volunteer transport', approvedBy: 'Green Earth Network' }
    ]
  });

  /* -- Community verification -------------------------------------------- */
  await prisma.communityVerification.createMany({
    data: [
      { projectId: project1.id, observerName: 'Sunita Devi', location: 'Chharba Village', observation: 'Visited the school. The tablets are there and children are using them daily.', verdict: 'CONFIRMED', status: 'VERIFIED' },
      { projectId: project2.id, observerName: 'Local volunteer', location: 'BR Hills', observation: 'The van comes twice a week as described. Medicines were being handed out.', verdict: 'CONFIRMED', status: 'VERIFIED' }
    ]
  });

  await prisma.whistleblowerReport.create({
    data: {
      trackingCode: `WB-2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      category: 'Fake Beneficiaries',
      description: 'The same child appears twice on the beneficiary list for the digital literacy programme in Chharba village.',
      status: 'SUBMITTED'
    }
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, userRole: 'ADMIN', action: 'NGO_DECISION', module: 'Verification', recordId: ngo1.id, details: 'Hope Foundation India marked VERIFIED' },
      { userId: ngoUser1.id, userRole: 'NGO', action: 'CREATE_PROJECT', module: 'Projects', recordId: project1.id, details: 'Project created: Digital Literacy for Rural Primary Schools' }
    ]
  });

  await prisma.notification.create({
    data: {
      userId: ngoUser4.id,
      title: 'Your organisation is being reviewed',
      message: 'We have received your registration. An auditor will review your documents shortly.',
      type: 'INFO',
      link: '/ngo'
    }
  });

  // Scores are computed from the data above, never hand-written.
  for (const n of [ngo1, ngo2, ngo3, ngo4]) {
    await recomputeScores(n.id);
  }

  console.log(`
  Seeding complete.

  Sign in with:
    Auditor   admin@ngocommons.demo     Admin@123
    NGO       ngo@ngocommons.demo       NGO@1234
    Donor     donor@ngocommons.demo     Donor@123
    Public    public@ngocommons.demo    Public@123
`);
}

main()
  .catch(e => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

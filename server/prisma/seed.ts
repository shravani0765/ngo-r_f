import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { BlockchainService } from '../src/services/blockchain.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for NGO Impact Data Commons...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.communityVerification.deleteMany();
  await prisma.whistleblowerReport.deleteMany();
  await prisma.transparencyScore.deleteMany();
  await prisma.fraudAlert.deleteMany();
  await prisma.blockchainBlock.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.project.deleteMany();
  await prisma.govVerification.deleteMany();
  await prisma.nGODocument.deleteMany();
  await prisma.nGO.deleteMany();
  await prisma.user.deleteMany();

  // Create Hashed Passwords
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const ngoPassword = await bcrypt.hash('NGO@123', 10);
  const donorPassword = await bcrypt.hash('Donor@123', 10);
  const publicPassword = await bcrypt.hash('Public@123', 10);

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ngocommons.demo',
      password: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
      phone: '+91 9876543210'
    }
  });

  const ngoUser1 = await prisma.user.create({
    data: {
      email: 'ngo@ngocommons.demo',
      password: ngoPassword,
      name: 'Hope Foundation Admin',
      role: 'NGO',
      phone: '+91 9811122233'
    }
  });

  const donorUser = await prisma.user.create({
    data: {
      email: 'donor@ngocommons.demo',
      password: donorPassword,
      name: 'Global Impact Donor',
      role: 'DONOR',
      phone: '+91 9988776655'
    }
  });

  const publicUser = await prisma.user.create({
    data: {
      email: 'public@ngocommons.demo',
      password: publicPassword,
      name: 'Citizen Observer',
      role: 'PUBLIC',
      phone: '+91 9123456789'
    }
  });

  // Additional NGO Users
  const ngoUser2 = await prisma.user.create({
    data: {
      email: 'ruraledu@ngocommons.demo',
      password: ngoPassword,
      name: 'Rural Education Trust Rep',
      role: 'NGO'
    }
  });

  const ngoUser3 = await prisma.user.create({
    data: {
      email: 'greenearth@ngocommons.demo',
      password: ngoPassword,
      name: 'Green Earth Representative',
      role: 'NGO'
    }
  });

  console.log('✓ Users created');

  // 2. Create NGOs
  const ngo1 = await prisma.nGO.create({
    data: {
      userId: ngoUser1.id,
      name: 'Hope Foundation India',
      regNum: 'DEL/2018/0019482',
      pan: 'AAATH1234F',
      certificate12A: '12A-DEL-8921-2019',
      certificate80G: '80G-DEL-4412-2020',
      csrReg: 'CSR00012948',
      address: '14, Institutional Area, Lodhi Road',
      state: 'Delhi',
      district: 'New Delhi',
      phone: '+91 11 2468 9900',
      email: 'contact@hopefoundation.demo',
      website: 'https://hopefoundation.demo',
      mission: 'Empowering underprivileged children and women through quality education, healthcare, and digital literacy skills.',
      areaOfWork: 'Education, Healthcare, Skill Development',
      establishedYear: 2015,
      employees: 28,
      volunteers: 120,
      status: 'VERIFIED',
      transparencyScore: 92,
      fraudRiskScore: 12,
      verifiedAt: new Date()
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
      address: '42, Mg Road, Indiranagar',
      state: 'Karnataka',
      district: 'Bengaluru',
      phone: '+91 80 4123 7788',
      email: 'info@ruraledu.demo',
      website: 'https://ruraledu.demo',
      mission: 'Providing solar-powered classrooms, digital tabs, and mobile healthcare vans across rural Karnataka villages.',
      areaOfWork: 'Rural Education, Healthcare, Clean Energy',
      establishedYear: 2017,
      employees: 19,
      volunteers: 85,
      status: 'VERIFIED',
      transparencyScore: 88,
      fraudRiskScore: 18,
      verifiedAt: new Date()
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
      address: '99, Marine Drive, Nariman Point',
      state: 'Maharashtra',
      district: 'Mumbai',
      phone: '+91 22 6789 1234',
      email: 'help@greenearth.demo',
      mission: 'Reforestation, urban rooftop farming, and river basin restoration across Maharashtra and Western Ghats.',
      areaOfWork: 'Environment, Climate Action, Reforestation',
      establishedYear: 2019,
      employees: 14,
      volunteers: 310,
      status: 'VERIFIED',
      transparencyScore: 85,
      fraudRiskScore: 15,
      verifiedAt: new Date()
    }
  });

  console.log('✓ NGOs created');

  // 3. Create NGO Documents & Gov Verification
  const sampleHash1 = crypto.createHash('sha256').update('HopeFoundation_RegCert_2018').digest('hex');
  const sampleHash2 = crypto.createHash('sha256').update('HopeFoundation_AuditReport_2025').digest('hex');

  await prisma.nGODocument.createMany({
    data: [
      {
        ngoId: ngo1.id,
        docType: 'REGISTRATION',
        fileName: 'Registration_Certificate_2018.pdf',
        filePath: '/uploads/hope_reg.pdf',
        hash: sampleHash1,
        status: 'VERIFIED',
        verificationStatus: 'INTEGRITY_VERIFIED',
        verifiedAt: new Date()
      },
      {
        ngoId: ngo1.id,
        docType: 'AUDIT_REPORT',
        fileName: 'Audited_Financial_Statement_2025.pdf',
        filePath: '/uploads/hope_audit_2025.pdf',
        hash: sampleHash2,
        status: 'VERIFIED',
        verificationStatus: 'INTEGRITY_VERIFIED',
        verifiedAt: new Date()
      }
    ]
  });

  await prisma.govVerification.createMany({
    data: [
      {
        ngoId: ngo1.id,
        regNumStatus: 'VERIFIED',
        panStatus: 'VERIFIED',
        cert12AStatus: 'VERIFIED',
        cert80GStatus: 'VERIFIED',
        overallStatus: 'VERIFIED',
        notes: '✓ Verified against Income Tax Dept portal & NGO Darpan database.'
      },
      {
        ngoId: ngo2.id,
        regNumStatus: 'VERIFIED',
        panStatus: 'VERIFIED',
        cert12AStatus: 'VERIFIED',
        cert80GStatus: 'VERIFIED',
        overallStatus: 'VERIFIED',
        notes: '✓ Verified against Karnataka Societies Registration API.'
      },
      {
        ngoId: ngo3.id,
        regNumStatus: 'VERIFIED',
        panStatus: 'VERIFIED',
        cert12AStatus: 'VERIFIED',
        cert80GStatus: 'VERIFIED',
        overallStatus: 'VERIFIED',
        notes: '✓ Verified against MCA CSR portal.'
      }
    ]
  });

  // 4. Create Projects
  const project1 = await prisma.project.create({
    data: {
      ngoId: ngo1.id,
      title: 'Digital Literacy for Rural Primary Schools',
      description: 'Deploying solar smart classrooms, tablets, and interactive STEM learning kits for 500 students across 10 rural schools.',
      category: 'Education',
      sdgGoals: JSON.stringify(['SDG 4 — Quality Education', 'SDG 10 — Reduced Inequalities']),
      location: 'Chharba Village, Dehradun',
      state: 'Uttarakhand',
      district: 'Dehradun',
      startDate: '2026-01-15',
      endDate: '2026-12-31',
      budget: 1500000,
      expectedBeneficiaries: 500,
      actualBeneficiaries: 340,
      status: 'ACTIVE',
      lat: 30.3411,
      lng: 77.7812,
      image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800'
    }
  });

  const project2 = await prisma.project.create({
    data: {
      ngoId: ngo2.id,
      title: 'Mobile Healthcare Vans for Tribal Hamlets',
      description: 'Operating equipped healthcare vans providing maternal care, diagnostics, and free medicine to remote tribal villages.',
      category: 'Healthcare',
      sdgGoals: JSON.stringify(['SDG 3 — Good Health and Well-being', 'SDG 5 — Gender Equality']),
      location: 'BR Hills Tribal Settlement',
      state: 'Karnataka',
      district: 'Chamarajanagar',
      startDate: '2026-02-01',
      endDate: '2026-11-30',
      budget: 2200000,
      expectedBeneficiaries: 1200,
      actualBeneficiaries: 890,
      status: 'ACTIVE',
      lat: 11.9904,
      lng: 77.1350,
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800'
    }
  });

  const project3 = await prisma.project.create({
    data: {
      ngoId: ngo3.id,
      title: 'Western Ghats Afforestation & Seedball Drive',
      description: 'Planting 50,000 indigenous trees and distributing seedballs to restore degraded forest patches in Western Ghats.',
      category: 'Environment',
      sdgGoals: JSON.stringify(['SDG 13 — Climate Action', 'SDG 15 — Life on Land']),
      location: 'Mahabaleshwar Buffer Zone',
      state: 'Maharashtra',
      district: 'Satara',
      startDate: '2026-03-01',
      endDate: '2027-02-28',
      budget: 1800000,
      expectedBeneficiaries: 3000,
      actualBeneficiaries: 2100,
      status: 'ACTIVE',
      lat: 17.9237,
      lng: 73.6586,
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800'
    }
  });

  console.log('✓ Projects created');

  // 5. Create Beneficiaries
  const sampleBeneficiaries = [
    { code: 'BEN-2026-001', name: 'Aarav Kumar', age: 11, gender: 'Male', location: 'Chharba Village', program: 'Digital Literacy', supportType: 'Solar Tablet & Book Kit', risk: 'LOW' },
    { code: 'BEN-2026-002', name: 'Ananya Sharma', age: 10, gender: 'Female', location: 'Chharba Village', program: 'Digital Literacy', supportType: 'Solar Tablet & Book Kit', risk: 'LOW' },
    { code: 'BEN-2026-003', name: 'Rohan Singh', age: 12, gender: 'Male', location: 'Chharba Village', program: 'Digital Literacy', supportType: 'STEM Kit', risk: 'LOW' },
    { code: 'BEN-2026-004', name: 'Priya Verma', age: 9, gender: 'Female', location: 'Chharba Village', program: 'Digital Literacy', supportType: 'Solar Tablet', risk: 'LOW' },
    { code: 'BEN-2026-005', name: 'Aarav Kumar', age: 11, gender: 'Male', location: 'Chharba Village', program: 'Digital Literacy', supportType: 'Duplicate Tablet Request', risk: 'HIGH', details: '⚠ Potential duplicate entry matched against BEN-2026-001' }
  ];

  for (const b of sampleBeneficiaries) {
    await prisma.beneficiary.create({
      data: {
        projectId: project1.id,
        ngoId: ngo1.id,
        beneficiaryCode: b.code,
        name: b.name,
        age: b.age,
        gender: b.gender,
        location: b.location,
        program: b.program,
        supportType: b.supportType,
        duplicateRisk: b.risk,
        duplicateDetails: b.details || null
      }
    });
  }

  console.log('✓ Beneficiaries created');

  // 6. Create Blockchain Ledger & Donations
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const donationsData = [
    { amount: 100000, purpose: 'Solar tablet distribution drive', txnId: 'TXN-20260814-88A1' },
    { amount: 250000, purpose: 'Mobile health van medical diagnostic equipment', txnId: 'TXN-20260814-99B2' },
    { amount: 150000, purpose: 'Western Ghats seedball preparation drive', txnId: 'TXN-20260814-77C3' },
    { amount: 50000, purpose: 'Teacher digital training honorarium', txnId: 'TXN-20260814-66D4' }
  ];

  for (let i = 0; i < donationsData.length; i++) {
    const d = donationsData[i];
    const blockNum = i + 1;
    const timestamp = new Date(Date.now() - (donationsData.length - i) * 86400000);

    const blockData = {
      blockNumber: blockNum,
      prevHash,
      txnId: d.txnId,
      amount: d.amount,
      donorId: donorUser.id,
      ngoId: ngo1.id,
      projectId: project1.id,
      timestamp
    };

    const currentHash = BlockchainService.calculateHash(blockData);

    const block = await prisma.blockchainBlock.create({
      data: {
        blockNumber: blockNum,
        prevHash,
        currentHash,
        txnId: d.txnId,
        amount: d.amount,
        donorId: donorUser.id,
        ngoId: ngo1.id,
        projectId: project1.id,
        timestamp
      }
    });

    await prisma.donation.create({
      data: {
        donorId: donorUser.id,
        ngoId: ngo1.id,
        projectId: project1.id,
        amount: d.amount,
        purpose: d.purpose,
        txnId: d.txnId,
        blockId: block.id,
        date: timestamp
      }
    });

    prevHash = currentHash;
  }

  console.log('✓ Cryptographic Blockchain Ledger initialized');

  // 7. Create Expenses
  await prisma.expense.createMany({
    data: [
      {
        ngoId: ngo1.id,
        projectId: project1.id,
        category: 'Equipment Purchase',
        amount: 65000,
        description: 'Procured 15 Android Solar Tablets for Class 5 students',
        receiptUrl: '/uploads/receipt_tablets.pdf',
        approvedBy: 'Hope Admin'
      },
      {
        ngoId: ngo1.id,
        projectId: project1.id,
        category: 'Instructor Stipend',
        amount: 25000,
        description: 'Monthly compensation for digital literacy field trainer',
        approvedBy: 'Hope Admin'
      }
    ]
  });

  // 8. Create Fraud Alert & Audit Logs
  await prisma.fraudAlert.create({
    data: {
      ngoId: ngo1.id,
      riskScore: 12,
      riskLevel: 'LOW',
      reason: 'Standard quarterly anomaly scan completed with zero critical flags',
      affectedRecord: 'NGO Registration & Financial Ledger',
      status: 'RESOLVED'
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        userRole: 'ADMIN',
        action: 'APPROVED_NGO_VERIFICATION',
        module: 'Government Verification',
        recordId: ngo1.id,
        details: 'System Admin verified Hope Foundation India registration & 12A/80G tax exemptions.'
      },
      {
        userId: ngoUser1.id,
        userRole: 'NGO',
        action: 'CREATED_PROJECT',
        module: 'Project Management',
        recordId: project1.id,
        details: 'Hope Foundation created new project: Digital Literacy for Rural Primary Schools'
      }
    ]
  });

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

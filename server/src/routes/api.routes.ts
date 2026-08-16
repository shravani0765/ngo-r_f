import { Router } from 'express';
import { authenticateToken, optionalAuth, requireRole } from '../middleware/auth.middleware';
import {
  AuthController,
  NGOController,
  DocumentController,
  GovController,
  ProjectController,
  BeneficiaryController,
  DonationController,
  ExpenseController,
  LedgerController,
  AIController,
  AdminController,
  AnalyticsController,
  WhistleblowerController
} from '../controllers/appController';

const router = Router();

// Auth Routes
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.me);

// NGO Routes
router.get('/ngos', NGOController.getAll);
router.get('/ngos/:id', NGOController.getById);
router.post('/ngos', authenticateToken, NGOController.create);
router.put('/ngos/:id', authenticateToken, NGOController.update);

// Documents
router.post('/documents', authenticateToken, DocumentController.upload);
router.post('/documents/:id/verify-integrity', DocumentController.verifyIntegrity);

// Government Mock API
router.post('/government/verify', GovController.verify);

// Projects
router.get('/projects', ProjectController.getAll);
router.get('/projects/:id', ProjectController.getById);
router.post('/projects', authenticateToken, ProjectController.create);

// Beneficiaries
router.get('/beneficiaries', BeneficiaryController.getAll);
router.post('/beneficiaries', authenticateToken, BeneficiaryController.create);
router.post('/beneficiaries/check-duplicate', BeneficiaryController.checkDuplicate);

// Financial & Ledger
router.post('/donations', optionalAuth, DonationController.create);
router.get('/donations', DonationController.getAll);

router.post('/expenses', authenticateToken, ExpenseController.create);
router.get('/expenses', ExpenseController.getAll);

router.get('/ledger', LedgerController.getChain);
router.post('/ledger/verify', LedgerController.verifyChain);

// AI Engines
router.post('/ai/fraud-score', AIController.fraudScore);
router.post('/ai/transparency-score', AIController.transparencyScore);
router.post('/ai/sdg-classify', AIController.sdgClassify);
router.post('/ai/chat', AIController.chat);

// Admin Routes
router.get('/admin/statistics', AdminController.getStatistics);
router.post('/admin/approve-ngo/:id', authenticateToken, requireRole(['ADMIN']), AdminController.approveNGO);
router.patch('/admin/ngos/:id/status', optionalAuth, AdminController.updateStatus);
router.patch('/ngos/:id/status', optionalAuth, AdminController.updateStatus);
router.get('/admin/audit-logs', authenticateToken, requireRole(['ADMIN']), AdminController.getAuditLogs);

// Whistleblower
router.post('/whistleblower', WhistleblowerController.submit);
router.get('/whistleblower', authenticateToken, requireRole(['ADMIN']), WhistleblowerController.getAll);

// Analytics & Overview
router.get('/analytics/overview', AnalyticsController.getOverview);

// Public Directory & API stats
router.get('/public/statistics', AdminController.getStatistics);
router.get('/public/ngos', NGOController.getAll);
router.get('/public/projects', ProjectController.getAll);

export default router;

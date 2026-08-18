import { Router } from 'express';
import { authenticateToken, optionalAuth, requireRole } from '../middleware/auth.middleware';
import { upload } from '../services/upload.service';
import { AuthController } from '../controllers/auth.controller';
import { NGOController } from '../controllers/ngo.controller';
import { DocumentController, resolveUploadTarget } from '../controllers/document.controller';
import {
  PaymentController, CauseController, ActivityController
} from '../controllers/ngoAssets.controller';
import { ProjectController, EvidenceController, BeneficiaryController } from '../controllers/project.controller';
import { DonationController, ExpenseController, LedgerController } from '../controllers/finance.controller';
import { AdminController } from '../controllers/admin.controller';
import { AnalyticsController, AIController } from '../controllers/public.controller';
import {
  WhistleblowerController, CommunityController, NotificationController
} from '../controllers/engagement.controller';

const router = Router();

const requireAdmin = [authenticateToken, requireRole(['ADMIN'])];
const requireNgo = [authenticateToken, requireRole(['NGO', 'ADMIN'])];
const requireDonor = [authenticateToken, requireRole(['DONOR', 'ADMIN'])];

/** Upload chain: authenticate, resolve the owning organisation, then stream. */
const ngoUpload = [...requireNgo, resolveUploadTarget, upload.single('file')];

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateToken, AuthController.me);
router.post('/auth/change-password', authenticateToken, AuthController.changePassword);
router.post('/auth/forgot-password', AuthController.forgotPassword);
router.post('/auth/reset-password', AuthController.resetPassword);

/* -------------------------------------------------------------------------- */
/* Organisations                                                               */
/* -------------------------------------------------------------------------- */
router.get('/ngos', optionalAuth, NGOController.list);
router.get('/ngos/mine', ...requireNgo, NGOController.myOrganisation);
router.get('/ngos/:id', optionalAuth, NGOController.getById);
router.post('/ngos', ...requireNgo, NGOController.create);
router.patch('/ngos/:id', authenticateToken, NGOController.update);

/* -------------------------------------------------------------------------- */
/* Identity documents — private, owner or admin only                           */
/* -------------------------------------------------------------------------- */
router.get('/documents/mine', ...requireNgo, DocumentController.mine);
router.post('/documents', ...ngoUpload, DocumentController.create);
router.get('/documents/:id/file', authenticateToken, DocumentController.download);
router.post('/documents/:id/verify-integrity', authenticateToken, DocumentController.verifyIntegrity);
router.patch('/documents/:id/review', ...requireAdmin, DocumentController.review);

/* -------------------------------------------------------------------------- */
/* Payment details and causes                                                  */
/* -------------------------------------------------------------------------- */
router.get('/payments/mine', ...requireNgo, PaymentController.mine);
router.put('/payments/mine', ...requireNgo, PaymentController.save);
router.post('/payments/mine/qr', ...ngoUpload, PaymentController.uploadQr);
router.get('/ngos/:id/qr', optionalAuth, PaymentController.qrImage);

router.get('/causes', CauseController.options);
router.put('/causes/mine', ...requireNgo, CauseController.save);

/* -------------------------------------------------------------------------- */
/* Activity photos and the public gallery                                      */
/* -------------------------------------------------------------------------- */
router.get('/gallery', ActivityController.publicGallery);
router.get('/activities/mine', ...requireNgo, ActivityController.mine);
router.post('/activities', ...ngoUpload, ActivityController.create);
router.get('/activities/:id/image', optionalAuth, ActivityController.image);
router.delete('/activities/:id', ...requireNgo, ActivityController.remove);
router.patch('/activities/:id/review', ...requireAdmin, ActivityController.review);

/* -------------------------------------------------------------------------- */
/* Projects, evidence and beneficiaries                                        */
/* -------------------------------------------------------------------------- */
router.get('/projects', optionalAuth, ProjectController.list);
router.get('/projects/:id', optionalAuth, ProjectController.getById);
router.post('/projects', ...requireNgo, ProjectController.create);
router.patch('/projects/:id', ...requireNgo, ProjectController.update);

router.post('/projects/:id/evidence', ...requireNgo, EvidenceController.create);
router.delete('/projects/:id/evidence/:evidenceId', ...requireNgo, EvidenceController.remove);

router.get('/projects/:id/verifications', CommunityController.listForProject);
router.post('/projects/:id/verifications', optionalAuth, CommunityController.submit);

router.get('/beneficiaries', ...requireNgo, BeneficiaryController.list);
router.post('/beneficiaries', ...requireNgo, BeneficiaryController.create);
router.post('/beneficiaries/check-duplicate', ...requireNgo, BeneficiaryController.checkDuplicate);

/* -------------------------------------------------------------------------- */
/* Donations and the record chain                                              */
/* -------------------------------------------------------------------------- */
router.post('/donations', ...requireDonor, DonationController.create);
router.post('/donations/:id/confirm', ...requireDonor, DonationController.confirm);
router.get('/donations', authenticateToken, DonationController.list);

router.post('/expenses', ...requireNgo, ExpenseController.create);
router.get('/expenses', optionalAuth, ExpenseController.list);

router.get('/ledger', LedgerController.getChain);
router.post('/ledger/verify', optionalAuth, LedgerController.verifyChain);

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */
router.get('/admin/statistics', ...requireAdmin, AdminController.statistics);
router.get('/admin/queue', ...requireAdmin, AdminController.reviewQueue);
router.get('/admin/ngos', ...requireAdmin, AdminController.listNgos);
router.get('/admin/ngos/:id', ...requireAdmin, AdminController.ngoDetail);
router.post('/admin/ngos/:id/decision', ...requireAdmin, AdminController.decideNgo);
router.delete('/admin/ngos/:id', ...requireAdmin, AdminController.removeNgo);
router.get('/admin/transactions', ...requireAdmin, AdminController.transactions);
router.get('/admin/audit-logs', ...requireAdmin, AdminController.auditLogs);
router.patch('/admin/alerts/:id', ...requireAdmin, AdminController.resolveAlert);
router.patch('/admin/reports/:id', ...requireAdmin, AdminController.updateReport);
router.get('/admin/reports', ...requireAdmin, WhistleblowerController.list);

/* -------------------------------------------------------------------------- */
/* Anonymous reporting                                                         */
/* -------------------------------------------------------------------------- */
router.post('/reports', WhistleblowerController.submit);
router.get('/reports/track/:code', WhistleblowerController.track);

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */
router.get('/notifications', authenticateToken, NotificationController.list);
router.patch('/notifications/:id/read', authenticateToken, NotificationController.markRead);
router.post('/notifications/read-all', authenticateToken, NotificationController.markAllRead);

/* -------------------------------------------------------------------------- */
/* Open data and assistant                                                     */
/* -------------------------------------------------------------------------- */
router.get('/analytics/overview', AnalyticsController.overview);
router.post('/ai/sdg-classify', authenticateToken, AIController.classify);
router.post('/ai/chat', AIController.chat);

router.get('/public/statistics', AnalyticsController.overview);
router.get('/public/ngos', optionalAuth, NGOController.list);
router.get('/public/projects', optionalAuth, ProjectController.list);
router.get('/public/gallery', ActivityController.publicGallery);
router.get('/public/ledger', LedgerController.getChain);

export default router;

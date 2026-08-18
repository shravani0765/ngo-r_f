import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { AuthRequest, currentUserNgo } from '../middleware/auth.middleware';
import { handler, badRequest, notFound, forbidden, requireString, optionalString } from '../lib/http';
import { logAudit } from '../lib/audit';
import { notifyNgoOwner, notifyAdmins } from '../services/notification.service';
import { relativePathOf, resolveStoredFile, deleteStoredFile } from '../services/upload.service';
import { isValidUpiId, isValidIfsc, maskAccountNumber, lastFour } from '../services/identity.service';

const prisma = new PrismaClient();

/** The causes a donation or an organisation can be associated with. */
export const CAUSE_CATEGORIES = [
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

export const PaymentController = {
  /** The organisation's own payment details, including bank fields. */
  mine: handler(async (req: AuthRequest, res: Response) => {
    const owned = await currentUserNgo(req);
    if (!owned) return res.json(null);

    const details = await prisma.nGOPaymentDetails.findUnique({ where: { ngoId: owned.id } });
    if (!details) return res.json(null);

    return res.json({
      ...details,
      accountNumberMasked: maskAccountNumber(details.accountNumberLast4),
      qrCodeAvailable: Boolean(details.qrCodePath)
    });
  }),

  /**
   * Saves UPI and optional bank details.
   *
   * Only the last four digits of an account number are kept — enough for the
   * organisation to recognise which account it is, useless to an attacker.
   */
  save: handler(async (req: AuthRequest, res: Response) => {
    const owned = await currentUserNgo(req);
    if (!owned) throw badRequest('Create your organisation profile first.');

    const upiId = optionalString(req.body?.upiId, 100);
    if (upiId && !isValidUpiId(upiId)) {
      throw badRequest('That UPI ID does not look right. It should look like name@bank.');
    }

    const ifsc = optionalString(req.body?.ifsc, 20)?.toUpperCase();
    if (ifsc && !isValidIfsc(ifsc)) {
      throw badRequest('That IFSC code does not look right. It should look like HDFC0001234.');
    }

    const accountNumber = optionalString(req.body?.accountNumber, 30);
    if (accountNumber && !/^\d{9,18}$/.test(accountNumber)) {
      throw badRequest('An account number should be 9 to 18 digits.');
    }

    const data = {
      upiId: upiId ?? null,
      bankAccountName: optionalString(req.body?.bankAccountName, 200) ?? null,
      accountNumberLast4: accountNumber ? lastFour(accountNumber) : null,
      ifsc: ifsc ?? null
    };

    const saved = await prisma.nGOPaymentDetails.upsert({
      where: { ngoId: owned.id },
      update: data,
      create: { ngoId: owned.id, ...data }
    });

    await logAudit(req.user!.id, req.user!.role, 'UPDATE_PAYMENT', 'Payments', owned.id,
      'Payment details updated');

    return res.json({
      ...saved,
      accountNumberMasked: maskAccountNumber(saved.accountNumberLast4),
      qrCodeAvailable: Boolean(saved.qrCodePath)
    });
  }),

  /** Stores the UPI QR code image. */
  uploadQr: handler(async (req: AuthRequest, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw badRequest('Please choose a QR code image (JPG or PNG).');

    if (!file.mimetype.startsWith('image/')) {
      try { fs.unlinkSync(file.path); } catch { /* best effort */ }
      throw badRequest('The QR code must be an image.');
    }

    const ngoId = (req as any).uploadNgoId as string;
    const existing = await prisma.nGOPaymentDetails.findUnique({ where: { ngoId } });
    if (existing?.qrCodePath) deleteStoredFile(existing.qrCodePath);

    const qrCodePath = relativePathOf(file);
    const saved = await prisma.nGOPaymentDetails.upsert({
      where: { ngoId },
      update: { qrCodePath },
      create: { ngoId, qrCodePath }
    });

    await logAudit(req.user!.id, req.user!.role, 'UPLOAD_QR', 'Payments', ngoId, 'UPI QR code uploaded');

    return res.status(201).json({ ...saved, qrCodeAvailable: true });
  }),

  /**
   * Serves an organisation's QR code.
   *
   * Unlike identity documents this is intentionally public — a donor has to be
   * able to scan it — but only for organisations that are verified and active.
   */
  qrImage: handler(async (req: AuthRequest, res: Response) => {
    const ngo = await prisma.nGO.findUnique({
      where: { id: req.params.id },
      include: { paymentDetails: true }
    });

    if (!ngo?.paymentDetails?.qrCodePath) throw notFound('No QR code has been uploaded.');

    const isPrivileged = req.user?.role === 'ADMIN' || req.user?.id === ngo.userId;
    if (ngo.status !== 'VERIFIED' && !isPrivileged) {
      throw forbidden('This organisation is not verified yet.');
    }

    const absolute = resolveStoredFile(ngo.paymentDetails.qrCodePath);
    if (!absolute) throw notFound('The QR code image is missing.');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return fs.createReadStream(absolute).pipe(res);
  })
};

export const CauseController = {
  /** Replaces the organisation's cause list in one call. */
  save: handler(async (req: AuthRequest, res: Response) => {
    const owned = await currentUserNgo(req);
    if (!owned) throw badRequest('Create your organisation profile first.');

    const raw = req.body?.categories;
    if (!Array.isArray(raw)) throw badRequest('Please choose at least one cause.');

    const categories = Array.from(new Set(
      raw.map(c => String(c).trim()).filter(c => CAUSE_CATEGORIES.includes(c as any))
    ));

    if (categories.length === 0) {
      throw badRequest(`Choose at least one cause from: ${CAUSE_CATEGORIES.join(', ')}.`);
    }

    await prisma.$transaction([
      prisma.nGOCause.deleteMany({ where: { ngoId: owned.id } }),
      prisma.nGOCause.createMany({ data: categories.map(category => ({ ngoId: owned.id, category })) })
    ]);

    await logAudit(req.user!.id, req.user!.role, 'UPDATE_CAUSES', 'Organisations', owned.id,
      `Causes set to: ${categories.join(', ')}`);

    return res.json({ categories });
  }),

  options: handler(async (_req: AuthRequest, res: Response) => {
    return res.json({ categories: CAUSE_CATEGORIES });
  })
};

export const ActivityController = {
  /**
   * Uploads a photo showing how donations were used.
   *
   * It stays private until an admin approves it, which is what keeps the public
   * gallery trustworthy.
   */
  create: handler(async (req: AuthRequest, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    const cleanup = () => { if (file) { try { fs.unlinkSync(file.path); } catch { /* best effort */ } } };

    if (!file) throw badRequest('Please choose a photo to upload.');
    if (!file.mimetype.startsWith('image/')) {
      cleanup();
      throw badRequest('Activity uploads must be a JPG or PNG image.');
    }

    const ngoId = (req as any).uploadNgoId as string;

    let title: string, description: string, category: string;
    try {
      title = requireString(req.body?.title, 'Title', 200);
      description = requireString(req.body?.description, 'Description', 2000);
      category = requireString(req.body?.category, 'Category', 60);
    } catch (err) { cleanup(); throw err; }

    if (!CAUSE_CATEGORIES.includes(category as any)) {
      cleanup();
      throw badRequest(`Category must be one of: ${CAUSE_CATEGORIES.join(', ')}.`);
    }

    const dateInput = optionalString(req.body?.activityDate, 40);
    const activityDate = dateInput ? new Date(dateInput) : new Date();
    if (Number.isNaN(activityDate.getTime())) { cleanup(); throw badRequest('That date is not valid.'); }
    if (activityDate.getTime() > Date.now() + 86400000) {
      cleanup();
      throw badRequest('The activity date cannot be in the future.');
    }

    const activity = await prisma.nGOActivity.create({
      data: {
        ngoId, title, description, category,
        imagePath: relativePathOf(file),
        activityDate,
        status: 'PENDING'
      }
    });

    const ngo = await prisma.nGO.findUnique({ where: { id: ngoId }, select: { name: true } });

    await logAudit(req.user!.id, req.user!.role, 'ADD_ACTIVITY', 'Activities', activity.id,
      `Activity photo added: ${title}`);
    await notifyAdmins('Activity photo awaiting approval',
      `${ngo?.name ?? 'An organisation'} uploaded "${title}".`, 'INFO', '/admin');

    return res.status(201).json(activity);
  }),

  /** The organisation's own photos, including ones not yet approved. */
  mine: handler(async (req: AuthRequest, res: Response) => {
    const owned = await currentUserNgo(req);
    if (!owned) return res.json([]);

    return res.json(await prisma.nGOActivity.findMany({
      where: { ngoId: owned.id },
      orderBy: { activityDate: 'desc' }
    }));
  }),

  /**
   * The public impact gallery: approved photos from verified organisations only.
   */
  publicGallery: handler(async (req: AuthRequest, res: Response) => {
    const { category, ngoId } = req.query;

    const where: any = {
      status: 'APPROVED',
      ngo: { status: 'VERIFIED' }
    };
    if (typeof category === 'string' && category) where.category = category;
    if (typeof ngoId === 'string' && ngoId) where.ngoId = ngoId;

    const items = await prisma.nGOActivity.findMany({
      where,
      select: {
        id: true, title: true, description: true, category: true,
        activityDate: true, createdAt: true,
        ngo: { select: { id: true, name: true, city: true, state: true } }
      },
      orderBy: { activityDate: 'desc' },
      take: 120
    });

    return res.json(items);
  }),

  /** Serves an activity image, honouring the same approval rules. */
  image: handler(async (req: AuthRequest, res: Response) => {
    const activity = await prisma.nGOActivity.findUnique({
      where: { id: req.params.id },
      include: { ngo: { select: { userId: true, status: true } } }
    });

    if (!activity) throw notFound('That photo could not be found.');

    const isPrivileged = req.user?.role === 'ADMIN' || req.user?.id === activity.ngo.userId;
    const isPublic = activity.status === 'APPROVED' && activity.ngo.status === 'VERIFIED';
    if (!isPublic && !isPrivileged) throw forbidden('This photo is not public yet.');

    const absolute = resolveStoredFile(activity.imagePath);
    if (!absolute) throw notFound('The image file is missing.');

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', isPublic ? 'public, max-age=3600' : 'private, no-store');
    return fs.createReadStream(absolute).pipe(res);
  }),

  /** Admin approval or rejection of a photo. */
  review: handler(async (req: AuthRequest, res: Response) => {
    const status = requireString(req.body?.status, 'Decision', 30).toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw badRequest('Decision must be APPROVED or REJECTED.');
    }

    const notes = optionalString(req.body?.notes, 1000);
    if (status === 'REJECTED' && !notes) {
      throw badRequest('Please say why the photo was rejected.');
    }

    const activity = await prisma.nGOActivity.findUnique({ where: { id: req.params.id } });
    if (!activity) throw notFound('That photo could not be found.');

    await prisma.nGOActivity.update({
      where: { id: activity.id },
      data: { status, reviewNotes: notes }
    });

    await logAudit(req.user!.id, 'ADMIN', 'REVIEW_ACTIVITY', 'Activities', activity.id,
      `"${activity.title}" marked ${status}`);

    await notifyNgoOwner(
      activity.ngoId,
      status === 'APPROVED' ? 'Your photo is now public' : 'Photo not approved',
      status === 'APPROVED'
        ? `"${activity.title}" now appears in the public impact gallery.`
        : `"${activity.title}": ${notes}`,
      status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      '/ngo/activities'
    );

    return res.json({ message: `Photo ${status.toLowerCase()}.` });
  }),

  /** Removes one of the organisation's own photos. */
  remove: handler(async (req: AuthRequest, res: Response) => {
    const activity = await prisma.nGOActivity.findUnique({
      where: { id: req.params.id },
      include: { ngo: { select: { userId: true } } }
    });

    if (!activity) throw notFound('That photo could not be found.');
    if (activity.ngo.userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      throw forbidden('You can only remove your own photos.');
    }

    deleteStoredFile(activity.imagePath);
    await prisma.nGOActivity.delete({ where: { id: activity.id } });

    return res.json({ message: 'Photo removed.' });
  })
};

import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { AuthRequest, currentUserNgo } from '../middleware/auth.middleware';
import { handler, badRequest, notFound, forbidden, requireString, optionalString } from '../lib/http';
import { logAudit } from '../lib/audit';
import { notifyNgoOwner, notifyAdmins } from '../services/notification.service';
import { recomputeScores } from '../services/scoring.service';
import {
  relativePathOf, hashFile, resolveStoredFile, deleteStoredFile, ALLOWED_DESCRIPTION
} from '../services/upload.service';
import {
  isValidAadhaar, isValidPan, isValidVoterId,
  hashIdentityNumber, lastFour, maskIdentity
} from '../services/identity.service';

const prisma = new PrismaClient();

/** Document types that carry an identity number needing validation and masking. */
const IDENTITY_TYPES: Record<string, { label: string; validate: (v: string) => boolean; hint: string }> = {
  AADHAAR: {
    label: 'Aadhaar',
    validate: isValidAadhaar,
    hint: 'Aadhaar must be 12 digits and pass the standard checksum.'
  },
  PAN: {
    label: 'PAN',
    validate: isValidPan,
    hint: 'PAN must look like AAATH1234F — five letters, four digits, one letter.'
  },
  VOTER_ID: {
    label: 'Voter ID',
    validate: isValidVoterId,
    hint: 'Voter ID must look like ABC1234567 — three letters followed by seven digits.'
  }
};

/** Types that are just a file, with no number attached. */
const FILE_ONLY_TYPES = ['GOV_CERTIFICATE', 'REGISTRATION', 'AUDIT_REPORT', 'ANNUAL_REPORT', 'BANK_DOC'];

const ALL_TYPES = [...Object.keys(IDENTITY_TYPES), ...FILE_ONLY_TYPES];

/**
 * Resolves which organisation an upload belongs to, before multer runs.
 *
 * Multer needs the destination folder while streaming, so ownership has to be
 * established first — this also means a user can never write into another
 * organisation's folder.
 */
export async function resolveUploadTarget(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const owned = await currentUserNgo(req);
    if (!owned) {
      return res.status(400).json({
        message: 'Create your organisation profile before uploading documents.'
      });
    }
    (req as any).uploadNgoId = owned.id;
    next();
  } catch (err) {
    next(err);
  }
}

export const DocumentController = {
  /** Stores an uploaded document. The file itself never becomes publicly readable. */
  create: handler(async (req: AuthRequest, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;

    const cleanup = () => {
      if (file) {
        try { fs.unlinkSync(file.path); } catch { /* best effort */ }
      }
    };

    if (!file) throw badRequest(`Please choose a file to upload (${ALLOWED_DESCRIPTION}).`);

    const ngoId = (req as any).uploadNgoId as string;
    if (!ngoId) { cleanup(); throw badRequest('Organisation could not be resolved.'); }

    let docType: string;
    try {
      docType = requireString(req.body?.docType, 'Document type', 40).toUpperCase();
    } catch (err) { cleanup(); throw err; }

    if (!ALL_TYPES.includes(docType)) {
      cleanup();
      throw badRequest(`Document type must be one of: ${ALL_TYPES.join(', ')}.`);
    }

    // Identity documents must carry a valid number.
    let numberHash: string | null = null;
    let numberLast4: string | null = null;

    const identity = IDENTITY_TYPES[docType];
    if (identity) {
      const raw = optionalString(req.body?.documentNumber, 40);
      if (!raw) { cleanup(); throw badRequest(`${identity.label} number is required.`); }

      const normalised = raw.replace(/[\s-]/g, '').toUpperCase();
      if (!identity.validate(normalised)) { cleanup(); throw badRequest(identity.hint); }

      numberHash = hashIdentityNumber(normalised);
      numberLast4 = lastFour(normalised);

      // The same identity document must not be registered by two organisations.
      const clash = await prisma.nGODocument.findFirst({
        where: { docType, numberHash, ngoId: { not: ngoId } },
        select: { id: true }
      });
      if (clash) {
        cleanup();
        throw badRequest(`This ${identity.label} is already registered to another organisation.`);
      }
    }

    const storagePath = relativePathOf(file);
    const hash = hashFile(file.path);

    // Re-uploading a document type replaces the previous one.
    const previous = await prisma.nGODocument.findFirst({ where: { ngoId, docType } });
    if (previous) {
      deleteStoredFile(previous.storagePath);
      await prisma.nGODocument.delete({ where: { id: previous.id } });
    }

    const document = await prisma.nGODocument.create({
      data: {
        ngoId,
        docType,
        numberHash,
        numberLast4,
        fileName: file.originalname.slice(0, 260),
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        hash,
        status: 'PENDING'
      },
      select: {
        id: true, docType: true, fileName: true, status: true, numberLast4: true,
        mimeType: true, sizeBytes: true, hash: true, uploadDate: true
      }
    });

    const ngo = await prisma.nGO.findUnique({ where: { id: ngoId }, select: { name: true } });

    await logAudit(req.user!.id, req.user!.role, 'UPLOAD_DOCUMENT', 'Documents', document.id,
      `${docType} uploaded (${file.originalname})`);
    await notifyAdmins('Document awaiting review',
      `${ngo?.name ?? 'An organisation'} uploaded a ${docType.replace(/_/g, ' ').toLowerCase()}.`,
      'INFO', '/admin');
    await recomputeScores(ngoId);

    return res.status(201).json({
      ...document,
      masked: maskIdentity(document.docType, document.numberLast4)
    });
  }),

  /**
   * Streams a document file.
   *
   * This is the only way to read an uploaded file. The upload directory is not
   * served statically, so knowing a path is not enough — the caller must own the
   * document or be an admin.
   */
  download: handler(async (req: AuthRequest, res: Response) => {
    const doc = await prisma.nGODocument.findUnique({
      where: { id: req.params.id },
      include: { ngo: { select: { userId: true } } }
    });

    if (!doc) throw notFound('That document could not be found.');

    const isOwner = doc.ngo.userId === req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw forbidden('You do not have permission to view this document.');
    }

    const absolute = resolveStoredFile(doc.storagePath);
    if (!absolute) throw notFound('The stored file is missing.');

    await logAudit(req.user!.id, req.user!.role, 'VIEW_DOCUMENT', 'Documents', doc.id,
      `Viewed ${doc.docType} of organisation ${doc.ngoId}`);

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    // Private data must not be cached by proxies.
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(absolute).pipe(res);
  }),

  /** Admin decision on a single document. */
  review: handler(async (req: AuthRequest, res: Response) => {
    const status = requireString(req.body?.status, 'Decision', 30).toUpperCase();
    if (!['VERIFIED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
      throw badRequest('Decision must be VERIFIED, REJECTED or UNDER_REVIEW.');
    }

    const notes = optionalString(req.body?.notes, 1000);
    if (status === 'REJECTED' && !notes) {
      throw badRequest('Please say why it was rejected, so the organisation can fix it.');
    }

    const doc = await prisma.nGODocument.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound('That document could not be found.');

    await prisma.nGODocument.update({
      where: { id: doc.id },
      data: { status, reviewNotes: notes, verifiedAt: status === 'VERIFIED' ? new Date() : null }
    });

    await logAudit(req.user!.id, 'ADMIN', 'REVIEW_DOCUMENT', 'Documents', doc.id,
      `${doc.docType} marked ${status}`);

    await notifyNgoOwner(
      doc.ngoId,
      status === 'VERIFIED' ? 'Document accepted' : 'Document needs attention',
      status === 'VERIFIED'
        ? `Your ${doc.docType.replace(/_/g, ' ').toLowerCase()} has been accepted.`
        : `${doc.docType.replace(/_/g, ' ')}: ${notes}`,
      status === 'VERIFIED' ? 'SUCCESS' : 'WARNING',
      '/ngo/documents'
    );

    await recomputeScores(doc.ngoId);
    return res.json({ message: 'Decision saved.' });
  }),

  /** Confirms a stored file still matches the hash taken at upload time. */
  verifyIntegrity: handler(async (req: AuthRequest, res: Response) => {
    const doc = await prisma.nGODocument.findUnique({
      where: { id: req.params.id },
      include: { ngo: { select: { userId: true } } }
    });
    if (!doc) throw notFound('That document could not be found.');

    if (doc.ngo.userId !== req.user?.id && req.user?.role !== 'ADMIN') {
      throw forbidden('You do not have permission to check this document.');
    }

    const absolute = resolveStoredFile(doc.storagePath);
    if (!absolute) {
      return res.json({
        isIntegrityValid: false,
        isTampered: true,
        message: 'The stored file is missing.'
      });
    }

    const recalculatedHash = hashFile(absolute);
    const isIntegrityValid = recalculatedHash === doc.hash;

    return res.json({
      documentId: doc.id,
      fileName: doc.fileName,
      storedHash: doc.hash,
      recalculatedHash,
      isIntegrityValid,
      isTampered: !isIntegrityValid,
      message: isIntegrityValid
        ? 'This file has not been changed since it was uploaded.'
        : 'Warning: this file no longer matches its original fingerprint.'
    });
  }),

  /** The signed-in organisation's own documents, with masked numbers. */
  mine: handler(async (req: AuthRequest, res: Response) => {
    const owned = await currentUserNgo(req);
    if (!owned) return res.json([]);

    const docs = await prisma.nGODocument.findMany({
      where: { ngoId: owned.id },
      select: {
        id: true, docType: true, fileName: true, status: true, numberLast4: true,
        mimeType: true, sizeBytes: true, hash: true, reviewNotes: true, uploadDate: true
      },
      orderBy: { uploadDate: 'desc' }
    });

    return res.json(docs.map(d => ({ ...d, masked: maskIdentity(d.docType, d.numberLast4) })));
  })
};

export { ALL_TYPES as DOCUMENT_TYPES };

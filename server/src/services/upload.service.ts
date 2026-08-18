import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';

/**
 * File uploads.
 *
 * Files are written to a directory that is deliberately NOT served as static
 * content. Every read goes through an authenticated endpoint that checks the
 * caller owns the document or is an admin, so an identity document can never be
 * fetched by guessing a URL.
 */

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR ?? './private-uploads');
const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? 5);

/** Extensions and the MIME types we accept for each. */
const ALLOWED: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf']
};

export const ALLOWED_DESCRIPTION = 'JPG, PNG or PDF';
export const MAX_UPLOAD_BYTES = MAX_MB * 1024 * 1024;

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

/**
 * Builds a storage path that cannot escape the upload root, regardless of what
 * the client called the file.
 */
function safeStoragePath(ngoId: string, originalName: string): { relative: string; absolute: string } {
  const ext = path.extname(originalName).toLowerCase();
  // The stored name is generated, never taken from the client.
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  // ngoId is a UUID from our own database, so it is safe as a folder name.
  const relative = path.posix.join(ngoId, name);
  const absolute = path.join(UPLOAD_ROOT, ngoId, name);
  return { relative, absolute };
}

const storage = multer.diskStorage({
  destination(req: Request, _file, cb) {
    const ngoId = (req as any).uploadNgoId;
    if (!ngoId || typeof ngoId !== 'string') {
      return cb(new Error('Upload destination has not been resolved.'), '');
    }
    const dir = path.join(UPLOAD_ROOT, ngoId);
    fs.mkdir(dir, { recursive: true }, err => cb(err, dir));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ALLOWED[file.mimetype];

    // Both the declared MIME type and the extension must be acceptable, and
    // they must agree — a .pdf claiming to be image/png is rejected.
    if (!allowedExts || !allowedExts.includes(ext)) {
      return cb(new Error(`Only ${ALLOWED_DESCRIPTION} files are allowed.`));
    }
    cb(null, true);
  }
});

/** Absolute path on disk for a stored relative path, guarded against traversal. */
export function resolveStoredFile(relativePath: string): string | null {
  const absolute = path.resolve(UPLOAD_ROOT, relativePath);
  // Reject anything that resolves outside the upload root.
  if (!absolute.startsWith(UPLOAD_ROOT + path.sep)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
}

/** Relative path (as stored in the database) for a multer-written file. */
export function relativePathOf(file: Express.Multer.File): string {
  return path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/');
}

/** SHA-256 of a file on disk, so later tampering is detectable. */
export function hashFile(absolutePath: string): string {
  const buffer = fs.readFileSync(absolutePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function deleteStoredFile(relativePath: string): void {
  const absolute = resolveStoredFile(relativePath);
  if (absolute) {
    try {
      fs.unlinkSync(absolute);
    } catch (err) {
      console.error('Could not delete stored file:', err);
    }
  }
}

export { UPLOAD_ROOT, safeStoragePath };

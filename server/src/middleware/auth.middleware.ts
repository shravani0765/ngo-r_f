import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Roles a visitor may pick for themselves at sign-up. ADMIN is deliberately
// absent: platform auditors are provisioned by the seed, never self-declared.
export const SELF_SERVICE_ROLES = ['NGO', 'DONOR', 'PUBLIC'] as const;
export const ALL_ROLES = ['ADMIN', 'NGO', 'DONOR', 'PUBLIC'] as const;

function resolveSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set to at least 16 characters when NODE_ENV=production. ' +
      'Refusing to start with a guessable signing key.'
    );
  }

  // Development only. Logged loudly so it is never mistaken for a real secret.
  console.warn(
    '\n⚠️  JWT_SECRET is not set — using an insecure development key.\n' +
    '   Set JWT_SECRET in server/.env before deploying anywhere public.\n'
  );
  return 'dev-only-insecure-key-do-not-use-in-production';
}

export const JWT_SECRET = resolveSecret();
export const TOKEN_TTL = '12h';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

function readToken(req: Request): string | null {
  const header = req.headers['authorization'];
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
};

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
      // An invalid token on a public route is simply treated as "signed out".
    }
  }
  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `This area is for ${allowedRoles.join(' / ')} accounts only.`
      });
    }
    next();
  };
};

/**
 * Confirms the signed-in user may write to the given NGO.
 *
 * Admins may act on any NGO. Everyone else must be the NGO's owning account.
 * Returns the NGO on success, or null after having already sent the response.
 */
export async function assertNgoAccess(req: AuthRequest, res: Response, ngoId: string) {
  if (!req.user) {
    res.status(401).json({ message: 'Please sign in to continue.' });
    return null;
  }

  const ngo = await prisma.nGO.findUnique({ where: { id: ngoId } });
  if (!ngo) {
    res.status(404).json({ message: 'That organisation could not be found.' });
    return null;
  }

  if (req.user.role !== 'ADMIN' && ngo.userId !== req.user.id) {
    res.status(403).json({ message: 'You can only make changes to your own organisation.' });
    return null;
  }

  return ngo;
}

/**
 * Resolves the NGO owned by the signed-in user, for endpoints where the caller
 * should never have to pass an ngoId at all.
 */
export async function currentUserNgo(req: AuthRequest) {
  if (!req.user) return null;
  return prisma.nGO.findUnique({ where: { userId: req.user.id } });
}

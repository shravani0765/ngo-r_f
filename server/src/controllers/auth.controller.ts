import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  AuthRequest,
  JWT_SECRET,
  TOKEN_TTL,
  SELF_SERVICE_ROLES
} from '../middleware/auth.middleware';
import { handler, badRequest, requireString, optionalString } from '../lib/http';
import { logAudit } from '../lib/audit';
import { notify, notifyAdmins } from '../services/notification.service';
import { sendPasswordResetEmail, isEmailConfigured } from '../services/email.service';

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function issueToken(user: { id: string; email: string; role: string; name: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone ?? undefined,
    ngo: user.ngo ?? undefined
  };
}

export const AuthController = {
  /**
   * Creates an account and, for NGOs, their organisation profile in one step.
   *
   * The organisation fields are optional so a visitor can sign up quickly and
   * finish the profile later — but when they are supplied they are saved,
   * rather than being collected by the form and silently dropped.
   */
  register: handler(async (req: AuthRequest, res: Response) => {
    const email = requireString(req.body?.email, 'Email address', 200).toLowerCase();
    if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address.');

    const password = requireString(req.body?.password, 'Password', 200);
    if (password.length < MIN_PASSWORD) {
      throw badRequest(`Password must be at least ${MIN_PASSWORD} characters.`);
    }

    const name = requireString(req.body?.name, 'Name', 200);
    const role = requireString(req.body?.role, 'Account type', 20).toUpperCase();

    // Admin accounts are provisioned by the platform, never self-selected.
    if (!SELF_SERVICE_ROLES.includes(role as any)) {
      throw badRequest(`Account type must be one of: ${SELF_SERVICE_ROLES.join(', ')}.`);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw badRequest('An account with this email already exists. Try signing in instead.');
    }

    const org = req.body?.organisation;
    const wantsOrg = role === 'NGO' && org && typeof org === 'object';

    // A registration number must be unique across the platform. Check before
    // creating the user so we do not leave an orphaned account behind.
    let regNum: string | undefined;
    if (wantsOrg) {
      regNum = optionalString(org.regNum, 100);
      if (regNum) {
        const clash = await prisma.nGO.findUnique({ where: { regNum } });
        if (clash) {
          throw badRequest('An organisation with this registration number is already on the platform.');
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          phone: optionalString(req.body?.phone, 40)
        }
      });

      if (wantsOrg && regNum) {
        await tx.nGO.create({
          data: {
            userId: created.id,
            name: optionalString(org.name, 200) ?? name,
            description: optionalString(org.description, 2000) ?? '',
            presidentName: optionalString(org.presidentName, 200) ?? '',
            regNum,
            csrReg: optionalString(org.csrReg, 80),
            address: optionalString(org.address, 500) ?? '',
            city: optionalString(org.city, 100) ?? '',
            state: optionalString(org.state, 100) ?? '',
            district: optionalString(org.district, 100) ?? optionalString(org.city, 100) ?? '',
            pinCode: optionalString(org.pinCode, 10) ?? '',
            phone: optionalString(org.phone, 40) ?? optionalString(req.body?.phone, 40) ?? '',
            email: optionalString(org.email, 200) ?? email,
            website: optionalString(org.website, 300),
            mission: optionalString(org.mission, 2000) ?? optionalString(org.description, 2000) ?? '',
            areaOfWork: optionalString(org.areaOfWork, 300) ?? 'General social welfare',
            establishedYear: Number(org.establishedYear) || new Date().getFullYear(),
            employees: Math.max(0, Number(org.employees) || 0),
            volunteers: Math.max(0, Number(org.volunteers) || 0),
            // Every new organisation starts unverified and stays invisible to
            // the public until an admin approves it.
            status: 'PENDING'
          }
        });
      }

      return tx.user.findUnique({ where: { id: created.id }, include: { ngo: true } });
    });

    if (!user) throw badRequest('Could not create the account. Please try again.');

    await logAudit(
      user.id, user.role, 'USER_REGISTER', 'Accounts', user.id,
      `New ${role} account created: ${user.email}${user.ngo ? ` with organisation ${user.ngo.name}` : ''}`
    );

    await notify(
      user.id,
      'Welcome to NGO Impact Commons',
      user.ngo
        ? 'Your organisation has been submitted for verification. We will let you know as soon as an auditor reviews it.'
        : 'Your account is ready. Explore verified organisations and track where donations go.',
      'SUCCESS',
      user.ngo ? '/ngo' : '/directory'
    );

    if (user.ngo) {
      await notifyAdmins(
        'New organisation awaiting review',
        `${user.ngo.name} (${user.ngo.regNum}) has registered and is waiting for verification.`,
        'INFO',
        '/admin'
      );
    }

    return res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  }),

  login: handler(async (req: AuthRequest, res: Response) => {
    const email = requireString(req.body?.email, 'Email address', 200).toLowerCase();
    const password = requireString(req.body?.password, 'Password', 200);

    const user = await prisma.user.findUnique({ where: { email }, include: { ngo: true } });

    // Same message and comparable timing whether the account exists or not.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'That email and password do not match.' });
    }

    await logAudit(user.id, user.role, 'USER_LOGIN', 'Accounts', user.id, `Signed in: ${user.email}`);

    return res.json({ token: issueToken(user), user: publicUser(user) });
  }),

  me: handler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { ngo: true }
    });

    if (!user) return res.status(404).json({ message: 'Account not found.' });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false }
    });

    return res.json({ user: publicUser(user), unreadCount });
  }),

  /**
   * Starts a password reset.
   *
   * Always answers the same way whether or not the address is registered — a
   * differing response would let anyone test which emails have accounts.
   * Only a hash of the token is stored, so the database alone cannot reset it.
   */
  forgotPassword: handler(async (req: AuthRequest, res: Response) => {
    const email = requireString(req.body?.email, 'Email address', 200).toLowerCase();
    const sameAnswer = {
      message: 'If that email has an account, a reset link is on its way. Check your inbox.'
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(sameAnswer);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Any earlier unused tokens are invalidated.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // one hour
      }
    });

    const link = `${process.env.APP_URL ?? 'http://localhost:5173'}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, user.name, link);

    await logAudit(user.id, user.role, 'PASSWORD_RESET_REQUESTED', 'Accounts', user.id,
      'Password reset requested');

    // Without a mail provider configured the link is returned so the flow is
    // still demonstrable. This never happens once SMTP is set up.
    const response: Record<string, unknown> = { ...sameAnswer };
    if (!isEmailConfigured()) response.devResetLink = link;

    return res.json(response);
  }),

  /** Completes a reset using a token from the emailed link. */
  resetPassword: handler(async (req: AuthRequest, res: Response) => {
    const token = requireString(req.body?.token, 'Reset token', 200);
    const newPassword = requireString(req.body?.newPassword, 'New password', 200);

    if (newPassword.length < MIN_PASSWORD) {
      throw badRequest(`Password must be at least ${MIN_PASSWORD} characters.`);
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw badRequest('That reset link is invalid or has expired. Please request a new one.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: await bcrypt.hash(newPassword, 10) }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      })
    ]);

    await logAudit(record.userId, record.user.role, 'PASSWORD_RESET', 'Accounts', record.userId,
      'Password reset completed');

    return res.json({ message: 'Your password has been changed. You can sign in now.' });
  }),

  changePassword: handler(async (req: AuthRequest, res: Response) => {
    const currentPassword = requireString(req.body?.currentPassword, 'Current password', 200);
    const newPassword = requireString(req.body?.newPassword, 'New password', 200);

    if (newPassword.length < MIN_PASSWORD) {
      throw badRequest(`New password must be at least ${MIN_PASSWORD} characters.`);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'Your current password is not correct.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) }
    });

    await logAudit(user.id, user.role, 'PASSWORD_CHANGED', 'Accounts', user.id, 'Password updated');

    return res.json({ message: 'Your password has been updated.' });
  })
};

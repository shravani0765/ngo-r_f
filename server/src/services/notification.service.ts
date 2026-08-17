import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

/**
 * Feedback & notifications (report §6.14): NGOs are told when their submissions
 * are approved, rejected, or need a correction — without having to go looking.
 *
 * Never throws: a failed notification must not roll back the action that
 * triggered it.
 */
export async function notify(
  userId: string | null | undefined,
  title: string,
  message: string,
  type: NotificationType = 'INFO',
  link?: string
) {
  if (!userId) return;
  try {
    await prisma.notification.create({ data: { userId, title, message, type, link } });
  } catch (err) {
    console.error('Could not write notification:', err);
  }
}

/** Sends a notification to the account that owns an NGO. */
export async function notifyNgoOwner(
  ngoId: string,
  title: string,
  message: string,
  type: NotificationType = 'INFO',
  link?: string
) {
  try {
    const ngo = await prisma.nGO.findUnique({ where: { id: ngoId }, select: { userId: true } });
    if (ngo) await notify(ngo.userId, title, message, type, link);
  } catch (err) {
    console.error('Could not resolve NGO owner for notification:', err);
  }
}

/** Sends a notification to every platform admin. */
export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType = 'INFO',
  link?: string
) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await Promise.all(admins.map(a => notify(a.id, title, message, type, link)));
  } catch (err) {
    console.error('Could not notify admins:', err);
  }
}

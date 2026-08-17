import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Appends to the tamper-evident activity log. Never throws — an audit failure
 * must not undo the action it was recording.
 */
export async function logAudit(
  userId: string | null | undefined,
  userRole: string,
  action: string,
  module: string,
  recordId: string | null,
  details: string
) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId ?? null, userRole, action, module, recordId, details }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

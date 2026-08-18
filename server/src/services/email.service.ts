/**
 * Outbound email.
 *
 * Uses Resend when RESEND_API_KEY is set. Without it, messages are written to
 * the server console instead — so the password-reset flow is fully testable
 * with no third-party account, and adding one later needs no code changes.
 */

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM ?? 'NGO Impact Commons <onboarding@resend.dev>';

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_KEY);
}

async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!RESEND_KEY) {
    console.log(
      `\n──────── EMAIL (not sent: RESEND_API_KEY is not set) ────────\n` +
      `To:      ${to}\n` +
      `Subject: ${subject}\n\n${text}\n` +
      `────────────────────────────────────────────────────────────\n`
    );
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: FROM, to, subject, html, text })
    });

    if (!res.ok) {
      console.error('Email provider rejected the message:', res.status, await res.text());
    }
  } catch (err) {
    // A mail failure must not break the request that triggered it.
    console.error('Could not send email:', err);
  }
}

export async function sendPasswordResetEmail(to: string, name: string, link: string): Promise<void> {
  const subject = 'Reset your NGO Impact Commons password';

  const text =
    `Hello ${name},\n\n` +
    `Use this link to choose a new password:\n${link}\n\n` +
    `The link works once and expires in one hour.\n` +
    `If you did not ask for this, you can ignore this message — nothing will change.\n`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
      <h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1>
      <p style="margin:0 0 12px">Hello ${name},</p>
      <p style="margin:0 0 20px">Choose a new password using the button below.</p>
      <p style="margin:0 0 24px">
        <a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Choose a new password
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#475569">
        The link works once and expires in one hour.
      </p>
      <p style="margin:0;font-size:13px;color:#475569">
        If you did not ask for this, ignore this message — nothing will change.
      </p>
    </div>`;

  await send(to, subject, html, text);
}

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM ?? "MyFi <invites@my-fi-app.com>";

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export type InvitationEmail = {
  to: string;
  householdName: string;
  inviterName: string;
  acceptUrl: string;
};

export async function sendInvitationEmail(
  invite: InvitationEmail,
): Promise<{ ok: boolean; reason?: string }> {
  const resend = getClient();
  if (!resend) {
    return { ok: false, reason: "RESEND_API_KEY not configured" };
  }

  const subject = `${invite.inviterName} invited you to ${invite.householdName} on MyFi`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #fffbf5; color: #2a1a12;">
      <h1 style="font-size: 20px; margin: 0 0 8px;">You've been invited to ${escape(invite.householdName)}</h1>
      <p style="font-size: 14px; color: #735548; margin: 0 0 16px;">
        ${escape(invite.inviterName)} added you to their household on MyFi. Accept the invitation to share budgets and spending visibility.
      </p>
      <a href="${invite.acceptUrl}"
         style="display: inline-block; background: #ff9466; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 500;">
        Accept invitation
      </a>
      <p style="font-size: 12px; color: #b59f8d; margin: 24px 0 0;">
        If the button doesn't work, paste this link: <br />
        <a href="${invite.acceptUrl}" style="color: #ff9466;">${invite.acceptUrl}</a>
      </p>
      <p style="font-size: 11px; color: #b59f8d; margin: 24px 0 0;">
        Invitations expire after 14 days. If you weren't expecting this, you can ignore the email.
      </p>
    </div>
  `;
  const text = `${invite.inviterName} invited you to ${invite.householdName} on MyFi.\n\nAccept: ${invite.acceptUrl}\n\nInvitations expire after 14 days.`;

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: invite.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      return { ok: false, reason: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

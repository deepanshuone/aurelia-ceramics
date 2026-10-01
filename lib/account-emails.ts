import { BUSINESS } from "./business";
import { emailLayout, escapeHtml } from "./email-layout";
import { isEmailConfigured, sendEmail } from "./email";
import { RESET_TOKEN_TTL_MS, createResetToken } from "./password-reset";
import { getSiteUrl } from "./site";

type Recipient = { id: string; name: string; email: string; passwordHash: string };

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export async function sendPasswordResetEmail(customer: Recipient) {
  const link = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(createResetToken(customer))}`;
  const minutes = RESET_TOKEN_TTL_MS / 60_000;

  // With no email provider configured nothing is delivered; in development print
  // the link so the flow can still be tried end to end.
  if (!isEmailConfigured() && process.env.NODE_ENV !== "production") {
    console.info(`[email] password reset link for ${customer.email}: ${link}`);
  }

  const html = emailLayout({
    title: "Reset your password",
    label: "Password reset",
    heading: `Hi ${firstName(customer.name)}, reset your password`,
    body: `<p style="margin:0 0 10px;">We received a request to reset the password for your ${escapeHtml(BUSINESS.brand)} account. Click the button below to choose a new one. This link works for ${minutes} minutes and can be used once.</p>`,
    cta: { url: link, label: "Choose a new password" },
    note: `If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;">${escapeHtml(link)}</span><br><br>Didn't ask for this? You can ignore this email — your password won't change.`,
  });
  const text = [
    `Hi ${firstName(customer.name)},`,
    ``,
    `We received a request to reset the password for your ${BUSINESS.brand} account.`,
    `Choose a new password (link works for ${minutes} minutes, one use):`,
    link,
    ``,
    `Didn't ask for this? Ignore this email — your password won't change.`,
  ].join("\n");

  return sendEmail({ to: customer.email, subject: `Reset your password — ${BUSINESS.brand}`, html, text, replyTo: BUSINESS.email });
}

export async function sendPasswordChangedEmail(customer: { name: string; email: string }) {
  const html = emailLayout({
    title: "Your password was changed",
    label: "Account security",
    heading: "Your password was changed",
    body: `<p style="margin:0;">Hi ${escapeHtml(firstName(customer.name))}, the password for your ${escapeHtml(BUSINESS.brand)} account was just changed. If this was you, there's nothing more to do.</p>`,
    note: `If you didn't do this, reset your password straight away and contact us at ${escapeHtml(BUSINESS.email)}.`,
  });
  const text = [
    `Hi ${firstName(customer.name)},`,
    ``,
    `The password for your ${BUSINESS.brand} account was just changed. If this was you, there's nothing more to do.`,
    `If it wasn't, reset your password straight away and contact us at ${BUSINESS.email}.`,
  ].join("\n");

  return sendEmail({ to: customer.email, subject: `Your password was changed — ${BUSINESS.brand}`, html, text, replyTo: BUSINESS.email });
}

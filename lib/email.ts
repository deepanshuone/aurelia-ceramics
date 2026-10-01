import nodemailer from "nodemailer";
import { BUSINESS } from "./business";

/**
 * Outgoing email. Configure ONE of these in the environment:
 *
 *  SMTP (e.g. Gmail — works without your own domain):
 *    SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=you@gmail.com
 *    SMTP_PASS=<16-character Google App Password>
 *
 *  Resend (needs a verified sending domain to email customers):
 *    RESEND_API_KEY=re_...
 *
 *  EMAIL_FROM sets the sender, e.g. "Aurelia Ceramics <orders@yourdomain.in>".
 *
 * With neither configured, emails are only logged — orders never fail
 * because an email could not be sent.
 */

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

function fromAddress() {
  return process.env.EMAIL_FROM || (process.env.SMTP_USER ? `${BUSINESS.brand} <${process.env.SMTP_USER}>` : `${BUSINESS.brand} <onboarding@resend.dev>`);
}

export function isEmailConfigured() {
  return Boolean((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
}

let transporter: nodemailer.Transporter | null = null;
function smtp() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Sends an email. Returns true when a provider accepted it. Never throws. */
export async function sendEmail(email: Email): Promise<boolean> {
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      await smtp().sendMail({ from: fromAddress(), to: email.to, subject: email.subject, html: email.html, text: email.text, replyTo: email.replyTo });
      return true;
    }

    if (process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddress(), to: [email.to], subject: email.subject, html: email.html, text: email.text, reply_to: email.replyTo }),
      });
      if (!response.ok) {
        console.error(`[email] Resend rejected "${email.subject}" to ${email.to}: ${response.status} ${await response.text()}`);
        return false;
      }
      return true;
    }

    console.info(`[email] not configured — would send "${email.subject}" to ${email.to}`);
    if (process.env.EMAIL_DEBUG === "1") console.info(email.text);
    return false;
  } catch (error) {
    console.error(`[email] failed to send "${email.subject}" to ${email.to}:`, error);
    return false;
  }
}

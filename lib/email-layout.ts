import { BUSINESS } from "./business";

/** Email-safe HTML: every customer-entered value goes through this. */
export const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The branded shell shared by the account and order-status emails. `body` is
 * trusted HTML: callers must pass customer-supplied values through escapeHtml.
 */
export function emailLayout(options: {
  title: string;
  label: string;
  heading: string;
  body: string;
  cta?: { url: string; label: string };
  note?: string;
}) {
  const { title, label, heading, body, cta, note } = options;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f1e9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(heading)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e7e1d6;">
        <tr><td style="background:#171614;padding:22px 28px;color:#f5f1e9;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:3px;">
          ${escapeHtml(BUSINESS.brand.toUpperCase())}
        </td></tr>

        <tr><td style="padding:30px 28px 10px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;color:#6b5947;">${escapeHtml(label.toUpperCase())}</p>
          <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#171614;">${escapeHtml(heading)}</h1>
          <div style="font-size:15px;line-height:1.7;color:#46423c;">${body}</div>
        </td></tr>
        ${
          cta
            ? `<tr><td align="center" style="padding:20px 28px 6px;">
          <a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#171614;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:14px;font-weight:bold;">${escapeHtml(cta.label)}</a>
        </td></tr>`
            : ""
        }
        ${note ? `<tr><td style="padding:14px 28px 6px;font-size:13px;line-height:1.6;color:#746f67;">${note}</td></tr>` : ""}
        <tr><td style="padding:10px 28px 22px;"></td></tr>

        <tr><td style="background:#f5f1e9;padding:18px 28px;font-size:12px;line-height:1.6;color:#746f67;text-align:center;">
          Questions? Reply to this email or write to <a href="mailto:${escapeHtml(BUSINESS.email)}" style="color:#6b5947;">${escapeHtml(BUSINESS.email)}</a>
          · ${escapeHtml(BUSINESS.phone)}<br>${escapeHtml(BUSINESS.legalName)}, ${escapeHtml(BUSINESS.address)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

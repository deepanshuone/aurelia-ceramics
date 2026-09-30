# Going live — checklist

Everything the code can't decide for you. Work through it top to bottom before
taking real orders.

## 1. Business details (required by Razorpay and Indian e-commerce rules)

Edit **`lib/business.ts`** — it feeds the footer, contact page and all four policy pages:

- [ ] `legalName` — your registered business name
- [ ] `email` — an inbox you actually read
- [ ] `phone` — a real support number (currently `+91 00000 00000`)
- [ ] `address` — full registered / pickup address
- [ ] `gstin` — if GST-registered (leave empty to hide)
- [ ] `POLICY` timelines (dispatch, delivery, return window) — only promise what you can meet
- [ ] Have the policy pages (`/privacy-policy`, `/terms-and-conditions`, `/shipping-policy`,
      `/return-refund-policy`) reviewed by someone qualified. They describe how this site
      really works, but they are a starting point, not legal advice.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | App database (Neon **pooled** URL) |
| `POSTGRES_URL_NON_POOLING` | Migrations during build (Neon **direct** URL) |
| `NEXTAUTH_SECRET` | Login sessions — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your live URL, e.g. `https://www.your-domain.in` |
| `NEXT_PUBLIC_SITE_URL` | Canonical links, sitemap, social previews |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Online payments (use **test** keys first) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same key id, for the browser |
| `RAZORPAY_WEBHOOK_SECRET` | Payment confirmation webhook |
| `CRON_SECRET` | Daily clean-up of unpaid orders (`/api/cron/expire-orders`) |

Without the Razorpay keys the shop still works — checkout offers **Cash on Delivery** only.

## 3. Razorpay

- [ ] Dashboard → Webhooks → add `https://<your-domain>/api/payments/razorpay/webhook`
      with events `payment.captured`, `payment.failed`, `order.paid`; copy its secret to
      `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Place a test order with test keys; check it shows **Paid / Confirmed** in `/admin/orders`.
- [ ] Switch to live keys only after Razorpay activates your account.

## 4. Database

Migrations run automatically on every Vercel build (`prisma migrate deploy`).

- [ ] Load the product catalogue into the **production** database once:
      `DATABASE_URL="<Neon URL>" npx tsx prisma/seed.ts`
      ⚠ Re-running the seed resets prices and stock of seeded products — after launch,
      manage products in `/admin/products` instead.
- [ ] Commit `public/products/` (product photos) — the catalogue points at them.
- [ ] Optional sanity check: `npx tsx scripts/check-catalog.ts`

Note: locally, the Prisma CLI reads `POSTGRES_URL_NON_POOLING`, which may point at the
production database. For local schema changes, override it with your local URL first.

## 5. Admin access

- [ ] Register on the live site, then run (against production):
      `DATABASE_URL="<Neon URL>" npm run make-admin -- you@example.com`
- [ ] Log out and back in → **Admin Panel** appears under My Account.

## 6. After launch

- [ ] Check `/admin/enquiries` regularly — contact-form messages land there
      (no email notifications are sent yet).
- [ ] Replace the placeholder product photos (CC0 stock images, credits in
      `public/products/CREDITS.md`) with photos of your own stock.
- [ ] Submit `https://<your-domain>/sitemap.xml` in Google Search Console.

## Known limitations

- Rate limits (login, sign-up, coupons, contact form) are kept per server instance —
  they slow abuse down; use a shared store such as Upstash Redis for strict limits.
- `npm audit` reports advisories in build-time tooling (PostCSS inside Next.js, a Prisma
  CLI dependency). They don't process visitor input; fixing them needs Next.js 16.

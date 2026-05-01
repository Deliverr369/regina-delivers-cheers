# Payment Notifications: Email + Optional SMS

## What you'll get

When Stripe tells us about a payment event, we'll automatically:

| Event | In-app notification (already done) | Email (new) | SMS (new, optional) |
|---|---|---|---|
| Payment succeeded (captured) | ✅ | ✅ "Payment received" receipt | ✅ short receipt |
| Payment failed | ✅ | ✅ "Payment failed — try another card" | ✅ short alert |
| Refund (full or partial) | ✅ | ✅ "Refund issued" with amount | ✅ short confirmation |
| Dispute / chargeback opened | (none today) | ✅ admin-only alert (to your support inbox) | — |

Everything fires from the existing `payments-webhook` edge function, so it works for both sandbox and live Stripe.

---

## Setup steps

### 1. Email domain (one-time, ~5 min of your time)

You don't have a sender domain configured yet. To send branded emails from `@deliverr.ca` (instead of a generic Lovable address), we need to set up a sender domain. I'll trigger the setup dialog at the end of this plan — you'll paste a couple of DNS records at your domain registrar, and the rest is automatic.

If you'd rather skip this for now, I can still send via the default Lovable sender — just say the word.

### 2. SMS (optional — say yes/no)

For SMS, we need a Twilio account. Two paths:

- **Skip SMS** (recommended for launch): emails + push notifications are enough for 95% of customers. We can add SMS later.
- **Enable SMS now**: I'll connect Twilio (you provide an Account SID + API key + a Twilio phone number). SMS only fires if the customer has a phone number on their profile.

### 3. Admin alert email

For disputes (and optionally failed payments), where should the alert go? Default: the email on your admin user account. Tell me a different inbox if you'd like (e.g., `support@deliverr.ca`).

---

## What I'll build

### Email templates (4 React Email components, all branded with Deliverr colors/fonts)

1. **`payment-receipt.tsx`** — Order #, items list, subtotal/tax/delivery/total, "View order" button → `/orders`
2. **`payment-failed.tsx`** — Order #, decline reason from Stripe, "Update payment method" button → `/checkout` or `/profile`
3. **`refund-issued.tsx`** — Order #, refund amount, full vs partial, expected timing (5–10 business days)
4. **`dispute-opened.tsx`** — Admin-only: order #, customer email, dispute amount, link to Stripe dashboard

All templates pull brand colors (HSL 354 75% 55%, Montserrat headings, Inter body) from `index.css` so they match the app.

### Webhook changes (`supabase/functions/payments-webhook/index.ts`)

After each existing handler updates the DB and inserts the in-app notification, add:

- A helper `sendCustomerEmail(orderId, templateName, data)` that:
  - Loads the customer's email + name from `profiles`
  - Loads order items + totals (joined query)
  - Invokes `send-transactional-email` with an idempotency key `${event.id}-${templateName}` so Stripe retries never double-send
- A helper `sendCustomerSms(orderId, message)` (only if Twilio is enabled) that:
  - Loads the customer's phone from `profiles`
  - Skips silently if no phone is on file
  - Posts to Twilio via the connector gateway
- For disputes: `sendAdminEmail(...)` to the configured admin inbox

### Idempotency & safety

- `idempotencyKey` derived from Stripe's `event.id` so duplicate webhook deliveries (Stripe retries for up to 3 days) never cause duplicate emails/SMS.
- All sends are wrapped in try/catch — a failed email never blocks the DB update or returns an error to Stripe (which would cause retry storms).
- Suppression list (built into Lovable Emails) means unsubscribed customers automatically don't get emails.

### Files touched

- **New:** `supabase/functions/_shared/transactional-email-templates/payment-receipt.tsx`
- **New:** `supabase/functions/_shared/transactional-email-templates/payment-failed.tsx`
- **New:** `supabase/functions/_shared/transactional-email-templates/refund-issued.tsx`
- **New:** `supabase/functions/_shared/transactional-email-templates/dispute-opened.tsx`
- **Updated:** `supabase/functions/_shared/transactional-email-templates/registry.ts`
- **Updated:** `supabase/functions/payments-webhook/index.ts` (adds email/SMS calls inside each handler)
- **Migration (only if SMS enabled):** add a `notification_preferences` JSONB column to `profiles` with default `{"email": true, "sms": false}` so customers can opt in/out later.

### Tools/secrets I'll need

- Email domain setup (button below) — required for branded emails
- (Optional) Twilio connector + a Twilio phone number — required for SMS
- No new Stripe config needed — webhook is already wired up

---

## Open questions before I build

1. **Email sender domain** — set up `notify.deliverr.ca` now, or send from default for now?
2. **SMS** — enable Twilio now, or skip for launch?
3. **Admin alert inbox** — your admin email, or a different address?

Answer those (or say "go ahead with defaults: set up domain, skip SMS, use my admin email") and I'll implement everything in one shot once approved.

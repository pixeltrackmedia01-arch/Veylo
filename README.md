# GroupDrive

A vehicle group-buying marketplace for **Surat, Gujarat**. People who want the same car or two-wheeler **model and variant** join a free buyer group. When a group reaches **20 verified participants** or its deadline, GroupDrive requests itemised quotations from authorised dealerships, reviews them, and publishes approved quotations to participants. Customers buy directly from the dealership. GroupDrive earns a configurable commission from the dealership only after a **verified completed sale**.

> Joining is always free. Reaching 20 participants triggers quotation coordination; it never guarantees a discount, a quotation or a purchase.

**Stack:** Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 · shadcn/ui-style components on Radix · Lucide · Supabase (Postgres, Auth, Storage) · React Hook Form + Zod · Recharts · Vitest · Playwright.

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Local development](#local-development)
4. [Supabase setup](#supabase-setup)
5. [Create the first administrator](#create-the-first-administrator)
6. [Demo data](#demo-data)
7. [Testing](#testing)
8. [Deploying to Hostinger](#deploying-to-hostinger)
9. [Scheduled jobs (batch deadlines)](#scheduled-jobs-batch-deadlines)
10. [Email notifications](#email-notifications)
11. [Security model](#security-model)
12. [Business rules and where they're enforced](#business-rules-and-where-theyre-enforced)
13. [Configuration and branding](#configuration-and-branding)
14. [Known limitations / launch checklist](#known-limitations--launch-checklist)

---

## Features

**Public site** — homepage, searchable/filterable vehicle catalogue (`/vehicles`), vehicle detail with variants, verified specs and indicative prices with source and date (`/vehicles/[slug]`), group pages with verified count, deadline, quotation status and free-join CTA (`/groups/[slug]`), How It Works, About, FAQ, Contact, Terms, Privacy, Disclaimer, sitemap, robots, Open Graph metadata, JSON-LD where accurate.

**Customers** (`/dashboard`) — sign up, email verification, password reset, optional mobile OTP; join/leave groups (idempotent); verification checklist; purchase-intent confirmation; reviewed itemised quotations with like-for-like savings only when comparable; consent-based dealer enquiries; booking status; purchase-completion confirmation with evidence upload; profile and notification preferences; in-app notifications.

**Admins** (`/admin`) — dashboard with distinct funnel counts and charts (date filter); vehicles, variants, specs, images, reference prices with history; batch creation and lifecycle (open, close, extend with audit, cancel, request quotations from eligible dealers, request intent, eligibility overrides); dealer directory with authorisation verification, brands, portal users and performance; quotation review (record, edit, approve, reject, request changes, publish, expire, withdraw) with history; enquiries, bookings and sale verification; commission agreements and commission records (invoiced/payable/paid/disputed/cancelled, manual adjustments with reason); CSV exports; FAQs, pages, homepage copy and settings; contact messages; append-only audit log.

**Dealers** (`/dealer`) — quotation requests for their dealership only; itemised quotation editor with document upload; decline/withdraw; availability and validity updates (shortening only once submitted); enquiries routed to them with consented contact details; bookings; sale claims with evidence; read-only commissions.

---

## Architecture

```
src/
  app/
    (public)/…         public pages (header + footer layout)
    (auth)/…           login, signup, forgot/reset password, verify email
    auth/confirm       Supabase email-link handler (token_hash + PKCE)
    dashboard/…        customer area
    admin/…            admin area
    dealer/…           dealer portal
    api/cron/process-batches   scheduled job endpoint (Bearer CRON_SECRET)
    api/admin/export   CSV exports (admin only)
    api/health         liveness check
  components/          ui/ (design system), shared/, layout/, admin/, dealer/, quotes/, …
  config/site.ts       brand name, colours, contact, launch city
  content/pages.ts     default copy for About and legal pages (admin-overridable)
  lib/
    supabase/          browser, server (cookie session), admin (service role, server-only), proxy
    auth/session.ts    getViewer / requireViewer / requireAdmin / requireDealer
    actions/           Server Actions (customer, auth, admin-*, dealer, quotes)
    data/              server-side queries
    domain/            pure business logic (state machine, pricing & savings, commission) + tests
    notifications/     provider abstraction, templates, outbox dispatcher
    validation/        Zod schemas shared by forms and actions
  proxy.ts             session refresh + signed-out redirects (Next 16 "proxy", formerly middleware)
supabase/
  migrations/          schema, business functions, RLS & grants, storage, default content, quotation editing
  seed.sql             development demo data (clearly marked)
  cron.sql             optional pg_cron schedule
  tests/supabase_stub.sql   minimal Supabase stand-in for DB tests on plain Postgres
tests/
  db/                  PostgreSQL integration tests for business rules & RLS
  e2e/                 Playwright end-to-end tests
```

Key decisions:

- **The database is the source of truth for every rule that matters.** Joining, counting, closing, quotation status changes, sale verification and commission calculation run in `SECURITY DEFINER` PostgreSQL functions that read the caller's identity from the JWT. Clients never send counts, totals, roles, statuses or commission amounts.
- **User-scoped clients + RLS everywhere.** The service-role key is used only for the scheduled job, email dispatch, rate limiting and the contact form.
- **No extra infrastructure.** No Redis, queues or separate backend: rate limiting and the notification outbox live in Postgres.
- **Dynamic rendering.** Every page reads the session, so the app renders on request (`dynamic = "force-dynamic"` at the root). Cache Components are disabled deliberately.

---

## Local development

Requirements: **Node.js 20.9+ (22 LTS recommended)**, npm, a Supabase project (cloud or local via the Supabase CLI + Docker).

```bash
npm ci
cp .env.example .env.local     # fill in Supabase URL/keys (see below)
npm run dev                    # http://localhost:3000
```

Useful scripts:

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server (respects `PORT`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Database integration tests (needs `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright end-to-end tests (needs a running app + Supabase) |

Without Supabase credentials the site still builds and renders, showing a setup notice instead of data.

---

## Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com) (region: Mumbai `ap-south-1` is closest to Surat).
2. **Apply migrations** — in order, every file in `supabase/migrations/`:
   - With the CLI (recommended): `supabase link --project-ref <ref>` then `supabase db push`.
   - Or paste each file into **SQL Editor** in filename order.
3. **(Development only) seed demo data:** run `supabase/seed.sql` in the SQL editor, or `supabase db reset` locally (which runs migrations then the seed). **Never run the seed on production.**
4. **Auth settings** (Authentication → URL Configuration):
   - *Site URL:* your site URL (e.g. `https://groupdrive.in`).
   - *Redirect URLs:* `https://<your-domain>/auth/confirm` (and `http://localhost:3000/auth/confirm` for development).
   - Keep **Confirm email** enabled in production.
5. **Email templates** (Authentication → Email Templates): point links at the app's handler, e.g. for *Confirm signup*:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
   and for *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`.
   (The default PKCE `?code=` links also work.)
6. **SMTP** (Authentication → SMTP): configure a real sender for auth emails — Supabase's built-in sender is heavily rate-limited.
7. **Optional mobile OTP:** enable the Phone provider with an SMS provider (e.g. Twilio, MessageBird, Vonage), set `NEXT_PUBLIC_PHONE_OTP_ENABLED=true`, and if you want phone verification to be mandatory for counting toward targets, set the `verification.require_phone` setting to `true` in **Admin → Content & settings**.
8. **Storage:** the migrations create three buckets with size/type limits and RLS policies: `vehicle-images` (public), `quotation-documents` (private) and `sale-evidence` (private).
9. **Environment variables:** copy the project URL, anon (publishable) key and service-role key into `.env.local` (development) or your host's environment settings (production).

### Applying migrations safely in production

- Always apply migrations **before** deploying code that depends on them. Migrations are additive and written to be applied in filename order.
- Test on a Supabase **branch** or staging project first (`supabase db push --dry-run` shows what will run).
- Take a backup (Database → Backups) before applying to production.
- Never edit an applied migration; add a new file instead.

---

## Create the first administrator

There is **no default admin account or password**. To create one:

1. Sign up normally on the website with the administrator's email and verify it.
2. In the Supabase **SQL Editor** (which runs as the database owner) run:

   ```sql
   select public.grant_admin_by_email('you@yourcompany.in');
   ```

   This function cannot be called by website users. The grant is written to the audit log.
3. Sign out and back in; **Admin** appears in the account menu. Further admins can be granted from **Admin → Users**.

**Dealer staff:** they sign up normally; an admin then adds them on the dealer's page (**Admin → Dealers → [dealer] → Add user**). Dealers receive quotation requests only after an admin marks their **authorisation as verified** and records their authorised brands.

---

## Demo data

`supabase/seed.sql` creates (development only):

- Six demo vehicles (cars and two-wheelers) with variants, illustrative specs and **demo reference prices** labelled `DEMO DATA`.
- Four demo dealers (one deliberately unverified so you can see it excluded from requests).
- Open, closed, draft and expired batches; one closed batch with a published demo quotation, a quotation awaiting review, enquiries, a booking and a sale claim.
- 25 demo participant accounts (`demo-participant-NN@example.invalid`) **with no password** — they cannot sign in and never receive email.
- Two demo commission agreements.

Everything is flagged `is_demo` and shown with a **Demo data** badge. Placeholder images are illustrations labelled "Illustration · not actual vehicle". No testimonials, sales figures or dealer logos are fabricated anywhere.

---

## Testing

### Unit tests
`npm test` — state machine, savings comparability rules, quotation totals, commission agreement selection and calculation, INR/IST formatting, redirect safety.

### Database integration tests
These run the real migrations against PostgreSQL (with a small Supabase stub for `auth`, roles and storage) and impersonate users exactly as PostgREST does.

```bash
# any Postgres 15+ server you can create databases on
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run test:db
```

They cover: joining only once (including concurrent duplicate submissions); unverified users not counting; exactly 20 verified participants triggering target reached (and never exceeding it under 30 concurrent joins); deadline closure with and without the minimum; idempotent closure without duplicate quotation requests or notifications; only approved **and published** quotations visible to participants; customers unable to read others' data; dealer isolation; dealers unable to approve quotations or verify their own sales; conflict-of-interest blocking; admin-only sale verification; commission calculation from the configured (most specific, in-date) agreement; clients unable to alter counts, totals or commission amounts; audit-log immutability; atomic quotation editing.

CI runs these against a Postgres service container (`.github/workflows/ci.yml`).

### End-to-end tests (Playwright)
Run against a running app connected to a Supabase project with migrations + seed applied and **email auto-confirm enabled** (e.g. a local `supabase start` stack):

```bash
npm run build && npm start &
E2E_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<local service key> \
npm run test:e2e
```

Covers public browsing (desktop + mobile), protected-route redirects, no participant data in public HTML, sign-up → join once → dashboard, admin approve → publish → visible to a verified participant only, and dealer isolation. Use `PLAYWRIGHT_CHROMIUM_PATH` to point at an existing Chromium if needed. Sign-up is rate-limited to 5 per hour per IP, so repeated runs against the same database may need `delete from public.rate_limits;` first.

---

## Deploying to Hostinger

GroupDrive is a standard Next.js Node.js server app (no Docker, no local file persistence — all data and files live in Supabase), which suits Hostinger's **Node.js Web App** hosting with GitHub deployment.

1. **Push this repository to GitHub.**
2. In **hPanel → Websites → Add website → Node.js Web App** (Business or Cloud plans), choose **Import Git repository** and connect your GitHub account, then select the repository and branch.
3. **Build settings:**
   - Framework preset: **Next.js** (or "Other")
   - Node.js version: **22.x** (20.x also works)
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Start command: `npm start`
   - Output directory: `.next` (if asked)
4. **Environment variables** (Web App → Settings → Environment variables) — set all values from `.env.example`:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and optionally `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_PHONE_OTP_ENABLED`.
   `NEXT_PUBLIC_*` values are embedded at **build time** — redeploy after changing them.
5. **Domain:** attach your production domain in hPanel, enable SSL, then set `NEXT_PUBLIC_SITE_URL=https://your-domain` and add `https://your-domain/auth/confirm` to Supabase redirect URLs (and update Supabase's Site URL). Redeploy.
6. **Database first:** apply any new migrations to Supabase *before* triggering a deployment that needs them (see [Applying migrations safely](#applying-migrations-safely-in-production)).
7. **Verify:** open `https://your-domain/api/health` → `{"ok":true,"supabaseConfigured":true}`, then create the first admin.

Pushes to the connected branch redeploy automatically (if auto-deploy is enabled in hPanel).

---

## Scheduled jobs (batch deadlines)

Batches close automatically the moment the 20th verified participant joins (inside the join transaction). **Deadline** closure, quotation-request retries, closing-soon reminders and quotation expiry need a scheduler. The job is `public.process_due_batches()`; it is idempotent and safe to run as often as you like. Use **at least one** of:

1. **App endpoint (recommended — also sends pending emails):**
   `POST https://your-domain/api/cron/process-batches` with header `Authorization: Bearer <CRON_SECRET>`.
   Trigger it every 10–15 minutes from:
   - **GitHub Actions** — `.github/workflows/batch-scheduler.yml` is included. Add repository secrets `APP_URL` and `CRON_SECRET`.
   - **Hostinger cron jobs** (hPanel → Advanced → Cron Jobs, where available):
     `curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain/api/cron/process-batches`
   - Any external scheduler (e.g. cron-job.org).
2. **Supabase pg_cron (database-only, independent of the web host):** enable the `pg_cron` extension and run `supabase/cron.sql`. Emails queued by the job are delivered on the next app-endpoint run or user action.

Admins can also run the job manually from **Admin → Overview → Run batch job**.

---

## Email notifications

Database functions write notifications to an **outbox** (`public.notifications`) in the same transaction as the state change, with a unique `dedupe_key` so retried jobs never duplicate messages. The app delivers pending email rows through a provider abstraction (`src/lib/notifications/`):

- `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` → sends via Resend's HTTP API. A row is marked **sent** only when the provider returns an accepted message id; retryable failures are retried up to 5 times, then marked **failed**.
- **No provider configured (default):** development mode. Nothing is sent; email rows are marked **skipped** with the reason "Email delivery disabled". The admin dashboard shows a banner. In-app notifications always appear in the customer dashboard.
- Reserved/test domains (`example.*`, `.invalid`, `.test`) are never emailed.

Covered events: joining, closing soon, target reached, closure/expiry, cancellation, deadline extension, quotation request (dealers), quotation publication, purchase-intent requests, enquiry and booking updates, evidence requests. Account verification and password-reset emails are sent by Supabase Auth (configure SMTP there). To add another provider, implement `EmailProvider` in `providers.ts`.

---

## Security model

- **Authentication:** Supabase Auth with cookie sessions via `@supabase/ssr`. The proxy refreshes sessions; the server always validates identity with `auth.getClaims()`, never `getSession()`.
- **Authorisation, three layers:** (1) proxy redirects signed-out users from `/dashboard`, `/admin`, `/dealer`; (2) every layout, page and Server Action re-checks the role server-side (admin/dealer areas return 404 to others); (3) **RLS on every table** plus column-level grants and guard triggers in Postgres.
- **Privileges:** all default grants are revoked; `anon`/`authenticated` receive only the table, column and function privileges they need. Customers can update only personal profile fields. Status, counts, totals, verification flags and commission amounts are writable only by trusted database functions.
- **Separation of duties:** dealers cannot approve/publish quotations, verify sales or mark commissions paid; admins linked to a dealership are blocked from verifying that dealership's sales or changing its commissions (`conflict_of_interest`).
- **Privacy:** participants' identities are never exposed publicly — group pages read only the trusted `verified_participant_count`. Dealers never read profiles; they receive only the contact details a customer consents to share in an enquiry. CSV exports omit customer contact details.
- **Uploads:** validated by size and file signature (magic bytes), stored under random names in private buckets with folder-scoped storage policies, and shared via 2-minute signed URLs.
- **Abuse protection:** Postgres-backed rate limits on sign-up, login (per IP and per email), password reset, joining, enquiries, sale claims and the contact form (plus a honeypot). Supabase Auth's own limits apply as well.
- **Secrets:** only `NEXT_PUBLIC_SUPABASE_URL` and the anon key reach the browser. `SUPABASE_SERVICE_ROLE_KEY` is read only in `src/lib/supabase/admin.ts`, which is `server-only`.
- **Audit log:** append-only (`public.audit_logs`, no write grants) covering status changes, approvals, publications, verifications, commission changes, adjustments, overrides, role and suspension changes, settings and exports.
- Security headers (HSTS, frame denial, nosniff, referrer and permissions policies) are set in `next.config.mjs`; open redirects after login are blocked.

---

## Business rules and where they're enforced

| Rule | Enforced in |
|---|---|
| Joining is free; no payments for customers | No payment code exists anywhere |
| One membership per user per batch; duplicate submissions are idempotent | `unique (batch_id, user_id)` + `join_batch()` |
| Only verified, eligible participants count | `guard_membership_write()`, `recount_batch()`, `is_user_verified()` |
| Target of 20 can never be exceeded, even concurrently | Batch row lock in the membership guard |
| Close at 20 verified or at deadline, whichever first | `recount_batch()` → `close_batch()`; `process_due_batches()` |
| Below the minimum at deadline → expired, no quotations | `close_batch()` |
| Closure is idempotent; no duplicate quotation requests | `close_batch()` status check + `unique (batch_id, dealer_id)` + notification `dedupe_key` |
| Reaching 20 isn't "success" | State machine: `target_reached → quotation_requested`, never directly `completed` |
| Quotations itemised; totals computed server-side | `quotation_line_items`, `recalculate_quotation_totals()`, `save_quotation()` |
| Only approved + published quotations reach customers | `can_view_quotation()` RLS |
| Savings only for like-for-like, current, verified references | `computeSavings()` in `src/lib/domain/pricing.ts` |
| Dealers see only their own records | RLS via `is_dealer_member()` |
| Only admins verify sales; never the dealer's own staff | `admin_review_sale()` |
| Commission from explicit, configurable agreements | `find_commission_agreement()`, `calculate_commission_amount()`; percentage agreements require a defined basis |
| Manual adjustments need a reason and are audited | `admin_adjust_commission()` |
| Only admins mark commission paid (with payment date) | `admin_update_commission()` |
| Deadline extensions are audited | `admin_extend_batch_deadline()` + `batch_deadline_extensions` |

---

## Configuration and branding

- **Brand name, colours, contact details, launch city:** `src/config/site.ts`. Colours become CSS variables in the root layout.
- **Runtime-editable (Admin → Content & settings):** public contact details, homepage hero copy, phone-verification policy, default batch target/minimum, FAQs, and the About/Privacy/Terms/Disclaimer pages.
- **More cities:** add a row to `public.cities` with `is_active = true`; batches, dealers and prices are already city-scoped.

---

## Known limitations / launch checklist

- **Legal review required:** Terms, Privacy Policy and Disclaimer are working drafts and are flagged on-page as requiring professional review (including DPDP Act 2023 compliance) before launch.
- **Replace demo content:** do not run `seed.sql` in production; add real, verified vehicles, specs, prices (with sources) and verified dealers through the admin area.
- **Images:** upload only images you have rights to (e.g. manufacturer press kits) and record attribution; otherwise labelled illustrations are shown.
- **Email & SMS:** configure SMTP in Supabase Auth, an email provider for notifications, and optionally an SMS provider for mobile OTP.
- **Scheduler:** configure at least one of the scheduling options above.
- Update `siteConfig.contact` / the contact setting and `legalEntity` with real details.

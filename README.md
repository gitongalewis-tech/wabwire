# Wabwire Global Innovations Ltd

Full-stack React and Node.js membership and business platform foundation built from the supplied Wabwire company blueprint and service documents.

## Workspace structure

```text
frontend/
  public/images/             Supplied logo and founder portrait; approved image assets
  src/components/            Public site, shared portal navigation and route guards
  src/context/               Authentication session context
  src/data/                  Public service and price-guide content
  src/pages/public/          Company, services, learning, events, contact and authentication
  src/pages/user/            Member dashboard and workflows
  src/pages/admin/           Administration workspace
  src/services/              API client
backend/
  src/config/                MongoDB connection
  src/integrations/mpesa/    Daraja API client
  src/middleware/            Authentication, roles, rate limiting
  src/models/                Mongoose schemas and indexes
  src/routes/                Feature route modules and API aggregator
  src/services/              Membership, settings and audit services
  src/scripts/               Initial super administrator setup
```

## Features implemented

- Public company pages based on the source material: home, company story, services, web development, social media, branding, tourism, learning, events, contact and legal-information placeholders.
- Responsive layouts, custom navy/gold design system, logo use, founder profile, route titles, reduced-motion support and mobile navigation.
- Registration with unique referral code, permanent referral attribution, required draft-policy acknowledgements and secure password hashing; sign-in uses an HTTP-only cookie.
- Membership states and a KES 5,000 default fee, configurable in the admin area.
- Daraja STK Push initiation and callback correlation; manual Paybill submissions remain pending until admin verification. M-Pesa secrets stay server-side.
- Referral levels, configurable commission rules (initial guide values: KES 2,000 / 1,000 / 500), payment-triggered ledger entries, approval and payout statuses, withdrawal requests and audit logging.
- Member profile, referral tree, commission ledger, withdrawal requests, learning courses, lesson progress, printable course-completion certificates, class links, events, community feed, reports and notifications.
- Admin overview with database-backed metrics, member actions, payment verification, commission and withdrawal review, course/module/class authoring, event management, community moderation, service requests, reports, settings and audit logs.
- Admin communications workspace with reusable templates, immediate or scheduled in-app announcements, and optional email delivery through a server-side Resend API key.
- MongoDB-backed service enquiries, member requests, community, events and other platform records.

No fake member counts, testimonials, partners, trips, registration numbers, certificates or social accounts are included. Company registration and legal text remain clearly marked as pending. Membership registration is available for local development; production registration is disabled by default until explicitly enabled after policy review.

## Environment setup

Requirements: Node.js 20+ and a MongoDB deployment configured as a replica set (MongoDB Atlas works). MongoDB transactions are used when confirming payments and writing commission entries.

The workspace includes `backend/.env` and `frontend/.env` with empty credential placeholders. Fill these before using backend features:

```dotenv
# backend/.env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
MONGODB_URI=
JWT_SECRET=
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
MEMBERSHIP_FEE_KES=5000
REGISTRATION_ENABLED=

MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
MPESA_PAYBILL=
EMAIL_API_KEY=
EMAIL_FROM=
```

Set `MONGODB_URI` to the MongoDB connection string and set `JWT_SECRET` to a randomly generated value of at least 32 characters. Set the first administrator email and a password of at least 12 characters, then create the account:

```sh
npm run seed:admin --prefix backend
```

For Daraja, configure the server-side credentials and a publicly reachable HTTPS callback URL ending in `/api/v1/payments/mpesa/callback`. The callback host must be reachable by Safaricom; localhost is not sufficient. Use sandbox values for development. The manual Paybill option appears only when a Paybill value is configured.

`REGISTRATION_ENABLED` defaults to enabled in development and disabled in production. Enable it in production only after the company supplies and approves public Terms, Privacy, Membership and Referral policy copy.

## Install and run

```sh
npm install
npm install --prefix frontend
npm install --prefix backend
npm run dev
```

The public frontend runs at `http://localhost:5173`, and the versioned API runs at `http://localhost:4000/api/v1`. The API health endpoint is `/api/v1/health`. When MongoDB is not configured, the public website still starts, while database-backed API routes report that the database needs configuration.

Build the frontend with `npm run build`. Run only one service with `npm run dev:frontend` or `npm run dev:backend`.

## Initial content and pricing

The public story follows the Founder’s Blueprint Modules 1–10: technology and digital solutions; travel and lifestyle; and entrepreneurship and business development. Rates displayed on service pages are indicative values from the supplied 2026 Service Pricing Guide. Final pricing depends on the agreed scope. The supplied NDA and draft service and partnership agreements are not published as final legal policy pages.

The logo and founder portrait came from the supplied folder. Editorial photography now uses Pexels-hosted imagery featuring Black African professionals for the business and learning sections; the travel section uses Kenyan landscape photography. Review image selection and licensing, then move approved, optimized assets into `frontend/public/images/` before production.

## Remaining launch inputs

- MongoDB deployment URI and production JWT secret.
- Safaricom Daraja credentials, shortcode, passkey, callback URL and live Paybill.
- Approved public legal policies and company registration certificate.
- Official contact channels, social profiles, partners, portfolio examples, testimonials, confirmed events and trip/gallery content.
- Resend email provider key and verified sender address for email announcements. In-app announcements work without these credentials.
- Production file storage if uploads are required.

See [content source notes](docs/CONTENT-SOURCE-NOTES.md) for the source-to-page mapping.
# wabwire
# wabwire

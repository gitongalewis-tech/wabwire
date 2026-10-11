# Wabwire Global Innovations Ltd

A React and Express platform for Wabwire Global Innovations, built around the three divisions in the supplied Founder’s Blueprint: technology and digital solutions, travel and lifestyle, and entrepreneurship and business development.

## Project layout

- `frontend/` — React, Vite, public pages, authentication screens, and member/admin portals.
- `backend/` — Express API, MongoDB models, authentication, membership and payment workflows.
- `docs/CONTENT-SOURCE-NOTES.md` — source document to page mapping.

## Requirements

- Node.js 20 or newer.
- A MongoDB Atlas deployment (or another MongoDB replica set). Payment activation uses MongoDB transactions.

## Configure the backend

From the repository root, copy `backend/.env.example` to `backend/.env`. Fill in the database URI and a unique JWT secret of at least 32 characters. `backend/.env` is ignored by Git. The configured first administrator is `adelewigitz@gmail.com`; set a private password for that account in `SUPER_ADMIN_PASSWORD`.

```dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<unique-random-secret-of-at-least-32-characters>
SUPER_ADMIN_EMAIL=adelewigitz@gmail.com
SUPER_ADMIN_PASSWORD=<private-password-of-at-least-12-characters>
MEMBERSHIP_FEE_KES=5000
REGISTRATION_ENABLED=true
ALLOW_TEST_MEMBERSHIP=true
```

Then, from the repository root, create or reset the administrator account: `npm run seed:admin --prefix backend`.

For local review before payment setup, set `ALLOW_TEST_MEMBERSHIP=true` in `backend/.env` and `VITE_ALLOW_TEST_MEMBERSHIP=true` in `frontend/.env.local`. This grants pending members dashboard access without recording a payment. The backend disables the bypass when `NODE_ENV=production`; restart both local servers after changing these values and keep the switches false in production.

M-Pesa sandbox credentials can be configured in the backend environment; set `MPESA_ENVIRONMENT=sandbox` and use the public HTTPS callback URL. Resend sends transactional mail for account verification, password resets, referrals, verified payments, admin membership activation, published events, and administrator campaigns. The test sender `onboarding@resend.dev` can be used during development; use a verified Wabwire sending domain and set `EMAIL_FROM` to that domain before public launch.

## Deploy as separate Vercel projects

The frontend and backend are deployed as separate Vercel projects. Production URLs: frontend `https://frontend-gilt-eight-80.vercel.app`; backend `https://wabwire-backend.vercel.app`. Browser API requests use the frontend's same-origin `/api/v1` proxy to keep the authentication cookie first-party; the proxy forwards requests to the backend. Keep `CLIENT_ORIGIN=https://frontend-gilt-eight-80.vercel.app` and `PUBLIC_SITE_URL=https://frontend-gilt-eight-80.vercel.app` in the backend environment. Its M-Pesa callback is `https://wabwire-backend.vercel.app/api/v1/payments/mpesa/callback`.

The backend connects to MongoDB on demand and reuses the connection between warm function invocations. The cron in `backend/vercel.json` dispatches due communications daily at 04:00 UTC (07:00 East Africa Time). Keep secrets in Vercel's backend environment settings only. Never add them to `frontend` variables or commit `.env` files.

Deploy with Vercel CLI from each service directory: `vercel --prod --cwd backend` and `vercel --prod --cwd frontend`. Set production environment variables with `vercel env add`; redeploy after changing environment values. Frontend build artifacts are served from Vite's `dist/` output directory.

## Install dependencies

Install and run each service in its own terminal.

Terminal 1 — backend:

```sh
cd backend
npm ci
npm run dev
```

Terminal 2 — frontend:

```sh
cd frontend
npm ci
npm run dev
```

The Vite site runs at `http://localhost:5173`; the API runs at `http://localhost:4000/api/v1`. Check backend status at `http://localhost:4000/api/v1/health`. The frontend reads `VITE_API_URL` if set; otherwise, it uses the local API URL above. To use separate hostnames, set `CLIENT_ORIGIN` in the backend and `VITE_API_URL` in the frontend environment accordingly.

Build the frontend from `frontend/` with `npm run build`. Start the backend for production from `backend/` with `npm start`.

## Content and launch notes

Public service descriptions and indicative 2026 pricing follow the supplied Founder’s Blueprint and pricing guide. The supplied NDA, service agreement, and partnership agreement are drafts, so the site does not present them as approved public policies. Registration, privacy, and membership policies need company-approved public copy before production registration is enabled. Unconfirmed company records, contact channels, testimonials, partners, events, and portfolio work are not invented.

See `docs/CONTENT-SOURCE-NOTES.md` for the source-to-page mapping.

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

M-Pesa and email credentials are optional. Configure Daraja in the backend environment when ready; its callback URL must be publicly reachable over HTTPS. Resend is not yet enabled: add its API key and a verified sender when email setup begins. In-app communications are available without email credentials.

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

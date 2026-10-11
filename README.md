# Wabwire Global Innovations

Web platform for Wabwire Global Innovations. It includes public company and service pages, member and administration portals, an Express API, and MongoDB-backed membership, learning, referral, event, communications, and payment workflows.

## Repository layout

- `frontend/` — React and Vite application.
- `backend/` — Express API and MongoDB integration.
- `docs/CONTENT-SOURCE-NOTES.md` — mapping from supplied source documents to public pages.
- `PROJECT_AUDIT.md` — implementation and endpoint review.
- `resend.txt` — Resend setup guide.
- `HOSTING_OPTIONS.md` — hosting comparison.

## Requirements

- Node.js 20 or newer.
- MongoDB Atlas or another MongoDB replica set. Payment approval uses MongoDB transactions.

## Run locally

Keep backend and frontend configuration in ignored local environment files or a secret manager. This repository intentionally contains no environment templates or credential values. Do not commit local environment files or paste secrets into source code, documentation, or frontend variables.

Install and run the backend in one terminal:

```sh
cd backend
npm ci
npm run dev
```

Install and run the frontend in a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:4000/api/v1`. The API health endpoint is `/api/v1/health`. Configure the first administrator privately, then run `npm run seed:admin` from `backend/` if an administrator account needs to be created or reset.

For local review before payment configuration, the optional test membership bypass can be enabled in both local services. The backend disables that bypass in production. Registration and member dashboard access continue to follow email verification and membership rules.

## Deployment

The frontend and backend are separate Vercel projects:

- Frontend: <https://frontend-gilt-eight-80.vercel.app>
- Backend: <https://wabwire-backend.vercel.app>

Production browser requests use the frontend's same-origin API proxy. This lets browsers retain the secure authentication cookie across refreshes. The backend uses a daily scheduled job for communications. Configure database, authentication, payment, email, origin, and cron settings only in the backend's private deployment environment. Use a verified sending domain for Resend client email.

Deploy each project from its own directory with the Vercel CLI. Build the frontend with `npm run build` from `frontend/`; start the backend with `npm start` from `backend/`.

## Content notes

Public service descriptions and indicative pricing follow the supplied Founder’s Blueprint and pricing guide. The supplied NDA, service agreement, and partnership agreement are drafts and are not presented as approved public policies. Company registration records and final legal wording should be supplied and approved before publication.

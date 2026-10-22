# Wabwire Global Innovations

**Website:** [https://www.wabwireglobalinnovations.com](https://www.wabwireglobalinnovations.com)

Wabwire Global Innovations Ltd is a Kenyan software and digital solutions company. This repository contains the public company website and member platform, the administration portal, and the API that supports accounts, enquiries, learning, events, referrals, email and payments.

## Project structure

- `frontend/` — React and Vite website, member experience, admin interface, SEO metadata, sitemap and robots rules.
- `backend/` — Express API, MongoDB models, authentication, Resend email delivery and Daraja payment workflows.
- `docs/` — current handover and security notes, plus supplied company source materials in `source-materials/`.
- `frontend/public/images/` — website and email brand assets, including the About page founder portrait.

## Local development

Requirements: Node.js 20 or newer and a MongoDB deployment that supports transactions. Configure private environment variables in ignored local env files or a secret manager. Do not commit credentials or production data.

```sh
cd backend
npm ci
npm run dev
```

In a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

The Vite app is available at `http://localhost:5173`; the API runs at `http://localhost:4000/api/v1`. The API health route is `/api/v1/health`.

Build the frontend with `npm run build` from `frontend/`. Start the API with `npm start` from `backend/`.

## Production architecture

The public site is served at `https://www.wabwireglobalinnovations.com`. The React frontend and Express API are deployed as separate Vercel projects; the frontend proxies API requests to the backend so secure session cookies remain same-origin in the browser. Production secrets belong only in the backend Vercel project's encrypted environment settings.

Email is sent by the backend through Resend using the verified Wabwire sending domain. Payment workflows use Safaricom Daraja; the current deployment is configured for sandbox testing. See [the payment handover](docs/MPESA-HANDOVER.md) for sandbox status, callback routes, required payout credentials and production cutover steps.

## Handover status

The application code and deployed website/API are ready for operational handover. The remaining launch work is payment configuration and sign-off: complete the missing Daraja payout credentials and receiving-account details, validate callbacks end to end in sandbox, and only then enter approved production credentials. Do not enable production payouts before Safaricom approval and successful reconciliation tests.

See [the security review](docs/SECURITY-REVIEW.md) for safeguards and operational follow-ups. Supplied agreements and training/pricing PDFs are retained in `docs/source-materials/`; draft agreements are not approved public legal policies.

# Project implementation audit

## Supplied documents and site coverage

- Founder and company profile material informs the About page, founder message, purpose, vision and mission.
- The 10 Founder’s Blueprint modules inform the three public divisions (technology and digital, travel and lifestyle, entrepreneurship and business development), values, audience, business model, marketing approach and enquiry-led customer journey.
- The 2026 pricing guide is represented by the digital, marketing, creative, travel, training, consulting, technology consulting, business support/research and monthly retainer pages. Amounts are labelled indicative; government charges and ad spend exclusions are stated where the guide specifies them.
- Draft NDA, partnership and service agreements are not published as legal terms because they contain incomplete party/contact details. Public legal policies still need the company’s approved wording.
- Registration certificates and verified company address/contact records were not supplied; the site does not invent them.

## API surface reviewed

The frontend service calls were compared against the Express route groups. The application currently exposes:

- Authentication and account recovery: register, login, verify/resend email, forgot/reset password, current session, password change and logout.
- Membership payments: configuration, STK/manual submission, payment history, Daraja callback and admin verification/rejection.
- Member and admin dashboards, reports, user/member administration, referral network/chat, commissions, withdrawals and leaderboard.
- Courses, enrollments, lesson completion, certificates and classes; published events, registration and attendance administration.
- Community posts, moderation and chat; member service requests; public enquiries and admin enquiry handling; notifications, settings, communications and audit logs.
- Scheduled communications worker at `/api/v1/cron/communications` (requires `CRON_SECRET`).

Protected routes require the session cookie and role/membership appropriate to the operation. Public write routes validate payloads and apply rate limits where appropriate. Dynamic MongoDB filters are validated before use.

## Email and reminder behavior

- Enquiries are stored even if the acknowledgement provider fails. Each record now stores sent/failed state and the provider error; admins can see it in Requests & Enquiries.
- Email is sent through Resend from the backend only. Production must use `EMAIL_FROM` on a verified Resend domain. Resend's `onboarding@resend.dev` test sender does not allow arbitrary client recipients, so a verified Wabwire sending domain is required for real client delivery.
- Publishing an event or class sends an immediate announcement and schedules a reminder for 24 hours before its start. A daily Vercel cron processes due reminders at 07:00 East Africa Time. Reminders go to active members. The email provider must be configured for email delivery; otherwise in-app notifications continue and campaign status records the failure/configuration state.
- Existing upcoming programmes were backfilled once from MongoDB; this queued the October 20 launch event reminder. Run `npm run schedule:programs` from `backend/` after importing any other existing future programmes.

## Deployment configuration required

Set the backend's private `EMAIL_API_KEY`, `EMAIL_FROM` (verified Wabwire sender), `PUBLIC_SITE_URL`, and `CRON_SECRET` in Vercel. Keep all provider and database credentials out of the frontend and source tree. The application build and backend syntax were checked after these changes.

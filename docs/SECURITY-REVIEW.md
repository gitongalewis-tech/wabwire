# Security review and remediations

Reviewed on **22 October 2026**. This is a source-code and dependency review,
not a penetration test or guarantee that every vulnerability has been found.

## Fixed in this review

- Validated admin list filters against explicit status enums instead of passing
  arbitrary query values into MongoDB selectors. This blocks NoSQL operator
  injection via values such as `status[$ne]=...` on users, payments,
  commissions, withdrawals, and service requests.
- Added strict positive integer validation and bounded pagination. Invalid,
  nested, or excessively large `page`/`limit` parameters now return a client
  error rather than reaching MongoDB as invalid skip/limit values.
- Validated the admin member search as a bounded string before building the
  escaped regular expressions. Search text is treated literally.
- Checked M-Pesa `CheckoutRequestID` type, length, and allowed characters before
  using it in a database lookup. Callback result codes are numeric and the
  metadata container must be an array. Membership activation still depends on
  the server-side Daraja status query and amount/receipt/phone checks.
- Added a general API request limit while keeping stricter auth/payment limits;
  provider callbacks and the health check are excluded from the general limit.
- Enforced a strict Zod schema for public enquiries, including text, email,
  phone, and service validation, before creating a document.
- Replaced the admin course editor's `z.any()` module validation with strict,
  bounded schemas for course modules and lessons, preventing arbitrary nested
  objects from being written into course records.
- Verified `.env` files are ignored and no secret-bearing environment file is
  tracked in Git. Keep production keys out of frontend variables.
- Added a version counter to signed sessions so password changes, password
  resets, and administrator suspensions invalidate existing login tokens.
- Restricted administrator member-list queries to the fields used in the UI;
  legacy profile-photo data is excluded from regular MongoDB queries.
- Added a Content Security Policy to the Vercel frontend response headers for
  scripts, styles, images, fonts, API requests, frames, and form targets.

## Other safeguards confirmed in the current code

- Mongoose is used; the identified injection risks were NoSQL selector risks,
  not SQL injection. Route bodies are generally parsed with Zod schemas, and
  MongoDB updates should continue to use allowlisted fields rather than raw
  request objects.
- Authentication uses bcrypt password hashes, signed auth tokens in
  HttpOnly/SameSite cookies, role checks, helmet headers, CORS origin checks,
  and a bounded JSON request body.
- Payment activation requires a verified provider response or administrator
  review; the public callback alone does not mark a payment as paid.

## Items to address before production

- Production dependency audit: `npm audit --omit=dev` completed in both
  backend and frontend on 22 October 2026; npm reported zero vulnerabilities
  in production dependencies. The last full audit including development
  dependencies was run on 11 October 2026 and reported zero vulnerabilities.
- Verify that production `JWT_SECRET` is a long random value, rotate any key
  that has ever been shared, and enable MFA on hosting, MongoDB, and Resend.
- Restrict MongoDB Atlas network access and use a database user with only the
  access required by this app. Back up data and rehearse a restore.
- Confirm the business purpose, retention period, access controls, and approved
  privacy notice for registration data, especially dates of birth and ID or
  passport numbers, before continuing to collect it in production.
- Put M-Pesa callback endpoints behind provider-supported authenticity checks
  where available; retain the existing server-to-server transaction query.
- Add automated security regression coverage for nested query parameters,
  admin-only routes, login limits, payment callbacks, and cross-account access.
- Replace the in-memory rate-limit stores with a shared store before traffic
  scales across multiple Vercel function instances; the current limits are
  best-effort across those instances.
- Revisit chat/message rate limits, CSRF strategy if auth cookie settings
  change, audit-log retention, email consent/unsubscribe, and log redaction
  before production launch.

## Review limitations

The check covers the application source and configuration in this repository.
It does not inspect the live hosting environment, MongoDB Atlas network rules,
external account security, or provider dashboards. Do not treat passing npm
dependency checks as a substitute for a production security assessment.

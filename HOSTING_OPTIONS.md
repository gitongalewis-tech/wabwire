# Wabwire hosting comparison

Prices and plan details checked on **11 October 2026**. Provider prices can
change, are shown in USD unless stated otherwise, and may exclude tax. MongoDB
Atlas remains a separate service/account and is not included below. The
frontend is a Vite/React static build; the backend is an Express API, so the
hosting plan must run both (either as separate services or on one VPS).

## Options

| Provider | Approximate cost | Fit for Wabwire | Main tradeoff |
|---|---:|---|---|
| **Hostinger VPS KVM 1** | $6.49/month introductory rate with a 2-year upfront term; shown renewal is $11.99/month for 2 years. 1 vCPU, 4 GB RAM, 50 GB NVMe. | Lowest predictable all-in server option here. Host frontend and API on one VPS behind a reverse proxy; Hostinger currently advertises a free domain for the first year on its VPS plans. | You manage Linux updates, firewall, Node process manager, reverse proxy, TLS, backups, and deploys. Intro price requires upfront payment; check the checkout total, renewal term, and eligible domain extension. |
| **Railway Hobby** | $5/month minimum subscription, including $5/month of resource usage; usage over that amount costs extra. | Convenient Git deploys for separate frontend and API services; useful if you want less server administration. | Final cost depends on compute, memory, storage, and outbound traffic. Buy a domain separately. |
| **Render** | Static frontend can be free. Free backend is also available for testing, but sleeps after 15 minutes without traffic. A paid backend compute plan costs extra (the small paid instance has commonly been listed around $7/month; confirm current dashboard pricing). | Simple separate static-site and Express API setup, custom-domain support, deploys from Git. | Free API has a cold start of about a minute and is explicitly not recommended for production. A dependable always-on backend needs paid compute. |
| **Vercel Pro + separate API** | Vercel Pro is $20/month and includes $20 usage credit. Add backend hosting (for example Railway from $5/month minimum or paid Render) and domain registration. | Excellent React/Vite frontend experience, CDN, previews and workflow; custom domain can be attached. | Pro alone does not buy you a registered domain or host the MongoDB service. You pay for API hosting separately and may incur usage beyond the included Vercel credit. Vercel Hobby is for personal, non-commercial use, so Wabwire should use Pro if operated commercially. |

## Does paid Vercel include a domain?

Vercel Pro advertises a “free custom domain,” meaning the project can use a
custom domain. A deployment also receives a free `*.vercel.app` address. A
brand domain such as `wabwire.com` is registered separately and costs the
registrar's price; Vercel says its registration price matches registrar
pricing. So Pro does **not** automatically give Wabwire a paid, registered
domain at no cost. Hostinger's VPS listing currently advertises a free domain
for one year, subject to the eligible extension and purchase terms.

## Recommendation

For the lowest ongoing bill and one server to manage, start with **Hostinger
KVM 1** if you are comfortable maintaining a Linux server. Its 4 GB RAM is
adequate for a small React static site plus a modest Express API, while MongoDB
stays on Atlas. Use a reverse proxy (Nginx or Caddy), HTTPS, a process manager,
firewall rules, and scheduled backups. Confirm the exact checkout and renewal
price before paying.

If you prefer managed deploys over server administration, a low-traffic test
stack can use Render's static site plus free API, but the sleeping API makes it
unsuitable for a smooth member experience. For an always-on API, compare
Railway's usage-based bill against paid Render at the time of purchase.

Choose **Vercel Pro** if polished frontend previews/CDN and team workflow are
worth the higher total cost. Use Vercel for the frontend and Railway or Render
for the Express API; set the frontend's `VITE_API_URL` to the deployed API and
set the backend `CLIENT_ORIGIN` to the frontend domain. Register a domain
separately (or use Hostinger's qualifying first-year domain offer). For this
project's budget-first launch, Vercel is not the cheapest end-to-end choice.

## Deployment checklist

- Deploy frontend and backend as separate services/projects, as requested.
- Set the frontend API URL to the backend HTTPS URL.
- Set backend `CLIENT_ORIGIN` and `PUBLIC_SITE_URL` to the real frontend domain.
- Put MongoDB, JWT, M-Pesa and Resend settings only in backend secret variables.
- Keep MongoDB Atlas network access restricted to the provider's supported
  egress addresses where practical; avoid broad `0.0.0.0/0` access for a
  production database.
- Enable HTTPS, configure health checks, set usage/budget alerts, and verify
  database backups and restore procedure before accepting real payments.

## Provider references

- [Hostinger VPS plans and renewal prices](https://www.hostinger.com/vps-hosting)
- [Hostinger Node.js deployment options](https://www.hostinger.com/support/node-js-hosting-options/)
- [Railway plan pricing and included usage](https://docs.railway.com/pricing/plans)
- [Render pricing](https://render.com/pricing)
- [Render free service limitations](https://render.com/docs/free)
- [Vercel pricing](https://vercel.com/pricing)
- [Vercel usage pricing](https://vercel.com/docs/pricing)
- [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains)
- [Vercel domain registration prices](https://vercel.com/domains/pricing)
- [Vercel Hobby usage rules](https://vercel.com/docs/plans/hobby)

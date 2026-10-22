# M-Pesa handover

## Current state

- Vercel production is configured to use Daraja **sandbox**.
- The STK callback is `https://wabwire-backend.vercel.app/api/v1/payments/mpesa/callback`.
- B2C result and timeout callbacks are configured at `/api/v1/withdrawals/mpesa/b2c-result` and `/api/v1/withdrawals/mpesa/b2c-timeout` on the backend alias.
- The production payout switch `MPESA_ALLOW_PRODUCTION_PAYOUTS` is set to `false`.
- Sandbox OAuth authentication and a KES 10 STK request to Safaricom's published sandbox test number were accepted. No live payment was made.

## Payment behavior

- Membership payments accept KES 1–250,000 per payment. Verified installments are summed; member access, referrals, and member-only classes unlock when the verified total reaches the administrator-configured membership activation threshold.
- Manual Paybill receipts remain pending until an administrator verifies each receipt. A receipt cannot be reused.
- Service requests need an administrator quote before payment appears in the member dashboard. Members can pay the quoted balance in installments by STK Push.
- A withdrawal must be approved first. Daraja's result callback, rather than an admin button, marks a payout as paid.

## Remaining sandbox payout credentials

The account has STK credentials configured, but the backend currently has no B2C initiator credentials, so B2C transfers cannot be submitted yet. Add these as **Production** environment variables on the `wabwire-backend` Vercel project using the sandbox values from the Daraja B2C test credentials page:

- `MPESA_INITIATOR_NAME`
- `MPESA_SECURITY_CREDENTIAL` (the encrypted initiator credential)
- `MPESA_B2C_SHORTCODE` (optional in sandbox if `MPESA_SHORTCODE` is the sandbox B2C shortcode)
- `MPESA_B2C_COMMAND_ID` (optional; defaults to `BusinessPayment`)

After adding credentials, redeploy and submit a small approved test withdrawal using the sandbox test recipient. Confirm the callback changes the withdrawal to `PAID` and stores the Daraja transaction receipt. A callback timeout returns the withdrawal to `APPROVED`; reconcile the Daraja transaction status before retrying to prevent a duplicate transfer.

## Production cutover

Do not switch these settings until Safaricom has approved live credentials and sandbox callbacks have been validated end to end. Safaricom requires a B2C/bulk-disbursement account or an eligible converted account for production payouts.

1. Add the production STK credentials and approved B2C shortcode/initiator credentials in Vercel.
2. Set `MPESA_ENVIRONMENT=production` and keep `MPESA_ALLOW_PRODUCTION_PAYOUTS=false` while validating incoming payments.
3. Once incoming production payments and callbacks are verified, deliberately set `MPESA_ALLOW_PRODUCTION_PAYOUTS=true` to enable live member payouts.
4. Keep callback URLs on the stable backend alias and test them after each deployment.

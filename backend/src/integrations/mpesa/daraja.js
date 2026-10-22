const apiBase = () => process.env.MPESA_ENVIRONMENT === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'

export async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY
  const secret = process.env.MPESA_CONSUMER_SECRET
  if (!key || !secret) throw new Error('M-Pesa credentials are not configured.')
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64')
  const response = await fetch(`${apiBase()}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${credentials}` } })
  const data = await response.json()
  if (!response.ok || !data.access_token) throw new Error(data.errorMessage || 'Could not authenticate with M-Pesa.')
  return data.access_token
}

export function normalizeKenyanPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  if (/^254[17]\d{8}$/.test(digits)) return digits
  return null
}

export async function initiateStkPush({ phone, amount, accountReference, description }) {
  const required = ['MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL']
  if (required.some(name => !process.env[name])) throw new Error('M-Pesa shortcode, passkey and callback URL must be configured before STK Push is available.')
  const token = await getAccessToken()
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64')
  const response = await fetch(`${apiBase()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: process.env.MPESA_SHORTCODE, Password: password, Timestamp: timestamp, TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline', Amount: Math.ceil(amount), PartyA: phone, PartyB: process.env.MPESA_SHORTCODE, PhoneNumber: phone, CallBackURL: process.env.MPESA_CALLBACK_URL, AccountReference: accountReference.slice(0, 12), TransactionDesc: description.slice(0, 13) }),
  })
  const data = await response.json()
  if (!response.ok || data.ResponseCode !== '0') throw new Error(data.errorMessage || data.ResponseDescription || 'M-Pesa could not start the payment request.')
  return data
}

export async function queryStkPush(checkoutRequestId) {
  if (!process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY) throw new Error('M-Pesa shortcode and passkey are not configured.')
  const token = await getAccessToken()
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64')
  const response = await fetch(`${apiBase()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: process.env.MPESA_SHORTCODE, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId }),
  })
  const data = await response.json()
  if (!response.ok || data.ResponseCode !== '0') throw new Error(data.errorMessage || data.ResponseDescription || 'M-Pesa could not verify the payment status.')
  return data
}

export async function initiateB2CPayment({ phone, amount, reference }) {
  const required = ['MPESA_INITIATOR_NAME', 'MPESA_SECURITY_CREDENTIAL', 'MPESA_B2C_RESULT_URL', 'MPESA_B2C_TIMEOUT_URL']
  if (required.some(name => !process.env[name])) throw new Error('Daraja B2C payout credentials and callback URLs are not fully configured.')
  const token = await getAccessToken()
  const originatorConversationId = `WB${Date.now()}${Math.random().toString(36).slice(2, 9)}`
  const response = await fetch(`${apiBase()}/mpesa/b2c/v3/paymentrequest`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ OriginatorConversationID: originatorConversationId, InitiatorName: process.env.MPESA_INITIATOR_NAME, SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL, CommandID: process.env.MPESA_B2C_COMMAND_ID || 'BusinessPayment', Amount: Math.ceil(amount), PartyA: process.env.MPESA_B2C_SHORTCODE || process.env.MPESA_SHORTCODE, PartyB: phone, Remarks: `Wabwire ${reference}`.slice(0, 100), QueueTimeOutURL: process.env.MPESA_B2C_TIMEOUT_URL, ResultURL: process.env.MPESA_B2C_RESULT_URL, Occassion: 'Member commission payout' }),
  })
  const data = await response.json()
  if (!response.ok || data.ResponseCode !== '0') throw new Error(data.errorMessage || data.ResponseDescription || 'Daraja could not queue the payout.')
  return { ...data, originatorConversationId }
}

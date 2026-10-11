import { Resend } from 'resend'

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const siteUrl = () => (process.env.PUBLIC_SITE_URL || 'http://localhost:5173').replace(/\/$/, '')
let resend

function client() {
  const key = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY
  if (!key) return null
  if (!resend) resend = new Resend(key)
  return resend
}

export async function sendEmail({ to, subject, html, text }) {
  const provider = client()
  const from = process.env.EMAIL_FROM || (process.env.NODE_ENV === 'production' ? '' : 'Wabwire Global Innovations <onboarding@resend.dev>')
  if (!provider) return { sent: false, reason: 'Email provider is not configured.' }
  if (!from) return { sent: false, reason: 'Production sender is not configured. Set EMAIL_FROM to an address on a verified Resend domain.' }
  if (!to || !subject || (!html && !text)) return { sent: false, reason: 'Email message is incomplete.' }
  const { data, error } = await provider.emails.send({ from, to: Array.isArray(to) ? to : [to], subject, html, text })
  if (error) throw new Error(`Email provider rejected the message: ${error.message}`)
  return { sent: true, id: data?.id }
}

function template(title, body, actionLabel, actionUrl, footer = '') {
  const action = actionUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#b58a2a;color:#fff;padding:14px 20px;text-decoration:none;border-radius:6px;font-weight:700">${escapeHtml(actionLabel)}</a></p><p>If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(actionUrl)}">${escapeHtml(actionUrl)}</a></p>` : ''
  return `<!doctype html><html><body style="margin:0;background:#f4f2ec;font-family:Arial,sans-serif;color:#162039"><main style="max-width:600px;margin:28px auto;padding:34px;background:#fff;border-radius:12px"><p style="color:#b58a2a;font-weight:700;letter-spacing:.12em">WABWIRE GLOBAL INNOVATIONS</p><h1 style="font-size:25px">${escapeHtml(title)}</h1><div style="font-size:16px;line-height:1.7">${body}</div>${action}${footer ? `<p style="color:#70798a;font-size:13px">${escapeHtml(footer)}</p>` : ''}<p style="border-top:1px solid #e5e7eb;padding-top:16px;color:#70798a;font-size:13px">Wabwire Global Innovations</p></main></body></html>`
}

export async function sendVerificationEmail(user, token) {
  const url = `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`
  return sendEmail({ to: user.email, subject: 'Verify your Wabwire email address', html: template('Confirm your email', `<p>Hello ${escapeHtml(user.fullName)},</p><p>Confirm your email address to finish setting up your Wabwire account.</p>`, 'Verify email address', url, 'This link expires in 24 hours. If you did not create this account, you can ignore this message.'), text: `Hello ${user.fullName}, verify your Wabwire account: ${url}\nThis link expires in 24 hours.` })
}

export async function sendPasswordResetEmail(user, token) {
  const url = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`
  return sendEmail({ to: user.email, subject: 'Reset your Wabwire password', html: template('Reset your password', `<p>Hello ${escapeHtml(user.fullName)},</p><p>We received a request to reset your Wabwire password.</p>`, 'Choose a new password', url, 'This link expires in 30 minutes. If you did not request a reset, ignore this email; your password will remain unchanged.'), text: `Hello ${user.fullName}, reset your Wabwire password: ${url}\nThis link expires in 30 minutes.` })
}

export async function sendWelcomeEmail(user) {
  return sendEmail({ to: user.email, subject: 'Welcome to Wabwire Global Innovations', html: template('Welcome to Wabwire', `<p>Hello ${escapeHtml(user.fullName)},</p><p>Your email is confirmed and your Wabwire account is ready. You can now continue with membership activation and explore learning, business and community opportunities.</p>`, 'Sign in to Wabwire', `${siteUrl()}/login`), text: `Welcome to Wabwire, ${user.fullName}. Your email is confirmed. Sign in at ${siteUrl()}/login` })
}

export async function sendReferralEmail(referrer, newMember) {
  return sendEmail({ to: referrer.email, subject: 'Someone joined Wabwire using your referral link', html: template('A new person joined your network', `<p>Hello ${escapeHtml(referrer.fullName)},</p><p><strong>${escapeHtml(newMember.fullName)}</strong> created a Wabwire account using your referral link. Their membership will appear in your network once their account is verified.</p>`, 'View your network', `${siteUrl()}/dashboard/network`), text: `${newMember.fullName} joined Wabwire using your referral link. View your network: ${siteUrl()}/dashboard/network` })
}

export async function sendPaymentConfirmedEmail(user, payment) {
  return sendEmail({ to: user.email, subject: 'Wabwire membership payment confirmed', html: template('Payment received', `<p>Hello ${escapeHtml(user.fullName)},</p><p>Your membership payment of <strong>KES ${Number(payment.amount).toLocaleString('en-KE')}</strong> has been verified. Your member access is now active.</p>${payment.mpesaReceiptNumber ? `<p>M-Pesa receipt: <strong>${escapeHtml(payment.mpesaReceiptNumber)}</strong></p>` : ''}`, 'Open your member dashboard', `${siteUrl()}/dashboard`), text: `Your Wabwire membership payment of KES ${Number(payment.amount).toLocaleString('en-KE')} was verified. Your member access is active.` })
}

export async function sendMembershipActivatedEmail(user) {
  return sendEmail({ to: user.email, subject: 'Your Wabwire membership is active', html: template('Membership activated', `<p>Hello ${escapeHtml(user.fullName)},</p><p>An administrator has activated your Wabwire member access. You can now sign in and open your dashboard.</p>`, 'Open your member dashboard', `${siteUrl()}/dashboard`), text: `Hello ${user.fullName}, your Wabwire membership has been activated. Sign in at ${siteUrl()}/login` })
}

export async function sendEnquiryReceivedEmail(enquiry) {
  const body = `<p>Hello ${escapeHtml(enquiry.name)},</p><p>Thank you for contacting Wabwire Global Innovations about <strong>${escapeHtml(enquiry.service)}</strong>.</p><p>We have received your enquiry and a member of our team will contact you soon.</p><p style="padding:14px;background:#f7f5ef;border-left:3px solid #b58a2a">${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}</p>`
  return sendEmail({
    to: enquiry.email,
    subject: 'We received your enquiry · Wabwire Global Innovations',
    html: template('Your enquiry is with us', body, 'Visit Wabwire', siteUrl(), 'This is an automatic confirmation. Please reply to this email if you need to add information.'),
    text: `Hello ${enquiry.name}, thank you for contacting Wabwire Global Innovations about ${enquiry.service}. We have received your enquiry and our team will contact you soon.\n\nYour message: ${enquiry.message}`,
  })
}

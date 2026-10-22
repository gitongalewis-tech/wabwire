import { Resend } from 'resend'

const BRAND = 'Wabwire Global Innovations'
const COMPANY_DOMAIN = 'wabwireglobalinnovations.com'
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const siteUrl = () => (process.env.PUBLIC_SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://www.wabwireglobalinnovations.com' : 'http://localhost:5173')).replace(/\/$/, '')
const replyTo = () => process.env.EMAIL_REPLY_TO || `info@${COMPANY_DOMAIN}`
let resend

function client() {
  const key = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY
  if (!key) throw new Error('Resend is not configured. Set EMAIL_API_KEY in the backend environment.')
  if (!resend) resend = new Resend(key)
  return resend
}

function template(title, body, actionLabel = '', actionUrl = '', footer = '') {
  const action = actionUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#b08030;color:#fffaf0;padding:14px 20px;text-decoration:none;border-radius:6px;font-weight:700">${escapeHtml(actionLabel)}</a></p><p style="font-size:14px;color:#637084">If the button does not work, copy this link into your browser:<br><a style="color:#75531f" href="${escapeHtml(actionUrl)}">${escapeHtml(actionUrl)}</a></p>` : ''
  const logo = `${siteUrl()}/images/brand/logo-mark.jpg`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>${escapeHtml(title)} | ${BRAND}</title></head><body style="margin:0;background:#f5efe2;font-family:Arial,Helvetica,sans-serif;color:#071a38"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(title)} from ${BRAND}</div><main style="max-width:600px;margin:24px auto;padding:0 14px"><div style="background:#071a38;padding:15px 22px;border-radius:12px 12px 0 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="82" valign="middle" style="width:82px"><a href="${siteUrl()}" style="display:block;text-decoration:none"><img src="${escapeHtml(logo)}" alt="Wabwire Global Innovations logo" width="72" height="72" style="display:block;width:72px;height:72px;border:0;border-radius:8px"></a></td><td valign="middle" style="padding-left:14px"><a href="${siteUrl()}" style="color:#fff;text-decoration:none"><span style="display:block;font-size:27px;line-height:1.1;font-weight:800;letter-spacing:.08em">WABWIRE</span><span style="display:block;margin-top:6px;color:#e4c37d;font-size:12px;line-height:1.3;font-weight:700;letter-spacing:.2em">GLOBAL INNOVATIONS LTD</span></a></td></tr></table></div><section style="padding:30px 28px;background:#fffdf8;border:1px solid #e5d9c5;border-top:0;border-radius:0 0 12px 12px"><p style="margin:0 0 9px;color:#9a6d22;font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase">${BRAND}</p><h1 style="margin:0 0 18px;font-size:25px;line-height:1.3;color:#071a38">${escapeHtml(title)}</h1><div style="font-size:16px;line-height:1.7;color:#26334b">${body}</div>${action}${footer ? `<p style="margin-top:25px;color:#637084;font-size:13px;line-height:1.6">${escapeHtml(footer)}</p>` : ''}<div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5d9c5;color:#637084;font-size:12px;line-height:1.6"><strong style="color:#071a38">${BRAND}</strong><br><a style="color:#75531f" href="mailto:${replyTo()}">${replyTo()}</a> · <a style="color:#75531f" href="${siteUrl()}">wabwireglobalinnovations.com</a></div></section></main></body></html>`
}

export async function sendEmail({ to, subject, html, text, replyTo: messageReplyTo }) {
  const provider = client()
  const from = process.env.EMAIL_FROM || (process.env.NODE_ENV === 'production' ? '' : `${BRAND} <onboarding@resend.dev>`)
  if (!from) throw new Error('Production sender is not configured. Set EMAIL_FROM to an address on a verified Resend domain.')
  if (process.env.NODE_ENV === 'production' && !new RegExp(`@${COMPANY_DOMAIN.replaceAll('.', '\\.')}(?:>|$)`, 'i').test(from)) throw new Error(`Production email sender must use the verified ${COMPANY_DOMAIN} domain.`)
  if (!to || !subject || subject.length > 200 || /[\r\n]/.test(subject) || (!html && !text)) throw new Error('Email message is incomplete or invalid.')
  const testMode = process.env.EMAIL_TEST_MODE === 'true'
  const finalSubject = testMode ? `[TEST DELIVERY] ${subject}` : subject
  const testNotice = '<div style="margin:0 auto 16px;max-width:600px;padding:12px 16px;background:#fff1cf;border:1px solid #b08030;color:#513b16;font:14px Arial,sans-serif">Test message for email setup review. Any links or payment details shown are examples.</div>'
  const finalHtml = testMode && html ? html.replace(/<body([^>]*)>/i, `<body$1>${testNotice}`) : html
  const finalText = testMode ? `TEST DELIVERY — sample message; links and details are examples.\n\n${text || ''}` : text
  const { data, error } = await provider.emails.send({ from, to: Array.isArray(to) ? to : [to], subject: finalSubject, html: finalHtml, text: finalText, replyTo: messageReplyTo || replyTo() })
  if (error) throw new Error(`Email provider rejected the message: ${error.message}`)
  return { sent: true, id: data?.id }
}

export async function sendVerificationEmail(user, token) {
  const url = `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`
  return sendEmail({ to: user.email, subject: 'Verify your email to finish creating your Wabwire account', html: template('Confirm your email address', `<p>Hello ${escapeHtml(user.fullName)},</p><p>Thanks for registering with Wabwire. Confirm this email address to finish setting up your account.</p><p>This verification link expires in 24 hours.</p>` , 'Verify my email', url, 'If you did not create this account, you can ignore this email.'), text: `Hello ${user.fullName},\n\nThanks for registering with Wabwire. Confirm your email address to finish setting up your account:\n${url}\n\nThis link expires in 24 hours. If you did not create this account, ignore this email.` })
}

export async function sendPasswordResetEmail(user, token) {
  const url = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`
  return sendEmail({ to: user.email, subject: 'Reset your Wabwire password', html: template('Reset your password', `<p>Hello ${escapeHtml(user.fullName)},</p><p>We received a request to reset your Wabwire password.</p>`, 'Choose a new password', url, 'This link expires in 30 minutes. If you did not request a reset, ignore this email; your password will remain unchanged.'), text: `Hello ${user.fullName}, reset your Wabwire password: ${url}\nThis link expires in 30 minutes.` })
}

export async function sendWelcomeEmail(user) {
  const login = `${siteUrl()}/login`
  return sendEmail({ to: user.email, subject: 'Thanks for joining Wabwire Global Innovations', html: template('Welcome to Wabwire', `<p>Hello ${escapeHtml(user.fullName)},</p><p>Thanks for joining Wabwire Global Innovations. Your email address is confirmed and your account is ready.</p><p>You can now sign in to explore learning, events and member services. Membership access activates after payment is verified.</p>`, 'Sign in to Wabwire', login), text: `Hello ${user.fullName},\n\nThanks for joining Wabwire Global Innovations. Your email is confirmed and your account is ready. Membership access activates after payment is verified.\n\nSign in: ${login}` })
}

export async function sendReferralEmail(referrer, newMember) {
  const link = `${siteUrl()}/dashboard/network`
  return sendEmail({ to: referrer.email, subject: 'A new member joined through your Wabwire referral', html: template('Someone joined your network', `<p>Hello ${escapeHtml(referrer.fullName)},</p><p><strong>${escapeHtml(newMember.fullName)}</strong> created a Wabwire account using your referral link. Their membership will appear in your network after email verification.</p>`, 'View your network', link), text: `${newMember.fullName} joined Wabwire using your referral link. View your network: ${link}` })
}

export async function sendPaymentConfirmedEmail(user, payment) {
  const amount = Number(payment.amount).toLocaleString('en-KE')
  const method = payment.method === 'MPESA_STK' ? 'M-Pesa STK Push' : 'M-Pesa Paybill'
  const received = payment.transactionDate || payment.verifiedAt
  const details = `<div style="margin:18px 0;padding:16px;background:#f5efe2;border-left:3px solid #b08030"><p style="margin:0 0 6px"><strong>Amount paid:</strong> KES ${escapeHtml(amount)}</p><p style="margin:0 0 6px"><strong>Payment method:</strong> ${method}</p>${payment.mpesaReceiptNumber ? `<p style="margin:0 0 6px"><strong>M-Pesa receipt:</strong> ${escapeHtml(payment.mpesaReceiptNumber)}</p>` : ''}${received ? `<p style="margin:0 0 6px"><strong>Date received:</strong> ${escapeHtml(new Date(received).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }))}</p>` : ''}${payment.accountReference ? `<p style="margin:0"><strong>Account reference:</strong> ${escapeHtml(payment.accountReference)}</p>` : ''}</div>`
  const isService = payment.purpose === 'SERVICE'
  const membershipActive = !isService && user.membershipStatus === 'ACTIVE'
  const title = isService ? 'Your service payment is verified' : membershipActive ? 'Your membership payment is verified' : 'Your installment is recorded'
  const statusCopy = isService ? 'We have verified this payment toward your service request.' : membershipActive ? 'Your membership is fully paid and member access is active.' : 'We have verified this installment and added it to your membership payment record. Member access activates when the required total is reached.'
  const serviceDetails = isService && payment.serviceRequest?.service ? `<p><strong>Service:</strong> ${escapeHtml(payment.serviceRequest.service)}</p>` : ''
  const subject = isService ? `Service payment received: KES ${amount} · Wabwire` : `Payment received: KES ${amount} · Wabwire`
  return sendEmail({ to: user.email, subject, html: template(title, `<p>Hello ${escapeHtml(user.fullName)},</p><p>${statusCopy}</p>${serviceDetails}${details}`, 'Open your Wabwire account', `${siteUrl()}/dashboard`), text: `Hello ${user.fullName},\n\n${statusCopy}${isService && payment.serviceRequest?.service ? `\nService: ${payment.serviceRequest.service}` : ''}\nAmount: KES ${amount}\nMethod: ${method}${payment.mpesaReceiptNumber ? `\nM-Pesa receipt: ${payment.mpesaReceiptNumber}` : ''}${received ? `\nDate received: ${new Date(received).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}` : ''}${payment.accountReference ? `\nAccount reference: ${payment.accountReference}` : ''}\n\nWabwire account: ${siteUrl()}/dashboard` })
}

export async function sendMembershipActivatedEmail(user) {
  return sendEmail({ to: user.email, subject: 'Your Wabwire membership is active', html: template('Membership activated', `<p>Hello ${escapeHtml(user.fullName)},</p><p>An administrator has activated your Wabwire member access. You can now sign in and open your dashboard.</p>`, 'Open your member dashboard', `${siteUrl()}/dashboard`), text: `Hello ${user.fullName}, your Wabwire membership has been activated. Sign in at ${siteUrl()}/login` })
}

export async function sendEnquiryReceivedEmail(enquiry) {
  const body = `<p>Hello ${escapeHtml(enquiry.name)},</p><p>Thank you for contacting Wabwire Global Innovations about <strong>${escapeHtml(enquiry.service)}</strong>. We have received your enquiry and our team will follow up.</p><p style="padding:14px;background:#f5efe2;border-left:3px solid #b08030">${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}</p>`
  return sendEmail({ to: enquiry.email, subject: `We received your ${enquiry.service} enquiry · Wabwire`, html: template('Your enquiry is with us', body, 'Visit Wabwire', siteUrl(), 'This is an automatic confirmation. Reply to this email if you need to add information.'), text: `Hello ${enquiry.name}, thank you for contacting Wabwire Global Innovations about ${enquiry.service}. We received your enquiry and our team will follow up.\n\nYour message: ${enquiry.message}` })
}

export async function sendEnquiryReplyEmail(enquiry, admin, message, subject = '') {
  const cleanSubject = subject.trim() || `Reply about your ${enquiry.service} enquiry · Wabwire`
  return sendEmail({ to: enquiry.email, subject: cleanSubject, html: template('A reply from our team', `<p>Hello ${escapeHtml(enquiry.name)},</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p><p style="padding:14px;background:#f5efe2;border-left:3px solid #b08030"><strong>Your original enquiry about ${escapeHtml(enquiry.service)}:</strong><br>${escapeHtml(enquiry.message).replace(/\n/g, '<br>')}</p><p>Regards,<br>${escapeHtml(admin.fullName)}<br>Wabwire Global Innovations</p>`), text: `Hello ${enquiry.name},\n\n${message}\n\nYour original enquiry about ${enquiry.service}:\n${enquiry.message}\n\nRegards,\n${admin.fullName}\nWabwire Global Innovations` })
}

export async function sendServiceRequestReplyEmail(request, admin, message, subject = '') {
  const cleanSubject = subject.trim() || `Update about your ${request.service} request · Wabwire`
  return sendEmail({ to: request.email, subject: cleanSubject, html: template('A reply from our team', `<p>Hello ${escapeHtml(request.name)},</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p><p style="padding:14px;background:#f5efe2;border-left:3px solid #b08030"><strong>Your request:</strong><br>${escapeHtml(request.description).replace(/\n/g, '<br>')}</p><p>Regards,<br>${escapeHtml(admin.fullName)}<br>Wabwire Global Innovations</p>`), text: `Hello ${request.name},\n\n${message}\n\nYour request:\n${request.description}\n\nRegards,\n${admin.fullName}\nWabwire Global Innovations` })
}

export async function sendServiceRequestStatusEmail(request, status) {
  const label = status.toLowerCase().replaceAll('_', ' ')
  const explanation = request.adminNote ? `<p>${escapeHtml(request.adminNote).replace(/\n/g, '<br>')}</p>` : ''
  const quote = status === 'QUOTED' && request.quotedAmount ? `<p>Your quote is <strong>KES ${Number(request.quotedAmount).toLocaleString('en-KE')}</strong>. You can pay in installments from your service requests dashboard.</p>` : ''
  return sendEmail({ to: request.email, subject: status === 'QUOTED' ? `Your Wabwire service quote is ready` : `Your Wabwire service request is ${label}`, html: template('Service request update', `<p>Hello ${escapeHtml(request.name)},</p><p>Your <strong>${escapeHtml(request.service)}</strong> request is now <strong>${escapeHtml(label)}</strong>.</p>${quote}${explanation}<p>Reply to this email if you have a question or need to add information.</p>`, 'View Wabwire', `${siteUrl()}/dashboard/requests`), text: `Hello ${request.name}, your ${request.service} request is now ${label}.${quote ? `\n\nYour quote is KES ${Number(request.quotedAmount).toLocaleString('en-KE')}. You can pay in installments from your service requests dashboard.` : ''}${request.adminNote ? `\n\n${request.adminNote}` : ''}\n\nView your requests: ${siteUrl()}/dashboard/requests` })
}

export async function sendCampaignEmail(user, campaign) {
  const body = String(campaign.body || '')
  const linkMatch = body.match(/(?:Details|Join):\s*(https:\/\/\S+)/i)
  const link = linkMatch?.[1]?.replace(/[),.]+$/, '')
  const paragraphs = escapeHtml(body).split(/\n{2,}/).map(part => `<p>${part.replace(/\n/g, '<br>')}</p>`).join('')
  return sendEmail({ to: user.email, subject: campaign.subject, html: template(campaign.title, `<p>Hello ${escapeHtml(user.fullName)},</p>${paragraphs}`, link ? 'View programme details' : 'Open your member dashboard', link || `${siteUrl()}/dashboard`), text: `Hello ${user.fullName},\n\n${body}\n\nWabwire Global Innovations` })
}

import 'dotenv/config'
import {
  sendCampaignEmail,
  sendEnquiryReceivedEmail,
  sendEnquiryReplyEmail,
  sendPaymentConfirmedEmail,
  sendServiceRequestReplyEmail,
  sendServiceRequestStatusEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from '../src/services/email.js'

if (process.env.EMAIL_TEST_MODE !== 'true') {
  throw new Error('Refusing to send. Set EMAIL_TEST_MODE=true so every message is clearly marked as a test.')
}

const recipient = 'adelewigitz@gmail.com'
const user = { fullName: 'Adele (Email Test)', email: recipient }
const admin = { fullName: 'Wabwire Admin (Email Test)' }
const enquiry = {
  name: user.fullName,
  email: recipient,
  service: 'Software Development',
  message: 'Sample enquiry used to review the branded acknowledgement and admin reply.',
}
const serviceRequest = {
  name: user.fullName,
  email: recipient,
  service: 'Web Application Development',
  description: 'Sample service request used to review status and reply emails.',
  adminNote: 'Your request is confirmed for review. This is a sample update.',
}
const examples = [
  ['Registration verification', () => sendVerificationEmail(user, 'test-only-token-do-not-use-00000000000000000000000000000000')],
  ['Welcome after verification', () => sendWelcomeEmail(user)],
  ['Enquiry received', () => sendEnquiryReceivedEmail(enquiry)],
  ['Admin enquiry reply', () => sendEnquiryReplyEmail(enquiry, admin, 'Thanks for your enquiry. Our team has reviewed it and will follow up with the next steps.', 'A reply to your software development enquiry · Wabwire')],
  ['Service request status', () => sendServiceRequestStatusEmail(serviceRequest, 'APPROVED')],
  ['Admin service request reply', () => sendServiceRequestReplyEmail(serviceRequest, admin, 'Your request is confirmed for review. We will share the next steps shortly.')],
  ['New event announcement', () => sendCampaignEmail(user, { title: 'Upcoming event: Wabwire innovation forum', subject: 'You are invited: Wabwire innovation forum', body: 'Join us for a new Wabwire community event.\n\nDate: Sample date\n\nDetails: https://www.wabwireglobalinnovations.com/events' })],
  ['Course cohort announcement', () => sendCampaignEmail(user, { title: 'New class: Practical software development', subject: 'A new class is available for your course cohort', body: 'A new class has been scheduled for your learning cohort.\n\nJoin: https://www.wabwireglobalinnovations.com/dashboard/learning' })],
  ['Payment confirmation', () => sendPaymentConfirmedEmail(user, { amount: 5000, method: 'MPESA_STK', mpesaReceiptNumber: 'TEST123456', transactionDate: new Date().toISOString(), accountReference: 'TEST-MEMBERSHIP' })],
]

let failures = 0
for (const [label, send] of examples) {
  try {
    const result = await send()
    console.log(`SENT | ${label} | ${result.id || 'accepted by provider'}`)
  } catch (error) {
    failures += 1
    console.error(`FAILED | ${label} | ${error.message}`)
  }
}
if (failures) process.exitCode = 1

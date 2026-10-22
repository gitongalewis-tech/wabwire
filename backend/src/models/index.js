import mongoose from 'mongoose'

const { Schema, model } = mongoose

const userSchema = new Schema({
  firstName: { type: String, trim: true, maxlength: 60 },
  lastName: { type: String, trim: true, maxlength: 60 },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 30, unique: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  phone: { type: String, trim: true, maxlength: 40 },
  country: { type: String, trim: true, default: 'Kenya', maxlength: 80 },
  county: { type: String, trim: true, maxlength: 80 },
  dateOfBirth: Date,
  idPassportNumber: { type: String, trim: true, maxlength: 40, select: false },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['USER', 'ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'MODERATOR'], default: 'USER', index: true },
  isDemo: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING', index: true },
  membershipStatus: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING', index: true },
  referralCode: { type: String, required: true, unique: true, index: true },
  referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, immutable: true, index: true },
  acceptedPolicies: [{ name: String, version: String, acceptedAt: Date }],
  emailVerifiedAt: Date,
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  sessionVersion: { type: Number, default: 0, min: 0 },
  avatarUrl: { type: String, default: '', maxlength: 280000, select: false },
  lastLoginAt: Date,
}, { timestamps: true })
userSchema.index({ createdAt: -1 })

const paymentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purpose: { type: String, enum: ['MEMBERSHIP', 'SERVICE'], default: 'MEMBERSHIP', index: true },
  serviceRequest: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', index: true },
  amount: { type: Number, required: true, min: 1 }, currency: { type: String, default: 'KES' },
  method: { type: String, enum: ['MPESA_STK', 'MPESA_PAYBILL'], required: true },
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'FAILED', 'REJECTED', 'CANCELLED'], default: 'PENDING', index: true },
  phoneNumber: String, accountReference: String, mpesaReceiptNumber: { type: String, sparse: true, unique: true },
  merchantRequestId: { type: String, index: true }, checkoutRequestId: { type: String, index: true },
  providerResultCode: String, providerResultDescription: String, providerCallback: Schema.Types.Mixed,
  transactionDate: Date, verifiedAt: Date, verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  idempotencyKey: { type: String, unique: true, sparse: true },
}, { timestamps: true })
paymentSchema.index({ user: 1, createdAt: -1 })

const membershipSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, payment: { type: Schema.Types.ObjectId, ref: 'Payment' }, amount: Number, status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING' }, activationMethod: { type: String, enum: ['PAYMENT', 'ADMIN'] }, activatedBy: { type: Schema.Types.ObjectId, ref: 'User' }, activatedAt: Date, expiresAt: Date }, { timestamps: true })
const referralSchema = new Schema({ referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, referredUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, referralCode: { type: String, required: true }, level: { type: Number, default: 1 }, status: { type: String, enum: ['PENDING', 'ELIGIBLE', 'INACTIVE'], default: 'PENDING' } }, { timestamps: true })
const commissionRuleSchema = new Schema({ level: { type: Number, required: true, unique: true }, amount: { type: Number, required: true, min: 0 }, currency: { type: String, default: 'KES' }, active: { type: Boolean, default: true }, effectiveFrom: Date, effectiveTo: Date }, { timestamps: true })
const commissionSchema = new Schema({ beneficiary: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, sourceMember: { type: Schema.Types.ObjectId, ref: 'User', required: true }, payment: { type: Schema.Types.ObjectId, ref: 'Payment', required: true }, level: { type: Number, required: true }, amount: { type: Number, required: true }, currency: { type: String, default: 'KES' }, status: { type: String, enum: ['PENDING', 'APPROVED', 'PAID', 'REVERSED'], default: 'PENDING', index: true }, type: { type: String, enum: ['COMMISSION', 'REVERSAL', 'ADJUSTMENT'], default: 'COMMISSION' }, approvedBy: { type: Schema.Types.ObjectId, ref: 'User' }, approvedAt: Date, paidAt: Date, reversalOf: { type: Schema.Types.ObjectId, ref: 'CommissionLedger' } }, { timestamps: true })
commissionSchema.index({ payment: 1, beneficiary: 1, level: 1 }, { unique: true, partialFilterExpression: { type: 'COMMISSION' } })
const withdrawalSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, amount: { type: Number, required: true, min: 1 }, phoneNumber: { type: String, required: true }, status: { type: String, enum: ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED'], default: 'PENDING', index: true }, note: String, processedBy: { type: Schema.Types.ObjectId, ref: 'User' }, processedAt: Date, providerConversationId: String, providerOriginatorConversationId: { type: String, unique: true, sparse: true }, providerTransactionId: String, providerResultCode: String, providerResultDescription: String }, { timestamps: true })

const courseSchema = new Schema({ title: { type: String, required: true, trim: true }, slug: { type: String, unique: true, sparse: true }, description: { type: String, required: true }, category: String, instructor: { type: Schema.Types.ObjectId, ref: 'User' }, thumbnailUrl: String, isPublished: { type: Boolean, default: false, index: true }, modules: [{ title: { type: String, required: true }, lessons: [{ title: { type: String, required: true }, description: String, videoUrl: String, resourceUrl: String, durationMinutes: Number }] }] }, { timestamps: true })
const enrollmentSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, course: { type: Schema.Types.ObjectId, ref: 'Course', required: true }, completedLessons: [{ type: String }], progressPercent: { type: Number, default: 0 }, completedAt: Date }, { timestamps: true })
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true })
const classSchema = new Schema({ title: { type: String, required: true }, course: { type: Schema.Types.ObjectId, ref: 'Course' }, instructor: { type: Schema.Types.ObjectId, ref: 'User' }, startsAt: { type: Date, required: true }, endsAt: Date, meetingUrl: String, location: String, description: String, isPublished: { type: Boolean, default: false, index: true } }, { timestamps: true })
const eventSchema = new Schema({ title: { type: String, required: true }, slug: { type: String, unique: true, sparse: true }, description: { type: String, required: true }, imageUrl: String, startsAt: { type: Date, required: true, index: true }, endsAt: Date, location: String, meetingUrl: String, membersOnly: { type: Boolean, default: false }, status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CANCELLED'], default: 'DRAFT', index: true }, capacity: Number }, { timestamps: true })
const eventRegistrationSchema = new Schema({ event: { type: Schema.Types.ObjectId, ref: 'Event', required: true }, user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, status: { type: String, enum: ['REGISTERED', 'ATTENDED', 'CANCELLED'], default: 'REGISTERED' } }, { timestamps: true })
eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true })
const postSchema = new Schema({ author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, body: { type: String, required: true, maxlength: 4000 }, likes: [{ type: Schema.Types.ObjectId, ref: 'User' }], comments: [{ author: { type: Schema.Types.ObjectId, ref: 'User' }, body: { type: String, maxlength: 1000 }, createdAt: { type: Date, default: Date.now } }], reports: [{ reporter: { type: Schema.Types.ObjectId, ref: 'User' }, reason: String, createdAt: { type: Date, default: Date.now } }], pinned: { type: Boolean, default: false }, removedAt: Date }, { timestamps: true })
const referralMessageSchema = new Schema({ groupOwner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, sender: { type: Schema.Types.ObjectId, ref: 'User', required: true }, body: { type: String, required: true, trim: true, maxlength: 2000 } }, { timestamps: true })
referralMessageSchema.index({ groupOwner: 1, createdAt: -1 })
const serviceRequestSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', index: true }, name: { type: String, required: true }, email: { type: String, required: true }, phone: String, service: { type: String, required: true }, description: { type: String, required: true, maxlength: 4000 }, budget: String, deadline: Date, quotedAmount: { type: Number, min: 1 }, paidAmount: { type: Number, default: 0, min: 0 }, paymentStatus: { type: String, enum: ['NOT_DUE', 'PENDING', 'PARTIAL', 'PAID'], default: 'NOT_DUE' }, status: { type: String, enum: ['NEW', 'REVIEWING', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'NEW', index: true }, adminNote: String, replies: [{ admin: { type: Schema.Types.ObjectId, ref: 'User', required: true }, subject: { type: String, required: true, maxlength: 200 }, message: { type: String, required: true, maxlength: 5000 }, emailId: String, sentAt: { type: Date, default: Date.now } }] }, { timestamps: true })
const notificationSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, title: { type: String, required: true }, message: { type: String, required: true }, type: String, readAt: Date, link: String }, { timestamps: true })
const auditLogSchema = new Schema({ actor: { type: Schema.Types.ObjectId, ref: 'User' }, action: { type: String, required: true }, entityType: String, entityId: String, details: Schema.Types.Mixed, ip: String }, { timestamps: true })
const systemSettingSchema = new Schema({ key: { type: String, required: true, unique: true }, value: Schema.Types.Mixed, updatedBy: { type: Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true })
const emailTemplateSchema = new Schema({ name: { type: String, required: true, unique: true, trim: true }, category: { type: String, enum: ['welcome', 'payment', 'membership', 'class', 'event', 'announcement', 'service-request', 'withdrawal', 'custom'], default: 'custom' }, subject: { type: String, required: true, maxlength: 200 }, body: { type: String, required: true, maxlength: 10000 }, active: { type: Boolean, default: true } }, { timestamps: true })
const emailCampaignSchema = new Schema({ title: { type: String, required: true, maxlength: 180 }, subject: { type: String, required: true, maxlength: 200 }, body: { type: String, required: true, maxlength: 10000 }, audienceType: { type: String, enum: ['active-members', 'course-enrollees', 'event-registrants'], default: 'active-members' }, audienceId: { type: Schema.Types.ObjectId }, sendInApp: { type: Boolean, default: true }, sendEmail: { type: Boolean, default: false }, scheduledAt: Date, sourceType: { type: String, enum: ['event', 'class'], index: true }, sourceId: { type: Schema.Types.ObjectId }, purpose: { type: String, enum: ['announcement', 'reminder'] }, status: { type: String, enum: ['SCHEDULED', 'SENDING', 'SENT', 'PARTIAL', 'FAILED', 'CANCELLED'], default: 'SCHEDULED', index: true }, recipients: { type: Number, default: 0 }, emailSent: { type: Number, default: 0 }, failureMessage: String, createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true })
emailCampaignSchema.index({ sourceType: 1, sourceId: 1, purpose: 1 }, { unique: true, partialFilterExpression: { sourceType: { $exists: true }, sourceId: { $exists: true }, purpose: { $exists: true } } })
const enquirySchema = new Schema({ name: { type: String, required: true, trim: true, maxlength: 120 }, email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 }, phone: { type: String, trim: true, maxlength: 40 }, service: { type: String, required: true }, message: { type: String, required: true, trim: true, maxlength: 4000 }, status: { type: String, enum: ['new', 'reviewing', 'responded', 'closed'], default: 'new' }, acknowledgementEmailStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' }, acknowledgementEmailError: { type: String, maxlength: 300 }, acknowledgementEmailSentAt: Date, replies: [{ admin: { type: Schema.Types.ObjectId, ref: 'User', required: true }, subject: { type: String, required: true, maxlength: 200 }, message: { type: String, required: true, maxlength: 5000 }, emailId: String, sentAt: { type: Date, default: Date.now } }] }, { timestamps: true })

const getModel = (name, schema) => mongoose.models[name] || model(name, schema)
export const User = getModel('User', userSchema)
export const Payment = getModel('Payment', paymentSchema)
export const Membership = getModel('Membership', membershipSchema)
export const Referral = getModel('Referral', referralSchema)
export const CommissionRule = getModel('CommissionRule', commissionRuleSchema)
export const CommissionLedger = getModel('CommissionLedger', commissionSchema)
export const Withdrawal = getModel('Withdrawal', withdrawalSchema)
export const Course = getModel('Course', courseSchema)
export const Enrollment = getModel('Enrollment', enrollmentSchema)
export const ClassSession = getModel('ClassSession', classSchema)
export const Event = getModel('Event', eventSchema)
export const EventRegistration = getModel('EventRegistration', eventRegistrationSchema)
export const CommunityPost = getModel('CommunityPost', postSchema)
export const ReferralMessage = getModel('ReferralMessage', referralMessageSchema)
export const ServiceRequest = getModel('ServiceRequest', serviceRequestSchema)
export const Notification = getModel('Notification', notificationSchema)
export const AuditLog = getModel('AuditLog', auditLogSchema)
export const SystemSetting = getModel('SystemSetting', systemSettingSchema)
export const EmailTemplate = getModel('EmailTemplate', emailTemplateSchema)
export const EmailCampaign = getModel('EmailCampaign', emailCampaignSchema)
export const Enquiry = getModel('Enquiry', enquirySchema)

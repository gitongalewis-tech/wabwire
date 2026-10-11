import { Router } from 'express'
import { z } from 'zod'
import { allowRoles, requireActiveMember, requireAuth } from '../middleware/auth.js'
import { asyncRoute, parse, publicUser } from '../utils/http.js'
import { AuditLog, ClassSession, CommissionLedger, CommissionRule, CommunityPost, Course, Enrollment, Event, EventRegistration, Membership, Notification, Payment, Referral, ServiceRequest, SystemSetting, User, Withdrawal, Enquiry } from '../models/index.js'
import { audit } from '../services/audit.js'
import { saveSetting, setting } from '../services/settings.js'
import { notify, admins, active, asId, pageArgs } from './routeHelpers.js'

const router = Router()

// Member and administrator summaries
router.get('/dashboard/summary', ...active, asyncRoute(async (req, res) => {
  const [direct, courses, enrollments, upcoming, commissions, fee, user] = await Promise.all([
    Referral.countDocuments({ referrer: req.user._id }),
    Course.countDocuments({ isPublished: true }), Enrollment.find({ user: req.user._id }).populate('course', 'title'),
    ClassSession.find({ isPublished: true, startsAt: { $gte: new Date() } }).sort({ startsAt: 1 }).limit(4).populate('course', 'title').populate('instructor', 'fullName'),
    CommissionLedger.aggregate([{ $match: { beneficiary: req.user._id, type: 'COMMISSION' } }, { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Membership.findOne({ user: req.user._id }), User.findById(req.user._id),
  ])
  const directIds = await User.find({ referredBy: req.user._id }).distinct('_id')
  const secondIds = directIds.length ? await User.find({ referredBy: { $in: directIds } }).distinct('_id') : []
  const thirdCount = secondIds.length ? await User.countDocuments({ referredBy: { $in: secondIds } }) : 0
  const network = directIds.length + secondIds.length + thirdCount
  const summary = Object.fromEntries(commissions.map(item => [item._id.toLowerCase(), { amount: item.amount, count: item.count }]))
  res.json({ membership: { status: user.membershipStatus, amount: fee?.amount || Number(process.env.MEMBERSHIP_FEE_KES || 5000) }, referrals: { direct, network }, learning: { enrolled: enrollments.length, availableCourses: courses, averageProgress: enrollments.length ? Math.round(enrollments.reduce((sum, item) => sum + item.progressPercent, 0) / enrollments.length) : 0 }, commissions: { pending: summary.pending?.amount || 0, approved: summary.approved?.amount || 0, paid: summary.paid?.amount || 0 }, enrollments, upcoming })
}))

router.get('/admin/overview', requireAuth, admins, asyncRoute(async (_req, res) => {
  const [totalMembers, activeMembers, pendingMembers, payments, commissions, withdrawals, requests, enquiries, upcomingClasses, upcomingEvents, recentUsers] = await Promise.all([
    User.countDocuments({ role: 'USER' }), User.countDocuments({ membershipStatus: 'ACTIVE' }), User.countDocuments({ membershipStatus: 'PENDING' }),
    Payment.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    CommissionLedger.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Withdrawal.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ServiceRequest.countDocuments({ status: 'NEW' }),
    Enquiry.countDocuments({ status: 'new' }),
    ClassSession.countDocuments({ isPublished: true, startsAt: { $gte: new Date() } }), Event.countDocuments({ status: 'PUBLISHED', startsAt: { $gte: new Date() } }),
    User.find().select('fullName email username membershipStatus createdAt').sort({ createdAt: -1 }).limit(6),
  ])
  res.json({ totalMembers, activeMembers, pendingMembers, payments, commissions, withdrawals, newRequests: requests, newEnquiries: enquiries, upcomingClasses, upcomingEvents, recentUsers })
}))
router.get('/reports/admin', requireAuth, admins, asyncRoute(async (_req, res) => {
  const since = new Date(); since.setMonth(since.getMonth() - 11, 1); since.setHours(0, 0, 0, 0)
  const [monthlyRevenue, memberStatuses, commissionStatuses, requestStatuses, courseActivity] = await Promise.all([
    Payment.aggregate([{ $match: { status: 'VERIFIED', createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.aggregate([{ $match: { role: 'USER' } }, { $group: { _id: '$membershipStatus', count: { $sum: 1 } } }]),
    CommissionLedger.aggregate([{ $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ServiceRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enrollment.aggregate([{ $group: { _id: '$course', count: { $sum: 1 }, averageProgress: { $avg: '$progressPercent' } } }, { $sort: { count: -1 } }, { $limit: 10 }, { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } }, { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } }, { $project: { title: '$course.title', count: 1, averageProgress: { $round: ['$averageProgress', 0] } } }]),
  ])
  res.json({ monthlyRevenue, memberStatuses, commissionStatuses, requestStatuses, courseActivity })
}))

export default router

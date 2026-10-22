import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Footer, Navbar, WhatsAppButton } from './components/Site.jsx'
import { RequireAdmin, RequireAuth, RequireMember } from './components/RouteGuard.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { memberHome } from './config/testMode.js'
import seoPages from '../seo-pages.json'

const Home = lazy(() => import('./pages/public/Home.jsx'))
const About = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.About })))
const Contact = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.Contact })))
const ContentPending = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.ContentPending })))
const Events = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.Events })))
const Learning = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.Learning })))
const Legal = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.Legal })))
const PlatformInfo = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.PlatformInfo })))
const ServiceDetail = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.ServiceDetail })))
const Services = lazy(() => import('./pages/public/Pages.jsx').then(module => ({ default: module.Services })))
const LoginPage = lazy(() => import('./pages/public/AuthPages.jsx').then(module => ({ default: module.LoginPage })))
const PaymentPage = lazy(() => import('./pages/public/AuthPages.jsx').then(module => ({ default: module.PaymentPage })))
const RegisterPage = lazy(() => import('./pages/public/AuthPages.jsx').then(module => ({ default: module.RegisterPage })))
const VerifyEmailPage = lazy(() => import('./pages/public/AuthPages.jsx').then(module => ({ default: module.VerifyEmailPage })))
const ForgotPasswordPage = lazy(() => import('./pages/public/AuthPages.jsx').then(module => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/public/AuthPages.jsx').then(module => ({ default: module.ResetPasswordPage })))
const MemberPortal = lazy(() => import('./pages/user/MemberPortal.jsx'))
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal.jsx'))

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [pathname]); return null }
function ScrollReveal({ pathname }) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (reduceMotion) return
    const root = document.querySelector('.route-transition')
    if (!root) return
    const targets = '.route-transition section:not(.page-hero):not(.hero), .route-transition .feature-split, .route-transition .service-card, .route-transition .service-row, .route-transition .principle-list article, .route-transition .pillar-grid article, .route-transition .values-grid article, .route-transition .member-benefit-grid article, .route-transition .team-card, .route-transition .course-grid article, .route-transition .event-public-card, .route-transition .price-card, .route-transition .vision-cards article, .route-transition .contact-form, .route-transition .platform-card'
    let frame = 0
    const revealVisible = () => {
      frame = 0
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      root.querySelectorAll('.scroll-pop-target:not(.scroll-pop-visible)').forEach(element => {
        const bounds = element.getBoundingClientRect()
        if (bounds.top < viewportHeight * 0.94 && bounds.bottom > 0) element.classList.add('scroll-pop-visible')
      })
    }
    const scheduleReveal = () => {
      if (!frame) frame = window.requestAnimationFrame(revealVisible)
    }
    const revealTargets = () => root.querySelectorAll(targets).forEach((element, index) => {
      if (element.classList.contains('scroll-pop-target')) return
      element.classList.add('scroll-pop-target')
      element.style.setProperty('--scroll-pop-delay', `${Math.min(index % 5, 4) * 75}ms`)
    })
    const refreshTargets = () => { revealTargets(); scheduleReveal() }
    const mutations = new MutationObserver(refreshTargets)
    mutations.observe(root, { childList: true, subtree: true })
    refreshTargets()
    window.addEventListener('scroll', scheduleReveal, { passive: true })
    window.addEventListener('resize', scheduleReveal)
    return () => {
      mutations.disconnect()
      window.removeEventListener('scroll', scheduleReveal)
      window.removeEventListener('resize', scheduleReveal)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [pathname, reduceMotion])
  return null
}
function PageMetadata() { const { pathname } = useLocation(); useEffect(() => { const base = 'https://www.wabwireglobalinnovations.com'; const page = seoPages.find(item => item.path === pathname); const detail = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' '); const title = page?.title || `${detail ? detail.replace(/\b\w/g, char => char.toUpperCase()) : 'Wabwire'} | Wabwire Global Innovations`; const description = page?.description || 'Wabwire Global Innovations in Kenya provides technology, digital services, travel and practical business development.'; const url = `${base}${pathname === '/' ? '/' : pathname}`; const robots = page?.index ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' : 'noindex, follow'; document.title = title; const set = (selector, value, attribute = 'content') => { const element = document.querySelector(selector); if (element) element.setAttribute(attribute, value) }; set('meta[name="description"]', description); set('meta[name="robots"]', robots); set('meta[name="googlebot"]', robots); set('link[rel="canonical"]', url, 'href'); set('meta[property="og:title"]', title); set('meta[property="og:description"]', description); set('meta[property="og:url"]', url); set('meta[name="twitter:title"]', title); set('meta[name="twitter:description"]', description); }, [pathname]); return null }
function NotFound() { return <main className="not-found"><span>404</span><h1>That page isn’t here.</h1><p>Use the navigation to explore Wabwire Global Innovations.</p><a href="/">Return home</a></main> }

export default function App() {
  const location = useLocation(); const { pathname } = location; const { user } = useAuth(); const reduceMotion = useReducedMotion()
  const isPortal = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  const isAuthPage = ['/login','/register','/payment','/verify-email','/forgot-password','/reset-password'].includes(pathname)
  return <><ScrollToTop/><PageMetadata/>{!isPortal&&!isAuthPage&&<Navbar/>}<main><Suspense fallback={<div className="page-loading" role="status" aria-label="Loading digital experience"><div className="loading-orbit" aria-hidden="true"><span/><span/><i/></div><p>Preparing your digital experience</p></div>}><AnimatePresence mode="wait" initial={false}><motion.div key={pathname} className="route-transition" initial={{ opacity: 0, y: reduceMotion ? 0 : 18, filter: reduceMotion ? 'none' : 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: reduceMotion ? 0 : -10, filter: reduceMotion ? 'none' : 'blur(2px)' }} transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}><ScrollReveal pathname={pathname}/><Routes location={location}>
    <Route path="/" element={<Home/>}/><Route path="/about" element={<About/>}/><Route path="/about/company" element={<About/>}/>
    <Route path="/about/founders" element={<About/>}/><Route path="/about/leadership" element={<About/>}/><Route path="/about/partners" element={<ContentPending type="partners"/>}/><Route path="/about/registration" element={<ContentPending type="registration"/>}/>
    <Route path="/services" element={<Services/>}/><Route path="/services/web-development" element={<ServiceDetail/>}/><Route path="/services/social-media" element={<ServiceDetail/>}/><Route path="/services/graphic-design" element={<ServiceDetail/>}/><Route path="/services/consulting" element={<ServiceDetail/>}/><Route path="/services/business-support" element={<ServiceDetail/>}/><Route path="/services/retainers" element={<ServiceDetail/>}/><Route path="/services/digital-training" element={<Learning/>}/><Route path="/services/tourism" element={<ServiceDetail/>}/>
    <Route path="/tours" element={<Navigate to="/services/tourism" replace/>}/><Route path="/tours/destinations" element={<Navigate to="/services/tourism" replace/>}/><Route path="/tours/packages" element={<Navigate to="/services/tourism" replace/>}/><Route path="/learning" element={<Learning/>}/><Route path="/courses" element={<Learning/>}/><Route path="/events" element={<Events/>}/><Route path="/community" element={<ContentPending type="community"/>}/><Route path="/testimonials" element={<ContentPending type="testimonials"/>}/><Route path="/contact" element={<Contact/>}/><Route path="/legal" element={<Legal/>}/><Route path="/legal/*" element={<Legal/>}/><Route path="/platform" element={<PlatformInfo/>}/>
    <Route element={<RequireAuth/>}><Route path="/payment" element={<PaymentPage/>}/><Route element={<RequireMember/>}><Route path="/dashboard/*" element={<MemberPortal/>}/></Route><Route element={<RequireAdmin/>}><Route path="/admin/*" element={<AdminPortal/>}/></Route></Route>
    <Route path="/login" element={user?<Navigate to={memberHome(user)} replace/>:<LoginPage/>}/><Route path="/register" element={user?<Navigate to={memberHome(user)} replace/>:<RegisterPage/>}/><Route path="/verify-email" element={<VerifyEmailPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/><Route path="*" element={<NotFound/>}/>
  </Routes></motion.div></AnimatePresence></Suspense></main>{!isPortal&&<Footer/>}<WhatsAppButton/></>
}

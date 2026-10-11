import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Footer, Navbar } from './components/Site.jsx'
import { RequireAdmin, RequireAuth, RequireMember } from './components/RouteGuard.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { memberHome } from './config/testMode.js'

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
const MemberPortal = lazy(() => import('./pages/user/MemberPortal.jsx'))
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal.jsx'))

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [pathname]); return null }
function PageMetadata() { const { pathname } = useLocation(); useEffect(() => { const names = { '/': 'Home', '/about': 'About', '/services': 'Services', '/learning': 'Learning', '/events': 'Events', '/contact': 'Contact', '/legal': 'Legal information' }; const detail = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' '); document.title = `${names[pathname] || (detail ? detail.replace(/\b\w/g, char => char.toUpperCase()) : 'Wabwire')} | Wabwire Global Innovations`; }, [pathname]); return null }
function NotFound() { return <main className="not-found"><span>404</span><h1>That page isn’t here.</h1><p>Use the navigation to explore Wabwire Global Innovations.</p><a href="/">Return home</a></main> }

export default function App() {
  const { pathname } = useLocation(); const { user } = useAuth()
  const isPortal = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  const isAuthPage = ['/login','/register','/payment'].includes(pathname)
  return <><ScrollToTop/><PageMetadata/>{!isPortal&&!isAuthPage&&<Navbar/>}<main><Suspense fallback={<div className="page-loading" role="status" aria-label="Loading page"><span /></div>}><Routes>
    <Route path="/" element={<Home/>}/><Route path="/about" element={<About/>}/><Route path="/about/company" element={<About/>}/>
    <Route path="/about/founders" element={<About/>}/><Route path="/about/leadership" element={<About/>}/><Route path="/about/partners" element={<ContentPending type="partners"/>}/><Route path="/about/registration" element={<ContentPending type="registration"/>}/>
    <Route path="/services" element={<Services/>}/><Route path="/services/web-development" element={<ServiceDetail/>}/><Route path="/services/social-media" element={<ServiceDetail/>}/><Route path="/services/graphic-design" element={<ServiceDetail/>}/><Route path="/services/digital-training" element={<Learning/>}/><Route path="/services/tourism" element={<ServiceDetail/>}/>
    <Route path="/tours" element={<Navigate to="/services/tourism" replace/>}/><Route path="/tours/destinations" element={<Navigate to="/services/tourism" replace/>}/><Route path="/tours/packages" element={<Navigate to="/services/tourism" replace/>}/><Route path="/learning" element={<Learning/>}/><Route path="/courses" element={<Learning/>}/><Route path="/events" element={<Events/>}/><Route path="/community" element={<ContentPending type="community"/>}/><Route path="/testimonials" element={<ContentPending type="testimonials"/>}/><Route path="/contact" element={<Contact/>}/><Route path="/legal" element={<Legal/>}/><Route path="/legal/*" element={<Legal/>}/><Route path="/platform" element={<PlatformInfo/>}/>
    <Route element={<RequireAuth/>}><Route path="/payment" element={<PaymentPage/>}/><Route element={<RequireMember/>}><Route path="/dashboard/*" element={<MemberPortal/>}/></Route><Route element={<RequireAdmin/>}><Route path="/admin/*" element={<AdminPortal/>}/></Route></Route>
    <Route path="/login" element={user?<Navigate to={memberHome(user)} replace/>:<LoginPage/>}/><Route path="/register" element={user?<Navigate to={memberHome(user)} replace/>:<RegisterPage/>}/><Route path="*" element={<NotFound/>}/>
  </Routes></Suspense></main>{!isPortal&&<Footer/>}</>
}

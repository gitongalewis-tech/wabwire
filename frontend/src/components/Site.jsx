import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const navItems = [['About', '/about'], ['Services', '/services'], ['Learning', '/learning'], ['Events', '/events'], ['Contact', '/contact']]

export function Navbar() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24)
    update(); window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
    <div className="nav-wrap">
      <Link className="brand" to="/" aria-label="Wabwire Global Innovations home"><img src="/images/brand/logo-mark.jpg" alt="" /><span className="brand-words"><b>WABWIRE</b><small>GLOBAL INNOVATIONS LTD</small></span></Link>
      <nav className={`nav-links ${open ? 'nav-links--open' : ''}`} aria-label="Main navigation">
        {navItems.map(([label, path]) => <NavLink key={path} to={path}>{label}</NavLink>)}
      </nav>
      <div className="nav-actions"><Link className="nav-login" to={user ? (user.membershipStatus==='ACTIVE'?'/dashboard':'/payment') : '/login'}>{user ? 'My account' : 'Member login'}</Link><Link className="button button--gold button--small" to={user ? (user.membershipStatus==='ACTIVE'?'/dashboard':'/payment') : '/register'}>{user ? 'Open dashboard' : 'Join Wabwire'} <ArrowUpRight size={15} /></Link></div>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>
}

export function Footer() {
  return <footer className="footer">
    <div className="footer-top container">
      <div className="footer-brand"><Link to="/" className="brand"><img src="/images/brand/logo-mark.jpg" alt="" /><span className="brand-words"><b>WABWIRE</b><small>GLOBAL INNOVATIONS LTD</small></span></Link><p>Innovative. Professional. Future-focused.</p><p className="footer-mission">Technology, knowledge and thoughtful service for people and businesses moving forward.</p></div>
      <div><h4>Explore</h4><Link to="/about">About Wabwire</Link><Link to="/services">Our services</Link><Link to="/learning">Learning & development</Link><Link to="/events">Events</Link></div>
      <div><h4>Services</h4><Link to="/services/web-development">Technology & digital</Link><Link to="/services/social-media">Digital marketing</Link><Link to="/services/tourism">Travel & lifestyle</Link><Link to="/services/graphic-design">Branding & design</Link></div>
      <div><h4>Members</h4><Link to="/login">Member login</Link><Link to="/register">Register</Link><Link to="/learning">Learning</Link><Link to="/events">Events</Link></div>
      <div><h4>Get in touch</h4><Link to="/contact">Send an enquiry <ArrowUpRight size={14} /></Link><span className="footer-note">Official contact details pending confirmation</span></div>
    </div>
    <div className="footer-bottom container"><span>© {new Date().getFullYear()} Wabwire Global Innovations Ltd.</span><span>Innovating today. Transforming tomorrow.</span><Link to="/legal">Legal information</Link></div>
  </footer>
}

export function PageHero({ eyebrow, title, text, image, compact = false, children }) {
  return <section className={`page-hero ${compact ? 'page-hero--compact' : ''}`} style={image ? { '--hero-image': `url("${image}")` } : undefined}><div className="container page-hero-content"><p className="eyebrow"><i />{eyebrow}</p><h1>{title}</h1>{text && <p className="page-hero-text">{text}</p>}{children}</div></section>
}

export function SectionHead({ eyebrow, title, text, light = false }) { return <div className={`section-head ${light ? 'section-head--light' : ''}`}><p className="eyebrow"><i />{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</div> }

export function ButtonLink({ to, children, light = false }) { return <Link className={`button ${light ? 'button--light' : 'button--gold'}`} to={to}>{children}<ArrowRight size={17} /></Link> }

export function CTA({ title = 'Let’s make your next move count.', text = 'Tell us what you are working toward. We will listen, understand the challenge and help you explore a practical next step.' }) {
  return <section className="cta-section"><div className="container cta-inner"><div><p className="eyebrow"><i />A thoughtful place to start</p><h2>{title}</h2><p>{text}</p></div><ButtonLink to="/contact">Start a conversation</ButtonLink><ArrowDownRight className="cta-mark" size={150} strokeWidth={0.6} /></div></section>
}

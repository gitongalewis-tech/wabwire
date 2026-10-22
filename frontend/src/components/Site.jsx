import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { memberHome } from '../config/testMode.js'

const navItems = [['About', '/about'], ['Services', '/services'], ['Learning', '/learning'], ['Events', '/events'], ['Contact', '/contact']]
const contactEmail = 'info@wabwireglobalinnovations.com'
const contactPhone = '+254184032530'
const whatsappUrl = 'https://wa.me/254184032530?text=Hello%20Wabwire%20Global%20Innovations'
export const socials = [
  ['WhatsApp', 'https://wa.me/254184032530?text=Hello%20Wabwire%20Global%20Innovations'],
  ['Instagram', 'https://www.instagram.com/wabwireglobalinnovations/'],
  ['TikTok', 'https://www.tiktok.com/@wabwireglobalinnovations'],
  ['Facebook', 'https://www.facebook.com/wabwireglobalinnovations'],
  ['LinkedIn', 'https://www.linkedin.com/in/wabwireglobalinnovations/'],
  ['X', 'https://x.com/wabwireglobalinnovations'],
]

export function SocialIcon({ name }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false }
  if (name === 'Instagram') return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.6" r=".8" fill="currentColor" stroke="none"/></svg>
  if (name === 'Facebook') return <svg {...common} viewBox="0 0 24 24" fill="currentColor"><path d="M13.4 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.2V13H10v8h3.4Z"/></svg>
  if (name === 'TikTok') return <svg {...common} fill="currentColor"><path d="M19.6 8.2a7.2 7.2 0 0 1-4.4-1.5v7.1a5.6 5.6 0 1 1-4.8-5.5v3.6a2.1 2.1 0 1 0 1.3 2V2.5h3.5c.2 2.3 1.8 4.1 4.4 4.5v3.5Z"/></svg>
  if (name === 'LinkedIn') return <svg {...common} fill="currentColor"><path d="M5.2 8.4a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3.5 10h3.4v10.5H3.5V10Zm5.5 0h3.3v1.4h.1a3.7 3.7 0 0 1 3.3-1.8c3.5 0 4.1 2.3 4.1 5.2v5.7h-3.4v-5c0-1.2 0-2.8-1.8-2.8s-2.1 1.3-2.1 2.7v5.1H9V10Z"/></svg>
  if (name === 'X') return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="m5 4 14 16M19 4 5 20"/></svg>
  return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20l.9-4.7a8.5 8.5 0 1 1 16.6-3.6Z"/><path d="M8.4 8.2c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.3.1.5-.1.7l-.5.6c-.2.2-.2.4-.1.6.6 1.1 1.4 1.9 2.5 2.5.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.7-.1l1.6.8c.3.1.4.3.4.5 0 .4-.2 1.2-.7 1.6-.4.4-1.1.6-1.8.5-1-.2-2.1-.7-3.3-1.5-1.7-1.1-2.8-2.5-3.2-3.1-.5-.7-1.2-1.9-1.2-3s.6-1.7.9-1.9Z"/></svg>
}

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
      <Link className="brand" to="/" aria-label="Wabwire Global Innovations home"><img src="/images/brand/logo-mark.jpg" alt="Wabwire Global Innovations company logo" /><span className="brand-words"><b>WABWIRE</b><small>GLOBAL INNOVATIONS LTD</small></span></Link>
      <nav className={`nav-links ${open ? 'nav-links--open' : ''}`} aria-label="Main navigation">
        {navItems.map(([label, path]) => <NavLink key={path} to={path}>{label}</NavLink>)}
      </nav>
      <div className="nav-actions"><Link className="nav-login" to={user ? memberHome(user) : '/login'}>{user ? 'My account' : 'Member login'}</Link><Link className="button button--gold button--small" to={user ? memberHome(user) : '/register'}>{user ? 'Open dashboard' : 'Join Wabwire'} <ArrowUpRight size={15} /></Link></div>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>
}

export function Footer() {
  return <footer className="footer">
    <div className="footer-top container">
      <div className="footer-brand"><Link to="/" className="brand" aria-label="Wabwire Global Innovations home"><img src="/images/brand/logo-mark.jpg" alt="Wabwire Global Innovations company logo" /><span className="brand-words"><b>WABWIRE</b><small>GLOBAL INNOVATIONS LTD</small></span></Link><p>Innovative. Professional. Future-focused.</p><p className="footer-mission">Technology, knowledge and thoughtful service for people and businesses moving forward.</p></div>
      <div><h4>Explore</h4><Link to="/about">About Wabwire</Link><Link to="/services">Our services</Link><Link to="/learning">Learning & development</Link><Link to="/events">Events</Link></div>
      <div><h4>Services</h4><Link to="/services/web-development">Technology & digital</Link><Link to="/services/social-media">Digital marketing</Link><Link to="/services/tourism">Travel & lifestyle</Link><Link to="/services/graphic-design">Branding & design</Link></div>
      <div><h4>Members</h4><Link to="/login">Member login</Link><Link to="/register">Register</Link><Link to="/learning">Learning</Link><Link to="/events">Events</Link></div>
      <div><h4>Get in touch</h4><Link to="/contact">Send an enquiry <ArrowUpRight size={14} /></Link><a href={`mailto:${contactEmail}`}>{contactEmail}</a><a href={`tel:${contactPhone}`}>{contactPhone}</a><div className="footer-socials" aria-label="Social media">{socials.map(([name, url]) => <a className="footer-social-link" key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name === 'WhatsApp' ? 'Chat with Wabwire on WhatsApp' : `Wabwire on ${name}`} title={name}><SocialIcon name={name}/></a>)}</div></div>
    </div>
    <div className="footer-bottom container"><span>© {new Date().getFullYear()} Wabwire Global Innovations Ltd.</span><span>Innovating today. Transforming tomorrow.</span><Link to="/legal">Legal information</Link></div>
  </footer>
}

export function WhatsAppButton() {
  return <a className="whatsapp-float" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Chat with Wabwire on WhatsApp">
    <SocialIcon name="WhatsApp"/><span>Chat with us</span>
  </a>
}

export function PageHero({ eyebrow, title, text, image, compact = false, children }) {
  return <section className={`page-hero ${compact ? 'page-hero--compact' : ''}`} style={image ? { '--hero-image': `url("${image}")` } : undefined}><div className="container page-hero-content"><p className="eyebrow"><i />{eyebrow}</p><h1>{title}</h1>{text && <p className="page-hero-text">{text}</p>}{children}</div></section>
}

export function SectionHead({ eyebrow, title, text, light = false }) { return <div className={`section-head ${light ? 'section-head--light' : ''}`}><p className="eyebrow"><i />{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</div> }

export function ButtonLink({ to, children, light = false }) { return <Link className={`button ${light ? 'button--light' : 'button--gold'}`} to={to}>{children}<ArrowRight size={17} /></Link> }

export function CTA({ title = 'Let’s make your next move count.', text = 'Tell us what you are working toward. We will listen, understand the challenge and help you explore a practical next step.' }) {
  return <section className="cta-section"><div className="container cta-inner"><div><p className="eyebrow"><i />A thoughtful place to start</p><h2>{title}</h2><p>{text}</p></div><ButtonLink to="/contact">Start a conversation</ButtonLink><ArrowDownRight className="cta-mark" size={150} strokeWidth={0.6} /></div></section>
}

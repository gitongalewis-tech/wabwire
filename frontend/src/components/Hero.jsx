import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, Bot, ChevronLeft, ChevronRight, Code2, Compass, Database, Layers3, MapPin, Smartphone, Sparkles, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SocialIcon, socials } from './Site.jsx'

const slides = [
  { theme: 'software', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=88', kicker: 'Websites · apps · software', titleStart: 'We build', titlePhrases: ['websites', 'mobile apps', 'business systems', 'AI tools'], body: 'Digital products shaped around your business.', action: 'Get a website quote', href: '/contact' },
  { theme: 'network', image: 'https://images.unsplash.com/photo-1776039324982-449086984ceb?auto=format&fit=crop&w=2200&q=88', kicker: 'Network marketing · digital growth', titleStart: 'Grow your', titlePhrases: ['community.', 'network.', 'business.'], body: 'People-powered growth, with digital tools to help.', action: 'Explore digital growth', href: '/services/social-media' },
  { theme: 'safari', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2200&q=88', kicker: 'Kenya safaris · worldwide travel', titleStart: 'Find your', titlePhrases: ['next adventure.', 'Kenya safari.', 'wild somewhere.'], body: 'Thoughtfully planned journeys, near and far.', action: 'Plan your safari', href: '/services/tourism' },
]

export default function Hero() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [direction, setDirection] = useState('next')
  const [typing, setTyping] = useState({ theme: slides[0].theme, text: slides[0].titlePhrases[0] })
  const slide = slides[active]
  const changeSlide = step => {
    setDirection(step > 0 ? 'next' : 'prev')
    setActive(index => (index + step + slides.length) % slides.length)
  }
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setInterval(() => changeSlide(1), 7000)
    return () => window.clearInterval(timer)
  }, [paused])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyping({ theme: slide.theme, text: slide.titlePhrases[0] })
      return undefined
    }
    let phraseIndex = 0
    let characterIndex = 0
    let deleting = false
    let timer
    setTyping({ theme: slide.theme, text: '' })
    const tick = () => {
      const phrase = slide.titlePhrases[phraseIndex]
      characterIndex += deleting ? -1 : 1
      setTyping({ theme: slide.theme, text: phrase.slice(0, characterIndex) })
      let delay = deleting ? 34 : 76
      if (!deleting && characterIndex >= phrase.length) { deleting = true; delay = 1250 }
      else if (deleting && characterIndex <= 0) { deleting = false; phraseIndex = (phraseIndex + 1) % slide.titlePhrases.length; delay = 220 }
      timer = window.setTimeout(tick, delay)
    }
    timer = window.setTimeout(tick, 360)
    return () => window.clearTimeout(timer)
  }, [slide])
  const typedTitle = typing.theme === slide.theme ? typing.text : ''
  return <section className={`hero hero--studio hero--${slide.theme} hero--transition-${direction}`} aria-label="Wabwire services" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    <div className="hero-backdrops" aria-hidden="true">{slides.map((item, index) => <div key={item.theme} className={`hero-backdrop ${index === active ? 'is-active' : ''}`} style={item.image ? { backgroundImage: `url("${item.image}")` } : undefined}/>)}</div>
    <div className="hero-atmosphere" aria-hidden="true"><span className="hero-glow"/><span className="hero-grid-plane"/></div>
    <div key={`transition-${active}`} className={`hero-transition-flare hero-transition-flare--${direction}`} aria-hidden="true"/>
    <div className="container hero-content">
      <div className="hero-copy" key={slide.theme}>
        <p className="eyebrow eyebrow--light"><i />{slide.kicker}</p>
        <h1><span className="hero-title-prefix">{slide.titleStart}</span> <em><span className="hero-typed-phrase">{typedTitle}</span><i className="hero-type-cursor" aria-hidden="true"/></em></h1>
        <p className="hero-description">{slide.body}</p>
        <div className="hero-actions"><Link className="button button--gold" to={slide.href}>{slide.action} <ArrowUpRight size={17}/></Link><Link className="hero-secondary" to="/register">Join Wabwire <span><ArrowDown size={15}/></span></Link></div>
        {active === 0 && <div className="hero-capabilities" aria-label="Software services"><span><Code2/>Websites</span><span><Smartphone/>Apps</span><span><Database/>Systems</span><span><Bot/>AI</span></div>}
      </div>
      {active === 0 && <div className="hero-scene" aria-hidden="true">
        <div className="hero-orbit-plane"><span/><span/><span/></div>
        <div className="hero-cube"><div className="cube-face cube-front"><Layers3 size={37}/><b>W</b><small>IDEA → IMPACT</small></div><div className="cube-face cube-back"/><div className="cube-face cube-left"><Code2 size={28}/></div><div className="cube-face cube-right"><Sparkles size={28}/></div><div className="cube-face cube-top"/><div className="cube-face cube-bottom"/></div>
        <div className="hero-float-card hero-code-card"><span className="card-dots"><i/><i/><i/></span><small> wabwire / product.tsx</small><code><b>01</b> &lt;Build<span>WithPurpose</span> /&gt;</code><code><b>02</b> solutions<span>.scale</span>()</code><i className="code-cursor"/></div>
        <div className="hero-float-card hero-stack-card"><span className="stack-icon"><Database/></span><span><small>CONNECTED SYSTEMS</small><b>One clear workflow</b></span><span className="stack-status">LIVE</span></div>
        <div className="hero-float-card hero-ai-card"><span className="ai-spark"><Sparkles/></span><span><small>AI INTEGRATION</small><b>More time for growth</b></span></div>
      </div>}
      {active === 1 && <div className="hero-network-scene" aria-hidden="true"><svg className="network-connectors" viewBox="0 0 600 500" fill="none"><path d="M300 250 280 94M300 250 548 252M300 250 416 427M300 250 82 297M280 94 548 252M548 252 416 427M416 427 82 297M82 297 280 94"/><path className="network-pulse" d="M300 250 280 94M300 250 548 252M300 250 416 427M300 250 82 297"/></svg><div className="network-center"><UsersRound/><span>ONE COMMUNITY</span></div><span className="network-node network-node--one"><b>TEAM</b></span><span className="network-node network-node--two"><b>CLIENTS</b></span><span className="network-node network-node--three"><b>GROWTH</b></span><span className="network-node network-node--four"><b>REACH</b></span><div className="network-tag"><Sparkles/><span>People-powered<br/><b>business growth</b></span></div></div>}
      {active === 2 && <div className="hero-travel-scene" aria-hidden="true"><div className="travel-route travel-route--one"/><div className="travel-route travel-route--two"/><div className="travel-destination travel-destination--one"><MapPin/><span>MASAI MARA<small>KENYA · WILD HEART</small></span></div><div className="travel-destination travel-destination--two"><Compass/><span>YOUR NEXT STORY<small>PLANNED WITH CARE</small></span></div><span className="travel-coordinate">01° 24′ S &nbsp; 35° 00′ E</span></div>}
      <div className="hero-controls" aria-label="Choose a hero slide"><div className="hero-dots">{slides.map((item, index) => <button key={item.theme} className={index === active ? 'active' : ''} aria-label={`Show ${item.theme} slide`} aria-current={index === active ? 'true' : undefined} onClick={() => { if (index !== active) changeSlide((index - active + slides.length) % slides.length <= 1 ? 1 : -1) }}/>)}</div></div>
      <nav className="hero-social-links" aria-label="Wabwire social media">{socials.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name === 'WhatsApp' ? 'WhatsApp Wabwire' : `Wabwire on ${name}`} title={name}><SocialIcon name={name}/></a>)}</nav>
      <button className="hero-arrow-button hero-arrow-button--prev" type="button" aria-label="Previous slide" onClick={() => changeSlide(-1)}><ChevronLeft aria-hidden="true"/></button>
      <button className="hero-arrow-button hero-arrow-button--next" type="button" aria-label="Next slide" onClick={() => changeSlide(1)}><ChevronRight aria-hidden="true"/></button>
    </div>
  </section>
}

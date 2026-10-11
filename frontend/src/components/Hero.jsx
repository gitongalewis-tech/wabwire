import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const slides = [
  { image: 'https://images.pexels.com/photos/38649010/pexels-photo-38649010.jpeg?auto=compress&cs=tinysrgb&w=2200', alt: 'Business professionals working together in a bright office', kicker: 'A future built around people', title: <>Building opportunities.<br /><em>Growing together.</em></>, body: 'A Kenyan innovation company connecting technology, business growth, learning and meaningful experiences.', action: 'Discover Wabwire', to: '/about', position: 'center 46%' },
  { image: 'https://images.pexels.com/photos/7689637/pexels-photo-7689637.jpeg?auto=compress&cs=tinysrgb&w=2200', alt: 'Two Black African women working with laptops in a modern office', kicker: 'Ideas become stronger together', title: <>Connect. Learn.<br /><em>Build. Grow.</em></>, body: 'We bring practical services and knowledge together to help people and organisations move forward.', action: 'Explore our services', to: '/services', position: 'center 42%' },
  { image: 'https://images.pexels.com/photos/30690402/pexels-photo-30690402.jpeg?auto=compress&cs=tinysrgb&w=2200', alt: 'Colleagues discussing a project around a laptop', kicker: 'Innovation with purpose', title: <>Ideas into<br /><em>possibility.</em></>, body: 'Thoughtful digital solutions, business development and travel support for a changing world.', action: 'Start a conversation', to: '/contact', position: 'center 48%' },
]

export default function Hero() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => setActive(value => (value + 1) % slides.length), 6500)
    return () => clearInterval(id)
  }, [paused])
  useEffect(() => {
    const warmNextSlide = () => { const image = new Image(); image.src = slides[(active + 1) % slides.length].image }
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warmNextSlide, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(warmNextSlide, 1200)
    return () => window.clearTimeout(id)
  }, [active])
  const slide = slides[active]
  return <section className="hero" aria-roledescription="carousel" aria-label="Wabwire introduction" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    <div className="container hero-content">
      <div className="hero-copy" key={active}><p className="eyebrow eyebrow--light"><i />{slide.kicker}</p><h1>{slide.title}</h1><p className="hero-description">{slide.body}</p><div className="hero-actions"><Link className="button button--gold" to={slide.to}>{slide.action}</Link><Link className="hero-secondary" to="/services">Explore what we do</Link></div></div>
      <div className="hero-meta"><span>KENYA <b>·</b> CONNECTED TO THE WORLD</span><span>WABWIRE GLOBAL INNOVATIONS</span></div>
    </div>
    {slides.map((item, index) => <div key={item.image} className={`hero-slide ${index === active ? 'is-active' : ''}`} aria-hidden="true" style={index === active ? { '--slide-image': `url("${item.image}")`, '--slide-position': item.position } : undefined} />)}
    <div className="hero-shade" />
    <div className="hero-controls" aria-label="Hero slides">
      <div className="hero-dots">{slides.map((item, index) => <button key={item.image} className={index === active ? 'active' : ''} aria-label={`Show slide ${index + 1}: ${item.kicker}`} aria-current={index === active ? 'true' : undefined} onClick={() => setActive(index)} />)}</div>
    </div>
  </section>
}

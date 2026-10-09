import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const slides = [
  { image: 'https://images.pexels.com/photos/38649010/pexels-photo-38649010.jpeg?auto=compress&cs=tinysrgb&w=2200', alt: 'African business professionals collaborating in a Kaduna office', kicker: 'A future built around people', title: <>Building opportunities.<br /><em>Growing together.</em></>, body: 'A Kenyan innovation company connecting technology, business growth, learning and meaningful experiences.', action: 'Discover Wabwire', to: '/about', position: 'center 46%' },
  { image: 'https://images.pexels.com/photos/7689637/pexels-photo-7689637.jpeg?auto=compress&cs=tinysrgb&w=2200', alt: 'Two Black African women working with laptops in a modern office', kicker: 'Ideas become stronger together', title: <>Connect. Learn.<br /><em>Build. Grow.</em></>, body: 'We bring practical services and knowledge together to help people and organisations move forward.', action: 'Explore our services', to: '/services', position: 'center 42%' },
  { image: 'https://images.pexels.com/photos/30690402/pexels-photo-30690402.jpeg?auto=compress&cs=tinysrgb&w=2200', alt: 'African businesswomen collaborating in a Lagos office', kicker: 'Innovation with purpose', title: <>Ideas into<br /><em>possibility.</em></>, body: 'Thoughtful digital solutions, business development and travel support for a changing world.', action: 'Start a conversation', to: '/contact', position: 'center 48%' },
]

export default function Hero() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => setActive(value => (value + 1) % slides.length), 6500)
    return () => clearInterval(id)
  }, [])
  const slide = slides[active]
  return <section className="hero" aria-roledescription="carousel" aria-label="Wabwire introduction">
    <div className="container hero-content">
      <div className="hero-copy" key={active}><p className="eyebrow eyebrow--light"><i />{slide.kicker}</p><h1>{slide.title}</h1><p className="hero-description">{slide.body}</p><div className="hero-actions"><Link className="button button--gold" to={slide.to}>{slide.action}</Link><Link className="hero-secondary" to="/services">Explore what we do</Link></div></div>
      <div className="hero-meta"><span>KENYA <b>·</b> CONNECTED TO THE WORLD</span><span>WABWIRE GLOBAL INNOVATIONS</span></div>
    </div>
    {slides.map((item, index) => <div key={item.image} className={`hero-slide ${index === active ? 'is-active' : ''}`} aria-hidden="true" style={{ '--slide-image': `url("${item.image}")`, '--slide-position': item.position }} />)}
    <div className="hero-shade" />
  </section>
}

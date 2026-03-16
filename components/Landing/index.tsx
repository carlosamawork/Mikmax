'use client'

import {useState, useEffect, useRef} from 'react'
import Image from 'next/image'
import s from './Landing.module.scss'

export default function Landing() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageLoaded(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/subscribeUser', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className={s.landing}>
      {/* Background image + overlay */}
      <div className={s.bg} aria-hidden="true">
        <Image
          src="/landing-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          ref={imgRef}
          className={[s.bgImage, imageLoaded ? s.bgImageVisible : ''].join(' ')}
          onLoad={() => setImageLoaded(true)}
        />
        <div className={[s.overlay, imageLoaded ? s.overlayVisible : ''].join(' ')} />
      </div>

      <div className={[s.content, imageLoaded ? s.contentVisible : ''].join(' ')}>
        {/* Top tagline */}
        <p className={s.tagline}>
          <strong>We make functional home textiles.</strong>
          <br />
          <br />
          No seasonal styling.
          <br />
          No decorative narrative.
          <br />
          Made in Barcelona
          <br />
          Hand made
        </p>

        {/* Logo + reconstruction text */}
        <div className={s.logoBlock}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mikmax-logo.svg"
            alt="mikmax"
            className={s.logo}
            width={753}
            height={156}
          />
          <p className={s.reconstruction}>This brand is under reconstruction.</p>
        </div>

        {/* Bottom: WhatsApp + newsletter */}
        <div className={s.bottom}>
          {/* WhatsApp CTA */}
          <div className={s.whatsapp}>
            <p className={s.contactText}>To place an order or for more info contact us here.</p>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className={s.whatsappBtn}
            >
              Whatsapp
            </a>
          </div>

          {/* Newsletter */}
          <div className={s.newsletter}>
            <div className={s.newsletterHeader}>
              <p className={s.keepInTouch}>Keep in touch</p>
              <p className={s.newsletterSubtitle}>FOR BEING PART OF THE MIKMAK WORLD</p>
            </div>
            <form onSubmit={handleSubmit} className={s.form} noValidate>
              <label htmlFor="newsletter-email" className={s.srOnly}>
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                aria-required="true"
                className={s.input}
                disabled={status === 'loading' || status === 'success'}
              />
              <button type="submit" className={s.srOnly} disabled={status === 'loading'}>
                Subscribe
              </button>
            </form>
            {status === 'success' && (
              <p className={s.successMsg} role="status">
                Thank you for subscribing!
              </p>
            )}
            {status === 'error' && (
              <p className={s.errorMsg} role="alert">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

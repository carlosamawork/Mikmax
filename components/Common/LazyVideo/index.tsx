'use client'

import {useEffect, useRef, useState} from 'react'
import LazyImage from '../LazyImage'
import styles from './LazyVideo.module.scss'

type LazyVideoProps = {
  src: string
  poster?: string
  posterAlt?: string
  className?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  playsInline?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  rootMargin?: string
}

export default function LazyVideo({
  src,
  poster,
  posterAlt = 'Video thumbnail',
  className,
  controls = false,
  autoPlay = false,
  muted = true,
  loop = true,
  playsInline = true,
  preload = 'metadata',
  rootMargin = '200px',
}: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current || isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      {root: null, rootMargin, threshold: 0.1}
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isVisible, rootMargin])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || !isVisible) return

    const isHls = src.includes('.m3u8')
    if (!isHls) {
      videoEl.src = src
      return
    }

    let hlsInstance: any

    const attachHls = async () => {
      if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = src
        return
      }

      const HlsModule = await import('hls.js')
      const Hls = HlsModule.default
      if (!Hls.isSupported()) {
        videoEl.src = src
        return
      }

      hlsInstance = new Hls({capLevelToPlayerSize: true})
      hlsInstance.loadSource(src)
      hlsInstance.attachMedia(videoEl)
    }

    void attachHls()
    return () => hlsInstance?.destroy()
  }, [isVisible, src])

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || !autoPlay || !isLoaded) return

    videoEl.muted = muted || autoPlay
    void videoEl.play().catch(() => undefined)
  }, [autoPlay, isLoaded, muted])

  return (
    <div ref={containerRef} className={[styles.wrapper, className ?? ''].filter(Boolean).join(' ')}>
      {!isLoaded && poster ? (
        <div className={styles.poster}>
          <LazyImage src={poster} alt={posterAlt} fill sizes="100vw" />
        </div>
      ) : null}

      {isVisible ? (
        <video
          ref={videoRef}
          className={[styles.video, isLoaded ? styles.isLoaded : ''].filter(Boolean).join(' ')}
          controls={controls}
          autoPlay={autoPlay}
          muted={muted || autoPlay}
          loop={loop}
          playsInline={playsInline}
          preload={preload}
          onLoadedData={() => setIsLoaded(true)}
        />
      ) : null}
    </div>
  )
}

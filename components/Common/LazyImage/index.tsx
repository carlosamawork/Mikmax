'use client'

import Image, {type ImageProps} from 'next/image'
import {useEffect, useRef, useState} from 'react'
import styles from './LazyImage.module.scss'

type LazyImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string
  alt: string
  wrapperClassName?: string
  rootMargin?: string
}

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

export default function LazyImage({
  src,
  alt,
  wrapperClassName,
  className,
  rootMargin = '200px',
  priority,
  ...imageProps
}: LazyImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(Boolean(priority))
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isVisible || !wrapperRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      {root: null, rootMargin, threshold: 0.1}
    )

    observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [isVisible, rootMargin])

  const imageClassName = [
    styles.image,
    isLoaded ? styles.isLoaded : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={wrapperRef} className={[styles.wrapper, wrapperClassName ?? ''].filter(Boolean).join(' ')}>
      {isVisible ? (
        <Image
          {...imageProps}
          src={src}
          alt={alt}
          priority={priority}
          className={imageClassName}
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        <Image
          {...imageProps}
          src={TRANSPARENT_PIXEL}
          alt=""
          aria-hidden
          className={styles.placeholder}
          unoptimized
        />
      )}
    </div>
  )
}

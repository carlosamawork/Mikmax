'use client'
import {usePathname} from 'next/navigation'
import Footer from './Footer'
import type {FooterProps} from '@/types/footer'

// Routes where the global footer should NOT render.
const HIDDEN_PREFIXES = ['/products/']

export default function FooterGate(props: FooterProps) {
  const pathname = usePathname()
  if (pathname && HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null
  return <Footer {...props} />
}

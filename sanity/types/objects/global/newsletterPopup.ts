export type NewsletterPopup = {
  enabled?: boolean
  image?: {imageUrl?: string | null; alt?: string | null}
  heading?: string
  legalText?: string
  delaySeconds?: number
}

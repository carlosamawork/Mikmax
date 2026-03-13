export {}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    pintrk?: {
      (...args: unknown[]): void
      queue: unknown[]
      version: string
    }
    hj?: (...args: unknown[]) => void
    _hjSettings?: {
      hjid: number
      hjsv: number
    }
  }
}

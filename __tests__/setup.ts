import {vi} from 'vitest'

// react.cache is a React Server Component API — not available in node environment.
// Stub it as an identity function so modules that import it can be tested in node.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  }
})

import type {Customer} from '@/types/account'

// True si el customer está validado como B2B (metafield b2b.validated === 'true').
export function isB2bApproved(customer: Customer | null | undefined): boolean {
  return customer?.b2bValidated?.value === 'true'
}

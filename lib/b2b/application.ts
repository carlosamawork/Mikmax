import 'server-only'
import {sanityWriteClient} from '@/lib/sanityWriteClient'
import type {B2bRegisterInput, B2bStatus, B2bCompanyInfo} from '@/types/b2b'

interface CreateArgs {
  input: B2bRegisterInput
  status: B2bStatus
  validationScore: number
  internalNotes?: string
  shopifyCustomerId?: string
}

// Crea el documento b2bApplication. NUNCA persiste la contraseña.
export async function createB2bApplication(args: CreateArgs): Promise<{_id: string}> {
  const {input, status, validationScore, internalNotes, shopifyCustomerId} = args
  const now = new Date().toISOString()
  const doc = {
    _type: 'b2bApplication',
    applicantName: input.legalCompanyName,
    companyName: input.legalCompanyName,
    vatNumber: input.vatNumber,
    country: input.country,
    corporateEmail: input.corporateEmail,
    companyWebsite: input.companyWebsite || undefined,
    fiscalAddress: input.fiscalAddress,
    status,
    validationScore,
    internalNotes: internalNotes || undefined,
    shopifyCustomerId: shopifyCustomerId || undefined,
    createdAt: now,
    updatedAt: now,
  }
  const created = await sanityWriteClient.create(doc)
  return {_id: created._id}
}

// Actualiza estado + campos al aprobar/rechazar/pedir info desde el panel admin.
export async function updateB2bApplication(
  id: string,
  patch: {status?: B2bStatus; shopifyCustomerId?: string; internalNotes?: string},
): Promise<void> {
  await sanityWriteClient
    .patch(id)
    .set({...patch, updatedAt: new Date().toISOString()})
    .commit()
}

// Lee una aplicación (para la route admin: necesita email + el flag adminAction).
export async function getB2bApplication(id: string) {
  return sanityWriteClient.fetch(
    `*[_type == "b2bApplication" && _id == $id][0]{
      _id, corporateEmail, companyName, country, status, shopifyCustomerId, adminAction
    }`,
    {id},
  )
}

// Datos de empresa de un cliente B2B aprobado (para mostrar en su perfil de cuenta).
export async function getB2bCompanyInfo(shopifyCustomerId: string): Promise<B2bCompanyInfo | null> {
  return sanityWriteClient.fetch(
    `*[_type == "b2bApplication" && shopifyCustomerId == $id && status == "approved"][0]{
      companyName, vatNumber, country, fiscalAddress, companyWebsite
    }`,
    {id: shopifyCustomerId},
  )
}

// Aplica el cambio final Y limpia el flag adminAction en una sola escritura.
// Al quedar adminAction sin definir, el webhook (filtro defined(adminAction)) no se re-dispara.
export async function resolveB2bApplication(
  id: string,
  patch: {status?: B2bStatus; shopifyCustomerId?: string; internalNotes?: string},
): Promise<void> {
  await sanityWriteClient
    .patch(id)
    .set({...patch, updatedAt: new Date().toISOString()})
    .unset(['adminAction'])
    .commit()
}

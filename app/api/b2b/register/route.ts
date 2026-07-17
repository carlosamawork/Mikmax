import {NextResponse} from 'next/server'
import {B2B_ENABLED} from '@/lib/b2b/flag'
import type {B2bRegisterInput, ValidationSignals} from '@/types/b2b'
import {checkVies} from '@/lib/b2b/validation/vies'
import {checkCompaniesHouse} from '@/lib/b2b/validation/companiesHouse'
import {isCorporateEmail} from '@/lib/b2b/validation/email'
import {countryMatchesVat} from '@/lib/b2b/validation/country'
import {scoreApplication} from '@/lib/b2b/validation/score'
import {isVerifiableCountry} from '@/lib/b2b/validation/vatPrefixes'
import {createB2bApplication} from '@/lib/b2b/application'
import {createApprovedB2bCustomer} from '@/lib/b2b/shopify'
import {sendEmail} from '@/lib/b2b/email/mailgun'
import {
  approvedEmail,
  reviewEmail,
  rejectedEmail,
  internalReviewEmail,
} from '@/lib/b2b/email/templates'

export const runtime = 'nodejs'

function isValidPayload(b: Partial<B2bRegisterInput>): b is B2bRegisterInput {
  return Boolean(
    b &&
    b.country &&
    b.legalCompanyName &&
    b.vatNumber &&
    b.corporateEmail &&
    b.fiscalAddress &&
    b.password &&
    b.password.length >= 8,
  )
}

export async function POST(req: Request) {
  if (!B2B_ENABLED) return NextResponse.json({error: 'not_found'}, {status: 404})

  let input: Partial<B2bRegisterInput>
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({error: 'invalid_json'}, {status: 400})
  }
  if (!isValidPayload(input)) {
    return NextResponse.json({error: 'invalid_payload'}, {status: 400})
  }

  const country = input.country.toUpperCase()
  const verifiable = isVerifiableCountry(country)
  const isUK = country === 'GB'
  // VIES solo para UE (verificable y no UK); Companies House solo UK; resto se salta (neutral).
  const vies =
    verifiable && !isUK ? await checkVies(input.vatNumber) : {valid: false, available: false}
  const ch = isUK ? await checkCompaniesHouse(input.vatNumber) : {valid: false, available: false}

  const vatValid = vies.valid || ch.valid
  const vatServiceAvailable = isUK ? ch.available : vies.available

  const signals: ValidationSignals = {
    vatValid,
    vatServiceAvailable,
    corporateEmail: isCorporateEmail(input.corporateEmail),
    websitePresent: Boolean(input.companyWebsite),
    countryMatchesVat: countryMatchesVat(input.country, input.vatNumber),
    countryVerifiable: verifiable,
  }

  const {score, decision} = scoreApplication(signals)
  const notes = !vatServiceAvailable
    ? `Servicio de validación VAT no disponible (${isUK ? 'Companies House' : 'VIES'}) — verificar manualmente.`
    : undefined

  // --- APPROVED ---
  if (decision === 'approved') {
    const result = await createApprovedB2bCustomer({
      email: input.corporateEmail,
      password: input.password,
      companyName: input.legalCompanyName,
    })
    if (result.error || !result.customerId) {
      // Fallback seguro: no perder la solicitud → pasa a revisión.
      await createB2bApplication({
        input,
        status: 'pending',
        validationScore: score,
        internalNotes: `Auto-aprobada pero falló la creación del customer: ${result.error}. Revisar manualmente.`,
      })
      const internal = internalReviewEmail({
        companyName: input.legalCompanyName,
        vatNumber: input.vatNumber,
        country: input.country,
        corporateEmail: input.corporateEmail,
        companyWebsite: input.companyWebsite,
        fiscalAddress: input.fiscalAddress,
        score,
        notes: `create_failed: ${result.error}`,
      })
      await sendEmail({to: process.env.INTERNAL_NOTIFICATION_EMAIL || '', ...internal})
      return NextResponse.json({status: 'review'})
    }
    await createB2bApplication({
      input,
      status: 'approved',
      validationScore: score,
      shopifyCustomerId: result.customerId,
    })
    const mail = approvedEmail(input.legalCompanyName)
    await sendEmail({to: input.corporateEmail, ...mail})
    return NextResponse.json({status: 'approved'})
  }

  // --- REVIEW ---
  if (decision === 'review') {
    await createB2bApplication({
      input,
      status: 'pending',
      validationScore: score,
      internalNotes: notes,
    })
    const toCustomer = reviewEmail(input.legalCompanyName)
    await sendEmail({to: input.corporateEmail, ...toCustomer})
    const internal = internalReviewEmail({
      companyName: input.legalCompanyName,
      vatNumber: input.vatNumber,
      country: input.country,
      corporateEmail: input.corporateEmail,
      companyWebsite: input.companyWebsite,
      fiscalAddress: input.fiscalAddress,
      score,
      notes,
    })
    await sendEmail({to: process.env.INTERNAL_NOTIFICATION_EMAIL || '', ...internal})
    return NextResponse.json({status: 'review'})
  }

  // --- REJECTED ---
  await createB2bApplication({input, status: 'rejected', validationScore: score})
  const mail = rejectedEmail(input.legalCompanyName)
  await sendEmail({to: input.corporateEmail, ...mail})
  return NextResponse.json({status: 'rejected'})
}

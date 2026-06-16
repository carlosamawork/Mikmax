// Verifica los efectos del smoke test: doc en Sanity + eventos en Mailgun.
// Uso: node --env-file=.env.local scripts/b2b-verify-smoke.mjs

const PROJECT = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET
const SANITY_TOKEN = process.env.SANITY_WRITE_TOKEN
const MG_KEY = process.env.MAILGUN_API_KEY
const MG_DOMAIN = process.env.MAILGUN_DOMAIN
const MG_BASE = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'

async function sanityRecent() {
  const q = encodeURIComponent(
    `*[_type=="b2bApplication"]|order(createdAt desc)[0...3]{companyName,status,validationScore,corporateEmail,vatNumber,shopifyCustomerId,createdAt}`,
  )
  const url = `https://${PROJECT}.api.sanity.io/v2023-05-17/data/query/${DATASET}?query=${q}`
  const res = await fetch(url, {headers: {Authorization: `Bearer ${SANITY_TOKEN}`}})
  const j = await res.json()
  console.log('── Sanity · últimos b2bApplication ──')
  if (j.error) return console.log('  error:', JSON.stringify(j.error))
  for (const d of j.result ?? []) {
    console.log(
      `  • ${d.companyName} · status=${d.status} · score=${d.validationScore} · ${d.corporateEmail} · ${d.vatNumber}${d.shopifyCustomerId ? ' · cust=' + d.shopifyCustomerId : ''}`,
    )
  }
  if (!(j.result ?? []).length) console.log('  (ninguno)')
}

async function mailgunEvents() {
  const auth = Buffer.from(`api:${MG_KEY}`).toString('base64')
  const url = `${MG_BASE}/v3/${MG_DOMAIN}/events?limit=10&recipient=carlosisalvador@gmail.com`
  const res = await fetch(url, {headers: {Authorization: `Basic ${auth}`}})
  console.log(`\n── Mailgun · eventos recientes (${MG_DOMAIN}) ──`)
  if (!res.ok) return console.log(`  HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const j = await res.json()
  const items = j.items ?? []
  if (!items.length) return console.log('  (sin eventos — ¿dominio sin verificar o sin envíos aún?)')
  for (const it of items) {
    console.log(
      `  • ${it.event} → ${it.recipient} · ${it.message?.headers?.subject ?? ''} ${it.reason ? '· reason=' + it.reason : ''}`,
    )
  }
}

await sanityRecent()
await mailgunEvents().catch((e) => console.log('  Mailgun error:', e.message))

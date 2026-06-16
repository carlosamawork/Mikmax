// Simula el webhook firmado de Sanity contra /api/b2b/admin (Sanity no puede llamar a localhost).
// Uso: node --env-file=.env.local scripts/b2b-webhook-test.mjs <docId> <approve|reject|more_info>
import {createHmac} from 'node:crypto'

const [, , DOC_ID, ACTION = 'approve'] = process.argv
const SECRET = process.env.SANITY_B2B_WEBHOOK_SECRET
const P = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DS = process.env.NEXT_PUBLIC_SANITY_DATASET
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (!DOC_ID) {
  console.error('Falta docId. Uso: ... b2b-webhook-test.mjs <docId> <approve|reject|more_info>')
  process.exit(1)
}

// 1. Simula el botón del panel: escribe adminAction en el doc (lo que hace b2bActions).
async function setAdminAction() {
  const res = await fetch(`https://${P}.api.sanity.io/v2023-05-17/data/mutate/${DS}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`},
    body: JSON.stringify({mutations: [{patch: {id: DOC_ID, set: {adminAction: ACTION}}}]}),
  })
  const j = await res.json()
  console.log('1) set adminAction:', res.ok ? 'ok' : JSON.stringify(j))
}

// 2. Construye y firma el payload como lo hace Sanity (@sanity/webhook).
function sign(payload) {
  const ts = Date.now()
  const hmac = createHmac('sha256', SECRET).update(`${ts}.${payload}`).digest('base64url')
  return `t=${ts},v1=${hmac}`
}

async function callWebhook() {
  const payload = JSON.stringify({_id: DOC_ID, adminAction: ACTION})
  const sig = sign(payload)
  const res = await fetch('http://localhost:3000/api/b2b/admin/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'sanity-webhook-signature': sig},
    body: payload,
  })
  console.log('2) webhook HTTP', res.status, '→', await res.text())
}

// 3. Lee el doc final.
async function readDoc() {
  const q = encodeURIComponent(`*[_id=="${DOC_ID}"][0]{status,adminAction,shopifyCustomerId}`)
  const res = await fetch(`https://${P}.api.sanity.io/v2023-05-17/data/query/${DS}?query=${q}`, {
    headers: {Authorization: `Bearer ${TOKEN}`},
  })
  console.log('3) doc final:', JSON.stringify((await res.json()).result))
}

await setAdminAction()
await callWebhook()
await new Promise((r) => setTimeout(r, 800))
await readDoc()

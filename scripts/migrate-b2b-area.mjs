// Copia b2bArea.reseller -> b2bArea.content.
// El unset de reseller/designer solo se ejecuta con --cleanup (tras desplegar la rama,
// para no romper el main en producción que aún lee esos campos).
// Uso: node --env-file=.env.local scripts/migrate-b2b-area.mjs [--cleanup]
import {createClient} from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const cleanup = process.argv.includes('--cleanup')

const doc = await client.fetch('*[_type == "b2bArea"][0]{_id, reseller, content}')
if (!doc) {
  console.log('No hay documento b2bArea — nada que migrar.')
  process.exit(0)
}
if (doc.content) {
  console.log('b2bArea.content ya existe — no se sobreescribe.')
} else if (doc.reseller) {
  await client.patch(doc._id).set({content: doc.reseller}).commit()
  console.log('Copiado reseller -> content ✓')
} else {
  console.log('b2bArea sin grupo reseller — nada que copiar.')
}

if (cleanup) {
  await client.patch(doc._id).unset(['reseller', 'designer']).commit()
  console.log('Grupos reseller/designer eliminados ✓')
} else {
  console.log('Cleanup omitido (ejecutar con --cleanup tras desplegar la rama).')
}

import 'server-only'
import {createClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '@/sanity/env'

// Cliente Sanity con token de escritura. SOLO server-side (server-only impide el import en cliente).
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
})

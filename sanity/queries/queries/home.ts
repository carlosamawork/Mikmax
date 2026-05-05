// sanity/queries/queries/home.ts
import { groq } from 'next-sanity'
import { client } from '..'
import { seo } from '../fragments/seo'

export async function getHome() {
  return client.fetch(
    groq`*[_type == "home"][0]{
      _id,
      pageBuilder
    }`,
    {},
    {next: {tags: ['home'], revalidate: 3600}},
  )
}

export async function getHomeSEO() {
  return client.fetch(
    groq`*[_type == "home"][0]{
      seo{
        ${seo}
      }
    }`,
    {},
    {next: {tags: ['home'], revalidate: 3600}},
  )
}

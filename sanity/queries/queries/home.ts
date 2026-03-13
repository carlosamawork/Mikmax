import { groq } from 'next-sanity'
import { client } from '..'
import { seo } from '../fragments/seo'
import { image } from '../fragments/image'

export async function getHome() {
    return client.fetch(
        groq`*[_type == "home"][0]{
                hero{
                    title,

                }
            }`,
        {},
        {next: {tags: ['home'], revalidate: 60}}
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
        {next: {tags: ['home'], revalidate: 60}}
    )
}

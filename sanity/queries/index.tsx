import {createClient, groq, SanityClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '../env'
import imageUrlBuilder from "@sanity/image-url";


export const client = createClient({
    projectId: projectId,
    dataset: dataset,
    useCdn: true,
    apiVersion: apiVersion,
})

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
    if (typeof source === 'string') {
        // Si 'source' es una cadena, crea el objeto necesario para ImageUrlBuilder
        return builder.image({_ref: source});
    } else {
        // Si 'source' ya es un objeto, úsalo directamente
        return builder.image(source);
    }
}



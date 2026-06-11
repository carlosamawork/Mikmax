import {revalidateTag} from 'next/cache'
import {type NextRequest, NextResponse} from 'next/server'
import {parseBody} from 'next-sanity/webhook'

type SanityWebhookBody = {
  _type?: string
  _id?: string
  slug?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const {isValidSignature, body} = await parseBody<SanityWebhookBody>(
      req,
      process.env.SANITY_REVALIDATE_SECRET,
    )

    if (!isValidSignature) {
      return NextResponse.json({message: 'Invalid signature'}, {status: 401})
    }

    if (!body?._type) {
      return NextResponse.json({message: 'Missing _type in body'}, {status: 400})
    }

    const tags: string[] = [body._type]

    if (body._type === 'product') {
      tags.push('products:ordered')
      if (body.slug) tags.push(`product:${body.slug}`)
    }

    if (body._type === 'collection') {
      tags.push('settings')
      if (body.slug) tags.push(`collection:${body.slug}`)
    }

    if (body._type === 'look') {
      if (body.slug) tags.push(`look:${body.slug}`)
    }

    if (body._type === 'page') {
      if (body.slug) tags.push(`page:${body.slug}`)
    }

    if (body._type === 'set') {
      if (body.slug) tags.push(`set:${body.slug}`)
    }

    tags.forEach((tag) => revalidateTag(tag))

    return NextResponse.json({revalidated: true, tags, now: Date.now()})
  } catch (err) {
    return NextResponse.json(
      {message: err instanceof Error ? err.message : 'Unknown error'},
      {status: 500},
    )
  }
}

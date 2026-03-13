import { NextRequest, NextResponse } from 'next/server'

type SubscribeBody = {
  email?: string
  firstName?: string
  lastName?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubscribeBody

    const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID
    const API_KEY = process.env.MAILCHIMP_API_KEY
    const DATACENTER = process.env.MAILCHIMP_API_SERVER

    if (!AUDIENCE_ID || !API_KEY || !DATACENTER) {
      return NextResponse.json(
        {status: 'error', error: 'Mailchimp environment variables are missing'},
        {status: 500}
      )
    }

    if (!body?.email) {
      return NextResponse.json({status: 'error', error: 'Missing email'}, {status: 400})
    }

    const data = {
      email_address: body.email,
      status: 'subscribed',
      merge_fields: {
        FNAME: body.firstName || '',
        LNAME: body.lastName || '',
      },
    }

    const response = await fetch(
      `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`,
      {
        method: 'POST',
        headers: {
          Authorization: `apikey ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json()
    if (response.ok) {
      return NextResponse.json({status: 200, data: result}, {status: 200})
    } else {
      return NextResponse.json({status: response.status, error: result}, {status: response.status})
    }
  } catch (error) {
    return NextResponse.json({status: 'error', error: 'Internal Server Error'}, {status: 500})
  }
}

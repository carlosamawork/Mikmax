import {describe, it, expect} from 'vitest'
import {returnRequestInternalEmail} from '@/lib/account/returnEmail'

describe('returnRequestInternalEmail', () => {
  it('escapa HTML en note y title -> sin script ni tags crudos', () => {
    const {html} = returnRequestInternalEmail({
      orderNumber: '#1001',
      customerEmail: 'cliente@example.com',
      lines: [{title: '<b>x</b>', quantity: 1, reason: 'DEFECTIVE'}],
      note: '<script>alert(1)</script>',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})

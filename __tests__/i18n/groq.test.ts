import {describe, it, expect} from 'vitest'
import {localizedField} from '@/lib/i18n/groq'

describe('localizedField', () => {
  it('builds a coalesce projection with en + raw-scalar fallback', () => {
    expect(localizedField('title')).toBe(
      '"title": coalesce(title[_key == $lang][0].value, title[_key == "en"][0].value, title)',
    )
  })

  it('supports an alias different from the field name', () => {
    expect(localizedField('seo.metaTitle', 'metaTitle')).toBe(
      '"metaTitle": coalesce(seo.metaTitle[_key == $lang][0].value, seo.metaTitle[_key == "en"][0].value, seo.metaTitle)',
    )
  })
})

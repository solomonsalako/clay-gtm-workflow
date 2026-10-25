import { describe, it, expect } from 'vitest'
import { validateLead } from '../validate'

describe('validateLead', () => {
  it('accepts a valid lead and trims whitespace', () => {
    const r = validateLead({ company: '  Acme Books  ', email: 'jo@acme.co.uk', fit: 'high' })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.company).toBe('Acme Books')
      expect(r.value.fit).toBe('high')
    }
  })

  it('requires company and email', () => {
    const r = validateLead({ fit: 'high' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errors.some(e => e.includes('company'))).toBe(true)
      expect(r.errors.some(e => e.includes('email'))).toBe(true)
    }
  })

  it('rejects a malformed email', () => {
    expect(validateLead({ company: 'A', email: 'nope' }).ok).toBe(false)
  })

  it('rejects an out-of-range fit value', () => {
    expect(validateLead({ company: 'A', email: 'a@b.co', fit: 'great' }).ok).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(validateLead('x').ok).toBe(false)
    expect(validateLead(null).ok).toBe(false)
    expect(validateLead([]).ok).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { createLeadHandler } from '../handler'
import { memoryStore } from '../store'

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://x/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const good = { company: 'Acme Books', email: 'jo@acme.co.uk', fit: 'high', opening_line: 'hi' }

describe('lead handler', () => {
  it('405 on a non-POST method', async () => {
    const h = createLeadHandler({ store: memoryStore() })
    expect((await h(new Request('http://x/api/leads'))).status).toBe(405)
  })

  it('401 when the shared secret is missing or wrong', async () => {
    const h = createLeadHandler({ store: memoryStore(), secret: 's3cret' })
    expect((await h(post(good))).status).toBe(401)
    expect((await h(post(good, { 'x-clay-secret': 'nope' }))).status).toBe(401)
  })

  it('400 on invalid JSON', async () => {
    const h = createLeadHandler({ store: memoryStore() })
    expect((await h(post('{not json'))).status).toBe(400)
  })

  it('400 on validation failure, with a details array', async () => {
    const h = createLeadHandler({ store: memoryStore() })
    const res = await h(post({ fit: 'high' }))
    expect(res.status).toBe(400)
    expect(Array.isArray((await res.json()).details)).toBe(true)
  })

  it('201 and stores the row on success', async () => {
    const store = memoryStore()
    const h = createLeadHandler({ store, secret: 's3cret' })
    const res = await h(post(good, { 'x-clay-secret': 's3cret' }))
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBeTruthy()
    expect((await store.list()).length).toBe(1)
  })
})

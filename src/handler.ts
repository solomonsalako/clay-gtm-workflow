// The HTTP handler, as a Web-standard Request -> Response function so it drops
// into Vercel, Cloudflare Workers, Deno, Bun or a plain Node server without
// change. Same portability choice as kelo-mcp.
//
// Contract: POST only, optional shared-secret header, JSON body validated
// before anything is stored. Reads nothing back to the caller beyond the id.

import { validateLead } from './validate'
import type { LeadStore } from './store'

export interface HandlerConfig {
  store: LeadStore
  /** When set, requests must carry a matching x-clay-secret header. */
  secret?: string
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function createLeadHandler({ store, secret }: HandlerConfig) {
  return async function handle(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return json(405, { error: 'Method not allowed. POST an enriched lead.' })
    }
    if (secret) {
      const got = req.headers.get('x-clay-secret')
      if (got !== secret) return json(401, { error: 'Invalid or missing x-clay-secret.' })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return json(400, { error: 'Invalid JSON body.' })
    }

    const result = validateLead(body)
    if (!result.ok) {
      return json(400, { error: 'Validation failed.', details: result.errors })
    }

    try {
      const saved = await store.save(result.value)
      return json(201, { id: saved.id, received_at: saved.received_at })
    } catch (e) {
      return json(502, { error: 'Store write failed.', detail: (e as Error).message })
    }
  }
}

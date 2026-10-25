// The storage seam. The handler depends on this interface, not on a database,
// so it runs out of the box against an in-memory store and swaps to Supabase
// by setting two env vars. Same pattern as kelo-mcp's injected backend.
//
// The Supabase adapter talks to the REST API over fetch, so this package keeps
// zero runtime dependencies.

import type { Lead } from './validate'

export interface StoredLead extends Lead {
  id: string
  received_at: string
}

export interface LeadStore {
  save(lead: Lead): Promise<StoredLead>
  list(): Promise<StoredLead[]>
}

function stamp(lead: Lead): StoredLead {
  return { ...lead, id: crypto.randomUUID(), received_at: new Date().toISOString() }
}

/** In-memory store. Perfect for the demo and the tests; does not persist. */
export function memoryStore(): LeadStore {
  const rows: StoredLead[] = []
  return {
    async save(lead) {
      const row = stamp(lead)
      rows.push(row)
      return row
    },
    async list() {
      return [...rows]
    },
  }
}

export interface SupabaseOpts {
  url: string
  key: string
  table?: string
}

/** Supabase REST adapter over fetch. No SDK, no runtime dependency. */
export function supabaseStore({ url, key, table = 'leads' }: SupabaseOpts): LeadStore {
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${table}`
  const headers = {
    'content-type': 'application/json',
    apikey: key,
    authorization: `Bearer ${key}`,
    prefer: 'return=representation',
  }
  return {
    async save(lead) {
      const row = stamp(lead)
      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(row) })
      if (!res.ok) throw new Error(`Supabase insert failed: ${res.status} ${await res.text()}`)
      return row
    },
    async list() {
      const res = await fetch(`${endpoint}?select=*&order=received_at.desc`, { headers })
      if (!res.ok) throw new Error(`Supabase list failed: ${res.status}`)
      return (await res.json()) as StoredLead[]
    },
  }
}

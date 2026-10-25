// Vercel entry point. Deploys as an Edge Function at /api/leads with zero
// config: `vercel` and you have a public URL for Clay to POST to.
//
// Storage is chosen from the environment: set SUPABASE_URL + SUPABASE_SERVICE_KEY
// to persist, otherwise it uses the in-memory store (fine for a quick demo, but
// note each Edge invocation is isolated so in-memory rows do not persist).

export const config = { runtime: 'edge' }

import { createLeadHandler } from '../src/handler'
import { memoryStore, supabaseStore } from '../src/store'

const store =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? supabaseStore({
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_KEY,
        table: process.env.LEADS_TABLE ?? 'leads',
      })
    : memoryStore()

const handle = createLeadHandler({ store, secret: process.env.CLAY_SECRET })

export default function (req: Request): Promise<Response> {
  return handle(req)
}

// Local dev server. Adapts Node's http server to the Web-standard handler so
// the same code that runs on Vercel runs on your machine for the Loom.
//   npm run dev   ->   http://localhost:8788/api/leads

import { createServer } from 'node:http'
import { createLeadHandler } from '../src/handler'
import { memoryStore } from '../src/store'

const handle = createLeadHandler({ store: memoryStore(), secret: process.env.CLAY_SECRET })
const port = Number(process.env.PORT ?? 8788)

createServer(async (nreq, nres) => {
  const chunks: Buffer[] = []
  for await (const c of nreq) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks)

  const headers = new Headers()
  for (const [k, v] of Object.entries(nreq.headers)) {
    if (typeof v === 'string') headers.set(k, v)
    else if (Array.isArray(v)) headers.set(k, v.join(', '))
  }

  const req = new Request(`http://localhost:${port}${nreq.url ?? '/'}`, {
    method: nreq.method,
    headers,
    body: raw.length ? raw : undefined,
  })

  const res = await handle(req)
  nres.statusCode = res.status
  res.headers.forEach((value, key) => nres.setHeader(key, value))
  nres.end(await res.text())
}).listen(port, () => {
  console.log(`clay-gtm-workflow listening on http://localhost:${port}/api/leads`)
})

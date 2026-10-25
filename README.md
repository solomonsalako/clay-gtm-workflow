# clay-gtm-workflow

![tests: 10 passing](https://img.shields.io/badge/tests-10%20passing-brightgreen)
![runtime deps: 0](https://img.shields.io/badge/runtime%20deps-0-blue)
![licence: MIT](https://img.shields.io/badge/licence-MIT-black)

The sync endpoint for a Clay go-to-market workflow. Clay enriches a company, finds and verifies a contact, scores fit and drafts an opening line with an AI column, then POSTs the finished record here. This endpoint validates it, checks a shared secret, and stores it.

No runtime dependencies. The handler is a Web-standard `Request -> Response` function, so the same code runs on Vercel, Cloudflare Workers, Deno, Bun or a plain Node server. Storage is behind an interface: it runs out of the box against an in-memory store and swaps to Supabase with two env vars. Same design choices as [kelo-mcp](https://github.com/solomonsalako/kelo-mcp): hand-rolled, portable, tested.

## Run it in 30 seconds

```bash
npm install
npm run dev
```

```bash
curl -s localhost:8788/api/leads \
  -H 'content-type: application/json' \
  -d '{"company":"Acme Bookkeeping","domain":"acme.co.uk","person_name":"Jo Lee","email":"jo@acme.co.uk","email_status":"valid","fit":"high","fit_reason":"SMB clients on Xero","opening_line":"Saw your Xero-first bookkeeping for trades."}'
```

```json
{ "id": "7b6f...", "received_at": "2026-10-25T12:00:00.000Z" }
```

## What it does

| Step | Behaviour |
|---|---|
| Method guard | Anything but POST returns 405 |
| Auth | If `CLAY_SECRET` is set, requests must carry a matching `x-clay-secret` header, else 401 |
| Validation | Body must be JSON with a `company` and a valid `email`; `fit` must be high/medium/low; bad input returns 400 with a `details` array |
| Store | Valid rows get an id and timestamp and are saved; returns 201 |

Payload fields: `company` (required), `email` (required), `domain`, `person_name`, `title`, `email_status`, `fit`, `fit_reason`, `opening_line`, `software_signal`.

## Wiring Clay to it

Add an **HTTP API** column in Clay as the last step of the table:
- Method `POST`, URL `https://<your-deploy>/api/leads`
- Headers: `content-type: application/json` and `x-clay-secret: <your secret>`
- Body: map the Clay columns to the field names above.

## Persisting to Supabase

Set two env vars and the same code persists instead of holding rows in memory:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role key>
```

Create the table:

```sql
create table leads (
  id uuid primary key,
  company text not null,
  domain text,
  person_name text,
  title text,
  email text not null,
  email_status text,
  fit text,
  fit_reason text,
  opening_line text,
  software_signal text,
  received_at timestamptz not null
);
```

The Supabase adapter uses the REST API over `fetch`, so it adds no dependency.

## Deploy

```bash
vercel
```

`api/leads.ts` deploys as an Edge Function at `/api/leads` with no config. Set `CLAY_SECRET` (and the Supabase vars, to persist) in the Vercel project settings. Note: with the in-memory store each Edge invocation is isolated, so use Supabase for anything you want to keep.

## Layout

```
src/validate.ts   Payload validation. Pure, no I/O, no framework.
src/store.ts       The storage seam: in-memory + a Supabase-over-fetch adapter.
src/handler.ts     The Web-standard POST handler: method, auth, validate, store.
api/leads.ts       Vercel Edge entry point; picks the store from the environment.
scripts/dev.ts     Local Node server adapting http to the Web handler.
```

## Tests

```bash
npm test
```

10 tests, no network and no database: validation edge cases, and the handler's 405 / 401 / 400 / 201 paths against the in-memory store.

## Licence

MIT

// Payload validation for an enriched lead coming from Clay. Pure and testable:
// no I/O, no framework. Returns either a clean Lead or a list of human-readable
// errors so the HTTP layer can answer 400 with something useful.

export interface Lead {
  company: string
  domain?: string
  person_name?: string
  title?: string
  email: string
  email_status?: string
  fit?: 'high' | 'medium' | 'low'
  fit_reason?: string
  opening_line?: string
  software_signal?: string
}

export type ValidationResult =
  | { ok: true; value: Lead }
  | { ok: false; errors: string[] }

const FIT = new Set(['high', 'medium', 'low'])
// Deliberately permissive: enough to catch junk, not a full RFC validator.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}

export function validateLead(input: unknown): ValidationResult {
  const errors: string[] = []
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: ['Body must be a JSON object.'] }
  }
  const b = input as Record<string, unknown>

  const company = str(b.company)
  if (!company) errors.push('company is required.')

  const email = str(b.email)
  if (!email) errors.push('email is required.')
  else if (!EMAIL.test(email)) errors.push('email is not a valid address.')

  const fitRaw = str(b.fit)
  if (fitRaw && !FIT.has(fitRaw)) errors.push('fit must be one of: high, medium, low.')

  if (errors.length) return { ok: false, errors }

  return {
    ok: true,
    value: {
      company: company!,
      email: email!,
      domain: str(b.domain),
      person_name: str(b.person_name),
      title: str(b.title),
      email_status: str(b.email_status),
      fit: fitRaw as Lead['fit'],
      fit_reason: str(b.fit_reason),
      opening_line: str(b.opening_line),
      software_signal: str(b.software_signal),
    },
  }
}

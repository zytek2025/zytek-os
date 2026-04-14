export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') return ''
  
  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .trim()
}

export function sanitizeNumeric(input: unknown): number {
  const num = Number(input)
  if (isNaN(num) || !isFinite(num)) return 0
  return num
}

export function sanitizeBoolean(input: unknown): boolean {
  if (typeof input === 'boolean') return input
  if (typeof input === 'string') return input === 'true' || input === '1'
  return Boolean(input)
}

export function sanitizeUUID(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(input) ? input : null
}

export function sanitizeArray<T>(input: unknown[], validator: (item: unknown) => T | null): T[] {
  if (!Array.isArray(input)) return []
  return input.map(validator).filter((item): item is T => item !== null)
}

export function sanitizeObject<T extends Record<string, unknown>>(
  input: unknown,
  schema: Record<keyof T, (val: unknown) => unknown>
): Partial<T> {
  if (typeof input !== 'object' || input === null) return {} as Partial<T>
  
  const result: Record<string, unknown> = {}
  for (const [key, validator] of Object.entries(schema)) {
    const value = (input as Record<string, unknown>)[key]
    const sanitized = validator(value)
    if (sanitized !== null && sanitized !== undefined) {
      result[key] = sanitized
    }
  }
  return result as Partial<T>
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function escapeJsonString(unsafe: string): string {
  return unsafe
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\x00-\x1F]/g, '')
}

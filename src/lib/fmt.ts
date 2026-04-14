// ── Formatting utilities — same as HTML version but TypeScript ──
export const money = (v: number) => '$' + parseFloat(String(v || 0)).toFixed(2)

export const bs = (v: number, tasa: number) =>
  (v * tasa).toLocaleString('es-VE', { maximumFractionDigits: 2 }) + ' Bs'

export const genId = (prefix = '') =>
  prefix + String(Date.now()).slice(-6) + Math.random().toString(36).slice(2, 5)

export const simpleHash = (str: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}

export const formatDate = (d: string | Date, locale = 'es-VE') =>
  new Date(d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatTime = (d: string | Date, locale = 'es-VE') =>
  new Date(d).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

export const clsx = (...classes: (string | undefined | false | null)[]) =>
  classes.filter(Boolean).join(' ')

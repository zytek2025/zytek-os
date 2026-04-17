export const PAIS_CONFIG = {
  ve: { nombre: 'Venezuela', emoji: '🇻🇪', moneda: 'VES', simbolo: 'Bs',   dual: true,  tasaLabel: 'TASA BCV', tasaDefault: 36.50 },
  ar: { nombre: 'Argentina', emoji: '🇦🇷', moneda: 'ARS', simbolo: '$ARS', dual: true,  tasaLabel: 'TC ARS',   tasaDefault: 1000 },
  mx: { nombre: 'México',    emoji: '🇲🇽', moneda: 'MXN', simbolo: 'MXN',  dual: false, tasaLabel: '',         tasaDefault: 1 },
  co: { nombre: 'Colombia',  emoji: '🇨🇴', moneda: 'COP', simbolo: 'COP',  dual: false, tasaLabel: '',         tasaDefault: 1 },
  pe: { nombre: 'Perú',      emoji: '🇵🇪', moneda: 'PEN', simbolo: 'PEN',  dual: false, tasaLabel: '',         tasaDefault: 1 },
  us: { nombre: 'USA/EC/PA', emoji: '🇺🇸', moneda: 'USD', simbolo: '$',    dual: false, tasaLabel: '',         tasaDefault: 1 },
} as const

export type PaisId = keyof typeof PAIS_CONFIG

export const PAISES_LIST: Array<{ id: PaisId; nombre: string; emoji: string; moneda: string }> =
  (Object.keys(PAIS_CONFIG) as PaisId[]).map(id => ({
    id,
    nombre: PAIS_CONFIG[id].nombre,
    emoji: PAIS_CONFIG[id].emoji,
    moneda: PAIS_CONFIG[id].moneda,
  }))

export function getPaisCfg(id: string | null | undefined) {
  if (id && id in PAIS_CONFIG) return PAIS_CONFIG[id as PaisId]
  return PAIS_CONFIG.ve
}

const PAIS_STORAGE_KEY = 'zk_pais_actual'
const TASA_STORAGE_KEY = 'zk_tasa_actual'

export function readPaisLocal(): PaisId {
  if (typeof window === 'undefined') return 've'
  const v = window.localStorage.getItem(PAIS_STORAGE_KEY)
  return (v && v in PAIS_CONFIG) ? (v as PaisId) : 've'
}

export function writePaisLocal(id: PaisId) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PAIS_STORAGE_KEY, id)
  window.dispatchEvent(new CustomEvent('zk:pais-change', { detail: id }))
}

export function readTasaLocal(): number | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(TASA_STORAGE_KEY)
  const n = v ? parseFloat(v) : NaN
  return Number.isFinite(n) ? n : null
}

export function writeTasaLocal(n: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TASA_STORAGE_KEY, String(n))
  window.dispatchEvent(new CustomEvent('zk:tasa-change', { detail: n }))
}

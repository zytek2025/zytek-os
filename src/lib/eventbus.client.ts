// ═══════════════════════════════════════════════════════════════
//  EventBus — client-side
//  BroadcastChannel entre pestañas + localStorage fallback
// ═══════════════════════════════════════════════════════════════
type Handler = (payload: unknown, msg: BusMessage) => void

interface BusMessage {
  event:   string
  payload: unknown
  ts:      number
  src:     string
}

class EventBusClass {
  private handlers: Map<string, Handler[]> = new Map()
  private channel:  BroadcastChannel | null = null

  init() {
    try {
      this.channel = new BroadcastChannel('zytek_bus')
      this.channel.onmessage = e => this._dispatch(e.data)
    } catch { /* Safari < 15.4 */ }
    window.addEventListener('storage', e => {
      if (e.key?.startsWith('zytek_bus_') && e.newValue) {
        try { this._dispatch(JSON.parse(e.newValue)) } catch {}
      }
    })
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, [])
    this.handlers.get(event)!.push(handler)
    return () => {
      const list = this.handlers.get(event) ?? []
      this.handlers.set(event, list.filter(h => h !== handler))
    }
  }

  emit(event: string, payload: unknown, src = 'app') {
    const msg: BusMessage = { event, payload, ts: Date.now(), src }
    this._dispatch(msg)
    this.channel?.postMessage(msg)
    try {
      localStorage.setItem(`zytek_bus_${event}`, JSON.stringify(msg))
      setTimeout(() => localStorage.removeItem(`zytek_bus_${event}`), 2000)
    } catch {}
  }

  private _dispatch(msg: BusMessage) {
    const handlers  = this.handlers.get(msg.event) ?? []
    const wildcards = this.handlers.get('*') ?? []
    ;[...handlers, ...wildcards].forEach(h => { try { h(msg.payload, msg) } catch (e) { console.warn('[EventBus]', e) } })
  }
}

// Singleton
export const EventBus = new EventBusClass()

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { License } from '@/types'

interface Message {
  role: 'user' | 'assistant' | 'system' | 'thinking' | 'agent'
  content: string
  sender?: string
}

interface Agent {
  id: string
  name: string
  icon: string
  color: string
  status: 'idle' | 'running' | 'done' | 'error' | 'qa'
  description: string
  maxTokens: number
  systemPrompt: string
}

interface GeneratedFile {
  nombre: string
  contenido: string
  kb: number
  lines: number
  qa?: {
    score: number
    total: number
    verdict: 'PASS' | 'WARN' | 'FAIL'
    failed: { id: string; lbl: string }[]
  }
}

interface RoadmapItem {
  id: string
  label: string
  status: 'd' | 'p' | 'n'
  color: string
}

const CTX = `=== IDENTIDAD ===
ZytekOS Suite SaaS ERP por Zytek LLC. Daniel Fornerino. Summerville SC. Abril 2026.

=== ARCHIVOS ENTREGADOS ===
zytek-admin.html         479KB 7965 lineas 255 funciones 23 modales 0 placeholders
zytek-pos-restaurant.html 303KB 5691 lineas 214 funciones POS completo
zytek-pos-mesero.html    283KB 5326 lineas app mesero movil touch-first
zytek-kds.html            28KB  694 lineas Kitchen Display System
zytek-pos-retail.html     89KB 1316 lineas POS Retail v1
zytek-landing-pro.html    32KB  759 lineas Landing ZytekOS Pro

=== ADMIN 8 MODULOS COMPLETOS ===
Menu Ventas: categorias subgrupos items modificadores recetas food-cost live
Compras: proveedores CxP OC devoluciones todos los modales funcionales
Inventario: catalogo almacen ajustes conteo movimientos modal registrar movimiento
Reportes: 48 reportes R01-R48 en 9 categorias con dashboards y filtros globales
Clientes: CxC abonos adelantos leads-kanban fidelizacion todos los modales
IA: 10 agentes inventario+ventas con chat libre y contexto real
Sistema: usuarios permisos auditoria
Config: metodos-pago gestor-completo IVA+IGTF POS BCV

=== DATOS TECNICOS ===
Admin PIN: 1369 usuario: dfornerino
INV_STOCK: [{id,nom,cat,stock,min,uni,costo,ubicacionId}] 28 productos
CLI_DATA: {clientes,cxc,abonos,adelantos,leads,canjes}
COMPRAS_DEMO: {proveedores,cxp,pagos,ordenes,insumos,costos,devoluciones,notas,calidad}
REP_DEMO: {formasPago,turnos,horas,ambientes,meseros,platos,categorias,tendencia}
UBICACIONES: camara-fria almacen-seco congelado barra cocina
localStorage key: zytek_formas_pago
Supabase: https://oufrhjvfefbmzcnkgvrm.supabase.co

=== CSS DESIGN SYSTEM ===
--bg:#0a0d12 --s1:#111520 --s2:#181e2e --s3:#1e2640
--or:#ff7c20 --gr:#2ee87a --cy:#00d4ff
--am:#ffc040 --re:#ff4d4d
--t:#f0f2f7 --tm:#8b93a8 --td:#4a5166
--b:rgba(255,255,255,.07) --b2:rgba(255,255,255,.14)
Fonts: DM Sans (body) Fraunces (display) DM Mono (code)

=== FUNCIONES CLAVE DEL SISTEMA ===
showSection(el,id) navCompras(el,sub) navInventario(el,sub) navClientes(el,sub)
setRepCat(cat,btn) setInvSub(sub) setRepSub(sub)
renderInvCatalogo() renderAlmacen() renderMovimientos()
renderCompras() renderProveedores() renderCxP()
renderClienteDirectorio() renderCxCClientes() renderFidelizacion()
flash(msg,color) money(n) tb(rows) badge(txt,cls)
Modal pattern: document.createElement div con overlay fixed z-index:900

=== PENDIENTE PRIORIDAD ALTA ===
1. descontarStockPorVenta(itemId,cantidad) conectar inventario con POS al cobrar
2. IGTF 1.5% real en calculos del cobro POS
3. Chart.js en dashboards Reportes: ventas 7d linea, formas-pago donut, food-cost barra
4. ZytekOS POS Retail completo

=== PENDIENTE PROXIMA FASE ===
5. ZytekOS CRM (no iniciado)
6. ZytekOS FinTrack (no iniciado)
7. Landing Zytek LLC (no iniciado)
8. Backend Supabase
9. Tickets termicos ESC/POS
10. App movil PWA

=== REGLAS DEL PROYECTO ===
1. CSS vars del sistema NUNCA hardcode colors
2. DM Sans+Fraunces+DM Mono NUNCA Arial/Inter/Roboto
3. Null guards en TODAS las funciones DOM: if(!el) return;
4. CERO placeholders CERO alert() CERO TODO:
5. Modales con document.createElement overlay fixed z-index:900
6. flash() para notificaciones tb() para tablas money() para formato
7. Funciones menor-o-igual-30 lineas una responsabilidad por funcion`

const SP_DEV_PROTO = `Cuando generes un modulo o archivo HTML usa EXACTAMENTE este delimitador:
===ARCHIVO_INICIO:nombre.html===
[CODIGO HTML COMPLETO AQUI]
===ARCHIVO_FIN===

CHECKLIST QA (el QA Engineer verificara):
- CSS vars del sistema (--or, --gr, --cy, --am, --t, --b, etc.) NUNCA colores hardcoded
- Google Fonts DM Sans + Fraunces + DM Mono NUNCA Arial/Inter/Roboto
- Null guards: if(!el) return; en CADA funcion DOM
- CERO placeholders CERO alert() CERO TODO:
- Modales: document.createElement + overlay fixed z-index:900
- flash() notificaciones tb() tablas money() formato`

const ROADMAP: RoadmapItem[] = [
  { id: 'pos-rest', label: 'Restaurant POS', status: 'd', color: 'var(--gr)' },
  { id: 'mesero', label: 'POS Mesero Movil', status: 'd', color: 'var(--gr)' },
  { id: 'kds', label: 'KDS Cocina', status: 'd', color: 'var(--gr)' },
  { id: 'admin', label: 'Admin Panel ERP', status: 'd', color: 'var(--gr)' },
  { id: 'inv-pos', label: 'Inventario con POS', status: 'p', color: 'var(--am)' },
  { id: 'igtf', label: 'IGTF real en POS', status: 'p', color: 'var(--am)' },
  { id: 'charts', label: 'Charts en Reportes', status: 'p', color: 'var(--am)' },
  { id: 'pos-retail', label: 'POS Retail completo', status: 'n', color: 'var(--td)' },
  { id: 'crm', label: 'ZytekOS CRM', status: 'n', color: 'var(--td)' },
  { id: 'fintrack', label: 'ZytekOS FinTrack', status: 'n', color: 'var(--td)' },
  { id: 'landing', label: 'Landing Zytek LLC', status: 'n', color: 'var(--td)' },
  { id: 'backend', label: 'Backend Supabase', status: 'n', color: 'var(--td)' },
]

const RM_BUILD: Record<string, string> = {
  'inv-pos': 'Genera la funcion descontarStockPorVenta() para conectar inventario con POS',
  'igtf': 'Implementa el calculo IGTF 1.5% real en el cobro del POS',
  'charts': 'Agrega Chart.js a los dashboards de Reportes (ventas, formas de pago, food cost)',
  'pos-retail': 'Construye ZytekOS POS Retail completo con SKU inventario y cobro',
  'crm': 'Construye el modulo ZytekOS CRM completo desde cero',
  'fintrack': 'Construye ZytekOS FinTrack tracker financiero con dashboard',
  'landing': 'Construye la landing page completa de Zytek LLC',
}

const ANTHROPIC_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Opus 4' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
]

function createAgents(): Agent[] {
  return [
    {
      id: 'orq',
      name: 'Orquestador',
      icon: '🧠',
      color: 'var(--or)',
      status: 'idle',
      description: 'Planifica y coordina',
      maxTokens: 800,
      systemPrompt: CTX + `
Eres el ORQUESTADOR. Analiza y planifica. Si la peticion pide GENERAR/CONSTRUIR/CREAR codigo incluye agente "dev" con genera_archivo:true.
Responde SOLO en JSON valido:
{"plan":{"descripcion":"...","pasos":[{"agente":"anl|dis|dev|qa|val|doc","tarea":"especifica","genera_archivo":false,"nombre_archivo":"zytek-xxx.html"}]},"resumen_ejecutivo":"...","siguiente_accion":""}
Se especifico. Cita funciones reales del contexto.`
    },
    {
      id: 'anl',
      name: 'Analista',
      icon: '🔍',
      color: 'var(--bl)',
      status: 'idle',
      description: 'Audita gaps',
      maxTokens: 1000,
      systemPrompt: CTX + `
Eres el ANALISTA. Auditas codigo detectas gaps con impacto CRITICO/ALTO/MEDIO/BAJO.
Cita funciones reales: renderCompras setRepCat abrirModalProducto etc.
Formato: ANALISIS -> GAPS (con impacto) -> RECOMENDACIONES (con nombres de funcion)`
    },
    {
      id: 'dis',
      name: 'Diseñador UX',
      icon: '🎨',
      color: 'var(--pu)',
      status: 'idle',
      description: 'Flujos y componentes',
      maxTokens: 800,
      systemPrompt: CTX + `
Eres el DISENADOR UX. Defines flujos IDs de componentes y experiencia.
Mobile-first (touch target minimo 44px). Consistente con el design system.
Formato: FLUJO (pasos numerados) -> COMPONENTES (con IDs DOM) -> CONSIDERACIONES UX`
    },
    {
      id: 'dev',
      name: 'Desarrollador',
      icon: '⚙️',
      color: 'var(--cy)',
      status: 'idle',
      description: 'Genera archivos',
      maxTokens: 4000,
      systemPrompt: CTX + `
Eres el DESARROLLADOR. Generas codigo COMPLETO y FUNCIONAL.
` + SP_DEV_PROTO
    },
    {
      id: 'qa',
      name: 'QA Engineer',
      icon: '🧪',
      color: 'var(--am)',
      status: 'idle',
      description: '12-point checklist',
      maxTokens: 1200,
      systemPrompt: CTX + `
Eres el QA ENGINEER. Revision de calidad EXHAUSTIVA.
CHECKLIST (PASS/FAIL por item):
[ ] CSS vars del sistema usadas
[ ] Tipografia correcta DM Sans/Fraunces/DM Mono
[ ] Null guards en funciones DOM
[ ] Sin placeholders ni TODO
[ ] Sin alert() nativo usa flash()
[ ] Modales con createElement
[ ] Sin funciones o IDs duplicados
[ ] Funciones navegacion correctas
[ ] Variables de datos correctas
[ ] Try/catch donde puede fallar
[ ] HTML valido
[ ] Responsive mobile-friendly
Formato:
RESULTADO: PASS | WARN | FAIL
CHECKLIST: [item: PASS/FAIL]
BUGS CRITICOS: [lista]
CORRECCIONES: [codigo exacto]`
    },
    {
      id: 'val',
      name: 'Validador',
      icon: '✅',
      color: 'var(--gr)',
      status: 'idle',
      description: 'Lógica y edge cases',
      maxTokens: 800,
      systemPrompt: CTX + `
Eres el VALIDADOR. Verificas logica y correccion funcional.
La implementacion hace lo que se pidio? Hay edge cases sin cubrir?
Formato: VALIDACION FUNCIONAL -> EDGE CASES -> CORRECCIONES`
    },
    {
      id: 'doc',
      name: 'Documentador',
      icon: '📋',
      color: 'var(--or)',
      status: 'idle',
      description: 'Specs y roadmap',
      maxTokens: 800,
      systemPrompt: CTX + `
Eres el DOCUMENTADOR. Generas specs y documentacion tecnica.
Incluye: que se hizo como integrar archivos afectados siguientes pasos.
Formato claro tecnico y accionable.`
    },
  ]
}

function parsePlan(raw: string): { plan: { descripcion: string; pasos: { agente: string; tarea: string; genera_archivo?: boolean; nombre_archivo?: string }[] } } | null {
  try {
    const p = JSON.parse(raw.replace(/```json|```/g, '').trim())
    if (!p?.plan?.pasos || !Array.isArray(p.plan.pasos)) return null
    if (!p.plan.descripcion) return null
    if (!p.plan.pasos.every((x: { agente: string; tarea: string }) => x.agente && x.tarea)) return null
    return p
  } catch {
    return null
  }
}

function extractFile(text: string): GeneratedFile | null {
  const match = text.match(/===ARCHIVO_INICIO:([^\n=]+)===\s*([\s\S]*?)===ARCHIVO_FIN===/)
  if (!match) return null
  const nombre = match[1].trim()
  const contenido = match[2].trim()
  return {
    nombre,
    contenido,
    kb: Math.round(contenido.length / 1024),
    lines: contenido.split('\n').length,
    qa: checkCode(contenido),
  }
}

function checkCode(code: string): GeneratedFile['qa'] {
  const checks = [
    { id: 'css', ok: code.includes('--or') || code.includes('--surface') || code.includes('--bg'), lbl: 'CSS vars del sistema' },
    { id: 'fonts', ok: code.includes('DM Sans') || code.includes('DM+Sans') || code.includes('Fraunces'), lbl: 'Tipografia correcta' },
    { id: 'nohold', ok: !code.includes('proximamente') && !code.includes('TODO:'), lbl: 'Sin placeholders' },
    { id: 'noalert', ok: !code.includes('alert('), lbl: 'Sin alert() nativo' },
    { id: 'nullg', ok: code.includes('if(!') || code.includes('if (!'), lbl: 'Null guards presentes' },
    { id: 'html', ok: code.includes('<!DOCTYPE') || code.includes('<html'), lbl: 'HTML valido' },
    { id: 'modal', ok: code.includes('createElement') || code.includes('modal'), lbl: 'Modales con createElement' },
  ]
  const failed = checks.filter(c => !c.ok)
  return {
    score: checks.filter(c => c.ok).length,
    total: checks.length,
    verdict: failed.length === 0 ? 'PASS' : failed.length <= 2 ? 'WARN' : 'FAIL',
    failed,
  }
}

async function callAnthropic(model: string, apiKey: string, system: string, messages: { role: string; content: string }[], maxTokens: number): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })
  const d = await resp.json()
  if (d.error) throw new Error(d.error.message)
  return d.content?.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') || ''
}

async function callOllama(model: string, messages: { role: string; content: string }[], maxTokens: number): Promise<string> {
  const resp = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { num_predict: maxTokens, temperature: 0.7 },
      messages,
    }),
  })
  if (!resp.ok) {
    const err = await resp.text().catch(() => '')
    throw new Error(`Ollama error ${resp.status}: ${err.slice(0, 120)}`)
  }
  const d = await resp.json()
  return d.message?.content || d.choices?.[0]?.message?.content || ''
}

export function ConstructorIA({ license }: { license: License }) {
  const [agents, setAgents] = useState<Agent[]>(createAgents())
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<GeneratedFile[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<'chat' | 'info'>('chat')
  const [selectedAgent, setSelectedAgent] = useState('orq')
  const [backend, setBackend] = useState<'anthropic' | 'ollama'>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [ollamaReady, setOllamaReady] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const saved = localStorage.getItem('zytek_constructor_apikey')
    if (saved) {
      setApiKey(saved)
      if (saved.startsWith('sk-ant-')) {
        setApiStatus('connected')
      }
    }
  }, [])

  const detectOllama = useCallback(async () => {
    try {
      const r = await fetch('http://localhost:11434/api/tags')
      if (!r.ok) throw new Error('no models')
      const d = await r.json()
      const models = (d.models || []).map((m: { name: string }) => m.name)
      setOllamaModels(models)
      setOllamaReady(true)
      if (models.length > 0) {
        setModel(models.includes('llama3.2') ? 'llama3.2' : models[0])
      }
      setApiStatus('connected')
    } catch {
      setOllamaReady(false)
      setApiStatus('disconnected')
    }
  }, [])

  const addMessage = (role: Message['role'], content: string, sender?: string) => {
    setMessages(prev => [...prev, { role, content, sender }])
  }

  const removeMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index))
  }

  const updateAgentStatus = (id: string, status: Agent['status']) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const setApiKeyHandler = (val: string) => {
    const trimmed = val.trim()
    setApiKey(trimmed)
    localStorage.setItem('zytek_constructor_apikey', trimmed)
    if (trimmed.startsWith('sk-ant-')) {
      setApiStatus('connected')
    } else {
      setApiStatus('disconnected')
    }
  }

  const runAgent = async (agent: Agent, task: string, context: { role: string; content: string }[]): Promise<string> => {
    const msgs = context.map(m => ({ role: m.role, content: m.content }))
    
    if (backend === 'anthropic') {
      if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('API key de Anthropic requerida')
      }
      return callAnthropic(model, apiKey, agent.systemPrompt, msgs, agent.maxTokens)
    } else {
      if (!ollamaReady) {
        throw new Error('Ollama no detectado')
      }
      const ollamaMsgs = [{ role: 'system', content: agent.systemPrompt }, ...msgs]
      return callOllama(model, ollamaMsgs, agent.maxTokens)
    }
  }

  const runPipeline = async (userMsg: string) => {
    if (busy) return
    if (backend === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      addMessage('system', 'Ingresa tu API key de Anthropic — o cambia a Ollama')
      return
    }
    if (backend === 'ollama' && !ollamaReady) {
      addMessage('system', 'Ollama no detectado en localhost:11434')
      return
    }

    setBusy(true)
    addMessage('user', userMsg)

    const chatHistory = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

    try {
      updateAgentStatus('orq', 'running')
      setProgress(10)
      
      const thinkId = messages.length
      addMessage('thinking', 'Orquestador planificando...')

      const planRaw = await runAgent(
        agents.find(a => a.id === 'orq')!,
        userMsg,
        [...chatHistory, { role: 'user', content: userMsg }]
      )

      removeMessage(thinkId)
      updateAgentStatus('orq', 'done')
      
      const plan = parsePlan(planRaw)
      if (!plan) {
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: planRaw, sender: 'Orquestador' }])
        setProgress(100)
        setBusy(false)
        return
      }

      const pasos = plan.plan.pasos
      setProgress(18)

      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `**${plan.plan.descripcion}**\n\n${pasos.map((p, i) => {
          const ag = agents.find(a => a.id === p.agente)
          return `${i + 1}. ${ag?.icon || ''} **${ag?.name || p.agente}** → ${p.tarea}`
        }).join('\n')}`,
        sender: 'Orquestador',
      }])

      const step = 55 / Math.max(pasos.length, 1)
      const results: Record<string, string> = {}

      for (let i = 0; i < pasos.length; i++) {
        const paso = pasos[i]
        const agent = agents.find(a => a.id === paso.agente)
        if (!agent) continue

        updateAgentStatus(paso.agente, 'running')
        setProgress(18 + (i + 1) * step)

        const thinkId2 = messages.length
        addMessage('thinking', `${agent.name} ejecutando...`)

        const ctx = [
          ...chatHistory.slice(-4),
          { role: 'user', content: `TAREA: ${paso.tarea}\nPLAN: ${plan.plan.descripcion}\nPREVIOS: ${JSON.stringify(Object.entries(results).map(([k, v]) => ({ ag: k, r: v.slice(0, 180) }))).slice(0, 800)}` }
        ]

        try {
          const result = await runAgent(agent, paso.tarea, ctx)
          results[paso.agente] = result

          removeMessage(thinkId2)
          updateAgentStatus(paso.agente, 'done')

          const file = extractFile(result)
          if (file) {
            setFiles(prev => [...prev.filter(f => f.nombre !== file.nombre), file])
          }

          setMessages(prev => [...prev, {
            role: 'agent',
            content: result,
            sender: agent.name,
          }])

          if (file) {
            await runQA(file)
          }
        } catch (err) {
          removeMessage(thinkId2)
          updateAgentStatus(paso.agente, 'error')
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: ${(err as Error).message}`,
            sender: agent.name,
          }])
        }
      }

      setProgress(92)
      const summary = await runAgent(
        agents.find(a => a.id === 'orq')!,
        'Resume en 3-4 lineas',
        [...chatHistory.slice(-3), { role: 'user', content: `Resume: ${JSON.stringify(results)}` }]
      )

      setMessages(prev => [...prev, { role: 'assistant', content: summary, sender: 'Orquestador' }])
      setProgress(100)
    } catch (err) {
      updateAgentStatus('orq', 'error')
      addMessage('assistant', `Error global: ${(err as Error).message}`)
      setProgress(0)
    }

    setBusy(false)
    setTimeout(() => setProgress(0), 2500)
  }

  const runQA = async (file: GeneratedFile) => {
    const qa = agents.find(a => a.id === 'qa')
    if (!qa) return

    try {
      updateAgentStatus('qa', 'qa')
      const thinkId = messages.length
      addMessage('thinking', `QA Engineer revisando ${file.nombre}...`)

      const qr = await runAgent(qa, `Revisa '${file.nombre}' (${file.kb}KB ${file.lines} lines).\nCodigo: ${file.contenido.slice(0, 3000)}\nChecks locales: ${JSON.stringify(file.qa)}`, [])

      removeMessage(thinkId)
      updateAgentStatus('qa', 'done')

      setMessages(prev => [...prev, { role: 'agent', content: qr, sender: 'QA Engineer' }])
    } catch {
      updateAgentStatus('qa', 'error')
    }
  }

  const downloadFile = (file: GeneratedFile) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([file.contenido], { type: 'text/html;charset=utf-8' }))
    a.download = file.nombre
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 800)
  }

  const previewFile = (file: GeneratedFile) => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(file.contenido)
      w.document.close()
    }
  }

  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--t)">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:var(--s3);padding:1px 4px;border-radius:3px;font-family:var(--mo);font-size:10px">$1</code>')
      .replace(/\n/g, '<br>')
  }

  const handleSend = () => {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    runPipeline(msg)
  }

  const handleQuickBuild = (text: string) => {
    setInput(text)
  }

  const handleRoadmap = (id: string) => {
    setInput(RM_BUILD[id] || `Construye: ${id}`)
  }

  const clearChat = () => {
    setMessages([])
    setFiles([])
    setProgress(0)
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })))
  }

  const getStatusClass = (status: Agent['status']) => {
    const classes: Record<string, string> = {
      idle: 'si',
      running: 'sr',
      done: 'sd',
      error: 'se',
      qa: 'sq',
    }
    return classes[status] || 'si'
  }

  const getStatusLabel = (status: Agent['status']) => {
    const labels: Record<string, string> = {
      idle: 'listo',
      running: 'ejecutando',
      done: 'OK',
      error: 'error',
      qa: 'QA...',
    }
    return labels[status] || status
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '262px 1fr',
      gridTemplateRows: '50px 1fr',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--t)',
      fontFamily: 'var(--fn)',
    }}>
      {/* Topbar */}
      <div style={{
        gridColumn: '1 / -1',
        background: 'var(--s1)',
        borderBottom: '1px solid var(--b)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0 18px',
      }}>
        <div style={{
          width: 28, height: 28, background: 'var(--or)', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>🤖</div>
        <div>
          <div style={{ fontFamily: 'var(--se)', fontWeight: 700, fontSize: 13 }}>ZytekOS Constructor SOLID</div>
          <div style={{ fontSize: 9, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2 }}>S·O·L·I·D &nbsp;·&nbsp; QA AUTO &nbsp;·&nbsp; MULTI-AGENT</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: apiStatus === 'connected' ? 'var(--gr)' : 'var(--re)',
            boxShadow: `0 0 6px ${apiStatus === 'connected' ? 'var(--gr)' : 'var(--re)'}`,
            animation: 'p 2s infinite',
          }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--tm)' }}>
            {apiStatus === 'connected' ? (backend === 'anthropic' ? 'Anthropic OK' : 'Ollama OK') : 'sin API key'}
          </span>

          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--b2)', borderRadius: 7, overflow: 'hidden' }}>
            <button
              onClick={() => setBackend('anthropic')}
              style={{
                padding: '4px 10px', fontSize: 10, fontFamily: 'var(--mo)', cursor: 'pointer',
                border: 'none', background: backend === 'anthropic' ? 'var(--or)' : 'var(--s3)',
                color: backend === 'anthropic' ? '#000' : 'var(--tm)', fontWeight: backend === 'anthropic' ? 700 : 400,
                transition: 'all .13s',
              }}
            >
              ☁ Anthropic
            </button>
            <button
              onClick={() => { setBackend('ollama'); detectOllama(); }}
              style={{
                padding: '4px 10px', fontSize: 10, fontFamily: 'var(--mo)', cursor: 'pointer',
                border: 'none', background: backend === 'ollama' ? 'var(--gr)' : 'var(--s3)',
                color: backend === 'ollama' ? '#000' : 'var(--tm)', fontWeight: backend === 'ollama' ? 700 : 400,
                transition: 'all .13s',
              }}
            >
              🦙 Ollama
            </button>
          </div>

          {backend === 'anthropic' && (
            <>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKeyHandler(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{
                  background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 7,
                  padding: '5px 10px', fontFamily: 'var(--mo)', fontSize: 10, color: 'var(--t)',
                  outline: 'none', width: 200, transition: 'border-color .15s',
                }}
              />
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{
                  background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 7,
                  padding: '4px 8px', fontFamily: 'var(--mo)', fontSize: 10, color: 'var(--tm)',
                  outline: 'none', cursor: 'pointer',
                }}
              >
                {ANTHROPIC_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </>
          )}

          {backend === 'ollama' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: ollamaReady ? 'var(--gr)' : 'var(--re)' }}>
                {ollamaReady ? `${ollamaModels.length} modelos` : 'buscando...'}
              </span>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{
                  background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 7,
                  padding: '4px 8px', fontFamily: 'var(--mo)', fontSize: 10, color: 'var(--tm)',
                  outline: 'none', cursor: 'pointer',
                }}
              >
                {ollamaModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={detectOllama}
                style={{
                  padding: '4px 8px', background: 'var(--s3)', border: '1px solid var(--b2)', borderRadius: 7,
                  fontFamily: 'var(--mo)', fontSize: 10, color: 'var(--tm)', cursor: 'pointer',
                }}
              >
                ↻ detectar
              </button>
            </div>
          )}

          <span style={{
            fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 8px', borderRadius: 10,
            background: 'var(--grd)', color: 'var(--gr)', border: '1px solid rgba(46,232,122,.2)',
          }}>
            7 agentes
          </span>
          <span style={{
            fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 8px', borderRadius: 10,
            background: 'var(--amd)', color: 'var(--am)', border: '1px solid rgba(255,192,64,.2)',
          }}>
            QA auto
          </span>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{
        background: 'var(--s1)', borderRight: '1px solid var(--b)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '9px 13px 3px', fontSize: 9, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2 }}>
          AGENTES
        </div>
        {agents.map(agent => (
          <div
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            style={{
              padding: '8px 13px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              borderLeft: `2px solid ${selectedAgent === agent.id ? agent.color : 'transparent'}`,
              background: selectedAgent === agent.id ? 'var(--s2)' : 'transparent',
              transition: 'all .13s',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, background: agent.color + '20', border: '1px solid var(--b)',
              flexShrink: 0,
            }}>
              {agent.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t)' }}>{agent.name}</div>
              <div style={{ fontSize: 9, color: 'var(--td)', fontFamily: 'var(--mo)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {agent.description}
              </div>
            </div>
            <span style={{
              fontSize: 9, fontFamily: 'var(--mo)', padding: '1px 5px', borderRadius: 3,
              flexShrink: 0, minWidth: 42, textAlign: 'center',
              background: agent.status === 'running' || agent.status === 'qa' ? 'var(--cyd)' :
                         agent.status === 'done' ? 'var(--grd)' :
                         agent.status === 'error' ? 'var(--red)' : 'rgba(255,255,255,.04)',
              color: agent.status === 'running' || agent.status === 'qa' ? 'var(--cy)' :
                     agent.status === 'done' ? 'var(--gr)' :
                     agent.status === 'error' ? 'var(--re)' : 'var(--td)',
            }}>
              {getStatusLabel(agent.status)}
            </span>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--b)', margin: '5px 0', flexShrink: 0 }} />
        <div style={{ padding: '9px 13px 3px', fontSize: 9, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2 }}>
          ROADMAP
        </div>
        {ROADMAP.map(item => (
          <div
            key={item.id}
            onClick={() => handleRoadmap(item.id)}
            style={{
              padding: '6px 13px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              transition: 'background .12s', fontSize: 10,
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--tm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 9, fontFamily: 'var(--mo)', padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              background: item.status === 'd' ? 'var(--grd)' : item.status === 'p' ? 'var(--amd)' : 'rgba(255,255,255,.04)',
              color: item.status === 'd' ? 'var(--gr)' : item.status === 'p' ? 'var(--am)' : 'var(--td)',
            }}>
              {item.status === 'd' ? 'listo' : item.status === 'p' ? 'en curso' : 'pendiente'}
            </span>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--b)', margin: '5px 0', flexShrink: 0 }} />
        <div style={{ padding: '9px 13px 3px', fontSize: 9, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2 }}>
          ARCHIVOS GENERADOS
        </div>
        <div style={{ padding: '4px 13px' }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--td)' }}>
            {files.length > 0 ? `${files.length} archivo${files.length > 1 ? 's' : ''} generado${files.length > 1 ? 's' : ''}` : 'Ninguno aun'}
          </span>
        </div>
        {files.map((file, i) => (
          <div key={i} style={{ padding: '6px 13px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file.nombre}
              </div>
              <div style={{ fontSize: 9, fontFamily: 'var(--mo)', color: file.qa?.verdict === 'PASS' ? 'var(--gr)' : file.qa?.verdict === 'WARN' ? 'var(--am)' : 'var(--td)' }}>
                {file.kb}KB {file.qa?.verdict || ''}
              </div>
            </div>
            <button
              onClick={() => downloadFile(file)}
              style={{
                padding: '3px 9px', background: 'var(--or)', border: 'none', borderRadius: 7,
                color: '#000', fontSize: 9, fontWeight: 700, cursor: 'pointer',
              }}
            >
              DL
            </button>
          </div>
        ))}

        <div style={{ height: 1, background: 'var(--b)', margin: '5px 0', flexShrink: 0 }} />
        <div style={{ padding: '8px 13px' }}>
          <button
            onClick={clearChat}
            style={{
              width: '100%', padding: 6, background: 'var(--s3)', border: '1px solid var(--b)', borderRadius: 7,
              color: 'var(--td)', fontSize: 10, fontFamily: 'var(--mo)', cursor: 'pointer',
            }}
          >
            Limpiar conversación
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--b)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--se)', fontSize: 18, fontWeight: 700 }}>Constructor ZytekOS</div>
              <div style={{ fontSize: 11, color: 'var(--td)', marginTop: 2 }}>
                Pipeline: Analista → UX → Dev → <strong style={{ color: 'var(--am)' }}>QA auto</strong> → Validador → Docs &nbsp;·&nbsp; Genera archivos descargables
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0, border: '1px solid var(--b2)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <button
                onClick={() => setActiveTab('chat')}
                style={{
                  padding: '5px 14px', fontSize: 10, fontFamily: 'var(--mo)', cursor: 'pointer',
                  border: 'none', background: activeTab === 'chat' ? 'var(--or)' : 'var(--s3)',
                  color: activeTab === 'chat' ? '#000' : 'var(--tm)', fontWeight: activeTab === 'chat' ? 700 : 400,
                  transition: 'all .13s',
                }}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setActiveTab('info')}
                style={{
                  padding: '5px 14px', fontSize: 10, fontFamily: 'var(--mo)', cursor: 'pointer',
                  border: 'none', background: activeTab === 'info' ? 'var(--or)' : 'var(--s3)',
                  color: activeTab === 'info' ? '#000' : 'var(--tm)', fontWeight: activeTab === 'info' ? 700 : 400,
                  transition: 'all .13s',
                }}
              >
                ℹ Como funciona
              </button>
            </div>
          </div>
          <div style={{ height: 2, background: 'var(--b)', borderRadius: 1, overflow: 'hidden', marginTop: 8 }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg,var(--or),var(--cy))',
              transition: 'width .4s ease', width: `${progress}%`,
            }} />
          </div>
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div ref={chatRef} style={{
            flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 9,
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', flexDirection: 'column', maxWidth: '89%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: msg.role === 'system' ? '100%' : 'auto',
                }}
              >
                {msg.sender && (
                  <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--td)', marginBottom: 3 }}>
                    {msg.sender}
                  </div>
                )}
                <div style={{
                  padding: '10px 14px', fontSize: 12, lineHeight: 1.7,
                  background: msg.role === 'user' ? 'var(--or)' :
                             msg.role === 'thinking' ? 'var(--s2)' :
                             msg.role === 'system' ? 'transparent' : 'var(--s2)',
                  color: msg.role === 'user' ? '#000' : msg.role === 'thinking' ? 'var(--td)' : 'var(--t)',
                  fontWeight: msg.role === 'user' ? 500 : 400,
                  fontStyle: msg.role === 'thinking' ? 'italic' : 'normal',
                  border: msg.role === 'system' ? '1px solid var(--b)' : '1px solid var(--b)',
                  borderRadius: msg.role === 'user' ? '10px 10px 3px 10px' :
                                 msg.role === 'system' ? 6 : '10px 10px 10px 3px',
                  width: msg.role === 'system' ? '100%' : 'auto',
                }}>
                  {msg.role === 'system' ? (
                    <span>⚡ {msg.content}</span>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                  )}
                </div>
                {msg.role === 'agent' && (
                  <div style={{ marginTop: 2 }}>
                    {files.find(f => messages.slice(i + 1).some(m => m.content.includes(f.nombre))) && (
                      <div style={{
                        display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap', alignItems: 'center',
                      }}>
                        {files.slice(-1).map((file, fi) => (
                          <span key={fi} style={{
                            fontSize: 10, fontFamily: 'var(--mo)', padding: '3px 8px', borderRadius: 5,
                            background: file.qa?.verdict === 'PASS' ? 'var(--grd)' :
                                       file.qa?.verdict === 'WARN' ? 'var(--amd)' : 'var(--red)',
                            color: file.qa?.verdict === 'PASS' ? 'var(--gr)' :
                                   file.qa?.verdict === 'WARN' ? 'var(--am)' : 'var(--re)',
                            border: '1px solid ' + (file.qa?.verdict === 'PASS' ? 'rgba(46,232,122,.2)' :
                                                    file.qa?.verdict === 'WARN' ? 'rgba(255,192,64,.2)' : 'rgba(255,77,77,.2)'),
                          }}>
                            QA {file.qa?.verdict} {file.qa?.score}/{file.qa?.total}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--se)', fontSize: 22, fontWeight: 700, color: 'var(--t)', marginBottom: 6 }}>
                Como funciona el multi-agente
              </div>
              <div style={{ fontSize: 12, color: 'var(--td)', fontFamily: 'var(--mo)' }}>
                Arquitectura SOLID · 7 agentes especializados · QA automatico · Dual backend
              </div>
            </div>

            {/* Agents Grid */}
            <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2, marginBottom: 10 }}>
              7 AGENTES ESPECIALIZADOS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10, marginBottom: 20 }}>
              {agents.map(agent => (
                <div key={agent.id} style={{ background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{agent.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: agent.color }}>{agent.name}</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--mo)', color: 'var(--td)', marginLeft: 'auto' }}>max {agent.maxTokens} tokens</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tm)', lineHeight: 1.6 }}>
                    {agent.description}
                  </div>
                </div>
              ))}
            </div>

            {/* QA Checks */}
            <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2, marginBottom: 10 }}>
              7 CHECKS ESTATICOS DEL QA
            </div>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--s3)' }}>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontFamily: 'var(--mo)', color: 'var(--td)', fontSize: 9, letterSpacing: 1 }}>#</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontFamily: 'var(--mo)', color: 'var(--td)', fontSize: 9, letterSpacing: 1 }}>CHECK</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontFamily: 'var(--mo)', color: 'var(--td)', fontSize: 9, letterSpacing: 1 }}>QUE BUSCA</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontFamily: 'var(--mo)', color: 'var(--td)', fontSize: 9, letterSpacing: 1 }}>SI FALLA</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { n: 1, c: 'CSS vars', q: '--or, --surface, --bg', f: 'QA WARN' },
                    { n: 2, c: 'Tipografia', q: 'DM Sans o Fraunces', f: 'QA WARN' },
                    { n: 3, c: 'Sin placeholders', q: '"proximamente" o "TODO:"', f: 'QA FAIL' },
                    { n: 4, c: 'Sin alert()', q: 'alert() nativo', f: 'QA FAIL' },
                    { n: 5, c: 'Null guards', q: 'if(!el) en el JS', f: 'QA WARN' },
                    { n: 6, c: 'HTML valido', q: '<!DOCTYPE o <html', f: 'QA FAIL' },
                    { n: 7, c: 'Modales', q: 'createElement o "modal"', f: 'QA WARN' },
                  ].map(row => (
                    <tr key={row.n} style={{ borderTop: '1px solid var(--b)', background: row.n % 2 === 0 ? 'rgba(255,255,255,.015)' : 'transparent' }}>
                      <td style={{ padding: '8px 14px', color: 'var(--td)', fontFamily: 'var(--mo)' }}>{row.n}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--t)' }}>{row.c}</td>
                      <td style={{ padding: '8px 14px', color: 'var(--tm)' }}>{row.q}</td>
                      <td style={{ padding: '8px 14px', color: row.f.includes('FAIL') ? 'var(--re)' : 'var(--am)', fontFamily: 'var(--mo)', fontSize: 10 }}>{row.f}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SOLID Principles */}
            <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2, marginBottom: 10 }}>
              ARQUITECTURA SOLID
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8, marginBottom: 20 }}>
              {[
                { l: 'S', t: 'Single Responsibility', d: '7 servicios, uno por responsabilidad' },
                { l: 'O', t: 'Open / Closed', d: 'AgentRegistry.register() para agregar agentes' },
                { l: 'L', t: 'Liskov Substitution', d: 'Todos los agentes son instancias de IAgent' },
                { l: 'I', t: 'Interface Segregation', d: 'IAgent solo expone run()' },
                { l: 'D', t: 'Dependency Inversion', d: 'Orchestrator depende de abstracciones' },
              ].map(p => (
                <div key={p.l} style={{ background: 'var(--s2)', border: '1px solid var(--b)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 20, fontFamily: 'var(--se)', fontWeight: 900, color: 'var(--or)', marginBottom: 4 }}>{p.l}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t)', marginBottom: 4 }}>{p.t}</div>
                  <div style={{ fontSize: 10, color: 'var(--tm)', lineHeight: 1.6 }}>{p.d}</div>
                </div>
              ))}
            </div>

            {/* Backends */}
            <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--td)', letterSpacing: 2, marginBottom: 10 }}>
              BACKENDS DISPONIBLES
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--orb)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--or)', marginBottom: 8 }}>☁ Anthropic API</div>
                <div style={{ fontSize: 11, color: 'var(--tm)', lineHeight: 1.8 }}>
                  Modelos: Sonnet 4 · Opus 4 · Haiku 4.5<br />
                  Requiere: API key sk-ant-...<br />
                  Pros: mas preciso, mejores archivos grandes<br />
                  Contras: costo por token, requiere internet
                </div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid rgba(46,232,122,.3)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr)', marginBottom: 8 }}>🦙 Ollama local</div>
                <div style={{ fontSize: 11, color: 'var(--tm)', lineHeight: 1.8 }}>
                  Modelos: cualquiera instalado localmente<br />
                  Requiere: OLLAMA_ORIGINS=&quot;*&quot; ollama serve<br />
                  Pros: gratis, privado, sin internet<br />
                  Recomendado: qwen2.5-coder:7b
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--b)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {[
              'Construye ZytekOS CRM completo',
              'Genera ZytekOS FinTrack con dashboard',
              'Conecta inventario con POS al cobrar',
              'Agrega Chart.js a los reportes del admin',
              'Crea la landing page de Zytek LLC',
              'Audita el admin y dame mejoras',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuickBuild(q)}
                style={{
                  padding: '4px 10px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 14,
                  fontSize: 10, color: 'var(--tm)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .12s',
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Que construimos hoy?"
              rows={1}
              style={{
                flex: 1, background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
                padding: '9px 13px', fontFamily: 'var(--fn)', fontSize: 12, color: 'var(--t)', resize: 'none',
                outline: 'none', maxHeight: 110, overflowY: 'auto', lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleSend}
              disabled={busy || !input.trim()}
              style={{
                width: 36, height: 36, background: busy || !input.trim() ? 'var(--s3)' : 'var(--or)',
                border: 'none', borderRadius: 8, cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                transition: 'all .13s', flexShrink: 0, color: busy || !input.trim() ? 'var(--td)' : '#000',
                fontWeight: 700,
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes p {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes blink {
          from { opacity: 0.5; }
          to { opacity: 1; }
        }
        @keyframes glow {
          from { box-shadow: 0 0 5px rgba(0,212,255,.2); }
          to { box-shadow: 0 0 12px rgba(0,212,255,.5); }
        }
        @keyframes glow2 {
          from { box-shadow: 0 0 5px rgba(255,192,64,.2); }
          to { box-shadow: 0 0 12px rgba(255,192,64,.5); }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 2px; }
      `}</style>
    </div>
  )
}

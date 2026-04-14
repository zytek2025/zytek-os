// ================================================================
//  ZYTEK OS — CORE KERNEL v2.0
//  Compartido por TODOS los módulos. No importa si el módulo
//  corre solo o dentro del shell — siempre carga este core.
//
//  S — Cada clase tiene una responsabilidad
//  O — Extendible via ZytekCore.extend()
//  D — Módulos dependen de ZytekCore, no entre sí
// ================================================================

window.ZytekCore = window.ZytekCore || (function(){
'use strict';

// ── DESIGN TOKENS ─────────────────────────────────────────────
const CSS_ROOT = `
  --bg:#0d0d0f;--surface:#16161a;--surface2:#1e1e24;--surface3:#1e2640;--topbar:#111114;
  --border:rgba(255,255,255,.08);--border2:rgba(255,255,255,.14);
  --text:#f0f0f5;--text-mid:#b0b0c0;--text-dim:#606070;
  --orange:#ff7c20;--orange-dim:rgba(255,124,32,.12);--orange-b:rgba(255,124,32,.3);
  --green:#2ee87a;--green-dim:rgba(46,232,122,.1);--green-b:rgba(46,232,122,.25);
  --red:#ff4757;--red-dim:rgba(255,71,87,.12);--red-b:rgba(255,71,87,.25);
  --blue:#38b6ff;--blue-dim:rgba(56,182,255,.1);--blue-b:rgba(56,182,255,.25);
  --amber:#ffc040;--amber-dim:rgba(255,192,64,.1);--amber-b:rgba(255,192,64,.25);
  --purple:#a855f7;--purple-dim:rgba(168,85,247,.1);--purple-b:rgba(168,85,247,.25);
  --cyan:#00d4ff;--cyan-dim:rgba(0,212,255,.1);
  --font:\'DM Sans\',sans-serif;--mono:\'DM Mono\',monospace;--serif:\'Fraunces\',serif;
`;
function injectTokens(){
  if(document.getElementById('zytek-tokens')) return;
  const s = document.createElement('style');
  s.id = 'zytek-tokens';
  s.textContent = `:root{${CSS_ROOT}}`;
  document.head.insertBefore(s, document.head.firstChild);
}

// ── PAIS CONFIG ───────────────────────────────────────────────
const PAIS_CONFIG = {
  ve:{ nombre:'Venezuela', emoji:'\u1F1FB\u1F1EA', moneda:'VES', simbolo:'Bs',
       dual:true, tasaLabel:'TASA BCV', tasaNombre:'Bs/$', iva:0.16, igtf:0.015 },
  us:{ nombre:'USA', emoji:'\u1F1FA\u1F1F8', moneda:'USD', simbolo:'$',
       dual:false, tasaLabel:'', tasaNombre:'', iva:0, igtf:0 },
  co:{ nombre:'Colombia', emoji:'\u1F1E8\u1F1F4', moneda:'COP', simbolo:'$',
       dual:false, tasaLabel:'', tasaNombre:'', iva:0.19, igtf:0 },
  mx:{ nombre:'México', emoji:'\u1F1F2\u1F1FD', moneda:'MXN', simbolo:'$',
       dual:false, tasaLabel:'', tasaNombre:'', iva:0.16, igtf:0 },
};

// ── DOM UTILS ─────────────────────────────────────────────────
const DOM = {
  setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v;},
  setHtml(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v;},
  setDisp(id,v){const e=document.getElementById(id);if(e)e.style.display=v;},
  q(sel){return document.querySelector(sel);},
  qa(sel){return [...document.querySelectorAll(sel)];},
  openModal(id){const e=document.getElementById(id);if(e)e.classList.add('open');},
  closeModal(id){const e=document.getElementById(id);if(e)e.classList.remove('open');},
  flash(msg,color,duration=2500){
    const el=document.createElement('div');
    el.style.cssText=`position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:${color||'var(--green)'};color:${color?'#fff':'#000'};padding:10px 22px;
      border-radius:8px;font-weight:700;font-family:var(--mono);z-index:9999;
      font-size:12px;transition:opacity .4s;white-space:nowrap;pointer-events:none`;
    el.textContent=msg;
    document.body.appendChild(el);
    setTimeout(()=>{el.style.opacity=0;setTimeout(()=>el.remove(),500);},duration);
  },
  updateClock(dateId,timeId){
    const now=new Date();
    const d=now.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit',year:'numeric'});
    const t=now.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'});
    this.setText(dateId,d); this.setText(timeId,t);
  }
};

// ── FORMAT UTILS ──────────────────────────────────────────────
const Fmt = {
  money(v){ return '$'+parseFloat(v||0).toFixed(2); },
  bs(v,tasa){ return (parseFloat(v||0)*tasa).toLocaleString('es-VE',{maximumFractionDigits:2})+' Bs'; },
  local(usd,pais,tasa){
    const cfg=PAIS_CONFIG[pais];
    if(!cfg||cfg.moneda==='USD') return Fmt.money(usd);
    return (usd*tasa).toLocaleString('es-VE',{maximumFractionDigits:2})+' '+cfg.simbolo;
  },
  tb(rows){ return rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''); },
  badge(txt,cls){ return `<span class="badge ${cls}">${txt}</span>`; },
  genId(pfx){ return pfx+(Date.now()+'').slice(-6)+Math.random().toString(36).slice(2,5); },
  simpleHash(str){
    let h=0x811c9dc5;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*0x01000193)>>>0;}
    return h.toString(16).padStart(8,'0');
  }
};

// ── STATE SERVICE ─────────────────────────────────────────────
// Cada módulo tiene su propia clave. El StateService centraliza
// lectura/escritura de localStorage con namespace por módulo.
const StateService = {
  NS: 'zytek_',
  get(key,def=null){ try{const v=localStorage.getItem(this.NS+key);return v?JSON.parse(v):def;}catch(_){return def;} },
  set(key,val){ try{localStorage.setItem(this.NS+key,JSON.stringify(val));}catch(_){} },
  del(key){ try{localStorage.removeItem(this.NS+key);}catch(_){} },
  getStr(key,def=''){ return localStorage.getItem(this.NS+key)||def; },
  setStr(key,val){ localStorage.setItem(this.NS+key,val); },
  // Shared across modules (no NS prefix):
  getShared(key,def=null){ try{const v=localStorage.getItem('zytek_shared_'+key);return v?JSON.parse(v):def;}catch(_){return def;} },
  setShared(key,val){ try{localStorage.setItem('zytek_shared_'+key,JSON.stringify(val));}catch(_){} },
};

// ── EVENT BUS ─────────────────────────────────────────────────
// Módulos publican y escuchan eventos. Funciona:
//   1. BroadcastChannel (entre tabs/iframes del mismo origen)
//   2. localStorage events (fallback cross-tab)
//   3. Custom DOM events (mismo documento)
const EventBus = {
  _handlers: {},
  _channel:  null,

  _allowedOrigin: typeof window !== 'undefined' ? window.location.origin : '',

  init(){
    // BroadcastChannel entre pestañas (same origin only)
    try {
      this._channel = new BroadcastChannel('zytek_bus');
      this._channel.onmessage = e => {
        // BroadcastChannel is same-origin by spec — but validate anyway
        if(this._allowedOrigin && e.origin && e.origin !== this._allowedOrigin) {
          console.warn('[EventBus] rejected message from foreign origin:', e.origin);
          return;
        }
        this._dispatch(e.data);
      };
    } catch(_){}
    // Storage event fallback
    window.addEventListener('storage', e=>{
      if(e.key && e.key.startsWith('zytek_bus_')) {
        try{ this._dispatch(JSON.parse(e.newValue)); }catch(_){}
      }
    });
  },

  on(event, handler){
    if(!this._handlers[event]) this._handlers[event]=[];
    this._handlers[event].push(handler);
    return ()=>{ this._handlers[event]=this._handlers[event].filter(h=>h!==handler); };
  },

  emit(event, payload, persist=false){
    const msg = { event, payload, ts: Date.now(), src: window.ZYTEK_MODULE || 'unknown' };
    // Dispatch local
    this._dispatch(msg);
    // Broadcast a otras pestañas
    if(this._channel) this._channel.postMessage(msg);
    // localStorage fallback
    try{
      localStorage.setItem('zytek_bus_'+event, JSON.stringify(msg));
      // Limpiar después de 2s para no acumular
      setTimeout(()=>localStorage.removeItem('zytek_bus_'+event),2000);
    }catch(_){}
    // Persistir en IDB si se solicita (eventos críticos)
    if(persist) IDB.put('events', {...msg, id: Fmt.genId('ev')}).catch(()=>{});
  },

  _dispatch(msg){
    if(!msg?.event) return;
    const handlers = this._handlers[msg.event] || [];
    const wildcard = this._handlers['*'] || [];
    [...handlers, ...wildcard].forEach(h => { try{h(msg.payload, msg);}catch(e){console.warn('[EventBus]',e);} });
  }
};

// ── AUTH SERVICE ──────────────────────────────────────────────
const AuthService = {
  currentUser: null,
  users: [],

  init(users){ this.users = users || []; },

  login(pin){
    const u = this.users.find(u=>u.pin===pin && u.activo!==false);
    if(!u) return null;
    this.currentUser = u;
    StateService.setShared('current_user', { id:u.id, nombre:u.nombre, nivel:u.nivel, rol:u.rol });
    EventBus.emit('auth.login', { user:u });
    return u;
  },

  logout(){
    const u = this.currentUser;
    this.currentUser = null;
    StateService.delShared?.('current_user');
    EventBus.emit('auth.logout', { userId:u?.id });
  },

  // Leer usuario de otro módulo (si está logueado en una pestaña hermana)
  getSharedUser(){
    return StateService.getShared('current_user');
  },

  can(nivel){ return this.currentUser && this.currentUser.nivel <= nivel; }
};

// ── IDB SERVICE ───────────────────────────────────────────────
const IDB = {
  _db: null,
  DB_NAME: 'zytek_v2',
  DB_VERSION: 3,
  STORES: [
    { name:'transacciones', key:'id', indices:[{name:'turnoId',field:'turnoId'},{name:'tipo',field:'tipo'},{name:'ts',field:'ts'}] },
    { name:'sync_queue',    key:'id', indices:[{name:'turnoId',field:'turnoId'},{name:'modulo',field:'modulo'}] },
    { name:'config',        key:'key' },
    { name:'cortes_z',      key:'id' },
    { name:'events',        key:'id' },
    { name:'clientes',      key:'id', indices:[{name:'nombre',field:'nombre'}] },
    { name:'productos',     key:'id', indices:[{name:'cat',field:'cat'}] },
    { name:'inventario',    key:'id' },
    { name:'crm_leads',     key:'id' },
    { name:'fintrack_tx',   key:'id', indices:[{name:'tipo',field:'tipo'},{name:'fecha',field:'fecha'}] },
  ],

  async open(){
    if(this._db) return this._db;
    return new Promise((res,rej)=>{
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e=>{
        const db = e.target.result;
        this.STORES.forEach(s=>{
          if(!db.objectStoreNames.contains(s.name)){
            const store = db.createObjectStore(s.name,{keyPath:s.key});
            (s.indices||[]).forEach(i=>store.createIndex(i.name,i.field,{unique:false}));
          }
        });
      };
      req.onsuccess  = e=>{ this._db=e.target.result; res(this._db); };
      req.onerror    = ()=>rej(req.error);
    });
  },

  async getAll(store, indexName, value){
    const db = await this.open();
    return new Promise((res,rej)=>{
      const tx=db.transaction(store,'readonly');
      const s=tx.objectStore(store);
      const req = (indexName&&value!==undefined)
        ? s.index(indexName).getAll(value)
        : s.getAll();
      req.onsuccess=()=>res(req.result||[]);
      req.onerror=()=>rej(req.error);
    });
  },

  async get(store, key){
    const db = await this.open();
    return new Promise((res,rej)=>{
      const tx=db.transaction(store,'readonly');
      const req=tx.objectStore(store).get(key);
      req.onsuccess=()=>res(req.result||null);
      req.onerror=()=>rej(req.error);
    });
  },

  async put(store, obj){
    const db = await this.open();
    return new Promise((res,rej)=>{
      const tx=db.transaction(store,'readwrite');
      const req=tx.objectStore(store).put(obj);
      req.onsuccess=()=>res(req.result);
      req.onerror=()=>rej(req.error);
    });
  },

  async delete(store, key){
    const db = await this.open();
    return new Promise((res,rej)=>{
      const tx=db.transaction(store,'readwrite');
      const req=tx.objectStore(store).delete(key);
      req.onsuccess=()=>res();
      req.onerror=()=>rej(req.error);
    });
  },

  async deleteByIndex(store, indexName, value){
    const db = await this.open();
    return new Promise((res,rej)=>{
      const tx=db.transaction(store,'readwrite');
      const idx=tx.objectStore(store).index(indexName);
      const req=idx.openCursor(IDBKeyRange.only(value));
      let n=0;
      req.onsuccess=e=>{ const c=e.target.result; if(c){c.delete();n++;c.continue();}else res(n); };
      req.onerror=()=>rej(req.error);
    });
  },

  // Solicitar persistencia — Chrome no borra si está granted
  async requestPersist(){
    if(!navigator.storage?.persist) return false;
    const granted = await navigator.storage.persist();
    StateService.setShared('storage_persistent', granted);
    return granted;
  },

  // Diagnóstico de salud del storage
  async healthCheck(){
    const persistent = await navigator.storage?.persisted?.() || false;
    let quota = null;
    if(navigator.storage?.estimate){
      const e = await navigator.storage.estimate();
      quota = { used: e.usage, total: e.quota, pct: Math.round(e.usage/e.quota*100) };
    }
    const incognito = !persistent && quota?.total < 120*1024*1024;
    return { persistent, quota, incognito };
  }
};

// ── SUPABASE SERVICE ──────────────────────────────────────────
const SupabaseService = {
  URL: 'https://oufrhjvfefbmzcnkgvrm.supabase.co',

  get key(){ return StateService.getStr('sb_key'); },

  get headers(){
    const lic = LicenseService.getCurrent();
    return {
      'Content-Type':'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Prefer': 'resolution=merge-duplicates',
      // License header — lets server-side verify caller has valid license
      ...(lic ? { 'X-Zytek-License': lic.key, 'X-Zytek-Tenant': lic.tenant || '' } : {}),
    };
  },

  async isOnline(){ return navigator.onLine; },

  async upsert(table, data){
    if(!this.key || !navigator.onLine) return { ok:false, reason: this.key?'offline':'no_key' };
    // Verify license is still valid before writing to cloud
    const lic = LicenseService.getCurrent();
    if(!lic) return { ok:false, reason:'no_license' };
    if(new Date(lic.expires) < new Date()) return { ok:false, reason:'license_expired' };
    try {
      const r = await fetch(`${this.URL}/rest/v1/${table}`, {
        method: 'POST', headers: this.headers,
        body: JSON.stringify(Array.isArray(data)?data:[data])
      });
      return { ok: r.ok, status: r.status };
    } catch(e){ return { ok:false, reason:e.message }; }
  },

  async select(table, query=''){
    if(!this.key || !navigator.onLine) return { ok:false, data:[] };
    try {
      const r = await fetch(`${this.URL}/rest/v1/${table}?${query}`, {
        headers: { 'apikey':this.key, 'Authorization':`Bearer ${this.key}` }
      });
      const data = await r.json();
      return { ok: r.ok, data: Array.isArray(data)?data:[] };
    } catch(e){ return { ok:false, data:[], reason:e.message }; }
  },

  async rpc(fn, params={}){
    if(!this.key || !navigator.onLine) return { ok:false, data:null };
    try {
      const r = await fetch(`${this.URL}/rest/v1/rpc/${fn}`, {
        method:'POST', headers:this.headers, body:JSON.stringify(params)
      });
      const data = await r.json();
      return { ok:r.ok, data };
    } catch(e){ return { ok:false, data:null, reason:e.message }; }
  }
};

// ── SYNC SERVICE ──────────────────────────────────────────────
const SyncService = {
  _syncing: false,

  // Encolar una operación para sync (con row versioning)
  async enqueue(modulo, tabla, op, data){
    // Inject updated_at for row versioning — server can detect stale writes
    const dataWithVersion = op === 'upsert' ? {
      ...data,
      updated_at: new Date().toISOString(),
      _client_ts: Date.now(),
    } : data;
    const item = {
      id:     Fmt.genId('sq'),
      modulo, tabla, op,
      data:   dataWithVersion,
      turnoId: StateService.getShared('turno_id') || 'T0',
      ts:     Date.now(),
      intentos: 0
    };
    await IDB.put('sync_queue', item);
    EventBus.emit('sync.queued', { id:item.id, tabla, modulo });
    // Intentar sync inmediato si hay internet
    if(navigator.onLine) this.flush();
  },

  // Procesar la cola pendiente
  async flush(){
    if(this._syncing || !navigator.onLine || !SupabaseService.key) return;
    this._syncing = true;
    try {
      const queue = await IDB.getAll('sync_queue');
      for(const item of queue){
        if(item.intentos >= 5) continue; // máx 5 intentos — marcar como fallido
        const result = await SupabaseService.upsert(item.tabla, item.data);
        if(result.ok){
          await IDB.delete('sync_queue', item.id);
          EventBus.emit('sync.completed', { id:item.id, tabla:item.tabla });
        } else {
          await IDB.put('sync_queue', { ...item, intentos: item.intentos+1, lastErr: result.reason });
        }
      }
    } finally { this._syncing = false; }
  },

  // Escuchar eventos de conectividad
  initAutoSync(){
    window.addEventListener('online',  ()=>{ EventBus.emit('net.online');  this.flush(); });
    window.addEventListener('offline', ()=>{ EventBus.emit('net.offline'); });
    // Sync periódico cada 30s si hay internet
    setInterval(()=>{ if(navigator.onLine) this.flush(); }, 30000);
  }
};

// ── MODULE REGISTRY ───────────────────────────────────────────
// Cada módulo se registra aquí al cargar. El shell lo usa para
// saber qué módulos están activos y coordinarlos.
const ModuleRegistry = {
  _modules: {},

  register(id, meta){
    this._modules[id] = { id, ...meta, loaded: true, loadedAt: Date.now() };
    EventBus.emit('module.loaded', { id, meta });
    console.info(`[ZytekOS] Módulo "${id}" registrado`);
  },

  get(id){ return this._modules[id] || null; },
  getAll(){ return Object.values(this._modules); },
  isLoaded(id){ return !!this._modules[id]; },

  // Comunicación directa entre módulos (si están en el mismo documento)
  call(moduleId, fn, ...args){
    const mod = this._modules[moduleId];
    if(!mod?.api?.[fn]) throw new Error(`[ModuleRegistry] ${moduleId}.${fn} no disponible`);
    return mod.api[fn](...args);
  }
};

// ── HEALTH MONITOR ────────────────────────────────────────────
const HealthMonitor = {
  _el: null,

  async init(){
    const health = await IDB.healthCheck();
    this._render(health);
    // Re-check cada 30s
    setInterval(async()=>{ const h=await IDB.healthCheck(); this._update(h); }, 30000);
    // Solicitar persistencia
    if(!health.persistent){
      const granted = await IDB.requestPersist();
      if(!granted) this._warn('Storage no persistente — eviction posible');
    }
    // Advertir modo incógnito
    if(health.incognito) this._warn('Modo incógnito detectado — datos no persistirán');
    return health;
  },

  _render(h){
    // Inserta un dot de salud en el topbar si existe
    const topbar = document.querySelector('.topbar, #topbar, [data-topbar]');
    if(!topbar) return;
    this._el = document.createElement('div');
    this._el.id = 'zytek-health-dot';
    this._el.title = 'Estado del sistema';
    this._el.style.cssText = 'width:8px;height:8px;border-radius:50%;cursor:pointer;flex-shrink:0';
    this._el.onclick = ()=>this._showPanel();
    topbar.appendChild(this._el);
    this._update(h);
  },

  _update(h){
    if(!this._el) return;
    const ok = h.persistent && !h.incognito && (!h.quota || h.quota.pct<80);
    const warn = !h.persistent || (h.quota && h.quota.pct>60);
    this._el.style.background = ok?'var(--green)':warn?'var(--amber)':'var(--red)';
    this._el.style.boxShadow   = `0 0 6px ${ok?'var(--green)':warn?'var(--amber)':'var(--red)'}`;
  },

  _warn(msg){ console.warn('[ZytekOS Health]', msg); },

  _showPanel(){
    DOM.flash('Storage: '+(navigator.onLine?'online':'offline')+(StateService.getShared('storage_persistent')?' · persistente':' · no persistente'),'var(--amber)',3000);
  }
};

// ── INIT ──────────────────────────────────────────────────────

// ── LICENSE SERVICE ───────────────────────────────────────────────
// Sistema de licencias por tenant.
// Cada cliente recibe una key única: ZYTEK-XXXX-XXXX-XXXX
// La key se valida contra Supabase y se cachea localmente 24h.
// Sin key válida → LicenseWall bloquea el módulo.
// ─────────────────────────────────────────────────────────────────
const LicenseService = {
  // Dev bypass: poner true solo en desarrollo
  DEV_MODE: false,
  // Lista de keys de demo hardcodeadas (para testing sin Supabase)
  DEMO_KEYS: {
    'ZYTEK-DEMO-BASIC-2025': { tenant:'Demo Basic',  plan:'basic',  modules:['pos','mesero','kds'],                          expires:'2099-12-31', maxUsers:2  },
    'ZYTEK-DEMO-PRO-2025':   { tenant:'Demo Pro',    plan:'pro',    modules:['pos','mesero','kds','admin','crm','retail'],    expires:'2099-12-31', maxUsers:10 },
    'ZYTEK-DEMO-ENT-2025':   { tenant:'Demo Ent',    plan:'ent',    modules:['pos','mesero','kds','admin','crm','retail','fintrack','constructor'], expires:'2099-12-31', maxUsers:999 },
    // Tu key personal Daniel
    'ZYTEK-DANI-FULL-2025':  { tenant:'Zytek LLC',   plan:'ent',    modules:['*'],                                           expires:'2099-12-31', maxUsers:999 },
  },
  CACHE_KEY:  'zytek_lic_cache',
  CACHE_TTL:  24 * 60 * 60 * 1000,  // 24 horas en ms
  _license:   null,

  // Formato de key: ZYTEK-[TENANT4]-[PLAN4]-[YEAR4]
  // Ejemplo real: ZYTEK-R3ST-PRO1-2025
  validateFormat(key) {
    return /^ZYTEK(-[A-Z0-9]{2,8}){2,4}$/.test(key.trim().toUpperCase());
  },

  // Generar key para un nuevo cliente (se usa en el panel de admin de Zytek)
  generateKey(tenantCode, planCode) {
    const year   = new Date().getFullYear().toString();
    const random = Math.random().toString(36).slice(2,6).toUpperCase();
    const tenant = (tenantCode||'CUST').toUpperCase().slice(0,4).padEnd(4,'X');
    const plan   = (planCode||'PRO1').toUpperCase().slice(0,4).padEnd(4,'0');
    return `ZYTEK-${tenant}-${plan}-${year}`;
  },

  // Cargar desde cache local si es reciente
  _loadCache() {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if(!raw) return null;
      const c = JSON.parse(raw);
      if(Date.now() - c.cachedAt > this.CACHE_TTL) return null;
      if(new Date(c.expires) < new Date()) return null;  // expiró
      return c;
    } catch(_) { return null; }
  },

  // Guardar en cache
  _saveCache(lic) {
    try { localStorage.setItem(this.CACHE_KEY, JSON.stringify({...lic, cachedAt:Date.now()})); } catch(_){}
  },

  // Limpiar cache (para testing o logout)
  clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem('zytek_license_key');
    this._license = null;
  },

  // ── VALIDAR KEY ──────────────────────────────────────────────────
  async validate(key) {
    key = (key||'').trim().toUpperCase();
    if(!key) return { ok:false, reason:'no_key' };
    if(!this.validateFormat(key)) return { ok:false, reason:'invalid_format' };
    if(this.DEV_MODE) return { ok:true, license:{ tenant:'Dev Mode', plan:'ent', modules:['*'], expires:'2099-12-31', key, maxUsers:999 } };

    // 1. Check demo keys
    if(this.DEMO_KEYS[key]) {
      const lic = { ...this.DEMO_KEYS[key], key, source:'demo' };
      if(new Date(lic.expires) < new Date()) return { ok:false, reason:'expired' };
      this._license = lic;
      this._saveCache(lic);
      StateService.setShared('license', lic);
      StateService.setShared('tenant', { nombre:lic.tenant, plan:lic.plan });
      return { ok:true, license:lic };
    }

    // 2. Check cache local (evita llamadas a Supabase innecesarias)
    const cached = this._loadCache();
    if(cached && cached.key === key) {
      this._license = cached;
      StateService.setShared('license', cached);
      StateService.setShared('tenant', { nombre:cached.tenant, plan:cached.plan });
      return { ok:true, license:cached, fromCache:true };
    }

    // 3. Validar contra Supabase
    if(!navigator.onLine) {
      // Sin internet: aceptar si hay cache aunque sea vieja (modo offline)
      const old = this._loadCache();
      if(old && old.key === key) {
        this._license = old;
        return { ok:true, license:old, fromCache:true, offline:true };
      }
      return { ok:false, reason:'offline_no_cache' };
    }

    try {
      const r = await SupabaseService.select('zytek_licenses', `key=eq.${encodeURIComponent(key)}&select=*`);
      if(!r.ok || !r.data?.length) return { ok:false, reason:'not_found' };
      const lic = r.data[0];
      if(!lic.active)                        return { ok:false, reason:'inactive' };
      if(new Date(lic.expires_at) < new Date()) return { ok:false, reason:'expired' };
      const license = {
        key,
        tenant:   lic.tenant_name,
        plan:     lic.plan,
        modules:  lic.modules || ['*'],
        expires:  lic.expires_at,
        maxUsers: lic.max_users || 5,
        tenantId: lic.tenant_id,
        source:   'supabase'
      };
      this._license = license;
      this._saveCache(license);
      StateService.setShared('license', license);
      StateService.setShared('tenant', { nombre:license.tenant, plan:license.plan });
      return { ok:true, license };
    } catch(e) {
      // Error de red → usar cache si existe
      const fallback = this._loadCache();
      if(fallback && fallback.key === key) {
        this._license = fallback;
        return { ok:true, license:fallback, fromCache:true, offline:true };
      }
      return { ok:false, reason:'network_error', detail:e.message };
    }
  },

  // ── VERIFICAR MÓDULO PERMITIDO ───────────────────────────────────
  canUseModule(moduleId) {
    if(this.DEV_MODE) return true;
    if(!this._license) {
      // Intentar cargar desde storage compartido
      const shared = StateService.getShared('license');
      if(shared) { this._license = shared; }
      else return false;
    }
    const mods = this._license.modules || [];
    return mods.includes('*') || mods.includes(moduleId);
  },

  // ── OBTENER LICENCIA ACTIVA ──────────────────────────────────────
  getCurrent() {
    if(this._license) return this._license;
    const shared = StateService.getShared('license');
    if(shared) { this._license = shared; return shared; }
    return this._loadCache();
  },

  // ── AUTO-CARGAR AL INICIAR ───────────────────────────────────────
  async autoLoad() {
    // Intentar cargar key guardada
    const savedKey = StateService.getStr('license_key');
    if(!savedKey) return null;
    const result = await this.validate(savedKey);
    return result.ok ? result.license : null;
  }
};

// ── LICENSE WALL ─────────────────────────────────────────────────
// Pantalla de activación que bloquea el módulo sin key válida
const LicenseWall = {
  _el: null,
  _moduleId: null,
  _onActivate: null,

  show(moduleId, onActivate) {
    this._moduleId = moduleId;
    this._onActivate = onActivate;
    if(document.getElementById('zytek-license-wall')) return;

    const el = document.createElement('div');
    el.id = 'zytek-license-wall';
    el.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:var(--bg,#0a0d12);
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font,"DM Sans",sans-serif);
    `;
    el.innerHTML = `
      <div style="max-width:440px;width:90%;text-align:center">
        <!-- Logo -->
        <div style="width:56px;height:56px;background:var(--orange,#ff7c20);border-radius:14px;
          display:flex;align-items:center;justify-content:center;margin:0 auto 20px;
          font-family:var(--serif,'Fraunces',serif);font-size:26px;font-weight:900;color:#fff">Z</div>

        <div style="font-family:var(--serif,'Fraunces',serif);font-size:24px;font-weight:700;
          color:var(--text,#f0f0f5);margin-bottom:8px">ZytekOS</div>
        <div style="font-size:11px;font-family:var(--mono,'DM Mono',monospace);
          color:var(--text-dim,#606070);letter-spacing:2px;margin-bottom:28px">
          MÓDULO: ${moduleId.toUpperCase()} · ACTIVACIÓN REQUERIDA
        </div>

        <!-- Input key -->
        <div style="background:var(--surface,#16161a);border:1px solid var(--border2,rgba(255,255,255,.14));
          border-radius:10px;padding:20px;margin-bottom:14px">
          <div style="font-size:10px;font-family:var(--mono,'DM Mono',monospace);
            color:var(--text-dim,#606070);letter-spacing:1px;margin-bottom:10px;text-align:left">
            CLAVE DE LICENCIA
          </div>
          <input id="lw-key-input" type="text"
            placeholder="ZYTEK-XXXX-XXXX-XXXX"
            style="width:100%;background:var(--surface2,#1e1e24);border:1px solid var(--border,rgba(255,255,255,.08));
              border-radius:7px;padding:12px 14px;color:var(--text,#f0f0f5);
              font-family:var(--mono,'DM Mono',monospace);font-size:14px;letter-spacing:2px;
              text-transform:uppercase;outline:none;box-sizing:border-box;
              transition:border-color .15s"
            oninput="this.value=this.value.toUpperCase();document.getElementById('lw-err').textContent=''"
            onfocus="this.style.borderColor='var(--orange-b,rgba(255,124,32,.3))'"
            onblur="this.style.borderColor='var(--border,rgba(255,255,255,.08))'"
            onkeydown="if(event.key==='Enter')document.getElementById('lw-btn').click()">
          <div id="lw-err" style="font-size:10px;font-family:var(--mono,'DM Mono',monospace);
            color:var(--red,#ff4757);margin-top:8px;min-height:16px;text-align:left"></div>
        </div>

        <button id="lw-btn"
          onclick="ZytekCore.LicenseWall._submit()"
          style="width:100%;padding:13px;background:var(--orange,#ff7c20);border:none;
            border-radius:9px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;
            font-family:var(--font,'DM Sans',sans-serif);transition:opacity .15s;margin-bottom:14px">
          Activar ZytekOS
        </button>

        <!-- Testing keys -->
        <div style="background:var(--surface,#16161a);border:1px solid var(--border,rgba(255,255,255,.08));
          border-radius:8px;padding:14px;text-align:left">
          <div style="font-size:9px;font-family:var(--mono,'DM Mono',monospace);
            color:var(--text-dim,#606070);letter-spacing:2px;margin-bottom:10px">CLAVES DE PRUEBA</div>
          ${Object.entries(LicenseService.DEMO_KEYS).map(([k,v])=>`
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));cursor:pointer"
              onclick="document.getElementById('lw-key-input').value='${k}';document.getElementById('lw-btn').click()">
              <span style="font-family:var(--mono,'DM Mono',monospace);font-size:11px;
                color:var(--orange,#ff7c20);flex:1">${k}</span>
              <span style="font-size:9px;background:var(--surface2,#1e1e24);
                color:var(--text-dim,#606070);padding:2px 7px;border-radius:8px">${v.plan}</span>
            </div>
          `).join('')}
          <div style="font-size:10px;color:var(--text-dim,#606070);margin-top:8px">
            Click en cualquier clave para activar directamente
          </div>
        </div>

        <div style="font-size:10px;color:var(--text-dim,#606070);margin-top:16px">
          ¿No tienes una clave? Contacta a
          <a href="mailto:dfornerino.usa@gmail.com" style="color:var(--orange,#ff7c20);text-decoration:none">Zytek LLC</a>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    this._el = el;
    setTimeout(()=>document.getElementById('lw-key-input')?.focus(), 100);
  },

  async _submit() {
    const input = document.getElementById('lw-key-input');
    const btn   = document.getElementById('lw-btn');
    const err   = document.getElementById('lw-err');
    if(!input) return;
    const key = input.value.trim().toUpperCase();
    if(!key) { if(err) err.textContent = 'Ingresa tu clave de licencia'; return; }

    // UI loading
    if(btn) { btn.textContent = 'Validando...'; btn.style.opacity='0.6'; btn.disabled=true; }
    if(err) err.textContent = '';

    const result = await LicenseService.validate(key);

    if(result.ok) {
      // Guardar key
      StateService.setStr('license_key', key);
      // Animación de éxito
      if(this._el) {
        this._el.innerHTML = `<div style="text-align:center;color:var(--green,#2ee87a)">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <div style="font-family:var(--serif,'Fraunces',serif);font-size:20px;font-weight:700;
            color:var(--text,#f0f0f5);margin-bottom:8px">Licencia activada</div>
          <div style="font-size:12px;font-family:var(--mono,'DM Mono',monospace);
            color:var(--text-dim,#606070)">${result.license.tenant} · Plan ${result.license.plan.toUpperCase()}</div>
        </div>`;
        setTimeout(()=>{ this.hide(); this._onActivate?.(result.license); }, 1200);
      }
    } else {
      const msgs = {
        invalid_format:   'Formato inválido. Ej: ZYTEK-DEMO-PRO-2025',
        not_found:        'Clave no encontrada. Verifica e intenta de nuevo.',
        expired:          'Esta licencia ha expirado. Renueva tu plan.',
        inactive:         'Licencia suspendida. Contacta soporte.',
        offline_no_cache: 'Sin conexión y sin caché local. Conéctate al internet.',
        network_error:    'Error de red. Intenta en unos segundos.',
      };
      if(err) err.textContent = msgs[result.reason] || 'Error desconocido: ' + result.reason;
      if(btn) { btn.textContent = 'Activar ZytekOS'; btn.style.opacity='1'; btn.disabled=false; }
    }
  },

  hide() {
    const el = document.getElementById('zytek-license-wall');
    if(el) { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(), 300); }
    this._el = null;
  }
};

async function init(moduleId, options={}){
  window.ZYTEK_MODULE = moduleId;
  injectTokens();
  EventBus.init();
  SyncService.initAutoSync();
  HealthMonitor.init();
  if(options.supabaseKey) StateService.setStr('sb_key', options.supabaseKey);

  // ── LICENSE VALIDATION ────────────────────────────────────────
  // Si skipLicense:true → saltear (para el shell, o en testing)
  if(!options.skipLicense) {
    // Intentar auto-cargar key guardada
    let lic = await LicenseService.autoLoad();

    if(!lic) {
      // No hay licencia válida → mostrar LicenseWall
      // El módulo NO termina de inicializar hasta que se active
      return new Promise((resolve) => {
        LicenseWall.show(moduleId, (license) => {
          StateService.setStr('license_key', license.key);
          console.info(`[ZytekOS] Licencia activada — ${license.tenant} · ${license.plan}`);
          // Continuar init normal después de activar
          const api = _buildApi(moduleId, options, license);
          EventBus.emit('license.activated', { moduleId, license });
          resolve(api);
        });
      });
    }

    // Validar que este módulo está permitido en el plan
    if(!LicenseService.canUseModule(moduleId)) {
      LicenseWall.show(moduleId, (license) => {
        window.location.reload();
      });
      const PLAN_NAMES = { basic:'Básico', pro:'Profesional', ent:'Enterprise' };
      // Override wall message para módulo bloqueado
      const err = document.getElementById('lw-err');
      if(err) err.textContent = `El módulo "${moduleId}" requiere un plan superior al actual (${lic.plan}).`;
      return new Promise(()=>{}); // never resolve — wall stays
    }

    console.info(`[ZytekOS] Licencia OK — ${lic.tenant} · ${lic.plan} · módulo: ${moduleId}`);
  }

  return _buildApi(moduleId, options, LicenseService.getCurrent());
}

function _buildApi(moduleId, options, license) {
  console.info(`[ZytekOS] Core v2.0 iniciado — módulo: ${moduleId}`);
  return {
    DOM, Fmt, StateService, EventBus,
    AuthService, IDB, SupabaseService, SyncService,
    ModuleRegistry, LicenseService, LicenseWall,
    license,
    PAIS_CONFIG,
    version: '2.0.1-licensed'
  };
}

// ── API PÚBLICA ───────────────────────────────────────────────
return {
  init, injectTokens,
  DOM, Fmt, StateService, EventBus,
  AuthService, IDB, SupabaseService, SyncService,
  ModuleRegistry, HealthMonitor,
  LicenseService, LicenseWall,
  PAIS_CONFIG,
  version: '2.0.1-licensed'
};

})();

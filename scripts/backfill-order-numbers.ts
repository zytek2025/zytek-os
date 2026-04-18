import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function backfill() {
  // Obtener todos los tenants con comandas sin número
  const { data: tenants, error: tErr } = await supabase
    .from('pos_orders')
    .select('tenant_id')
    .is('numero_comanda', null)

  if (tErr) {
    console.error('Error obteniendo tenants:', tErr)
    return
  }

  const uniqueTenants = [...new Set(tenants?.map(t => t.tenant_id))]
  console.log(`Tenants con comandas sin número: ${uniqueTenants.length}`)

  for (const tenantId of uniqueTenants) {
    // Obtener comandas sin número en orden cronológico
    const { data: orders } = await supabase
      .from('pos_orders')
      .select('id, created_at')
      .eq('tenant_id', tenantId)
      .is('numero_comanda', null)
      .order('created_at', { ascending: true })

    if (!orders || orders.length === 0) continue

    console.log(`\nTenant ${tenantId}: ${orders.length} comandas`)

    // Obtener el contador actual del tenant (puede existir ya)
    const { data: counter } = await supabase
      .from('pos_order_counters')
      .select('last_number')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    let nextNum = (counter?.last_number || 0) + 1

    for (const order of orders) {
      const numero = String(nextNum).padStart(5, '0')

      await supabase
        .from('pos_orders')
        .update({ numero_comanda: numero })
        .eq('id', order.id)

      console.log(`  ${numero} → ${order.id}`)
      nextNum++
    }

    // Actualizar el contador al último número asignado
    await supabase
      .from('pos_order_counters')
      .upsert({
        tenant_id: tenantId,
        last_number: nextNum - 1,
        updated_at: new Date().toISOString()
      })

    console.log(`Tenant ${tenantId} completado. Último número: ${nextNum - 1}`)
  }

  console.log('\nBackfill terminado')
}

backfill().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})

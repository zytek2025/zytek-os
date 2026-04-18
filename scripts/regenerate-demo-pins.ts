import { config } from 'dotenv'
config({ path: '.env.local' })

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function regenerate() {
  const users = [
    { id: '00000000-0000-0000-0100-000000000001', pin: '1234', name: 'Admin Demo' },
    { id: '00000000-0000-0000-0100-000000000002', pin: '5678', name: 'Mesero Demo' },
  ]

  for (const u of users) {
    const hash = await bcrypt.hash(u.pin, 10)
    const { error } = await supabase
      .from('zytek_users')
      .update({ pin_hash: hash })
      .eq('id', u.id)

    if (error) console.error(`Error ${u.name}:`, error)
    else console.log(`OK ${u.name} (PIN ${u.pin}) → hash actualizado`)
  }

  // Verificación
  const { data } = await supabase
    .from('zytek_users')
    .select('id, nombre, pin_hash')
    .in('id', ['00000000-0000-0000-0100-000000000001', '00000000-0000-0000-0100-000000000002'])

  for (const u of data || []) {
    const pin = u.id.endsWith('01') ? '1234' : '5678'
    const valid = await bcrypt.compare(pin, u.pin_hash)
    console.log(`Verify ${u.nombre}: bcrypt.compare('${pin}', hash) = ${valid}`)
  }
}

regenerate().then(() => process.exit(0))

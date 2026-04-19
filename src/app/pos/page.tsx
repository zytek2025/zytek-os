'use client'

import { useSubscription } from '@/hooks/useSubscription'
import POSRestaurant from '@/components/pos/POSRestaurant'

export default function POSPage() {
  const subscription = useSubscription()

  if (subscription.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
        Cargando...
      </div>
    )
  }

  if (!subscription.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
        Suscripción no activa
      </div>
    )
  }

  return <POSRestaurant subscription={subscription} />
}

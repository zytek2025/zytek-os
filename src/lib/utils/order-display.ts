// TODO: leer moneda del tenant config en el futuro
export function getOrderIdentifier(order: {
  mesa?: string | null
  mesa_numero?: number | null
  numero_comanda?: string | null
}): string {
  if (order.mesa && order.mesa !== 'Venta Directa' && !order.mesa.startsWith('Directa')) {
    return `Mesa ${order.mesa_numero || order.mesa}`
  }
  return `#${order.numero_comanda || '00000'}`
}

export function getOrderIdentifierShort(order: {
  mesa?: string | null
  mesa_numero?: number | null
  numero_comanda?: string | null
}): string {
  if (order.mesa && order.mesa !== 'Venta Directa' && !order.mesa.startsWith('Directa')) {
    return `M${order.mesa_numero || order.mesa}`
  }
  return `#${order.numero_comanda || '00000'}`
}

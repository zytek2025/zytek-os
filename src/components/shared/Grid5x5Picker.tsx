'use client'
// ─────────────────────────────────────────────────────────────
// ZytekOS — Grid5x5Picker
// Archivo: src/components/shared/Grid5x5Picker.tsx
// ─────────────────────────────────────────────────────────────
import type { CSSProperties, ReactNode } from 'react'

export interface Grid5x5PickerProps<T> {
  items: T[]
  getPosition: (item: T) => { x: number; y: number }
  renderItem: (item: T, isSelected: boolean) => ReactNode
  renderEmptyCell: (x: number, y: number) => ReactNode
  selectedItem?: T | null
  onCellClick?: (x: number, y: number) => void
  className?: string
  cols?: number
  rows?: number
}

/**
 * Cuadrícula visual configurable (default 5×5). Cada celda es un
 * item colocado (`renderItem`) o un slot vacío (`renderEmptyCell`).
 * La posición se guarda por el consumidor como `grid_x` / `grid_y`.
 *
 * Contrato:
 * - `selectedItem` se compara por referencia (`===`) contra `items`.
 * - Posiciones fuera del rango [0, cols) × [0, rows) se descartan.
 * - Colisiones en la misma celda las gana el último item del array.
 * - `onCellClick` dispara tanto en celdas ocupadas como vacías.
 *
 * @example
 * // Pickeando la disposición de mesas de una zona
 * <Grid5x5Picker<Mesa>
 *   items={mesas}
 *   getPosition={(m) => ({ x: m.grid_x, y: m.grid_y })}
 *   selectedItem={mesaActiva}
 *   onCellClick={(x, y) => abrirModalNuevaMesa({ x, y })}
 *   renderItem={(m, sel) => (
 *     <div style={{ outline: sel ? '2px solid #7F77DD' : 'none' }}>
 *       Mesa {m.numero}
 *     </div>
 *   )}
 *   renderEmptyCell={() => <div className="slot-vacio">+</div>}
 * />
 */
export function Grid5x5Picker<T>({
  items,
  getPosition,
  renderItem,
  renderEmptyCell,
  selectedItem = null,
  onCellClick,
  className,
  cols = 5,
  rows = 5,
}: Grid5x5PickerProps<T>) {
  // Indexar items por "x,y" para lookup O(1) al pintar cada celda.
  // Posiciones fuera de rango se descartan; colisiones las gana el último.
  const occupancy = new Map<string, T>()
  for (const item of items) {
    const { x, y } = getPosition(item)
    if (x < 0 || x >= cols || y < 0 || y >= rows) continue
    occupancy.set(`${x},${y}`, item)
  }

  const cells: ReactNode[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const item = occupancy.get(`${x},${y}`)
      const isSelected =
        item !== undefined && selectedItem != null && item === selectedItem

      cells.push(
        <div
          key={`${x}-${y}`}
          onClick={onCellClick ? () => onCellClick(x, y) : undefined}
          style={{
            minWidth: 0,
            minHeight: 0,
            cursor: onCellClick ? 'pointer' : 'default',
          }}
        >
          {item !== undefined
            ? renderItem(item, isSelected)
            : renderEmptyCell(x, y)}
        </div>
      )
    }
  }

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: 8,
    width: '100%',
    aspectRatio: `${cols} / ${rows}`,
  }

  return (
    <div className={className} style={gridStyle}>
      {cells}
    </div>
  )
}

export default Grid5x5Picker

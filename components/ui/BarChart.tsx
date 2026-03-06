import { cn } from '@/lib/utils'

/* Horizontal bar (for daily sales, treatment ranking) */
interface HBarItem {
  label: string
  value: number
  displayValue: string
  rank?: number
  subValue?: string
}
interface HBarProps {
  items: HBarItem[]
  accentColor?: string
}
export function HorizontalBarChart({ items, accentColor = '#d4510c' }: HBarProps) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-0 divide-y divide-[#eceae6]">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2.5 py-2">
          {item.rank !== undefined && (
            <div className={cn(
              'w-5 h-5 rounded-[5px] flex items-center justify-center text-[10px] font-black flex-shrink-0',
              item.rank === 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-[#f5f4f1] text-[#8a8a8a]'
            )}>
              {item.rank + 1}
            </div>
          )}
          {!item.rank && item.rank !== 0 && (
            <span className="text-xs font-semibold text-[#8a8a8a] w-7 flex-shrink-0">{item.label}</span>
          )}
          {item.rank !== undefined && (
            <span className="text-xs font-semibold text-[#0d0d0d] flex-1 truncate">{item.label}</span>
          )}
          {item.rank === undefined && (
            <div className="flex-1 h-1.5 bg-[#eceae6] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: (item.value / max * 100) + '%', background: accentColor }} />
            </div>
          )}
          {item.rank !== undefined && (
            <>
              <span className="text-[11px] text-[#8a8a8a] flex-shrink-0">{item.subValue}</span>
              <div className="w-14 h-1.5 bg-[#eceae6] rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full"
                  style={{ width: (item.value / max * 100) + '%', background: accentColor }} />
              </div>
            </>
          )}
          <span className="text-xs font-bold text-[#525252] min-w-[56px] text-right">{item.displayValue}</span>
        </div>
      ))}
    </div>
  )
}

/* Vertical bar (for peak hours, monthly revenue) */
interface VBarItem {
  label: string
  value: number
  displayValue?: string
  highlight?: boolean
}
interface VBarProps {
  items: VBarItem[]
  height?: number
  accentColor?: string
}
export function VerticalBarChart({ items, height = 80, accentColor = '#d4510c' }: VBarProps) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {items.map(item => (
        <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
          {item.displayValue && (
            <span className="text-[8px] font-bold text-[#8a8a8a] leading-none">{item.displayValue}</span>
          )}
          <div className="w-full flex flex-col justify-end" style={{ height: height - 28 }}>
            <div
              className="w-full rounded-t-[3px] transition-all duration-500"
              style={{
                height: Math.max((item.value / max * 100), 4) + '%',
                background: accentColor,
                opacity: item.highlight ? 1 : 0.55,
              }}
            />
          </div>
          <span className="text-[8px] font-semibold text-[#8a8a8a] leading-none">{item.label}</span>
          {item.displayValue === undefined && (
            <span className="text-[8px] font-bold text-[#525252] leading-none">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  )
}

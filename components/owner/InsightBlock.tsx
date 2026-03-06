interface Props { insights: string[] }

export function InsightBlock({ insights }: Props) {
  if (!insights.length) return null
  return (
    <div className="flex gap-4 bg-[#0d0d0d] rounded-xl p-5">
      <div className="w-[3px] flex-shrink-0 bg-[#d4510c] rounded-full self-stretch min-h-[16px]" />
      <div className="flex-1">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Insight Otomatis</p>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-baseline gap-2.5">
              <span className="font-mono text-[10px] text-[#e8784a] flex-shrink-0">0{i + 1}</span>
              <span className="text-[13px] text-white/50 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

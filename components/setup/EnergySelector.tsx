import { SectionHeader, EnergyMeter, ENERGY_OPTIONS } from '@/components/setup/primitives'

export default function EnergySelector({ energy, onSelect }: { energy: number | null; onSelect: (level: number) => void }) {
  return (
    <section className="card p-7 flex flex-col gap-6">
      <SectionHeader icon="⚡" title="Kako se osećaš danas?" />
      <div className="flex flex-col gap-3">
        {ENERGY_OPTIONS.map(opt => {
          const active = energy === opt.level
          return (
            <button
              key={opt.level}
              type="button"
              onClick={() => onSelect(opt.level)}
              className="flex items-center gap-4 p-4 text-left transition-all duration-200 active:scale-[0.99]"
              style={{
                borderRadius: 'var(--r-md)',
                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                // longhand only — mixing `background` shorthand with `backgroundImage`
                // makes React wipe the gradient on toggle (pale selected state).
                backgroundColor: active ? 'transparent' : 'var(--surface2)',
                backgroundImage: active ? 'linear-gradient(135deg, var(--gold) 0%, var(--gold-deep) 100%)' : 'none',
                color: active ? '#fff' : 'var(--text)',
                boxShadow: active ? 'var(--sh-gold), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
                textShadow: active ? '0 1px 3px rgba(70,30,2,0.55)' : undefined,
                transform: active ? 'translateY(-2px)' : undefined,
              }}
            >
              <span
                className="grid place-items-center w-12 h-12 rounded-full text-2xl shrink-0"
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.22)' : opt.tint,
                  boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.4)' : 'inset 0 0 0 1px var(--hairline)',
                }}
              >
                {opt.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[0.97rem] leading-tight">{opt.label}</div>
                <div className="text-xs mt-0.5" style={{ opacity: active ? 0.92 : 0.62 }}>{opt.desc}</div>
              </div>
              <EnergyMeter strength={6 - opt.level} active={active} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

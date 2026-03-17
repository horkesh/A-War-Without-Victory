export type TempoType = 'slow' | 'normal' | 'fast';

interface TempoSelectorProps {
    value: TempoType;
    onChange: (tempo: TempoType) => void;
}

const OPTIONS: { id: TempoType; label: string; desc: string }[] = [
    { id: 'slow', label: 'Methodical', desc: 'low casualties, slow pace' },
    { id: 'normal', label: 'Standard', desc: 'balanced approach' },
    { id: 'fast', label: 'All-Out', desc: 'high intensity, rapid gain' },
];

export function TempoSelector({ value, onChange }: TempoSelectorProps) {
    const current = value;
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.2em]">Operational Tempo</label>
            <div className="flex bg-black/40 border border-white/10 rounded p-1">
                {OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => onChange(opt.id)}
                        className={`flex-1 py-2 px-1 rounded flex flex-col items-center justify-center transition-all ${current === opt.id
                            ? 'bg-accent-gold text-black shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-tight">{opt.label}</span>
                    </button>
                ))}
            </div>
            <div className="px-1">
                <p className="text-[9px] text-slate-500 italic uppercase tracking-tighter text-center">
                    {OPTIONS.find(o => o.id === current)?.desc}
                </p>
            </div>
        </div>
    );
}

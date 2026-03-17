import { OpType } from './OpsMapRenderer';

interface PlaybookSelectorProps {
    selected: OpType;
    onSelect: (type: OpType) => void;
}

const PLAYBOOKS = [
    {
        id: 'offensive' as const,
        label: 'Sector Offensive',
        desc: 'Concentrated push on local points.',
        flavor: 'Standard doctrinal offensive.'
    },
    {
        id: 'feint' as const,
        label: 'Deceptive Maneuver',
        desc: 'Draw reserves away.',
        flavor: 'Deception & masking.'
    },
    {
        id: 'recon' as const,
        label: 'Reconnaissance',
        desc: 'Test enemy reaction.',
        flavor: 'Force-in-recon.'
    }
];

export function PlaybookSelector({ selected, onSelect }: PlaybookSelectorProps) {
    const current = selected;
    const onChange = onSelect;
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.2em]">Operational Playbook</label>
            <div className="grid grid-cols-1 gap-2">
                {PLAYBOOKS.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => onChange(p.id)}
                        className={`group relative p-3 text-left border rounded transition-all flex flex-col gap-1 overflow-hidden ${current === p.id
                            ? 'bg-accent-gold/10 border-accent-gold shadow-[inset_0_0_15px_rgba(200,165,110,0.1)]'
                            : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'
                            }`}
                    >
                        {/* Selected Indicator */}
                        {current === p.id && (
                            <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center">
                                <span className="text-accent-gold text-lg leading-none">◈</span>
                            </div>
                        )}

                        <div className={`text-xs font-black uppercase tracking-wider transition-colors ${current === p.id ? 'text-accent-gold' : 'text-slate-300 group-hover:text-white'}`}>
                            {p.label}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                            {p.desc}
                        </div>
                        <div className="mt-1 text-[8px] italic text-slate-500 uppercase tracking-tighter">
                            {p.flavor}
                        </div>

                        {/* Animated gradient for active */}
                        {current === p.id && (
                            <div className="absolute bottom-0 left-0 h-0.5 bg-accent-gold animate-[shimmer_2s_infinite]" style={{ width: '100%' }} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

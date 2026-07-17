export type TempoType = 'slow' | 'normal' | 'fast';
import { t } from '../../i18n';
import type { MessageKey } from '../../i18n/messages.en';

interface TempoSelectorProps {
    value: TempoType;
    onChange: (tempo: TempoType) => void;
}

const OPTIONS: { id: TempoType; labelKey: MessageKey; descKey: MessageKey }[] = [
    { id: 'slow', labelKey: 'planUi.methodical', descKey: 'planUi.methodicalDesc' },
    { id: 'normal', labelKey: 'planUi.standard', descKey: 'planUi.standardDesc' },
    { id: 'fast', labelKey: 'planUi.allOut', descKey: 'planUi.allOutDesc' },
];

export function TempoSelector({ value, onChange }: TempoSelectorProps) {
    const current = value;
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-accent-gold uppercase tracking-[0.2em]">{t('planUi.operationalTempo')}</label>
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
                        <span className="text-xs font-black uppercase tracking-tight">{t(opt.labelKey)}</span>
                    </button>
                ))}
            </div>
            <div className="px-1">
                <p className="text-xs text-slate-500 italic uppercase tracking-tighter text-center">
                    {t(OPTIONS.find(o => o.id === current)?.descKey ?? 'planUi.standardDesc')}
                </p>
            </div>
        </div>
    );
}

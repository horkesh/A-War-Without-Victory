import { FormationView } from '../../data/types';
import { t, useLocale } from '../../i18n';
import { getLocalizedFormationName } from '../../data/formationNameLocalizations';

interface TacticalCardProps {
    formation: FormationView;
    onClick?: (id: string) => void;
    active?: boolean;
}

export function TacticalCard({ formation, onClick, active }: TacticalCardProps) {
    const [locale] = useLocale();
    const formationName = getLocalizedFormationName(formation, locale);
    const personnel = formation.personnel ?? 0;
    const tanks = formation.composition?.tanks ?? 0;
    const cohesion = formation.cohesion ?? 50;
    const fatigue = formation.fatigue ?? 0;

    return (
        <button
            onClick={() => onClick?.(formation.id)}
            className={`w-[140px] h-full shrink-0 flex flex-col p-3 border rounded transition-all text-left relative overflow-hidden group ${active
                ? 'bg-accent-gold/10 border-accent-gold'
                : 'bg-[#1a1c22] border-white/5 hover:border-white/20 hover:bg-[#20222a]'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <div className="text-[10px] font-black text-white leading-none mb-0.5 group-hover:text-accent-gold transition-colors">{formationName}</div>
                    <div className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">{t('planUi.factionBrigade', { faction: formation.faction })}</div>
                </div>
                {/* NATO Symbol Placeholder */}
                <div className="w-5 h-4 bg-slate-700/50 rounded-sm border border-white/10 flex items-center justify-center text-[8px] text-slate-400">
                    ✕
                </div>
            </div>

            <div className="flex-1 space-y-2">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase font-bold">{t('formationDetail.personnel')}</span>
                        <span className="text-xs font-mono text-slate-200">{personnel.toLocaleString()}</span>
                    </div>
                    {tanks > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] text-slate-500 uppercase font-bold">{t('planUi.armor')}</span>
                            <span className="text-xs font-mono text-slate-200">{tanks}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[7px] uppercase font-bold">
                        <span className="text-slate-500">{t('formationDetail.cohesion')}</span>
                        <span className={cohesion < 30 ? 'text-red-400' : 'text-slate-400'}>{Math.round(cohesion)}%</span>
                    </div>
                    <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/60" style={{ width: `${cohesion}%` }} />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[7px] uppercase font-bold">
                        <span className="text-slate-500">{t('formationDetail.fatigue')}</span>
                        <span className={fatigue > 70 ? 'text-red-400' : 'text-slate-400'}>{fatigue}%</span>
                    </div>
                    <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500/60 transition-all" style={{ width: `${fatigue}%` }} />
                    </div>
                </div>
            </div>

            {/* Hover Glint */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
        </button>
    );
}

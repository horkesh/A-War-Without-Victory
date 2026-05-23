import type { FormationView } from '../data/types';
import { getLocalizedFormationName } from '../data/formationNameLocalizations';
import { getPlayerSafeBrigadeName } from '../utils/playerSafeText';
import { t, useLocale } from '../i18n';

function getFitnessColor(personnel: number, cohesion: number, fatigue: number): string {
    if (personnel < 400 || cohesion < 20 || fatigue > 70) return '#c24040';
    if (cohesion < 40 || fatigue > 50) return '#c4a35a';
    return '#4a9a55';
}

interface TacticalCardProps {
    formation: FormationView;
    isAssigned: boolean;
    onClick: () => void;
    axisColor?: string; // e.g. 'bg-red-400' (from dot colors)
    axisLabelColor?: string; // 'red-500' for borders/text optionally
}

export function TacticalCard({ formation, isAssigned, onClick, axisColor, axisLabelColor }: TacticalCardProps) {
    const [locale] = useLocale();
    const name = getPlayerSafeBrigadeName(getLocalizedFormationName(formation, locale));
    const pers = formation.personnel ?? 0;
    const fat = formation.fatigue ?? 0;
    const coh = formation.cohesion ?? 0;
    const tanks = formation.composition?.tanks ?? 0;
    const arty = formation.composition?.artillery ?? 0;

    // A simple text NATO symbol
    const natoSymbolText = tanks >= arty && tanks > 20 ? '[==]' : '[ X ]';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-stretch text-left rounded overflow-hidden border transition-all duration-200 group ${isAssigned
                ? 'bg-black/60 shadow-[0_0_10px_rgba(255,255,255,0.05)] border-interactive/50 relative z-10'
                : 'bg-panel-card border-panel-border hover:bg-panel-hover hover:border-interactive/30'
                }`}
            style={{
                borderColor: isAssigned && axisLabelColor ? axisLabelColor : undefined
            }}
        >
            {/* Left accent strip — fitness color when not axis-assigned */}
            <div
                className={`w-1.5 shrink-0 ${isAssigned && axisColor ? axisColor : ''}`}
                style={{ backgroundColor: isAssigned && axisColor ? undefined : getFitnessColor(pers, coh, fat) }}
            />

            <div className="flex-1 p-2 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-[10px] font-bold shrink-0 ${isAssigned ? 'text-white' : 'text-accent-gold'}`}>{natoSymbolText}</span>
                    <span className={`font-semibold text-xs truncate ${isAssigned ? 'text-white' : 'text-text-primary'}`}>
                        {name}
                    </span>
                </div>

                <div className="flex justify-between items-end mt-1.5">
                    {/* Stats */}
                    <div className="flex gap-2 text-[10px] text-text-secondary font-mono">
                        <span title={t('formationDetail.personnel')} className="flex items-center gap-0.5">
                            <span className="opacity-50">#</span>{pers.toLocaleString()}
                        </span>
                        {(tanks > 0 || arty > 0) && (
                            <span title={t('corpsDetail.equipment')} className="flex items-center gap-0.5 text-interactive/80">
                                {tanks > 0 && <span>{tanks}T</span>}
                                {tanks > 0 && arty > 0 && <span className="opacity-30">/</span>}
                                {arty > 0 && <span>{arty}A</span>}
                            </span>
                        )}
                    </div>

                    {/* Bars */}
                    <div className="flex flex-col gap-1 w-12 shrink-0">
                        <div className="flex items-center gap-1 group/bar" title={t('tacticalCard.cohesionTitle', { value: Math.round(coh) })}>
                            <span className="text-[7px] text-text-secondary uppercase w-4 leading-none text-right">{t('tacticalCard.cohShort')}</span>
                            <div className="h-1 flex-1 bg-black/50 rounded-full overflow-hidden">
                                <div className={`h-full ${coh > 60 ? 'bg-green-500' : coh > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, Math.max(0, coh))}%` }} />
                            </div>
                        </div>
                        <div className="flex items-center gap-1 group/bar" title={t('tacticalCard.fatigueTitle', { value: Math.round(fat) })}>
                            <span className="text-[7px] text-text-secondary w-4 leading-none text-right uppercase">{t('tacticalCard.fatShort')}</span>
                            <div className="h-1 flex-1 bg-black/50 rounded-full overflow-hidden">
                                <div className={`h-full ${fat > 70 ? 'bg-red-500' : fat > 40 ? 'bg-yellow-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, Math.max(0, fat))}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right quick-assign icon (hover) */}
            <div className={`w-6 shrink-0 flex items-center justify-center bg-black/20 text-[10px] ${isAssigned ? 'text-interactive/80 hover:bg-red-500/20 hover:text-red-400' : 'text-transparent group-hover:text-interactive/80 group-hover:bg-interactive/10'} transition-all border-l border-panel-border/30`}>
                {isAssigned ? '&#10005;' : '&#65291;'}
            </div>
        </button>
    );
}

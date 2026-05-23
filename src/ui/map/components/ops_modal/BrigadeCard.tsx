/**
 * Brigade card for the ops planning tray.
 * NO CHECKBOXES — click the card to toggle assignment.
 */
import { memo, useCallback } from 'react';
import type { FormationView } from '../../data/types';
import { t, useLocale } from '../../i18n';
import { getLocalizedFormationName } from '../../data/formationNameLocalizations';

interface BrigadeCardProps {
    brigade: FormationView;
    isAssigned: boolean;
    isAutoProposed: boolean;
    marchTurns: number | null;
    factionColor: string;
    onToggle: (brigadeId: string) => void;
}

function getMarchColor(turns: number | null): string {
    if (turns === null || turns === 99) return 'text-text-secondary/50';
    if (turns <= 1) return 'text-green-400';
    if (turns <= 3) return 'text-amber-400';
    return 'text-red-400';
}

// WP2c: Verbal cohesion descriptor
function getCohesionLabel(coh: number): { text: string; color: string } {
    if (coh >= 70) return { text: t('opsModal.strong'), color: 'text-green-400' };
    if (coh >= 40) return { text: t('opsModal.adequate'), color: 'text-amber-400' };
    return { text: t('peace.critical').toUpperCase(), color: 'text-red-400' };
}

// WP2d: Fatigue descriptor
function getFatigueLabel(fat: number): { text: string; color: string } {
    if (fat <= 2) return { text: t('opsModal.fresh'), color: 'text-green-400' };
    if (fat <= 5) return { text: t('opsModal.tired'), color: 'text-amber-400' };
    return { text: t('oob.exhausted').toUpperCase(), color: 'text-red-400' };
}

// WP2e: Parse unit type from brigade name
function parseUnitType(name: string): string | null {
    const lower = name.toLowerCase();
    if (lower.includes('motorized') || lower.includes('motorizov')) return 'MOTORIZED';
    if (lower.includes('mechanized') || lower.includes('mehanizirane')) return 'MECHANIZED';
    if (lower.includes('mountain') || lower.includes('brdsk') || lower.includes('planin')) return 'MOUNTAIN';
    if (lower.includes('light infantry') || lower.includes('lahk')) return 'LIGHT INFANTRY';
    if (lower.includes('guards') || lower.includes('gardijsk')) return 'GUARDS';
    if (lower.includes('artillery') || lower.includes('artiljerij')) return 'ARTILLERY';
    if (lower.includes('special') || lower.includes('posebn')) return 'SPECIAL';
    if (lower.includes('infantry') || lower.includes('p\u0159\u0161')) return 'INFANTRY';
    // DECISION NEEDED: No unit_type field on FormationView — parsing from name as fallback per spec 2e
    return null;
}

export const BrigadeCard = memo(function BrigadeCard({ brigade, isAssigned, isAutoProposed, marchTurns, factionColor, onToggle }: BrigadeCardProps) {
    const [locale] = useLocale();
    const brigadeName = getLocalizedFormationName(brigade, locale);
    const personnel = brigade.personnel ?? 0;
    const isCombatIneffective = personnel < 400;
    const isDisrupted = !!brigade.disrupted_turns;
    const isUnavailable = isCombatIneffective || isDisrupted;
    const tanks = brigade.composition?.tanks ?? 0;
    const arty = brigade.composition?.artillery ?? 0;
    const cohesion = brigade.cohesion ?? 50;
    const fatigue = brigade.fatigue ?? 0;
    const cohLabel = getCohesionLabel(cohesion);
    const fatLabel = getFatigueLabel(fatigue);
    const unitType = parseUnitType(brigade.name);

    return (
        <button
            type="button"
            onClick={isUnavailable ? undefined : () => onToggle(brigade.id)}
            disabled={isUnavailable}
            // WP2f: title attribute on card
            title={`${brigadeName}\nPersonnel: ${personnel.toLocaleString()}\nTanks: ${tanks} \u00B7 Artillery: ${arty}\nCohesion: ${Math.round(cohesion)} \u00B7 Fatigue: ${Math.round(fatigue)}\nMarch: ${marchTurns === 0 ? 'In position' : marchTurns === null || marchTurns === 99 ? 'Unknown' : `${marchTurns} turns`}`}
            className={`
                relative w-[160px] min-w-[160px] h-[140px] rounded-md border p-2.5 text-left transition-all
                ${isUnavailable
                    ? 'opacity-30 cursor-not-allowed border-[rgba(180,160,130,0.05)] bg-[rgba(20,18,15,0.4)]'
                    : isAssigned
                        ? 'border-l-[3px] shadow-lg bg-[rgba(40,36,30,0.8)] hover:bg-[rgba(50,46,38,0.9)]'
                        : 'border-[rgba(180,160,130,0.08)] bg-[rgba(30,28,24,0.5)] hover:bg-[rgba(40,36,30,0.7)] hover:border-[rgba(180,160,130,0.2)]'
                }
            `}
            style={{
                // WP2g: Combat ineffective red border
                ...(isUnavailable && isCombatIneffective ? { borderLeftColor: '#c24040', borderLeftWidth: '3px' } : {}),
                ...(isAssigned && !isUnavailable ? { borderLeftColor: factionColor } : {}),
            }}
        >
            {/* Suggested badge */}
            {isAutoProposed && isAssigned && (
                <div className="absolute top-1 right-1 text-[7px] font-bold uppercase tracking-wider
                                px-1 py-0.5 rounded bg-accent-gold/15 text-accent-gold">
                    {t('opsModal.suggested')}
                </div>
            )}

            {/* Unavailable overlay */}
            {isUnavailable && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400/60 rotate-[-15deg]">
                        {isCombatIneffective ? t('opsModal.combatIneffective') : t('formationDetail.disrupted')}
                    </span>
                </div>
            )}

            {/* Brigade name */}
            <div className="text-[10px] font-bold text-white truncate" style={{ fontFamily: "'Courier New', monospace" }}>
                {brigadeName}
            </div>

            {/* WP2e: Unit type indicator */}
            {unitType && (
                <div className="text-[8px] font-bold uppercase tracking-wider text-accent-gold/70 mt-0.5">
                    {unitType}
                </div>
            )}

            {/* Personnel */}
            <div className="text-[18px] font-bold text-white mt-1 leading-none">
                {personnel.toLocaleString()}
            </div>

            {/* WP2a: Equipment labels — always show both, spelled out */}
            <div className="flex gap-2 mt-1.5 text-[9px] text-text-secondary">
                <span>{t('formationDetail.tanks').toUpperCase()} <span className="text-white font-bold">{tanks}</span></span>
                <span className="text-text-secondary/30">&middot;</span>
                <span>{t('peace.artyCount', { count: '' }).trim().toUpperCase()} <span className="text-white font-bold">{arty}</span></span>
            </div>

            {/* Cohesion bar */}
            <div className="mt-1.5">
                <div className="h-1 bg-[rgba(180,160,130,0.08)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${Math.min(100, Math.max(0, cohesion))}%`,
                            backgroundColor: cohesion >= 70 ? '#4a9a55' : cohesion >= 40 ? '#c4a35a' : '#c24040',
                        }}
                    />
                </div>
                {/* WP2b: Cohesion/Fatigue readability — 9px, full opacity */}
                {/* WP2c/2d: Verbal descriptors with colors */}
                <div className="flex justify-between text-[9px] text-text-secondary mt-0.5">
                    <span>{t('tacticalCard.cohShort').toUpperCase()} {Math.round(cohesion)} <span className={cohLabel.color}>{cohLabel.text}</span></span>
                    <span>{t('tacticalCard.fatShort').toUpperCase()} {Math.round(fatigue)} <span className={fatLabel.color}>{fatLabel.text}</span></span>
                </div>
            </div>

            {/* March time */}
            <div className={`text-[10px] font-bold mt-1 ${getMarchColor(marchTurns)}`}>
                {marchTurns === null || marchTurns === 99
                    ? '\u2014'
                    : marchTurns === 0
                        ? 'In position'
                        : `${marchTurns} turn${marchTurns > 1 ? 's' : ''} march`
                }
            </div>
        </button>
    );
});

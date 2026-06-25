/**
 * Brigade card for the ops planning tray.
 * NO CHECKBOXES - click the card to toggle assignment.
 */
import { memo, useCallback } from 'react';
import type { FormationView } from '../../data/types';
import { t, useLocale, type Locale, type MessageKey } from '../../i18n';
import { getFormationUnitType, getLocalizedFormationName } from '../../data/formationNameLocalizations';

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
function getCohesionLabel(coh: number | null): { text: string; color: string } {
    if (coh == null) return { text: t('operationsSection.metricUnreported'), color: 'text-text-secondary' };
    if (coh >= 70) return { text: t('opsModal.strong'), color: 'text-green-400' };
    if (coh >= 40) return { text: t('opsModal.adequate'), color: 'text-amber-400' };
    return { text: t('peace.critical').toUpperCase(), color: 'text-red-400' };
}

// WP2d: Fatigue descriptor
function getFatigueLabel(fat: number | null): { text: string; color: string } {
    if (fat == null) return { text: t('operationsSection.metricUnreported'), color: 'text-text-secondary' };
    if (fat <= 2) return { text: t('opsModal.fresh'), color: 'text-green-400' };
    if (fat <= 5) return { text: t('opsModal.tired'), color: 'text-amber-400' };
    return { text: t('oob.exhausted').toUpperCase(), color: 'text-red-400' };
}

const UNIT_TYPE_LABEL_KEYS: Record<string, MessageKey> = {
    armored: 'opsModal.unitType.armored',
    guards: 'opsModal.unitType.guards',
    infantry: 'opsModal.unitType.infantry',
    light: 'opsModal.unitType.light',
    light_infantry: 'opsModal.unitType.lightInfantry',
    mechanized: 'opsModal.unitType.mechanized',
    motorized: 'opsModal.unitType.motorized',
    mountain: 'opsModal.unitType.mountain',
};

function formatInteger(value: number, locale: Locale): string {
    return value.toLocaleString(locale === 'bcs' ? 'bs-BA' : 'en-US');
}

function formatOptionalInteger(value: number | null | undefined, locale: Locale): string {
    return typeof value === 'number' && Number.isFinite(value)
        ? formatInteger(value, locale)
        : t('operationsSection.metricUnreported', undefined, locale);
}

function formatOptionalMetric(value: number | null | undefined, locale: Locale): string {
    return typeof value === 'number' && Number.isFinite(value)
        ? String(Math.round(value))
        : t('operationsSection.metricUnreported', undefined, locale);
}

function formatMarchTurns(turns: number, locale: Locale): string {
    return t(turns === 1 ? 'opsModal.march.turn.one' : 'opsModal.march.turn.many', { count: turns }, locale);
}

function formatMarchTooltip(turns: number | null, locale: Locale): string {
    if (turns === 0) return t('opsModal.march.inPosition', undefined, locale);
    if (turns === null || turns === 99) return t('opsModal.march.unknown', undefined, locale);
    return formatMarchTurns(turns, locale);
}

function formatMarchDisplay(turns: number, locale: Locale): string {
    return t(turns === 1 ? 'opsModal.march.display.one' : 'opsModal.march.display.many', { count: turns }, locale);
}

export const BrigadeCard = memo(function BrigadeCard({ brigade, isAssigned, isAutoProposed, marchTurns, factionColor, onToggle }: BrigadeCardProps) {
    const [locale] = useLocale();
    const brigadeName = getLocalizedFormationName(brigade, locale);
    const personnel = typeof brigade.personnel === 'number' && Number.isFinite(brigade.personnel) ? brigade.personnel : null;
    const personnelLabel = formatOptionalInteger(personnel, locale);
    const isCombatIneffective = personnel != null && personnel < 400;
    const isDisrupted = !!brigade.disrupted_turns;
    const isUnavailable = isCombatIneffective || isDisrupted;
    const reportedTanks = typeof brigade.composition?.tanks === 'number' && Number.isFinite(brigade.composition.tanks) ? brigade.composition.tanks : null;
    const reportedArty = typeof brigade.composition?.artillery === 'number' && Number.isFinite(brigade.composition.artillery) ? brigade.composition.artillery : null;
    const reportedCohesion = typeof brigade.cohesion === 'number' && Number.isFinite(brigade.cohesion) ? brigade.cohesion : null;
    const reportedFatigue = typeof brigade.fatigue === 'number' && Number.isFinite(brigade.fatigue) ? brigade.fatigue : null;
    const cohLabel = getCohesionLabel(reportedCohesion);
    const fatLabel = getFatigueLabel(reportedFatigue);
    const unitTypeKey = UNIT_TYPE_LABEL_KEYS[getFormationUnitType(brigade)] ?? null;
    const unitType = unitTypeKey ? t(unitTypeKey, undefined, locale) : null;
    const reportedTitle = [
        brigadeName,
        t('opsModal.brigadeTooltip.personnel', { count: personnelLabel }, locale),
        `${t('opsModal.brigadeTooltip.tanks', { count: formatOptionalInteger(reportedTanks, locale) }, locale)} | ${t('opsModal.brigadeTooltip.artillery', { count: formatOptionalInteger(reportedArty, locale) }, locale)}`,
        `${t('opsModal.brigadeTooltip.cohesion', { value: formatOptionalMetric(reportedCohesion, locale) }, locale)} | ${t('opsModal.brigadeTooltip.fatigue', { value: formatOptionalMetric(reportedFatigue, locale) }, locale)}`,
        t('opsModal.brigadeTooltip.march', { value: formatMarchTooltip(marchTurns, locale) }, locale),
    ].join('\n');

    return (
        <button
            type="button"
            onClick={isUnavailable ? undefined : () => onToggle(brigade.id)}
            disabled={isUnavailable}
            // WP2f: title attribute on card
            title={reportedTitle}
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
                {personnelLabel}
            </div>

            {/* WP2a: Equipment labels - always show both, spelled out */}
            <div className="flex gap-2 mt-1.5 text-[9px] text-text-secondary">
                <span>{t('formationDetail.tanks').toUpperCase()} <span className="text-white font-bold">{formatOptionalInteger(reportedTanks, locale)}</span></span>
                <span className="text-text-secondary/30">&middot;</span>
                <span>{t('peace.artyCount', { count: '' }).trim().toUpperCase()} <span className="text-white font-bold">{formatOptionalInteger(reportedArty, locale)}</span></span>
            </div>

            {/* Cohesion bar */}
            <div className="mt-1.5">
                <div className="h-1 bg-[rgba(180,160,130,0.08)] rounded-full overflow-hidden">
                    {reportedCohesion != null && (
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${Math.min(100, Math.max(0, reportedCohesion))}%`,
                                backgroundColor: reportedCohesion >= 70 ? '#4a9a55' : reportedCohesion >= 40 ? '#c4a35a' : '#c24040',
                            }}
                        />
                    )}
                </div>
                {/* WP2b: Cohesion/Fatigue readability - 9px, full opacity */}
                {/* WP2c/2d: Verbal descriptors with colors */}
                <div className="flex justify-between text-[9px] text-text-secondary mt-0.5">
                    <span>{t('tacticalCard.cohShort').toUpperCase()} {formatOptionalMetric(reportedCohesion, locale)} <span className={cohLabel.color}>{cohLabel.text}</span></span>
                    <span>{t('tacticalCard.fatShort').toUpperCase()} {formatOptionalMetric(reportedFatigue, locale)} <span className={fatLabel.color}>{fatLabel.text}</span></span>
                </div>
            </div>

            {/* March time */}
            <div className={`text-[10px] font-bold mt-1 ${getMarchColor(marchTurns)}`}>
                {marchTurns === null || marchTurns === 99
                    ? '\u2014'
                    : marchTurns === 0
                        ? t('opsModal.march.inPosition', undefined, locale)
                        : formatMarchDisplay(marchTurns, locale)
                }
            </div>
        </button>
    );
});

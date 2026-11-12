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
    if (turns === null || turns === 99) return 'text-[#9c917b]';
    if (turns <= 1) return 'text-emerald-200';
    if (turns <= 3) return 'text-amber-200';
    return 'text-red-200';
}

// WP2c: Verbal cohesion descriptor
function getCohesionLabel(coh: number | null): { text: string; color: string } {
    if (coh == null) return { text: t('operationsSection.metricUnreported'), color: 'text-text-secondary' };
    if (coh >= 70) return { text: t('opsModal.strong'), color: 'text-emerald-200' };
    if (coh >= 40) return { text: t('opsModal.adequate'), color: 'text-amber-200' };
    return { text: t('peace.critical').toUpperCase(), color: 'text-red-200' };
}

// WP2d: Fatigue descriptor
function getFatigueLabel(fat: number | null): { text: string; color: string } {
    if (fat == null) return { text: t('operationsSection.metricUnreported'), color: 'text-text-secondary' };
    if (fat <= 2) return { text: t('opsModal.fresh'), color: 'text-emerald-200' };
    if (fat <= 5) return { text: t('opsModal.tired'), color: 'text-amber-200' };
    return { text: t('oob.exhausted').toUpperCase(), color: 'text-red-200' };
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
            aria-pressed={isAssigned}
            // WP2f: title attribute on card
            title={reportedTitle}
            className={`
                relative flex w-full flex-col gap-1.5 rounded-md border px-3.5 py-3 text-left transition
                ${isUnavailable
                    ? 'cursor-default border-[#262b35] bg-[#12161e] opacity-60'
                    : isAssigned
                        ? 'border-[#c9a75c] border-l-4 bg-[#232936]'
                        : 'border-[#2a303c] bg-[#161a22] hover:border-[#4a4436]'
                }
            `}
            style={{
                // WP2g: Combat ineffective red edge
                ...(isUnavailable && isCombatIneffective ? { borderLeftColor: '#c24040', borderLeftWidth: '4px' } : {}),
                ...(isAssigned && !isUnavailable ? { borderLeftColor: factionColor } : {}),
            }}
        >
            {/* Brigade name, with the suggested chip when staff proposed it */}
            <span className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate text-[16px] font-semibold leading-snug text-[#f1e6c8]">
                    {brigadeName}
                </span>
                {isAutoProposed && isAssigned && (
                    <span className="shrink-0 rounded border border-[#c9a75c]/60 px-2 py-0.5 font-mono text-[13px] font-semibold text-[#e0c27a]">
                        {t('opsModal.suggested')}
                    </span>
                )}
            </span>

            {/* WP2e: Unit type indicator */}
            {unitType && (
                <span className="text-[14px] text-[#b9ad94]">
                    {unitType}
                </span>
            )}

            {/* Unavailable: why */}
            {isUnavailable && (
                <span className="text-[14px] font-semibold text-red-200">
                    {isCombatIneffective ? t('opsModal.combatIneffective') : t('formationDetail.disrupted')}
                </span>
            )}

            {/* Personnel */}
            <span className="font-mono text-[22px] font-semibold leading-none tabular-nums text-[#f6ecd2]">
                {personnelLabel}
            </span>

            {/* WP2a: Equipment labels - always show both, spelled out */}
            <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[14px] text-[#b9ad94]">
                <span>{t('formationDetail.tanks')} <span className="font-semibold text-[#f1e6c8]">{formatOptionalInteger(reportedTanks, locale)}</span></span>
                <span>{t('peace.artyCount', { count: '' }).trim()} <span className="font-semibold text-[#f1e6c8]">{formatOptionalInteger(reportedArty, locale)}</span></span>
            </span>

            {/* Cohesion bar */}
            <span className="flex flex-col gap-1">
                <span className="block h-1.5 overflow-hidden rounded-full bg-[#262b35]">
                    {reportedCohesion != null && (
                        <span
                            className="block h-full rounded-full transition-all"
                            style={{
                                width: `${Math.min(100, Math.max(0, reportedCohesion))}%`,
                                backgroundColor: reportedCohesion >= 70 ? '#4a9a55' : reportedCohesion >= 40 ? '#c4a35a' : '#c24040',
                            }}
                        />
                    )}
                </span>
                {/* WP2c/2d: Verbal descriptors with colors */}
                <span className="flex flex-wrap justify-between gap-x-2 text-[14px] text-[#b9ad94]">
                    <span>{t('tacticalCard.cohShort')} {formatOptionalMetric(reportedCohesion, locale)} <span className={cohLabel.color}>{cohLabel.text}</span></span>
                    <span>{t('tacticalCard.fatShort')} {formatOptionalMetric(reportedFatigue, locale)} <span className={fatLabel.color}>{fatLabel.text}</span></span>
                </span>
            </span>

            {/* March time */}
            <span className={`text-[14px] font-semibold ${getMarchColor(marchTurns)}`}>
                {marchTurns === null || marchTurns === 99
                    ? '—'
                    : marchTurns === 0
                        ? t('opsModal.march.inPosition', undefined, locale)
                        : formatMarchDisplay(marchTurns, locale)
                }
            </span>
        </button>
    );
});

/**
 * Shared player-facing copy for strategic-dimension shifts (`dimension_shifts`).
 *
 * §6 E2 (2026-11-17): the retired `negotiation_capital` effect kind printed costs that never
 * happened. Its live replacements are `dimension_shifts`, so the cost the engine applies is
 * shown where it becomes live:
 * - the decision modal previews an option's shifts (`describeDimensionShift`, moved here
 *   from EventDecisionModal unchanged);
 * - the automatic-card acknowledgement list (App.tsx) lists a fired card's own shifts
 *   (`buildAcknowledgementDimensionShiftEntries`).
 *
 * Deterministic: acknowledgement entries are ordered by faction, then dimension, with
 * strictCompare; zero deltas are not shown.
 */
import type { DimensionShift } from '../../../sim/events/event_types';
import { strictCompare } from '../../../state/validateGameState.js';
import { t, type MessageKey } from '../i18n';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';

/** Per-dimension labels, shared with the Diplomacy overview. */
export const DIMENSION_LABEL_KEYS: Partial<Record<string, MessageKey>> = {
    military_credibility: 'diplomacyOverview.dimension.military_credibility',
    territorial_legitimacy: 'diplomacyOverview.dimension.territorial_legitimacy',
    international_standing: 'diplomacyOverview.dimension.international_standing',
    patron_confidence: 'diplomacyOverview.dimension.patron_confidence',
    internal_cohesion: 'diplomacyOverview.dimension.internal_cohesion',
    negotiating_leverage: 'diplomacyOverview.dimension.negotiating_leverage',
};

/** Acknowledgement-line templates, one per dimension, in the same shape as the other
 *  acknowledgement lines (`{faction}` is the state short form with a trailing space). */
const ACKNOWLEDGEMENT_DIMENSION_KEYS: Partial<Record<string, MessageKey>> = {
    military_credibility: 'eventModal.effect.militaryCredibility',
    territorial_legitimacy: 'eventModal.effect.territorialLegitimacy',
    international_standing: 'eventModal.effect.internationalStanding',
    patron_confidence: 'eventModal.effect.patronConfidence',
    internal_cohesion: 'eventModal.effect.internalCohesion',
    negotiating_leverage: 'eventModal.effect.negotiatingLeverage',
};

function humanizeToken(value: string): string {
    return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function dimensionLabel(dimension: string | undefined): string {
    if (!dimension) return t('eventDecision.unknown');
    const key = DIMENSION_LABEL_KEYS[dimension];
    return key ? t(key) : humanizeToken(dimension);
}

/** State attributes name the state by its canonical short form (RBiH, RS, HRHB). */
export function stateShortLabel(faction: string | undefined): string {
    if (faction === 'RBiH' || faction === 'RS' || faction === 'HRHB') return faction;
    return faction ? getPlayerSafePoliticalFactionName(faction) : '';
}

function signedDelta(delta: number): string {
    return `${delta > 0 ? '+' : ''}${delta}`;
}

/** Decision-modal preview line for one shift ("RBiH International Standing +10"). */
export function describeDimensionShift(
    shift: DimensionShift,
    factionLabel: (faction: string | undefined) => string = stateShortLabel,
): string {
    return t('eventDecision.effect.dimensionShift', {
        faction: factionLabel(shift.faction),
        dimension: dimensionLabel(shift.dimension),
        delta: signedDelta(shift.delta),
    });
}

/** Acknowledgement line for one shift ("RS international standing -20" /
 *  "Međunarodni ugled RS -20"). Runs of spaces are collapsed so a template may place
 *  `{faction}` (which carries a trailing space) directly before `{delta}`. */
export function formatAcknowledgementDimensionShift(shift: DimensionShift): string {
    const faction = stateShortLabel(shift.faction);
    const params = {
        faction: faction ? `${faction} ` : '',
        delta: ` ${signedDelta(shift.delta)}`,
    };
    const key = ACKNOWLEDGEMENT_DIMENSION_KEYS[shift.dimension];
    const text = key
        ? t(key, params)
        : t('eventDecision.effect.dimensionShift', {
            faction,
            dimension: dimensionLabel(shift.dimension),
            delta: signedDelta(shift.delta),
        });
    return text.replace(/ {2,}/g, ' ').trim();
}

export interface AcknowledgementDimensionShiftEntry {
    kind: 'dimension_shift';
    description: string;
}

/** A fired card's own shifts as acknowledgement entries: non-zero, finite deltas only,
 *  ordered by faction then dimension (strictCompare). */
export function buildAcknowledgementDimensionShiftEntries(
    shifts: readonly DimensionShift[] | undefined,
): AcknowledgementDimensionShiftEntry[] {
    return (shifts ?? [])
        .filter((shift) => typeof shift.delta === 'number' && Number.isFinite(shift.delta) && shift.delta !== 0)
        .slice()
        .sort((a, b) => strictCompare(a.faction, b.faction) || strictCompare(a.dimension, b.dimension))
        .map((shift) => ({ kind: 'dimension_shift' as const, description: formatAcknowledgementDimensionShift(shift) }));
}

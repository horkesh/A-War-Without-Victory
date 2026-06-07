/**
 * Per-settlement supply comprehension read-model.
 *
 * Surfaces the already-derived per-OSID supply level (`supplyStateByOsid`,
 * computed by the sim's `deriveSupplyStateByOsid` and exposed
 * player-faction-scoped by the adapter) as a player-legible label plus a
 * plain-language explanation for the settlement detail panel.
 *
 * This is a pure presentation projection. It adds NO supply authority and
 * reads NO hidden enemy truth: the only input is the already-scoped supply
 * level the adapter hands the UI for settlements the player controls. The
 * caller gates display on the level being present in that scoped map.
 *
 * Determinism: pure over the input level. No Math.random / Date.now, no
 * iteration order to worry about (single scalar input).
 *
 * i18n: returns typed i18n KEYS (MessageKey), not literal prose, so the
 * renderer localizes via `t(...)`. Keeps this module locale-agnostic and
 * testable, and keeps the keys statically validated against the catalog.
 */
import type { MessageKey } from '../i18n/messages.en';

/** The three derived per-settlement supply levels (canon: Systems Manual §14). */
export type OsidSupplyLevel = 'adequate' | 'strained' | 'critical';

export type OsidSupplyTone = 'good' | 'caution' | 'danger';

export interface OsidSupplyExplanation {
    level: OsidSupplyLevel;
    /** i18n key for the short player-legible status label. */
    labelKey: MessageKey;
    /** i18n key for the one-line plain-language explanation. */
    explanationKey: MessageKey;
    /** Severity tone for color selection (no raw enum surfaced to the player). */
    tone: OsidSupplyTone;
}

function isOsidSupplyLevel(value: unknown): value is OsidSupplyLevel {
    return value === 'adequate' || value === 'strained' || value === 'critical';
}

/**
 * Build the player-legible supply explanation for a single controlled
 * settlement, or `null` when no scoped supply level is known for it.
 *
 * The `level` is read straight from the adapter's player-faction-scoped
 * `supplyStateByOsid[osid]`; passing `undefined` (no entry — e.g. an
 * enemy-held or unknown settlement) yields `null` so the panel shows nothing
 * rather than inventing a status.
 */
export function buildOsidSupplyExplanation(
    level: OsidSupplyLevel | undefined | null,
): OsidSupplyExplanation | null {
    if (!isOsidSupplyLevel(level)) return null;

    switch (level) {
        case 'adequate':
            return {
                level,
                labelKey: 'settlement.supply.adequate.label',
                explanationKey: 'settlement.supply.adequate.explanation',
                tone: 'good',
            };
        case 'strained':
            return {
                level,
                labelKey: 'settlement.supply.strained.label',
                explanationKey: 'settlement.supply.strained.explanation',
                tone: 'caution',
            };
        case 'critical':
            return {
                level,
                labelKey: 'settlement.supply.critical.label',
                explanationKey: 'settlement.supply.critical.explanation',
                tone: 'danger',
            };
    }
}

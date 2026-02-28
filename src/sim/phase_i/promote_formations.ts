/**
 * Phase I Overhaul Phase D: Battalion → Brigade promotion.
 *
 * Promotes militia-kind formations that have reached brigade-readiness thresholds:
 *   - personnel >= MIN_BRIGADE_THRESHOLD (1500)
 *   - cohesion >= PROMOTION_COHESION_THRESHOLD (40)
 *   - turnsActive >= PROMOTION_MIN_TURNS_ACTIVE (4)
 *   - faction has at least one corps/army_hq formation in state.formations
 *
 * On promotion:
 *   - kind set to 'brigade'
 *   - cohesion += PROMOTION_COHESION_BONUS (10, capped at 100)
 *   - readiness = 'active'
 *   - promoted_turn set to currentTurn
 *   - name resolved via OOB historical name match or fallback
 *   - matched_oob_id and relevant tags populated (Steps 16–17)
 *
 * Gated on recruitment_mode === 'bottom_up'.
 * Deterministic: formations iterated in sorted id order.
 * No file I/O — oobBrigades passed in from pipeline's recruitmentCatalogCache.
 */

import type { OobBrigade } from '../../scenario/oob_loader.js';
import type { FactionId, FormationState, GameState } from '../../state/game_state.js';
import {
    MIN_BRIGADE_THRESHOLD,
    PROMOTION_COHESION_BONUS,
    PROMOTION_COHESION_THRESHOLD,
    PROMOTION_MIN_TURNS_ACTIVE
} from '../../state/formation_constants.js';
import { fallbackBrigadeName, matchHistoricalName } from '../../state/formation_naming.js';
import { strictCompare } from '../../state/validateGameState.js';

export interface PromotionReport {
    promoted: number;
    formations_promoted: string[]; // formation IDs
}

/**
 * Returns true if the faction has at least one corps_asset or army_hq formation in state.
 * RS corps are created at turn 0, so this naturally passes for RS.
 * Deterministic and pure — no mutations.
 */
function factionHasCorps(state: GameState, faction: FactionId): boolean {
    const formations = state.formations ?? {};
    for (const f of Object.values(formations)) {
        const fs = f as FormationState;
        if (fs.faction !== faction) continue;
        if (fs.kind === 'corps_asset' || fs.kind === 'army_hq') return true;
    }
    return false;
}

/**
 * Extract the operational (current) municipality from a formation.
 * Prefers the mun: tag (where formation currently operates); falls back to origin_mun.
 * This is the canonical "home municipality" for ordinal counting and OOB name lookup.
 */
function getHomeMun(f: FormationState): string | undefined {
    if (Array.isArray(f.tags)) {
        for (const t of f.tags) {
            if (typeof t === 'string' && t.startsWith('mun:')) {
                return t.slice(4);
            }
        }
    }
    if (f.origin_mun) return f.origin_mun;
    return undefined;
}

/**
 * Promotes eligible militia formations to brigade rank.
 *
 * @param state         Mutable GameState (formations mutated in place).
 * @param currentTurn   Current simulation turn.
 * @param oobBrigades   OOB brigade catalog (for historical name matching).
 * @returns             PromotionReport with count and IDs of promoted formations.
 */
export function promoteFormations(
    state: GameState,
    currentTurn: number,
    oobBrigades: OobBrigade[]
): PromotionReport {
    const report: PromotionReport = { promoted: 0, formations_promoted: [] };

    if (!state.formations || typeof state.formations !== 'object') {
        return report;
    }

    // Sort formation ids for deterministic iteration order
    const formationIds = Object.keys(state.formations).sort(strictCompare);

    // Build ordinal counters: Map<"faction:mun", number> of already-promoted brigades
    // keyed by origin_mun (or mun: tag). Start from existing brigades to get correct ordinals.
    const ordinalCounters = new Map<string, number>();
    for (const id of formationIds) {
        const f = state.formations[id] as FormationState | undefined;
        if (!f) continue;
        if (f.kind !== 'brigade') continue;
        const mun = getHomeMun(f);
        if (!mun) continue;
        const key = `${f.faction}:${mun}`;
        ordinalCounters.set(key, (ordinalCounters.get(key) ?? 0) + 1);
    }

    for (const id of formationIds) {
        const f = state.formations[id] as FormationState | undefined;
        if (!f) continue;

        // Gate 1: must be militia kind
        if (f.kind !== 'militia') continue;

        // Gate 2: personnel threshold
        if ((f.personnel ?? 0) < MIN_BRIGADE_THRESHOLD) continue;

        // Gate 3: cohesion threshold
        if ((f.cohesion ?? 0) < PROMOTION_COHESION_THRESHOLD) continue;

        // Gate 4: turns active
        const turnsActive = currentTurn - (f.created_turn ?? currentTurn);
        if (turnsActive < PROMOTION_MIN_TURNS_ACTIVE) continue;

        // Gate 5: faction has corps
        if (!factionHasCorps(state, f.faction)) continue;

        // --- Eligible for promotion ---

        const homeMun = getHomeMun(f);
        if (!homeMun) {
            // Cannot determine municipality — skip (defensive)
            continue;
        }

        const munKey = `${f.faction}:${homeMun}`;
        const currentCount = ordinalCounters.get(munKey) ?? 0;
        const ordinal = currentCount + 1;

        // Steps 16 & 17: find matched OOB entry (displaced-origin first)
        const candidates = oobBrigades
            .filter(b => b.faction === f.faction && b.home_mun === homeMun)
            .sort((a, b) => strictCompare(a.id, b.id));

        // Displaced-origin: also check origin_mun if different from homeMun
        const originMun = f.origin_mun && f.origin_mun !== homeMun ? f.origin_mun : undefined;
        let matchedEntry: OobBrigade | null = null;

        if (originMun) {
            const originCandidates = oobBrigades
                .filter(b => b.faction === f.faction && b.home_mun === originMun)
                .sort((a, b) => strictCompare(a.id, b.id));
            if (originCandidates.length > 0) {
                matchedEntry = ordinal <= originCandidates.length ? originCandidates[ordinal - 1] : null;
            } else {
                matchedEntry = ordinal <= candidates.length ? candidates[ordinal - 1] : null;
            }
        } else {
            matchedEntry = ordinal <= candidates.length ? candidates[ordinal - 1] : null;
        }

        // Resolve name (Step 15)
        const name =
            matchHistoricalName(f.faction, homeMun, ordinal, oobBrigades, originMun) ??
            fallbackBrigadeName(homeMun, ordinal);

        // --- Mutate formation ---

        f.kind = 'brigade';
        f.cohesion = Math.min(100, (f.cohesion ?? 0) + PROMOTION_COHESION_BONUS);
        f.readiness = 'active';
        f.promoted_turn = currentTurn;
        f.name = name;

        // Step 16: OOB tag propagation
        if (matchedEntry) {
            f.matched_oob_id = matchedEntry.id;
            if (!Array.isArray(f.tags)) f.tags = [];
            // Add oob: tag
            const oobTag = `oob:${matchedEntry.id}`;
            if (!f.tags.includes(oobTag)) {
                f.tags.push(oobTag);
            }
            // Add corps: tag if OOB entry has corps field and no existing corps: tag
            if (matchedEntry.corps) {
                const hasCorpsTag = f.tags.some(t => typeof t === 'string' && t.startsWith('corps:'));
                if (!hasCorpsTag) {
                    f.tags.push(`corps:${matchedEntry.corps}`);
                }
            }
            // Add equip: tag if default_equipment_class differs from current equipment class
            // (current class derived from existing equip: tag)
            const existingEquipTag = f.tags.find(t => typeof t === 'string' && t.startsWith('equip:'));
            const currentEquipClass = existingEquipTag ? existingEquipTag.slice(6) : null;
            if (matchedEntry.default_equipment_class && matchedEntry.default_equipment_class !== currentEquipClass) {
                f.tags.push(`equip:${matchedEntry.default_equipment_class}`);
            }
            // Sort tags for deterministic output
            f.tags.sort(strictCompare);
        }

        // Increment ordinal counter for subsequent formations from same (faction, mun)
        ordinalCounters.set(munKey, ordinal);

        report.promoted += 1;
        report.formations_promoted.push(id);
    }

    // Sort promoted IDs for deterministic output
    report.formations_promoted.sort(strictCompare);

    return report;
}

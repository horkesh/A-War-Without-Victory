/**
 * Own-faction supply comprehension read-model (P2 "Supply/logistics comprehension").
 *
 * PURE READ-MODEL / EXPLANATION LAYER. This module derives player-legible answers to
 * two questions the supply state already encodes but never surfaces in plain language:
 *
 *   1. "How is MY faction's supply right now?" — per-faction adequate/strained/critical
 *      counts plus the handful of worst (critical) own-faction OSIDs, so the player can
 *      see at a glance which of their own positions are starving.
 *   2. "WHY would this attack be supply-constrained?" — a plain-language explanation of
 *      the supply readiness at the OWN-faction staging OSIDs of a planned/blocked op.
 *
 * SAFETY — own-faction legibility only:
 *   Every function takes the acting faction id and reads ONLY that faction's per-faction
 *   `by_osid` slice of the SupplyStateByOsidReport. The report is already partitioned by
 *   faction, so there is no code path here that can read an enemy faction's supply truth.
 *   No enemy supply state is ever inspected, returned, or summarized.
 *
 * DETERMINISM: pure function of the passed report/inputs. No RNG, no Date.now, no new
 * Date. All iteration is over arrays sorted via strictCompare. Calling it has no side
 * effects and never mutates state — it is NOT wired into any sim/turn pipeline, so it
 * cannot alter any simulated outcome or scenario hash (byte-identical by construction).
 *
 * Spec context: docs/plans/2026-05-17-supply-design-completion-plan.md §7 ("minimum supply
 * UX" — Adequate/Strained/Critical wording per Systems Manual §14). This module supplies
 * the read-model truth that a panel/AAR/tooltip can render; it does not own any UI shell.
 */

import { strictCompare } from '../state/validateGameState.js';
import type {
    SupplyStateByOsidReport,
    SupplyStateLevel,
} from '../state/supply_state_derivation.js';

/** Human-legible label per supply level (Systems Manual §14 wording). */
const SUPPLY_LABEL: Record<SupplyStateLevel, string> = {
    adequate: 'Adequate',
    strained: 'Strained',
    critical: 'Critical',
};

/** Stable count of own-faction OSIDs in each supply level. */
export interface OwnFactionSupplySummary {
    faction_id: string;
    adequate_count: number;
    strained_count: number;
    critical_count: number;
    /** Total own-faction OSIDs that carry a supply state. */
    total_count: number;
    /** Up to `criticalOsidLimit` worst (critical) own-faction OSIDs, sorted by osid. */
    critical_osids: string[];
    /** Plain-language one-line read of the faction's overall supply posture. */
    headline: string;
}

/** Per-staging-OSID supply readout for a planned/blocked operation. */
export interface StagingSupplyReadout {
    osid: string;
    state: SupplyStateLevel;
    label: string;
}

/** Explanation of why (or whether) an op's own-faction staging is supply-constrained. */
export interface SupplyBlockExplanation {
    faction_id: string;
    /** True if at least one staging OSID is strained or critical. */
    constrained: boolean;
    /** The worst supply level across the queried staging OSIDs (undefined if none known). */
    worst_state?: SupplyStateLevel;
    /** Per-staging-OSID readout, sorted by osid. Own-faction only. */
    staging: StagingSupplyReadout[];
    /** Plain-language explanation a player/AAR/tooltip can render verbatim. */
    explanation: string;
}

/** Severity rank for "worst-state" comparisons (higher = worse). */
const SEVERITY: Record<SupplyStateLevel, number> = {
    adequate: 0,
    strained: 1,
    critical: 2,
};

function normalizeLevel(value: unknown): SupplyStateLevel | null {
    return value === 'adequate' || value === 'strained' || value === 'critical'
        ? value
        : null;
}

/**
 * Pull the OWN-faction by_osid slice from a SupplyStateByOsidReport. Returns a Map of
 * osid -> level for the requested faction only. The report is faction-partitioned, so
 * this can never surface another faction's supply state.
 */
function ownFactionOsidStates(
    report: SupplyStateByOsidReport | null | undefined,
    faction: string,
): Map<string, SupplyStateLevel> {
    const out = new Map<string, SupplyStateLevel>();
    if (!report?.factions) return out;
    const entry = report.factions.find((f) => f.faction_id === faction);
    if (!entry?.by_osid) return out;
    for (const row of entry.by_osid) {
        const level = normalizeLevel(row.state);
        if (level) out.set(row.osid, level);
    }
    return out;
}

/**
 * Summarize one faction's OWN supply posture from the per-faction OSID report.
 * Returns undefined if the faction has no known supply state (so callers can omit
 * the surface rather than render a misleading all-zeros panel).
 */
export function summarizeOwnFactionSupply(
    report: SupplyStateByOsidReport | null | undefined,
    faction: string,
    criticalOsidLimit = 10,
): OwnFactionSupplySummary | undefined {
    const states = ownFactionOsidStates(report, faction);
    if (states.size === 0) return undefined;

    let adequate = 0;
    let strained = 0;
    let critical = 0;
    const criticalOsids: string[] = [];

    for (const osid of [...states.keys()].sort(strictCompare)) {
        const level = states.get(osid)!;
        if (level === 'adequate') adequate++;
        else if (level === 'strained') strained++;
        else {
            critical++;
            criticalOsids.push(osid);
        }
    }

    const total = adequate + strained + critical;
    const limited = criticalOsids.slice(0, Math.max(0, criticalOsidLimit));

    let headline: string;
    if (critical === 0 && strained === 0) {
        headline = `Supply lines are holding: all ${total} positions are Adequate.`;
    } else if (critical > 0) {
        headline =
            `${critical} of ${total} positions are Critical (cut off); ` +
            `${strained} Strained, ${adequate} Adequate.`;
    } else {
        headline =
            `${strained} of ${total} positions are Strained (brittle corridors); ` +
            `${adequate} Adequate.`;
    }

    return {
        faction_id: faction,
        adequate_count: adequate,
        strained_count: strained,
        critical_count: critical,
        total_count: total,
        critical_osids: limited,
        headline,
    };
}

/**
 * Explain — in plain language — whether an operation's OWN-faction staging OSIDs are
 * supply-constrained, and why. `stagingOsids` are the friendly OSIDs the op's brigades
 * stage from (e.g. AxisAAR.staging_osid values). Enemy/objective OSIDs are NOT consulted:
 * this is own-faction logistics legibility only.
 */
export function explainSupplyBlock(
    report: SupplyStateByOsidReport | null | undefined,
    faction: string,
    stagingOsids: readonly string[],
): SupplyBlockExplanation {
    const states = ownFactionOsidStates(report, faction);

    // Deduplicate + sort staging OSIDs deterministically.
    const uniqueStaging = [...new Set(stagingOsids)].sort(strictCompare);

    const staging: StagingSupplyReadout[] = [];
    let worst: SupplyStateLevel | undefined;
    for (const osid of uniqueStaging) {
        const level = states.get(osid);
        if (!level) continue; // unknown staging supply state — omit rather than guess
        staging.push({ osid, state: level, label: SUPPLY_LABEL[level] });
        if (worst === undefined || SEVERITY[level] > SEVERITY[worst]) {
            worst = level;
        }
    }

    const constrained = worst === 'strained' || worst === 'critical';

    let explanation: string;
    if (staging.length === 0) {
        explanation =
            'Supply state at the staging area is unknown — no own-faction supply ' +
            'reading is available for these positions.';
    } else if (worst === 'critical') {
        const cut = staging.filter((s) => s.state === 'critical').map((s) => s.osid);
        explanation =
            `Attack supply-constrained: staging is Critical (cut off) at ${cut.join(', ')}. ` +
            'Brigades launching from a cut-off position cannot be resupplied during the assault.';
    } else if (worst === 'strained') {
        const brittle = staging.filter((s) => s.state === 'strained').map((s) => s.osid);
        explanation =
            `Attack supply-strained: staging runs through brittle corridors at ${brittle.join(', ')}. ` +
            'Sustained offensive tempo will be hard to maintain.';
    } else {
        explanation = 'Staging supply is Adequate — logistics do not constrain this attack.';
    }

    return {
        faction_id: faction,
        constrained,
        ...(worst !== undefined ? { worst_state: worst } : {}),
        staging,
        explanation,
    };
}

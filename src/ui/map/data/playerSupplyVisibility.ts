/**
 * Player-scoped supply visibility read-model projection.
 *
 * UI-1 Supply Visibility Read-Model (Batch 40). Reads the already-derived
 * supply truth that the adapter exposes on `LoadedGameState`
 * (`supplyStateByOsid`, `supplySummaryByFaction`) and condenses it into a
 * compact projection the Decision Room / sitrep can surface without
 * inventing new simulation authority.
 *
 * Ownership: singular consumer-side projection. The engine and the
 * adapter remain the source of supply truth; this module only re-shapes
 * the already player-faction-safe slices into a presentation-ready view.
 *
 * Determinism: pure over the inputs, no Math.random / Date.now, formations
 * iterated in id order.
 *
 * Player safety: only reads the player faction's own supply summary row
 * and the already player-faction-filtered `supplyStateByOsid`. Enemy
 * faction rows in `supplySummaryByFaction` are never read.
 */
import type { LoadedGameState } from './types.js';

export type PlayerSupplySeverity = 'critical' | 'warning' | 'info' | 'unknown';

export interface PlayerSupplyVisibilityView {
    playerFaction: string;
    hasSupplyData: boolean;
    adequateCount: number;
    strainedCount: number;
    criticalCount: number;
    corridorOpenCount: number;
    corridorBrittleCount: number;
    corridorCutCount: number;
    corridorAtRisk: boolean;
    isolatedFormationCount: number;
    severity: PlayerSupplySeverity;
    headline: string;
    evidence: string[];
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function countIsolatedPlayerFormations(state: LoadedGameState, playerFaction: string): number {
    const supply = state.supplyStateByOsid ?? {};
    let count = 0;
    const formations = [...(state.formations ?? [])].sort((a, b) => strictCompare(a.id, b.id));
    for (const formation of formations) {
        if (formation.faction !== playerFaction) continue;
        if (formation.kind !== 'brigade') continue;
        if (formation.status !== 'active') continue;
        const osid = formation.location_osid;
        if (!osid) continue;
        if (supply[osid] === 'critical') count++;
    }
    return count;
}

function deriveSeverity(args: {
    corridorAtRisk: boolean;
    criticalCount: number;
    isolatedFormationCount: number;
}): PlayerSupplySeverity {
    if (args.criticalCount > 0 || args.isolatedFormationCount > 0) return 'critical';
    if (args.corridorAtRisk) return 'warning';
    return 'info';
}

function buildHeadline(view: Omit<PlayerSupplyVisibilityView, 'headline' | 'evidence'>): string {
    if (!view.hasSupplyData) {
        return 'Supply status unavailable.';
    }
    if (view.severity === 'critical') {
        if (view.isolatedFormationCount > 0) {
            const plural = view.isolatedFormationCount === 1 ? 'brigade' : 'brigades';
            return `${view.isolatedFormationCount} ${plural} cut off from supply.`;
        }
        if (view.criticalCount > 0) {
            return `${view.criticalCount} controlled settlement${view.criticalCount === 1 ? '' : 's'} at critical supply.`;
        }
        return 'Supply lines critically exposed.';
    }
    if (view.severity === 'warning') {
        const atRisk = view.corridorBrittleCount + view.corridorCutCount;
        return `${atRisk} supply corridor${atRisk === 1 ? '' : 's'} at risk.`;
    }
    return 'Supply lines holding.';
}

function buildEvidence(view: Omit<PlayerSupplyVisibilityView, 'headline' | 'evidence'>): string[] {
    if (!view.hasSupplyData) {
        return ['No supply derivation reported for this turn.'];
    }
    const evidence: string[] = [];
    evidence.push(
        `${view.adequateCount} adequate / ${view.strainedCount} strained / ${view.criticalCount} critical`,
    );
    evidence.push(
        `${view.corridorOpenCount} open / ${view.corridorBrittleCount} brittle / ${view.corridorCutCount} cut corridor${
            view.corridorOpenCount + view.corridorBrittleCount + view.corridorCutCount === 1 ? '' : 's'
        }`,
    );
    if (view.isolatedFormationCount > 0) {
        const plural = view.isolatedFormationCount === 1 ? 'brigade' : 'brigades';
        evidence.push(`${view.isolatedFormationCount} ${plural} isolated at critical-supply settlements`);
    }
    return evidence;
}

export function buildPlayerSupplyVisibility(
    state: LoadedGameState,
): PlayerSupplyVisibilityView | null {
    const playerFaction = state.player_faction;
    if (playerFaction !== 'RS' && playerFaction !== 'RBiH' && playerFaction !== 'HRHB') {
        return null;
    }

    const summary = state.supplySummaryByFaction?.[playerFaction];
    const supplyByOsid = state.supplyStateByOsid;
    const hasSummary = !!summary;
    const hasOsidData = !!supplyByOsid && Object.keys(supplyByOsid).length > 0;
    const hasSupplyData = hasSummary || hasOsidData;

    const adequateCount = summary?.adequate_count ?? 0;
    const strainedCount = summary?.strained_count ?? 0;
    const criticalCount = summary?.critical_count ?? 0;
    const corridorOpenCount = summary?.corridor_open_count ?? 0;
    const corridorBrittleCount = summary?.corridor_brittle_count ?? 0;
    const corridorCutCount = summary?.corridor_cut_count ?? 0;
    const corridorAtRisk = corridorBrittleCount > 0 || corridorCutCount > 0;

    const isolatedFormationCount = hasOsidData
        ? countIsolatedPlayerFormations(state, playerFaction)
        : 0;

    const severity: PlayerSupplySeverity = hasSupplyData
        ? deriveSeverity({ corridorAtRisk, criticalCount, isolatedFormationCount })
        : 'unknown';

    const partial = {
        playerFaction,
        hasSupplyData,
        adequateCount,
        strainedCount,
        criticalCount,
        corridorOpenCount,
        corridorBrittleCount,
        corridorCutCount,
        corridorAtRisk,
        isolatedFormationCount,
        severity,
    };

    return {
        ...partial,
        headline: buildHeadline(partial),
        evidence: buildEvidence(partial),
    };
}

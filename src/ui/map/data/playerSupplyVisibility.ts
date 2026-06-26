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
import { t } from '../i18n/index.js';

export type PlayerSupplySeverity = 'critical' | 'warning' | 'info' | 'unknown';

export interface PlayerSupplyVisibilityView {
    playerFaction: string;
    hasSupplyData: boolean;
    adequateCount: number;
    adequateReported: boolean;
    strainedCount: number;
    strainedReported: boolean;
    criticalCount: number;
    criticalReported: boolean;
    corridorOpenCount: number;
    corridorOpenReported: boolean;
    corridorBrittleCount: number;
    corridorBrittleReported: boolean;
    corridorCutCount: number;
    corridorCutReported: boolean;
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
        return t('decisionRoom.card.supply.title.unavailable');
    }
    if (view.severity === 'critical') {
        if (view.isolatedFormationCount > 0) {
            return t('decisionRoom.card.supply.title.isolatedBrigades', {
                count: view.isolatedFormationCount,
                brigadeLabel: t(view.isolatedFormationCount === 1
                    ? 'decisionRoom.card.supply.unit.brigadeSingular'
                    : 'decisionRoom.card.supply.unit.brigadePlural'),
            });
        }
        if (view.criticalCount > 0) {
            return t('decisionRoom.card.supply.title.criticalSettlements', {
                count: view.criticalCount,
                settlementLabel: t(view.criticalCount === 1
                    ? 'decisionRoom.card.supply.unit.settlementSingular'
                    : 'decisionRoom.card.supply.unit.settlementPlural'),
            });
        }
        return t('decisionRoom.card.supply.title.criticalLines');
    }
    if (view.severity === 'warning') {
        const atRisk = view.corridorBrittleCount + view.corridorCutCount;
        return t('decisionRoom.card.supply.title.corridorsAtRisk', {
            count: atRisk,
            corridorLabel: t(atRisk === 1
                ? 'decisionRoom.card.supply.unit.corridorSingular'
                : 'decisionRoom.card.supply.unit.corridorPlural'),
        });
    }
    return t('decisionRoom.card.supply.title.holding');
}

function buildEvidence(view: Omit<PlayerSupplyVisibilityView, 'headline' | 'evidence'>): string[] {
    if (!view.hasSupplyData) {
        return [t('decisionRoom.card.supply.evidence.noData')];
    }
    const evidence: string[] = [];
    const unreported = t('corpsFront.unreported');
    evidence.push(
        t('decisionRoom.card.supply.evidence.stateMix', {
            adequate: view.adequateReported ? t('supply.stateAdequateCount', { count: view.adequateCount }) : unreported,
            strained: view.strainedReported ? t('supply.stateStrainedCount', { count: view.strainedCount }) : unreported,
            critical: view.criticalReported ? t('supply.stateCriticalCount', { count: view.criticalCount }) : unreported,
        }),
    );
    const corridorTotal = view.corridorOpenCount + view.corridorBrittleCount + view.corridorCutCount;
    evidence.push(
        t('decisionRoom.card.supply.evidence.corridorMix', {
            open: view.corridorOpenReported ? t('supply.corridorOpenCount', { count: view.corridorOpenCount }) : unreported,
            brittle: view.corridorBrittleReported ? t('supply.corridorStrainedCount', { count: view.corridorBrittleCount }) : unreported,
            cut: view.corridorCutReported ? t('supply.corridorCutCount', { count: view.corridorCutCount }) : unreported,
            corridorLabel: t(corridorTotal === 1
                ? 'decisionRoom.card.supply.unit.corridorSingular'
                : 'decisionRoom.card.supply.unit.corridorPlural'),
        }),
    );
    if (view.isolatedFormationCount > 0) {
        evidence.push(t('decisionRoom.card.supply.evidence.isolatedBrigades', {
            count: view.isolatedFormationCount,
            brigadeLabel: t(view.isolatedFormationCount === 1
                ? 'decisionRoom.card.supply.unit.brigadeSingular'
                : 'decisionRoom.card.supply.unit.brigadePlural'),
        }));
    }
    return evidence;
}

const SUPPLY_SUMMARY_COUNT_KEYS = [
    'adequate_count',
    'strained_count',
    'critical_count',
    'corridor_open_count',
    'corridor_brittle_count',
    'corridor_cut_count',
] as const;

type SupplySummaryCountKey = typeof SUPPLY_SUMMARY_COUNT_KEYS[number];

function asSupplySummaryRow(summary: unknown): Record<SupplySummaryCountKey, unknown> | null {
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
    return summary as Record<SupplySummaryCountKey, unknown>;
}

function readFiniteCount(row: Record<SupplySummaryCountKey, unknown> | null, key: SupplySummaryCountKey): number | null {
    const value = row?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildPlayerSupplyVisibility(
    state: LoadedGameState,
): PlayerSupplyVisibilityView | null {
    const playerFaction = state.player_faction;
    if (playerFaction !== 'RS' && playerFaction !== 'RBiH' && playerFaction !== 'HRHB') {
        return null;
    }

    const summary = asSupplySummaryRow(state.supplySummaryByFaction?.[playerFaction]);
    const adequate = readFiniteCount(summary, 'adequate_count');
    const strained = readFiniteCount(summary, 'strained_count');
    const critical = readFiniteCount(summary, 'critical_count');
    const corridorOpen = readFiniteCount(summary, 'corridor_open_count');
    const corridorBrittle = readFiniteCount(summary, 'corridor_brittle_count');
    const corridorCut = readFiniteCount(summary, 'corridor_cut_count');
    const supplyByOsid = state.supplyStateByOsid;
    const hasSummary = [adequate, strained, critical, corridorOpen, corridorBrittle, corridorCut]
        .some((value) => value != null);
    const hasOsidData = !!supplyByOsid && Object.keys(supplyByOsid).length > 0;
    const hasSupplyData = hasSummary || hasOsidData;

    const adequateCount = adequate ?? 0;
    const strainedCount = strained ?? 0;
    const criticalCount = critical ?? 0;
    const corridorOpenCount = corridorOpen ?? 0;
    const corridorBrittleCount = corridorBrittle ?? 0;
    const corridorCutCount = corridorCut ?? 0;
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
        adequateReported: adequate != null,
        strainedCount,
        strainedReported: strained != null,
        criticalCount,
        criticalReported: critical != null,
        corridorOpenCount,
        corridorOpenReported: corridorOpen != null,
        corridorBrittleCount,
        corridorBrittleReported: corridorBrittle != null,
        corridorCutCount,
        corridorCutReported: corridorCut != null,
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

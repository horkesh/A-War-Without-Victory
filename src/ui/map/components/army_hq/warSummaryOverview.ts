import osidAreas from '../../../../../data/derived/operational/osid_areas.json';
import type { LoadedGameState } from '../../data/types';
import {
    deriveWarWeariness,
    type WarWearinessDescriptor,
} from '../../data/warWeariness';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility';

export const WAR_SUMMARY_FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

export interface WarSummaryOverviewModel {
    playerFaction: (typeof WAR_SUMMARY_FACTIONS)[number] | null;
    areaPct: Record<(typeof WAR_SUMMARY_FACTIONS)[number], number>;
    atArmsByFaction: Record<string, number>;
    mobilizedPoolByFaction: Record<string, number>;
    mobilizedTotalByFaction: Record<string, number>;
    personnelByFaction: Record<string, number>;
    /** People displaced or killed, all sides (engine `refugees_created`: routed + killed + fled abroad). */
    totalDisplacedOrKilled: number;
    /** The same figure keyed by the people who suffered it. */
    displacedOrKilledByFaction: Record<string, number>;
    totalDisplacedOrKilledReported: boolean;
    displacedOrKilledByFactionReported: boolean;
    /**
     * Cluster C — faction-level war exhaustion passthrough.
     * Sourced from state.warPhaseExhaustion (which is
     * GameState.political.war_exhaustion, adapter-scoped to player faction).
     * Summary-only: the canonical per-corps explanation lives in
     * Army HQ → Command Relationship. WarSummary advertises and hands off.
     */
    warExhaustionByFaction: Partial<Record<(typeof WAR_SUMMARY_FACTIONS)[number], number>>;
    /**
     * Collapse Repurpose Design A — derived war-weariness descriptor per faction
     * (steady → strained → cracking → collapsing) off the same war_exhaustion
     * signal. PURE READ-MODEL (warWeariness.ts): no sim state touched, no
     * persisted field, byte-identical sim. Populated only where
     * warExhaustionByFaction is (i.e. fog-of-war scoped to the player faction);
     * the feel layer shares the one source of truth with the raw passthrough.
     */
    warWearinessByFaction: Partial<Record<(typeof WAR_SUMMARY_FACTIONS)[number], WarWearinessDescriptor>>;
}

export function buildWarSummaryOverviewModel(state: LoadedGameState): WarSummaryOverviewModel {
    const areasMap = (osidAreas as { total_area_km2: number; areas: Record<string, number> }).areas;
    const areaByFaction: Record<string, number> = {};
    let totalArea = 0;
    for (const [osid, controller] of Object.entries(state.controlBySettlement)) {
        if (!controller) continue;
        const area = areasMap[osid] ?? 0;
        areaByFaction[controller] = (areaByFaction[controller] ?? 0) + area;
        totalArea += area;
    }

    const areaPct = {
        RS: totalArea > 0 ? ((areaByFaction.RS ?? 0) / totalArea) * 100 : 0,
        RBiH: totalArea > 0 ? ((areaByFaction.RBiH ?? 0) / totalArea) * 100 : 0,
        HRHB: totalArea > 0 ? ((areaByFaction.HRHB ?? 0) / totalArea) * 100 : 0,
    };

    const atArmsByFaction: Record<string, number> = {};
    for (const formation of state.formations) {
        if (!isFieldedTacticalFormation(formation) || formation.personnel == null) continue;
        atArmsByFaction[formation.faction] = (atArmsByFaction[formation.faction] ?? 0) + formation.personnel;
    }

    const mobilizedPoolByFaction: Record<string, number> = {};
    for (const pool of state.militiaPools ?? []) {
        const poolTotal =
            Math.max(0, pool.available ?? 0)
            + Math.max(0, pool.committed ?? 0)
            + Math.max(0, pool.exhausted ?? 0);
        if (poolTotal <= 0) continue;
        mobilizedPoolByFaction[pool.faction] = (mobilizedPoolByFaction[pool.faction] ?? 0) + poolTotal;
    }

    const mobilizedTotalByFaction: Record<string, number> = {};
    for (const f of WAR_SUMMARY_FACTIONS) {
        const total = (atArmsByFaction[f] ?? 0) + (mobilizedPoolByFaction[f] ?? 0);
        if (total > 0) mobilizedTotalByFaction[f] = total;
    }

    // One definition, shared with the Humanitarian Ledger, the replay, the Verdict and the war
    // dispatches: people displaced OR KILLED. The engine's `refugees_created` is
    // displaced (routed) + killed + fled abroad; killed and fled are additional to the routed
    // count, not subsets of it. `departedByOsid` counts the routed only, so it is not used here.
    let totalDisplacedOrKilled = 0;
    const displacedOrKilledByFaction: Record<string, number> = {};
    // Reported only when the humanitarian aggregates themselves are recorded. `departedByOsid`
    // or a casualty-only `nationalDisplacement` say nothing about this measure, so they must
    // not turn an unavailable total into a known zero.
    const displacementReported =
        state.nationalDisplacement?.humanitarianAggregatesRecorded === true
        || Object.keys(state.nationalDisplacement?.humanitarianAggregates ?? {}).length > 0;
    for (const victims of Object.values(state.nationalDisplacement?.humanitarianAggregates ?? {})) {
        for (const [people, aggregate] of Object.entries(victims)) {
            const count = aggregate.refugeesCreated;
            if (!Number.isFinite(count) || count <= 0) continue;
            displacedOrKilledByFaction[people] = (displacedOrKilledByFaction[people] ?? 0) + count;
            totalDisplacedOrKilled += count;
        }
    }
    const totalDisplacedOrKilledReported = displacementReported;
    const displacedOrKilledByFactionReported = displacementReported;

    const playerFaction = WAR_SUMMARY_FACTIONS.includes(state.player_faction as (typeof WAR_SUMMARY_FACTIONS)[number])
        ? state.player_faction as (typeof WAR_SUMMARY_FACTIONS)[number]
        : null;

    const warExhaustionByFaction: WarSummaryOverviewModel['warExhaustionByFaction'] = {};
    const warWearinessByFaction: WarSummaryOverviewModel['warWearinessByFaction'] = {};
    const rawExhaustion = state.warPhaseExhaustion;
    if (rawExhaustion) {
        for (const f of WAR_SUMMARY_FACTIONS) {
            const v = rawExhaustion[f];
            if (typeof v === 'number' && Number.isFinite(v)) {
                warExhaustionByFaction[f] = v;
                // Derive the war-weariness band off the same raw signal. The
                // collapse_eligibility echo is unavailable on the adapter view
                // (gated/default-off), so the descriptor is signal-only here.
                warWearinessByFaction[f] = deriveWarWeariness(v);
            }
        }
    }

    return {
        playerFaction,
        areaPct,
        atArmsByFaction,
        mobilizedPoolByFaction,
        mobilizedTotalByFaction,
        personnelByFaction: atArmsByFaction,
        totalDisplacedOrKilled,
        displacedOrKilledByFaction,
        totalDisplacedOrKilledReported,
        displacedOrKilledByFactionReported,
        warExhaustionByFaction,
        warWearinessByFaction,
    };
}

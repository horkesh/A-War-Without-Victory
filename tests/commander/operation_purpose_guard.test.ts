import { describe, expect, it } from 'vitest';
import type { FactionId } from '../../src/state/game_state.js';
import type { SpatialContext } from '../../src/sim/spatial_context.js';
import type {
    CommanderBriefing,
    ZoneAssessment,
} from '../../src/sim/combat/commander/commander_state.js';
import {
    capEmergentOperationBrigades,
    deriveOpportunityTargetPurpose,
    selectOpportunityTargets,
} from '../../src/sim/combat/commander/plan.js';

const FACTION: FactionId = 'RBiH';
const TARGET = 'op:lopare:lopare_selo_2';
const CAMPAIGN_TARGET = 'op:brcko:donji_rahic';
const FRIENDLY = [
    'op:kalesija:kikaci',
    'op:tuzla:gornja_tuzla',
    'op:tuzla:simin_han_2',
    'op:ugljevik:teocak_krstac_2',
    'op:zvornik:rastosnica_2',
];

function makeBriefing(overrides: Partial<CommanderBriefing> = {}): CommanderBriefing {
    const adjacency = new Map<string, readonly string[]>([
        [TARGET, [...FRIENDLY, 'op:lopare:lopare_2', 'op:lopare:priboj_2']],
        [CAMPAIGN_TARGET, [FRIENDLY[0]!]],
        ...FRIENDLY.map((osid) => [osid, [TARGET]] as const),
        ['op:lopare:lopare_2', [TARGET]],
        ['op:lopare:priboj_2', [TARGET]],
    ]);
    const spatial = {
        adjacency,
        sharedBoundaryAdjacency: adjacency,
        friendlyOsidsByFaction: new Map([[FACTION, new Set(FRIENDLY)]]),
        componentsByFaction: new Map(),
        computedAtTurn: 70,
        phase: 'pre-combat',
    } as unknown as SpatialContext;

    return {
        corps_id: 'arbih_2nd_corps',
        faction: FACTION,
        turn: 70,
        spatial,
        sectors: [],
        brigades: [],
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: {
            own_salients: [],
            enemy_salients: [],
            line_shortening_scores: new Map([[TARGET, -3]]),
            critical_holds: [],
        },
        intel_data: null,
        doctrine_stance: 'offensive',
        corps_stance: 'offensive',
        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: { tanks: 0, artillery: 0, infantry_only: true },
        adjacent_corps: [],
        officer_personality: { aggression: 0.6, caution: 0.2, initiative: 0.7, competence: 0.7 },
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
        ...overrides,
    } as CommanderBriefing;
}

function makeZone(): ZoneAssessment {
    return {
        zone_id: 'zone:arbih_2nd_corps:tuzla' as ZoneAssessment['zone_id'],
        corps_id: 'arbih_2nd_corps',
        faction: FACTION,
        osids: FRIENDLY,
        front_edge_count: 7,
        depth: 5,
        corridor_width: 4,
        population_value: 100000,
        strategic_value: 5,
        posture: 'projecting',
        commitment_ratio: 1,
        garrison_budget: 1,
        assigned_brigades: [],
        surplus_brigades: [],
        deficit: 0,
        is_main_body: true,
        enemy_adjacent_osids: [TARGET],
        is_must_hold: false,
    };
}

describe('emergent operation purpose guard', () => {
    it('bounds ordinary corps opportunities but leaves assigned bilateral offensives uncapped', () => {
        expect(capEmergentOperationBrigades(11, false)).toBe(6);
        expect(capEmergentOperationBrigades(11, true)).toBe(11);
    });

    it('rejects a highly exposed OSID when exposure is its only recommendation', () => {
        const briefing = makeBriefing();
        expect(deriveOpportunityTargetPurpose(TARGET, makeZone(), briefing)).toBeNull();
        expect(selectOpportunityTargets(makeZone(), 6, briefing)).toEqual([]);
    });

    it('accepts an Army-HQ objective regardless of whether it is locally exposed', () => {
        const briefing = makeBriefing({ campaign_offensive_targets: [TARGET] });
        expect(deriveOpportunityTargetPurpose(TARGET, makeZone(), briefing)).toBe('campaign_objective');
        expect(selectOpportunityTargets(makeZone(), 6, briefing)).toEqual([TARGET]);
    });

    it('accepts a recently lost OSID as an operation-scoped counterattack', () => {
        const briefing = makeBriefing({
            state_ref: {
                political: {
                    control_events: [{ turn: 67, settlement_id: TARGET, mechanism: 'combat', from: FACTION, to: 'RS' }],
                },
            } as CommanderBriefing['state_ref'],
        });
        expect(deriveOpportunityTargetPurpose(TARGET, makeZone(), briefing)).toBe('recent_recapture');
    });

    it('restores a fresh local loss before pursuing a standing campaign objective', () => {
        const briefing = makeBriefing({
            campaign_offensive_targets: [CAMPAIGN_TARGET],
            state_ref: {
                political: {
                    control_events: [{ turn: 67, settlement_id: TARGET, mechanism: 'combat', from: FACTION, to: 'RS' }],
                },
            } as CommanderBriefing['state_ref'],
        });
        const zone = { ...makeZone(), enemy_adjacent_osids: [CAMPAIGN_TARGET, TARGET] };

        expect(selectOpportunityTargets(zone, 2, briefing)).toEqual([TARGET]);
    });

    it('vetoes an unpurposed primary proposal instead of shopping the front for a fallback target', () => {
        const briefing = makeBriefing({
            front_geometry: {
                own_salients: [],
                enemy_salients: [{
                    salient_id: 'salient:brcko',
                    side: 'enemy',
                    body_osids: ['op:brcko:brcko'],
                    neck_osids: [CAMPAIGN_TARGET],
                    neck_width: 1,
                    body_size: 1,
                    vulnerability: 1,
                    front_exposure: 0.2,
                }],
                line_shortening_scores: new Map(),
                critical_holds: [],
            },
        });
        const zone = { ...makeZone(), enemy_adjacent_osids: [TARGET, CAMPAIGN_TARGET] };

        expect(deriveOpportunityTargetPurpose(TARGET, zone, briefing)).toBeNull();
        expect(deriveOpportunityTargetPurpose(CAMPAIGN_TARGET, zone, briefing)).toBe('cut_enemy_salient');
        expect(selectOpportunityTargets(zone, 2, briefing)).toEqual([]);
    });

    it('accepts an enemy position directly threatening a must-hold OSID', () => {
        const briefing = makeBriefing({ must_hold_osids: [FRIENDLY[0]!] });
        expect(deriveOpportunityTargetPurpose(TARGET, makeZone(), briefing)).toBe('relieve_must_hold');
    });

    it('accepts the neck of a live enemy salient', () => {
        const briefing = makeBriefing({
            front_geometry: {
                own_salients: [],
                enemy_salients: [{
                    salient_id: 'salient:lopare',
                    side: 'enemy',
                    body_osids: ['op:lopare:lopare_2', 'op:lopare:priboj_2'],
                    neck_osids: [TARGET],
                    neck_width: 1,
                    body_size: 2,
                    vulnerability: 2,
                    front_exposure: 0.5,
                }],
                line_shortening_scores: new Map([[TARGET, -3]]),
                critical_holds: [],
            },
        });
        expect(deriveOpportunityTargetPurpose(TARGET, makeZone(), briefing)).toBe('cut_enemy_salient');
    });
});

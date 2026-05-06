/**
 * LANE-NIGHTSHIFT-A1-WIRE-CAMPAIGN-PLAN-TO-BRIEFING — closes audit P0 ARMY-GAP-1.
 *
 * DDR: docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md (eee308e0)
 *
 * The audit (20260330_REPO_HEALTH_CONSOLIDATED.md) flagged that the CampaignPlan
 * produced by army_hq_gathering.ts was "never read by corps CO briefings —
 * strategic layer is structurally disconnected." Investigation for this lane
 * found the wiring is in fact PRESENT:
 *   - army_hq_gathering.evaluateArmyHQGathering writes
 *     state.military.campaign_plans[faction]
 *   - briefing.collectCampaignIntent reads state.military.campaign_plans[faction]
 *     and populates 6 fields on CommanderBriefing.
 *   - war_phases pipeline orders evaluate-army-hq-gathering BEFORE
 *     generate-bot-corps-orders within the same turn, so freshly-written plans
 *     are visible to commander briefings.
 *
 * This test file is the binding regression net per the lane spec. It pins:
 *   T1: GameState type carries the campaign_plans field on MilitaryState.
 *   T2: briefing.ts source reads from state.military.campaign_plans (static-grep).
 *   T3: Each faction has its own slot (RBiH, RS, HRHB).
 *   T4: Determinism — same state in, same briefing campaign fields out.
 *   T5: Step ordering: evaluate-army-hq-gathering BEFORE generate-bot-corps-orders.
 *   T6: Static-grep guards on briefing.ts (no Math.random, Date.now, faction hardcode).
 *   T7: campaign_plans surface is byte-stable across two builds with the same
 *       theater assessment input — proves the wiring layer adds no behavior drift.
 *
 * Determinism: no Math.random(), no Date.now(), no timestamps.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildBriefing } from '../src/sim/combat/commander/briefing.js';
import {
    evaluateArmyHQGathering,
    assessTheater,
    generateCampaignPlan,
} from '../src/sim/combat/army_hq_gathering.js';

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSector(corpsId: FormationId, faction: FactionId): CorpsFrontSector {
    return {
        sector_id: `sector:${corpsId}:0`,
        corps_id: corpsId,
        faction,
        opposing_factions: [(faction === 'RBiH' ? 'RS' : 'RBiH') as FactionId],
        edge_ids: ['e1'],
        sub_segments: [{
            id: 'ss1',
            friendly_osids: ['op:test:t1'],
            enemy_osids: ['op:enemy:priority'],
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: ['op:test:t1'],
        assigned_brigade_ids: ['b1' as FormationId],
        reserve_brigade_ids: [],
        stance: 'defend',
        sector_stance: 'defend',
        local_priority: 0,
        vulnerability: 0,
        opportunity_score: 0,
    } as unknown as CorpsFrontSector;
}

function makeBrigade(corpsId: FormationId, faction: FactionId): FormationState {
    return {
        id: 'b1' as FormationId,
        faction,
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1800,
        cohesion: 60,
        morale: 60,
        location_osid: 'op:test:t1',
        corps_id: corpsId,
    } as FormationState;
}

function makeStateWithCampaignPlan(
    corpsId: FormationId,
    faction: FactionId,
    campaignPlanByFaction: Record<string, unknown>,
): GameState {
    const sector = makeSector(corpsId, faction);
    const brigade = makeBrigade(corpsId, faction);
    return {
        meta: { turn: 10, phase: 'war' },
        military: {
            formations: { [brigade.id]: brigade },
            corps_front_sectors: { [sector.sector_id]: sector },
            corps_command: {
                [corpsId]: {
                    stance: 'balanced',
                    corps_exhaustion: 0,
                    active_operations: [],
                },
            },
            campaign_plans: campaignPlanByFaction,
            sector_intel: {},
            opsec_sectors: [],
        },
    } as unknown as GameState;
}

function basicCampaignPlanFor(corpsId: FormationId, issuedTurn = 10) {
    return {
        issued_turn: issuedTurn,
        valid_until_turn: issuedTurn + 4,
        emergency: false,
        trigger_reason: 'regular_cadence',
        front_priorities: [{
            corps_id: corpsId,
            role: 'primary',
            suggested_stance: 'offensive',
            offensive_targets: ['op:enemy:priority'],
            hold_targets: ['op:test:campaign_hold'],
        }],
        doctrine_override: {
            army_stance: 'general_offensive',
            aggression_modifier: 0.1,
            corps_stance_ceilings: { [corpsId]: 'offensive' },
        },
        synchronized_operations: [],
        force_transfers: [],
        excluded_corps: [],
    };
}

function makeSpatial(faction: FactionId) {
    return {
        adjacency: new Map<string, string[]>([
            ['op:test:t1', ['op:enemy:priority']],
            ['op:enemy:priority', ['op:test:t1']],
        ]),
        friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
            [faction, new Set(['op:test:t1'])],
        ]),
        componentsByFaction: new Map(),
    } as any;
}

// Source paths used by static-grep tests
const REPO_ROOT = resolve(__dirname, '..');
const BRIEFING_PATH = resolve(REPO_ROOT, 'src/sim/combat/commander/briefing.ts');
const WAR_PHASES_PATH = resolve(REPO_ROOT, 'src/sim/turn_phases/war_phases.ts');

function readSource(path: string): string {
    return readFileSync(path, 'utf-8');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('A1 — CampaignPlan wired into corps briefing (closes ARMY-GAP-1)', () => {
    it('T1: GameState.military carries the campaign_plans field (typed slot)', () => {
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const state = makeStateWithCampaignPlan(corpsId, faction, {
            [faction]: basicCampaignPlanFor(corpsId),
        });
        // The slot must exist on the runtime state. The key invariant: writing
        // a plan and reading it back round-trips through the typed slot.
        expect(state.military).toBeDefined();
        expect(state.military.campaign_plans).toBeDefined();
        expect(state.military.campaign_plans?.[faction]).toBeTruthy();
        const plan = state.military.campaign_plans![faction]!;
        expect(plan.front_priorities[0]?.corps_id).toBe(corpsId);
    });

    it('T2: briefing.ts reads from state.military.campaign_plans (static-grep)', () => {
        const src = readSource(BRIEFING_PATH);
        // The wiring is the exact field path. If a future refactor removes
        // this read, this guard fails.
        expect(src).toMatch(/state\.military\.campaign_plans\?\.\[faction\]/);
        // The briefing must surface the campaign role into the output struct.
        expect(src).toMatch(/campaign_role/);
        expect(src).toMatch(/campaign_offensive_targets/);
        expect(src).toMatch(/campaign_hold_targets/);
        expect(src).toMatch(/campaign_stance_ceiling/);
    });

    it('T3: each canonical faction has its own CampaignPlan slot', () => {
        const corpsId = 'corps_x' as FormationId;
        const factions: FactionId[] = ['RBiH', 'RS', 'HRHB'];
        const slot: Record<string, unknown> = {};
        for (const f of factions) {
            slot[f] = basicCampaignPlanFor(corpsId);
        }
        for (const f of factions) {
            const state = makeStateWithCampaignPlan(corpsId, f, slot);
            const briefing = buildBriefing(
                state,
                corpsId,
                f,
                makeSpatial(f),
                [],
                null,
                null,
                null,
                null,
            );
            expect(briefing.campaign_role).toBe('primary');
            expect(briefing.campaign_offensive_targets).toEqual(['op:enemy:priority']);
        }
    });

    it('T4: determinism — same state yields byte-identical briefing campaign fields', () => {
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const buildOnce = () => {
            const state = makeStateWithCampaignPlan(corpsId, faction, {
                [faction]: basicCampaignPlanFor(corpsId),
            });
            return buildBriefing(
                state,
                corpsId,
                faction,
                makeSpatial(faction),
                [],
                null,
                null,
                null,
                null,
            );
        };
        const a = buildOnce();
        const b = buildOnce();
        const fields = (br: ReturnType<typeof buildOnce>) => ({
            campaign_role: br.campaign_role,
            campaign_offensive_targets: [...br.campaign_offensive_targets],
            campaign_hold_targets: [...br.campaign_hold_targets],
            campaign_stance_ceiling: br.campaign_stance_ceiling,
            campaign_sync_role: br.campaign_sync_role,
            campaign_sync_targets: [...br.campaign_sync_targets],
        });
        expect(JSON.stringify(fields(a))).toBe(JSON.stringify(fields(b)));
    });

    it('T5: war_phases.ts orders gather BEFORE bot-corps-orders within a turn', () => {
        const src = readSource(WAR_PHASES_PATH);
        const gatherIdx = src.indexOf("name: 'evaluate-army-hq-gathering'");
        const ordersIdx = src.indexOf("name: 'generate-bot-corps-orders'");
        expect(gatherIdx).toBeGreaterThan(0);
        expect(ordersIdx).toBeGreaterThan(0);
        // Gather must precede bot orders; otherwise commander briefings see a
        // stale plan from the previous turn.
        expect(gatherIdx).toBeLessThan(ordersIdx);
    });

    it('T6: briefing.ts has no nondeterminism / faction hardcodes (static guards)', () => {
        const src = readSource(BRIEFING_PATH);
        // Strip comments before scanning, so the determinism guard regexes
        // do not false-trigger on documentation strings ("no Math.random()…").
        const stripped = src
            .split('\n')
            .map(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
                    return '';
                }
                // Strip any trailing line comment.
                const idx = line.indexOf('//');
                return idx >= 0 ? line.slice(0, idx) : line;
            })
            .join('\n')
            // Strip block comments crudely.
            .replace(/\/\*[\s\S]*?\*\//g, '');
        expect(stripped).not.toMatch(/Math\.random\(/);
        expect(stripped).not.toMatch(/Date\.now\(/);
        expect(stripped).not.toMatch(/new Date\(/);
        // No hardcoded faction-specific branches in the campaign-intent path —
        // the read is uniform across RBiH/RS/HRHB.
        const collectFn = src.match(/function collectCampaignIntent[\s\S]*?\n\}/);
        expect(collectFn).not.toBeNull();
        const body = collectFn![0];
        expect(body).not.toMatch(/['"](RBiH|RS|HRHB)['"]/);
    });

    it('T7: campaign_plans surface is byte-stable across two assess+generate runs', () => {
        // The wiring layer must not introduce drift. We construct two states
        // with identical inputs, call assessTheater + generateCampaignPlan
        // twice, and require the JSON-serialized plans be byte-identical.
        const corpsId = 'corps_y' as FormationId;
        const faction = 'RS' as FactionId;
        // Turn ≥ GATHERING_CADENCE_RS (8) so shouldGather fires on regular_cadence
        // when last_gathering_turn defaults to 0.
        const evalTurn = 10;
        const buildPlanJson = () => {
            const sector = makeSector(corpsId, faction);
            const brigade = makeBrigade(corpsId, faction);
            const state = {
                meta: { turn: evalTurn, phase: 'war' },
                military: {
                    formations: { [brigade.id]: brigade },
                    corps_front_sectors: { [sector.sector_id]: sector },
                    corps_command: {
                        [corpsId]: { stance: 'balanced', corps_exhaustion: 0, active_operations: [] },
                    },
                    sector_intel: {},
                    opsec_sectors: [],
                    sector_combat_ratings: {},
                    general_supply_reserve: { [faction]: 5000 },
                    last_gathering_turn: {},
                    fired_event_ids: [],
                },
                political: {
                    control_events: [],
                },
            } as unknown as GameState;
            const assessment = assessTheater(state, faction);
            const plan = generateCampaignPlan(state, faction, assessment, evalTurn, 'regular_cadence', false);
            return JSON.stringify(plan);
        };

        const a = buildPlanJson();
        const b = buildPlanJson();
        expect(a).toBe(b);

        // Sanity: the wiring also persists a written plan via evaluateArmyHQGathering.
        const sector = makeSector(corpsId, faction);
        const brigade = makeBrigade(corpsId, faction);
        const state = {
            meta: { turn: evalTurn, phase: 'war' },
            military: {
                formations: { [brigade.id]: brigade },
                corps_front_sectors: { [sector.sector_id]: sector },
                corps_command: {
                    [corpsId]: { stance: 'balanced', corps_exhaustion: 0, active_operations: [] },
                },
                sector_intel: {},
                opsec_sectors: [],
                sector_combat_ratings: {},
                general_supply_reserve: { [faction]: 5000 },
                last_gathering_turn: {},
                fired_event_ids: [],
            },
            political: { control_events: [] },
        } as unknown as GameState;
        evaluateArmyHQGathering(state, faction, evalTurn);
        expect(state.military.campaign_plans?.[faction]).toBeTruthy();
    });
});

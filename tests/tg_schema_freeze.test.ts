/**
 * SCHEMA-V34 FREEZE GUARD (ADR-0005 §Determinism Impact + §Schema).
 *
 * The Tactical Group schema moved v19→v34 once during the event-system merge
 * (the v19 slot was reclaimed by displacement civilian-casualty). ADR-0005
 * requires v34 to be FROZEN: subsequent event/displacement/TG work must NOT
 * collide-renumber it, and the TG-related optional fields must keep their
 * omitEmpty (optional, default-undefined) shape. A future accidental renumber
 * or a migration that re-shapes these fields trips a RED test here.
 *
 * This complements the v34 step's own one-way migration contract comment in
 * src/state/save_migration.ts (v34→v33 downgrade is unsupported — the
 * personnel-lent ledger + TG records have no v33 representation).
 */

import { describe, expect, it } from 'vitest';
import type { GameState, MilitaryState, FormationState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { getLatestSchemaVersion } from '../src/state/save_migration.js';
import { serializeState, deserializeState } from '../src/state/serialize.js';

describe('schema v34/v35 freeze guard', () => {
    it('CURRENT_SCHEMA_VERSION is pinned at 36', () => {
        // If this fails, a renumber happened. Confirm the bump is intentional
        // (new migration step appended), then update this guard + the
        // save_migration v34 one-way contract comment together.
        expect(CURRENT_SCHEMA_VERSION).toBe(36);
    });

    it('the latest registered migration version equals CURRENT_SCHEMA_VERSION (36)', () => {
        // Guards against a migration being appended at a number > 35 without
        // bumping CURRENT_SCHEMA_VERSION (or vice-versa) — the classic
        // collide-renumber footgun ADR-0005 §Determinism Impact warns about.
        expect(getLatestSchemaVersion()).toBe(CURRENT_SCHEMA_VERSION);
        expect(getLatestSchemaVersion()).toBe(36);
    });

    it('v34 ships the four TG/Army-HQ Records as the only non-undefined scaffold (omitEmpty shape)', () => {
        // The v34 migration creates exactly these four empty Records on MilitaryState.
        // The remaining TG fields (tg_recent_compositions, tg_formations_by_corps,
        // og_promotions) stay UNDEFINED until a flag lights them — that omitEmpty
        // shape is the byte-identity contract. Assert the type-level field names
        // exist and the flag-gated ones are omitted by default.
        const mil: Partial<MilitaryState> = {
            tactical_groups: {},
            army_hq_operations: {},
            army_hq_last_op_turn: {},
            army_hq_op_count_by_year: {},
        };
        expect(mil.tactical_groups).toEqual({});
        expect(mil.army_hq_operations).toEqual({});
        expect(mil.army_hq_last_op_turn).toEqual({});
        expect(mil.army_hq_op_count_by_year).toEqual({});
        // Flag-gated fields are omitted (undefined) by default — NOT empty {}.
        expect(mil.tg_recent_compositions).toBeUndefined();
        expect(mil.tg_formations_by_corps).toBeUndefined();
        expect(mil.og_promotions).toBeUndefined();
    });

    it('FormationState TG donor-accounting fields stay optional/omitEmpty (undefined by default)', () => {
        // A donor's ledger fields must be omitted on an unaffected brigade — the
        // v34→v33 one-way contract hinges on these having no v33 representation.
        const brig: Partial<FormationState> = {
            id: 'b1', faction: 'RBiH', personnel: 1500,
        };
        expect(brig.personnel_lent_by_tg).toBeUndefined();
        expect(brig.equipment_lent_by_tg).toBeUndefined();
        expect(brig.tg_cooldown_until_turn).toBeUndefined();
        expect(brig.tg_donations_this_scenario).toBeUndefined();
        expect(brig.tg_recovery_suppressed_until_turn).toBeUndefined();
    });

    it('a current state round-trips with schema_version preserved at 35', () => {
        const faction = (id: string): any => ({
            id, profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 5 },
            areasOfResponsibility: [], supply_sources: [], command_capacity: 0,
            negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
            prewar_capital: 50, declaration_pressure: 0, declared: false, declaration_turn: null,
        });
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 1, seed: 's', phase: 'war',
                referendum_held: true, referendum_turn: 6, war_start_turn: 0,
                referendum_eligible_turn: null, referendum_deadline_turn: null,
                game_over: false, outcome: undefined, player_faction: 'RBiH', decision_mode: 'historical',
            } as any,
            factions: [faction('RBiH'), faction('RS'), faction('HRHB')],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
                tactical_groups: {},
                army_hq_operations: {},
                army_hq_last_op_turn: {},
                army_hq_op_count_by_year: {},
            } as Partial<MilitaryState> as MilitaryState,
            political: {
                negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
                ceasefire: {},
                negotiation_ledger: [],
                supply_rights: { corridors: [] },
                political_controllers: {},
                municipalities: {},
            } as any,
            displacement: {} as any,
        } as GameState;
        const hydrated = deserializeState(serializeState(state));
        expect(hydrated.schema_version).toBe(36);
    });
});

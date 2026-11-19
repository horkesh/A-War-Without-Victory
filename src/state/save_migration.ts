import { initializeMilitiaPoolLifecycleDefaults } from './militia_pool_defaults.js';
import { initializeFormationDefaults } from './formation_defaults.js';
/**
 * Save migration registry - versioned field defaults for old saves.
 *
 * Determinism stop gate:
 * - Migrations must be pure in-place patches: no I/O, logging, time, randomness,
 *   or environment reads.
 * - Every record traversal that can affect emitted order must use sorted keys.
 * - Defaults are classified in the migration description. Sensitive defaults
 *   require explicit ledger/user sign-off before shipping.
 */

import type { FactionId, GameState } from './game_state.js';
import { reconcileLoadedArmyHqOperationLifecycle } from './operation_lifecycle_reconciliation.js';
import { canonicalizePoliticalSideId } from './identity.js';

interface SaveMigration {
    /** Schema version this migration brings the state TO. */
    version: number;
    /** Human-readable description for debugging. */
    description: string;
    /** Patch state in-place. Called only when state.schema_version < this.version. */
    migrate: (state: GameState) => void;
}

const migrations: SaveMigration[] = [];

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function sortedKeys(record: Record<string, unknown>): string[] {
    return Object.keys(record).sort(strictCompare);
}

function asRecord(value: unknown): Record<string, any> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return value as Record<string, any>;
}

function isCanonicalPlayerFaction(value: unknown): value is FactionId {
    return value === 'RBiH' || value === 'RS' || value === 'HRHB';
}

function currentTurn(state: GameState): number {
    const turn = state.meta?.turn;
    return Number.isInteger(turn) && turn >= 0 ? turn : 0;
}

function ensureRecord(parent: Record<string, any> | undefined, key: string): Record<string, any> {
    if (!parent) return {};
    const value = parent[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        parent[key] = {};
    }
    return parent[key];
}

function ensureArray(parent: Record<string, any> | undefined, key: string): any[] {
    if (!parent) return [];
    if (!Array.isArray(parent[key])) parent[key] = [];
    return parent[key];
}

function ensureDisplacementRoot(state: GameState): Record<string, any> {
    const root = state as Record<string, any>;
    const existing = asRecord(root.displacement);
    if (existing) return existing;
    root.displacement = {};
    return root.displacement;
}

function sanitizeNegotiationStatus(pol: Record<string, any>, turn: number): void {
    if (!pol.negotiation_status || typeof pol.negotiation_status !== 'object' || Array.isArray(pol.negotiation_status)) {
        pol.negotiation_status = { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null, last_counter_turn: {} };
        return;
    }
    const ns = pol.negotiation_status;
    if (typeof ns.ceasefire_active !== 'boolean') ns.ceasefire_active = false;
    if (ns.ceasefire_since_turn !== null && (!Number.isInteger(ns.ceasefire_since_turn) || ns.ceasefire_since_turn > turn)) {
        ns.ceasefire_since_turn = null;
    }
    if (ns.last_offer_turn !== null && (!Number.isInteger(ns.last_offer_turn) || ns.last_offer_turn > turn)) {
        ns.last_offer_turn = null;
    }
    if (!ns.last_counter_turn || typeof ns.last_counter_turn !== 'object' || Array.isArray(ns.last_counter_turn)) {
        ns.last_counter_turn = {};
    } else {
        const next: Record<string, number> = {};
        for (const faction of sortedKeys(ns.last_counter_turn)) {
            const value = ns.last_counter_turn[faction];
            if (Number.isInteger(value) && value >= 0 && value <= turn) {
                next[faction] = value;
            }
        }
        ns.last_counter_turn = next;
    }
}

function sanitizeCeasefire(pol: Record<string, any>, turn: number): void {
    if (!pol.ceasefire || typeof pol.ceasefire !== 'object' || Array.isArray(pol.ceasefire)) {
        pol.ceasefire = {};
        return;
    }
    for (const edgeId of sortedKeys(pol.ceasefire)) {
        const entry = pol.ceasefire[edgeId];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            delete pol.ceasefire[edgeId];
            continue;
        }
        if (!Number.isInteger(entry.since_turn) || entry.since_turn < 0 || entry.since_turn > turn) {
            delete pol.ceasefire[edgeId];
            continue;
        }
        if (entry.until_turn !== null && (!Number.isInteger(entry.until_turn) || entry.until_turn < entry.since_turn)) {
            entry.until_turn = null;
        }
        if (entry.until_turn !== null && entry.until_turn <= turn) {
            delete pol.ceasefire[edgeId];
        }
    }
}

function canonicalizeFactions(state: GameState): void {
    const factions = state.factions;
    if (!Array.isArray(factions)) return;
    for (const f of [...factions].sort((a: any, b: any) => strictCompare(a?.id ?? '', b?.id ?? ''))) {
        if (!f || typeof f !== 'object') continue;
        if (typeof f.id === 'string') f.id = canonicalizePoliticalSideId(f.id);
    }
}

function defaultFactionState(state: GameState): void {
    const factions = state.factions;
    if (!Array.isArray(factions)) return;
    for (const f of [...factions].sort((a: any, b: any) => strictCompare(a?.id ?? '', b?.id ?? ''))) {
        if (!f || typeof f !== 'object') continue;
        if (!Array.isArray(f.supply_sources)) f.supply_sources = [];
        if (typeof f.command_capacity !== 'number' || !Number.isInteger(f.command_capacity) || f.command_capacity < 0) f.command_capacity = 0;
        if (!f.negotiation || typeof f.negotiation !== 'object' || Array.isArray(f.negotiation)) {
            f.negotiation = { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null };
        } else {
            const turn = currentTurn(state);
            if (!Number.isInteger(f.negotiation.pressure) || f.negotiation.pressure < 0) f.negotiation.pressure = 0;
            if (f.negotiation.last_change_turn !== null && (!Number.isInteger(f.negotiation.last_change_turn) || f.negotiation.last_change_turn > turn)) {
                f.negotiation.last_change_turn = null;
            }
            if (!Number.isInteger(f.negotiation.capital) || f.negotiation.capital < 0) f.negotiation.capital = 0;
            if (!Number.isInteger(f.negotiation.spent_total) || f.negotiation.spent_total < 0) f.negotiation.spent_total = 0;
            if (f.negotiation.last_capital_change_turn !== null && (!Number.isInteger(f.negotiation.last_capital_change_turn) || f.negotiation.last_capital_change_turn > turn)) {
                f.negotiation.last_capital_change_turn = null;
            }
        }
        if (f.declaration_pressure === undefined) f.declaration_pressure = 0;
        if (f.declared === undefined) f.declared = false;
        if (f.declaration_turn === undefined) f.declaration_turn = null;
    }
}

function canonicalizeMilitaryRecords(state: GameState): void {
    const mil = asRecord(state.military);
    if (!mil) return;
    for (const key of ['front_posture', 'front_posture_regions'] as const) {
        const rec = asRecord(mil[key]);
        if (!rec) continue;
        const next: Record<string, any> = {};
        for (const oldKey of sortedKeys(rec)) {
            next[canonicalizePoliticalSideId(oldKey)] = rec[oldKey];
        }
        mil[key] = next;
    }
}

function defaultFrontSegments(state: GameState): void {
    const segments = asRecord(state.military?.front_segments);
    if (!segments) return;
    for (const key of sortedKeys(segments)) {
        const seg = segments[key];
        if (!seg || typeof seg !== 'object' || Array.isArray(seg)) continue;
        if (!Number.isInteger(seg.active_streak) || seg.active_streak < 0) seg.active_streak = 0;
        if (!Number.isInteger(seg.max_active_streak) || seg.max_active_streak < 0) seg.max_active_streak = 0;
        if (!Number.isInteger(seg.friction) || seg.friction < 0) seg.friction = 0;
        if (!Number.isInteger(seg.max_friction) || seg.max_friction < 0) seg.max_friction = 0;
    }
}

function defaultFormations(state: GameState): void {
    const formations = asRecord(state.military?.formations);
    if (!formations) return;
    const turn = currentTurn(state);
    for (const key of sortedKeys(formations)) {
        const form = formations[key];
        if (!form || typeof form !== 'object' || Array.isArray(form)) continue;
        initializeFormationDefaults(form, turn);
    }
}

function defaultMilitiaPools(state: GameState): void {
    const pools = asRecord(state.military?.militia_pools);
    if (!pools) return;
    for (const key of sortedKeys(pools)) {
        const pool = pools[key];
        if (!pool || typeof pool !== 'object' || Array.isArray(pool)) continue;
        initializeMilitiaPoolLifecycleDefaults(pool);
    }
}

function canonicalizeNegotiationLedger(pol: Record<string, any>): void {
    if (!Array.isArray(pol.negotiation_ledger)) {
        pol.negotiation_ledger = [];
        return;
    }
    for (const entry of pol.negotiation_ledger) {
        if (entry && typeof entry === 'object' && typeof entry.faction_id === 'string') {
            entry.faction_id = canonicalizePoliticalSideId(entry.faction_id);
        }
    }
}

function canonicalizeSupplyRights(pol: Record<string, any>): void {
    if (!pol.supply_rights || typeof pol.supply_rights !== 'object' || Array.isArray(pol.supply_rights)) {
        pol.supply_rights = { corridors: [] };
        return;
    }
    if (!Array.isArray(pol.supply_rights.corridors)) {
        pol.supply_rights.corridors = [];
        return;
    }
    for (const corridor of pol.supply_rights.corridors) {
        if (corridor && typeof corridor === 'object' && typeof corridor.beneficiary === 'string') {
            corridor.beneficiary = canonicalizePoliticalSideId(corridor.beneficiary);
        }
    }
    pol.supply_rights.corridors.sort((a: any, b: any) => strictCompare(a?.id ?? '', b?.id ?? ''));
}

function defaultJna(mil: Record<string, any>): void {
    if (!mil.war_jna || typeof mil.war_jna !== 'object' || Array.isArray(mil.war_jna)) {
        mil.war_jna = { transition_begun: false, withdrawal_progress: 0, asset_transfer_rs: 0 };
        return;
    }
    const jna = mil.war_jna;
    if (typeof jna.transition_begun !== 'boolean') jna.transition_begun = false;
    if (typeof jna.withdrawal_progress !== 'number' || jna.withdrawal_progress < 0 || jna.withdrawal_progress > 1) {
        jna.withdrawal_progress = 0;
    }
    if (typeof jna.asset_transfer_rs !== 'number' || jna.asset_transfer_rs < 0 || jna.asset_transfer_rs > 1) {
        jna.asset_transfer_rs = 0;
    }
}

function ensureNegotiationCounterOfferDefaults(state: GameState): void {
    const mil = asRecord(state.military);
    if (mil) {
        const negotiation = ensureRecord(mil, 'negotiation');
        if (!asRecord(negotiation.capital)) negotiation.capital = {};
        if (!asRecord(negotiation.patron_relationships)) negotiation.patron_relationships = {};
        if (!Array.isArray(negotiation.peace_plan_history)) negotiation.peace_plan_history = [];
        const offers = Array.isArray(negotiation.pending_counter_offers)
            ? negotiation.pending_counter_offers.filter((offer: any) => offer && typeof offer === 'object' && typeof offer.id === 'string')
            : [];
        offers.sort((a: any, b: any) => strictCompare(a.id, b.id));
        negotiation.pending_counter_offers = offers;
    }

    const pol = asRecord(state.political);
    if (pol) {
        sanitizeNegotiationStatus(pol, currentTurn(state));
    }
}

export function registerMigration(migration: SaveMigration): void {
    migrations.push(migration);
}

export function applyMigrations(state: GameState): number {
    const currentVersion = state.schema_version ?? 0;
    const pending = migrations
        .filter(m => m.version > currentVersion)
        .sort((a, b) => a.version - b.version);

    for (const m of pending) {
        m.migrate(state);
        state.schema_version = m.version;
    }

    if (state.military) reconcileLoadedArmyHqOperationLifecycle(state);

    return pending.length;
}

export function getLatestSchemaVersion(): number {
    if (migrations.length === 0) return 0;
    return Math.max(...migrations.map(m => m.version));
}

registerMigration({
    version: 1,
    description: 'Add HRHB enclave resilience entries if missing. Sensitive: no.',
    migrate: (state) => {
        const military = asRecord(state.military);
        const er = asRecord(military?.enclave_resilience);
        if (!er) return;
        for (const id of ['kiseljak', 'lasva_valley', 'zepce'].sort(strictCompare)) {
            if (!(id in er)) {
                er[id] = { resilience: 0, isolation_turns: 0, hardening_active: false };
            }
        }
    },
});

registerMigration({
    version: 2,
    description: 'Migrate corps_command active_operation to active_operations array. Sensitive: no.',
    migrate: (state) => {
        const corpsCommand = asRecord(state.military?.corps_command);
        if (!corpsCommand) return;
        for (const corpsId of sortedKeys(corpsCommand)) {
            const cmd = corpsCommand[corpsId];
            if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) continue;
            if (!cmd.active_operations) {
                cmd.active_operations = cmd.active_operation ? [cmd.active_operation] : [];
            }
            delete cmd.active_operation;
        }
    },
});

registerMigration({
    version: 3,
    description: '2026-05-17 Phase 0 meta and faction declaration defaults. Sensitive: no.',
    migrate: (state) => {
        const meta = asRecord(state.meta);
        if (meta) {
            if (meta.referendum_held === undefined) meta.referendum_held = false;
            if (meta.referendum_turn === undefined) meta.referendum_turn = null;
            if (meta.war_start_turn === undefined) meta.war_start_turn = null;
            if (meta.peace_scheduled_referendum_turn === undefined) meta.peace_scheduled_referendum_turn = null;
            if (meta.peace_scheduled_war_start_turn === undefined) meta.peace_scheduled_war_start_turn = null;
            if (meta.peace_war_start_control_path === undefined) meta.peace_war_start_control_path = null;
            if (meta.referendum_eligible_turn === undefined) meta.referendum_eligible_turn = null;
            if (meta.referendum_deadline_turn === undefined) meta.referendum_deadline_turn = null;
            if (meta.game_over === undefined) meta.game_over = false;
            if (!('outcome' in meta)) meta.outcome = undefined;
        }
        canonicalizeFactions(state);
        defaultFactionState(state);
    },
});

registerMigration({
    version: 4,
    description: 'Political-domain defaults and negotiation substrate. Sensitive: no.',
    migrate: (state) => {
        const pol = asRecord(state.political);
        if (!pol) return;
        sanitizeNegotiationStatus(pol, currentTurn(state));
        sanitizeCeasefire(pol, currentTurn(state));
        canonicalizeNegotiationLedger(pol);
        canonicalizeSupplyRights(pol);
        ensureRecord(pol, 'municipalities');
    },
});

registerMigration({
    version: 5,
    description: 'Military-domain default skeleton and front segment counters. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil) return;
        ensureRecord(mil, 'front_segments');
        ensureRecord(mil, 'theatres');
        ensureRecord(mil, 'army_theatre_assignment');
        ensureRecord(mil, 'formations');
        ensureRecord(mil, 'front_posture');
        ensureRecord(mil, 'front_posture_regions');
        ensureRecord(mil, 'front_pressure');
        ensureArray(mil, 'assignable_front_segments');
        ensureRecord(mil, 'brigade_front_assignment');
        ensureRecord(mil, 'militia_pools');
        defaultFrontSegments(state);
        canonicalizeMilitaryRecords(state);
    },
});

registerMigration({
    version: 6,
    description: 'Peace-phase war substrate defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        const pol = asRecord(state.political);
        const disp = asRecord(state.displacement);
        if (mil) {
            ensureRecord(mil, 'war_militia_strength');
            defaultJna(mil);
        }
        if (pol) {
            ensureRecord(pol, 'war_consolidation_until');
            ensureRecord(pol, 'war_control_strain');
        }
        if (disp) ensureRecord(disp, 'war_displacement_initiated');
    },
});

registerMigration({
    version: 7,
    description: 'War-phase supply, exhaustion, and displacement substrate defaults. Sensitive: no.',
    migrate: (state) => {
        const pol = asRecord(state.political);
        const disp = asRecord(state.displacement);
        if (pol) {
            ensureRecord(pol, 'war_supply_pressure');
            ensureRecord(pol, 'war_supply_condition');
            ensureRecord(pol, 'war_exhaustion');
            ensureRecord(pol, 'war_exhaustion_local');
        }
        if (disp) {
            ensureRecord(disp, 'hostile_takeover_timers');
            ensureRecord(disp, 'displacement_camp_state');
            ensureRecord(disp, 'settlement_displacement');
            ensureRecord(disp, 'settlement_displacement_started_turn');
            ensureRecord(disp, 'municipality_displacement');
            ensureArray(disp, 'displacement_event_log');
        } else {
            ensureArray(ensureDisplacementRoot(state), 'displacement_event_log');
        }
    },
});

registerMigration({
    version: 8,
    description: 'Phase E/F humanitarian aggregate defaults. Sensitive: no.',
    migrate: (state) => {
        const disp = ensureDisplacementRoot(state);
        ensureArray(disp, 'displacement_event_log');
        ensureRecord(disp, 'displacement_humanitarian_aggregates');
        ensureRecord(disp, 'displacement_origin_dest_arrivals');
        ensureRecord(disp, 'displacement_recent_by_turn');
    },
});

registerMigration({
    version: 9,
    description: 'Formation lifecycle and militia-pool fatigue defaults. Sensitive: no.',
    migrate: (state) => {
        defaultFormations(state);
        defaultMilitiaPools(state);
    },
});

registerMigration({
    version: 10,
    description: 'A2/C1 command substrate default skeletons. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil) return;
        ensureRecord(mil, 'army_co_decision_traces');
        ensureRecord(mil, 'army_corps_directives_by_faction');
        const officerData = Array.isArray(mil.named_officer_data) ? mil.named_officer_data : [];
        for (const officer of officerData) {
            if (!officer || typeof officer !== 'object' || Array.isArray(officer)) continue;
            if (officer.stubbornness === undefined) officer.stubbornness = 3;
            if (officer.override_tolerance === undefined) officer.override_tolerance = 3;
        }
        const officers = asRecord(mil.named_officers);
        if (officers) {
            for (const officerId of sortedKeys(officers)) {
                const officer = officers[officerId];
                if (!officer || typeof officer !== 'object' || Array.isArray(officer)) continue;
                if (!Array.isArray(officer.recent_overrides)) officer.recent_overrides = [];
            }
        }
    },
});

registerMigration({
    version: 11,
    description: '2026-05-17 Phase B meta.player_faction schema advertisement. Sensitive: yes; migration sets no default.',
    migrate: () => {
        // Intentionally inert: scenario/desktop startup owns player_faction defaulting.
    },
});

registerMigration({
    version: 12,
    description: 'Top-level optional save arrays/policy counters when optional family is already present. Sensitive: no.',
    migrate: (state) => {
        const s = asRecord(state);
        if (!s) return;
        const optionalKeys = [
            'turn_summaries',
            'operation_history',
            'pending_paramilitary_requests',
            'paramilitary_policy',
            'paramilitary_deployment_count',
        ];
        if (!optionalKeys.some(key => s[key] !== undefined)) return;
        if (!Array.isArray(s.turn_summaries)) s.turn_summaries = [];
        if (!Array.isArray(s.operation_history)) s.operation_history = [];
        if (!Array.isArray(s.pending_paramilitary_requests)) s.pending_paramilitary_requests = [];
        if (
            s.paramilitary_policy !== 'ask' &&
            s.paramilitary_policy !== 'always_allow' &&
            s.paramilitary_policy !== 'always_deny'
        ) {
            s.paramilitary_policy = 'ask';
        }
        const deploymentCounts = asRecord(s.paramilitary_deployment_count);
        if (deploymentCounts) {
            const sanitized: Partial<Record<FactionId, number>> = {};
            for (const faction of ['HRHB', 'RBiH', 'RS'] as const) {
                const count = deploymentCounts[faction];
                if (Number.isInteger(count) && count >= 0) sanitized[faction] = count;
            }
            s.paramilitary_deployment_count = sanitized;
        } else if (!Number.isInteger(s.paramilitary_deployment_count) || s.paramilitary_deployment_count < 0) {
            s.paramilitary_deployment_count = {};
        }
    },
});

registerMigration({
    version: 13,
    description: 'Negotiation counter-offer docket and per-faction counter-turn defaults. Sensitive: no.',
    migrate: (state) => {
        ensureNegotiationCounterOfferDefaults(state);
    },
});

registerMigration({
    version: 14,
    description: 'Loaded gameplay player_faction contract default for legacy saves. Sensitive: yes; default RBiH. Headless harness runs are exempt — they intentionally leave player_faction undefined so the event evaluator routes every event through bot auto-respond.',
    migrate: (state) => {
        const meta = asRecord(state.meta);
        if (!meta) return;
        ensureArray(asRecord(state.military), 'event_decision_log');
        // Headless harness exemption: when scenario_runner has marked this as a
        // headless run, do not backfill player_faction. Backfilling to 'RBiH'
        // causes events with `responding_faction: 'RBiH'` and
        // `requires_player_response: true` to queue-pending-forever (the engine
        // thinks a player will respond, but there's no player in a headless
        // run). n1999 verification surfaced 15+ such stuck events.
        if (meta.headless_scenario_auto_control === true) return;
        if (!isCanonicalPlayerFaction(meta.player_faction)) {
            meta.player_faction = 'RBiH';
        }
    },
});

registerMigration({
    version: 15,
    description: 'Persisted military event bookkeeping substrate defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil) return;
        ensureArray(mil, 'fired_event_ids');
        ensureRecord(mil, 'event_readiness');
        ensureRecord(mil, 'event_fire_counts');
        ensureRecord(mil, 'event_last_fired_turn');
        ensureRecord(mil, 'event_flags');
        ensureArray(mil, 'enabled_event_ids');
    },
});

registerMigration({
    version: 16,
    description: 'Phase F displacement capacity map defaults. Sensitive: no.',
    migrate: (state) => {
        const disp = ensureDisplacementRoot(state);
        ensureRecord(disp, 'settlement_displacement');
        ensureRecord(disp, 'settlement_displacement_started_turn');
        ensureRecord(disp, 'municipality_displacement');
    },
});

registerMigration({
    version: 17,
    description: 'Displacement operational substrate defaults. Sensitive: no.',
    migrate: (state) => {
        const disp = ensureDisplacementRoot(state);
        ensureRecord(disp, 'war_displacement_initiated');
        ensureRecord(disp, 'hostile_takeover_timers');
        ensureRecord(disp, 'displacement_camp_state');
    },
});

registerMigration({
    version: 18,
    description: 'Displacement lazy-map persisted defaults. Sensitive: no.',
    migrate: (state) => {
        const disp = ensureDisplacementRoot(state);
        ensureRecord(disp, 'displacement_state');
        ensureRecord(disp, 'minority_flight_state');
        ensureRecord(disp, 'sustainability_state');
    },
});

registerMigration({
    version: 19,
    description: 'Displacement civilian casualty persisted default. Sensitive: no.',
    migrate: (state) => {
        const disp = ensureDisplacementRoot(state);
        ensureRecord(disp, 'civilian_casualties');
    },
});

registerMigration({
    version: 20,
    description: 'JNA phantom spawned marker persisted default. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil) return;
        ensureArray(mil, 'phantoms_spawned');
    },
});

registerMigration({
    version: 21,
    description: 'Top-level paramilitary decision history persisted default. Sensitive: no.',
    migrate: (state) => {
        ensureArray(asRecord(state), 'paramilitary_decision_history');
    },
});

registerMigration({
    version: 22,
    description: 'Persisted military event overflow queue defaults. Sensitive: no.',
    migrate: (state) => {
        ensureArray(asRecord(state.military), 'event_overflow_queue');
    },
});

registerMigration({
    version: 23,
    description: 'Persisted event notification queue defaults. Sensitive: no.',
    migrate: (state) => {
        ensureArray(asRecord(state.military), 'pending_event_notifications');
    },
});

registerMigration({
    version: 24,
    description: 'Persisted pending event decision queue defaults. Sensitive: no.',
    migrate: (state) => {
        ensureArray(asRecord(state.military), 'pending_event_decisions');
    },
});

registerMigration({
    version: 25,
    description: 'Persisted event modifier queue defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureArray(mil, 'event_aggression_modifiers');
        ensureArray(mil, 'recruitment_modifiers');
        ensureArray(mil, 'equipment_quality_modifiers');
    },
});

registerMigration({
    version: 26,
    description: 'Persisted cost ledger annotation defaults. Sensitive: no.',
    migrate: (state) => {
        ensureArray(asRecord(state.military), 'cost_ledger_annotations');
    },
});

registerMigration({
    version: 27,
    description: 'Persisted humanitarian convoy decision queue defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureArray(mil, 'pending_convoy_decisions');
        ensureArray(mil, 'convoy_decision_history');
    },
});

registerMigration({
    version: 28,
    description: 'Persisted army reserve request queue and decision history defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureArray(mil, 'pending_reserve_requests');
        ensureArray(mil, 'reserve_request_history');
    },
});

registerMigration({
    version: 29,
    description: 'Persisted triggered-operation bookkeeping record defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureRecord(mil, 'triggered_operations_accepted');
        ensureRecord(mil, 'declined_operations');
        ensureRecord(mil, 'used_operation_names');
    },
});

registerMigration({
    version: 30,
    description: 'Persisted officer decision queue and history defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureArray(mil, 'pending_officer_events');
        ensureArray(mil, 'officer_decision_history');
    },
});

registerMigration({
    version: 31,
    description: 'Persisted consequence runtime effect queue defaults. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureArray(mil, 'cascade_penalties');
        ensureArray(mil, 'offensive_ops_suppressions');
        ensureArray(mil, 'alliance_locks');
        ensureArray(mil, 'bot_priority_shifts');
    },
});

// Phase B Sub-slice B2: shape-only state additions for the Event Database
// Runtime Semantics packet. No writer/reader is wired yet (Sub-slice B3 lands
// the eligibility short-circuit and the recordEnabledEvents/recordClosedEvents
// helpers). Each migration is pure: deterministic empty default, no I/O,
// logging, time, randomness, or env reads. Packet version-number adjustment:
// the v1.3 packet referenced v26/v27 but Family A schema-growth shipped
// v23-v31, so closed_event_ids/event_causality_log land at v32/v33.
registerMigration({
    version: 32,
    description: 'Persisted closed_event_ids array default (event soft foreclosure substrate). Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureArray(mil, 'closed_event_ids');
    },
});

registerMigration({
    version: 33,
    description: 'Persisted event_causality_log array default (audit trail substrate). Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        ensureArray(mil, 'event_causality_log');
    },
});

registerMigration({
    version: 34,
    description: 'ADR-0005 v2.0: Tactical Group + Army HQ Operation state scaffold. '
        + 'Schema-stable; behavior gated by ENABLE_TACTICAL_GROUPS umbrella flag + sub-flags '
        + '(enable_tg_formation, enable_tg_combat_synthesis, enable_tg_cohesion_bleed) all '
        + 'default off. NOTE: serializeState does NOT strip empty Records (serializeGameState '
        + 'only skips undefined values, not empty {} objects), so the four empty Records this '
        + 'migration adds DO change the serialized final_state_hash (40w pre-v34 '
        + 'a969d44719aaa40e → v34 78e231e35b08cf53). This is a schema scaffold only: '
        + 'behaviorally and calibration-neutral (identical territory/anchors/benchmarks with '
        + 'flags off), as expected for a schema-version migration — NOT byte-identical. '
        + 'Sensitive: no. '
        + 'ONE-WAY MIGRATION CONTRACT (release-notes citable; pinned by tests/tg_schema_freeze.test.ts): '
        + 'v34→v33 DOWNGRADE IS UNSUPPORTED. The v34 personnel-lent ledger '
        + '(FormationState.personnel_lent_by_tg / equipment_lent_by_tg / tg_cooldown_until_turn / '
        + 'tg_donations_this_scenario / tg_recovery_suppressed_until_turn) and the TG/Army-HQ records '
        + '(MilitaryState.tactical_groups / army_hq_operations / tg_recent_compositions / '
        + 'tg_formations_by_corps / og_promotions) have NO v33 representation, so there is no '
        + 'lossless reverse migration. A v34 save loaded by v33 code would silently lose every '
        + 'in-flight Tactical Group and its lent personnel/equipment, corrupting force totals. '
        + 'Forward-only by design; do NOT add a downgrade path. '
        + 'These FormationState fields stay optional (undefined for unaffected brigades). '
        + 'V34 IS FROZEN: do not collide-renumber it from future event/displacement/TG work. '
        + 'Renumbered from v19 during the event-system merge (v19 slot taken by displacement civilian casualty).',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil) return;
        ensureRecord(mil, 'tactical_groups');
        ensureRecord(mil, 'army_hq_operations');
        ensureRecord(mil, 'army_hq_last_op_turn');
        ensureRecord(mil, 'army_hq_op_count_by_year');
    },
});

registerMigration({
    version: 35,
    description: 'Persist explicit StateMeta decision_mode default. Sensitive: yes; legacy/unset saves default to historical calibration mode.',
    migrate: (state) => {
        const meta = asRecord(state.meta);
        if (!meta) return;
        if (meta.decision_mode === undefined) {
            meta.decision_mode = 'historical';
        }
    },
});

registerMigration({
    version: 36,
    description: 'Persist displacement.displacement_flows_by_osid (per-OSID flow tally) read-model '
        + 'substrate. Restores per-OSID departed/killed/arrived precision to the live desktop '
        + 'settlement panel (the per-turn displacement_event_log is cleared each turn, so the '
        + 'adapter\'s displacementByOsid was always empty live). Written at append-time by '
        + 'appendDisplacementEvent; read only by the UI adapter as a fallback. Sensitive: no '
        + '(empty-record default). NOTE: serializeState does NOT strip empty Records, so the empty '
        + 'Record this migration adds DOES change the serialized state hash for a freshly-migrated '
        + 'save — but calibration scenarios (scenario_runner) build state at CURRENT_SCHEMA_VERSION '
        + 'and populate the field during the run, so the calibration CONTROL map is unchanged. '
        + 'Verified control_delta byte-identical at 40w + 188w. Back-compat: old saves (< v36) load '
        + 'and get an empty record; forward-only (no downgrade path needed — purely additive read-model).',
    migrate: (state) => {
        const disp = ensureDisplacementRoot(state);
        ensureRecord(disp, 'displacement_flows_by_osid');
    },
});

registerMigration({
    version: 38,
    description: 'Persist durable militia casualty accounting: per-pool casualty rows on each '
        + 'faction ledger and a wounded_pending bucket on each militia pool. Sensitive: no. '
        + 'Forward-only and purely additive — every existing value is preserved, missing fields '
        + 'begin as deterministic zeros/empty records, and no old save loses information. '
        + 'Militia losses were previously reported by the resolver and then dropped, so the '
        + 'final-state hash MOVES on any run that contains a militia-only battle (42 such '
        + 'battles in the 40-week artifact); casualty totals from before this migration are '
        + 'historical records of the old accounting regime and are not comparable.',
    migrate: (state) => {
        const military = asRecord(state.military);
        if (!military) return;

        const ledger = asRecord(military.casualty_ledger);
        if (ledger) {
            for (const factionId of Object.keys(ledger).sort(strictCompare)) {
                const factionLedger = asRecord(ledger[factionId]);
                if (factionLedger) ensureRecord(factionLedger, 'per_militia_pool');
            }
        }

        const pools = asRecord(military.militia_pools);
        if (pools) {
            for (const poolKey of Object.keys(pools).sort(strictCompare)) {
                const pool = asRecord(pools[poolKey]);
                if (!pool) continue;
                if (typeof pool.wounded_pending !== 'number' || !Number.isFinite(pool.wounded_pending)) {
                    pool.wounded_pending = 0;
                }
            }
        }
    },
});

registerMigration({
    version: 37,
    description: 'Persist sector intelligence and the materialized current-turn corps-front standing OG snapshot. Sensitive: no; missing legacy fields begin as deterministic empty records.',
    migrate: (state) => {
        const military = asRecord(state.military);
        ensureRecord(military, 'sector_intel');
        ensureRecord(military, 'corps_front_sectors');
    },
});

registerMigration({
    version: 39,
    description: 'Freeze cut B3 + B2: the political-directive chain is retired. Empties the stale '
        + 'political_directives_by_faction (removed) and army_corps_directives_by_faction (emptied; '
        + 'the field stays) slots, which nothing ever cleared, so a mid-war save cannot keep '
        + 'running the old corps-role overlay. Drains every unacknowledged army_directive_pushback '
        + 'officer event: they had no handler, no UI could acknowledge them, and the sim briefing '
        + 'counted them as pending forever. Other officer events are untouched. Drops the army '
        + 'staff\'s directive-reading traces from army_co_decision_traces (the pushback panel '
        + 'shows each faction\'s LAST trace with no age limit, so an old save would show a '
        + 'stale objection forever); AUTONOMOUS_LAUNCH_PROPOSAL traces are kept. Sensitive: no.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil) return;
        delete mil.political_directives_by_faction;
        mil.army_corps_directives_by_faction = {};
        const traces = asRecord(mil.army_co_decision_traces);
        if (traces) {
            for (const faction of sortedKeys(traces)) {
                const rows = traces[faction];
                if (!Array.isArray(rows)) continue;
                const kept = rows.filter((row: unknown) => asRecord(row)?.campaign_role === 'AUTONOMOUS_LAUNCH_PROPOSAL');
                if (kept.length > 0) traces[faction] = kept;
                else delete traces[faction];
            }
        }
        if (Array.isArray(mil.pending_officer_events)) {
            mil.pending_officer_events = mil.pending_officer_events.filter((event: unknown) => {
                const e = asRecord(event);
                return !(e && e.type === 'army_directive_pushback' && e.acknowledged !== true);
            });
        }
    },
});

registerMigration({
    version: 40,
    description: 'The September 1991 peace start is retired (campaign structure decision 2026-03-23; '
        + 'scenario, runner path and scenario fields removed 2026-11-16). Deletes '
        + 'meta.peace_war_start_control_path: only the peace start ever set it (an ABSOLUTE '
        + 'filesystem path, which made the hash depend on the checkout location), and only the '
        + 'peace-to-war transition read it. Every war-start save holds null. Sensitive: no.',
    migrate: (state) => {
        const meta = asRecord(state.meta);
        if (meta) delete meta.peace_war_start_control_path;
    },
});

/** §6 E2: strip retired `negotiation_capital` effects from one pending response option.
 *  Self-contained so the migration can be renumbered without touching anything else. */
function stripRetiredNegotiationCapitalEffects(option: Record<string, any>): void {
    if (Array.isArray(option.effects)) {
        option.effects = option.effects.filter((effect: unknown) => asRecord(effect)?.kind !== 'negotiation_capital');
    }
    if (asRecord(option.effect)?.kind === 'negotiation_capital') {
        delete option.effect;
    }
}

// v41 runs after v40 (the September 1991 peace start retirement, #773).
registerMigration({
    version: 41,
    description: 'Section 6 E2: the negotiation_capital event effect kind is retired (every catalog '
        + 'use was a silent no-op; the loader now rejects the kind and the effect applier throws on '
        + 'an unknown kind). Strips negotiation_capital entries from '
        + 'military.pending_event_decisions[].response_options[].effects (and a singular .effect), '
        + 'so a save holding an unanswered decision can still be answered. Accepted and recorded: '
        + 'a decision pending at upgrade loses the strategic-dimension shift its catalog row now '
        + 'carries instead, because pending options are stored snapshots. Idempotent; no change '
        + 'on a state without such entries. Sensitive: yes (atrocity-card cost accounting).',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil || !Array.isArray(mil.pending_event_decisions)) return;
        for (const decision of mil.pending_event_decisions) {
            const d = asRecord(decision);
            if (!d || !Array.isArray(d.response_options)) continue;
            for (const option of d.response_options) {
                const o = asRecord(option);
                if (o) stripRetiredNegotiationCapitalEffects(o);
            }
        }
    },
});

/** §6 E4 static lists, by `${event_id}#${option_id}`. Embedded here on purpose: the
 *  migration never loads the event catalog. Every flip in the ruling is expressed as
 *  an absolute SET value, so there is no separate FLIP list. */
export const S6_E4_PATRON_SUPPORT_DROP: ReadonlySet<string> = new Set([
    // Round 3 (Q2): authored in the pressure convention; no recorded patron change.
    'abdic_apwb_declared_1993#federation_offer',
    'address_to_nation_hrhb#address_conciliation_hrhb',
    'address_to_nation_rs#address_defiance_rs',
    'address_to_nation_rs#address_reassure_patron_rs',
    'bihac_5th_corps_offensive_1994#seek_negotiation',
    'concentration_camps_revealed_1992#cooperate',
    'hrhb_camp_exposure_response_1993#cooperate',
    'hrhb_federation_army_integration_1994#refuse_integration',
    'hv_hvo_cooperation_1995#arbih_coordination',
    'london_conference_1992#accept_principles',
    'owen_stoltenberg_plan_1993#accept',
    'rbih_contact_group_response_1994#accept_51_49_plan',
    // Round 3 (Q3/R4-4): Belgrade's break has one carrier (CONTACT_GROUP_REJECTION), and
    // the RBiH reject is carried by contact_group_plan_1994#reject; both cards drop theirs.
    'rbih_contact_group_response_1994#reject_51_49_plan',
    'rs_contact_group_response_1994#reject_51_49_plan',
    'srebrenica_demilitarization_1993#comply_fully',
    'srebrenica_demilitarization_1993#refuse',
    'strategic_posture_review_rbih#seek_negotiation',
    'strategic_posture_review_rs#accept_partition_framework',
    'strategic_posture_review_rs#negotiate_strength',
    'un_hostage_crisis_1995#release_gradually',
    'vance_owen_plan_1993#accept',
    'visit_to_front_hrhb#visit_mostar_front',
    'visit_to_front_hrhb#visit_press_hrhb',
    'visit_to_front_rs#visit_drina_front',
    'visit_to_front_rs#visit_press_rs',
    'visit_to_front_rs#visit_sarajevo_lines',
    // P-B panel (historian, game designer, operations/engine; 3/3, two rounds, 2026-11-18):
    // pressure-convention leftovers on the front-visit card; no recorded patron change.
    'visit_to_front_hrhb#stay_mostar_hrhb',
    'visit_to_front_rbih#stay_capital_rbih',
    'visit_to_front_rbih#visit_press_rbih',
    'visit_to_front_rbih#visit_sarajevo',
    'visit_to_front_rs#stay_pale_rs',
]);
export const S6_E4_PATRON_SUPPORT_SET: Readonly<Record<string, number>> = {
    'belgrade_embargo_rs_1994#defiant': -10,
    'concentration_camps_revealed_1992#deny': -10,
    'concentration_camps_revealed_1992#obstruct': -5,
    'contact_group_plan_1994#accept': 10,
    'hrhb_camp_exposure_response_1993#deny': -10,
    'hrhb_camp_exposure_response_1993#obstruct': -5,
    'rbih_federation_army_integration_1994#refuse_integration': -10,
    'rbih_minority_retention_1992#mandatory_purge': -20,
    'rbih_nato_ultimatum_compliance_1994#rbih_defy_hwez_regime': -10,
    'rs_assembly_rejects_voplan_1993#override_assembly': 5,
    'un_hostage_crisis_1995#maintain_hostages': -10,
    'us_halts_federation_advance_1995#push_further': -15,
    // Interim carriers until E3a2 routes these peace-plan cards into the plan resolution
    // (today only the Vance-Owen and Owen-Stoltenberg Presidency/Assembly cards reach
    // resolvePeacePlan): the authored magnitude with the sign corrected to SUPPORT.
    // E3a2 strips them when it routes the cards. (The two contact-group reject_51_49_plan
    // rows moved to DROP in round 3; contact_group_plan_1994#reject is the RBiH carrier.)
    'contact_group_plan_1994#reject': -10,
    'rs_assembly_rejects_voplan_1993#accept_rejection': -10,
    'rs_contact_group_response_1994#negotiate_amendments': -5,
    'rs_owen_stoltenberg_response_1993#reject_plan': -20,
};
/**
 * One carrier per patron change (§6 E4 Q1): the option-scope patron_confidence shifts the
 * ruling strips, keyed by option and the faction whose shift goes. The HRHB camp options
 * (E4 round 1), the 16 option scopes that keep patron_support and lose their twin (round 3
 * Q1/Q2), and the two contact-group reject cards (round 3 Q3/R4-4, −15 RS and −25 RBiH).
 * Card-level scopes need nothing: a pending decision stores only its response options.
 */
export const S6_E4_PATRON_CONFIDENCE_SHIFT_DROP: Readonly<Record<string, string>> = {
    'belgrade_embargo_rs_1994#defiant': 'RS',
    'concentration_camps_revealed_1992#deny': 'RS',
    'concentration_camps_revealed_1992#obstruct': 'RS',
    'csq_patron_recovery_offer#accept_recovery': 'RS',
    'csq_separate_peace_overture#press_bilateral': 'RBiH',
    'hrhb_camp_exposure_response_1993#cooperate': 'HRHB',
    'hrhb_camp_exposure_response_1993#deny': 'HRHB',
    'hrhb_herceg_bosna_consolidation_1992#minimal_entity': 'HRHB',
    'hrhb_posavina_orasje_posture_1992#counterattack_brod': 'HRHB',
    'hrhb_zagreb_supply_channel_1992#assert_autonomy': 'HRHB',
    'hrhb_zagreb_supply_channel_1992#diversify_supply': 'HRHB',
    'rbih_contact_group_response_1994#reject_51_49_plan': 'RBiH',
    'rbih_federation_army_integration_1994#refuse_integration': 'RBiH',
    'rs_assembly_rejects_voplan_1993#accept_rejection': 'RS',
    'rs_assembly_rejects_voplan_1993#override_assembly': 'RS',
    'rs_contact_group_response_1994#accept_51_49_plan': 'RS',
    'rs_contact_group_response_1994#negotiate_amendments': 'RS',
    'rs_contact_group_response_1994#reject_51_49_plan': 'RS',
    'strategic_posture_review_hrhb#sue_for_peace_hrhb': 'HRHB',
    'un_hostage_crisis_1995#maintain_hostages': 'RS',
};

/** §6 E4: transform one stored effect that still has the old kind. Returns false to drop it. */
function migrateLegacyPatronEffect(effect: Record<string, any>, key: string): boolean {
    if (S6_E4_PATRON_SUPPORT_DROP.has(key)) return false;
    effect.kind = 'patron_support';
    const setValue = S6_E4_PATRON_SUPPORT_SET[key];
    if (setValue !== undefined) effect.delta = setValue;
    return true;
}

const LEGACY_PATRON_REF = /^patron_pressure(\.|$)/;
const ANY_PATRON_SUPPORT_REF = /^patron_(pressure|support)(\.|$)/;

/**
 * §6 E4 round 3: the stored `future_consequences[].material_effect_refs` follow the effects.
 * A ref to a dropped patron effect goes; a ref to a kept one is renamed; a ref to a stripped
 * patron_confidence shift (`dimension_shift.<faction>.patron_confidence`) goes.
 */
function migratePatronMaterialRefs(option: Record<string, any>, key: string): void {
    if (!Array.isArray(option.future_consequences)) return;
    const dropped = S6_E4_PATRON_SUPPORT_DROP.has(key);
    const shiftFaction = S6_E4_PATRON_CONFIDENCE_SHIFT_DROP[key];
    for (const consequence of option.future_consequences) {
        const fc = asRecord(consequence);
        if (!fc || !Array.isArray(fc.material_effect_refs)) continue;
        fc.material_effect_refs = fc.material_effect_refs
            .filter((ref: unknown) => !(typeof ref === 'string' && (
                (dropped && ANY_PATRON_SUPPORT_REF.test(ref))
                || (shiftFaction !== undefined && ref === `dimension_shift.${shiftFaction}.patron_confidence`)
            )))
            .map((ref: unknown) => (typeof ref === 'string' && LEGACY_PATRON_REF.test(ref)
                ? ref.replace(/^patron_pressure/, 'patron_support')
                : ref));
    }
}

/** §6 E4: migrate one pending response option. Self-contained so it can be renumbered. */
function migratePendingOptionToPatronSupport(option: Record<string, any>, key: string): void {
    if (Array.isArray(option.effects)) {
        option.effects = option.effects.filter((effect: unknown) => {
            const e = asRecord(effect);
            if (!e || e.kind !== 'patron_pressure') return true;
            return migrateLegacyPatronEffect(e, key);
        });
    }
    const single = asRecord(option.effect);
    if (single && single.kind === 'patron_pressure' && !migrateLegacyPatronEffect(single, key)) {
        delete option.effect;
    }
    const shiftFaction = S6_E4_PATRON_CONFIDENCE_SHIFT_DROP[key];
    if (shiftFaction !== undefined && Array.isArray(option.dimension_shifts)) {
        option.dimension_shifts = option.dimension_shifts.filter((shift: unknown) => {
            const s = asRecord(shift);
            return !(s && s.dimension === 'patron_confidence' && s.faction === shiftFaction);
        });
    }
    migratePatronMaterialRefs(option, key);
}

registerMigration({
    version: 42,
    description: 'Section 6 E4: the patron_pressure event effect kind is renamed patron_support, with one '
        + 'sign (positive = the patron\'s backing rises); pressure toward peace is the per-turn patron '
        + 'override. In military.pending_event_decisions[].response_options[], only effects whose kind is '
        + 'still patron_pressure are transformed: renamed, then the static DROP and SET lists apply by '
        + '(event_id, option_id), SET as absolute values (the lists are disjoint). Round 3 (one carrier per '
        + 'patron change): the faction-keyed shift-drop list strips the option-scope patron_confidence '
        + 'shifts the ruling removed (the camp options, the options that keep patron_support, and the two '
        + 'contact-group reject cards); material_effect_refs of dropped effects go and patron_pressure refs '
        + 'are renamed. Never loads the catalog; idempotent. Known limits: a mid-war save keeps the support '
        + 'it already accumulated, and a pending decision keeps its old copy. Sensitive: yes (atrocity and '
        + 'condemnation cards).',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil || !Array.isArray(mil.pending_event_decisions)) return;
        for (const decision of mil.pending_event_decisions) {
            const d = asRecord(decision);
            if (!d || !Array.isArray(d.response_options)) continue;
            for (const option of d.response_options) {
                const o = asRecord(option);
                if (o) migratePendingOptionToPatronSupport(o, `${String(d.event_id)}#${String(o.id)}`);
            }
        }
    },
});

/** §6 E3a2 (v43) static lists, by `${event_id}#${option_id}`. Embedded on purpose: the
 *  migration never loads the event catalog (the v42 precedent). Kept equal to the catalog by
 *  tests/s6_e3a2_save_v43.test.ts. */
type S6E3a2PlanAnswer = {
    plan_id: string;
    response: 'accepted' | 'rejected';
    accepted_if?: { type: 'peace_plan_response'; plan_id: string; faction: FactionId; response: 'accepted' | 'rejected' };
};
const e3a2Answer = (plan_id: string, response: 'accepted' | 'rejected'): S6E3a2PlanAnswer => ({ plan_id, response });
export const S6_E3A2_PLAN_ANSWERS: Readonly<Record<string, S6E3a2PlanAnswer | null>> = {
    // contact_group_plan_1994 is a no-choice presentation card since E3a2 (ruling item 4): a
    // pending snapshot keeps its two options, which now write nothing and cost nothing.
    'contact_group_plan_1994#accept': null,
    'contact_group_plan_1994#reject': null,
    'hrhb_contact_group_response_1994#accept_51_49_plan': e3a2Answer('contact_group', 'accepted'),
    'hrhb_contact_group_response_1994#accept_with_amendments': e3a2Answer('contact_group', 'rejected'),
    'hrhb_contact_group_response_1994#reject_51_49_plan': e3a2Answer('contact_group', 'rejected'),
    'hrhb_owen_stoltenberg_response_1993#accept_union_three_republics': e3a2Answer('owen_stoltenberg', 'accepted'),
    'hrhb_owen_stoltenberg_response_1993#accept_with_modifications': e3a2Answer('owen_stoltenberg', 'rejected'),
    'hrhb_owen_stoltenberg_response_1993#reject_plan': e3a2Answer('owen_stoltenberg', 'rejected'),
    'hrhb_vance_owen_acceptance_1993#accept_vance_owen_plan': e3a2Answer('vance_owen', 'accepted'),
    'hrhb_vance_owen_acceptance_1993#accept_with_modifications': e3a2Answer('vance_owen', 'rejected'),
    'hrhb_vance_owen_acceptance_1993#condition_on_arbih_reciprocity': {
        plan_id: 'vance_owen',
        response: 'rejected',
        accepted_if: { type: 'peace_plan_response', plan_id: 'vance_owen', faction: 'RBiH', response: 'accepted' },
    },
    'hrhb_vance_owen_acceptance_1993#reject_plan': e3a2Answer('vance_owen', 'rejected'),
    'os_rbih_tactical_acceptance_1993#accept_for_optics': e3a2Answer('owen_stoltenberg', 'accepted'),
    'os_rbih_tactical_acceptance_1993#reject_via_assembly': e3a2Answer('owen_stoltenberg', 'rejected'),
    'owen_stoltenberg_plan_1993#accept': null,
    'owen_stoltenberg_plan_1993#reject': e3a2Answer('owen_stoltenberg', 'rejected'),
    'rbih_contact_group_response_1994#accept_51_49_plan': e3a2Answer('contact_group', 'accepted'),
    'rbih_contact_group_response_1994#accept_with_public_reservations': e3a2Answer('contact_group', 'rejected'),
    'rbih_contact_group_response_1994#reject_51_49_plan': e3a2Answer('contact_group', 'rejected'),
    'rs_assembly_rejects_voplan_1993#accept_rejection': e3a2Answer('vance_owen', 'rejected'),
    'rs_assembly_rejects_voplan_1993#override_assembly': e3a2Answer('vance_owen', 'accepted'),
    'rs_contact_group_response_1994#accept_51_49_plan': e3a2Answer('contact_group', 'accepted'),
    'rs_contact_group_response_1994#negotiate_amendments': e3a2Answer('contact_group', 'rejected'),
    'rs_contact_group_response_1994#reject_51_49_plan': e3a2Answer('contact_group', 'rejected'),
    'rs_owen_stoltenberg_response_1993#accept_union_three_republics': e3a2Answer('owen_stoltenberg', 'accepted'),
    'rs_owen_stoltenberg_response_1993#accept_with_modifications': e3a2Answer('owen_stoltenberg', 'rejected'),
    'rs_owen_stoltenberg_response_1993#reject_plan': e3a2Answer('owen_stoltenberg', 'rejected'),
    'vance_owen_plan_1993#accept': e3a2Answer('vance_owen', 'accepted'),
    'vance_owen_plan_1993#reject': e3a2Answer('vance_owen', 'rejected'),
};
/** Options whose `international_standing` shifts the E3a2 strip removed (the record is the one carrier). */
export const S6_E3A2_STRIP_STANDING: ReadonlySet<string> = new Set([
    'hrhb_contact_group_response_1994#accept_51_49_plan',
    'hrhb_contact_group_response_1994#accept_with_amendments',
    'hrhb_contact_group_response_1994#reject_51_49_plan',
    'hrhb_owen_stoltenberg_response_1993#accept_union_three_republics',
    'hrhb_owen_stoltenberg_response_1993#reject_plan',
    'hrhb_vance_owen_acceptance_1993#accept_vance_owen_plan',
    'hrhb_vance_owen_acceptance_1993#reject_plan',
    'os_rbih_tactical_acceptance_1993#accept_for_optics',
    'os_rbih_tactical_acceptance_1993#reject_via_assembly',
    'rbih_contact_group_response_1994#accept_51_49_plan',
    'rbih_contact_group_response_1994#accept_with_public_reservations',
    'rbih_contact_group_response_1994#reject_51_49_plan',
    'rs_assembly_rejects_voplan_1993#accept_rejection',
    'rs_assembly_rejects_voplan_1993#override_assembly',
    'rs_contact_group_response_1994#accept_51_49_plan',
    'rs_contact_group_response_1994#reject_51_49_plan',
    'rs_owen_stoltenberg_response_1993#accept_union_three_republics',
    'rs_owen_stoltenberg_response_1993#reject_plan',
]);
/** Options whose own patron effects (patron_support, patron_confidence shifts) the E3a2 strip removed
 *  (ruling item 6: one patron carrier per routed answer). Includes the four E4 interim carriers
 *  that v42 SETs, and contact_group_plan_1994's two (its +10 moved to Sarajevo's Assembly card). */
export const S6_E3A2_STRIP_PATRON: ReadonlySet<string> = new Set([
    'contact_group_plan_1994#accept',
    'contact_group_plan_1994#reject',
    'hrhb_contact_group_response_1994#accept_with_amendments',
    'hrhb_contact_group_response_1994#reject_51_49_plan',
    'hrhb_owen_stoltenberg_response_1993#accept_with_modifications',
    'hrhb_owen_stoltenberg_response_1993#reject_plan',
    'hrhb_vance_owen_acceptance_1993#accept_with_modifications',
    'hrhb_vance_owen_acceptance_1993#condition_on_arbih_reciprocity',
    'hrhb_vance_owen_acceptance_1993#reject_plan',
    'rs_assembly_rejects_voplan_1993#accept_rejection',
    'rs_contact_group_response_1994#negotiate_amendments',
    'rs_owen_stoltenberg_response_1993#accept_with_modifications',
    'rs_owen_stoltenberg_response_1993#reject_plan',
]);
/** The contact-group +10 (E4), moved to Sarajevo's Assembly card at the same size (ruling item 4). */
export const S6_E3A2_ADD_SUPPORT: Readonly<Record<string, { faction: FactionId; delta: number }>> = {
    'rbih_contact_group_response_1994#accept_51_49_plan': { faction: 'RBiH', delta: 10 },
};

const E3A2_PATRON_REF = /^patron_(pressure|support)(\.|$)/;
const E3A2_STANDING_REF = /^dimension_shift\.[A-Za-z]+\.international_standing$/;
const E3A2_CONFIDENCE_REF = /^dimension_shift\.[A-Za-z]+\.patron_confidence$/;

/** §6 E3a2: migrate one pending response option. Self-contained so it can be renumbered. */
function migratePendingOptionToPlanAnswer(option: Record<string, any>, key: string): void {
    if (!Object.prototype.hasOwnProperty.call(S6_E3A2_PLAN_ANSWERS, key)) return;
    const answer = S6_E3A2_PLAN_ANSWERS[key];
    option.plan_answer = answer === null ? null : JSON.parse(JSON.stringify(answer));
    const stripStanding = S6_E3A2_STRIP_STANDING.has(key);
    const stripPatron = S6_E3A2_STRIP_PATRON.has(key);
    if (Array.isArray(option.dimension_shifts)) {
        option.dimension_shifts = option.dimension_shifts.filter((shift: unknown) => {
            const s = asRecord(shift);
            if (!s) return true;
            if (stripStanding && s.dimension === 'international_standing') return false;
            if (stripPatron && s.dimension === 'patron_confidence') return false;
            return true;
        });
        if (option.dimension_shifts.length === 0) delete option.dimension_shifts;
    }
    if (stripPatron) {
        if (Array.isArray(option.effects)) {
            option.effects = option.effects.filter((effect: unknown) => {
                const kind = asRecord(effect)?.kind;
                return kind !== 'patron_support' && kind !== 'patron_pressure';
            });
        }
        const single = asRecord(option.effect);
        if (single && (single.kind === 'patron_support' || single.kind === 'patron_pressure')) delete option.effect;
    }
    const add = S6_E3A2_ADD_SUPPORT[key];
    if (add) {
        const effects = Array.isArray(option.effects) ? option.effects : (option.effects = []);
        const present = effects.some((effect: unknown) => {
            const e = asRecord(effect);
            return e?.kind === 'patron_support' && e.faction === add.faction && e.delta === add.delta;
        });
        if (!present) effects.push({ kind: 'patron_support', faction: add.faction, delta: add.delta });
    }
    if ((stripStanding || stripPatron) && Array.isArray(option.future_consequences)) {
        for (const consequence of option.future_consequences) {
            const fc = asRecord(consequence);
            if (!fc || !Array.isArray(fc.material_effect_refs)) continue;
            fc.material_effect_refs = fc.material_effect_refs.filter((ref: unknown) => !(typeof ref === 'string' && (
                (stripStanding && E3A2_STANDING_REF.test(ref))
                || (stripPatron && (E3A2_PATRON_REF.test(ref) || E3A2_CONFIDENCE_REF.test(ref)))
            )));
        }
    }
}

registerMigration({
    version: 43,
    description: 'Section 6 E3a2: the peace-plan chain. Each routed card option now declares plan_answer '
        + '(the side\'s answer, or null for no write) and evaluate-peace-plans reads the answer from '
        + 'event_decision_log. In military.pending_event_decisions[].response_options[], by static '
        + '(event_id, option_id) lists run after v42: plan_answer is added; the routed options\' own '
        + 'international_standing shifts are stripped (the plan record carries the standing); the '
        + 'patron effects of options that can be recorded rejected are stripped (the plan\'s -5 at '
        + 'resolution is the one carrier), including the four E4 interim carriers v42 sets and both '
        + 'options of contact_group_plan_1994 (now a no-choice presentation card, so a pending '
        + 'snapshot of it writes nothing); its +10 is added to a pending '
        + 'rbih_contact_group_response_1994#accept_51_49_plan; material_effect_refs follow. Never loads '
        + 'the catalog; idempotent. peace_plan_history and pending_peace_plan are not rewritten: a '
        + 'plan already resolved keeps its row (a later card for it writes nothing and costs nothing) '
        + 'and a pending plan stays the fallback pointer, answered by the modal or by the player\'s '
        + 'routed answer. Known limits: a mid-war save keeps the standing modifier its earlier '
        + 'plan rejections and card shifts already wrote, and a pending decision keeps its old copy. '
        + 'Sensitive: no (peace-plan cards; no atrocity or condemnation row).',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil || !Array.isArray(mil.pending_event_decisions)) return;
        for (const decision of mil.pending_event_decisions) {
            const d = asRecord(decision);
            if (!d || !Array.isArray(d.response_options)) continue;
            for (const option of d.response_options) {
                const o = asRecord(option);
                if (o) migratePendingOptionToPlanAnswer(o, `${String(d.event_id)}#${String(o.id)}`);
            }
        }
    },
});

/** A patron supply cut as the catalog carries it (patron-defiance panel, 2026-11-17). */
interface PatronSupplyCutSpec {
    faction: 'RS' | 'HRHB';
    multiplier: number;
    duration_turns: number;
    /** The old carrier this answer had before the panel, rewritten in place (exact numbers). */
    replaces?: { kind: 'equipment_quality_modifier' | 'recruitment_modifier'; value: number; duration_turns: number };
}

/** Patron-defiance panel static list, by `${event_id}#${option_id}`. Embedded on purpose:
 *  the migration never loads the event catalog. Mirrors the ruling's table. */
export const PATRON_SUPPLY_CUT_PENDING: Readonly<Record<string, PatronSupplyCutSpec>> = {
    'belgrade_embargo_rs_1994#defiant': {
        faction: 'RS', multiplier: 0.93, duration_turns: 26,
        replaces: { kind: 'recruitment_modifier', value: 0.9, duration_turns: 52 },
    },
    'hrhb_1992_graz_cooperation_collapse#formal_alliance_persists': {
        faction: 'HRHB', multiplier: 0.9, duration_turns: 26,
        replaces: { kind: 'equipment_quality_modifier', value: 0.9, duration_turns: 26 },
    },
    'hrhb_political_goal#united_front': {
        faction: 'HRHB', multiplier: 0.85, duration_turns: 52,
        replaces: { kind: 'equipment_quality_modifier', value: 0.85, duration_turns: 52 },
    },
    'hrhb_zagreb_supply_channel_1992#assert_autonomy': { faction: 'HRHB', multiplier: 0.9, duration_turns: 26 },
    'hrhb_zagreb_supply_channel_1992#diversify_supply': { faction: 'HRHB', multiplier: 0.97, duration_turns: 13 },
    'milosevic_drina_warning#resist_patron': { faction: 'RS', multiplier: 0.95, duration_turns: 13 },
    'milosevic_isolation_warning_aug92#resist_patron': { faction: 'RS', multiplier: 0.97, duration_turns: 13 },
    'milosevic_owen_stoltenberg_distancing#resist_patron': { faction: 'RS', multiplier: 0.97, duration_turns: 13 },
    'milosevic_vopp_pressure#resist_patron': { faction: 'RS', multiplier: 0.95, duration_turns: 13 },
    'rs_belgrade_pressure_response_1993#defy_belgrade_directive': { faction: 'RS', multiplier: 0.95, duration_turns: 13 },
    'rs_belgrade_pressure_response_1993#partial_compliance': { faction: 'RS', multiplier: 0.98, duration_turns: 13 },
    'zagreb_orders_hrhb_ceasefire#resist_patron': { faction: 'HRHB', multiplier: 0.85, duration_turns: 52 },
    'zagreb_restrains_boban_vopp#resist_patron': { faction: 'HRHB', multiplier: 0.95, duration_turns: 13 },
};

/** Patron-defiance panel: give one pending response option its patron supply cut. Self-contained
 *  so it can be renumbered. Idempotent: an option that already carries the cut is left alone. */
function migratePendingOptionToPatronSupplyCut(option: Record<string, any>, key: string): void {
    const spec = PATRON_SUPPLY_CUT_PENDING[key];
    if (!spec) return;
    const effects: unknown[] = Array.isArray(option.effects) ? option.effects : [];
    if (effects.some((effect) => asRecord(effect)?.kind === 'patron_supply_cut')) return;
    const cut = {
        kind: 'patron_supply_cut',
        faction: spec.faction,
        multiplier: spec.multiplier,
        duration_turns: spec.duration_turns,
        tag: key,
    };
    let kept = effects;
    let renamedRefKind: string | null = null;
    if (spec.replaces) {
        const old = spec.replaces;
        const numberField = old.kind === 'recruitment_modifier' ? 'pool_multiplier' : 'multiplier';
        kept = effects.filter((effect) => {
            const e = asRecord(effect);
            return !(e && e.kind === old.kind && e.faction === spec.faction
                && e[numberField] === old.value && e.duration_turns === old.duration_turns);
        });
        if (kept.length !== effects.length) renamedRefKind = old.kind;
    }
    option.effects = [...kept, cut];
    if (!Array.isArray(option.future_consequences)) return;
    for (const consequence of option.future_consequences) {
        const fc = asRecord(consequence);
        if (!fc || !Array.isArray(fc.material_effect_refs)) continue;
        if (renamedRefKind) {
            fc.material_effect_refs = fc.material_effect_refs.map((ref: unknown) => (
                typeof ref === 'string' && (ref === renamedRefKind || ref.startsWith(`${renamedRefKind}.`))
                    ? ref.replace(renamedRefKind, 'patron_supply_cut')
                    : ref
            ));
        }
    }
}

registerMigration({
    version: 44,
    description: 'Patron-defiance panel (2026-11-17): defying a patron carries one live material cost, the '
        + 'patron_supply_cut event effect (combat power for N weeks, floored per patron in the combat reader; '
        + 'Systems Manual §7.10.3). In military.pending_event_decisions[].response_options[] the static list '
        + 'gives each defiance answer its cut; united_front and formal_alliance_persists have their '
        + 'equipment_quality_modifier, and belgrade_embargo_rs_1994#defiant its recruitment_modifier, rewritten '
        + 'only when the stored numbers match the old carrier exactly. The per-turn receipts of the retired '
        + 'pc-based defiance term (patron_defiance_supply_cuts entries without a tag) are dropped: they recorded a '
        + 'cut that never reached combat. Never loads the catalog; idempotent. Known limit, recorded: '
        + 'equipment-quality entries a mid-war save already applied carry no source, so they stay unfloored and '
        + 'have no receipt; they expire within 52 weeks. Runs after v43 (§6 E3a2); its static list shares '
        + 'no (event_id, option_id) key with the v43 lists, and v43 strips no patron_supply_cut.',
    migrate: (state) => {
        const mil = asRecord(state.military);
        if (!mil) return;
        if (Array.isArray(mil.pending_event_decisions)) {
            for (const decision of mil.pending_event_decisions) {
                const d = asRecord(decision);
                if (!d || !Array.isArray(d.response_options)) continue;
                for (const option of d.response_options) {
                    const o = asRecord(option);
                    if (o) migratePendingOptionToPatronSupplyCut(o, `${String(d.event_id)}#${String(o.id)}`);
                }
            }
        }
        if (Array.isArray(mil.patron_defiance_supply_cuts)) {
            const tagged = mil.patron_defiance_supply_cuts.filter((cut: unknown) => {
                const c = asRecord(cut);
                return c != null && typeof c.tag === 'string' && c.tag.length > 0;
            });
            if (tagged.length > 0) mil.patron_defiance_supply_cuts = tagged;
            else delete mil.patron_defiance_supply_cuts;
        }
    },
});

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
import { canonicalizePoliticalSideId, defaultArmyLabelForSide, POLITICAL_SIDES, type ArmyLabel, type PoliticalSideId } from './identity.js';

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
        if (typeof form.faction === 'string') {
            const oldFaction = form.faction;
            const canonicalFaction = canonicalizePoliticalSideId(oldFaction);
            form.faction = canonicalFaction;
            if ((oldFaction === 'ARBiH' || oldFaction === 'VRS' || oldFaction === 'HVO') && !form.force_label) {
                form.force_label = oldFaction as ArmyLabel;
            }
            if (POLITICAL_SIDES.includes(canonicalFaction as PoliticalSideId) && !form.force_label) {
                form.force_label = defaultArmyLabelForSide(canonicalFaction as PoliticalSideId);
            }
        }
        if (!form.ops || typeof form.ops !== 'object' || Array.isArray(form.ops)) {
            form.ops = { fatigue: 0, last_supplied_turn: null };
        } else {
            if (!Number.isInteger(form.ops.fatigue) || form.ops.fatigue < 0) form.ops.fatigue = 0;
            if (form.ops.last_supplied_turn !== null && (!Number.isInteger(form.ops.last_supplied_turn) || form.ops.last_supplied_turn > turn)) {
                form.ops.last_supplied_turn = null;
            }
        }
        if (form.kind === undefined) form.kind = 'brigade';
        if (form.readiness === undefined) form.readiness = 'active';
        if (form.cohesion === undefined) form.cohesion = 60;
        if (form.morale === undefined || form.morale === null) form.morale = 60;
        form.morale = Math.max(0, Math.min(100, form.morale));
        if (form.activation_gated === undefined) form.activation_gated = false;
        if (form.activation_turn === undefined) form.activation_turn = null;
    }
}

function defaultMilitiaPools(state: GameState): void {
    const pools = asRecord(state.military?.militia_pools);
    if (!pools) return;
    for (const key of sortedKeys(pools)) {
        const pool = pools[key];
        if (!pool || typeof pool !== 'object' || Array.isArray(pool)) continue;
        if (pool.faction !== null && typeof pool.faction === 'string') {
            pool.faction = canonicalizePoliticalSideId(pool.faction);
        }
        if (!Number.isInteger(pool.fatigue) || pool.fatigue < 0) pool.fatigue = 0;
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
        if (!s.paramilitary_policy || typeof s.paramilitary_policy !== 'object' || Array.isArray(s.paramilitary_policy)) {
            s.paramilitary_policy = {};
        }
        if (!Number.isInteger(s.paramilitary_deployment_count) || s.paramilitary_deployment_count < 0) {
            s.paramilitary_deployment_count = 0;
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

/**
 * Robustness audit P2-A (task #95,
 * docs/40_reports/proposals/20260609_1.0_ROBUSTNESS_LANDMINE_AUDIT.md):
 * #360-class regression guard.
 *
 * The validator hard-requires every VERSION_REQUIRED_FIELD when
 * schema_version >= the introducing version. For sub-version saves this is
 * satisfied by applyMigrations backfilling — but a SAME-version state (a save
 * written at CURRENT_SCHEMA_VERSION whose lazily-initialized field never got
 * seeded) skips those migrations entirely. That is exactly the v36
 * `displacement_flows_by_osid` load-break that #360 patched via
 * `optionalWhenAbsent: true` + load-side seeding in canonicalizeCurrentFields.
 *
 * Convention enforced here (the audit's fix sketch): any new
 * VERSION_REQUIRED_FIELD for a lazily-initialized/optional read-model MUST
 * either (a) be seeded on every load in canonicalizeCurrentFields AND marked
 * `optionalWhenAbsent: true`, or (b) be written by the canonical new-game birth
 * path. If neither holds, this test goes red BEFORE merge — it would have
 * caught #360.
 *
 * NOTE: the asserted surface is the CANONICAL birth state
 * (createInitialGameState → canonicalizeStartupState), not the raw factory
 * return. The raw factory output is an internal intermediate — every
 * production path (desktop_sim.ts:148, scenario_runner.ts createStateFromScenario)
 * canonicalizes through serializeState/deserializeState before the state is
 * played or saved, and the raw intermediate is missing ~30 pre-#95 required
 * fields by design (they are backfilled by the migrate-from-0 canonicalization).
 */

import { expect, test } from 'vitest';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { canonicalizeStartupState, createInitialGameState } from '../src/scenario/scenario_runner.js';

test('canonical new-game birth state passes same-version shape validation (P2-A / #360 guard)', { timeout: 120000 }, async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    const raw = await createInitialGameState('p2a-factory-shape');
    expect(raw.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    // player_faction is set by the scenario/desktop wrappers around the factory
    // (headless contract); set it here the same way before canonicalization.
    (raw.meta as { player_faction?: string }).player_faction = 'RBiH';

    const canonical = canonicalizeStartupState(raw).state;

    // (1) The canonical birth state must satisfy the same-version load contract.
    const direct = validateGameStateShape(canonical, { requireVersion: CURRENT_SCHEMA_VERSION });
    expect(direct.ok, direct.ok ? '' : `canonical birth state fails same-version shape validation:\n${(direct as { errors: string[] }).errors.join('\n')}`).toBe(true);

    // (2) The same-version SAVE shape: serialize via the central serializer (no
    // migrations involved), parse it back, and validate the parsed object as a
    // loader sees it BEFORE any sub-version migration runs (same-version saves
    // get NO migration backfill — the #360 break shape). A future
    // VERSION_REQUIRED_FIELD that is neither birth-path-written nor
    // optionalWhenAbsent(+load-seeded) turns this red.
    const parsed = JSON.parse(serializeGameState(canonical)) as unknown;
    const roundTrip = validateGameStateShape(parsed, { requireVersion: CURRENT_SCHEMA_VERSION });
    expect(roundTrip.ok, roundTrip.ok ? '' : `same-version save round-trip fails shape validation:\n${(roundTrip as { errors: string[] }).errors.join('\n')}`).toBe(true);
});

test('canonical save round-trip preserves faction paramilitary deployment counts', { timeout: 120000 }, async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) return;

    const raw = await createInitialGameState('paramilitary-count-round-trip');
    raw.meta.player_faction = 'RS';
    raw.paramilitary_deployment_count = { HRHB: 9, RBiH: 7, RS: 44 };
    const canonical = canonicalizeStartupState(raw).state;

    const hydrated = deserializeState(serializeState(canonical));

    expect(hydrated.paramilitary_deployment_count).toEqual({ HRHB: 9, RBiH: 7, RS: 44 });
});

test('same-version saves with the corrupted scalar count reconstruct deployments from formations', { timeout: 120000 }, async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) return;

    const raw = await createInitialGameState('paramilitary-count-recovery');
    raw.meta.player_faction = 'RS';
    const canonical = canonicalizeStartupState(raw).state;
    canonical.paramilitary_deployment_count = 0 as any;
    canonical.military.formations!['opara_rs_t1_0'] = {
        id: 'opara_rs_t1_0',
        faction: 'RS',
        name: 'Recovered RS paramilitary',
        kind: 'paramilitary',
        status: 'inactive',
        personnel: 0,
    } as any;
    canonical.military.formations!['opara_rbih_t1_0'] = {
        id: 'opara_rbih_t1_0',
        faction: 'RBiH',
        name: 'Recovered RBiH paramilitary',
        kind: 'paramilitary',
        status: 'inactive',
        personnel: 0,
    } as any;
    const payload = serializeGameState(canonical);

    const hydrated = deserializeState(payload);

    expect(hydrated.paramilitary_deployment_count).toEqual({ RBiH: 1, RS: 1 });
});

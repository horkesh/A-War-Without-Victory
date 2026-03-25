# Integration Test Plan -- 2026-03-25

Nightshift implementation guide. Each section specifies the exact file to create, imports, setup, and assertions. All tests use **vitest** (`describe`/`it`/`expect` from `'vitest'`). After creating each file, add it to the `include` array in `vitest.config.ts`.

Run the smoke-test triad after all files are created:
```bash
npx tsc --noEmit
npm run test:vitest
npm run desktop:map:build
```

---

## 1. Scenario Round-Trip Tests

**File:** `tests/integration_scenario_roundtrip.test.ts`

These tests run real scenarios headless and verify determinism and state properties.

### Test 1.1: 4w scenario produces valid final state

```ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';

const SCENARIO_4W = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_roundtrip');

async function cleanup() {
    if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
}

describe('scenario round-trip', () => {
    it('4w scenario run produces final_save.json with expected properties', async () => {
        await cleanup();
        const result = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_DIR });

        const finalJson = await readFile(result.paths.final_save, 'utf8');
        const state = JSON.parse(finalJson);

        // Meta
        expect(state.meta).toBeDefined();
        expect(state.meta.turn).toBe(4);
        expect(state.meta.phase).toBe('war');
        expect(typeof state.meta.seed).toBe('string');

        // Factions
        expect(state.factions).toBeInstanceOf(Array);
        expect(state.factions.length).toBeGreaterThanOrEqual(3);
        const factionIds = state.factions.map((f: any) => f.id);
        expect(factionIds).toContain('RBiH');
        expect(factionIds).toContain('RS');
        expect(factionIds).toContain('HRHB');

        // Political controllers exist
        expect(state.political.political_controllers).toBeDefined();
        expect(Object.keys(state.political.political_controllers).length).toBeGreaterThan(0);

        // Military formations exist
        expect(state.military.formations).toBeDefined();
        expect(Object.keys(state.military.formations).length).toBeGreaterThan(0);

        // Schema version
        expect(state.schema_version).toBeDefined();
        expect(typeof state.schema_version).toBe('number');

        await cleanup();
    }, { timeout: 120_000 });
```

### Test 1.2: Save final state, reload, verify identical

```ts
    it('serialize -> deserialize round-trip preserves state identity', async () => {
        await cleanup();
        const result = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_DIR });
        const finalJson = await readFile(result.paths.final_save, 'utf8');

        // Parse the state
        const state = JSON.parse(finalJson);

        // Re-serialize with the same serializer used by scenario runner
        const { serializeGameState } = await import('../src/state/serializeGameState.js');
        const reserialized = serializeGameState(state, 2);

        // Parse both and deep-compare
        const original = JSON.parse(finalJson);
        const roundTripped = JSON.parse(reserialized);

        expect(roundTripped.meta).toEqual(original.meta);
        expect(roundTripped.factions).toEqual(original.factions);
        expect(roundTripped.political.political_controllers)
            .toEqual(original.political.political_controllers);
        expect(Object.keys(roundTripped.military.formations).sort())
            .toEqual(Object.keys(original.military.formations).sort());

        await cleanup();
    }, { timeout: 120_000 });
```

### Test 1.3: Two identical runs produce identical hashes (determinism)

```ts
    it('same scenario run twice yields identical final_save hash', async () => {
        const OUT_A = join(process.cwd(), '.tmp_integration_det_a');
        const OUT_B = join(process.cwd(), '.tmp_integration_det_b');
        if (existsSync(OUT_A)) await rm(OUT_A, { recursive: true });
        if (existsSync(OUT_B)) await rm(OUT_B, { recursive: true });

        const resultA = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_A });
        const resultB = await runScenario({ scenarioPath: SCENARIO_4W, outDirBase: OUT_B });

        expect(resultA.final_state_hash).toBe(resultB.final_state_hash);

        const bytesA = await readFile(resultA.paths.final_save, 'utf8');
        const bytesB = await readFile(resultB.paths.final_save, 'utf8');
        expect(bytesA).toBe(bytesB);

        if (existsSync(OUT_A)) await rm(OUT_A, { recursive: true });
        if (existsSync(OUT_B)) await rm(OUT_B, { recursive: true });
    }, { timeout: 240_000 });
});
```

**Setup notes:**
- Use `noop_4w.json` scenario (fastest, 4 weeks). Path: `data/scenarios/noop_4w.json`.
- All three tests share the same `describe` block.
- Timeouts are long (120s-240s) because `runScenario` loads graph data.
- Clean up temp dirs in each test (not `afterAll`) so partial failures don't leak.
- Guard with `checkDataPrereqs` if you want to skip when data files are missing (see `tests/scenario_harness_smoke_h1_4.test.ts` for pattern).

---

## 2. Event System Tests

**File:** `tests/integration_event_system.test.ts`

### Test 2.1: All events across all 4 files parse without error

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EventDefinition } from '../src/sim/events/event_types.js';

const EVENTS_DIR = resolve(__dirname, '..', 'data', 'scenarios', 'events');
const EVENT_FILES = ['war_1992.json', 'war_1993.json', 'war_1994.json', 'war_1995.json'];

function loadAllEvents(): EventDefinition[] {
    const all: EventDefinition[] = [];
    for (const file of EVENT_FILES) {
        const raw = readFileSync(resolve(EVENTS_DIR, file), 'utf-8');
        const parsed = JSON.parse(raw);
        expect(Array.isArray(parsed), `${file} should parse to an array`).toBe(true);
        all.push(...parsed);
    }
    return all;
}

describe('event system integration', () => {
    const allEvents = loadAllEvents();

    it('loads all event files without error and they are non-empty', () => {
        expect(allEvents.length).toBeGreaterThan(0);
        // Memory says 94 events (75 mechanical, 21 flag-gated) -- verify ballpark
        expect(allEvents.length).toBeGreaterThanOrEqual(90);
    });

    it('every event has required fields: id, trigger, effects', () => {
        for (const ev of allEvents) {
            expect(ev.id, `event missing id`).toBeDefined();
            expect(typeof ev.id).toBe('string');
            expect(ev.trigger, `${ev.id} missing trigger`).toBeDefined();
            // effects may be absent for decision-only events, but trigger must exist
        }
    });

    it('no duplicate event IDs across all files', () => {
        const ids = allEvents.map(e => e.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes).toEqual([]);
    });
```

### Test 2.2: Event conditions evaluate without crashing on a real-shaped GameState

```ts
    it('all event conditions evaluate without throwing on a stub GameState', () => {
        const { evaluateCondition } = require('../src/sim/events/event_types.js');

        // Minimal but real-shaped state
        const state = {
            meta: { turn: 20, phase: 'war', seed: 'test' },
            political: {
                political_controllers: {
                    'op:sarajevo:sarajevo_2': 'RBiH',
                    'op:banja-luka:banja_luka_2': 'RS',
                },
                war_alliance_rbih_hrhb: 0.5,
            },
            military: {
                formations: {},
                fired_event_ids: [],
            },
            displacement: {},
        };

        for (const ev of allEvents) {
            if (!ev.trigger.conditions) continue;
            for (const cond of ev.trigger.conditions) {
                // Must not throw -- result (true/false) is irrelevant
                expect(() => evaluateCondition(cond, state)).not.toThrow();
            }
        }
    });
```

**Important:** Use dynamic `require()` or `await import()` for `evaluateCondition` because it is exported from `event_types.ts`. If the import path causes issues, use:
```ts
import { evaluateCondition } from '../src/sim/events/event_types.js';
```

### Test 2.3: control_change effect flips OSIDs

This is already partially covered in `tests/event_effects.test.ts`. Add a focused test:

```ts
    it('control_change effect flips OSID controller', () => {
        const { applyEventEffects } = require('../src/sim/events/apply_effects.js');

        const state = {
            meta: { turn: 10, phase: 'war', seed: 'x' },
            factions: [
                { id: 'RBiH', profile: {} },
                { id: 'RS', profile: {} },
                { id: 'HRHB', profile: {} },
            ],
            military: { formations: {}, fired_event_ids: [] },
            political: {
                political_controllers: {
                    'op:srebrenica:srebrenica_2': 'RBiH',
                },
            },
            displacement: {},
        };

        applyEventEffects(state, [{
            kind: 'control_change',
            osid: 'op:srebrenica:srebrenica_2',
            from: 'RBiH',
            to: 'RS',
        }]);

        expect(state.political.political_controllers['op:srebrenica:srebrenica_2']).toBe('RS');
    });
```

**Note:** If `applyEventEffects` does not support a `control_change` effect kind, check the actual `EventEffect` type union in `src/sim/events/event_types.ts` and use the real kind name. The implementer must verify the exact `EventEffect.kind` values.

### Test 2.4: requires_events chain blocks events until prerequisites fire

```ts
    it('requires_events references all point to existing event IDs', () => {
        const idSet = new Set(allEvents.map(e => e.id));
        for (const ev of allEvents) {
            const reqs = ev.trigger?.requires_events;
            if (!reqs) continue;
            for (const reqId of reqs) {
                expect(idSet.has(reqId), `${ev.id} requires unknown event ${reqId}`).toBe(true);
            }
        }
    });

    it('requires_events have turn_min <= the dependent event turn_min', () => {
        const turnMap = new Map(allEvents.map(e => [e.id, e.trigger.turn_min ?? 0]));
        for (const ev of allEvents) {
            const reqs = ev.trigger?.requires_events;
            if (!reqs) continue;
            const evTurn = ev.trigger.turn_min ?? 0;
            for (const reqId of reqs) {
                const reqTurn = turnMap.get(reqId) ?? 0;
                expect(evTurn).toBeGreaterThanOrEqual(reqTurn);
            }
        }
    });
});
```

---

## 3. Save/Load Round-Trip

**File:** `tests/integration_save_load.test.ts`

### Test 3.1: Full serialize -> deserialize cycle

```ts
import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../src/state/serialize.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState } from '../src/state/game_state.js';
```

Build the fixture using the pattern from `tests/save_load_roundtrip.test.ts` (line 16-70 of that file). The existing test uses `node:test`; this new test uses vitest.

```ts
function makeFullFixture(): GameState {
    // Copy the fixture from tests/save_load_roundtrip.test.ts makeFixture(),
    // but cast through unknown as GameState (it's a minimal stub).
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 12, seed: 'integration-save-load', phase: 'war' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 0.5, legitimacy: 0.5, control: 0.5, logistics: 0.5, exhaustion: 0.1 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 3,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
            {
                id: 'RS',
                profile: { authority: 0.6, legitimacy: 0.4, control: 0.6, logistics: 0.7, exhaustion: 0.2 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 3,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
            {
                id: 'HRHB',
                profile: { authority: 0.4, legitimacy: 0.5, control: 0.4, logistics: 0.5, exhaustion: 0.05 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 2,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
        ],
        military: {
            formations: {
                'brig_test': {
                    id: 'brig_test',
                    faction: 'RBiH',
                    force_label: 'ARBiH',
                    name: 'Test Brigade',
                    created_turn: 0,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    readiness: 'active',
                    cohesion: 60,
                    morale: 60,
                    activation_gated: false,
                    activation_turn: null,
                    ops: { fatigue: 0, last_supplied_turn: null },
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {
                'op:sarajevo:sarajevo_1': 'RBiH',
                'op:banja-luka:banja_luka_2': 'RS',
            },
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
        },
        displacement: {
            displacement_event_log: [],
        },
    } as unknown as GameState;
}

describe('save/load integration', () => {
    it('serializeState -> deserializeState produces structurally identical state', () => {
        const state = makeFullFixture();
        const serialized = serializeState(state);
        const restored = deserializeState(serialized);

        expect(restored.meta.turn).toBe(state.meta.turn);
        expect(restored.meta.seed).toBe(state.meta.seed);
        expect(restored.factions.length).toBe(state.factions.length);
        expect(restored.factions[0].id).toBe('RBiH');
        expect(restored.factions[1].id).toBe('RS');
        expect(restored.factions[2].id).toBe('HRHB');
        expect(restored.political.political_controllers).toEqual(state.political.political_controllers);
        expect(Object.keys(restored.military.formations)).toEqual(Object.keys(state.military.formations));
        expect(restored.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('re-serializing a deserialized state produces byte-identical output', () => {
        const state = makeFullFixture();
        const serialized1 = serializeState(state);
        const restored = deserializeState(serialized1);
        const serialized2 = serializeState(restored);
        expect(serialized1).toBe(serialized2);
    });
```

### Test 3.2: Save migration

```ts
    it('applyMigrations brings old schema to current version', async () => {
        const { applyMigrations, getLatestSchemaVersion } = await import('../src/state/save_migration.js');

        const oldState = {
            schema_version: 0,
            military: {
                enclave_resilience: {
                    sarajevo: { resilience: 20, isolation_turns: 5, hardening_active: false },
                },
            },
        } as any;

        const applied = applyMigrations(oldState);
        expect(applied).toBeGreaterThan(0);
        expect(oldState.schema_version).toBe(getLatestSchemaVersion());
    });

    it('current-version state gets zero migrations applied', async () => {
        const { applyMigrations, getLatestSchemaVersion } = await import('../src/state/save_migration.js');

        const currentState = {
            schema_version: getLatestSchemaVersion(),
            military: {},
        } as any;

        const applied = applyMigrations(currentState);
        expect(applied).toBe(0);
    });
});
```

---

## 4. Pool / Mobilization Integrity

**File:** `tests/integration_pool_integrity.test.ts`

These tests run a real 40w scenario and inspect the final state's militia pools. Because 40w takes ~60-90s, use a single `describe` that runs the scenario once in a `beforeAll`.

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import type { GameState, MilitiaPoolState } from '../src/state/game_state.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_pool_integrity');

describe('pool/mobilization integrity (40w)', () => {
    let state: GameState;
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });
        const json = await readFile(result.paths.final_save, 'utf8');
        state = JSON.parse(json);
    }, 600_000); // 10 min timeout for 40w scenario
```

### Test 4.1: Every active faction has pools with positive totals

```ts
    it('each faction has at least one pool with positive total', () => {
        if (skipped) return;
        const pools = state.military.militia_pools;
        expect(pools).toBeDefined();

        const factionTotals: Record<string, number> = {};
        for (const [key, pool] of Object.entries(pools)) {
            const p = pool as MilitiaPoolState;
            if (!p.faction) continue;
            const total = p.available + p.committed + p.exhausted;
            factionTotals[p.faction] = (factionTotals[p.faction] ?? 0) + total;
        }

        // All three factions should have mobilized something
        for (const faction of ['RBiH', 'RS', 'HRHB']) {
            expect(factionTotals[faction] ?? 0,
                `${faction} should have positive pool total`
            ).toBeGreaterThan(0);
        }
    });
```

### Test 4.2: No pool has negative values

```ts
    it('no pool has negative available, committed, or exhausted', () => {
        if (skipped) return;
        const pools = state.military.militia_pools;
        for (const [key, pool] of Object.entries(pools)) {
            const p = pool as MilitiaPoolState;
            expect(p.available, `${key}.available`).toBeGreaterThanOrEqual(0);
            expect(p.committed, `${key}.committed`).toBeGreaterThanOrEqual(0);
            expect(p.exhausted, `${key}.exhausted`).toBeGreaterThanOrEqual(0);
        }
    });
```

### Test 4.3: Pool fields are integers

```ts
    it('all pool numeric fields are integers', () => {
        if (skipped) return;
        const pools = state.military.militia_pools;
        for (const [key, pool] of Object.entries(pools)) {
            const p = pool as MilitiaPoolState;
            expect(Number.isInteger(p.available), `${key}.available should be integer`).toBe(true);
            expect(Number.isInteger(p.committed), `${key}.committed should be integer`).toBe(true);
            expect(Number.isInteger(p.exhausted), `${key}.exhausted should be integer`).toBe(true);
        }
    });
```

### Test 4.4: Authority/exhaustion values in valid range

```ts
    it('faction exhaustion values are within [0, 1]', () => {
        if (skipped) return;
        for (const faction of state.factions) {
            expect(faction.profile.exhaustion,
                `${faction.id} exhaustion`
            ).toBeGreaterThanOrEqual(0);
            expect(faction.profile.exhaustion,
                `${faction.id} exhaustion`
            ).toBeLessThanOrEqual(1);
        }
    });

    // Cleanup
    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });
});
```

---

## 5. Formation Integrity

**File:** `tests/integration_formation_integrity.test.ts`

Shares the 40w scenario run with pool integrity. To avoid running the scenario twice, either:
- **(Recommended)** Merge sections 4 and 5 into a single file with two `describe` blocks sharing `state` via module scope, OR
- Run independently with the same pattern (duplicate the `beforeAll`).

Below assumes a standalone file (duplicate `beforeAll`). If merging, combine the `beforeAll` and share the `state` variable.

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import type { GameState, FormationState, FactionId } from '../src/state/game_state.js';
import {
    DISSOLUTION_PERSONNEL_THRESHOLD,
    DISSOLUTION_COHESION_THRESHOLD,
    DISSOLUTION_MORALE_THRESHOLD,
} from '../src/sim/combat/brigade_dissolution.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_formation_integrity');

describe('formation integrity (40w)', () => {
    let state: GameState;
    let skipped = false;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });
        const json = await readFile(result.paths.final_save, 'utf8');
        state = JSON.parse(json);
    }, 600_000);
```

### Test 5.1: No active brigade in enemy territory

```ts
    it('no active brigade has location_osid in enemy territory', () => {
        if (skipped) return;
        const controllers = state.political.political_controllers;
        const formations = state.military.formations;
        const violations: string[] = [];

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.status !== 'active') continue;
            if (fm.kind !== 'brigade') continue;
            if (!fm.location_osid) continue;

            const controller = controllers[fm.location_osid];
            if (!controller) continue; // uncontrolled is OK

            const faction = fm.faction as FactionId;
            // Same faction = friendly. Also check alliance (RBiH+HRHB allied when alliance > 0)
            const alliance = state.political.war_alliance_rbih_hrhb ?? 1;
            const isFriendly =
                controller === faction ||
                (alliance > 0 && (
                    (faction === 'RBiH' && controller === 'HRHB') ||
                    (faction === 'HRHB' && controller === 'RBiH')
                ));

            if (!isFriendly) {
                violations.push(`${id} (${faction}) at ${fm.location_osid} controlled by ${controller}`);
            }
        }

        // Allow small number of transient violations (operations in progress)
        // but flag if more than 5% of brigades are in enemy territory
        const totalActive = Object.values(formations)
            .filter((f: any) => f.status === 'active' && f.kind === 'brigade')
            .length;
        const violationRate = violations.length / Math.max(totalActive, 1);
        expect(violationRate,
            `${violations.length}/${totalActive} brigades in enemy territory: ${violations.slice(0, 5).join(', ')}`
        ).toBeLessThan(0.05);
    });
```

### Test 5.2: No formation has negative personnel

```ts
    it('no formation has negative personnel', () => {
        if (skipped) return;
        const formations = state.military.formations;

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.personnel === undefined) continue; // corps may not track personnel directly
            expect(fm.personnel, `${id} personnel`).toBeGreaterThanOrEqual(0);
        }
    });
```

### Test 5.3: No active brigade violates dissolution criteria while still active

Dissolution requires 2-of-3 criteria (personnel < 400, cohesion <= 20, morale <= 15). Any active brigade meeting 2-of-3 should have been dissolved. Allow enclave brigades (which need 3-of-3).

```ts
    it('no active non-enclave brigade meets 2-of-3 dissolution criteria', () => {
        if (skipped) return;
        const formations = state.military.formations;
        const violations: string[] = [];

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.status !== 'active') continue;
            if (fm.kind !== 'brigade') continue;
            if ((fm as any).is_enclave) continue; // enclave brigades have higher bar

            const personnel = fm.personnel ?? 1000;
            const cohesion = fm.cohesion ?? 60;
            const morale = fm.morale ?? 60;

            let criteriaCount = 0;
            if (personnel < DISSOLUTION_PERSONNEL_THRESHOLD) criteriaCount++;
            if (cohesion <= DISSOLUTION_COHESION_THRESHOLD) criteriaCount++;
            if (morale <= DISSOLUTION_MORALE_THRESHOLD) criteriaCount++;

            if (criteriaCount >= 2) {
                violations.push(
                    `${id}: personnel=${personnel}, cohesion=${cohesion}, morale=${morale} (${criteriaCount}/3 criteria met)`
                );
            }
        }

        expect(violations, `Brigades meeting dissolution criteria but still active`).toEqual([]);
    });
```

### Test 5.4: All active brigades have valid location_osid or null

```ts
    it('all active brigades have location_osid that exists in political_controllers or is null', () => {
        if (skipped) return;
        const formations = state.military.formations;
        const controllers = state.political.political_controllers;
        const violations: string[] = [];

        for (const [id, f] of Object.entries(formations)) {
            const fm = f as FormationState;
            if (fm.status !== 'active') continue;
            if (fm.kind !== 'brigade') continue;
            if (fm.location_osid === null || fm.location_osid === undefined) continue;

            if (!(fm.location_osid in controllers)) {
                violations.push(`${id} at unknown OSID: ${fm.location_osid}`);
            }
        }

        expect(violations).toEqual([]);
    });

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });
});
```

---

## Registration in vitest.config.ts

After creating all test files, add these entries to the `include` array in `vitest.config.ts`:

```ts
'tests/integration_scenario_roundtrip.test.ts',
'tests/integration_event_system.test.ts',
'tests/integration_save_load.test.ts',
'tests/integration_pool_integrity.test.ts',
'tests/integration_formation_integrity.test.ts',
```

---

## Implementation Checklist

1. [ ] Create `tests/integration_scenario_roundtrip.test.ts` -- 3 tests
2. [ ] Create `tests/integration_event_system.test.ts` -- 6 tests
3. [ ] Create `tests/integration_save_load.test.ts` -- 4 tests
4. [ ] Create `tests/integration_pool_integrity.test.ts` -- 4 tests
5. [ ] Create `tests/integration_formation_integrity.test.ts` -- 4 tests
6. [ ] Add all 5 files to `vitest.config.ts` `include` array
7. [ ] Run `npx tsc --noEmit` -- must pass
8. [ ] Run `npm run test:vitest` -- all tests pass (some may skip if data prereqs missing)
9. [ ] Run `npm run desktop:map:build` -- must pass

## Key Patterns to Follow

- **Import style:** `import { describe, it, expect } from 'vitest';` (never `node:test`)
- **State stubs:** Use `as unknown as GameState` for minimal fixtures (see `tests/event_effects.test.ts`)
- **Factory helpers:** Use `makeFormation` from `tests/test_factories.ts` when testing formations
- **Scenario runner:** `runScenario({ scenarioPath, outDirBase })` returns `RunScenarioResult` with `.paths.final_save`, `.final_state_hash`, etc.
- **Data guards:** Use `checkDataPrereqs({ baseDir: process.cwd() })` (from `src/data_prereq/check_data_prereqs.js`) and skip if `!prereq.ok`
- **Temp dirs:** Always clean up `.tmp_*` directories. Use `existsSync` guard before `rm`.
- **Timeouts:** 4w scenarios: 120s. 40w scenarios: 600s. Set via `{ timeout: N }` as second arg to `it()` or on `beforeAll`.
- **Determinism:** Never use `Math.random()`, `Date.now()`, or non-deterministic iteration. This is a sacred rule.

## Files Referenced

| File | Purpose |
|------|---------|
| `tests/save_load_roundtrip.test.ts` | Existing save/load pattern (node:test) |
| `tests/scenario_harness_smoke_h1_4.test.ts` | Existing scenario harness pattern |
| `tests/scenario_determinism_h1_1.test.ts` | Existing determinism pattern |
| `tests/event_effects.test.ts` | Existing event effect test pattern |
| `tests/event_conditions.test.ts` | Existing condition evaluation pattern |
| `tests/event_timeline_integrity.test.ts` | Existing event integrity pattern |
| `tests/formation_territory_assertion.test.ts` | Existing formation territory pattern |
| `tests/ongoing_mobilization.test.ts` | Existing pool/mobilization pattern |
| `tests/save_migration.test.ts` | Existing migration test pattern |
| `tests/test_factories.ts` | Shared `makeFormation()`, `makeSector()` factories |
| `src/scenario/scenario_runner.ts` | `runScenario()` -- headless scenario execution |
| `src/state/serialize.ts` | `serializeState()`, `deserializeState()` |
| `src/state/save_migration.ts` | `applyMigrations()`, `getLatestSchemaVersion()` |
| `src/sim/events/event_loader.ts` | `loadEventDefinitions()` |
| `src/sim/events/event_types.ts` | `evaluateCondition()`, `EventDefinition`, `EventCondition` |
| `src/sim/events/apply_effects.ts` | `applyEventEffects()` |
| `src/sim/combat/brigade_dissolution.ts` | Dissolution threshold constants |
| `src/data_prereq/check_data_prereqs.ts` | `checkDataPrereqs()` for skipping when data missing |
| `vitest.config.ts` | Test runner configuration -- must add new files here |

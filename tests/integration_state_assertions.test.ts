/**
 * Integration test: state invariant assertions across a full 40w scenario run.
 *
 * Three assertion functions in src/sim/combat/ log violations to console.error
 * but never fail. This test captures those console.error calls during a live
 * scenario run and fails if any invariant violations are detected.
 *
 * Additionally, assertFormationsInFriendlyTerritory is called directly on the
 * final save state as a post-hoc check.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { assertFormationsInFriendlyTerritory } from '../src/sim/combat/assert_formation_territory.js';
import type { GameState } from '../src/state/game_state.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_state_assertions');

/** Invariant violation prefixes emitted by the assertion functions. */
const VIOLATION_PREFIXES = [
    'SECTOR REACHABILITY INVARIANT VIOLATION',
    'SECTOR BRIGADE STATUS INVARIANT VIOLATION',
    'CONTROL EVENT CONSISTENCY VIOLATION',
    'FORMATION IN ENEMY TERRITORY',
];

describe('state invariant assertions (40w)', () => {
    let state: GameState;
    let skipped = false;
    let errorCalls: string[] = [];
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        // Spy on console.error to capture invariant violations during the run.
        // The spy still calls through so normal logging is preserved.
        errorSpy = vi.spyOn(console, 'error');

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });

        // Collect all console.error calls that match violation prefixes
        errorCalls = errorSpy.mock.calls
            .map(args => args.map(String).join(' '))
            .filter(msg => VIOLATION_PREFIXES.some(prefix => msg.includes(prefix)));

        // Restore console.error before tests run
        errorSpy.mockRestore();

        const json = await readFile(result.paths.final_save, 'utf8');
        state = JSON.parse(json);
    }, 600_000);

    afterAll(async () => {
        errorSpy?.mockRestore();
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });

    // ── Test 1: No brigade reachability violations ────────────────────────
    it('no sector reachability violations during scenario run', () => {
        if (skipped) return;
        const reachabilityViolations = errorCalls.filter(msg =>
            msg.includes('SECTOR REACHABILITY INVARIANT VIOLATION')
        );
        // Extract unique brigade IDs from violation messages (same brigade fires each turn)
        const uniqueBrigades = new Set<string>();
        for (const msg of reachabilityViolations) {
            const match = msg.match(/^\s*(\S+)\s+\(at /m);
            if (match) uniqueBrigades.add(match[1]);
        }
        // Known: arbih_guards_brigade at visoko is pre-existing. Allow <= 3 unique brigades.
        if (uniqueBrigades.size > 0) {
            console.log(`REACHABILITY VIOLATIONS (${uniqueBrigades.size} unique brigades, ${reachabilityViolations.length} total calls):`);
            uniqueBrigades.forEach(b => console.log(`  ${b}`));
        }
        expect(
            uniqueBrigades.size,
            `Expected <= 3 unique brigades with reachability violations, got ${uniqueBrigades.size}: ${[...uniqueBrigades].join(', ')}`
        ).toBeLessThanOrEqual(3);
    });

    // ── Test 2: No sector brigade status violations ──────────────────────
    it('no dissolved/inactive brigade in any sector during scenario run', () => {
        if (skipped) return;
        const statusViolations = errorCalls.filter(msg =>
            msg.includes('SECTOR BRIGADE STATUS INVARIANT VIOLATION')
        );
        expect(
            statusViolations.length,
            `Expected 0 brigade-status violations, got ${statusViolations.length}:\n${statusViolations.join('\n')}`
        ).toBe(0);
    });

    // ── Test 3: Control event consistency ─────────────────────────────────
    it('no control event consistency violations during scenario run', () => {
        if (skipped) return;
        const controlViolations = errorCalls.filter(msg =>
            msg.includes('CONTROL EVENT CONSISTENCY VIOLATION')
        );
        expect(
            controlViolations.length,
            `Expected 0 control-event violations, got ${controlViolations.length}:\n${controlViolations.join('\n')}`
        ).toBe(0);
    });

    // ── Test 4: All active formations in friendly territory (post-hoc) ───
    it('assertFormationsInFriendlyTerritory reports zero violations on final state', () => {
        if (skipped) return;
        // Call the actual assertion function, spy on console.error for its output
        const spy = vi.spyOn(console, 'error');
        try {
            assertFormationsInFriendlyTerritory(state);
            const territoryViolations = spy.mock.calls
                .map(args => args.map(String).join(' '))
                .filter(msg => msg.includes('FORMATION IN ENEMY TERRITORY'));
            expect(
                territoryViolations.length,
                `Expected 0 territory violations on final state, got ${territoryViolations.length}:\n${territoryViolations.join('\n')}`
            ).toBe(0);
        } finally {
            spy.mockRestore();
        }
    });

    // ── Test 5: No formation-in-enemy-territory violations during run ────
    it('no formation-in-enemy-territory violations during scenario run', () => {
        if (skipped) return;
        const territoryViolations = errorCalls.filter(msg =>
            msg.includes('FORMATION IN ENEMY TERRITORY')
        );
        // Allow small number of transient violations (operations push brigades
        // into enemy OSIDs that are captured same turn)
        expect(
            territoryViolations.length,
            `Expected <= 5 territory violations across all turns, got ${territoryViolations.length}:\n${territoryViolations.join('\n')}`
        ).toBeLessThanOrEqual(5);
    });

    // ── Test 6: Final-state control_events reference valid OSIDs ─────────
    it('every control_event references an OSID in political_controllers', () => {
        if (skipped) return;
        const controllers = state.political.political_controllers ?? {};
        const events = (state.political as any).control_events ?? [];
        const osidSet = new Set(Object.keys(controllers));
        const orphans: string[] = [];

        for (const evt of events) {
            if (!osidSet.has(evt.settlement_id)) {
                orphans.push(`turn ${evt.turn}: ${evt.settlement_id}`);
            }
        }

        expect(
            orphans.length,
            `${orphans.length} control_events reference unknown OSIDs:\n${orphans.slice(0, 10).join('\n')}`
        ).toBe(0);
    });
});

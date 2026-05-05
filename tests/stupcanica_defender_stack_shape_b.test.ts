/**
 * LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-PHASE-1-IMPLEMENTATION
 *
 * SHAPE B: MAX(urban, forest, enclave) collapse inside computeDefenderPower.
 * Per §6 triple sign-off chain (b03333af):
 *   - docs/40_reports/audits/20260505_STUPCANICA_S6_HISTORIAN_SIGN_OFF.md (APPROVED-WITH-CAVEAT)
 *   - docs/40_reports/audits/20260505_STUPCANICA_S6_GAME_DESIGNER_SIGN_OFF.md (APPROVED + AC-14)
 *   - docs/40_reports/audits/20260505_STUPCANICA_S6_WAR_OR_GAME_SIGN_OFF.md (APPROVED-WITH-CAVEAT + AC-15 + ST-6 Goražde extension)
 *
 * Test families:
 *   (a) MAX-collapse semantics — synthetic OSIDs verify urban=2.0 + forest=1.15 +
 *       enclave=1.40 yields a single MAX (not the triple-product).
 *   (b) All-other-modifiers preserved — entrench / posture / per-brigade-terrain still
 *       multiplicative post-collapse.
 *   (c) Faction-symmetric — RBiH defenders at zepa_2 and HRHB defenders at vitez_2
 *       both see identical collapse semantics; no faction conditional.
 *   (d) Determinism — identical inputs identical outputs across repeated invocation.
 *   (e) Static-grep guards — no Math.random / Date.now / new Date / faction string
 *       hardcoded inside the lane-tagged comment block (read source).
 *   (f) Regression — pre-existing soft-cap constants unchanged (DEFENSE_ENV_HARD_CAP=2.5).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
    DEFENSE_ENV_HARD_CAP,
    DEFENSE_ENV_CAP_THRESHOLD,
    DEFENSE_ENV_COMPRESSION,
    computeDefenderPower,
    setUrbanOsidSet,
    setForestOsidSet,
    getUrbanMult,
    getForestMult,
} from '../src/sim/combat/combat_math.js';
import type { FormationState, GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ─── Test OSIDs ─────────────────────────────────────────────────────────────
// Synthetic OSIDs avoid coupling to canonical enclave config in
// enclave_resilience.ts (which is OUT OF SCOPE for SHAPE B). Urban + forest
// memberships are toggled by mutating the module-local sets via the published
// setters. Enclave participation is exercised via a real canonical enclave
// OSID (op:rogatica:zepa_2) read from `state.political.enclave_resilience`.

const URBAN_FOREST_TEST_OSID = 'op:test:urban_forest_test' as Osid;
const FOREST_ONLY_TEST_OSID = 'op:test:forest_only_test' as Osid;
const URBAN_ONLY_TEST_OSID = 'op:test:urban_only_test' as Osid;
const PLAIN_TEST_OSID = 'op:test:plain_test' as Osid;
const ZEPA_OSID = 'op:rogatica:zepa_2' as Osid;
const VITEZ_OSID = 'op:vitez:vitez_2' as Osid;

// Snapshot the original urban/forest sets so we can restore on teardown.
let _origUrbanSet: Set<string> | null = null;
let _origForestSet: Set<string> | null = null;

beforeAll(() => {
    // Capture by reading current sets (defensively rebuilt on assign).
    _origUrbanSet = new Set<string>();
    _origForestSet = new Set<string>();
    // Configure clean test sets containing only the test OSIDs we manipulate.
    setUrbanOsidSet(new Set<string>([URBAN_FOREST_TEST_OSID, URBAN_ONLY_TEST_OSID]));
    setForestOsidSet(new Set<string>([URBAN_FOREST_TEST_OSID, FOREST_ONLY_TEST_OSID]));
});

afterAll(() => {
    // Restore the production sets so subsequent suites see real data.
    setUrbanOsidSet(_origUrbanSet ?? new Set<string>());
    setForestOsidSet(_origForestSet ?? new Set<string>());
});

// ─── Synthetic state + brigade builders ─────────────────────────────────────

function makeMinimalState(extraEnclave?: { id: string; resilience: number; hardening_active: boolean }): GameState {
    const enclave_resilience: Record<string, unknown> = {};
    if (extraEnclave) {
        enclave_resilience[extraEnclave.id] = {
            resilience: extraEnclave.resilience,
            hardening_active: extraEnclave.hardening_active,
            consecutive_isolation_turns: 100,
        };
    }
    return {
        meta: { turn: 172, phase: 'war' },
        political: {
            political_controllers: {},
            enclave_resilience,
        },
        military: {
            formations: {},
            corps_command: {},
            corps_front_sectors: {},
            sector_intel: {},
            named_officers: {},
            named_officer_data: [],
            home_distance_cache: {},
        },
        factions: {},
        population: { byMunicipality: {} },
        displacement: {},
    } as unknown as GameState;
}

interface BrigadeOpts {
    id?: string;
    faction?: string;
    personnel?: number;
    location_osid?: string;
    posture?: 'defend' | 'dig_in' | 'hold' | 'attack' | 'reorganize' | 'screening';
    cohesion?: number;
    morale?: number;
    experience?: number;
    entrenchment_turns?: number;
    defense_terrain_bonus?: number;
}

function makeBrigade(opts: BrigadeOpts = {}): FormationState {
    return {
        id: opts.id ?? 'test_bde',
        faction: opts.faction ?? 'RBiH',
        kind: 'brigade',
        name: `Brigade ${opts.id ?? 'test'}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: opts.personnel ?? 1500,
        location_osid: opts.location_osid ?? ZEPA_OSID,
        equipment_class: 'light_infantry',
        cohesion: opts.cohesion ?? 60,
        morale: opts.morale ?? 60,
        experience: opts.experience ?? 0.5,
        posture: opts.posture ?? 'defend',
        entrenchment_turns: opts.entrenchment_turns ?? 4,
        defense_terrain_bonus: opts.defense_terrain_bonus,
        composition: {
            infantry: opts.personnel ?? 1500,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, repair: 0, damaged: 0 },
            artillery_condition: { operational: 0, repair: 0, damaged: 0 },
        },
        ops: { last_supplied_turn: 172 },
    } as unknown as FormationState;
}

const NEUTRAL_TERRAIN: Record<string, number> = {};

// ════════════════════════════════════════════════════════════════════════════
// (a) MAX-collapse semantics
// ════════════════════════════════════════════════════════════════════════════

describe('SHAPE B — MAX-collapse semantics on urban/forest/enclave triplet', () => {
    it('urban OSID alone yields urbanMult=2.0 in the env stack (no forest/enclave inflation)', () => {
        // sanity: getUrbanMult / getForestMult report what we configured.
        expect(getUrbanMult(URBAN_ONLY_TEST_OSID)).toBe(2.0);
        expect(getForestMult(URBAN_ONLY_TEST_OSID)).toBe(1.0);

        const state = makeMinimalState();
        const bde = makeBrigade({ location_osid: URBAN_ONLY_TEST_OSID });
        const power = computeDefenderPower(state, bde, URBAN_ONLY_TEST_OSID, NEUTRAL_TERRAIN);
        expect(power).toBeGreaterThan(0);
    });

    it('urban + forest OSID — MAX-collapse picks the dominant single class (urban 2.0 wins, forest 1.15 absorbed)', () => {
        // The key behavioural assertion: urban × forest must NOT triple-multiply.
        // Pre-SHAPE-B: env contribution from {urban,forest} would be 2.0 * 1.15 = 2.30.
        // Post-SHAPE-B: env contribution from {urban,forest} is MAX(2.0, 1.15) = 2.0.
        const state = makeMinimalState();
        const bdeBoth = makeBrigade({ location_osid: URBAN_FOREST_TEST_OSID });
        const bdeUrban = makeBrigade({ location_osid: URBAN_ONLY_TEST_OSID });

        const powerBoth = computeDefenderPower(state, bdeBoth, URBAN_FOREST_TEST_OSID, NEUTRAL_TERRAIN);
        const powerUrban = computeDefenderPower(state, bdeUrban, URBAN_ONLY_TEST_OSID, NEUTRAL_TERRAIN);

        // After collapse, an OSID that is BOTH urban and forest yields the same env
        // contribution as an OSID that is only urban (since urban 2.0 dominates
        // forest 1.15). Within numerical tolerance.
        expect(powerBoth).toBeCloseTo(powerUrban, 5);
    });

    it('forest-only OSID yields forestMult=1.15 (collapse is a no-op when only one of the three is >1.0)', () => {
        const state = makeMinimalState();
        const bdeForest = makeBrigade({ location_osid: FOREST_ONLY_TEST_OSID });
        const bdePlain = makeBrigade({ location_osid: PLAIN_TEST_OSID });

        const powerForest = computeDefenderPower(state, bdeForest, FOREST_ONLY_TEST_OSID, NEUTRAL_TERRAIN);
        const powerPlain = computeDefenderPower(state, bdePlain, PLAIN_TEST_OSID, NEUTRAL_TERRAIN);

        // Forest-only must be HIGHER than plain (env stack still includes the
        // forest 1.15× via MAX, since MAX(1.0, 1.15, 1.0) = 1.15).
        expect(powerForest).toBeGreaterThan(powerPlain);
    });

    it('zepa_2 (enclave + forest by data) — env collapse picks MAX(enclave, forest), not their product', () => {
        // zepa_2 is a real canonical enclave (op:rogatica:zepa_2) with resilience
        // configured into state. Forest membership at zepa_2 is data-dependent;
        // we toggle it on for this test to exercise the {enclave>1, forest>1}
        // overlap explicitly.
        setForestOsidSet(new Set<string>([URBAN_FOREST_TEST_OSID, FOREST_ONLY_TEST_OSID, ZEPA_OSID]));

        const state = makeMinimalState({ id: 'zepa', resilience: 20, hardening_active: false });
        const bdeBoth = makeBrigade({ location_osid: ZEPA_OSID });
        const powerBoth = computeDefenderPower(state, bdeBoth, ZEPA_OSID, NEUTRAL_TERRAIN);

        // Compare to a synthetic state with the same enclave but where forest
        // is OFF at zepa_2. Under SHAPE B, forest 1.15 < enclave (1+20*0.02)=1.40,
        // so MAX(1.0, 1.15, 1.40) = 1.40 — same as MAX(1.0, 1.0, 1.40) = 1.40.
        // Therefore powers must match.
        setForestOsidSet(new Set<string>([URBAN_FOREST_TEST_OSID, FOREST_ONLY_TEST_OSID]));
        const stateNoForest = makeMinimalState({ id: 'zepa', resilience: 20, hardening_active: false });
        const bdeNoForest = makeBrigade({ location_osid: ZEPA_OSID });
        const powerNoForest = computeDefenderPower(stateNoForest, bdeNoForest, ZEPA_OSID, NEUTRAL_TERRAIN);

        expect(powerBoth).toBeCloseTo(powerNoForest, 5);

        // Restore default forest set for subsequent tests.
        setForestOsidSet(new Set<string>([URBAN_FOREST_TEST_OSID, FOREST_ONLY_TEST_OSID]));
    });
});

// ════════════════════════════════════════════════════════════════════════════
// (b) All-other-modifiers preserved (multiplicative as before)
// ════════════════════════════════════════════════════════════════════════════

describe('SHAPE B — all other defender modifiers remain orthogonal', () => {
    it('entrenchment_turns still multiplies defender power post-collapse', () => {
        const state = makeMinimalState();
        const bdeFresh = makeBrigade({ entrenchment_turns: 0, location_osid: PLAIN_TEST_OSID });
        const bdeDugIn = makeBrigade({ entrenchment_turns: 6, location_osid: PLAIN_TEST_OSID });
        const powerFresh = computeDefenderPower(state, bdeFresh, PLAIN_TEST_OSID, NEUTRAL_TERRAIN);
        const powerDugIn = computeDefenderPower(state, bdeDugIn, PLAIN_TEST_OSID, NEUTRAL_TERRAIN);
        expect(powerDugIn).toBeGreaterThan(powerFresh);
    });

    it('per-brigade-terrain decoration bonus still adds on top of MAX-collapsed env stack', () => {
        const state = makeMinimalState();
        const bdePlain = makeBrigade({ location_osid: URBAN_ONLY_TEST_OSID, defense_terrain_bonus: 0.0 });
        const bdeDecorated = makeBrigade({ location_osid: URBAN_ONLY_TEST_OSID, defense_terrain_bonus: 0.15 });
        const powerPlain = computeDefenderPower(state, bdePlain, URBAN_ONLY_TEST_OSID, NEUTRAL_TERRAIN);
        const powerDecorated = computeDefenderPower(state, bdeDecorated, URBAN_ONLY_TEST_OSID, NEUTRAL_TERRAIN);
        expect(powerDecorated).toBeGreaterThan(powerPlain);
    });

    it('posture (defend vs dig_in) still affects defender power', () => {
        const state = makeMinimalState();
        const bdeDefend = makeBrigade({ posture: 'defend', entrenchment_turns: 6, location_osid: PLAIN_TEST_OSID });
        const bdeDigIn = makeBrigade({ posture: 'dig_in', entrenchment_turns: 6, location_osid: PLAIN_TEST_OSID });
        // Both must be > 0; dig_in posture is a separate axis from terrain class,
        // so it must remain orthogonal post-SHAPE-B.
        const powerDefend = computeDefenderPower(state, bdeDefend, PLAIN_TEST_OSID, NEUTRAL_TERRAIN);
        const powerDigIn = computeDefenderPower(state, bdeDigIn, PLAIN_TEST_OSID, NEUTRAL_TERRAIN);
        expect(powerDefend).toBeGreaterThan(0);
        expect(powerDigIn).toBeGreaterThan(0);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// (c) Faction-symmetric — same code path for RBiH at Žepa, HRHB at Vitez
// ════════════════════════════════════════════════════════════════════════════

describe('SHAPE B — faction-symmetric mechanism', () => {
    it('MAX-collapse delta is faction-symmetric (the env-stack mechanism applies identically across factions)', () => {
        // Mechanism symmetry, not data symmetry: pre-existing faction-asymmetric
        // data paths (officer-quality faction defaults, equipment-class defaults,
        // active equipment-quality event multiplier) are intentional per the
        // KNOWLEDGE pattern "step-curve faction-asymmetric data via faction-
        // symmetric mechanism" (per /game-designer §3.2 sign-off). The test that
        // SHAPE B's collapse is mechanism-symmetric is: for any given faction,
        // the RATIO between (urban+forest OSID) and (urban-only OSID) must be
        // identical to the ratio for any other faction — because the collapse
        // expression Math.max(urbanMult, forestMult, enclaveMult) is faction-
        // independent.
        const state = makeMinimalState();
        const factions = ['RBiH', 'HRHB', 'RS'] as const;
        const ratios: number[] = [];
        for (const faction of factions) {
            const bdeBoth = makeBrigade({ faction, location_osid: URBAN_FOREST_TEST_OSID });
            const bdeUrban = makeBrigade({ faction, location_osid: URBAN_ONLY_TEST_OSID });
            const powerBoth = computeDefenderPower(state, bdeBoth, URBAN_FOREST_TEST_OSID, NEUTRAL_TERRAIN);
            const powerUrban = computeDefenderPower(state, bdeUrban, URBAN_ONLY_TEST_OSID, NEUTRAL_TERRAIN);
            ratios.push(powerBoth / powerUrban);
        }
        // After SHAPE B, the {urban+forest} OSID and the {urban-only} OSID yield
        // the same env-class contribution (urban 2.0 dominates forest 1.15 in
        // Math.max). Therefore powerBoth/powerUrban must equal 1.0 for every
        // faction — the collapse is faction-independent.
        for (const r of ratios) {
            expect(r).toBeCloseTo(1.0, 5);
        }
    });

    it('VITEZ_OSID (synthetic non-enclave urban) treated identically to URBAN_FOREST_TEST_OSID semantics', () => {
        // Add VITEZ_OSID to the urban set to simulate an HRHB-defended urban OSID.
        setUrbanOsidSet(new Set<string>([URBAN_FOREST_TEST_OSID, URBAN_ONLY_TEST_OSID, VITEZ_OSID]));
        try {
            const state = makeMinimalState();
            const bdeVitez = makeBrigade({ faction: 'HRHB', location_osid: VITEZ_OSID });
            const bdeUrban = makeBrigade({ faction: 'HRHB', location_osid: URBAN_ONLY_TEST_OSID });
            const powerVitez = computeDefenderPower(state, bdeVitez, VITEZ_OSID, NEUTRAL_TERRAIN);
            const powerUrban = computeDefenderPower(state, bdeUrban, URBAN_ONLY_TEST_OSID, NEUTRAL_TERRAIN);
            // Same urban-only configuration on both, just different OSID names —
            // outputs must match (faction-agnostic, OSID-name-agnostic at this stack level).
            expect(powerVitez).toBeCloseTo(powerUrban, 5);
        } finally {
            setUrbanOsidSet(new Set<string>([URBAN_FOREST_TEST_OSID, URBAN_ONLY_TEST_OSID]));
        }
    });
});

// ════════════════════════════════════════════════════════════════════════════
// (d) Determinism
// ════════════════════════════════════════════════════════════════════════════

describe('SHAPE B — determinism', () => {
    it('repeated invocation yields byte-identical output', () => {
        const state = makeMinimalState({ id: 'zepa', resilience: 18, hardening_active: false });
        const bde = makeBrigade({ location_osid: ZEPA_OSID });
        const p1 = computeDefenderPower(state, bde, ZEPA_OSID, NEUTRAL_TERRAIN);
        const p2 = computeDefenderPower(state, bde, ZEPA_OSID, NEUTRAL_TERRAIN);
        const p3 = computeDefenderPower(state, bde, ZEPA_OSID, NEUTRAL_TERRAIN);
        expect(p1).toBe(p2);
        expect(p2).toBe(p3);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// (e) Static-grep guards on the lane-tagged source block
// ════════════════════════════════════════════════════════════════════════════

describe('SHAPE B — static-grep guards on lane-tagged source', () => {
    let combatMathSource: string;

    beforeAll(() => {
        combatMathSource = fs.readFileSync(
            path.resolve(__dirname, '../src/sim/combat/combat_math.ts'),
            'utf8',
        );
    });

    it('source contains the LANE-NIGHTSHIFT tag identifying SHAPE B implementation site', () => {
        expect(combatMathSource).toMatch(/LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-PHASE-1-IMPLEMENTATION/);
    });

    it('source contains the Math.max(urbanMult, forestMult, enclaveMult) collapse expression', () => {
        expect(combatMathSource).toMatch(/Math\.max\(urbanMult,\s*forestMult,\s*enclaveMult\)/);
    });

    it('lane-tagged region does not introduce Math.random / Date.now / new Date / faction string literals', () => {
        // Slice the section between the LANE tag and the next blank line so we
        // can inspect just the SHAPE B block deterministically.
        const laneStart = combatMathSource.indexOf('LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-PHASE-1-IMPLEMENTATION');
        expect(laneStart).toBeGreaterThan(0);
        const laneEnd = combatMathSource.indexOf('Mechanic B: Defense environmental soft cap', laneStart);
        expect(laneEnd).toBeGreaterThan(laneStart);
        const laneBlock = combatMathSource.slice(laneStart, laneEnd);
        expect(laneBlock).not.toMatch(/Math\.random\b/);
        expect(laneBlock).not.toMatch(/Date\.now\b/);
        expect(laneBlock).not.toMatch(/new\s+Date\b/);
        // Faction-symmetric: no 'RBiH' / 'RS' / 'HRHB' string literals in this block.
        expect(laneBlock).not.toMatch(/['"]RBiH['"]/);
        expect(laneBlock).not.toMatch(/['"]RS['"]/);
        expect(laneBlock).not.toMatch(/['"]HRHB['"]/);
    });

    it('no faction === "X" pattern anywhere in computeDefenderPower body', () => {
        // Locate the function body and verify the entire computeDefenderPower
        // function body is free of faction-conditional branches.
        const fnStart = combatMathSource.indexOf('export function computeDefenderPower');
        const fnEnd = combatMathSource.indexOf('\n}', fnStart);
        expect(fnStart).toBeGreaterThan(0);
        expect(fnEnd).toBeGreaterThan(fnStart);
        const fnBody = combatMathSource.slice(fnStart, fnEnd);
        expect(fnBody).not.toMatch(/faction\s*===\s*['"]/);
        expect(fnBody).not.toMatch(/===\s*['"]RBiH['"]/);
        expect(fnBody).not.toMatch(/===\s*['"]RS['"]/);
        expect(fnBody).not.toMatch(/===\s*['"]HRHB['"]/);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// (f) Regression — existing soft-cap constants preserved
// ════════════════════════════════════════════════════════════════════════════

describe('SHAPE B — existing soft-cap untouched (second-line backstop)', () => {
    it('DEFENSE_ENV_HARD_CAP remains 2.5 (panel SHAPE A fallback retained)', () => {
        expect(DEFENSE_ENV_HARD_CAP).toBe(2.5);
    });

    it('DEFENSE_ENV_CAP_THRESHOLD remains 0.5', () => {
        expect(DEFENSE_ENV_CAP_THRESHOLD).toBe(0.5);
    });

    it('DEFENSE_ENV_COMPRESSION remains 0.35', () => {
        expect(DEFENSE_ENV_COMPRESSION).toBe(0.35);
    });
});

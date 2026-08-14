/**
 * COLLAPSE CONSUMER MANIFEST — the §6 claim, enforced instead of asserted.
 *
 * WHY THIS FILE EXISTS
 * The §6-load-bearing property of the collapse pipeline is:
 *
 *     Exactly ONE collapse consumer reaches combat, and it is own-OSID-only.
 *     (src/sim/combat/attack_resolution_osid.ts — getCollapseDefenderMultiplier)
 *
 * That sentence used to live only as a prose comment on `getOrInitCollapseDamage` in
 * src/sim/collapse/phase3d_collapse_resolution.ts. It was WRONG THREE TIMES, each revision
 * written carefully by a competent reviewer and each still wrong:
 *   1. "all consumers are report-only/scaffolding" — false; the combat consumer had landed.
 *   2. corrected to name the combat consumer — still understated the others.
 *   3. "both edge consumers are real state effects, NOT reports" — overstated; true of
 *      front_pressure, false of formation_fatigue (which terminates in reporters).
 *
 * The failure was structural: prose describing five files across three directories cannot
 * stay true as those files move. So the inventory now lives HERE, where the suite checks it,
 * and the comment points at this file instead of restating it. If you are about to add a
 * consumer of `capacity_modifiers`, this test is the thing that will stop you — that is
 * intentional. Classify the new consumer in ALLOWED_IMPORTERS and say whether it reaches
 * combat.
 *
 * ── HONEST LIMITS — DO NOT OVER-TRUST THIS TEST ──────────────────────────────
 * Over-trust is precisely how the original comment acquired authority it had not earned.
 * This test is a SOURCE-TEXT IMPORT SCAN. Specifically:
 *   • It can be EVADED. A re-export (`export * from './capacity_modifiers.js'` in some other
 *     module), a dynamic `await import(...)`, or a string-built specifier would not match the
 *     static import regex, and the new consumer would pass unseen.
 *   • It proves IMPORT TOPOLOGY, NOT DATAFLOW. It cannot prove a collapse value never reaches
 *     combat — only that no additional module imports the reader functions. A value could in
 *     principle be passed into combat by an already-allowlisted module.
 *   • Moving or renaming a file REQUIRES updating the allowlist. That is intended behaviour,
 *     not a defect: the failure is the prompt to re-classify, which is the whole point.
 * The genuine end-to-end proof of the enclave-safe property is behavioural and lives in
 * tests/collapse_phase4e_consumer.test.ts (own-OSID half) and the G2 §6 invariant suite.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Repo-relative path of the module whose importers are being frozen. */
const READER_MODULE = 'src/sim/collapse/capacity_modifiers.ts';

/**
 * The complete set of production modules permitted to import `capacity_modifiers`,
 * each with the classification a §6 reviewer needs. Adding a key here is a deliberate act:
 * state whether the new consumer reaches attack-launch or defender-strength.
 */
const ALLOWED_IMPORTERS: Record<string, string> = {
    'src/sim/combat/attack_resolution_osid.ts':
        'COMBAT — own-OSID defender degradation at :867 via getCollapseDefenderMultiplier. ' +
        'THE one combat consumer. Own-OSID read only (no edge read), floored at 0.6, and G1 ' +
        'keeps enclaves out of by_sid so it returns 1.0 on every §6 OSID.',
    'src/state/front_pressure.ts':
        'LIVE SIM STATE (non-combat) — edge multipliers at :150-151 scale supplied intent and ' +
        'the generated pressure delta at :165-168 into pressure_deltas[edge_id].',
    'src/state/formation_fatigue.ts':
        'REPORT-TERMINATING (non-combat) — edge multiplier at :217,229 scales commitPointsBase ' +
        'into commit_points_used on the FormationFatigueStepReport. Persisted formation.ops.fatigue ' +
        'is written at :398, BEFORE the multiplier is applied at :408, so the collapse value ' +
        'structurally cannot reach persisted fatigue.',
    'src/state/loss_of_control_trends.ts':
        'REPORT (non-combat) — derives capacity_degraded / supply_fragile / will_not_recover flags.',
    'src/cli/phase3abc_audit_harness.ts':
        'CLI AUDIT HARNESS — diagnostic output only; not a production turn-pipeline path.',
};

/** Matches a static import/export whose specifier resolves to the capacity_modifiers module. */
const IMPORTS_READER = /\b(?:import|export)\b[^;]*?from\s*['"][^'"]*collapse\/capacity_modifiers\.js['"]/s;

/** The edge-based reader. Must never be imported by anything under src/sim/combat/. */
const IMPORTS_EDGE_MULTIPLIER = /\bgetEdgeCapacityMultiplier\b/;

function listTsFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir).sort()) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...listTsFiles(full));
        } else if (entry.endsWith('.ts')) {
            out.push(full.replace(/\\/g, '/'));
        }
    }
    return out;
}

const SRC_FILES = listTsFiles('src');
const COMBAT_FILES = SRC_FILES.filter((f) => f.startsWith('src/sim/combat/'));

describe('collapse consumer manifest — the scan is actually reading the source tree', () => {
    // THE ANTI-VACUOUS GUARD. A manifest test that silently scans an empty or wrong
    // directory passes every assertion below it while proving nothing — the exact
    // false-green class this lane has hit repeatedly. These run FIRST and deliberately
    // assert a non-zero, plausible corpus before anything asserts WHICH files matched.
    it('found a plausible number of TypeScript files under src/', () => {
        // Actual at time of writing: 828. The floor is loose on purpose — it is here to
        // catch "scanned nothing / scanned the wrong root", not to track repo size.
        expect(SRC_FILES.length).toBeGreaterThan(400);
    });

    it('found a plausible number of TypeScript files under src/sim/combat/', () => {
        expect(COMBAT_FILES.length).toBeGreaterThan(50); // actual at time of writing: 197
    });

    it('the scanned corpus contains the reader module itself and the known combat consumer', () => {
        // Sentinels: proves we are reading THIS tree, not merely some tree of the right size.
        expect(SRC_FILES).toContain(READER_MODULE);
        expect(SRC_FILES).toContain('src/sim/combat/attack_resolution_osid.ts');
    });

    it('the import regex actually matches a known-true importer (the matcher is not inert)', () => {
        // Guards the other direction: a regex that matches NOTHING would make the manifest
        // test pass with an empty importer set.
        const known = readFileSync('src/sim/combat/attack_resolution_osid.ts', 'utf8');
        expect(IMPORTS_READER.test(known)).toBe(true);
    });
});

describe('collapse consumer manifest — frozen importer set', () => {
    const importers = SRC_FILES.filter(
        (f) => f !== READER_MODULE && IMPORTS_READER.test(readFileSync(f, 'utf8')),
    );

    it('the set of modules importing capacity_modifiers is exactly the classified allowlist', () => {
        const expected = Object.keys(ALLOWED_IMPORTERS).sort();
        expect(importers.slice().sort()).toEqual(expected);
    });

    it('every allowlisted importer still exists and still imports the module', () => {
        // Catches a stale allowlist entry left behind after a consumer was removed.
        for (const path of Object.keys(ALLOWED_IMPORTERS)) {
            expect(SRC_FILES, `${path}: allowlisted but no longer present in src/`).toContain(path);
            expect(
                IMPORTS_READER.test(readFileSync(path, 'utf8')),
                `${path}: allowlisted but no longer imports capacity_modifiers — remove the entry`,
            ).toBe(true);
        }
    });
});

describe('collapse consumer manifest — §6: no edge multiplier reaches combat', () => {
    it('nothing under src/sim/combat/ references getEdgeCapacityMultiplier', () => {
        // The edge multiplier is min(mult_a, mult_b), so it can carry a COLLAPSED neighbour's
        // value onto an edge touching a protected enclave OSID. G1 is own-OSID-only and does
        // NOT neutralize that. It is tolerable today solely because no combat path reads it.
        // If this fails, the §6 edge residual has reached combat and must be re-ruled by the
        // panel before merge — see the residual note in phase3d_collapse_resolution.ts.
        // LIVENESS COUNT (napkin 0i): assert HOW MUCH was compared, not only that violations
        // were zero. `offenders` is [] both when combat is clean and when COMBAT_FILES is
        // empty — a filter over an empty set is a green test that asserted nothing. Pinning
        // the scanned count here keeps this assertion honest even if the guard describe-block
        // above is ever deleted.
        expect(COMBAT_FILES.length, 'scanned zero combat files — this assertion would be vacuous')
            .toBeGreaterThan(50);
        const offenders = COMBAT_FILES.filter((f) => IMPORTS_EDGE_MULTIPLIER.test(readFileSync(f, 'utf8')));
        expect(offenders, `edge multiplier reached combat in: ${offenders.join(', ')}`).toEqual([]);
    });

    it('the single combat consumer uses the own-OSID reader, not an edge reader', () => {
        const src = readFileSync('src/sim/combat/attack_resolution_osid.ts', 'utf8');
        expect(/\bgetCollapseDefenderMultiplier\b/.test(src)).toBe(true);
        expect(IMPORTS_EDGE_MULTIPLIER.test(src)).toBe(false);
    });
});

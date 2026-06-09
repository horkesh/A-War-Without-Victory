/**
 * Collapse Phase I — §6 GUARD G2 invariant (spec §4.2).
 *
 * G2 is the defense-in-depth regression that asserts the genocide-rupture floor is
 * intact: with collapse in the pipeline, (a) Srebrenica falls to RS, (b) the
 * `srebrenica_genocide_1995` rupture records at turn ≥ 140, (c) Žepa falls to RS,
 * (d) Goražde + Bihać are HELD by RBiH at Dayton.
 *
 * In Phase I the pipeline is DISABLED at runtime, so this passes trivially — it is the
 * GATE that must stay green when Phase III flips collapse ON (G1 keeps collapse inert on
 * every §6 OSID, so the floor must not move). The test reads the most recent 188w run
 * artifact under runs/ when present; if none exists it SKIPS (CI without a 188w run),
 * keeping the suite fast while remaining the durable enable-gate.
 *
 * Determinism: reads only persisted artifacts; no RNG/clock.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RUNS_DIR = join(process.cwd(), 'runs');

function latest188wRunDir(): string | null {
    if (!existsSync(RUNS_DIR)) return null;
    const dirs = readdirSync(RUNS_DIR)
        .filter(d => d.startsWith('apr1992_definitive_188w__'))
        .map(d => join(RUNS_DIR, d))
        .filter(p => {
            try { return statSync(p).isDirectory() && existsSync(join(p, 'final_save.json')); }
            catch { return false; }
        });
    if (dirs.length === 0) return null;
    // Most-recently-modified 188w run dir (deterministic given a fixed fs snapshot).
    dirs.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    return dirs[0];
}

function politicalState(finalSave: Record<string, unknown>): Record<string, unknown> {
    const direct = finalSave.political as Record<string, unknown> | undefined;
    if (direct) return direct;
    const nested = (finalSave.state as { political?: Record<string, unknown> })?.political;
    return nested ?? {};
}

function politicalControllers(finalSave: Record<string, unknown>): Record<string, string | null> {
    return (politicalState(finalSave).political_controllers as Record<string, string | null>) ?? {};
}

function ruptureConsequences(finalSave: Record<string, unknown>): Array<{ id: string; recorded_turn: number }> {
    const direct = (finalSave.military as { negotiation?: { rupture_consequences?: Array<{ id: string; recorded_turn: number }> } })?.negotiation?.rupture_consequences;
    if (direct) return direct;
    const nested = (finalSave.state as { military?: { negotiation?: { rupture_consequences?: Array<{ id: string; recorded_turn: number }> } } })?.military?.negotiation?.rupture_consequences;
    return nested ?? [];
}

// Protected enclave OSID capitals (every ENCLAVE_DEFINITIONS family — 6 RBiH + 3 HRHB).
// Panel O-1 = include-HRHB: the guard covers EVERY enclave from getEnclaveDefForOsid.
const PROTECTED_ENCLAVE_OSIDS = [
    'op:srebrenica:srebrenica_2',
    'op:rogatica:zepa_2',
    'op:gorazde:gorazde_2',
    'op:bihac:bihac_2',
    'op:centar_sarajevo:centar_sarajevo',
    'op:ugljevik:teocak_krstac_2',
    'op:kiseljak:kiseljak_2',
    'op:vitez:vitez_2',
    'op:zepce:zepce_2',
];

describe('collapse Phase I — §6 GUARD G2 invariant (188w rupture floor)', () => {
    const runDir = latest188wRunDir();

    it.runIf(runDir !== null)('Srebrenica + Žepa FALL to RS; Goražde/Bihać/Sarajevo/Teočak HELD by RBiH', () => {
        const finalSave = JSON.parse(readFileSync(join(runDir!, 'final_save.json'), 'utf8')) as Record<string, unknown>;
        const pc = politicalControllers(finalSave);

        // Srebrenica + Žepa fell (genocide-rupture enclaves).
        expect(pc['op:srebrenica:srebrenica_2']).toBe('RS');
        expect(pc['op:rogatica:zepa_2']).toBe('RS');

        // Never-fell RBiH enclaves held at Dayton. (Sarajevo is a PREFIX enclave — the
        // logical capital_osid 'centar_sarajevo:centar_sarajevo' is not a painted OSID;
        // assert the real RBiH-held core cell instead.)
        expect(pc['op:gorazde:gorazde_2']).toBe('RBiH');
        expect(pc['op:bihac:bihac_2']).toBe('RBiH');
        expect(pc['op:centar_sarajevo:sarajevo_dio_centar_sajarevo']).toBe('RBiH');
        expect(pc['op:ugljevik:teocak_krstac_2']).toBe('RBiH');
    });

    it.runIf(runDir !== null)('srebrenica_genocide_1995 rupture records at recorded_turn ≥ 160 (guards the [140,160) gap)', () => {
        const finalSave = JSON.parse(readFileSync(join(runDir!, 'final_save.json'), 'utf8')) as Record<string, unknown>;
        const ruptures = ruptureConsequences(finalSave);
        const genocide = ruptures.find(r => r.id === 'srebrenica_genocide_1995');
        expect(genocide, 'srebrenica_genocide_1995 rupture must be recorded').toBeDefined();
        // Panel directive #3(iv): >= 160, not just >= 140 — guards the [140,160) gap.
        expect(genocide!.recorded_turn).toBeGreaterThanOrEqual(160);
        // And the enclave actually flipped RS.
        expect(politicalControllers(finalSave)['op:srebrenica:srebrenica_2']).toBe('RS');
    });

    it.runIf(runDir !== null)('G1 proof: every protected enclave OSID — NO collapse_damage, NO capacity_modifier, will_not_recover NOT set', () => {
        const finalSave = JSON.parse(readFileSync(join(runDir!, 'final_save.json'), 'utf8')) as Record<string, unknown>;
        const pol = politicalState(finalSave);
        const collapseDamage = (pol.collapse_damage as { by_entity?: Record<string, unknown> })?.by_entity ?? {};
        const capacityMods = (pol.capacity_modifiers as { by_sid?: Record<string, unknown> })?.by_sid ?? {};
        const trends = (pol.loss_of_control_trends as { by_settlement?: Record<string, { will_not_recover?: boolean }> })?.by_settlement ?? {};

        // Panel directive #3(i)(ii)(iii): per protected OSID assert (i) NO collapse_damage
        // entry [the load-bearing inertness proof — presence ALONE, even at damage 0, trips
        // will_not_recover], (ii) NO capacity_modifier, (iii) will_not_recover NOT set.
        // In a DISABLED Phase-I run these maps are empty/absent; this gate becomes
        // load-bearing when Phase III enables collapse.
        for (const osid of PROTECTED_ENCLAVE_OSIDS) {
            expect(collapseDamage[osid], `collapse_damage must not contain ${osid}`).toBeUndefined();
            expect(capacityMods[osid], `capacity_modifiers must not contain ${osid}`).toBeUndefined();
            expect(trends[osid]?.will_not_recover ?? false, `will_not_recover must be false for ${osid}`).toBe(false);
        }
    });

    // PHASE-III EXTENSION (documented; not runnable from a single DISABLED Phase-I artifact):
    // panel directive #3(iv)(v) require a collapse-ON vs collapse-OFF comparison —
    //   (iv) srebrenica_genocide_1995 recorded_turn ≥ 160 AND timing-IDENTICAL ON vs OFF;
    //   (v)  srebrenica_enclave_formed / srebrenica_fell event-flags byte-identical ON vs OFF.
    // These are the gate for setEnablePhase3D(true) reaching a non-harness path (Phase III);
    // they require two runs (flag ON / flag OFF) and belong in the enable PR's calibration
    // harness, not in this disabled-build proof. Flagged in the build spec §4.2.
    it('documents the gate when no 188w run artifact is present', () => {
        // Always-on marker so the suite records that G2 exists even on a fresh checkout.
        // The substantive assertions above run whenever a 188w run dir is present.
        expect(true).toBe(true);
    });
});

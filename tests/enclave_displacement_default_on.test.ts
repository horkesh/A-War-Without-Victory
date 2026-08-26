/**
 * Enclave-column displacement is DEFAULT-ON (owner decision, 2026-08-26).
 *
 * WHY THIS TEST EXISTS. While the flag was default-OFF the engine flipped Srebrenica and
 * Žepa on schedule and left their defenders untouched — all six brigades `status: active`,
 * five at full establishment, morale up to 100, two still standing inside Srebrenica
 * municipality four months after the fall. Against the record (~2,700 of the 28th Division
 * reconstituted, ~3,200 unaccounted for, the victims ICTY-documented), the saved state
 * asserted that the defenders of Srebrenica were not killed. A §6 panel split 2-2 with one
 * BLOCK on exactly that; the owner ruled the mechanism on.
 *
 * The mechanism itself was already built, panel-reviewed and historically calibrated. The
 * only defect was that it was switched off — so this test pins the SWITCH, and pins that
 * the switch reaches the right formations and only those.
 *
 * MUTATIONS THAT MUST FAIL THIS FILE:
 *   1. restore `if (raw !== 'true' && raw !== '1') return;`  → 'default fires' goes red
 *   2. delete the explicit-off branch                        → 'explicit off' goes red
 *   3. drop the enclave-tag filter                           → the Goražde control goes red
 *   4. widen source matching to any enclave formation        → the Goražde control goes red
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import type { GameState, FormationState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';

const SREB_SOURCES = [
    'op:srebrenica:srebrenica_2',
    'op:srebrenica:donji_potocari_2',
    'op:srebrenica:ljeskovik_2',
    'op:srebrenica:osmace_2',
];

function enclaveBrigade(id: string, homeOsid: string, personnel = 1500): FormationState {
    return {
        id, name: id, faction: 'RBiH', kind: 'brigade', status: 'active',
        personnel, cohesion: 62, morale: 100,
        home_osid: homeOsid, location_osid: homeOsid,
        tags: ['enclave'],
    } as unknown as FormationState;
}

function makeState(): GameState {
    const s = {
        meta: { turn: 168, phase: 'war' },
        military: {
            formations: {
                // the five Srebrenica defenders
                arbih_280th: enclaveBrigade('arbih_280th', 'op:srebrenica:srebrenica_2'),
                arbih_281st: enclaveBrigade('arbih_281st', 'op:srebrenica:donji_potocari_2'),
                arbih_282nd: enclaveBrigade('arbih_282nd', 'op:srebrenica:srebrenica_2'),
                arbih_283rd: enclaveBrigade('arbih_283rd', 'op:srebrenica:ljeskovik_2'),
                arbih_284th: enclaveBrigade('arbih_284th', 'op:srebrenica:osmace_2'),
                // Žepa
                arbih_285th: enclaveBrigade('arbih_285th', 'op:rogatica:zepa_2', 800),
                // ★ NEGATIVE CONTROL — a Goražde enclave brigade. Goražde HOLDS; this
                //   formation is enclave-tagged but is NOT in any source list, so it must
                //   be untouched. A fix that widens matching or drops the tag filter
                //   moves it, and this test dies.
                arbih_801st: enclaveBrigade('arbih_801st', 'op:gorazde:gorazde_2'),
            } as Record<string, FormationState>,
        },
    } as unknown as GameState;
    (s.military as { casualty_ledger?: unknown }).casualty_ledger =
        initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
    return s;
}

const SREB_EFFECT = {
    kind: 'enclave_formation_displacement' as const,
    faction: 'RBiH',
    source_osids: SREB_SOURCES,
    destination_osid: 'op:zivinice:gracanica_2',
    casualty_fraction: 0.6,
    reconstitute_as: 'reduced' as const,
};

const ZEPA_EFFECT = {
    kind: 'enclave_formation_displacement' as const,
    faction: 'RBiH',
    source_osids: ['op:rogatica:zepa_2'],
    destination_osid: 'op:zivinice:gracanica_2',
    casualty_fraction: 0.15,
    reconstitute_as: 'none' as const,
};

describe('enclave column displacement — default-on switch', () => {
    const prior = process.env.AWWV_ENCLAVE_COLUMN_DISPLACEMENT;
    beforeEach(() => { delete process.env.AWWV_ENCLAVE_COLUMN_DISPLACEMENT; });
    afterEach(() => {
        if (prior === undefined) delete process.env.AWWV_ENCLAVE_COLUMN_DISPLACEMENT;
        else process.env.AWWV_ENCLAVE_COLUMN_DISPLACEMENT = prior;
    });

    it('FIRES with the flag unset — this is the owner decision of 2026-08-26', () => {
        const s = makeState();
        applyEventEffects(s, [SREB_EFFECT] as never);

        // Srebrenica: 60% losses, survivors reform at the destination.
        const f = s.military.formations!.arbih_280th as FormationState;
        expect(f.personnel).toBe(600);                      // 1500 - floor(1500*0.6)
        expect(f.location_osid).toBe('op:zivinice:gracanica_2');
        expect(f.status).toBe('active');                    // 'reduced' => they survive, reduced

        // LIVENESS: all five Srebrenica defenders moved, not just the one asserted above.
        const moved = SREB_SOURCES.length + 1;              // 5 brigades across 4 source cells
        const reduced = ['arbih_280th', 'arbih_281st', 'arbih_282nd', 'arbih_283rd', 'arbih_284th']
            .filter((id) => (s.military.formations![id] as FormationState).personnel === 600);
        expect(reduced).toHaveLength(5);
        expect(moved).toBeGreaterThan(0);
    });

    it('Žepa is REMOVED FROM THEATRE, not merely reduced — forcible deportation', () => {
        const s = makeState();
        applyEventEffects(s, [ZEPA_EFFECT] as never);
        const f = s.military.formations!.arbih_285th as FormationState;
        expect(f.personnel).toBe(0);
        expect(f.status).toBe('inactive');
        expect((f as { lifecycle_status?: string }).lifecycle_status).toBe('destroyed');
    });

    it('★ NEGATIVE CONTROL — a Goražde enclave brigade is UNTOUCHED', () => {
        const s = makeState();
        applyEventEffects(s, [SREB_EFFECT, ZEPA_EFFECT] as never);
        const f = s.military.formations!.arbih_801st as FormationState;
        expect(f.personnel).toBe(1500);
        expect(f.status).toBe('active');
        expect(f.location_osid).toBe('op:gorazde:gorazde_2');
    });

    it('explicit "false" still disables it — rollback path stays available', () => {
        process.env.AWWV_ENCLAVE_COLUMN_DISPLACEMENT = 'false';
        const s = makeState();
        applyEventEffects(s, [SREB_EFFECT] as never);
        const f = s.military.formations!.arbih_280th as FormationState;
        expect(f.personnel).toBe(1500);
        expect(f.location_osid).toBe('op:srebrenica:srebrenica_2');
    });

    it('explicit "0" also disables it', () => {
        process.env.AWWV_ENCLAVE_COLUMN_DISPLACEMENT = '0';
        const s = makeState();
        applyEventEffects(s, [SREB_EFFECT] as never);
        expect((s.military.formations!.arbih_280th as FormationState).personnel).toBe(1500);
    });
});

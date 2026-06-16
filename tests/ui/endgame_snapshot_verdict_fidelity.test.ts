// @vitest-environment jsdom
/**
 * D2-readiness — frozen endgame_snapshot → verdict-UI fidelity proof (task #43).
 *
 * The owner's first human read of the terminal verdict screen is the D2
 * start→Dayton playthrough. By then the campaign has frozen its verdict into
 * `state.meta.endgame_snapshot` (freezeEndgameSnapshot, 3 termination writers).
 * When the player loads that save, the verdict UI must render *what the snapshot
 * says* — no recompute, no mutation, no precision loss.
 *
 * THE GAP THIS TEST CLOSES (vs. existing endgame UI tests):
 *   - endgame_snapshot_freeze.test.ts proves the snapshot is WRITTEN.
 *   - endgame_save_load_round_trip.test.ts proves the snapshot JSON-round-trips.
 *   - endgame_verdict_screen_mount.test.ts proves the components render from a
 *     hand-built LoadedGameState.
 *   - NONE of them exercise the real integration path that D2 actually walks:
 *         meta.endgame_snapshot  →  parseGameState (the real adapter)
 *                                →  LoadedGameState  →  VerdictScreen render.
 * This test walks that whole path with the REAL adapter and the REAL component,
 * and asserts the frozen snapshot's fields survive to the DOM unaltered.
 *
 * Proof classification: SNAPSHOT → ADAPTER → LIVE-MOUNT FIDELITY PROOF
 *   - Real parseGameState (no hand-built LoadedGameState short-cut)
 *   - Real VerdictScreen + real FactionReport + real WarCostSummary
 *   - renderToStaticMarkup produces inspectable HTML
 *
 * Fidelity is asserted against a Pyrrhic-Dayton snapshot modeled on the D2 prep
 * audit's terminal verdict (docs/40_reports/playtest/20260610_D2_PREP_AUDIT.md):
 * outcome_class failure, 3× grade C, genocide_condemnation on RS,
 * peace_dysfunction_index 98.1, and the war-cost figures.
 *
 * Determinism: pure synchronous; no Math.random / Date.now / I/O.
 * Calibration: test-only; reads no sim/scenario/CLI surface → byte-identical.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types';

// ── Test-controlled store (same idiom as endgame_verdict_screen_mount.test.ts) ─

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (s: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

vi.mock('../../src/ui/map/desktop/useIPC', () => ({
    useIPC: () => ({ isAvailable: false }),
}));

// Dynamic import after the store mock so VerdictScreen binds the mocked store.
// @ts-expect-error TS1378: top-level await is provided by vitest's ESM runtime.
const { VerdictScreen } = await import('../../src/ui/map/components/VerdictScreen');

// ── Frozen-snapshot fixture (faithful to the real EndgameSnapshot shape) ──────
//
// Models the D2 terminal Pyrrhic-Dayton verdict: outcome_class failure, 3× grade
// C, genocide_condemnation on RS, peace_dysfunction_index 98.1. The numbers are
// distinctive decimals so a render-time recompute or mutation would change them
// and the fidelity assertions would catch it.

function makeFactionVerdict(faction: string, ov?: Partial<FactionVerdict>): FactionVerdict {
    return {
        faction,
        pyrrhic_score: 44.4,
        grade: 'C',
        grade_description: `${faction} ended the war diminished — a frozen, partitioned peace`,
        capital_breakdown: {
            territory_controlled_pct: 33, territory_controlled_km2: 16700,
            military_casualties_inflicted: 21000, military_casualties_taken: 39000,
            operations_launched: 51, operations_successful: 17,
            refugees_created: 511000, refugees_received: 81000,
            civilians_under_protection: 151000, civilian_casualties_caused: 3100,
            peace_plans_accepted: [], peace_plans_rejected: [],
            enclaves_held: [], enclaves_lost: [],
            war_crimes_events: 0, combat_effective_brigades: 21,
        } as any,
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 50, grade: 'C' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 47, grade: 'C' },
            { dimension: 'international_standing', label: 'International Standing', score: 43, grade: 'C' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 49, grade: 'C' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 46, grade: 'C' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 41, grade: 'C' },
        ],
        outcome_class: 'failure' as any,
        condemnation_flags: [],
        ...ov,
    };
}

/** The frozen GameVerdict that the snapshot carries (D2 Pyrrhic-Dayton shape). */
function makeFrozenVerdict(): GameVerdict {
    return {
        outcome_type: 'dayton',
        outcome_label: 'Dayton — A Frozen Peace',
        turn: 188, date: '1995-11-21', duration_weeks: 188,
        faction_verdicts: {
            RBiH: makeFactionVerdict('RBiH', {
                pyrrhic_score: 48.2,
                grade_description: 'A multi-ethnic state survives, partitioned in all but name',
            }),
            RS: makeFactionVerdict('RS', {
                pyrrhic_score: 41.0,
                condemnation_flags: ['genocide_condemnation'],
                grade_description: 'Territorial control entrenched, but tainted by genocide',
            }),
            HRHB: makeFactionVerdict('HRHB', {
                pyrrhic_score: 44.0,
                grade_description: 'The junior partner exits the Federation diminished',
            }),
        },
        // D3 keystone — mirrored onto the verdict at freeze time. 98.1 per the
        // D2 prep audit. (See the dedicated finding test below: this value is
        // carried faithfully through the adapter but the VerdictScreen does NOT
        // render it; dysfunction is surfaced on the negotiation modal, not here.)
        peace_dysfunction_index: 98.1,
        peace_dysfunction_flags: ['entity_autonomy_max', 'brcko_arbitration'],
    } as GameVerdict;
}

/**
 * A minimal-but-faithful raw GameState that carries ONLY a frozen
 * endgame_snapshot as its verdict source — exactly the D2 reality (load a Dayton
 * final_save; the adapter prefers the frozen snapshot over recompute). The
 * military/political stubs are the minimum parseGameState requires; the verdict,
 * cost ledger and historical comparison live only in meta.endgame_snapshot.
 */
function makeRawDaytonSaveWithSnapshot(): unknown {
    const verdict = makeFrozenVerdict();
    return {
        schema_version: 36,
        meta: {
            turn: 188, phase: 'war', date: '1995-11-21', seed: 'd2-fidelity', round: 0,
            game_over: true, outcome: 'dayton',
            endgame_snapshot: {
                frozen_turn: 188,
                outcome: 'dayton',
                verdict,
                cost_ledger: {
                    war_duration_weeks: 188,
                    total_military_killed: 46500,
                    total_civilian_killed: 38000,
                    entries: [],
                    rupture_consequences: [
                        { id: 'srebrenica_genocide_1995', perpetrator_faction: 'RS', description: 'Fall of the Srebrenica safe area' },
                    ],
                    findings: [
                        {
                            id: 'rupture_srebrenica_genocide_1995',
                            category: 'rupture', severity: 'rupture', faction: 'RS',
                            title: 'Srebrenica genocide',
                            text: 'The ledger records the Srebrenica genocide after the fall of the safe area.',
                            sources: ['ICTY Krstic IT-98-33-T', 'ICJ Bosnia v. Serbia (2007)'],
                        },
                    ],
                },
                historical_comparison: {
                    duration_delta_weeks: 6,
                    territory_divergence: { RS: 9.0, RBiH_HRHB_Federation: -9.0 },
                    casualty_ratio: 0.85, displacement_ratio: 0.9, rupture_divergence: [],
                    divergence_notes: [
                        'War lasted 6 weeks longer than the historical 182 weeks',
                        'Srebrenica genocide occurred as in the historical war',
                    ],
                    milestone_comparison: [],
                },
                peace_dysfunction_index: 98.1,
                peace_dysfunction: { index: 98.1, components: {}, flags: ['entity_autonomy_max'] },
            },
        },
        military: { formations: {}, militia_pools: {} },
        political: { political_controllers: {} },
    };
}

function adaptViaRealAdapter(): LoadedGameState {
    return parseGameState(makeRawDaytonSaveWithSnapshot());
}

function renderVerdictScreen(): string {
    return renderToStaticMarkup(createElement(VerdictScreen));
}

// ════════════════════════════════════════════════════════════════════════════
// LAYER 1 — Adapter fidelity: the frozen snapshot reaches LoadedGameState intact.
// (The integration boundary D2 walks: parseGameState prefers the frozen snapshot
//  over recompute when game_over is true — no mutation, no precision loss.)
// ════════════════════════════════════════════════════════════════════════════

describe('endgame_snapshot → adapter fidelity (parseGameState)', () => {
    it('prefers the frozen snapshot verdict by identity (no recompute, no copy/mutation)', () => {
        const raw = makeRawDaytonSaveWithSnapshot() as any;
        const frozenVerdict = raw.meta.endgame_snapshot.verdict;
        const loaded = parseGameState(raw);
        // Object identity proves the adapter passes the FROZEN object through,
        // rather than recomputing or cloning (which is where drift would enter).
        expect(loaded.gameVerdict).toBe(frozenVerdict);
        expect(loaded.costLedger).toBe(raw.meta.endgame_snapshot.cost_ledger);
        expect(loaded.historicalComparison).toBe(raw.meta.endgame_snapshot.historical_comparison);
    });

    it('carries outcome class + 3× grade C + condemnation + peace_dysfunction_index + war cost without loss', () => {
        const loaded = adaptViaRealAdapter();
        const fv = loaded.gameVerdict!.faction_verdicts;
        expect(loaded.gameVerdict!.outcome_label).toBe('Dayton — A Frozen Peace');
        expect([fv.RBiH.grade, fv.RS.grade, fv.HRHB.grade]).toEqual(['C', 'C', 'C']);
        expect([fv.RBiH.outcome_class, fv.RS.outcome_class, fv.HRHB.outcome_class])
            .toEqual(['failure', 'failure', 'failure']);
        expect(fv.RS.condemnation_flags).toEqual(['genocide_condemnation']);
        expect(fv.RBiH.condemnation_flags).toEqual([]);
        // peace_dysfunction_index survives on the verdict mirror (precision kept).
        expect(loaded.gameVerdict!.peace_dysfunction_index).toBe(98.1);
        // War-cost figures survive exactly.
        expect(loaded.costLedger!.total_military_killed).toBe(46500);
        expect(loaded.costLedger!.total_civilian_killed).toBe(38000);
        expect(loaded.costLedger!.war_duration_weeks).toBe(188);
    });

    it('preserves the full 6-dimension capital breakdown per faction', () => {
        const loaded = adaptViaRealAdapter();
        const dims = loaded.gameVerdict!.faction_verdicts.RBiH.dimension_grades;
        expect(dims.map(d => d.dimension)).toEqual([
            'military_credibility', 'territorial_legitimacy', 'international_standing',
            'patron_confidence', 'internal_cohesion', 'negotiating_leverage',
        ]);
        // Scores carried verbatim (no rounding/normalization at the boundary).
        expect(dims.find(d => d.dimension === 'negotiating_leverage')!.score).toBe(41);
    });
});

// ════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Screen fidelity: VerdictScreen renders what the snapshot says.
// (Real component, real React hooks; state produced by the real adapter above.)
// ════════════════════════════════════════════════════════════════════════════

describe('VerdictScreen renders the frozen snapshot faithfully (D2 verdict UI)', () => {
    beforeEach(() => { storeState = { loadedGameState: adaptViaRealAdapter() }; });

    it('mounts and shows the frozen outcome label', () => {
        const h = renderVerdictScreen();
        expect(h.length).toBeGreaterThan(500);
        expect(h).toContain('Dayton');
        expect(h).toContain('Frozen Peace');
        // The cinematic header echoes the snapshot's outcome_label.
        expect(h).toContain('data-awwv-endgame-outcome="Dayton — A Frozen Peace"');
    });

    it('renders all three faction tabs with the snapshot grades and Failure outcome badges', () => {
        const h = renderVerdictScreen();
        expect(h).toContain('ARBiH');
        expect(h).toContain('VRS');
        expect(h).toContain('HVO');
        // Three Failure badges (one per faction tab) come straight from the snapshot.
        const failureTabBadges = h.match(/data-awwv-faction-tab-outcome="[^"]+"[^>]*>Failure</g) ?? [];
        expect(failureTabBadges).toHaveLength(3);
    });

    it('renders the selected faction (RBiH) pyrrhic score + grade description from the snapshot', () => {
        const h = renderVerdictScreen();
        expect(h).toContain('48.2');                 // RBiH pyrrhic_score
        expect(h).toContain('Pyrrhic Score');
        expect(h).toContain('multi-ethnic state survives');
    });

    it('renders the 6-dimension capital-spend breakdown for the selected faction', () => {
        const h = renderVerdictScreen();
        expect(h).toContain('Military Credibility');
        expect(h).toContain('Territorial Legitimacy');
        expect(h).toContain('International Standing');
        expect(h).toContain('Patron Confidence');
        expect(h).toContain('Internal Cohesion');
        expect(h).toContain('Negotiating Leverage');
    });

    it('surfaces the genocide condemnation record from the snapshot — atrocity is recorded, never hidden', () => {
        const h = renderVerdictScreen();
        // The prosecutorial Srebrenica finding (from cost_ledger.findings) renders
        // in War Cost — proof the §6 record reaches the screen from the snapshot.
        expect(h).toContain('Srebrenica genocide');
        expect(h).toContain('ICTY Krstic IT-98-33-T');
    });

    it('renders the war-cost figures (military + civilian killed, duration) from the snapshot cost ledger', () => {
        const h = renderVerdictScreen();
        expect(h).toContain('War Cost');
        // toLocaleString() output varies by locale (46,500 or 46.500).
        expect(h).toMatch(/46[,.]500/);
        expect(h).toMatch(/38[,.]000/);
        expect(h).toContain('188 weeks');
    });

    it('renders the historical divergence notes from the snapshot comparison, in order', () => {
        const h = renderVerdictScreen();
        expect(h).toContain('6 weeks longer');
        expect(h).toContain('Srebrenica genocide occurred');
        expect(h.indexOf('6 weeks longer')).toBeLessThan(h.indexOf('Srebrenica genocide occurred'));
    });
});

// ════════════════════════════════════════════════════════════════════════════
// LAYER 3 — RS faction-detail fidelity via direct FactionReport mount.
// The full-screen default tab is RBiH; to assert the RS condemnation NOTICE (not
// just the tab badge) reaches the DOM, mount FactionReport with the snapshot's RS
// verdict directly. This proves the condemnation surface renders from snapshot data.
// ════════════════════════════════════════════════════════════════════════════

describe('RS faction-detail condemnation surface (snapshot → FactionReport)', () => {
    it('renders the International Condemnation notice for the RS snapshot verdict', async () => {
        const { FactionReport } = await import('../../src/ui/map/components/VerdictScreen');
        const loaded = adaptViaRealAdapter();
        const rsVerdict = loaded.gameVerdict!.faction_verdicts.RS;
        const h = renderToStaticMarkup(createElement(FactionReport, {
            verdict: rsVerdict,
            factionOsids: 300,
            totalOsids: 712,
            brigadeCount: 30,
            personnel: 80000,
        }));
        expect(h).toContain('International Condemnation');
        expect(h).toContain('genocide');           // from verdict.condemnation.genocide label
        expect(h).toContain('tribunal');
        // RS grade + outcome from the snapshot, on the detail card.
        expect(h).toContain('41.0');               // RS pyrrhic_score
        expect(h).toContain('Failure');
    });
});

// ════════════════════════════════════════════════════════════════════════════
// FINDING (documented, NON-BLOCKING) — peace_dysfunction_index does NOT render on
// the terminal verdict screen.
//
// The keystone D3 metric (98.1) is frozen into the snapshot and carried faithfully
// onto verdict.peace_dysfunction_index by the adapter (Layer 1 asserts this), but
// NO terminal verdict React surface (VerdictScreen / CinematicVerdict /
// WarCostSummary) reads it. It is surfaced earlier, on the Dayton NEGOTIATION
// modal (DaytonNegotiationModal / daytonReadouts.ts) as a live FLOOR while the
// player shapes the settlement — by design, dysfunction is presented at the table,
// not re-shown at the verdict. This test PINS that reality so it is a deliberate,
// reviewed choice rather than a silent gap; if a future change is expected to
// surface the final index on the verdict screen, this test will flag the change.
// ════════════════════════════════════════════════════════════════════════════

describe('FINDING: peace_dysfunction_index is carried but not rendered on the verdict screen', () => {
    it('the frozen index survives onto the verdict (adapter) ...', () => {
        const loaded = adaptViaRealAdapter();
        expect(loaded.gameVerdict!.peace_dysfunction_index).toBe(98.1);
    });

    it('... but the rendered verdict screen does NOT display the 98.1 index (documented choice)', () => {
        storeState = { loadedGameState: adaptViaRealAdapter() };
        const h = renderVerdictScreen();
        // Documents current behavior: the terminal verdict screen omits the index.
        // (Dysfunction is shown on the negotiation modal, not the verdict screen.)
        expect(h).not.toContain('98.1');
    });
});

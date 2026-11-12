/**
 * DC A6 follow-up 1 (Pyrrhic panel 2026-11-09; historian, sensitive-history, canon and
 * game-design seats, unanimous with conditions). An RS capture of Srebrenica before the
 * genocide window escaped every condemnation, and A6 made the capture pay at the table.
 *  1. The end of the war re-runs the rupture check before the verdict is frozen.
 *  2. A faction gets no territory credit for an enclave it overran (map unchanged).
 *  3. "Survived" only while RBiH holds the enclave; otherwise "overrun", never the 1995 record.
 * No new condemnation flag (counterfactual silence, SHDG §2 criterion 3).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FactionId, GameState } from '../src/state/game_state.js';
import type { GameVerdict } from '../src/state/negotiation_types.js';
import { deserializeState } from '../src/state/serialize.js';
import { ENCLAVE_DEFINITIONS } from '../src/sim/combat/enclave_resilience.js';
import { computeNegotiationBreakdown } from '../src/sim/negotiation/compute_capital.js';
import { computeFactionVerdict } from '../src/sim/negotiation/scoring.js';
import { applyPeaceSettlement } from '../src/sim/negotiation/peace_settlement.js';
import { creditedTerritoryPct, overrunEnclaveCells, overrunEnclaveSharePct } from '../src/sim/negotiation/enclave_credit.js';
import { freezeEndgameSnapshot } from '../src/sim/endgame/endgame_snapshot.js';
import { applyWarTermination } from '../src/sim/war_termination.js';
import { buildCostLedger } from '../src/sim/endgame/cost_ledger.js';
import { compareToHistorical, SREBRENICA_OVERRUN_NOTE } from '../src/sim/endgame/endgame_comparison.js';
import { buildGhostEntries } from '../src/sim/codex/dynamic_section_builder.js';
import { buildDelegationFolder } from '../src/sim/negotiation/delegation_folder.js';
import historicalBaseline from '../data/reference/historical_baseline.json';
import { withoutComments } from './helpers/sourceComments.js';

// The committed final save of the historical 188-week run (restored after every run).
const SAVE = resolve(process.cwd(), 'data/derived/latest_run_final_save.json');
const painted = JSON.parse(readFileSync(resolve(process.cwd(), 'data/source/calibration/painted_control_oct1995.json'), 'utf8'))
    .by_settlement_id as Record<string, FactionId>;
const def = (id: string) => ENCLAVE_DEFINITIONS.find(e => e.id === id)!;
const SREB = def('srebrenica');
const RANK = ['A+', 'A', 'B', 'C', 'D', 'F'];

/** The final campaign save, reopened at a given turn as the RS player, with one enclave's holder set. */
function variant(opts: { turn?: number; holder?: FactionId; enclave?: string; formed?: boolean; mode?: 'historical' | 'emergent' } = {}): GameState {
    const s = deserializeState(readFileSync(SAVE, 'utf8'));
    if (opts.turn !== undefined) s.meta.turn = opts.turn;
    if (opts.mode) s.meta.decision_mode = opts.mode as never;
    s.meta.player_faction = 'RS' as never;
    delete s.military.negotiation!.settlement;
    s.meta.game_over = false;
    delete (s.meta as { endgame_snapshot?: unknown }).endgame_snapshot;
    const e = def(opts.enclave ?? 'srebrenica');
    const ctl = s.political!.political_controllers!;
    if (opts.holder) for (const o of e.osid_list ?? []) ctl[o] = opts.holder;
    s.military.event_flags = { ...(s.military.event_flags ?? {}), srebrenica_enclave_formed: opts.formed ?? true };
    s.military.negotiation!.rupture_consequences = [];
    computeNegotiationBreakdown(s);
    return s;
}

describe('1. the end of the war re-runs the rupture check before the verdict freezes', () => {
    it('a Srebrenica capture standing at turn 160 on the final turn lands genocide in the frozen verdict', () => {
        const s = variant({ turn: 160, holder: 'RS' });
        applyWarTermination(s, { game_over: true, outcome: 'faction_collapse:test', winner: null, trigger: 'faction_collapse' });
        expect(s.military.negotiation!.rupture_consequences!.map(r => r.id)).toEqual(['srebrenica_genocide_1995']);
        const rs = (s.meta.endgame_snapshot!.verdict as GameVerdict).faction_verdicts.RS!;
        expect(rs.condemnation_flags).toContain('genocide_condemnation');
    });

    it('is idempotent, and records nothing before turn 160', () => {
        const s = variant({ turn: 160, holder: 'RS' });
        freezeEndgameSnapshot(s);
        delete (s.meta as { endgame_snapshot?: unknown }).endgame_snapshot;
        freezeEndgameSnapshot(s);
        expect(s.military.negotiation!.rupture_consequences).toHaveLength(1);
        const early = variant({ turn: 150, holder: 'RS' });
        freezeEndgameSnapshot(early);
        expect(early.military.negotiation!.rupture_consequences).toEqual([]);
    });

    it('never re-checks a save whose snapshot is already frozen', () => {
        const s = variant({ turn: 170, holder: 'RS' });
        (s.meta as { endgame_snapshot?: unknown }).endgame_snapshot = { frozen_turn: 150, outcome: 'old' };
        freezeEndgameSnapshot(s);
        expect(s.military.negotiation!.rupture_consequences).toEqual([]);
    });

    it('every writer that ends the war goes through the freeze', () => {
        for (const file of ['src/sim/war_termination.ts', 'src/sim/negotiation/peace_plans.ts', 'src/sim/negotiation/dayton_negotiation.ts', 'src/sim/endgame/owed_termination_records.ts']) {
            expect(withoutComments(readFileSync(resolve(process.cwd(), file), 'utf8')), file).toContain('freezeEndgameSnapshot(state)');
        }
    });
});

describe('2. no territory credit for an overrun enclave', () => {
    const grade = (s: GameState, f: string) => computeFactionVerdict(s, f);

    for (const enclave of ['srebrenica', 'zepa', 'gorazde']) {
        for (const turn of [30, 120, 159, 170]) {
            for (const mode of ['historical', 'emergent'] as const) {
                it(`capturing ${enclave} at turn ${turn} (${mode}) never improves the capturer's grade or territory`, () => {
                    const held = variant({ turn, holder: 'RBiH', enclave, mode });
                    const taken = variant({ turn, holder: 'RS', enclave, mode });
                    const a = grade(held, 'RS');
                    const b = grade(taken, 'RS');
                    expect(RANK.indexOf(b.grade)).toBeGreaterThanOrEqual(RANK.indexOf(a.grade));
                    expect(b.capital_breakdown!.territory_controlled_pct).toBeCloseTo(a.capital_breakdown!.territory_controlled_pct, 9);
                });
            }
        }
    }

    it('also on the signed Dayton map, which still gives the enclave to its holder', () => {
        const held = variant({ holder: 'RBiH' });
        const taken = variant({ holder: 'RS' });
        for (const s of [held, taken]) applyPeaceSettlement(s, 'dayton');
        const rawGain = taken.military.negotiation!.settlement!.territory_pct!.RS! - held.military.negotiation!.settlement!.territory_pct!.RS!;
        expect(rawGain).toBeGreaterThan(0.3); // the map does move it (A6 measurement: +0.37)
        const a = grade(held, 'RS').capital_breakdown!.territory_controlled_pct;
        const b = grade(taken, 'RS').capital_breakdown!.territory_controlled_pct;
        expect(b).toBeLessThanOrEqual(a + 1e-9);
    });

    it('treats any faction other than the defender as the overrunner, and never a defender or a plan assignment', () => {
        const front: Record<string, FactionId> = { ...painted };
        for (const o of SREB.osid_list ?? []) front[o] = 'HRHB';
        expect(overrunEnclaveCells(front, front, 'HRHB')).toEqual([...(SREB.osid_list ?? [])].sort());
        expect(overrunEnclaveCells(front, front, 'RBiH')).toEqual([]);
        // A plan map giving RS an enclave its defenders held on the front is not an overrun.
        const held: Record<string, FactionId> = { ...painted };
        for (const o of SREB.osid_list ?? []) held[o] = 'RBiH';
        const plan: Record<string, FactionId> = { ...held };
        for (const o of SREB.osid_list ?? []) plan[o] = 'RS';
        expect(overrunEnclaveCells(held, plan, 'RS').filter(o => (SREB.osid_list ?? []).includes(o))).toEqual([]);
        expect(overrunEnclaveSharePct(held, plan, 'RS')).toBeCloseTo(overrunEnclaveSharePct(held, held, 'RS'), 9);
    });

    it('leaves the historical Goražde alone: it never fell, though RS holds outlying cells', () => {
        const gorazde = def('gorazde');
        expect(painted[gorazde.capital_osid!]).toBe('RBiH');
        expect(overrunEnclaveSharePct(painted, painted, 'RS')).toBeGreaterThan(0); // Srebrenica and Žepa fell
        const cells = overrunEnclaveCells(painted, painted, 'RS');
        expect(cells.some(o => (gorazde.osid_list ?? []).includes(o))).toBe(false);
    });

    it('tells the player at the table, in the delegation folder', () => {
        const s = variant({ holder: 'RS' });
        const c = s.political!.political_controllers ?? {};
        expect(buildDelegationFolder(s)?.overrun_uncredited).toBe(overrunEnclaveCells(c, c, 'RS').length);
        expect(overrunEnclaveCells(c, c, 'RS').length).toBeGreaterThanOrEqual(SREB.osid_list!.length);
        const none = variant({ holder: 'RBiH' });
        for (const o of def('zepa').osid_list ?? []) none.political!.political_controllers![o] = 'RBiH';
        expect(buildDelegationFolder(none)?.overrun_uncredited).toBeUndefined();
    });
});

describe('3. "survived" only while RBiH holds the enclave', () => {
    const notes = (s: GameState) => compareToHistorical(buildCostLedger(s) as never, historicalBaseline as never).divergence_notes;

    it('an overrun with no rupture reads as overrun, not survived', () => {
        const n = notes(variant({ turn: 120, holder: 'RS' }));
        expect(n).toContain(SREBRENICA_OVERRUN_NOTE);
        expect(n).not.toContain('Srebrenica enclave survived');
    });

    it('the recorded rupture keeps precedence, and a held enclave survived', () => {
        const s = variant({ turn: 170, holder: 'RS' });
        freezeEndgameSnapshot(s);
        expect(notes(s)).toContain('Srebrenica genocide occurred');
        expect(notes(s)).not.toContain(SREBRENICA_OVERRUN_NOTE);
        expect(notes(variant({ turn: 120, holder: 'RBiH' }))).toContain('Srebrenica enclave survived');
    });

    it('the enclave_defended audit entry needs every capital in RBiH hands now', () => {
        const ghostIds = (s: GameState) => buildGhostEntries(s as never, s.meta.turn).map(g => g.ghost_id);
        const held = variant({ holder: 'RBiH' });
        for (const id of ['zepa', 'gorazde']) for (const o of def(id).osid_list ?? []) held.political!.political_controllers![o] = 'RBiH';
        held.military.event_flags = { ...held.military.event_flags, enclave_held_through_turn: true };
        const taken = structuredClone(held);
        taken.political!.political_controllers![SREB.capital_osid!] = 'RS';
        expect(ghostIds(held)).toContain('enclave_defended');
        expect(ghostIds(taken)).not.toContain('enclave_defended');
    });
});

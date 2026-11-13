import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { processLifecycleEvents, type LifecycleEventDef } from '../src/sim/formation_lifecycle_events.js';
import { getLocalizedFormationName, getFormationDesignation } from '../src/ui/map/data/formationNameLocalizations.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

const lifecycle = JSON.parse(readFileSync('data/source/formation_lifecycle_events.json', 'utf8')) as { events: LifecycleEventDef[] };
const oob = JSON.parse(readFileSync('data/source/oob_brigades.json', 'utf8')) as Array<{ id: string; name: string; corps: string }>;
const oobById = new Map(oob.map((b) => [b.id, b]));

/** The 3xx→7xx renumbering of the brigades that formed the ARBiH 7th Corps. */
const RENUMBER_TURN = 154; // 20 Mar 1995: Domet-1, the first source use of the 7xx numbers (BB1 pp.301-302).
const renames = lifecycle.events.filter((e) => e.type === 'rename' && e.trigger_condition === 'week');
const early = renames.filter((e) => e.until_turn != null);
const late = renames.filter((e) => e.until_turn == null);

function state(turn: number, formations: FormationState[]): GameState {
    return { meta: { turn, phase: 'war' }, military: { formations: Object.fromEntries(formations.map((f) => [f.id, f])) }, political: { political_controllers: {} } } as unknown as GameState;
}

function brigade(id: string, name: string): FormationState {
    return { id, faction: 'RBiH', name, created_turn: 0, status: 'active', assignment: null, kind: 'brigade', personnel: 1000 } as FormationState;
}

describe('rename until_turn', () => {
    const events: LifecycleEventDef[] = [
        { type: 'rename', formation_id: 'b', trigger_condition: 'week', trigger_turn: 10, new_name: '7xx', reason: '' },
        { type: 'rename', formation_id: 'b', trigger_condition: 'week', trigger_turn: 0, until_turn: 10, new_name: '3xx', reason: '' },
    ];
    it.each([[0, '3xx'], [9, '3xx'], [10, '7xx'], [50, '7xx']])('turn %i → %s, regardless of entry order', (turn, expected) => {
        for (const order of [events, [...events].reverse()]) {
            const s = state(turn, [brigade('b', 'oob name')]);
            processLifecycleEvents(s, order);
            expect(s.military.formations.b.name).toBe(expected);
        }
    });
    it('an event without until_turn keeps its old semantics', () => {
        const s = state(5, [brigade('b', 'x')]);
        processLifecycleEvents(s, [{ type: 'rename', formation_id: 'b', trigger_condition: 'week', trigger_turn: 3, new_name: 'y', reason: '' }]);
        expect(s.military.formations.b.name).toBe('y');
    });
});

describe('7th Corps 3xx→7xx designation data', () => {
    it('covers the ten historian-confirmed pairs; the 17th keeps its number and the 737th is not yet confirmed', () => {
        expect(early.map((e) => e.formation_id).sort()).toEqual([
            'arbih_705th_slavna_mountain', 'arbih_706th_muslim_mountain', 'arbih_707th_slavna_mountain', 'arbih_708th_mountain',
            'arbih_712th_mountain', 'arbih_717th_slavna_mountain', 'arbih_725th_light', 'arbih_727th_slavna',
            'arbih_733rd_mountain', 'arbih_770th_slavna_mountain',
        ]);
    });

    it('every early name holds from week 0 until the renumbering, and hands over to the exact OOB name', () => {
        for (const e of early) {
            expect(e.trigger_turn).toBe(0);
            expect(e.until_turn).toBe(RENUMBER_TURN);
            const successors = late.filter((l) => l.formation_id === e.formation_id);
            expect(successors).toHaveLength(1);
            expect(successors[0].trigger_turn).toBe(RENUMBER_TURN);
            // After the renumbering the engine name equals the OOB catalog name, so state matches main from then on.
            expect(successors[0].new_name).toBe(oobById.get(e.formation_id)?.name);
        }
    });

    it('never touches the OOB catalog names (they are the brigade sort key)', () => {
        for (const e of early) expect(oobById.get(e.formation_id)?.name).not.toBe(e.new_name);
    });

    it('every early name has a catalog historical designation, so BCS follows the engine name', () => {
        for (const e of early) {
            const row = getFormationDesignation(e.formation_id);
            const h = row?.historical_designations?.find((d) => d.english_gloss === e.new_name);
            expect(h, e.formation_id).toBeDefined();
            const f = { id: e.formation_id, kind: 'brigade', name: e.new_name! };
            expect(getLocalizedFormationName(f, 'bcs')).toBe(h!.official_bcs);
            expect(getLocalizedFormationName(f, 'en')).toBe(e.new_name);
        }
    });

    it('BCS shows the 7xx catalog name once the engine carries the 7xx name', () => {
        expect(getLocalizedFormationName({ id: 'arbih_705th_slavna_mountain', kind: 'brigade', name: '705th Mountain' }, 'bcs')).toBe('705. brdska brigada');
        expect(getLocalizedFormationName({ id: 'arbih_705th_slavna_mountain', kind: 'brigade', name: '305th Mountain' }, 'bcs')).toBe('305. brdska brigada');
    });
});

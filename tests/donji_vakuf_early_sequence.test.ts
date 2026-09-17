/**
 * Donji Vakuf, 1992 — the takeover belongs to April–June, not to a post-Jajce sweep.
 *
 * WHAT WAS WRONG. `Operation Donji Vakuf` listed `op:donji_vakuf:donji_vakuf_2` — the cell that
 * carries the town itself — as the fourth objective of a six-objective sweep that injects at w30
 * and captured it at w35 (7 December 1992). The town was Serb-held from 17 April 1992: the Serb
 * SJB was set up that day and "took control of the entire town the same day" (ICTY Stanišić &
 * Župljanin TJ Vol I §238; Krajišnik TJ §438). Balkan Battlegrounds has Vrbas 92's southern axis
 * running "from the direction of Serb-held Donji Vakuf (Srbobran)" with "the 19th at Donji Vakuf"
 * on its flank (BB2 printed p.330) — the town was the corps' own springboard for Jajce. The
 * engine had the VRS conquer its own rear area five months late.
 *
 * WHAT REPLACED IT. Three rows in `data/scenarios/events/war_1992.json`, on the documented dates,
 * through the event catalogue's existing `control_change` effect — the same writer the Tuzla
 * barracks seizure uses. Each carries a substantive predicate, so none of them is a calendar
 * event manufacturing control: the town row requires RS to already hold half the municipality,
 * and the two village rows require the town row to have fired AND the town to be RS-held.
 *
 * WHAT IS DELIBERATELY ABSENT. `op:donji_vakuf:prusac_2`. The only dated action there is the
 * attack of 17 August 1992, which FAILED — "by nightfall, after hand-to-hand combat, the Serbs
 * had to return to their original positions" (Stanišić TJ §242), corroborated by Brđanin
 * transcript 3 March 2003 pp. 15031-15034 and Exhibit P1757 (RS MUP Srbobran, 4 October 1993):
 * "the operation was not successful because of poor command and preparation." No event grants it,
 * and these tests fail if one ever does.
 */

import { describe, expect, it } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { evaluateCondition, triggerMatches } from '../src/sim/events/event_types.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import { _ALL_PRE_PLANNED as ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

const TOWN = 'op:donji_vakuf:donji_vakuf_2';
const KORENICI = 'op:donji_vakuf:korenici';
const TORLAKOVAC = 'op:donji_vakuf:torlakovac_2';
const PRUSAC = 'op:donji_vakuf:prusac_2';

const TAKEOVER = 'donji_vakuf_serb_takeover_1992';
const KORENICI_ROW = 'donji_vakuf_korenici_1992';
const TORLAKOVAC_ROW = 'donji_vakuf_torlakovac_1992';

const events = loadEventDefinitions(0);
const byId = (id: string): EventDefinition => {
    const found = events.find((def) => def.id === id);
    if (!found) throw new Error(`event not loaded: ${id}`);
    return found;
};

/** The ten Donji Vakuf operational cells, with the five that start RS. */
const RS_AT_START = [
    'op:donji_vakuf:babin_potok_2',
    'op:donji_vakuf:jemanlici',
    'op:donji_vakuf:komar_2',
    'op:donji_vakuf:kutanja',
    'op:donji_vakuf:pribraca_2',
];
const RBIH_AT_START = [TOWN, KORENICI, TORLAKOVAC, PRUSAC, 'op:donji_vakuf:oborci_2'];

function stateWith(controllers: Record<string, string>, turn: number, fired: string[] = []): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'dv-test', phase: 'war' },
        military: { formations: {}, fired_event_ids: fired },
        political: { political_controllers: { ...controllers } },
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

/** Turn N's boundary date is 1992-04-06 + 7N days (src/ui/map/utils/formatters.ts). */
function boundaryDate(turn: number): string {
    const d = new Date('1992-04-06T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + turn * 7);
    return d.toISOString().slice(0, 10);
}

const startControllers = Object.fromEntries([
    ...RS_AT_START.map((o) => [o, 'RS']),
    ...RBIH_AT_START.map((o) => [o, 'RBiH']),
]) as Record<string, string>;

describe('Donji Vakuf 1992 — the documented early sequence', () => {
    it('the three rows load, fire once, and carry their ICTY provenance', () => {
        for (const id of [TAKEOVER, KORENICI_ROW, TORLAKOVAC_ROW]) {
            const def = byId(id);
            expect(def.once, `${id} must be once-only`).toBe(true);
            expect(def.source_tier, `${id} source tier`).toBe('icty_icj_un');
            expect(def.historical_source, `${id} must cite its judgment`).toMatch(/ICTY/);
            expect(def.trigger.phase).toBe('war');
        }
    });

    it('each row changes exactly one cell, and only through the control_change effect', () => {
        const expected: Record<string, string> = {
            [TAKEOVER]: TOWN,
            [KORENICI_ROW]: KORENICI,
            [TORLAKOVAC_ROW]: TORLAKOVAC,
        };
        for (const [id, osid] of Object.entries(expected)) {
            const def = byId(id) as EventDefinition & { effect: { kind: string; faction: string; osids: string[] } };
            expect(def.effect.kind).toBe('control_change');
            expect(def.effect.faction).toBe('RS');
            expect(def.effect.osids).toEqual([osid]);
            // collectEffects() applies [def.effect, ...def.effects]; a control_change in both
            // would apply the flip twice and emit two ControlEvents for one historical act.
            const extra = (def.effects ?? []).filter((e) => e.kind === 'control_change');
            expect(extra, `${id} must not repeat its control_change in effects[]`).toEqual([]);
        }
    });

    it('the windows sit on the documented dates', () => {
        // 17 April 1992 is turn 2, but the cell also carries Blagaj, Ponjavići, Rastičevo, Rudina
        // and Vlađevići, for which only the municipality-wide May–September finding applies. The
        // window therefore opens at the start of that window (6 May mobilisation / 7 May flag),
        // not on the town's own date. This is a recorded limitation of the scalar aggregate.
        expect(byId(TAKEOVER).trigger.turn_min).toBe(5);
        expect(boundaryDate(5)).toBe('1992-05-11');
        // 21 May 1992 — Korenići attacked by 18 Donji Vakuf Serb police + 12 Banja Luka CSB.
        expect(byId(KORENICI_ROW).trigger.turn_min).toBe(7);
        expect(boundaryDate(7)).toBe('1992-05-25');
        // 3 June 1992 — Torlakovac attacked by Serb police and the VRS.
        expect(byId(TORLAKOVAC_ROW).trigger.turn_min).toBe(9);
        expect(boundaryDate(9)).toBe('1992-06-08');
        // All three close inside the "between May and September 1992" finding (§242).
        for (const id of [TAKEOVER, KORENICI_ROW, TORLAKOVAC_ROW]) {
            expect(byId(id).trigger.turn_max).toBe(25);
            expect(boundaryDate(25)).toBe('1992-09-28');
        }
    });

    it('the town row is contingent — it does not fire on a date alone', () => {
        const def = byId(TAKEOVER);
        // Holding half the municipality: predicate true.
        expect(evaluateCondition(def.trigger.condition!, stateWith(startControllers, 5))).toBe(true);
        // Strip RS down to two cells and the same turn no longer qualifies. If this ever passes,
        // the row has become a calendar event that manufactures control.
        const thin = { ...startControllers };
        for (const osid of RS_AT_START.slice(2)) thin[osid] = 'RBiH';
        expect(evaluateCondition(def.trigger.condition!, stateWith(thin, 5))).toBe(false);
    });

    it('the village rows require the town first, in the documented causal order', () => {
        for (const id of [KORENICI_ROW, TORLAKOVAC_ROW]) {
            const def = byId(id);
            expect(def.trigger.requires_events, `${id} must depend on the town row`).toContain(TAKEOVER);
            const turn = def.trigger.turn_min!;
            // Town still RBiH → predicate false even with the prerequisite fired.
            expect(
                triggerMatches(def, stateWith(startControllers, turn, [TAKEOVER]), turn),
                `${id} must not fire while the town is RBiH`,
            ).toBe(false);
            // Town RS and prerequisite fired → fires.
            const held = { ...startControllers, [TOWN]: 'RS' };
            expect(triggerMatches(def, stateWith(held, turn, [TAKEOVER]), turn)).toBe(true);
            // Prerequisite NOT fired → does not fire.
            expect(triggerMatches(def, stateWith(held, turn, []), turn)).toBe(false);
        }
    });

    it('no event anywhere in the catalogue grants Prusac to RS', () => {
        // The 17 August 1992 attack failed. Nothing may hand the cell over by decree; if RS is to
        // hold it, it must be won through the ordinary resolver.
        const granting = events.filter((def) => {
            const all = [(def as EventDefinition & { effect?: { kind: string; osids?: string[] } }).effect, ...(def.effects ?? [])];
            return all.some((e) => e && e.kind === 'control_change' && (e as { osids?: string[] }).osids?.includes(PRUSAC));
        });
        expect(granting.map((d) => d.id)).toEqual([]);
    });
});

describe('Operation Donji Vakuf — the town is no longer an objective', () => {
    const op = ALL_PRE_PLANNED.find((d) => d.name === 'Operation Donji Vakuf');

    it('the operation still exists, with both authored axes intact', () => {
        expect(op, 'Operation Donji Vakuf must not be deleted').toBeDefined();
        expect(op!.corps).toBe('vrs_1st_krajina');
        const axisIds = op!.axes.map((a) => a.axis_id).sort();
        expect(axisIds).toEqual(['donji_vakuf_sweep', 'vlasic_pocket']);
        for (const axis of op!.axes) {
            expect(axis.objectives.length, `${axis.axis_id} must not be emptied`).toBeGreaterThan(0);
            expect(axis.brigades.length, `${axis.axis_id} must keep its roster`).toBeGreaterThan(0);
        }
    });

    it('the sweep axis no longer claims the town, and keeps the rest of its chain', () => {
        const sweep = op!.axes.find((a) => a.axis_id === 'donji_vakuf_sweep')!;
        expect(sweep.objectives).not.toContain(TOWN);
        expect(sweep.objectives).toEqual([
            TORLAKOVAC,
            'op:donji_vakuf:babin_potok_2',
            'op:donji_vakuf:oborci_2',
            KORENICI,
            PRUSAC,
        ]);
    });

    it('the Vlašić axis keeps its own objective and is not repointed', () => {
        const vlasic = op!.axes.find((a) => a.axis_id === 'vlasic_pocket')!;
        expect(vlasic.objectives).toEqual(['op:travnik:gornje_krcevine']);
        expect(vlasic.staging_osid).toBe('op:travnik:varosluk');
    });

    it('no objective is claimed twice, and no brigade is committed to both axes', () => {
        const objectives = op!.axes.flatMap((a) => a.objectives);
        expect(new Set(objectives).size, 'duplicate objective across axes').toBe(objectives.length);
        const brigades = op!.axes.flatMap((a) => a.brigades);
        expect(new Set(brigades).size, 'brigade committed to two axes').toBe(brigades.length);
    });

    it('staging still reaches the first objective, and combat inputs are untouched', () => {
        const sweep = op!.axes.find((a) => a.axis_id === 'donji_vakuf_sweep')!;
        expect(sweep.staging_osid).toBe('op:sipovo:pribeljci_2');
        expect(sweep.objectives[0]).toBe(TORLAKOVAC);
        // The packet forbids buying this correction with combat values.
        expect(op!.execution_attack_power_mult).toBe(1.65);
        expect(op!.prestage_from).toBe(21);
        expect(op!.planning_duration).toBe(7);
        expect(op!.min_attack_outcome).toBe('repulsed');
    });

    it('the 1KK queue order is unchanged — Jajce is not accelerated to make room', () => {
        const names = ALL_PRE_PLANNED.filter((d) => d.corps === 'vrs_1st_krajina').map((d) => d.name);
        for (const expected of ['Operation Corridor', 'Operation Jajce', 'Operation Donji Vakuf']) {
            expect(names).toContain(expected);
        }
        const jajce = ALL_PRE_PLANNED.find((d) => d.name === 'Operation Jajce')!;
        expect(jajce.available_from, 'Op Jajce must keep emergent timing').toBeUndefined();
        expect(jajce.axes.flatMap((a) => a.objectives)).not.toContain(TOWN);
    });
});

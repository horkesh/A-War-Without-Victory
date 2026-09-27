/**
 * Donji Vakuf, 1992 — no authored ownership transfer. Standing regression guard.
 *
 * WHAT THIS GUARDS. On 2026-09-17 three rows were added to `data/scenarios/events/war_1992.json`
 * — `donji_vakuf_serb_takeover_1992`, `donji_vakuf_korenici_1992`, `donji_vakuf_torlakovac_1992`
 * — each carrying a `control_change` effect that granted a Donji Vakuf operational cell to RS on
 * a documented date. They were WITHDRAWN by owner rule: event-driven OSID ownership transfer is
 * not an authorized calibration lever for this municipality, and neither a historical citation, a
 * substantive predicate, a passing suite nor a higher January score can supply that authorization.
 * Only a separate explicit owner instruction naming the exception can.
 *
 * WHAT REMAINS OPEN, and is NOT what this file asserts. The town of Donji Vakuf was Serb-held from
 * 17 April 1992 — the Serb SJB was set up that day and "took control of the entire town the same
 * day" (ICTY Stanišić & Župljanin TJ Vol I §238; Krajišnik TJ §438), with Korenići on 21 May and
 * Torlakovac on 3 June (§242). The engine still captures the town at t35 (7 December 1992) as the
 * fourth objective of `Operation Donji Vakuf`. That chronology is WRONG and the defect is open.
 * These tests pin the mechanism, not the date: they say the fix may not be written into state.
 * A future repair belongs on the military-capability side — forces, orders, timing, reachability.
 *
 * PRUSAC stays in the guard for the same reason it was in the withdrawn file. The only dated
 * action there is the attack of 17 August 1992, which FAILED — "by nightfall, after hand-to-hand
 * combat, the Serbs had to return to their original positions" (Stanišić TJ §242), corroborated by
 * Exhibit P1757 (RS MUP Srbobran, 4 October 1993): "the operation was not successful because of
 * poor command and preparation". Nothing may grant that cell by authorship either.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { _ALL_PRE_PLANNED as ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';

const TOWN = 'op:donji_vakuf:donji_vakuf_2';
const KORENICI = 'op:donji_vakuf:korenici';
const TORLAKOVAC = 'op:donji_vakuf:torlakovac_2';
const PRUSAC = 'op:donji_vakuf:prusac_2';
const JEMANLICI = 'op:donji_vakuf:jemanlici';

/** The four cells the withdrawn experiment touched, plus the cell it was careful not to. */
const GUARDED_CELLS = [TOWN, KORENICI, TORLAKOVAC, PRUSAC];

/** The three withdrawn rows, by id. */
const WITHDRAWN_ROW_IDS = [
    'donji_vakuf_serb_takeover_1992',
    'donji_vakuf_korenici_1992',
    'donji_vakuf_torlakovac_1992',
];

/** Flags the withdrawn rows set; an equivalent grant must not reappear behind one of these. */
const WITHDRAWN_FLAGS = [
    'donji_vakuf_serb_sjb_control',
    'donji_vakuf_korenici_taken',
    'donji_vakuf_torlakovac_taken',
];

const EVENTS_DIR = resolve(__dirname, '..', 'data', 'scenarios', 'events');

function loadAllEventRows(): any[] {
    const files = readdirSync(EVENTS_DIR)
        .filter((f) => f.endsWith('.json'))
        .sort();
    const rows: any[] = [];
    for (const file of files) {
        const parsed = JSON.parse(readFileSync(resolve(EVENTS_DIR, file), 'utf-8'));
        if (!Array.isArray(parsed)) continue;
        for (const row of parsed) rows.push({ ...row, __file: file });
    }
    return rows;
}

/** Every effect object reachable from an event row: primary, additional, and per-response. */
function allEffectsOf(row: any): any[] {
    const out: any[] = [];
    if (row.effect) out.push(row.effect);
    if (Array.isArray(row.effects)) out.push(...row.effects);
    if (Array.isArray(row.response_options)) {
        for (const option of row.response_options) {
            if (option?.effect) out.push(option.effect);
            if (Array.isArray(option?.effects)) out.push(...option.effects);
        }
    }
    return out;
}

const allRows = loadAllEventRows();

describe('Donji Vakuf 1992 — the withdrawn takeover rows stay withdrawn', () => {
    it('none of the three withdrawn event ids exists in any catalogue file', () => {
        const present = allRows
            .filter((row) => WITHDRAWN_ROW_IDS.includes(row.id))
            .map((row) => `${row.id} (${row.__file})`);
        expect(present, 'the withdrawn Donji Vakuf takeover rows must not be reintroduced').toEqual([]);
    });

    it('no event anywhere grants a guarded Donji Vakuf cell to any faction', () => {
        const offenders: string[] = [];
        for (const row of allRows) {
            for (const effect of allEffectsOf(row)) {
                if (effect?.kind !== 'control_change') continue;
                const osids: string[] = Array.isArray(effect.osids) ? effect.osids : [];
                for (const osid of osids) {
                    if (GUARDED_CELLS.includes(osid)) {
                        offenders.push(`${row.id} (${row.__file}) → ${osid} to ${effect.faction}`);
                    }
                }
            }
        }
        expect(
            offenders,
            'Donji Vakuf control must change through the ordinary resolver, not through an event grant',
        ).toEqual([]);
    });

    it('no event sets one of the withdrawn flags, so no equivalent grant hides behind one', () => {
        const offenders: string[] = [];
        for (const row of allRows) {
            const flagSources = [row.sets_flags, ...(Array.isArray(row.response_options)
                ? row.response_options.map((option: any) => option?.sets_flags)
                : [])];
            for (const flags of flagSources) {
                if (!flags || typeof flags !== 'object') continue;
                for (const flag of Object.keys(flags)) {
                    if (WITHDRAWN_FLAGS.includes(flag)) {
                        offenders.push(`${row.id} (${row.__file}) sets ${flag}`);
                    }
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('no event mentions a guarded cell at all, in any effect kind', () => {
        // Broader than control_change: an ownership-equivalent write could be dressed as another
        // effect kind carrying the same osid. Donji Vakuf has no grandfathered event exception,
        // so the correct count here is zero and this assertion stays absolute.
        const offenders: string[] = [];
        for (const row of allRows) {
            for (const effect of allEffectsOf(row)) {
                const serialized = JSON.stringify(effect ?? null);
                for (const cell of GUARDED_CELLS) {
                    if (serialized.includes(cell)) {
                        offenders.push(`${row.id} (${row.__file}) → ${effect?.kind} mentions ${cell}`);
                    }
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('Donji Vakuf 1992 — initial control is not repainted to bypass the action', () => {
    // The owner rule bans "initial-control repainting used to bypass an in-campaign action" as
    // explicitly as it bans an event grant, and `osid_control_overrides` is that route. The 2026-09-17
    // closeout recorded this as an open residual: the event guard above does not cover it. It does now.
    //
    // SCOPED BY START DATE, not by file name. A scenario painted `apr1992` begins at or before the
    // 17 April 1992 takeover, so the town must be RBiH at t0 and any RS repaint there would be the
    // prohibited shortcut. Scenarios painted `jan1993` or `apr1995` begin after it, where RS ownership
    // is correct history and an override is legitimate — those are not guarded here.
    const SCENARIO_DIR = resolve(__dirname, '..', 'data', 'scenarios');

    const apr1992Scenarios = readdirSync(SCENARIO_DIR)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((file) => {
            try {
                return { file, parsed: JSON.parse(readFileSync(resolve(SCENARIO_DIR, file), 'utf-8')) };
            } catch {
                return null;
            }
        })
        .filter((entry): entry is { file: string; parsed: any } => entry !== null)
        .filter((entry) => entry.parsed?.init_control === 'apr1992');

    it('there are April-1992 scenarios to guard, so this suite cannot pass vacuously', () => {
        expect(apr1992Scenarios.length).toBeGreaterThan(0);
    });

    it('no April-1992 scenario pre-paints a guarded Donji Vakuf cell through osid_control_overrides', () => {
        const offenders: string[] = [];
        for (const { file, parsed } of apr1992Scenarios) {
            const overrides = parsed?.osid_control_overrides;
            if (!overrides || typeof overrides !== 'object') continue;
            for (const cell of GUARDED_CELLS) {
                if (cell in overrides) {
                    offenders.push(`${file} repaints ${cell} to ${overrides[cell]}`);
                }
            }
        }
        expect(
            offenders,
            'the town must be taken in campaign, not painted RS at t0 to close the mismatch',
        ).toEqual([]);
    });
});

describe('Operation Donji Vakuf — ordinary combat configuration stays bounded', () => {
    const op = ALL_PRE_PLANNED.find((candidate) => candidate.name === 'Operation Donji Vakuf');
    const sweep = op?.axes?.find((axis) => axis.axis_id === 'donji_vakuf_sweep');
    const prusac = op?.axes?.find((axis) => axis.axis_id === 'prusac_local');

    it('keeps Prusac and Jemanlići inside the existing operation on a local parallel axis', () => {
        expect(op, 'Operation Donji Vakuf must exist').toBeTruthy();
        expect(op!.corps).toBe('vrs_1st_krajina');
        expect(op!.faction).toBe('RS');
        expect(op!.axes.length).toBe(3);
        expect(sweep, 'the donji_vakuf_sweep axis must exist').toBeTruthy();
        expect(prusac, 'the prusac_local axis must exist').toBeTruthy();
        expect(prusac).toMatchObject({
            brigades: ['rs_19th_krajina_light_infantry', 'rs_31st_light_infantry'],
            objectives: [PRUSAC, JEMANLICI],
            staging_osid: 'op:donji_vakuf:pribraca_2',
        });
    });

    it('preserves every objective and brigade exactly once while the main sweep ends at Korenici', () => {
        expect(sweep!.objectives).toEqual([
            'op:donji_vakuf:torlakovac_2',
            'op:donji_vakuf:babin_potok_2',
            'op:donji_vakuf:oborci_2',
            TOWN,
            KORENICI,
        ]);
        expect(sweep!.brigades).toEqual([
            'rs_22nd_krajina_infantry',
            'rs_5th_kozara_light_infantry',
            'rs_16th_krajina_motorized',
        ]);

        const objectiveOccurrences = op!.axes.flatMap((axis) => axis.objectives);
        const brigadeOccurrences = op!.axes.flatMap((axis) => axis.brigades);
        expect(objectiveOccurrences).toHaveLength(8);
        expect(new Set(objectiveOccurrences).size).toBe(8);
        expect(objectiveOccurrences).toContain(PRUSAC);
        expect(objectiveOccurrences).toContain(JEMANLICI);
        expect(brigadeOccurrences).toHaveLength(7);
        expect(new Set(brigadeOccurrences).size).toBe(7);
    });

    it('preserves operation-level combat inputs and gives each combat axis its authored staging', () => {
        expect(op!.staging_osid).toBe('op:sipovo:pribeljci_2');
        expect(sweep!.staging_osid).toBe('op:sipovo:pribeljci_2');
        expect(prusac!.staging_osid).toBe('op:donji_vakuf:pribraca_2');
        expect(op!.execution_attack_power_mult).toBe(1.65);
        expect(op!.planning_duration).toBe(7);
        expect(op!.prestage_from).toBe(21);
        expect(op!.min_attack_outcome).toBe('repulsed');
    });

    it('no target-specific victory bonus was added for any guarded cell', () => {
        // A per-objective "win this battle" multiplier would be the same prohibited move in
        // another costume: the outcome assigned rather than resolved.
        const serialized = JSON.stringify(op);
        for (const cell of GUARDED_CELLS) {
            const index = serialized.indexOf(cell);
            if (index < 0) continue;
            const around = serialized.slice(Math.max(0, index - 200), index + 200);
            expect(around).not.toMatch(/mult|bonus|guarantee|force_capture/i);
        }
    });
});

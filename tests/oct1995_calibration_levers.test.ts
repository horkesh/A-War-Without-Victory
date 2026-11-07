import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    DONJI_VAKUF_95_OPPORTUNITY,
    TRESKAVICA_95_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_central_bosnia.js';
import { OPERATION_OPPORTUNITY_CATALOG } from '../src/sim/combat/operation_opportunities.js';
import { _ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';

const timeline = JSON.parse(readFileSync(resolve('data/scenarios/timelines/apr1992.json'), 'utf8'));

describe('October 1995 calibration levers (2026-11-06)', () => {
    it('caps the HVO Posavina corps at defensive from the Washington Agreement', () => {
        const hold = (timeline.patron_directives.HRHB as Array<Record<string, unknown>>)
            .filter((d) => (d.corps_ids as string[] | undefined)?.includes('hvo_northwest_bosnia'));
        expect(hold).toEqual([expect.objectContaining({
            name: 'Posavina Hold', start_week: 100, end_week: 999, stance_ceiling: 'defensive',
        })]);
    });

    it('authors Treskavica 95 as a catalog opportunity, not a pre-planned op', () => {
        // A pre-planned op reserves its brigades from turn 0 (getReservedPrePlannedBrigadeIds).
        expect(_ALL_PRE_PLANNED.some((def) => /Treskavica/.test(def.name))).toBe(false);
        expect(OPERATION_OPPORTUNITY_CATALOG).toContain(TRESKAVICA_95_OPPORTUNITY);
        expect(TRESKAVICA_95_OPPORTUNITY.axes.map((axis) => [axis.brigades, axis.objectives])).toEqual([
            [['arbih_4th_muslim_light'], ['op:konjic:sitnik']],
            [['arbih_443rd_mountain'], ['op:kalinovik:golubici_2']],
        ]);
        expect(TRESKAVICA_95_OPPORTUNITY.evaluators.date_window({} as never, 166, TRESKAVICA_95_OPPORTUNITY).green).toBe(false);
        expect(TRESKAVICA_95_OPPORTUNITY.evaluators.date_window({} as never, 167, TRESKAVICA_95_OPPORTUNITY).green).toBe(true);
    });

    it('gives Donji Vakuf 95 a one-brigade Paklarevo-Varosluk axis', () => {
        const axis = DONJI_VAKUF_95_OPPORTUNITY.axes.find((a) => a.axis_id === 'donji_vakuf_varosluk');
        expect(axis).toMatchObject({
            brigades: ['arbih_737th_muslim_light'],
            objectives: ['op:travnik:varosluk'],
            staging_osid: 'op:travnik:paklarevo',
        });
    });
});

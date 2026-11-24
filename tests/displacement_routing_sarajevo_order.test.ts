import { describe, expect, it } from 'vitest';

import { getDisplacementRouteForMun } from '../src/state/displacement_routing_data.js';

// A8 (SD12, lane B round 1, 2026-11-24): both displacement writers fill this list first-fit, each
// destination up to its cap. With novi_grad_sarajevo before novo_sarajevo, Novi Grad was never full
// when a cohort arrived, so RBiH-held Novo Sarajevo received 0 arrivals over 188 weeks: a modelling
// artefact of list order, not a historical claim. Novo Sarajevo now precedes Novi Grad. Known limit:
// first-fit still concentrates arrivals in list order, so Novi Grad now receives later.
describe('Sarajevo-ring Bosniak displacement route order (A8)', () => {
    it('routes Sarajevo-ring cohorts to Novo Sarajevo before Novi Grad', () => {
        expect(getDisplacementRouteForMun('ilidza', 'RBiH')).toEqual([
            'centar_sarajevo',
            'stari_grad_sarajevo',
            'novo_sarajevo',
            'novi_grad_sarajevo',
            'hadzici',
            'visoko',
            'zenica',
        ]);
    });

    it('routes nobody into RS-held Lukavica', () => {
        for (const origin of ['ilidza', 'ilijas', 'vogosca', 'pale', 'trnovo', 'hadzici']) {
            expect(getDisplacementRouteForMun(origin, 'RBiH')).not.toContain('lukavica');
        }
    });
});

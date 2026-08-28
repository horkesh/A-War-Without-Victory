import { describe, expect, it } from 'vitest';

import {
    AUTONOMY_CHOICES,
    getAutonomyCost,
    getAutonomyDefaultOptionId,
} from '../src/sim/negotiation/autonomy_instruments.js';
import { finalAutonomyCost } from '../src/sim/negotiation/dayton_dial_cost.js';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

describe('DIMENSION 6 — autonomy instruments', () => {
    it('every slot has exactly one free as-signed default', () => {
        for (const choice of AUTONOMY_CHOICES) {
            const defaults = choice.options.filter((o) => o.is_default);
            expect(defaults.length, choice.id).toBe(1);
            for (const faction of FACTIONS) {
                expect(getAutonomyCost(choice.id, defaults[0].id, faction), `${choice.id}/${faction}`).toBe(0);
            }
        }
    });

    it('an untouched proposal costs nothing under every dial', () => {
        // The historical settlement must stay byte-identical: adding a dimension
        // may not make the do-nothing path cost capital.
        for (const choice of AUTONOMY_CHOICES) {
            const def = getAutonomyDefaultOptionId(choice.id)!;
            for (const dial of ['confederation', 'dayton-historical', 'federalized', 'unitary'] as const) {
                for (const faction of FACTIONS) {
                    expect(finalAutonomyCost(choice.id, def, faction, dial)).toBe(0);
                }
            }
        }
    });

    it('every non-default option charges somebody', () => {
        for (const choice of AUTONOMY_CHOICES) {
            for (const option of choice.options.filter((o) => !o.is_default)) {
                const total = FACTIONS.reduce((sum, f) => sum + getAutonomyCost(choice.id, option.id, f), 0);
                expect(total, `${choice.id}/${option.id}`).toBeGreaterThan(0);
            }
        }
    });

    it('an autonomy instrument outweighs an ordinary competency flip', () => {
        // These four are what an entity IS, not an administrative allocation. The
        // dearest single competency deviation in the matrix is defense→state at 20
        // (competency_packages.ts); every autonomy instrument that touches parallel
        // relationships or citizenship must sit above that, or the dimension is just
        // a seventeenth competency.
        const DEAREST_COMPETENCY_FLIP = 20;
        expect(getAutonomyCost('aut_parallel_relations', 'defence_and_security', 'RBiH'))
            .toBeGreaterThan(DEAREST_COMPETENCY_FLIP);
        expect(getAutonomyCost('aut_parallel_relations', 'none', 'RS'))
            .toBeGreaterThan(DEAREST_COMPETENCY_FLIP);
        expect(getAutonomyCost('aut_entity_citizenship', 'entity_primary', 'RBiH'))
            .toBeGreaterThan(DEAREST_COMPETENCY_FLIP);
    });

    it('the dial multiplier applies with the same grain rule as other dimensions', () => {
        // Granting an entity a defence-level parallel relationship is ENTITY-ward.
        // Under confederation (entity-ward) it is discounted; under unitary
        // (state-ward) it is dear. Buying a centralizing frame must not make it
        // cheaper to hand an entity a standing tie to a neighbouring army.
        const underConfederation = finalAutonomyCost('aut_parallel_relations', 'defence_and_security', 'RBiH', 'confederation');
        const underUnitary = finalAutonomyCost('aut_parallel_relations', 'defence_and_security', 'RBiH', 'unitary');
        const base = getAutonomyCost('aut_parallel_relations', 'defence_and_security', 'RBiH');
        expect(underConfederation).toBeLessThan(base);
        expect(underUnitary).toBeGreaterThan(base);

        // ...and the mirror: severing parallel relations is STATE-ward, so it is
        // cheap under unitary and dear under confederation.
        expect(finalAutonomyCost('aut_parallel_relations', 'none', 'RS', 'unitary'))
            .toBeLessThan(finalAutonomyCost('aut_parallel_relations', 'none', 'RS', 'confederation'));
    });

    it('slot and option ids are unique across the dimension', () => {
        const slots = new Set<string>();
        for (const choice of AUTONOMY_CHOICES) {
            expect(slots.has(choice.id), `duplicate slot ${choice.id}`).toBe(false);
            slots.add(choice.id);
            const opts = new Set<string>();
            for (const o of choice.options) {
                expect(opts.has(o.id), `duplicate option ${choice.id}/${o.id}`).toBe(false);
                opts.add(o.id);
            }
        }
    });
});

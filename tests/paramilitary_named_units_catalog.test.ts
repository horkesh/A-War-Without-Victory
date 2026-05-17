import { describe, expect, it } from 'vitest';
import {
    PARAMILITARY_NAMED_UNITS,
    lookupParamilitaryNamedUnit,
} from '../data/source/oob/paramilitary_named_units.js';

describe('paramilitary named units catalog', () => {
    it('ships exactly five cited named perpetrator units', () => {
        expect(PARAMILITARY_NAMED_UNITS).toHaveLength(5);
        expect(PARAMILITARY_NAMED_UNITS.map((unit) => unit.name)).toEqual([
            'Patriotska Liga / Green Berets',
            'HOS',
            "Convicts' Battalion",
            "Arkan's Tigers",
            'White Eagles',
        ]);
        for (const unit of PARAMILITARY_NAMED_UNITS) {
            expect(unit.citation).toMatch(/BB1|ICTY/);
        }
    });

    it('looks up names deterministically by faction, mode, and spawn index', () => {
        const first = lookupParamilitaryNamedUnit('RS', 'offensive', 0, 3);
        const second = lookupParamilitaryNamedUnit('RS', 'offensive', 0, 3);
        const next = lookupParamilitaryNamedUnit('RS', 'offensive', 1, 3);

        expect(first?.name).toBe("Arkan's Tigers");
        expect(second).toEqual(first);
        expect(next?.name).toBe('White Eagles');
    });

    it('does not ship blocked Scorpions or Yellow Wasps entries', () => {
        const names = PARAMILITARY_NAMED_UNITS.map((unit) => unit.name);
        expect(names).not.toContain('Scorpions');
        expect(names).not.toContain('Skorpioni');
        expect(names).not.toContain('Yellow Wasps');
        expect(names).not.toContain('Zute Ose');
    });
});

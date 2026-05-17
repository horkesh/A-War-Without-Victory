import { describe, expect, it } from 'vitest';
import { HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992 } from '../src/scenario/historical_anchors.js';

describe('historical scenario anchor contract', () => {
    it('keeps Brka south of Brcko as the canonical RBiH anchor', () => {
        const brka = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.find(
            anchor => anchor.osid === 'op:brcko:brka_2',
        );

        expect(brka).toEqual({
            osid: 'op:brcko:brka_2',
            expected_controller: 'RBiH',
        });
    });

    it('does not contain duplicate OSID anchors', () => {
        const ids = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.map(anchor => anchor.osid);

        expect(new Set(ids).size).toBe(ids.length);
    });
});

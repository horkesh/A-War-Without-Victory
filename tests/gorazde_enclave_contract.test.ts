/**
 * Gorazde enclave defender availability contract.
 * Ensures the 5 early-war Gorazde brigades are available from turn 0,
 * preventing the enclave collapse discovered in the n1325 Drina coupling audit.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const OOB_PATH = path.resolve(__dirname, '../data/source/oob_brigades.json');

interface OobBrigade {
    id: string;
    faction: string;
    corps: string;
    home_osid: string;
    home_mun?: string;
    available_from: number;
    mandatory?: boolean;
    tags?: string[];
    initial_personnel?: number;
}

const GORAZDE_EARLY_BRIGADES = [
    'arbih_801st_light',
    'arbih_802nd_light',
    'arbih_808th_liberation',
    'arbih_843rd_light',
    'arbih_851st_vitezka_liberation',
];

describe('Gorazde enclave defender contract', () => {
    const oob: OobBrigade[] = JSON.parse(fs.readFileSync(OOB_PATH, 'utf8'));

    it('all 5 early-war Gorazde brigades exist in OOB', () => {
        for (const id of GORAZDE_EARLY_BRIGADES) {
            const found = oob.find(b => b.id === id);
            expect(found, `${id} missing from OOB`).toBeDefined();
        }
    });

    it('all 5 Gorazde brigades are available from turn 0', () => {
        for (const id of GORAZDE_EARLY_BRIGADES) {
            const bde = oob.find(b => b.id === id)!;
            expect(bde.available_from, `${id} available_from should be 0`).toBe(0);
        }
    });

    it('all 5 Gorazde brigades have enclave tag', () => {
        for (const id of GORAZDE_EARLY_BRIGADES) {
            const bde = oob.find(b => b.id === id)!;
            expect(bde.tags, `${id} missing tags`).toBeDefined();
            expect(bde.tags, `${id} missing enclave tag`).toContain('enclave');
        }
    });

    it('all 5 Gorazde brigades are mandatory', () => {
        for (const id of GORAZDE_EARLY_BRIGADES) {
            const bde = oob.find(b => b.id === id)!;
            expect(bde.mandatory, `${id} should be mandatory`).toBe(true);
        }
    });

    it('all 5 Gorazde brigades have home_osid in gorazde municipality', () => {
        for (const id of GORAZDE_EARLY_BRIGADES) {
            const bde = oob.find(b => b.id === id)!;
            expect(bde.home_osid, `${id} home_osid should be in gorazde`).toContain(':gorazde:');
        }
    });

    it('rastosnica_2 starts RBiH in the 40w scenario', () => {
        const scenarioPath = path.resolve(__dirname, '../data/scenarios/apr1992_definitive_40w.json');
        const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
        const ctrl = scenario.initial_osid_controllers?.['op:zvornik:rastosnica_2'];
        expect(ctrl, 'rastosnica_2 should start RBiH').toBe('RBiH');
    });
});

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type ScenarioFile = {
    initial_osid_controllers?: Record<string, string>;
};

type InitialMasterFile = {
    settlements: Array<{
        sid: string;
        political_controller?: string | null;
    }>;
};

const ROOT = process.cwd();
const SCENARIO_PATH = path.join(ROOT, 'data', 'scenarios', 'apr1992_definitive_40w.json');
const MASTER_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_initial_master.json');
const DOBOJ_EDGE_OSIDS = [
    'op:doboj:brijesnica_velika',
    'op:doboj:grapska_gornja_2',
    'op:doboj:klokotnica_2',
    'op:doboj:makljenovac',
    'op:doboj:matuzici_2',
];

const EAST_BOSNIA_RS_START_OSIDS = [
    'op:bratunac:bratunac_2',
    'op:bratunac:zapolje_2',
    'op:rudo:gornja_strmica',
    'op:visegrad:drinsko',
    'op:visegrad:kamenica_2',
    'op:visegrad:medjedja_2',
    'op:visegrad:prelovo_2',
    'op:visegrad:velji_lug',
    'op:visegrad:visegrad_2',
    'op:zvornik:donja_kamenica',
    'op:zvornik:krizevici',
];

describe('apr1992 Doboj initial control truth', () => {
    it('keeps the Doboj north rim aligned with the operational initial master', () => {
        const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8')) as ScenarioFile;
        const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as InitialMasterFile;
        const bySid = new Map(master.settlements.map((settlement) => [settlement.sid, settlement.political_controller ?? null]));

        for (const osid of DOBOJ_EDGE_OSIDS) {
            expect(scenario.initial_osid_controllers?.[osid]).toBe(bySid.get(osid));
            expect(scenario.initial_osid_controllers?.[osid]).toBe('RS');
        }
    });

    it('starts the Drina seizure corridor under RS while leaving enclave pockets to their own anchors', () => {
        const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8')) as ScenarioFile;

        for (const osid of EAST_BOSNIA_RS_START_OSIDS) {
            expect(scenario.initial_osid_controllers?.[osid], osid).toBe('RS');
        }
        expect(scenario.initial_osid_controllers?.['op:rogatica:zepa_2']).toBe('RBiH');
        expect(scenario.initial_osid_controllers?.['op:gorazde:gorazde_2']).toBe('RBiH');
    });
});

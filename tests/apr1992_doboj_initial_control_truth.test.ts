import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

type ScenarioFile = {
    osid_control_overrides?: Record<string, string>;
};

type InitialMasterFile = {
    settlements: Array<{
        sid: string;
        political_controller?: string | null;
    }>;
};

const ROOT = process.cwd();
const SCENARIO_PATH = path.join(ROOT, 'data', 'scenarios', 'apr1992_definitive_188w.json');
const MASTER_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_initial_master.json');
const DOBOJ_RS_EDGE_OSIDS = [
    'op:doboj:grapska_gornja_2',
    'op:doboj:makljenovac',
    'op:doboj:matuzici_2',
];

const DOBOJ_RBIH_PAINTER_ANCHORS = [
    'op:doboj:brijesnica_velika',
    'op:doboj:klokotnica_2',
];

describe('apr1992 Doboj initial control truth', () => {
    it('keeps the RS Doboj north rim aligned with the effective master-scenario start', () => {
        const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8')) as ScenarioFile;
        const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as InitialMasterFile;
        const bySid = new Map(master.settlements.map((settlement) => [settlement.sid, settlement.political_controller ?? null]));

        for (const osid of DOBOJ_RS_EDGE_OSIDS) {
            const effectiveController = scenario.osid_control_overrides?.[osid] ?? bySid.get(osid);
            expect(effectiveController, osid).toBe('RS');
        }
    });

    it('starts the Klokotnica and Brijesnica Velika painter anchors under RBiH in the master scenario', () => {
        const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8')) as ScenarioFile;
        const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as InitialMasterFile;
        const bySid = new Map(master.settlements.map((settlement) => [settlement.sid, settlement.political_controller ?? null]));

        for (const osid of DOBOJ_RBIH_PAINTER_ANCHORS) {
            const effectiveController = scenario.osid_control_overrides?.[osid] ?? bySid.get(osid);
            expect(effectiveController, osid).toBe('RBiH');
        }
    });

    it('inherits the April RBiH start at Drinsko and Medjedja in the master scenario', () => {
        const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8')) as ScenarioFile;
        const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as InitialMasterFile;
        const bySid = new Map(master.settlements.map((settlement) => [settlement.sid, settlement.political_controller ?? null]));

        expect(scenario.osid_control_overrides?.['op:visegrad:drinsko'] ?? bySid.get('op:visegrad:drinsko')).toBe('RBiH');
        expect(scenario.osid_control_overrides?.['op:visegrad:medjedja_2'] ?? bySid.get('op:visegrad:medjedja_2')).toBe('RBiH');
    });

});

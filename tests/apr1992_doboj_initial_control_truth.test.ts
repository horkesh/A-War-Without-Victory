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
const DOBOJ_EDGE_OSIDS = [
    'op:doboj:brijesnica_velika',
    'op:doboj:grapska_gornja_2',
    'op:doboj:klokotnica_2',
    'op:doboj:makljenovac',
    'op:doboj:matuzici_2',
];

// The retired standalone 40w fixture pre-painted the Drina seizure corridor RS via
// its 712-entry `initial_osid_controllers` map. The canonical 188w scenario has no
// such map: it starts from `operational_initial_master.json` and applies its
// `osid_control_overrides`. The corridor therefore starts RBiH (with only
// `op:rudo:gornja_strmica` overridden to RS) and the seizure must be earned by
// operations. This test pins the CANONICAL initial truth, not the retired painting.
const EAST_BOSNIA_CANONICAL_INITIAL_CONTROL: Array<[string, string]> = [
    ['op:bratunac:bratunac_2', 'RBiH'],
    ['op:bratunac:zapolje_2', 'RBiH'],
    ['op:rudo:gornja_strmica', 'RS'],
    ['op:visegrad:drinsko', 'RBiH'],
    ['op:visegrad:kamenica_2', 'RBiH'],
    ['op:visegrad:medjedja_2', 'RBiH'],
    ['op:visegrad:prelovo_2', 'RBiH'],
    ['op:visegrad:velji_lug', 'RBiH'],
    ['op:visegrad:visegrad_2', 'RBiH'],
    ['op:zvornik:donja_kamenica', 'RBiH'],
    ['op:zvornik:krizevici', 'RBiH'],
];

describe('apr1992 Doboj initial control truth', () => {
    function effectiveController(
        scenario: ScenarioFile,
        bySid: Map<string, string | null>,
        osid: string,
    ): string | null | undefined {
        return scenario.osid_control_overrides?.[osid] ?? bySid.get(osid);
    }

    it('keeps the Doboj north rim aligned with the operational initial master', () => {
        const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8')) as ScenarioFile;
        const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as InitialMasterFile;
        const bySid = new Map(master.settlements.map((settlement) => [settlement.sid, settlement.political_controller ?? null]));

        for (const osid of DOBOJ_EDGE_OSIDS) {
            expect(effectiveController(scenario, bySid, osid), osid).toBe(bySid.get(osid));
            expect(effectiveController(scenario, bySid, osid), osid).toBe('RS');
        }
    });

    it('starts the Drina corridor at its canonical initial control while leaving enclave pockets to their own anchors', () => {
        const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8')) as ScenarioFile;
        const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as InitialMasterFile;
        const bySid = new Map(master.settlements.map((settlement) => [settlement.sid, settlement.political_controller ?? null]));

        for (const [osid, expected] of EAST_BOSNIA_CANONICAL_INITIAL_CONTROL) {
            expect(effectiveController(scenario, bySid, osid), osid).toBe(expected);
        }
        expect(effectiveController(scenario, bySid, 'op:rogatica:zepa_2')).toBe('RBiH');
        expect(effectiveController(scenario, bySid, 'op:gorazde:gorazde_2')).toBe('RBiH');
    });
});

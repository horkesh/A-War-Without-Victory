import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RETAINED_40W_RUN = join(
    process.cwd(),
    'runs',
    'apr1992_definitive_40w__3649b3861a87e6ea__w40_n1864',
);

const WATCH_WINDOWS = [10, 20, 30, 40] as const;
const WATCH_OSIDS = {
    srebrenica: 'op:srebrenica:srebrenica_2',
    zepa: 'op:rogatica:zepa_2',
    gorazde: 'op:gorazde:gorazde_2',
    bihac: 'op:bihac:bihac_2',
} as const;

const EXPECTED_SUPPLY = {
    10: { srebrenica: 'critical', zepa: 'critical', gorazde: 'strained', bihac: 'strained' },
    20: { srebrenica: 'critical', zepa: 'critical', gorazde: 'strained', bihac: 'strained' },
    30: { srebrenica: 'critical', zepa: 'critical', gorazde: 'strained', bihac: 'strained' },
    40: { srebrenica: 'critical', zepa: 'critical', gorazde: 'strained', bihac: 'strained' },
} as const;

type WatchedName = keyof typeof WATCH_OSIDS;
type SupplyLevel = 'adequate' | 'strained' | 'critical';

function readJson(path: string): unknown {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function getFlatSupplyState(frame: unknown): Record<string, SupplyLevel> {
    const state = frame as { political?: { last_supply_state_by_osid?: Record<string, SupplyLevel> } };
    return state.political?.last_supply_state_by_osid ?? {};
}

function getControllers(frame: unknown): Record<string, string> {
    const state = frame as { political?: { political_controllers?: Record<string, string> } };
    return state.political?.political_controllers ?? {};
}

describe('supply sensitive-history smoke against retained 40w artifact', () => {
    it.skipIf(!existsSync(RETAINED_40W_RUN))(
        'keeps Srebrenica, Zepa, Gorazde, and Bihac supply windows unchanged when retained artifact is present',
        () => {
            const summary = readJson(join(RETAINED_40W_RUN, 'run_summary.json')) as { final_state_hash?: string };
            expect(summary.final_state_hash).toBe('c0d8212847398b8f');

            const frames = readJson(join(RETAINED_40W_RUN, 'replay_save_sequence.json')) as unknown[];
            expect(frames.length).toBeGreaterThanOrEqual(40);

            for (const week of WATCH_WINDOWS) {
                const frame = frames[week - 1]!;
                const supply = getFlatSupplyState(frame);
                const controllers = getControllers(frame);

                for (const name of Object.keys(WATCH_OSIDS) as WatchedName[]) {
                    const osid = WATCH_OSIDS[name];
                    expect(controllers[osid], `${name} controller at week ${week}`).toBe('RBiH');
                    expect(supply[osid], `${name} supply at week ${week}`).toBe(EXPECTED_SUPPLY[week][name]);
                }
            }
        },
    );
});

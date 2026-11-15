import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { buildReplayFrameSummary, turnToIsoDate } from '../src/sim/replay/replay_frame_summary.js';
import {
    buildReplaySaveManifest,
    playerVisibleReplayManifestJson,
    readReplayManifestFrames,
} from '../src/sim/replay/replay_manifest.js';
import { setLocale } from '../src/ui/map/i18n/index.js';
import { turnToDateString } from '../src/ui/map/utils/formatters.js';

function frame(turn: number, extra: Record<string, unknown> = {}): GameState {
    return {
        turn,
        military: {
            formations: {
                rs_1: { status: 'active' },
                rbih_1: { status: 'active' },
                hrhb_1: { status: 'inactive' },
            },
        },
        political: { political_controllers: { a: 'RS', b: 'RBiH' } },
        ...extra,
    } as unknown as GameState;
}

describe('RT5: manifest frame dates are filled from the turn', () => {
    it('gives a headless frame (no metadata) the date its turn opens', () => {
        expect(buildReplayFrameSummary(frame(0)).date).toBe('1992-04-06');
        expect(buildReplayFrameSummary(frame(1)).date).toBe('1992-04-13');
        expect(buildReplayFrameSummary(frame(4)).date).toBe('1992-05-04');
        expect(buildReplayFrameSummary(frame(187)).date).toBe('1995-11-06');
    });

    it('keeps a frame\'s own metadata.date when it has one', () => {
        expect(buildReplayFrameSummary(frame(4, { metadata: { turn: 4, date: '1992-04-15' } })).date).toBe('1992-04-15');
    });

    it('stays null when the frame has no readable turn', () => {
        expect(buildReplayFrameSummary({ military: { formations: {} } } as unknown as GameState).date).toBeNull();
    });

    it('is the same calendar as the UI date labels, week by week across the whole campaign', () => {
        setLocale('en');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let turn = 0; turn <= 400; turn++) {
            const [year, month, day] = turnToIsoDate(turn).split('-').map(Number);
            expect(`${day} ${months[month - 1]} ${year}`).toBe(turnToDateString(turn));
        }
    });

    it('is deterministic: the same turn always gives the same date', () => {
        expect(turnToIsoDate(100)).toBe(turnToIsoDate(100));
        expect(JSON.stringify(buildReplayFrameSummary(frame(9)))).toBe(JSON.stringify(buildReplayFrameSummary(frame(9))));
    });
});

describe('RT4: all-sides formation counts are hidden during play', () => {
    const manifestJson = JSON.stringify(buildReplaySaveManifest([
        buildReplayFrameSummary(frame(0)),
        buildReplayFrameSummary(frame(1)),
    ]));

    it('counts every side\'s active formations in the stored frames', () => {
        expect(buildReplayFrameSummary(frame(0)).activeFormations).toBe(2);
    });

    it('withholds the count from the renderer until the war is over', () => {
        const playing = readReplayManifestFrames(JSON.parse(playerVisibleReplayManifestJson(manifestJson, false) as string));
        expect(playing.map((f) => f.activeFormations)).toEqual([null, null]);
        expect(playing.map((f) => f.totalCasualties)).toEqual([null, null]);
        expect(playing.map((f) => f.date)).toEqual(['1992-04-06', '1992-04-13']);
    });

    it('reveals it at war end', () => {
        const over = readReplayManifestFrames(JSON.parse(playerVisibleReplayManifestJson(manifestJson, true) as string));
        expect(over.map((f) => f.activeFormations)).toEqual([2, 2]);
    });
});

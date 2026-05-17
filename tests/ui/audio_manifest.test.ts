import { describe, expect, it } from 'vitest';
import {
    getAllAudioCues,
    getAllCueIds,
    getCueConfig,
    type AudioCueCategory,
} from '../../src/ui/map/audio/sound_manifest.js';

const VALID_CATEGORIES = new Set<AudioCueCategory>(['ui', 'ambient', 'music', 'stinger']);

describe('audio sound manifest', () => {
    it('defines deterministic cue metadata for every registered cue', () => {
        const cues = getAllAudioCues();

        expect(cues.length).toBeGreaterThan(0);
        expect(cues.map((cue) => cue.id)).toEqual(getAllCueIds());

        for (const cue of cues) {
            expect(cue.id).toMatch(/^[a-z0-9_]+$/);
            expect(VALID_CATEGORIES.has(cue.category)).toBe(true);
            expect(cue.defaultVolume).toBeGreaterThanOrEqual(0);
            expect(cue.defaultVolume).toBeLessThanOrEqual(1);
            if (cue.filePath !== undefined) {
                expect(cue.filePath).toMatch(/^audio\//);
            }
            expect(getCueConfig(cue.id)).toEqual(cue);
        }
    });

    it('keeps cue ids sorted and unique', () => {
        const ids = getAllCueIds();

        expect(ids).toEqual([...ids].sort());
        expect(new Set(ids).size).toBe(ids.length);
    });
});

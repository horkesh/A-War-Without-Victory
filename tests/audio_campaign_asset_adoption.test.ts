import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { CAMPAIGN_MUSIC_IDS } from '../src/ui/map/audio/music_shuffle_bag.js';

it('binds every campaign binary to the owner-approved Revised v2 export without depending on ignored logs', () => {
    const audition = JSON.parse(readFileSync('docs/audio/CAMPAIGN_SUITE_TWO_AUDITION.json', 'utf8'));
    const provenance = JSON.parse(readFileSync('docs/audio/AUDIO_ASSET_PROVENANCE.json', 'utf8'));
    expect(audition.musical_approval.approved_bundle_sha256).toBe('bfa6bf05ac50e54695aaa6bc8bdce22a1d772d1e23823c6c5077348655e24536');
    expect(audition.tracks).toHaveLength(8);
    expect(audition.sample_library.commit).toBe('440300901dfe9275fd84e0b7763af1f8443ae62e');
    const cueIds = audition.tracks.map((track: { exports: { ogg: { path: string } } }) => 'campaign_' + track.exports.ogg.path.replace('.ogg', ''));
    expect(new Set(cueIds)).toEqual(new Set(CAMPAIGN_MUSIC_IDS));
    for (const track of audition.tracks) {
        const id = 'campaign_' + track.exports.ogg.path.replace('.ogg', '');
        const entry = provenance.cues[id];
        const bytes = readFileSync(entry.file);
        expect(bytes.length).toBe(track.exports.ogg.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(track.exports.ogg.sha256);
        expect(entry.original_sha256).toBe(track.exports.ogg.sha256);
        expect(entry.processed_sha256).toBe(track.exports.ogg.sha256);
        expect(entry.loudness_lufs).toBe(track.integrated_lufs);
        expect(entry.attribution).toContain('Ivy Audio / Simon Dalzell');
        expect(entry.license_note).toBe('docs/audio/LICENSES/campaign_suite_two.md');
    }
});

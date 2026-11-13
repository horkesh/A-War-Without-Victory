import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { CAMPAIGN_MUSIC_IDS } from '../src/ui/map/audio/music_shuffle_bag.js';

const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

// Owner 2026-11-13 ("Make them differ", then "Use a campaign track"): Lines on
// Paper loops as the menu theme; What Remains of Home joins the rotation.
const cueForSuiteTrack = (slug: string) => (slug === 'lines_on_paper' ? 'menu_theme' : 'campaign_' + slug);

it('binds every Revised v2 binary to the owner-approved export without depending on ignored logs', () => {
    const audition = JSON.parse(readFileSync('docs/audio/CAMPAIGN_SUITE_TWO_AUDITION.json', 'utf8'));
    const provenance = JSON.parse(readFileSync('docs/audio/AUDIO_ASSET_PROVENANCE.json', 'utf8'));
    expect(audition.musical_approval.approved_bundle_sha256).toBe('bfa6bf05ac50e54695aaa6bc8bdce22a1d772d1e23823c6c5077348655e24536');
    expect(audition.tracks).toHaveLength(8);
    expect(audition.sample_library.commit).toBe('440300901dfe9275fd84e0b7763af1f8443ae62e');
    for (const track of audition.tracks) {
        const slug = track.exports.ogg.path.replace('.ogg', '');
        const entry = provenance.cues[cueForSuiteTrack(slug)];
        const bytes = readFileSync(entry.file);
        expect(entry.file).toBe(`src/ui/map/assets/audio/music/${slug}.ogg`);
        expect(bytes.length).toBe(track.exports.ogg.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(track.exports.ogg.sha256);
        expect(entry.original_sha256).toBe(track.exports.ogg.sha256);
        expect(entry.processed_sha256).toBe(track.exports.ogg.sha256);
        expect(entry.loudness_lufs).toBe(track.integrated_lufs);
        expect(entry.attribution).toContain('Ivy Audio / Simon Dalzell');
        expect(entry.license_note).toBe(slug === 'lines_on_paper' ? 'docs/audio/LICENSES/menu_theme.md' : 'docs/audio/LICENSES/campaign_suite_two.md');
    }
    expect(provenance.cues.campaign_lines_on_paper).toBeUndefined();
});

it('keeps eight campaign tracks: seven Revised v2 tracks plus the full What Remains of Home theme', () => {
    const audition = JSON.parse(readFileSync('docs/audio/CAMPAIGN_SUITE_TWO_AUDITION.json', 'utf8'));
    const theme = JSON.parse(readFileSync('docs/audio/WHAT_REMAINS_OF_HOME_AUDITION.json', 'utf8'));
    const provenance = JSON.parse(readFileSync('docs/audio/AUDIO_ASSET_PROVENANCE.json', 'utf8'));
    const suiteCampaignIds = audition.tracks
        .map((track: { exports: { ogg: { path: string } } }) => track.exports.ogg.path.replace('.ogg', ''))
        .filter((slug: string) => slug !== 'lines_on_paper')
        .map((slug: string) => 'campaign_' + slug);
    expect(CAMPAIGN_MUSIC_IDS).toHaveLength(8);
    expect(new Set(CAMPAIGN_MUSIC_IDS)).toEqual(new Set([...suiteCampaignIds, 'campaign_what_remains_of_home']));
    expect(CAMPAIGN_MUSIC_IDS.includes('campaign_lines_on_paper')).toBe(false);

    const home = provenance.cues.campaign_what_remains_of_home;
    expect(home.file).toBe(theme.runtime_adoption.bundled_file);
    expect(sha256(home.file)).toBe(theme.runtime_adoption.bundled_sha256);
    expect(home.processed_sha256).toBe(theme.runtime_adoption.bundled_sha256);
    expect(home.license_note).toBe('docs/audio/LICENSES/campaign_what_remains_of_home.md');
    // The former menu binary stays recorded as the menu cue's previous version.
    expect(provenance.cues.menu_theme.previous_versions[0].processed_sha256).toBe(theme.runtime_adoption.bundled_sha256);
    // The opening is unchanged and is not part of the rotation.
    expect(provenance.cues.opening_titles.file).toBe('src/ui/map/assets/audio/music/what_remains_of_home_opening.ogg');
    expect(CAMPAIGN_MUSIC_IDS.includes('opening_titles')).toBe(false);
});

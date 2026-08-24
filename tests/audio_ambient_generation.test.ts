import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// @ts-expect-error The checked-in generator is an executable MJS recipe, not a TypeScript package.
import * as ambientGeneratorModule from '../tools/audio/generate_ambient_beds.mjs';

interface AmbientHarmonic {
    multiple: number;
}

interface AmbientRecipe {
    cueId: string;
    recipeId: string;
    seed: number;
    sampleRate: number;
    channels: number;
    durationSeconds: number;
    periodicBasis: string;
    contentTags: readonly string[];
    harmonics: readonly AmbientHarmonic[];
}

const {
    AMBIENT_BED_RECIPES,
    ambientBytesMatchSha256,
    DOCUMENTED_AUDIO_TOOLCHAIN,
    generateAmbientBed,
    OGG_ENCODING_ARGUMENTS,
    publishAmbientBedOgg,
    renderAmbientBedPcm16,
    validateDocumentedAudioToolchainVersions,
} = ambientGeneratorModule as {
    AMBIENT_BED_RECIPES: readonly AmbientRecipe[];
    ambientBytesMatchSha256: (bytes: Uint8Array, expectedSha256: string) => boolean;
    DOCUMENTED_AUDIO_TOOLCHAIN: Readonly<{ ffmpeg: string; ffprobe: string }>;
    generateAmbientBed: (cueId: string, options?: { outputDirectory?: string }) => Promise<string>;
    OGG_ENCODING_ARGUMENTS: readonly string[];
    publishAmbientBedOgg: (
        cueId: string,
        pcm: Uint8Array,
        options: {
            outputDirectory: string;
            encodeOgg: (inputPath: string, outputPath: string) => Promise<void>;
        },
    ) => Promise<string>;
    renderAmbientBedPcm16: (cueId: string) => Buffer;
    validateDocumentedAudioToolchainVersions: (versions: { ffmpeg: string; ffprobe: string }) => void;
};

const temporaryRoots: string[] = [];

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const REQUIRED_IDS = ['ambient_archive', 'ambient_field', 'ambient_warroom'];
const PROHIBITED_TAGS = new Set(['speech', 'music', 'weapon', 'gunfire', 'bombardment']);
const EXPECTED_PCM_SHA256: Readonly<Record<string, string>> = Object.freeze({
    ambient_archive: '0ad1c6fbf2c98aa570b1070842591fe9ab03bbf4bcfec7f6cf4e72d175a92583',
    ambient_field: '51a55f990a056c4ae3b2fcdf2ea82734487b13ed6f2473af5dc00fbd6352f366',
    ambient_warroom: '4deef2e87ad50ea084755264266ac2a9e3b1cd62375241a8c66f94942ac09295',
});

describe('deterministic ambient-bed generator', () => {
    it('exports exactly three fixed, loop-safe mono 48 kHz recipes', () => {
        expect(AMBIENT_BED_RECIPES.map((recipe) => recipe.cueId).sort()).toEqual(REQUIRED_IDS);
        expect(new Set(AMBIENT_BED_RECIPES.map((recipe) => recipe.cueId)).size).toBe(3);

        for (const recipe of AMBIENT_BED_RECIPES) {
            expect(recipe.sampleRate).toBe(48_000);
            expect(recipe.channels).toBe(1);
            expect(recipe.durationSeconds).toBeGreaterThan(0);
            expect(recipe.durationSeconds).toBeLessThanOrEqual(60);
            expect(Number.isSafeInteger(recipe.seed)).toBe(true);
            expect(recipe.recipeId).toMatch(/^awwv-restrained-ambient-v1-/u);
            expect(recipe.periodicBasis).toBe('integer_harmonics_full_loop');
            expect(recipe.harmonics.length).toBeGreaterThan(0);
            expect(recipe.harmonics.every((harmonic) => Number.isSafeInteger(harmonic.multiple) && harmonic.multiple > 0)).toBe(true);
            expect(recipe.contentTags.length).toBeGreaterThan(0);
            expect(recipe.contentTags.some((tag) => PROHIBITED_TAGS.has(tag))).toBe(false);
        }
    });

    it('rejects an unknown cue before creating output', async () => {
        await expect(generateAmbientBed('ambient_unknown')).rejects.toThrow(/unknown ambient cue/u);
    });

    it('pins FFmpeg to bit-exact OGG muxing without source metadata', () => {
        expect(OGG_ENCODING_ARGUMENTS).toEqual(expect.arrayContaining([
            '-fflags', '+bitexact',
            '-flags:a', '+bitexact',
            '-map_metadata', '-1',
            '-c:a', 'libvorbis',
            '-ar', '48000',
            '-ac', '1',
        ]));
    });

    it('accepts only the documented regeneration toolchain versions', () => {
        expect(() => validateDocumentedAudioToolchainVersions({
            ...DOCUMENTED_AUDIO_TOOLCHAIN,
        })).not.toThrow();
        expect(() => validateDocumentedAudioToolchainVersions({
            ffmpeg: `${DOCUMENTED_AUDIO_TOOLCHAIN.ffmpeg} Copyright (c) FFmpeg developers`,
            ffprobe: `${DOCUMENTED_AUDIO_TOOLCHAIN.ffprobe} Copyright (c) FFmpeg developers`,
        })).not.toThrow();
        expect(() => validateDocumentedAudioToolchainVersions({
            ...DOCUMENTED_AUDIO_TOOLCHAIN,
            ffmpeg: 'ffmpeg version drifted',
        })).toThrow(/unsupported ffmpeg toolchain/u);
    });

    it.each(REQUIRED_IDS)('renders deterministic canonical PCM for %s and rejects digest drift', (cueId) => {
        const firstBytes = renderAmbientBedPcm16(cueId);
        const secondBytes = renderAmbientBedPcm16(cueId);
        const manifest = JSON.parse(readFileSync(join(
            process.cwd(),
            'docs', 'audio', 'AUDIO_ASSET_PROVENANCE.json',
        ), 'utf8')) as { cues: Record<string, { original_sha256: string }> };
        const expectedSha256 = EXPECTED_PCM_SHA256[cueId];

        expect(firstBytes.equals(secondBytes)).toBe(true);
        expect(ambientBytesMatchSha256(firstBytes, expectedSha256)).toBe(true);
        expect(manifest.cues[cueId].original_sha256).toBe(expectedSha256);

        const driftedExpectedSha256 = `${expectedSha256.slice(0, -1)}${expectedSha256.endsWith('0') ? '1' : '0'}`;
        expect(ambientBytesMatchSha256(firstBytes, driftedExpectedSha256)).toBe(false);
    }, 60_000);

    it('preserves an existing destination when encoding fails and cleans its exact temporary root', async () => {
        const root = mkdtempSync(join(tmpdir(), 'awwv-ambient-publish-test-'));
        temporaryRoots.push(root);
        const destinationPath = join(root, 'ambient_archive.ogg');
        const existingBytes = Buffer.from('existing destination');
        writeFileSync(destinationPath, existingBytes);

        await expect(publishAmbientBedOgg('ambient_archive', Buffer.alloc(16), {
            outputDirectory: root,
            encodeOgg: async () => { throw new Error('controlled encoder failure'); },
        })).rejects.toThrow('controlled encoder failure');

        expect(readFileSync(destinationPath).equals(existingBytes)).toBe(true);
        expect(readdirSync(root)).toEqual(['ambient_archive.ogg']);
    });
});

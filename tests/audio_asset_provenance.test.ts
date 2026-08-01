import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

import {
    buildAudioAssetProvenanceReport,
    loadAudioAssetProvenanceReport,
    serializeAudioAssetProvenanceReport,
    type AudioAssetProvenanceInput,
} from '../tools/diagnostics/audio_asset_provenance.js';

interface FixtureCases {
    valid: AudioAssetProvenanceInput;
    invalid: AudioAssetProvenanceInput;
}

const fixture = JSON.parse(readFileSync(join(
    process.cwd(),
    'tests',
    'fixtures',
    'provenance',
    'audio_cases.json',
), 'utf8')) as FixtureCases;
const temporaryRoots: string[] = [];

function makeRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'awwv-audio-provenance-'));
    temporaryRoots.push(root);
    return root;
}

function writeBytes(root: string, relativePath: string, bytes: Uint8Array): string {
    const absolute = join(root, ...relativePath.split('/'));
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, bytes);
    return createHash('sha256').update(bytes).digest('hex');
}

function writeOggStub(root: string, relativePath: string): void {
    writeBytes(root, relativePath, Buffer.from('OggS'));
}

function violationCodes(report: ReturnType<typeof buildAudioAssetProvenanceReport>): string[] {
    return report.records.flatMap((record) => record.violations.map((violation) => violation.code));
}

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('audio asset provenance inventory', () => {
    it('accepts a fully attributed OggS container precheck and an explicit optional placeholder disposition', () => {
        const root = makeRoot();
        writeOggStub(root, 'src/ui/map/assets/audio/ui/cue_provided.ogg');
        writeBytes(root, 'docs/audio/LICENSES/cue_provided.md', new Uint8Array());

        const report = buildAudioAssetProvenanceReport({ ...fixture.valid, root_dir: root });

        expect(report.summary).toMatchObject({
            total_cues: 2,
            provided_cues: 1,
            placeholder_cues: 1,
            blocking_violations: 0,
        });
        expect(report.records.map((record) => record.cue_id)).toEqual([
            'cue_optional_placeholder',
            'cue_provided',
        ]);
        expect(report.records[1]).toMatchObject({
            cue_id: 'cue_provided',
            file: 'src/ui/map/assets/audio/ui/cue_provided.ogg',
            sha256: '68d9ed2adb24458ff173db06b41b9d1b6e228764c457030d63fad11b02bfae1e',
            duration_seconds: 0.25,
            loudness_lufs: -24,
            source_url: 'https://example.invalid/source',
            author: 'Example Author',
            license: 'CC0-1.0',
            attribution: 'Example Tone — Example Author — CC0 1.0',
            sensitive_content_class: 'neutral_ui',
            disposition: 'provided',
            violations: [],
        });
    });

    it('rejects a non-OGG payload even when its extension and recorded hash are valid', () => {
        const root = makeRoot();
        const file = 'src/ui/map/assets/audio/ui/cue_provided.ogg';
        const hash = writeBytes(root, file, Buffer.from('NOPE'));
        writeBytes(root, 'docs/audio/LICENSES/cue_provided.md', new Uint8Array());
        const manifest = structuredClone(fixture.valid.manifest);
        manifest.cues.cue_provided.original_sha256 = hash;
        manifest.cues.cue_provided.processed_sha256 = hash;

        const report = buildAudioAssetProvenanceReport({
            root_dir: root,
            cues: [fixture.valid.cues.find((cue) => cue.id === 'cue_provided')!],
            resolved_cue_ids: ['cue_provided'],
            manifest: { ...manifest, cues: { cue_provided: manifest.cues.cue_provided } },
        });

        expect(violationCodes(report)).toContain('invalid_ogg_container');
    });

    it('fails missing required beds, missing manifests/files, non-OGG assets, hash drift, NC licenses, and prohibited content', () => {
        const root = makeRoot();
        writeBytes(root, 'src/ui/map/assets/audio/stingers/cue_bad.mp3', new Uint8Array());

        const report = buildAudioAssetProvenanceReport({ ...fixture.invalid, root_dir: root });
        const codes = violationCodes(report);

        expect(codes).toEqual(expect.arrayContaining([
            'asset_hash_mismatch',
            'disallowed_license',
            'manifest_cue_orphaned',
            'missing_asset_file',
            'missing_duration',
            'missing_license_note',
            'missing_loudness',
            'missing_processing_command',
            'missing_provenance',
            'non_ogg_provided_asset',
            'prohibited_sensitive_content',
            'provided_asset_unresolved',
            'required_asset_missing',
        ]));
        expect(report.summary.blocking_violations).toBeGreaterThan(0);
    });

    it('reports an on-disk audio binary that is absent from the cue registry and sidecar', () => {
        const root = makeRoot();
        writeOggStub(root, 'src/ui/map/assets/audio/ui/orphan.ogg');

        const report = buildAudioAssetProvenanceReport({
            root_dir: root,
            cues: [],
            resolved_cue_ids: [],
            manifest: { schema_version: 1, cues: {} },
        });

        expect(report.records).toEqual(expect.arrayContaining([
            expect.objectContaining({
                cue_id: 'unregistered:src/ui/map/assets/audio/ui/orphan.ogg',
                category: 'unregistered_binary',
                file: 'src/ui/map/assets/audio/ui/orphan.ogg',
                binary_present: true,
            }),
        ]));
        expect(violationCodes(report)).toContain('unregistered_audio_binary');
    });

    it('is stable across cue/manifest insertion order and never serializes absolute paths or timestamps', () => {
        const root = makeRoot();
        writeOggStub(root, 'src/ui/map/assets/audio/ui/cue_provided.ogg');
        writeBytes(root, 'docs/audio/LICENSES/cue_provided.md', new Uint8Array());
        const reversed: AudioAssetProvenanceInput = {
            root_dir: root,
            cues: [...fixture.valid.cues].reverse(),
            resolved_cue_ids: [...fixture.valid.resolved_cue_ids].reverse(),
            manifest: {
                ...fixture.valid.manifest,
                cues: Object.fromEntries(Object.entries(fixture.valid.manifest.cues).reverse()),
            },
        };

        const first = serializeAudioAssetProvenanceReport(buildAudioAssetProvenanceReport({
            ...fixture.valid,
            root_dir: root,
        }));
        const second = serializeAudioAssetProvenanceReport(buildAudioAssetProvenanceReport(reversed));

        expect(second).toBe(first);
        expect(first).not.toContain(root.replaceAll('\\', '/'));
        expect(first).not.toMatch(/[A-Z]:\\/i);
        expect(first).not.toContain('generated_at');
        expect(first).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
    });

    it('inventories all registered repository cues and routes current gaps explicitly', () => {
        const report = loadAudioAssetProvenanceReport(process.cwd());
        const codes = violationCodes(report);

        expect(report.summary).toMatchObject({
            total_cues: 36,
            provided_cues: 17,
            placeholder_cues: 19,
            manifest_cues: 36,
        });
        expect(codes).not.toContain('missing_provenance');
        expect(codes).not.toContain('missing_asset_file');
        expect(codes).not.toContain('asset_hash_mismatch');
        expect(codes).not.toContain('disallowed_license');
        expect(codes).not.toContain('prohibited_sensitive_content');
        expect(codes).not.toContain('provided_asset_unresolved');
        expect(codes).not.toContain('placeholder_asset_resolved');
        expect(codes).not.toContain('unregistered_audio_binary');

        for (const cueId of ['ambient_archive', 'ambient_field', 'ambient_warroom']) {
            const record = report.records.find((candidate) => candidate.cue_id === cueId);
            expect(record?.disposition).toBe('required_priority_missing');
            expect(record?.violations.map((violation) => violation.code)).toContain('required_asset_missing');
        }
    });
});

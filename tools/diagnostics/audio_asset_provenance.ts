import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const AUDIO_ASSET_PROVENANCE_MANIFEST_PATH = 'docs/audio/AUDIO_ASSET_PROVENANCE.json';
const SOUND_MANIFEST_PATH = 'src/ui/map/audio/sound_manifest.ts';
const AUDIO_ASSETS_PATH = 'src/ui/map/audio/audioAssets.ts';
const AUDIO_BINARY_ROOT = 'src/ui/map/assets/audio';
const REQUIRED_PRIORITY_CUES = new Set(['ambient_archive', 'ambient_field', 'ambient_warroom']);
const ALLOWED_LICENSES = new Set(['FIRST_PARTY', 'CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0']);
const PROHIBITED_SENSITIVE_CLASSES = new Set([
    'anthem_or_folk',
    'speech',
    'screams',
    'gunfire_spectacle',
    'sensational_atrocity',
]);

export type AudioCueCategory = 'ui' | 'ambient' | 'music' | 'stinger';
export type AudioCueAssetStatus = 'missing_placeholder' | 'provided';
export type AudioAssetDisposition = 'provided' | 'missing_optional_placeholder' | 'required_priority_missing';
export type AudioViolationSeverity = 'blocking' | 'warning';

export interface AudioCueLike {
    id: string;
    category: AudioCueCategory;
    assetStatus: AudioCueAssetStatus;
    filePath?: string;
}

export interface AudioAssetProvenanceEntry {
    file: string;
    original_filename: string | null;
    original_sha256: string | null;
    processed_sha256: string | null;
    duration_seconds: number | null;
    loudness_lufs: number | null;
    loudness_method: string | null;
    source_url: string | null;
    author: string | null;
    license: string | null;
    license_url: string | null;
    attribution: string | null;
    processing_command: string | null;
    license_note: string | null;
    sensitive_content_class: string;
    disposition: AudioAssetDisposition;
    notes: string | null;
}

export interface AudioAssetProvenanceManifest {
    schema_version: 1;
    cues: Record<string, AudioAssetProvenanceEntry>;
}

export interface AudioAssetProvenanceInput {
    root_dir?: string;
    cues: AudioCueLike[];
    resolved_cue_ids: string[];
    manifest: AudioAssetProvenanceManifest;
}

export interface AudioAssetViolation {
    code: string;
    severity: AudioViolationSeverity;
    message: string;
}

export interface AudioAssetProvenanceRecord {
    cue_id: string;
    category: AudioCueCategory | 'manifest_orphan' | 'unregistered_binary';
    asset_status: AudioCueAssetStatus | 'orphan';
    file: string | null;
    binary_present: boolean;
    bundle_resolved: boolean;
    sha256: string | null;
    original_filename: string | null;
    original_sha256: string | null;
    processed_sha256: string | null;
    duration_seconds: number | null;
    loudness_lufs: number | null;
    loudness_method: string | null;
    source_url: string | null;
    author: string | null;
    license: string | null;
    license_url: string | null;
    attribution: string | null;
    processing_command: string | null;
    license_note: string | null;
    sensitive_content_class: string | null;
    disposition: AudioAssetDisposition | null;
    notes: string | null;
    violations: AudioAssetViolation[];
}

export interface AudioAssetProvenanceReport {
    schema_version: 1;
    inputs: {
        cue_registry: string;
        asset_resolution_map: string;
        manifest: string;
    };
    summary: {
        total_cues: number;
        provided_cues: number;
        placeholder_cues: number;
        manifest_cues: number;
        unregistered_binaries: number;
        blocking_violations: number;
        warning_violations: number;
        violations_by_code: Record<string, number>;
    };
    records: AudioAssetProvenanceRecord[];
}

function compareText(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function asNonEmpty(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function violation(code: string, message: string, severity: AudioViolationSeverity = 'blocking'): AudioAssetViolation {
    return { code, severity, message };
}

function sortViolations(violations: AudioAssetViolation[]): AudioAssetViolation[] {
    return violations.sort((a, b) => compareText(`${a.code}\u0000${a.message}`, `${b.code}\u0000${b.message}`));
}

function isRepoRelativePosixPath(value: string): boolean {
    return value.length > 0
        && !value.includes('\\')
        && !value.startsWith('/')
        && !/^[a-z]:/iu.test(value)
        && !value.split('/').includes('..');
}

function expectedAssetPath(cue: AudioCueLike): string | null {
    return cue.filePath ? `src/ui/map/assets/${cue.filePath}` : null;
}

function inspectAudioBinary(path: string): { sha256: string; hasOggSignature: boolean } {
    const bytes = readFileSync(path);
    return {
        sha256: createHash('sha256').update(bytes).digest('hex'),
        hasOggSignature: bytes.length >= 4 && bytes.subarray(0, 4).toString('ascii') === 'OggS',
    };
}

function listAudioBinaries(rootDir: string): string[] {
    const absoluteRoot = resolve(rootDir, ...AUDIO_BINARY_ROOT.split('/'));
    if (!existsSync(absoluteRoot)) return [];

    const files: string[] = [];
    const visit = (absoluteDir: string, relativeDir: string): void => {
        const entries = readdirSync(absoluteDir, { withFileTypes: true })
            .sort((a, b) => compareText(a.name, b.name));
        for (const entry of entries) {
            const childRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
            const childAbsolute = resolve(absoluteDir, entry.name);
            if (entry.isDirectory()) {
                visit(childAbsolute, childRelative);
                continue;
            }
            if (!entry.isFile()) continue;
            const extension = extname(entry.name).toLowerCase();
            if (!['.flac', '.mp3', '.ogg', '.wav'].includes(extension)) continue;
            files.push(`${AUDIO_BINARY_ROOT}/${childRelative}`);
        }
    };
    visit(absoluteRoot, '');
    return files.sort(compareText);
}

function isSha256(value: string | null): value is string {
    return value != null && /^[a-f0-9]{64}$/u.test(value);
}

function checkRequiredText(
    violations: AudioAssetViolation[],
    cueId: string,
    value: string | null,
    code: string,
    label: string,
): void {
    if (!asNonEmpty(value)) violations.push(violation(code, `${cueId} is missing ${label}.`));
}

export function buildAudioAssetProvenanceReport(input: AudioAssetProvenanceInput): AudioAssetProvenanceReport {
    const rootDir = input.root_dir ?? process.cwd();
    const resolvedCueIds = new Set(input.resolved_cue_ids);
    const cueIdCounts = new Map<string, number>();
    for (const cue of input.cues) cueIdCounts.set(cue.id, (cueIdCounts.get(cue.id) ?? 0) + 1);
    const cuesById = new Map<string, AudioCueLike>();
    for (const cue of [...input.cues].sort((a, b) => compareText(a.id, b.id))) {
        if (!cuesById.has(cue.id)) cuesById.set(cue.id, cue);
    }

    const records: AudioAssetProvenanceRecord[] = [...cuesById.values()].map((cue) => {
        const entry = input.manifest.cues[cue.id];
        const file = entry?.file ?? expectedAssetPath(cue);
        const validPath = file != null && isRepoRelativePosixPath(file);
        const absoluteFile = validPath ? resolve(rootDir, ...file.split('/')) : null;
        const binaryPresent = absoluteFile != null && existsSync(absoluteFile);
        const binaryInspection = binaryPresent ? inspectAudioBinary(absoluteFile) : null;
        const actualSha256 = binaryInspection?.sha256 ?? null;
        const bundleResolved = resolvedCueIds.has(cue.id);
        const violations: AudioAssetViolation[] = [];

        if ((cueIdCounts.get(cue.id) ?? 0) > 1) {
            violations.push(violation('duplicate_cue_id', `Cue registry repeats immutable cue id ${cue.id}.`));
        }
        if (!entry) {
            violations.push(violation('missing_provenance', `${cue.id} has no sidecar provenance row.`));
        }
        if (file != null && !validPath) {
            violations.push(violation('invalid_repository_relative_path', `${cue.id} file is not repository-relative POSIX text.`));
        }

        const runtimePath = expectedAssetPath(cue);
        if (entry && runtimePath && entry.file !== runtimePath) {
            violations.push(violation(
                'runtime_file_mismatch',
                `${cue.id} sidecar file ${entry.file} differs from registry file ${runtimePath}.`,
            ));
        }

        if (cue.assetStatus === 'provided') {
            if (!bundleResolved) {
                violations.push(violation('provided_asset_unresolved', `${cue.id} is provided but absent from audioAssets.ts.`));
            }
            if (!binaryPresent) violations.push(violation('missing_asset_file', `${cue.id} claims provided but its file is absent.`));
            if (!file || extname(file).toLowerCase() !== '.ogg') {
                violations.push(violation('non_ogg_provided_asset', `${cue.id} is provided in a format other than OGG.`));
            } else if (binaryInspection != null && !binaryInspection.hasOggSignature) {
                violations.push(violation('invalid_ogg_container', `${cue.id} does not contain an OggS container signature.`));
            }

            if (entry) {
                checkRequiredText(violations, cue.id, entry.original_filename, 'missing_original_filename', 'original filename');
                if (!isSha256(entry.original_sha256)) {
                    violations.push(violation('missing_original_sha256', `${cue.id} lacks a valid original SHA-256.`));
                }
                if (!isSha256(entry.processed_sha256)) {
                    violations.push(violation('missing_processed_sha256', `${cue.id} lacks a valid processed SHA-256.`));
                } else if (actualSha256 != null && actualSha256 !== entry.processed_sha256) {
                    violations.push(violation(
                        'asset_hash_mismatch',
                        `${cue.id} actual SHA-256 ${actualSha256} differs from sidecar ${entry.processed_sha256}.`,
                    ));
                }
                if (!(typeof entry.duration_seconds === 'number' && Number.isFinite(entry.duration_seconds) && entry.duration_seconds > 0)) {
                    violations.push(violation('missing_duration', `${cue.id} lacks a positive measured duration.`));
                } else if (cue.category === 'ambient' && entry.duration_seconds > 60) {
                    violations.push(violation('ambient_duration_exceeds_limit', `${cue.id} exceeds the 60-second ambient limit.`));
                }
                if (!(typeof entry.loudness_lufs === 'number' && Number.isFinite(entry.loudness_lufs))) {
                    violations.push(violation('missing_loudness', `${cue.id} lacks measured integrated loudness.`));
                }
                checkRequiredText(violations, cue.id, entry.loudness_method, 'missing_loudness_method', 'loudness method');
                checkRequiredText(violations, cue.id, entry.source_url, 'missing_source_url', 'source URL');
                checkRequiredText(violations, cue.id, entry.author, 'missing_author', 'author');
                checkRequiredText(violations, cue.id, entry.license_url, 'missing_license_url', 'license URL');
                checkRequiredText(violations, cue.id, entry.attribution, 'missing_attribution', 'TASL attribution');
                checkRequiredText(violations, cue.id, entry.processing_command, 'missing_processing_command', 'processing command');
                if (!entry.license || !ALLOWED_LICENSES.has(entry.license)) {
                    violations.push(violation('disallowed_license', `${cue.id} license ${entry.license ?? 'missing'} is not allowed.`));
                }
                const licenseNote = asNonEmpty(entry.license_note);
                if (!licenseNote
                    || !isRepoRelativePosixPath(licenseNote)
                    || !existsSync(resolve(rootDir, ...licenseNote.split('/')))) {
                    violations.push(violation('missing_license_note', `${cue.id} lacks an existing repository-relative license note.`));
                }
                if (entry.disposition !== 'provided') {
                    violations.push(violation('asset_status_disposition_mismatch', `${cue.id} is provided but disposition is ${entry.disposition}.`));
                }
            }
        } else {
            if (bundleResolved) {
                violations.push(violation('placeholder_asset_resolved', `${cue.id} is a placeholder but resolves in audioAssets.ts.`));
            }
            if (binaryPresent) {
                violations.push(violation('placeholder_binary_present', `${cue.id} has a binary while registry status is placeholder.`));
            }
            if (REQUIRED_PRIORITY_CUES.has(cue.id)) {
                violations.push(violation('required_asset_missing', `${cue.id} is a required priority ambient bed and remains missing.`));
                if (entry && entry.disposition !== 'required_priority_missing') {
                    violations.push(violation(
                        'asset_status_disposition_mismatch',
                        `${cue.id} requires disposition required_priority_missing.`,
                    ));
                }
            } else if (entry && entry.disposition !== 'missing_optional_placeholder') {
                violations.push(violation(
                    'asset_status_disposition_mismatch',
                    `${cue.id} optional placeholder requires disposition missing_optional_placeholder.`,
                ));
            }
        }

        if (entry) {
            if (!asNonEmpty(entry.sensitive_content_class)) {
                violations.push(violation('missing_sensitive_content_class', `${cue.id} has no sensitive-content classification.`));
            } else if (PROHIBITED_SENSITIVE_CLASSES.has(entry.sensitive_content_class)) {
                violations.push(violation(
                    'prohibited_sensitive_content',
                    `${cue.id} uses prohibited sensitive-content class ${entry.sensitive_content_class}.`,
                ));
            } else if (entry.sensitive_content_class === 'requires_sensitivity_review') {
                violations.push(violation(
                    'sensitivity_review_required',
                    `${cue.id} requires sensitivity review before an asset may be supplied.`,
                    'warning',
                ));
            }
        }

        return {
            cue_id: cue.id,
            category: cue.category,
            asset_status: cue.assetStatus,
            file,
            binary_present: binaryPresent,
            bundle_resolved: bundleResolved,
            sha256: actualSha256,
            original_filename: entry?.original_filename ?? null,
            original_sha256: entry?.original_sha256 ?? null,
            processed_sha256: entry?.processed_sha256 ?? null,
            duration_seconds: entry?.duration_seconds ?? null,
            loudness_lufs: entry?.loudness_lufs ?? null,
            loudness_method: entry?.loudness_method ?? null,
            source_url: entry?.source_url ?? null,
            author: entry?.author ?? null,
            license: entry?.license ?? null,
            license_url: entry?.license_url ?? null,
            attribution: entry?.attribution ?? null,
            processing_command: entry?.processing_command ?? null,
            license_note: entry?.license_note ?? null,
            sensitive_content_class: entry?.sensitive_content_class ?? null,
            disposition: entry?.disposition ?? null,
            notes: entry?.notes ?? null,
            violations: sortViolations(violations),
        };
    });

    for (const cueId of Object.keys(input.manifest.cues).sort(compareText)) {
        if (cuesById.has(cueId)) continue;
        const entry = input.manifest.cues[cueId];
        records.push({
            cue_id: cueId,
            category: 'manifest_orphan',
            asset_status: 'orphan',
            file: entry.file,
            binary_present: false,
            bundle_resolved: false,
            sha256: null,
            original_filename: entry.original_filename,
            original_sha256: entry.original_sha256,
            processed_sha256: entry.processed_sha256,
            duration_seconds: entry.duration_seconds,
            loudness_lufs: entry.loudness_lufs,
            loudness_method: entry.loudness_method,
            source_url: entry.source_url,
            author: entry.author,
            license: entry.license,
            license_url: entry.license_url,
            attribution: entry.attribution,
            processing_command: entry.processing_command,
            license_note: entry.license_note,
            sensitive_content_class: entry.sensitive_content_class,
            disposition: entry.disposition,
            notes: entry.notes,
            violations: [violation('manifest_cue_orphaned', `Manifest cue ${cueId} is absent from the registry.`)],
        });
    }

    const registeredFiles = new Set(
        [...cuesById.values()]
            .map(expectedAssetPath)
            .filter((file): file is string => file != null),
    );
    for (const file of listAudioBinaries(rootDir)) {
        if (registeredFiles.has(file)) continue;
        const absoluteFile = resolve(rootDir, ...file.split('/'));
        const inspection = inspectAudioBinary(absoluteFile);
        records.push({
            cue_id: `unregistered:${file}`,
            category: 'unregistered_binary',
            asset_status: 'orphan',
            file,
            binary_present: true,
            bundle_resolved: false,
            sha256: inspection.sha256,
            original_filename: null,
            original_sha256: null,
            processed_sha256: null,
            duration_seconds: null,
            loudness_lufs: null,
            loudness_method: null,
            source_url: null,
            author: null,
            license: null,
            license_url: null,
            attribution: null,
            processing_command: null,
            license_note: null,
            sensitive_content_class: null,
            disposition: null,
            notes: null,
            violations: [violation('unregistered_audio_binary', `${file} is not owned by a registered cue.`)],
        });
    }
    records.sort((a, b) => compareText(a.cue_id, b.cue_id));

    const allViolations = records.flatMap((record) => record.violations);
    const counts = new Map<string, number>();
    for (const item of allViolations) counts.set(item.code, (counts.get(item.code) ?? 0) + 1);

    return {
        schema_version: 1,
        inputs: {
            cue_registry: SOUND_MANIFEST_PATH,
            asset_resolution_map: AUDIO_ASSETS_PATH,
            manifest: AUDIO_ASSET_PROVENANCE_MANIFEST_PATH,
        },
        summary: {
            total_cues: cuesById.size,
            provided_cues: [...cuesById.values()].filter((cue) => cue.assetStatus === 'provided').length,
            placeholder_cues: [...cuesById.values()].filter((cue) => cue.assetStatus === 'missing_placeholder').length,
            manifest_cues: Object.keys(input.manifest.cues).length,
            unregistered_binaries: records.filter((record) => record.category === 'unregistered_binary').length,
            blocking_violations: allViolations.filter((item) => item.severity === 'blocking').length,
            warning_violations: allViolations.filter((item) => item.severity === 'warning').length,
            violations_by_code: Object.fromEntries([...counts.entries()].sort(([a], [b]) => compareText(a, b))),
        },
        records,
    };
}

function propertyValue(object: ts.ObjectLiteralExpression, propertyName: string): string | boolean | undefined {
    for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const name = property.name.getText().replace(/^['"]|['"]$/gu, '');
        if (name !== propertyName) continue;
        const value = property.initializer;
        if (ts.isStringLiteralLike(value)) return value.text;
        if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
        if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
    }
    return undefined;
}

function categoryForRegistration(callName: string, explicitCategory: string | boolean | undefined): AudioCueCategory {
    if (typeof explicitCategory === 'string') return explicitCategory as AudioCueCategory;
    if (callName === 'registerMusic') return 'music';
    return 'ui';
}

export function parseRegisteredAudioCues(source: string): AudioCueLike[] {
    const sourceFile = ts.createSourceFile(SOUND_MANIFEST_PATH, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const cues: AudioCueLike[] = [];

    const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)
            && ts.isIdentifier(node.expression)
            && ['registerCue', 'registerMusic', 'registerSFX'].includes(node.expression.text)
            && node.arguments.length > 0
            && ts.isObjectLiteralExpression(node.arguments[0])) {
            const callName = node.expression.text;
            const object = node.arguments[0];
            const id = propertyValue(object, 'id');
            if (typeof id === 'string') {
                const explicitCategory = propertyValue(object, 'category');
                const category = categoryForRegistration(callName, explicitCategory);
                const explicitStatus = propertyValue(object, 'assetStatus');
                const assetStatus = (typeof explicitStatus === 'string'
                    ? explicitStatus
                    : 'missing_placeholder') as AudioCueAssetStatus;
                const pathProperty = callName === 'registerCue' ? 'filePath' : 'src';
                const filePath = propertyValue(object, pathProperty);
                cues.push({
                    id,
                    category,
                    assetStatus,
                    ...(typeof filePath === 'string' ? { filePath } : {}),
                });
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return cues.sort((a, b) => compareText(a.id, b.id));
}

function unwrapObjectLiteral(initializer: ts.Expression): ts.ObjectLiteralExpression | null {
    if (ts.isObjectLiteralExpression(initializer)) return initializer;
    if (!ts.isCallExpression(initializer) || initializer.arguments.length === 0) return null;
    const firstArgument = initializer.arguments[0];
    return ts.isObjectLiteralExpression(firstArgument) ? firstArgument : null;
}

export function parseResolvedAudioCueIds(source: string): string[] {
    const sourceFile = ts.createSourceFile(AUDIO_ASSETS_PATH, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const cueIds: string[] = [];

    const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node)
            && ts.isIdentifier(node.name)
            && node.name.text === 'AUDIO_ASSET_URLS'
            && node.initializer != null) {
            const object = unwrapObjectLiteral(node.initializer);
            if (object) {
                for (const property of object.properties) {
                    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) continue;
                    cueIds.push(property.name.getText().replace(/^['"]|['"]$/gu, ''));
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return [...new Set(cueIds)].sort(compareText);
}

function readJson<T>(rootDir: string, relativePath: string): T {
    return JSON.parse(readFileSync(resolve(rootDir, ...relativePath.split('/')), 'utf8')) as T;
}

export function loadAudioAssetProvenanceReport(rootDir = process.cwd()): AudioAssetProvenanceReport {
    const source = readFileSync(resolve(rootDir, ...SOUND_MANIFEST_PATH.split('/')), 'utf8');
    const assetSource = readFileSync(resolve(rootDir, ...AUDIO_ASSETS_PATH.split('/')), 'utf8');
    return buildAudioAssetProvenanceReport({
        root_dir: rootDir,
        cues: parseRegisteredAudioCues(source),
        resolved_cue_ids: parseResolvedAudioCueIds(assetSource),
        manifest: readJson(rootDir, AUDIO_ASSET_PROVENANCE_MANIFEST_PATH),
    });
}

export function serializeAudioAssetProvenanceReport(report: AudioAssetProvenanceReport): string {
    return `${JSON.stringify(report, null, 2)}\n`;
}

function isMainModule(): boolean {
    const entry = process.argv[1];
    return entry != null && resolve(entry) === resolve(fileURLToPath(import.meta.url));
}

if (isMainModule()) {
    const report = loadAudioAssetProvenanceReport(process.cwd());
    process.stdout.write(serializeAudioAssetProvenanceReport(report));
    if (process.argv.includes('--strict') && report.summary.blocking_violations > 0) process.exitCode = 1;
}

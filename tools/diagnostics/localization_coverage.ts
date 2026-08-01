#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';
import ts from 'typescript';

import { enMessages as productionEnMessages } from '../../src/ui/map/i18n/messages.en.js';
import { bcsMessages as productionBcsMessages } from '../../src/ui/map/i18n/messages.bcs.js';

const EN_DICTIONARY_FILE = 'src/ui/map/i18n/messages.en.ts';
const LEGACY_BCS_DICTIONARY_FILE = 'src/ui/map/i18n/messages.bcs.ts';
const UI_SOURCE_ROOT = 'src/ui/map';
const PLAYER_COPY_ATTRIBUTES = new Set([
    'alt',
    'aria-description',
    'aria-label',
    'label',
    'placeholder',
    'title',
]);
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);

export type LocalizationFindingKind =
    | 'embedded_english'
    | 'concatenated_copy'
    | 'dynamic_message_key';

export interface LocalizationSourceFinding {
    file: string;
    line: number;
    column: number;
    kind: LocalizationFindingKind;
    excerpt: string;
    status: 'open';
    owner: 'localization' | 'ui-ux+localization';
}

export interface LocalizationCoverageKey {
    key: string;
    source_file_en: string;
    source_file_bs: string;
    en_text: string;
    bs_text: string | null;
    en_status: 'authored';
    bs_status: 'translated' | 'fallback_to_en';
    fallback_locales: Array<'bs'>;
    en_length: number;
    bs_length: number | null;
    layout_risk: 'none' | 'review';
    status: 'complete' | 'layout_review' | 'missing_bs';
    owner: 'localization' | 'ui-ux+localization';
}

export interface LocalizationCoverageReport {
    schema_version: 1;
    locale_contract: {
        canonical_bosnian_locale: 'bs';
        formatting_locale: 'bs-BA';
        legacy_alias: 'bcs';
        legacy_dictionary_file: string;
    };
    inputs: {
        english_dictionary: string;
        bosnian_dictionary: string;
        player_surface_root: string;
    };
    summary: {
        total_keys: number;
        en_authored: number;
        bs_translated: number;
        bs_fallbacks: number;
        layout_review_keys: number;
        source_files_scanned: number;
        embedded_english_findings: number;
        concatenated_copy_findings: number;
        dynamic_message_key_findings: number;
        open_findings: number;
    };
    keys: LocalizationCoverageKey[];
    source_findings: LocalizationSourceFinding[];
}

export interface LocalizationCoverageInput {
    rootDir?: string;
    enMessages?: Record<string, string>;
    bsMessages?: Partial<Record<string, string>>;
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function toPosix(value: string): string {
    return value.split(sep).join('/');
}

function listSourceFiles(rootDir: string, relativeDir = UI_SOURCE_ROOT): string[] {
    const absoluteDir = resolve(rootDir, ...relativeDir.split('/'));
    let entries;
    try {
        entries = readdirSync(absoluteDir, { withFileTypes: true });
    } catch {
        return [];
    }
    const files: string[] = [];
    for (const entry of entries.sort((a, b) => strictCompare(a.name, b.name))) {
        const child = `${relativeDir}/${entry.name}`;
        if (entry.isDirectory()) {
            if (['__mocks__', '.storybook', 'node_modules', 'saved', 'stories'].includes(entry.name)) continue;
            files.push(...listSourceFiles(rootDir, child));
            continue;
        }
        if (!entry.isFile() || !SOURCE_EXTENSIONS.has(extname(entry.name))) continue;
        if (entry.name.endsWith('.d.ts') || entry.name.includes('.test.') || child.startsWith(`${UI_SOURCE_ROOT}/i18n/`)) continue;
        files.push(child);
    }
    return files.sort(strictCompare);
}

function normalizeExcerpt(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length <= 140 ? normalized : `${normalized.slice(0, 137)}...`;
}

function looksLikePlayerCopy(value: string): boolean {
    const normalized = value.trim();
    return /[A-Za-z]{2}/.test(normalized) && !/^[-_:.#/]+$/.test(normalized);
}

function nodeLocation(sourceFile: ts.SourceFile, node: ts.Node): { line: number; column: number } {
    const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return { line: location.line + 1, column: location.character + 1 };
}

function containsLiteralCopy(node: ts.Node): boolean {
    let found = false;
    const visit = (candidate: ts.Node): void => {
        if (ts.isStringLiteralLike(candidate) && looksLikePlayerCopy(candidate.text)) {
            found = true;
            return;
        }
        if (!found) ts.forEachChild(candidate, visit);
    };
    visit(node);
    return found;
}

function scanSourceFile(rootDir: string, relativeFile: string): LocalizationSourceFinding[] {
    const absoluteFile = resolve(rootDir, ...relativeFile.split('/'));
    const raw = readFileSync(absoluteFile, 'utf8');
    const scriptKind = relativeFile.endsWith('.tsx') || relativeFile.endsWith('.jsx')
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(relativeFile, raw, ts.ScriptTarget.Latest, true, scriptKind);
    const findings: LocalizationSourceFinding[] = [];
    const add = (
        node: ts.Node,
        kind: LocalizationFindingKind,
        excerpt: string,
        owner: LocalizationSourceFinding['owner'],
    ): void => {
        const location = nodeLocation(sourceFile, node);
        findings.push({
            file: relativeFile,
            ...location,
            kind,
            excerpt: normalizeExcerpt(excerpt),
            status: 'open',
            owner,
        });
    };

    const visit = (node: ts.Node): void => {
        if (ts.isJsxText(node) && looksLikePlayerCopy(node.text)) {
            add(node, 'embedded_english', node.text, 'ui-ux+localization');
        } else if (ts.isJsxAttribute(node)) {
            const attributeName = node.name.getText(sourceFile);
            if (PLAYER_COPY_ATTRIBUTES.has(attributeName) && node.initializer && ts.isStringLiteral(node.initializer)
                && looksLikePlayerCopy(node.initializer.text)) {
                add(node.initializer, 'embedded_english', node.initializer.text, 'ui-ux+localization');
            }
        }

        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken
            && containsLiteralCopy(node)
            && !(ts.isBinaryExpression(node.parent) && node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
            add(node, 'concatenated_copy', node.getText(sourceFile), 'ui-ux+localization');
        }

        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
            const key = node.arguments[0];
            if (key && !ts.isStringLiteralLike(key)) {
                add(key, 'dynamic_message_key', key.getText(sourceFile), 'localization');
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return findings;
}

function findingKindRank(kind: LocalizationFindingKind): number {
    if (kind === 'embedded_english') return 0;
    if (kind === 'concatenated_copy') return 1;
    return 2;
}

function sortFindings(findings: LocalizationSourceFinding[]): LocalizationSourceFinding[] {
    return findings.sort((a, b) => (
        strictCompare(a.file, b.file)
        || a.line - b.line
        || a.column - b.column
        || findingKindRank(a.kind) - findingKindRank(b.kind)
        || strictCompare(a.excerpt, b.excerpt)
    ));
}

function layoutRisk(enText: string, bsText: string | null): LocalizationCoverageKey['layout_risk'] {
    if (bsText == null) return 'none';
    const longest = Math.max(enText.length, bsText.length);
    const ratio = enText.length === 0 ? 1 : bsText.length / enText.length;
    return longest >= 64 || (bsText.length >= 32 && ratio >= 1.35) ? 'review' : 'none';
}

function coverageStatus(
    bsText: string | null,
    risk: LocalizationCoverageKey['layout_risk'],
): LocalizationCoverageKey['status'] {
    if (bsText == null) return 'missing_bs';
    if (risk === 'review') return 'layout_review';
    return 'complete';
}

export async function buildLocalizationCoverageReport(
    input: LocalizationCoverageInput = {},
): Promise<LocalizationCoverageReport> {
    const rootDir = input.rootDir ?? process.cwd();
    const enMessages = input.enMessages ?? productionEnMessages as Record<string, string>;
    const bsMessages = input.bsMessages ?? productionBcsMessages as Partial<Record<string, string>>;
    const sourceFiles = listSourceFiles(rootDir);
    const sourceFindings = sortFindings(sourceFiles.flatMap((file) => scanSourceFile(rootDir, file)));
    const keys = Object.keys(enMessages).sort(strictCompare).map((key): LocalizationCoverageKey => {
        const enText = enMessages[key];
        const bsText = typeof bsMessages[key] === 'string' && bsMessages[key]!.trim().length > 0
            ? bsMessages[key]!
            : null;
        const risk = layoutRisk(enText, bsText);
        const status = coverageStatus(bsText, risk);
        return {
            key,
            source_file_en: EN_DICTIONARY_FILE,
            source_file_bs: LEGACY_BCS_DICTIONARY_FILE,
            en_text: enText,
            bs_text: bsText,
            en_status: 'authored',
            bs_status: bsText == null ? 'fallback_to_en' : 'translated',
            fallback_locales: bsText == null ? ['bs'] : [],
            en_length: enText.length,
            bs_length: bsText?.length ?? null,
            layout_risk: risk,
            status,
            owner: status === 'layout_review' ? 'ui-ux+localization' : 'localization',
        };
    });
    const countFinding = (kind: LocalizationFindingKind): number => (
        sourceFindings.filter((finding) => finding.kind === kind).length
    );
    return {
        schema_version: 1,
        locale_contract: {
            canonical_bosnian_locale: 'bs',
            formatting_locale: 'bs-BA',
            legacy_alias: 'bcs',
            legacy_dictionary_file: LEGACY_BCS_DICTIONARY_FILE,
        },
        inputs: {
            english_dictionary: EN_DICTIONARY_FILE,
            bosnian_dictionary: LEGACY_BCS_DICTIONARY_FILE,
            player_surface_root: UI_SOURCE_ROOT,
        },
        summary: {
            total_keys: keys.length,
            en_authored: keys.length,
            bs_translated: keys.filter((row) => row.bs_status === 'translated').length,
            bs_fallbacks: keys.filter((row) => row.bs_status === 'fallback_to_en').length,
            layout_review_keys: keys.filter((row) => row.layout_risk === 'review').length,
            source_files_scanned: sourceFiles.length,
            embedded_english_findings: countFinding('embedded_english'),
            concatenated_copy_findings: countFinding('concatenated_copy'),
            dynamic_message_key_findings: countFinding('dynamic_message_key'),
            open_findings: sourceFindings.length,
        },
        keys,
        source_findings: sourceFindings,
    };
}

export function serializeLocalizationCoverageReport(report: LocalizationCoverageReport): string {
    return `${JSON.stringify(report, null, 2)}\n`;
}

function isMainModule(): boolean {
    const entry = process.argv[1];
    return entry != null && resolve(entry) === resolve(fileURLToPath(import.meta.url));
}

async function main(): Promise<void> {
    const report = await buildLocalizationCoverageReport({ rootDir: process.cwd() });
    process.stdout.write(serializeLocalizationCoverageReport(report));
    if (process.argv.includes('--strict') && (report.summary.bs_fallbacks > 0 || report.summary.open_findings > 0)) {
        process.exitCode = 1;
    }
}

if (isMainModule()) void main();

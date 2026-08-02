import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    buildLocalizationCoverageReport,
    serializeLocalizationCoverageReport,
} from '../tools/diagnostics/localization_coverage.js';

describe('localization coverage inventory', () => {
    it('reports canonical bs coverage, fallback use, layout risk, and source findings deterministically', async () => {
        const root = await mkdtemp(join(tmpdir(), 'awwv-localization-'));
        try {
            const sourceDir = join(root, 'src', 'ui', 'map', 'components');
            await mkdir(sourceDir, { recursive: true });
            await writeFile(join(sourceDir, 'Desk.tsx'), [
                "import { t } from '../i18n';",
                "export function Desk({ dynamicKey }: { dynamicKey: string }) {",
                "  const numbers = [1, 2].reduce((a, n) => a + (typeof n === 'number' ? n : 0), 0);",
                "  const targetToken = 'desk';",
                "  const selector = '[data-tutorial-step=' + JSON.stringify(targetToken) + ']';",
                "  void numbers; void selector;",
                "  return <button aria-label=\"Open desk\">{t('desk.open') + ' now'}{t(dynamicKey as never)}</button>;",
                "}",
                '',
            ].join('\n'));

            const input = {
                rootDir: root,
                enMessages: {
                    'desk.open': 'Open',
                    'desk.long': 'A compact English label that is deliberately long enough for review',
                    'desk.missing': 'Missing translation',
                },
                bsMessages: {
                    'desk.open': 'Otvori',
                    'desk.long': 'Namjerno veoma dug bosanski prevod koji zahtijeva pregled rasporeda na uskom dugmetu',
                },
            };
            const first = await buildLocalizationCoverageReport(input);
            const second = await buildLocalizationCoverageReport(input);

            expect(first).toEqual(second);
            expect(first.schema_version).toBe(1);
            expect(first.locale_contract).toEqual({
                canonical_bosnian_locale: 'bs',
                formatting_locale: 'bs-BA',
                legacy_alias: 'bcs',
                legacy_dictionary_file: 'src/ui/map/i18n/messages.bcs.ts',
            });
            expect(first.review_disposition).toEqual({
                display_label: 'Bosanski (Preview)',
                english_remains_default: true,
                external_native_review: 'not_completed',
                remaining_linguistic_review: 'preview-language-review',
                production_lqa_claim: false,
            });
            expect(first.keys.map((row) => row.key)).toEqual(['desk.long', 'desk.missing', 'desk.open']);
            expect(first.keys.find((row) => row.key === 'desk.missing')).toMatchObject({
                bs_status: 'fallback_to_en',
                status: 'missing_bs',
                owner: 'localization',
            });
            expect(first.keys.find((row) => row.key === 'desk.long')?.layout_risk).toBe('review');
            expect(first.source_findings.map((row) => row.kind)).toEqual([
                'embedded_english',
                'concatenated_copy',
                'dynamic_message_key',
            ]);
            expect(serializeLocalizationCoverageReport(first)).toBe(serializeLocalizationCoverageReport(second));
            expect(serializeLocalizationCoverageReport(first)).not.toMatch(/[A-Z]:\\|\/tmp\/|generated_at|timestamp/i);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('records a deterministic preview-language-review ledger and exact remainder owner', () => {
        const ledger = JSON.parse(readFileSync(
            'docs/provenance/LOCALIZATION_REVIEW_LEDGER.json',
            'utf8',
        ));
        expect(ledger).toMatchObject({
            schema_version: 1,
            locale: 'bs',
            display_label: 'Bosanski (Preview)',
            default_locale: 'en',
            production_lqa_claim: false,
            remaining_linguistic_review: 'preview-language-review',
            exact_remainder: {
                owner: 'tools/diagnostics/localization_coverage.ts',
                machine_readable: true,
            },
        });
        expect(ledger.reviews).toEqual(expect.arrayContaining([
            expect.objectContaining({
                date: '2026-08-02',
                issue_class: 'locale-contract-and-localizability',
            }),
            expect.objectContaining({
                reviewer: null,
                date: null,
                issue_class: 'native-language-review',
                resolution: 'preview-language-review',
            }),
        ]));
        expect(JSON.stringify(ledger)).not.toMatch(/generated_at|timestamp|[A-Z]:\\|\/tmp\//i);
    });

    it('inventories every production English key and proves the former fallback probe is translated', async () => {
        const report = await buildLocalizationCoverageReport({ rootDir: process.cwd() });
        expect(report.summary.total_keys).toBeGreaterThan(5_000);
        expect(report.keys.length).toBe(report.summary.total_keys);
        expect(report.inputs.bosnian_dictionary).toBe('src/ui/map/i18n/messages.bs.ts');
        expect(report.summary.bs_fallbacks).toBe(0);
        expect(report.keys.find((row) => row.key === 'settings.experimentalFallbackProbe')).toMatchObject({
            bs_status: 'translated',
            status: 'complete',
        });
        expect([...report.keys].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).toEqual(report.keys);
        expect(report.source_findings.some((row) => (
            row.kind === 'concatenated_copy'
            && row.file === 'src/ui/map/components/ops_modal/AuthorizePhase.tsx'
        ))).toBe(false);

        for (const expected of [
            ['src/ui/map/components/LoadingSkeleton.tsx', 'LOADING SCENARIO'],
            ['src/ui/map/components/Tooltip.tsx', 'Own'],
            ['src/ui/map/components/PeacePlanModal.tsx', 'Failed to resolve peace plan.'],
            ['src/ui/map/components/chronicle/generateWrappedSlides.ts', 'Recorded event'],
        ] as const) {
            expect(report.source_findings.some((row) => (
                row.kind === 'embedded_english'
                && row.file === expected[0]
                && row.excerpt === expected[1]
            )), `${expected[0]}: ${expected[1]}`).toBe(true);
        }
        expect(report.source_findings.some((row) => row.file === 'src/ui/map/scripts/debugLoadSave.ts')).toBe(false);
        expect(report.source_findings.some((row) => row.excerpt === 'sk-ant-...')).toBe(false);
        expect(report.source_findings.some((row) => row.excerpt === 'Desktop IPC not available')).toBe(false);
        expect(report.source_findings.some((row) => /^&(?:#[0-9]+|#x[0-9a-f]+|[a-z]+);$/i.test(row.excerpt))).toBe(false);
        for (const assertionLabel of [
            'Map construction count',
            'WebGL release count',
            'Deck construction count',
            'Deck release count',
        ]) {
            expect(report.source_findings.some((row) => (
                row.file === 'src/ui/map/perf/mapTransitionTiming.ts'
                && row.excerpt === assertionLabel
            ))).toBe(false);
        }
    });

    it('finds player-facing literals in defaults, JSX expressions, fallbacks, and function arguments', async () => {
        const root = await mkdtemp(join(tmpdir(), 'awwv-localization-'));
        try {
            const sourceDir = join(root, 'src', 'ui', 'map', 'components');
            await mkdir(sourceDir, { recursive: true });
            await writeFile(join(sourceDir, 'Fallbacks.tsx'), [
                "function label(_value: string, fallback: string) { return fallback; }",
                "function assertFiniteNonNegative(_value: number, _label: string) {}",
                "export function Fallbacks({ caption = 'LOADING SCENARIO', own = false }) {",
                "  const error = undefined ?? 'Failed to resolve peace plan.';",
                "  const ipc = undefined ?? 'Desktop IPC not available';",
                "  assertFiniteNonNegative(0, 'Map construction count');",
                "  const className = own ? 'bg-red-500 text-white' : 'bg-blue-500 text-black';",
                "  void ipc;",
                "  return <span className={className} title={caption}>{own ? 'Own' : label('event-id', 'Recorded event')}{error}<i>&rarr;</i><input placeholder=\"sk-ant-...\" /></span>;",
                "}",
                '',
            ].join('\n'));
            const scriptsDir = join(root, 'src', 'ui', 'map', 'scripts');
            await mkdir(scriptsDir, { recursive: true });
            await writeFile(join(scriptsDir, 'debugLoadSave.ts'), [
                "const suffix = undefined ?? 'ms, features:';",
                'void suffix;',
                '',
            ].join('\n'));

            const report = await buildLocalizationCoverageReport({
                rootDir: root,
                enMessages: {},
                bsMessages: {},
            });
            const excerpts = report.source_findings
                .filter((row) => row.kind === 'embedded_english')
                .map((row) => row.excerpt);
            expect(excerpts).toEqual([
                'LOADING SCENARIO',
                'Failed to resolve peace plan.',
                'Own',
                'Recorded event',
            ]);
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});

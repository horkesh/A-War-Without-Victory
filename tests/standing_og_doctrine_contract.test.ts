import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const RETIRED_PHASE_C_HEADING = '## Retired Phase C — historical record';

const GOVERNING_DOCS = {
    adr6: 'docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md',
    adr7: 'docs/20_engineering/ADR/ADR-0007-standing-og-defensive-model.md',
    systems: 'docs/10_canon/Systems_Manual_v0_9_0.md',
    rulebook: 'docs/10_canon/Rulebook_v0_9_0.md',
} as const;

const RETIRED_PHASE_C_IDENTIFIERS = [
    'ENABLE_SHARED_SECTOR_DEFENSE',
    'SHARED_NON_PRIMARY_DEFENDER_CASUALTY_CAP_FRACTION',
    'SHARED_SECTOR_REACTIVE_DEFENSE_RATIO',
    'getSectorReactiveDefensePredictionRatio',
    'getSectorReactiveDefenseResolutionRatio',
    'detectStandingOgSoloDefenderHotspots',
] as const;

function readRepoFile(relativePath: string): string {
    return readFileSync(resolve(REPO_ROOT, relativePath), 'utf8');
}

function normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function markdownSection(markdown: string, heading: string): string {
    const start = markdown.indexOf(heading);
    expect(start, `missing section ${heading}`).toBeGreaterThanOrEqual(0);
    const bodyStart = start + heading.length;
    const nextHeading = markdown.slice(bodyStart).search(/^#{1,3}\s/m);
    return nextHeading < 0
        ? markdown.slice(start)
        : markdown.slice(start, bodyStart + nextHeading);
}

function compareText(left: string, right: string): number {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

function productionTypeScriptFiles(root: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(root, { withFileTypes: true })
        .sort((a, b) => compareText(a.name, b.name))) {
        const path = join(root, entry.name);
        if (entry.isDirectory()) files.push(...productionTypeScriptFiles(path));
        else if (entry.isFile() && ['.ts', '.tsx'].includes(extname(entry.name))) files.push(path);
    }
    return files;
}

describe('standing-OG doctrine contract', () => {
    const docs = Object.fromEntries(
        Object.entries(GOVERNING_DOCS).map(([name, path]) => [name, readRepoFile(path)]),
    ) as Record<keyof typeof GOVERNING_DOCS, string>;

    const adr7Parts = docs.adr7.split(RETIRED_PHASE_C_HEADING);
    const liveSections = {
        adr6: docs.adr6,
        adr7: adr7Parts[0] ?? '',
        systems: markdownSection(docs.systems, '### 6.3 Operational Groups (OSID model)'),
        rulebook: [
            markdownSection(docs.rulebook, '### 5.7 Operational Groups'),
            markdownSection(docs.rulebook, '### 6.3 Reactive sector defense'),
        ].join('\n'),
    } as const;

    it.each(Object.entries(liveSections))('%s states the standing-OG spatial and participation boundary', (name, section) => {
        const live = normalize(section);

        expect(live, `${name}: spatial entity`).toContain('standing-og spatial assignment entity');
        expect(live, `${name}: no control semantics`).toContain('no political-control meaning');
        expect(live, `${name}: membership is not participation`).toContain(
            'membership alone does not make a formation a reactive defender',
        );
    });

    it.each(Object.entries(liveSections))('%s states the bounded live Phase-B commitment rule', (name, section) => {
        const live = normalize(section);

        expect(live, `${name}: one commit`).toContain(
            'at most one eligible reserve or rear formation per threatened-sector distribution pass',
        );
        for (const exclusion of ['active-operation', 'disrupted', 'in transit', 'existing movement order']) {
            expect(live, `${name}: excludes ${exclusion}`).toContain(exclusion);
        }
    });

    it.each(Object.entries(liveSections))('%s states actual-contributor and primary-aftermath ownership', (name, section) => {
        const live = normalize(section);

        expect(live, `${name}: actual contributors`).toContain('actual combat-resolver contributors');
        expect(live, `${name}: casualty weighting`).toContain(
            'defender casualties are weighted across those contributors',
        );
        expect(live, `${name}: fatigue recipient`).toContain(
            'contributor-specific immediate fatigue remains on its named recipient',
        );
        expect(live, `${name}: primary aftermath owner`).toContain(
            'post-battle defender-fatigue write and downstream aftermath remain primarily on the primary defender',
        );
    });

    it('quarantines the retired Phase-C experiment below one explicit historical-record heading', () => {
        expect(adr7Parts, 'ADR-0007 must have exactly one retired historical section').toHaveLength(2);
        const liveDocs = {
            adr6: docs.adr6,
            adr7: adr7Parts[0] ?? '',
            systems: docs.systems,
            rulebook: docs.rulebook,
        };
        const retired = adr7Parts[1] ?? '';

        for (const identifier of RETIRED_PHASE_C_IDENTIFIERS) {
            for (const [name, live] of Object.entries(liveDocs)) {
                expect(live, `${identifier} leaked into live ${name} doctrine`).not.toContain(identifier);
            }
            expect(retired, `${identifier} missing from retired historical evidence`).toContain(identifier);
        }

        for (const retiredPhrase of [
            'shared-attrition combat',
            'shared sector-defense attrition',
            'whole reachable roster',
            'predictor/resolver split',
            'share the defensive cost (fatigue as well as casualties)',
        ]) {
            for (const [name, live] of Object.entries(liveDocs)) {
                expect(normalize(live), `${retiredPhrase} leaked into live ${name} doctrine`).not.toContain(retiredPhrase);
            }
        }
        expect(normalize(retired)).toContain('retired and deleted');
        expect(normalize(retired)).toContain('historical evidence only');
    });

    it('keeps every retired Phase-C production identifier deleted', () => {
        const offenders: string[] = [];
        for (const path of productionTypeScriptFiles(resolve(REPO_ROOT, 'src'))) {
            const source = readFileSync(path, 'utf8');
            for (const identifier of RETIRED_PHASE_C_IDENTIFIERS) {
                if (source.includes(identifier)) {
                    offenders.push(`${path.slice(REPO_ROOT.length + 1)}: ${identifier}`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });
});

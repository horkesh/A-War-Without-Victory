import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import essayIndex from '../../data/scenarios/essays/essay_index.json';
import {
    resolveCodexEssay,
    type EssayEntry,
} from '../../src/ui/map/components/codex/codexEssayResolver.js';

const essays = (essayIndex as { essays: EssayEntry[] }).essays;
const ghostDir = resolve(__dirname, '..', '..', 'data/codex/ghost_entries');
const ghostBcsDir = resolve(__dirname, '..', '..', 'data/codex/ghost_entries_bcs');

const forbiddenBcsPatterns = [
    /\btjed/i,
    /\bpovij/i,
    /\bstozer/i,
    /\bcasnik/i,
    /\bzapov/i,
    /\bopskr/i,
    /\bsustav/i,
    /\bvreme\b/i,
    /\bsledec/i,
    /\bprocena/i,
    /\bopsta\b/i,
    /\bopstina\b/i,
];

describe('Codex essay localization coverage', () => {
    it('has Bosnian localization for every indexed Codex essay', () => {
        expect(essays.length).toBeGreaterThan(0);
        for (const essay of essays) {
            expect(essay.localizations?.bcs?.title, `${essay.id} missing BCS title`).toBeTruthy();
            expect(essay.localizations?.bcs?.category, `${essay.id} missing BCS category`).toBeTruthy();
            expect(essay.localizations?.bcs?.content, `${essay.id} missing BCS content`).toBeTruthy();
        }
    });

    it('has Bosnian localization for every dynamic Codex section', () => {
        for (const essay of essays) {
            for (const section of essay.dynamic_sections ?? []) {
                expect(
                    section.localizations?.bcs?.content,
                    `${essay.id}/${section.id ?? 'section'} missing BCS dynamic content`,
                ).toBeTruthy();
            }
        }
    });

    it('resolves localized Bosnian title, category, and paragraphs', () => {
        const essay = essays[0];
        const bcs = resolveCodexEssay(essay, {
            firedEventIds: new Set([essay.event_id]),
            gameOver: true,
        }, 'bcs');
        const en = resolveCodexEssay(essay, {
            firedEventIds: new Set([essay.event_id]),
            gameOver: true,
        }, 'en');

        expect(bcs.title).toBe(essay.localizations?.bcs?.title);
        expect(bcs.category).toBe(essay.localizations?.bcs?.category);
        expect(bcs.paragraphs.length).toBeGreaterThan(0);
        expect(bcs.paragraphs[0]?.text).not.toBe(en.paragraphs[0]?.text);
    });

    it('keeps Bosnian Codex localization free of common Croatian and Serbian-ekavian forms', () => {
        const ghostCorpus = existsSync(ghostBcsDir)
            ? readdirSync(ghostBcsDir)
                .filter((name) => name.endsWith('.md'))
                .map((name) => readFileSync(resolve(ghostBcsDir, name), 'utf8'))
                .join('\n')
            : '';
        const corpus = [
            JSON.stringify(essays.map((essay) => essay.localizations?.bcs ?? {})),
            ghostCorpus,
        ].join('\n').toLowerCase();
        for (const pattern of forbiddenBcsPatterns) {
            expect(corpus).not.toMatch(pattern);
        }
    });

    it('has Bosnian sidecar markdown for every Codex ghost entry', () => {
        const ghostFiles = readdirSync(ghostDir)
            .filter((name) => name.endsWith('.md'))
            .sort();
        expect(ghostFiles.length).toBeGreaterThan(0);
        for (const name of ghostFiles) {
            const bcsPath = resolve(ghostBcsDir, name);
            expect(existsSync(bcsPath), `${name} missing BCS sidecar`).toBe(true);
            const body = readFileSync(bcsPath, 'utf8');
            expect(body.startsWith('# '), `${name} missing BCS heading`).toBe(true);
            expect(body).toContain('Ring 2');
            expect(body.length, `${name} BCS body too short`).toBeGreaterThan(450);
        }
    });
});

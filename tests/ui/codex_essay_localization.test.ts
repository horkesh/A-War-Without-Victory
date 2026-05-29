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
const war1994Events = JSON.parse(readFileSync(
    resolve(__dirname, '..', '..', 'data/scenarios/events/war_1994.json'),
    'utf8',
)) as Array<{ id: string; narrative?: string; historical_source?: string }>;
const war1995Events = JSON.parse(readFileSync(
    resolve(__dirname, '..', '..', 'data/scenarios/events/war_1995.json'),
    'utf8',
)) as Array<{ id: string; narrative?: string; historical_source?: string }>;

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

    it('keeps Operation Sana direction aligned with the historical south-and-east breakout', () => {
        const sana = essays.find((essay) => essay.id === 'essay_operation_sana_1995');
        expect(sana).toBeTruthy();
        const corpus = JSON.stringify(sana).toLowerCase();

        expect(sana?.title).toContain('South and East');
        expect(sana?.localizations?.bcs?.title).toContain('jugu i istoku');
        expect(sana?.content).toContain('Bosanski Petrovac fell on 15 September');
        expect(sana?.content).toContain('Ključ two days later');
        expect(sana?.content).toContain('fell on 10 October');
        expect(corpus).not.toContain('sweeps west');
        expect(corpus).not.toContain('westward sweep');
        expect(corpus).not.toContain('cisti zapad');
        expect(corpus).not.toContain('in mid-october, the strategically important town of ključ');
        expect(corpus).not.toContain('on 11 october, sanski most');
    });

    it('keeps Bihac and 5th Corps operational prose bounded to sourced facts', () => {
        const bihacEssay = essays.find((essay) => essay.id === 'essay_bihac_5th_corps_offensive_1994');
        const sanaEssay = essays.find((essay) => essay.id === 'essay_operation_sana_1995');
        const bihacEvent = war1994Events.find((event) => event.id === 'bihac_5th_corps_offensive_1994');
        const sanaEvent = war1995Events.find((event) => event.id === 'operation_sana_1995');

        expect(bihacEssay?.sources).toContain('Balkan Battlegrounds II, pp. 536-538');
        expect(bihacEvent?.historical_source).toContain('BB Vol. II pp. 536-538');
        expect(bihacEvent?.narrative).toContain('Operation Grmec from the Bihac pocket toward VRS positions south and east of Bihac');
        expect(bihacEvent?.narrative).toContain('later VRS, RSK, and APWB counteroffensive');
        expect(sanaEvent?.narrative).toContain('Bosanski Petrovac fell on 15 September, Kljuc two days later');
        expect(sanaEssay?.content).toContain('Bosanski Petrovac fell on 15 September, Ključ two days later');

        const corpus = JSON.stringify({
            bihacEssay,
            sanaEssay,
            bihacEvent,
            sanaEvent,
        }).toLowerCase();
        expect(corpus).not.toContain('achieved the impossible');
        expect(corpus).not.toContain('crushing abdic');
        expect(corpus).not.toContain('sweeps south and east');
        expect(corpus).not.toContain('methodical and devastating');
        expect(corpus).not.toContain('sheer determination');
        expect(corpus).not.toContain('spearheads the largest');
    });

    it('keeps Trusina title specific to perpetrator and place', () => {
        const trusina = essays.find((essay) => essay.id === 'essay_trusina_killings_1993');
        expect(trusina).toBeTruthy();

        expect(trusina?.title).toBe('The Trusina Killings: ARBiH Crimes in the Konjic Valley');
        expect(trusina?.localizations?.bcs?.title).toBe('Trusina: zlocini ARBiH u konjickoj dolini');
        expect(trusina?.title.toLowerCase()).not.toContain('all sides');
        expect(trusina?.localizations?.bcs?.title?.toLowerCase()).not.toContain('svim stranama');
    });

    it('keeps indexed Codex core fields synced to standalone source essays', () => {
        for (const indexed of essays) {
            const standalonePath = resolve(
                __dirname,
                '..',
                '..',
                'data/scenarios/essays',
                `${indexed.event_id}.json`,
            );
            expect(existsSync(standalonePath), `${indexed.id} missing standalone essay`).toBe(true);
            const standalone = JSON.parse(readFileSync(
                standalonePath,
                'utf8',
            )) as EssayEntry;

            expect(indexed.title).toBe(standalone.title);
            expect(indexed.category).toBe(standalone.category);
            expect(indexed.sources).toEqual(standalone.sources);
            expect(indexed.content).toBe(standalone.content);
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

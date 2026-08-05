import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readJson(relativePath: string): any {
    return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf8'));
}

const ESSAY_IDS = [
    'croat_bosniak_war_begins_1993',
    'grabovica_uzdol_massacres_1993',
    'operation_neretva_93_1993',
] as const;

const forbiddenSymmetry = /\b(?:both|all) sides\b|\bno faction\b.{0,48}\bclean hands\b|moral equivalence|cycle of atrocity|cycle of retaliation/i;

describe('R7 Phase 1.1 sensitive-history content', () => {
    const events = readJson('data/scenarios/events/war_1993.json');
    const index = readJson('data/scenarios/essays/essay_index.json').essays;

    it('authors resolved Tier-A provenance on the three paired events and essays', () => {
        for (const id of ESSAY_IDS) {
            const event = events.find((row: any) => row.id === id);
            const essay = readJson(`data/scenarios/essays/${id}.json`);

            expect(event, `missing event ${id}`).toBeTruthy();
            expect(event.source_tier).toBe('icty_icj_un');
            expect(event.historical_source).toMatch(/ICTY/i);
            expect(event.source_note?.length).toBeGreaterThan(80);

            expect(essay.source_tier).toBe('icty_icj_un');
            expect(essay.source_note?.length).toBeGreaterThan(80);
            expect(essay.sources.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('keeps the September anchors at turns 74-76 with exact local BB and ICTY support', () => {
        for (const id of ['operation_neretva_93_1993', 'grabovica_uzdol_massacres_1993']) {
            const event = events.find((row: any) => row.id === id);
            const essay = readJson(`data/scenarios/essays/${id}.json`);

            expect(event.trigger.turn_min).toBe(74);
            expect(event.trigger.turn_max).toBe(76);
            expect(`${event.historical_source} ${essay.sources.join(' ')}`).toMatch(/Halilovic.*IT-01-48-T/i);
            expect(`${event.historical_source} ${essay.sources.join(' ')}`).toMatch(/Balkan Battlegrounds Vol\. II, pp\. 434-435/i);
        }
    });

    it('states the Croat-Bosniak war findings by actor without flattening distinct judgments', () => {
        const event = events.find((row: any) => row.id === 'croat_bosniak_war_begins_1993');
        const essay = readJson('data/scenarios/essays/croat_bosniak_war_begins_1993.json');
        const prose = `${event.narrative}\n${event.source_note}\n${essay.content}\n${essay.source_note}`;

        expect(prose).toMatch(/Herceg-Bosna\/HVO/i);
        expect(prose).toMatch(/joint criminal enterprise/i);
        expect(prose).toMatch(/Hadzihasanovic.*Kubura/i);
        expect(prose).toMatch(/superior responsibility/i);
        expect(prose).not.toMatch(forbiddenSymmetry);
    });

    it('separates Grabovica/Uzdol crime findings from Halilovic individual liability', () => {
        const event = events.find((row: any) => row.id === 'grabovica_uzdol_massacres_1993');
        const essay = readJson('data/scenarios/essays/grabovica_uzdol_massacres_1993.json');
        const prose = `${event.narrative}\n${event.effects.map((effect: any) => effect.text ?? '').join('\n')}\n${essay.content}`;

        expect(prose).toMatch(/ARBiH (?:soldiers|personnel).*Croat civilians/is);
        expect(prose).toMatch(/8-9 September 1993/i);
        expect(prose).toMatch(/14 September 1993/i);
        expect(prose).toMatch(/at least 13/i);
        expect(prose).toMatch(/29 civilians and one (?:captured )?HVO (?:soldier|prisoner of war)/i);
        expect(prose).toMatch(/acquitted/i);
        expect(prose).toMatch(/effective (?:command|control)/i);
        expect(prose).toMatch(/Appeal Chamber.*affirmed/is);
        expect(prose).not.toMatch(forbiddenSymmetry);
    });

    it('keeps the Grabovica/Uzdol atrocity record informational and unrewarded', () => {
        const event = events.find((row: any) => row.id === 'grabovica_uzdol_massacres_1993');

        expect(event.response_options).toBeUndefined();
        expect(event.requires_player_response).not.toBe(true);
        expect(event.effects.some((effect: any) => (
            effect.faction === 'RBiH'
            && ['morale_change', 'negotiation_capital', 'dimension_shift'].includes(effect.kind)
            && typeof effect.delta === 'number'
            && effect.delta > 0
        ))).toBe(false);
        expect(event.effects.some((effect: any) => (
            ['supply_delta', 'equipment_grant', 'territorial_legitimacy'].includes(effect.kind)
        ))).toBe(false);
    });

    it('omits unsupported Neretva strategic and symmetric overclaims', () => {
        const event = events.find((row: any) => row.id === 'operation_neretva_93_1993');
        const essay = readJson('data/scenarios/essays/operation_neretva_93_1993.json');
        const prose = `${event.narrative}\n${essay.content}`;

        expect(prose).toMatch(/14 September 1993/i);
        expect(prose).toMatch(/17 September/i);
        expect(prose).toMatch(/Vrdi/i);
        expect(prose).not.toMatch(/corridor (?:linking|to) (?:Mostar to )?the coast/i);
        expect(prose).not.toMatch(/one of the (?:largest|most ambitious)/i);
        expect(prose).not.toMatch(/decisive escalation/i);
        expect(prose).not.toMatch(forbiddenSymmetry);
    });

    it('keeps runtime essay-index metadata and content identical to authoring files', () => {
        for (const id of ESSAY_IDS) {
            const essay = readJson(`data/scenarios/essays/${id}.json`);
            const runtimeEssay = index.find((row: any) => row.id === essay.id);

            expect(runtimeEssay, `missing runtime essay ${essay.id}`).toBeTruthy();
            expect(runtimeEssay.sources).toEqual(essay.sources);
            expect(runtimeEssay.source_tier).toBe(essay.source_tier);
            expect(runtimeEssay.source_note).toBe(essay.source_note);
            expect(runtimeEssay.content).toBe(essay.content);
        }
    });
});

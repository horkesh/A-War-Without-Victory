/**
 * 1993 HVO-ARBiH truthful cards (owner Option A, 2026-11-14; §6 record in
 * docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md).
 *
 * The 1993 cards must not tell the player about an HVO offensive, a siege or a battle the
 * map does not show. Persisted strings (`title`, and the notification text of the response a
 * bot picks) stay as they were, because the engine copies them into the hashed save; their
 * corrected English lives in `localizations.en` and the UI resolves it at display time.
 */
import { describe, expect, it } from 'vitest';

import consequenceRows from '../../data/scenarios/events/consequences.json';
import war1993Rows from '../../data/scenarios/events/war_1993.json';

import {
    resolveEventDisplayNarrative,
    resolveEventDisplayTitle,
    resolveEventNotificationDisplay,
} from '../../src/ui/map/data/eventDisplayCopy';
import { getTickerEventsForTurn, PHASE0_TICKER_EVENTS } from '../../src/ui/warroom/content/ticker_events';

type Row = {
    id: string;
    title?: string;
    narrative?: string;
    staff_assessment?: string;
    trigger_evidence?: string[];
    effect?: { kind: string; text?: string };
    effects?: Array<{ kind: string; text?: string }>;
    response_options?: Array<{ id: string; label?: string; description?: string }>;
    historical_default_response_id?: string;
    notifications_to_other_factions?: Record<string, Record<string, { headline: string; body: string }>>;
    localizations?: Record<string, {
        title?: string;
        narrative?: string;
        notifications_to_other_factions?: Record<string, Record<string, { headline: string; body: string }>>;
    }>;
};

// Parsed event data (player-visible copy), not source text.
const war1993 = war1993Rows as unknown as Row[];
const consequences = consequenceRows as unknown as Row[];
const rows = new Map([...war1993, ...consequences].map((row) => [row.id, row]));
const row = (id: string): Row => {
    const found = rows.get(id);
    if (!found) throw new Error(`missing ${id}`);
    return found;
};

const REWRITTEN = [
    'gornji_vakuf_clashes_1993',
    'croat_bosniak_war_begins_1993',
    'central_bosnia_fighting_1993',
    'hrhb_central_bosnia_defense_1993',
    'csq_hvo_central_bosnia_offensive_1993',
    'sovici_doljani_attack_1993',
    'vitez_kiseljak_pockets_1993',
    'east_mostar_siege_1993',
    'maglaj_enclave_blockade_1993',
    'operation_neretva_93_1993',
] as const;

/** Every English string a player can read for a card, after display overrides. */
function englishDisplayStrings(card: Row): string[] {
    const out: string[] = [];
    out.push(card.localizations?.en?.title ?? card.title ?? '');
    if (card.narrative) out.push(card.narrative);
    if (card.staff_assessment) out.push(card.staff_assessment);
    out.push(...(card.trigger_evidence ?? []));
    for (const effect of [card.effect, ...(card.effects ?? [])]) {
        if (effect?.kind === 'narrative' && effect.text) out.push(effect.text);
    }
    for (const option of card.response_options ?? []) {
        if (option.label) out.push(option.label);
        if (option.description) out.push(option.description);
    }
    const overrides = card.localizations?.en?.notifications_to_other_factions ?? {};
    for (const [responseId, byFaction] of Object.entries(card.notifications_to_other_factions ?? {})) {
        for (const [faction, text] of Object.entries(byFaction)) {
            const shown = overrides[responseId]?.[faction] ?? text;
            out.push(shown.headline, shown.body);
        }
    }
    return out.filter(Boolean);
}

function sentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

describe('1993 HVO-ARBiH cards: map truth', () => {
    // Present-tense claims of map events the baseline engine does not produce for these cards.
    const MAP_EVENT_CLAIM = /\b(besieg\w*|siege|blockad\w*|pitched battle|reinforcements?|casualties mount|street fighting|fight(?:s|ing)? (?:a|with)\b|strike from|imposes? a (?:complete|total) blockade)/i;

    it.each(REWRITTEN)('%s states map events only in the historical-record register', (id) => {
        for (const text of englishDisplayStrings(row(id))) {
            for (const sentence of sentences(text)) {
                if (/historical record/i.test(sentence)) continue;
                expect(sentence, `${id}: ${sentence}`).not.toMatch(MAP_EVENT_CLAIM);
            }
        }
    });

    it('keeps the atrocity cards on the record, named specifically', () => {
        expect(row('ahmici_massacre_1993').title).toBe('Ahmići Massacre');
        expect(row('csq_hvo_central_bosnia_offensive_1993').narrative).toContain('Ahmići massacre');
        expect(row('sovici_doljani_attack_1993').narrative).toContain('Naletilić and Martinović');
        expect(row('stupni_do_massacre_1993').title).toBe('Stupni Do Massacre');
        expect(row('east_mostar_siege_1993').narrative).toContain('In the historical record the HVO attacked on 9 May 1993');
    });

    it('carries BCS copy for every rewritten card', () => {
        for (const id of REWRITTEN) {
            const bcs = row(id).localizations?.bcs;
            expect(bcs?.title, id).toBeTruthy();
            expect(bcs?.narrative, id).toBeTruthy();
        }
    });
});

describe('1993 HVO-ARBiH cards: persisted strings stay put', () => {
    // These titles are copied into turn_summaries[].events_fired inside the hashed save. Changing
    // them moves the 188w hash; the corrected English is localizations.en.title.
    it.each([
        ['gornji_vakuf_clashes_1993', 'HVO-ARBiH Fighting Erupts at Gornji Vakuf', 'Ultimatum at Gornji Vakuf'],
        ['east_mostar_siege_1993', 'HVO Besieges East Mostar', 'Mostar Divided'],
        ['maglaj_enclave_blockade_1993', 'Maglaj Enclave Under Joint HVO-VRS Blockade', 'Maglaj Between the VRS and the HVO'],
    ])('%s keeps its persisted title and displays the corrected one', (id, persisted, display) => {
        expect(row(id).title).toBe(persisted);
        expect(row(id).localizations?.en?.title).toBe(display);
        expect(resolveEventDisplayTitle(id, persisted, { locale: 'en' })).toBe(display);
    });

    it('keeps the historical-default notification text that bots persist', () => {
        const gornji = row('gornji_vakuf_clashes_1993');
        expect(gornji.historical_default_response_id).toBe('escalate');
        expect(gornji.notifications_to_other_factions?.escalate?.RBiH?.headline).toBe('HVO reinforces Gornji Vakuf fight');
        const pocket = row('hrhb_central_bosnia_defense_1993');
        expect(pocket.historical_default_response_id).toBe('defend_pocket');
        expect(pocket.notifications_to_other_factions?.defend_pocket?.RBiH?.headline).toBe('HVO digs in to hold central-Bosnia pocket');
    });
});

describe('eventDisplayCopy resolver', () => {
    it('resolves the active locale first, then English, then the persisted text', () => {
        expect(resolveEventDisplayTitle('east_mostar_siege_1993', 'HVO Besieges East Mostar', { locale: 'bcs' })).toBe('Podijeljeni Mostar');
        expect(resolveEventDisplayTitle('central_bosnia_fighting_1993', 'Central Bosnia Fronts Harden', { locale: 'en' })).toBe('Central Bosnia Fronts Harden');
        expect(resolveEventDisplayTitle('no_such_event', 'Persisted', { locale: 'bcs' })).toBe('Persisted');
        expect(resolveEventDisplayTitle('csq_hvo_central_bosnia_offensive_1993', 'Ahmići and the Rupture', { locale: 'bcs' })).toBe('Ahmići i raskid');
    });

    it('resolves the narrative for the acknowledgement modal in the active locale', () => {
        const en = row('east_mostar_siege_1993').narrative ?? '';
        expect(resolveEventDisplayNarrative('east_mostar_siege_1993', en, { locale: 'en' })).toBe(en);
        expect(resolveEventDisplayNarrative('east_mostar_siege_1993', en, { locale: 'bcs' })).toMatch(/^Mostar je podijeljen\./);
        expect(resolveEventDisplayNarrative('no_such_event', 'x', { locale: 'bcs' })).toBe('x');
    });

    it('resolves notification copy by response and recipient, falling back to the persisted text', () => {
        const persisted = {
            event_id: 'gornji_vakuf_clashes_1993',
            response_id: 'escalate',
            target_faction: 'RBiH' as const,
            headline: 'HVO reinforces Gornji Vakuf fight',
            body: 'persisted body',
        };
        expect(resolveEventNotificationDisplay(persisted, { locale: 'en' }).headline).toBe('HVO enforces its Gornji Vakuf ultimatum');
        expect(resolveEventNotificationDisplay({ ...persisted, response_id: 'negotiate' }, { locale: 'en' }))
            .toEqual({ headline: 'HVO reinforces Gornji Vakuf fight', body: 'persisted body' });
        expect(resolveEventNotificationDisplay({ ...persisted, event_id: 'hrhb_central_bosnia_defense_1993', response_id: 'defend_pocket' }, { locale: 'bcs' }).headline)
            .toBe('HVO ordered to hold its central-Bosnia pockets');
    });
});

describe('war-room ticker: 1993 HVO-ARBiH rows', () => {
    const headlines = (turn: number, firedEventIds: string[] = []) =>
        getTickerEventsForTurn(turn, { firedEventIds }).map((event) => event.text).join('\n');

    it('drops the siege and battle headlines the map never shows', () => {
        const all = PHASE0_TICKER_EVENTS.map((event) => event.text).join('\n');
        expect(all).not.toContain('HVO BESIEGES EAST MOSTAR');
        expect(all).not.toContain('SIEGE OF EAST MOSTAR');
        expect(all).not.toContain('VITEZ AND TRAVNIK SEE HEAVY FIGHTING');
        expect(all).not.toContain('VARDARSKI');
    });

    it('shows the Mostar, Ahmići, Stupni Do and Stari Most rows only after their events fire', () => {
        expect(headlines(110)).not.toContain('MOSTAR DIVIDED');
        expect(headlines(110)).not.toContain('AHMICI MASSACRE');
        expect(headlines(110)).not.toContain('STUPNI DO MASSACRE');
        expect(headlines(110)).not.toContain('STARI MOST');
        // The ticker shows the eight most recent eligible rows, so probe near each row's turn.
        expect(headlines(86, ['east_mostar_siege_1993'])).toContain('MOSTAR DIVIDED BETWEEN HVO AND ARBIH');
        expect(headlines(80, ['ahmici_massacre_1993'])).toContain('AHMICI MASSACRE');
        expect(headlines(105, ['stupni_do_massacre_1993', 'mostar_bridge_destroyed_1993'])).toContain('STUPNI DO MASSACRE');
        expect(headlines(105, ['stupni_do_massacre_1993', 'mostar_bridge_destroyed_1993'])).toContain('STARI MOST');
    });
});

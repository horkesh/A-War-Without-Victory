/**
 * No player reads another side's private business in an acknowledgement notice (owner ruling 2026-11-17, notice-leak count):
 * a csq_* consequence notice keyed to exactly one faction is shown only to that faction; neutral ones to all; an authored
 * `audience` settles the cases the rule cannot (Historian and Narrative seats, SHDG section 6 record of 2026-11-17).
 * The gate is src/ui/map/data/eventAudience.ts, used by the adapter for the fired-event list, the turn summaries and the
 * settlement timeline.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { eventAudienceFor, isEventNoticeVisibleTo, resolveEventAudience } from '../../src/ui/map/data/eventAudience.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { loadEventDefinitionsFromDir } from '../../src/sim/events/event_loader.js';
import { withoutComments } from '../helpers/sourceComments';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const EVENT_FILES = ['war_1992.json', 'war_1992_hrhb_summer.json', 'war_1993.json', 'war_1994.json', 'war_1995.json', 'consequences.json'];
const rows: any[] = EVENT_FILES.flatMap((name) => JSON.parse(withoutComments(readFileSync(`data/scenarios/events/${name}`, 'utf8'))));
const byId = new Map<string, any>(rows.filter((row) => typeof row?.id === 'string').map((row) => [row.id as string, row]));

/** The Historian's public rulings: keyed by the rule but known to every side at the time (or an agreement both sides see). */
const RULED_PUBLIC = [
    'csq_bihac_pocket_collapses_1994', 'csq_alternative_nato_trigger_1995', 'csq_early_peace_acceptance_w120',
    'csq_hvo_central_bosnia_offensive_1993', 'csq_federation_early_1994', 'csq_territorial_friction_1993',
    'csq_alliance_reset_after_rupture', 'csq_partition_referendum_proposal', 'csq_tripartite_federation_overture',
    'csq_third_party_mediation_offered', 'csq_post_dayton_train_and_equip_RBiH', 'csq_post_dayton_train_and_equip_HRHB',
] as const;

/** Notices the review found private to one side (named in the owner's leak count). */
const PRIVATE_EXAMPLES: Record<string, (typeof FACTIONS)[number]> = {
    csq_arbih_resistance_revival_RS: 'RS',
    csq_back_channel_communication_RS: 'RS',
    csq_enclave_drain_continues_1995: 'RS',
    csq_extended_truce_streak_RS: 'RS',
    csq_force_quality_inversion: 'RS',
    csq_paramilitary_authorization_refused: 'RS',
    csq_patron_arms_pipeline_attenuated: 'RS',
    csq_patron_equipment_delivery_confirmed: 'RS',
    csq_back_channel_communication_HRHB: 'HRHB',
    csq_extended_truce_streak_HRHB: 'HRHB',
    csq_civic_identity_consolidation_1993: 'RBiH',
    csq_refugee_absorption_strain: 'RBiH',
    csq_third_party_arms_channel: 'RBiH',
};

describe('acknowledgement notices reach only the player who may know of them', () => {
    it('the authored audience is valid event data (the event loader accepts every shipped row)', () => {
        expect(() => loadEventDefinitionsFromDir(0, 'data/scenarios/events')).not.toThrow();
        const authored = rows.filter((row) => row && 'audience' in row);
        expect(authored.length).toBe(RULED_PUBLIC.length + 2);
        for (const row of authored) {
            expect(row.audience === 'all' || (Array.isArray(row.audience) && row.audience.every((f: string) => (FACTIONS as readonly string[]).includes(f)))).toBe(true);
        }
    });

    it('the rule keys a single-faction consequence notice to that faction and leaves neutral notices to all', () => {
        expect(resolveEventAudience({ id: 'csq_x', effects: [{ kind: 'narrative', text: 'x' }, { kind: 'morale_change', faction: 'RS', delta: 1 }] })).toEqual(['RS']);
        expect(resolveEventAudience({ id: 'csq_x', effects: [], trigger: { condition: { type: 'flag_equals', flag: 'hrhb_x', value: true } } })).toEqual(['HRHB']);
        expect(resolveEventAudience({ id: 'csq_x', effects: [{ kind: 'morale_change', faction: 'RBiH', delta: 1 }, { kind: 'morale_change', faction: 'HRHB', delta: 1 }] })).toBe('all');
        expect(resolveEventAudience({ id: 'csq_x', effects: [] })).toBe('all');
        expect(resolveEventAudience({ id: 'ordinary_event', effects: [{ kind: 'morale_change', faction: 'RS', delta: 1 }] })).toBe('all');
        expect(resolveEventAudience({ id: 'csq_x', audience: 'all', effects: [{ kind: 'morale_change', faction: 'RS', delta: 1 }] })).toBe('all');
        expect(resolveEventAudience({ id: 'csq_x', audience: ['HRHB', 'RBiH'], effects: [] })).toEqual(['HRHB', 'RBiH']);
    });

    it('each player faction is shown no consequence notice keyed to another faction, except the ruled public ones', () => {
        for (const player of FACTIONS) {
            for (const [id, row] of byId) {
                if (!id.startsWith('csq_')) continue;
                const audience = resolveEventAudience(row);
                const visible = isEventNoticeVisibleTo(id, player);
                if (audience === 'all') expect(visible, `${id} for ${player}`).toBe(true);
                else expect(visible, `${id} for ${player}`).toBe((audience as readonly string[]).includes(player));
            }
        }
    });

    it('the Historian\'s public rulings are shown to every side', () => {
        for (const id of RULED_PUBLIC) {
            expect(eventAudienceFor(id), id).toBe('all');
            for (const player of FACTIONS) expect(isEventNoticeVisibleTo(id, player), `${id} for ${player}`).toBe(true);
        }
    });

    it('the private examples from the leak count are shown only to their own side', () => {
        for (const [id, owner] of Object.entries(PRIVATE_EXAMPLES)) {
            for (const player of FACTIONS) expect(isEventNoticeVisibleTo(id, player), `${id} for ${player}`).toBe(player === owner);
        }
    });

    it('the two war events with another side\'s internals are limited to the sides that could know them', () => {
        expect(eventAudienceFor('vitez_kiseljak_pockets_1993')).toEqual(['HRHB', 'RBiH']);
        expect(isEventNoticeVisibleTo('vitez_kiseljak_pockets_1993', 'RS')).toBe(false);
        expect(isEventNoticeVisibleTo('vitez_kiseljak_pockets_1993', 'RBiH')).toBe(true);
        expect(eventAudienceFor('croatia_herceg_bosna_control_1993')).toEqual(['HRHB']);
        expect(isEventNoticeVisibleTo('croatia_herceg_bosna_control_1993', 'RBiH')).toBe(false);
        expect(isEventNoticeVisibleTo('croatia_herceg_bosna_control_1993', 'RS')).toBe(false);
    });

    it('a run with no player faction shows everything (nothing to hide from)', () => {
        expect(isEventNoticeVisibleTo('csq_back_channel_communication_RS', null)).toBe(true);
        expect(isEventNoticeVisibleTo('csq_back_channel_communication_RS', undefined)).toBe(true);
    });

    it('the adapter applies the one gate to the fired-event list, the turn summaries and the timeline for each player', () => {
        const fired = ['csq_back_channel_communication_RS', 'csq_back_channel_communication_HRHB', 'csq_civic_identity_consolidation_1993', 'csq_hvo_central_bosnia_offensive_1993', 'arms_embargo_impact_1992'];
        const raw = (player: string): any => ({
            meta: { turn: 30, phase: 'war', player_faction: player },
            military: { fired_event_ids: fired, formations: {} },
            turn_summaries: [{ turn: 30, events_fired: fired.map((id) => ({ id, text: `title of ${id}` })), notable_events: [] }],
            political: { political_controllers: {} },
        });
        const expectedFor: Record<string, string[]> = {
            RBiH: ['csq_civic_identity_consolidation_1993', 'csq_hvo_central_bosnia_offensive_1993', 'arms_embargo_impact_1992'],
            RS: ['csq_back_channel_communication_RS', 'csq_hvo_central_bosnia_offensive_1993', 'arms_embargo_impact_1992'],
            HRHB: ['csq_back_channel_communication_HRHB', 'csq_hvo_central_bosnia_offensive_1993', 'arms_embargo_impact_1992'],
        };
        for (const player of FACTIONS) {
            const parsed = parseGameState(raw(player));
            const listed = (parsed.firedEvents ?? []).map((event) => event.id).sort();
            expect(listed, `fired list for ${player}`).toEqual([...expectedFor[player]!].sort());
            expect(parsed.turnSummaries[0]!.events_fired.map((event) => event.id).sort(), `summaries for ${player}`).toEqual([...expectedFor[player]!].sort());
            expect(parsed.latestTurnSummary!.events_fired.map((event) => event.id).sort(), `latest for ${player}`).toEqual([...expectedFor[player]!].sort());
            expect((parsed.historicalEventsByTurn ?? []).map((event) => event.id).sort(), `timeline for ${player}`).toEqual([...expectedFor[player]!].sort());
        }
    });
});

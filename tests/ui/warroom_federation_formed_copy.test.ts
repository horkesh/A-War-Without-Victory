/**
 * #763 condition 1 (narrative + historian seats, 2026-11-17): the war room announces the Federation
 * on the engine's washington_signed flip as a STATE, never a dated signing. Paths A, B and A' follow
 * an RBiH-HRHB war ("The Croat-Bosniak war is over"); Path C (Federation by consent) forms it with
 * no war fought, so no surface may say a war ended.
 */

import { describe, expect, it } from 'vitest';

import { findWarMilestoneEvent } from '../../src/ui/warroom/components/DeclarationEventModal.js';
import { pickBestWarHeadline } from '../../src/ui/warroom/content/war_headline_templates.js';
import { generateTickerWarEvents } from '../../src/ui/warroom/content/ticker_war_events.js';
import type { GameState } from '../../src/state/game_state.js';

function state(warStartedTurn: number | null): GameState {
    return {
        meta: { turn: 102 },
        political: {
            war_alliance_rbih_hrhb: 0.8,
            war_exhaustion: {},
            rbih_hrhb_state: { washington_signed: true, ceasefire_active: false, war_started_turn: warStartedTurn },
        },
    } as unknown as GameState;
}
const prev = { washingtonSigned: false, ceasefireActive: false, allianceValue: 0.8, exhaustion: {} } as never;
const signed = (warFought: boolean) => [{ type: 'washington_signed', faction: 'RBiH', visibility: 1, priority: 0, details: { warFought } }] as never;

describe('war room: Federation formed', () => {
    it('picks the war or the consent milestone from the engine record', () => {
        expect(findWarMilestoneEvent(state(63), prev, 'RBiH')).toBe('washington_agreement');
        expect(findWarMilestoneEvent(state(null), prev, 'RBiH')).toBe('washington_consent');
    });

    it('headline: the war is over only when a war was fought; no dated signing either way', () => {
        const war = pickBestWarHeadline(signed(true), 'RBiH', 102)!;
        const consent = pickBestWarHeadline(signed(false), 'RBiH', 102)!;
        expect(war.headline).toBe('FEDERATION FORMED');
        expect(war.subhead).toBe('The Croat-Bosniak war is over');
        expect(consent.headline).toBe('FEDERATION FORMED');
        expect(consent.subhead).toBe('The ARBiH-HVO alliance becomes a federation');
        expect(`${consent.subhead} ${consent.body}`).not.toMatch(/war is over|stopped fighting|war ends/i);
        for (const h of [war, consent]) expect(`${h.headline} ${h.subhead}`).not.toMatch(/SIGNED|signed/);
    });

    it('ticker: the war ends only when a war was fought', () => {
        expect(generateTickerWarEvents(signed(true), 'RBiH')).toContain('FEDERATION FORMED: ARBIH-HVO WAR ENDS');
        const consent = generateTickerWarEvents(signed(false), 'RBiH');
        expect(consent).toContain('FEDERATION FORMED: ARBIH-HVO ALLIANCE PUT ON A FORMAL FOOTING');
        expect(consent.join(' ')).not.toMatch(/WAR ENDS/);
    });
});

/**
 * A2b PR-B2 (2026-11-17): the HRHB President sees the refugee compact. One state line in Army HQ Records,
 * read from the same replay as the engine multipliers, in five phases (in force, suspended, ended by the
 * President's answer, ran out, ended at the Washington signing); EN and BCS. Copy: narrative designer,
 * reviewed by the historian. This test pins the facts the line may state, the faction gate, the
 * projection boundary, and that the line never contradicts the multipliers.
 */

import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

import { getRefugeeCompactRecruitmentMultiplier } from '../src/sim/early_war/refugee_compact.js';
import { buildRefugeeCompactLine } from '../src/ui/map/data/refugeeCompactLine.js';
import { setLocale } from '../src/ui/map/i18n/index.js';
import { turnToDateString } from '../src/ui/map/utils/formatters.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import type { GameState } from '../src/state/game_state.js';

type Row = [turn: number, eventId: string, responseId: string, source?: string];
const UNITED: Row = [0, 'hrhb_political_goal', 'united_front'];
const PERSISTS: Row = [5, 'hrhb_1992_graz_cooperation_collapse', 'formal_alliance_persists'];
const RENEW_H6: Row = [52, 'hrhb_central_bosnia_defense_1993', 'federate_early'];
const RENEW_OVERTURE: Row = [87, 'hrhb_federation_overture_1993', 'extend_federation_overture'];

function raw(rows: Row[], turn: number, bilateral: Record<string, unknown> = {}, faction = 'HRHB'): GameState {
  return {
    meta: { turn, player_faction: faction },
    military: {
      recruitment_modifiers: [],
      event_decision_log: rows.map(([t, event_id, response_id, source]) => ({
        event_id, response_id, decision_source: source ?? 'player', faction: 'HRHB', turn: t,
      })),
    },
    political: { rbih_hrhb_state: bilateral },
  } as unknown as GameState;
}

function view(rows: Row[], turn: number, bilateral: Record<string, unknown> = {}, faction = 'HRHB'): LoadedGameState {
  return { player_faction: faction, turn, rawGameState: raw(rows, turn, bilateral, faction) } as unknown as LoadedGameState;
}

afterEach(() => setLocale('en'));

describe('refugee compact line: the five phases (EN)', () => {
  it('in force: dated by the latest expiry, says it holds back Zagreb\'s pull only while it stands', () => {
    const line = buildRefugeeCompactLine(view([UNITED, PERSISTS], 20));
    expect(line?.phase).toBe('active');
    expect(line?.text).toBe(
      `Refugee compact until ${turnToDateString(5 + 56)}. Only while it stands: Zagreb's pull and displacement strain on the alliance eased, HVO recruitment slowed. Ends: Washington Agreement or your answers.`,
    );
  });

  it('in force after renewals: the date follows the renewal', () => {
    const line = buildRefugeeCompactLine(view([UNITED, PERSISTS, RENEW_H6, RENEW_OVERTURE], 100));
    expect(line?.phase).toBe('active');
    expect(line?.turn).toBe(87 + 30);
    expect(line?.text).toContain(turnToDateString(87 + 30));
  });

  it('suspended: only the displacement-strain easing is lifted; the recruitment cost still applies', () => {
    const line = buildRefugeeCompactLine(view([UNITED], 25, { refugee_compact_suspended_until: 30 }));
    expect(line?.phase).toBe('suspended');
    expect(line?.text).toContain('suspended after a settlement changed hands between the HVO and the ARBiH');
    expect(line?.text).toContain('The recruitment cost still applies.');
    expect(line?.text).not.toMatch(/Zagreb/);
  });

  it('ended by the President\'s answer', () => {
    const line = buildRefugeeCompactLine(view([UNITED, PERSISTS, [46, 'zagreb_restrains_boban_vopp', 'resist_patron']], 60));
    expect(line?.phase).toBe('lapsed');
    expect(line?.text).toBe(
      "Refugee compact ended by your answer. Displacement strain and Zagreb's pull on the alliance are back; HVO recruitment has recovered.",
    );
  });

  it('ran out: dated, and says no answer renewed it', () => {
    const line = buildRefugeeCompactLine(view([UNITED, PERSISTS], 70));
    expect(line?.phase).toBe('ran_out');
    expect(line?.text).toBe(
      `Refugee compact ran out on ${turnToDateString(5 + 56)}: no answer renewed it. Displacement strain and Zagreb's pull on the alliance are back; HVO recruitment has recovered.`,
    );
  });

  it('ended at the Washington signing: claims only that the agreement binds the alliance', () => {
    const line = buildRefugeeCompactLine(view([UNITED, PERSISTS, RENEW_H6, RENEW_OVERTURE], 110, { washington_signed: true, washington_turn: 102 }));
    expect(line?.phase).toBe('signed');
    expect(line?.text).toBe('Refugee compact ended with the Washington Agreement, which now binds the alliance. HVO recruitment has recovered.');
    expect(line?.text).not.toMatch(/pull/i);
  });
});

describe('refugee compact line: BCS (native register, same facts)', () => {
  it('renders every phase in BCS with the date where the phase carries one', () => {
    setLocale('bcs');
    const active = buildRefugeeCompactLine(view([UNITED, PERSISTS], 20));
    expect(active?.text.startsWith('Dogovor o prihvatu raseljenih do ')).toBe(true);
    expect(active?.text).toContain(turnToDateString(5 + 56));
    expect(active?.text).toContain('Kraj: Washingtonski sporazum ili vaši odgovori.');
    expect(buildRefugeeCompactLine(view([UNITED], 25, { refugee_compact_suspended_until: 30 }))?.text).toContain('obustavljeno');
    expect(buildRefugeeCompactLine(view([UNITED, PERSISTS, [46, 'zagreb_restrains_boban_vopp', 'resist_patron']], 60))?.text).toContain('okončan vašim odgovorom');
    const ranOut = buildRefugeeCompactLine(view([UNITED, PERSISTS], 70));
    expect(ranOut?.text).toContain('istekao je (');
    expect(ranOut?.text).toContain(turnToDateString(5 + 56));
    expect(buildRefugeeCompactLine(view([UNITED, PERSISTS, RENEW_H6, RENEW_OVERTURE], 110, { washington_signed: true, washington_turn: 102 }))?.text)
      .toContain('potpisivanjem Washingtonskog sporazuma');
  });

  it('no line carries an unresolved placeholder in either locale', () => {
    for (const locale of ['en', 'bcs'] as const) {
      setLocale(locale);
      const states: LoadedGameState[] = [
        view([UNITED, PERSISTS], 20),
        view([UNITED], 25, { refugee_compact_suspended_until: 30 }),
        view([UNITED, PERSISTS, [46, 'zagreb_restrains_boban_vopp', 'resist_patron']], 60),
        view([UNITED, PERSISTS], 70),
        view([UNITED, PERSISTS, RENEW_H6, RENEW_OVERTURE], 110, { washington_signed: true, washington_turn: 102 }),
      ];
      for (const s of states) {
        const text = buildRefugeeCompactLine(s)?.text ?? '';
        expect(text.length).toBeGreaterThan(20);
        expect(text).not.toMatch(/[{}]|undefined|null/);
      }
    }
  });
});

describe('refugee compact line: who sees it, and that it agrees with the engine', () => {
  it('no line for another faction, for a President with no granting choice, for a bot-sourced grant, or without state', () => {
    expect(buildRefugeeCompactLine(view([UNITED, PERSISTS], 20, {}, 'RBiH'))).toBeNull();
    expect(buildRefugeeCompactLine(view([UNITED, PERSISTS], 20, {}, 'RS'))).toBeNull();
    expect(buildRefugeeCompactLine(view([], 20))).toBeNull();
    expect(buildRefugeeCompactLine(view([[0, 'hrhb_political_goal', 'united_front', 'bot_political']], 20))).toBeNull();
    expect(buildRefugeeCompactLine(null)).toBeNull();
    expect(buildRefugeeCompactLine({ player_faction: 'HRHB', turn: 5 } as unknown as LoadedGameState)).toBeNull();
  });

  it('shows a price exactly when the engine charges one (in force or suspended)', () => {
    const rows: Row[] = [UNITED, PERSISTS];
    for (const turn of [0, 20, 60, 63, 64, 100]) {
      const phase = buildRefugeeCompactLine(view(rows, turn))?.phase ?? 'none';
      const charged = getRefugeeCompactRecruitmentMultiplier(raw(rows, turn), 'HRHB', turn) < 1;
      expect(charged).toBe(phase === 'active' || phase === 'suspended');
    }
  });
});

describe('player-visible projection: only the Washington and compact fields leave the bilateral state', () => {
  const require = createRequire(import.meta.url);
  const { projectPlayerVisibleState } = require('../src/desktop/player_visible_state.cjs') as { projectPlayerVisibleState: (state: unknown) => any };

  it('carries washington_signed, washington_turn and the suspension, and nothing else of rbih_hrhb_state', () => {
    const state = {
      meta: { turn: 30, player_faction: 'HRHB' },
      military: { event_decision_log: [] },
      political: {
        rbih_hrhb_state: {
          washington_signed: true,
          washington_turn: 102,
          refugee_compact_suspended_until: 40,
          allied_mixed_municipalities: ['travnik'],
          ceasefire_active: true,
          war_started_turn: 49,
        },
      },
    };
    const projected = projectPlayerVisibleState(state);
    expect(projected.political.rbih_hrhb_state).toEqual({
      washington_signed: true,
      washington_turn: 102,
      refugee_compact_suspended_until: 40,
    });
  });

  it('omits the key when none of the three fields exists (no empty object)', () => {
    const projected = projectPlayerVisibleState({
      meta: { turn: 3, player_faction: 'HRHB' },
      military: { event_decision_log: [] },
      political: { rbih_hrhb_state: { ceasefire_active: false } },
    });
    expect('rbih_hrhb_state' in projected.political).toBe(false);
  });
});

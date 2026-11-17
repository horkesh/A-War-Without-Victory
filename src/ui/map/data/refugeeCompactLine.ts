// historical_source: The compact is a played mechanic over the RBiH-HRHB alliance (Systems Manual §6.6a, A2b note); it reads the President's own filed answers, not the historical record.
// source_tier: design_counterfactual
// source_note: One state line for the HRHB President in Army HQ Records. It says only what refugee_compact.ts models: the easing of displacement strain and of Zagreb's pull on the alliance (held back only while the compact stands), the recruitment cost, and how it ends. Copy: narrative designer, reviewed by the historian (binding rule: never imply refugees caused the 1993 war).

import type { GameState } from '../../../state/game_state.js';
import type { LoadedGameState } from './types';
import {
  getRefugeeCompactPhase,
  type RefugeeCompactPhaseName,
} from '../../../sim/early_war/refugee_compact.js';
import { t, type MessageKey } from '../i18n/index.js';
import { turnToDateString } from '../utils/formatters.js';

export type RefugeeCompactLinePhase = Exclude<RefugeeCompactPhaseName, 'none'>;

export interface RefugeeCompactLine {
  phase: RefugeeCompactLinePhase;
  /** The turn the line is dated by: the expiry while in force, the ending turn once ended. */
  turn: number | null;
  /** The player-facing sentence(s), in the active locale. */
  text: string;
}

const LINE_KEYS: Record<RefugeeCompactLinePhase, MessageKey> = {
  active: 'recordsContent.refugeeCompact.active',
  suspended: 'recordsContent.refugeeCompact.suspended',
  lapsed: 'recordsContent.refugeeCompact.lapsed',
  ran_out: 'recordsContent.refugeeCompact.ranOut',
  signed: 'recordsContent.refugeeCompact.signed',
};

/**
 * The HRHB President's refugee compact, as one line for Army HQ Records; null for every other
 * faction, for a President who never made a granting choice, and when there is no live state. The
 * phase comes from the same replay as the multipliers (`getRefugeeCompactPhase`), so the line can
 * never disagree with what the engine applies. An ending stays visible: nothing ends silently.
 */
export function buildRefugeeCompactLine(state: LoadedGameState | null | undefined): RefugeeCompactLine | null {
  const raw = state?.rawGameState;
  if (!state || !raw) return null;
  const faction = typeof state.player_faction === 'string' ? state.player_faction : raw.meta?.player_faction;
  if (faction !== 'HRHB') return null;
  const turn = typeof raw.meta?.turn === 'number' ? raw.meta.turn : state.turn;
  // The player-visible projection carries the three bilateral fields under `refugee_compact_view`;
  // a full state (dev build, tests) carries them in `rbih_hrhb_state`. The replay reads the latter shape.
  const political = raw.political as unknown as { refugee_compact_view?: Record<string, unknown>; rbih_hrhb_state?: Record<string, unknown> } | undefined;
  const bilateral = political?.refugee_compact_view ?? political?.rbih_hrhb_state;
  const replayState = { ...raw, political: { ...(raw.political ?? {}), rbih_hrhb_state: bilateral } } as unknown as GameState;
  const status = getRefugeeCompactPhase(replayState, turn);
  if (status.phase === 'none') return null;

  const dated = status.phase === 'active' ? status.until : status.phase === 'ran_out' ? status.ended_turn : null;
  return {
    phase: status.phase,
    turn: status.phase === 'active' || status.phase === 'suspended' ? status.until : status.ended_turn,
    text: t(LINE_KEYS[status.phase], dated != null ? { date: turnToDateString(dated) } : undefined),
  };
}

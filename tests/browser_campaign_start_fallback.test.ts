import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveBrowserEventDecision,
  startCampaignFromSidePicker,
} from '../src/ui/map/desktop/campaignRecruitmentActions';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter';
import type { IPC } from '../src/ui/map/desktop/useIPC';

const STARTUP = JSON.parse(readFileSync(
  join(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json'),
  'utf8',
));
const WAR_1992 = JSON.parse(readFileSync(
  join(process.cwd(), 'data', 'scenarios', 'events', 'war_1992.json'),
  'utf8',
));

function response(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => structuredClone(payload),
  } as Response;
}

describe('browser new-campaign fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queues the selected faction foundational decision when Electron IPC is unavailable', async () => {
    const expected = [
      { faction: 'RBiH' as const, eventId: 'rbih_state_identity' },
      { faction: 'RS' as const, eventId: 'rs_strategic_goals' },
      { faction: 'HRHB' as const, eventId: 'hrhb_political_goal' },
    ];
    const ipc = { isAvailable: false } as IPC;

    for (const { faction, eventId } of expected) {
      const loaded: unknown[] = [];
      const setLoadError = vi.fn();
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/data/derived/startup/apr_1992_initial_save.json')) return response(STARTUP);
        if (url.endsWith('/data/scenarios/events/war_1992.json')) return response(WAR_1992);
        throw new Error(`Unexpected fetch: ${url}`);
      });

      const ok = await startCampaignFromSidePicker({
        ipc,
        loadSave: async (state) => { loaded.push(state); },
        setLoadError,
      }, faction, 'apr_1992');

      expect(ok).toBe(true);
      expect(setLoadError).not.toHaveBeenCalled();
      expect(loaded).toHaveLength(1);
      const state = loaded[0] as {
        meta: {
          player_faction: string;
          decision_mode?: string;
          headless_scenario_auto_control?: boolean;
        };
        political?: { control_events?: unknown[] };
        military: {
          pending_event_decisions?: Array<{ event_id: string; faction: string; requires_player_response?: boolean }>;
          fired_event_ids: string[];
        };
      };
      const pending = state.military.pending_event_decisions ?? [];
      expect(state.meta.player_faction).toBe(faction);
      expect(state.meta.decision_mode).toBe('emergent');
      expect(state.meta.headless_scenario_auto_control).not.toBe(true);
      expect(state.political?.control_events ?? []).toHaveLength(0);
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        event_id: eventId,
        faction,
        requires_player_response: true,
      });
      expect(state.military.fired_event_ids).toContain(eventId);
    }
  });

  it('resolves a browser-fallback foundational decision locally', async () => {
    const loaded: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/data/derived/startup/apr_1992_initial_save.json')) return response(STARTUP);
      if (url.endsWith('/data/scenarios/events/war_1992.json')) return response(WAR_1992);
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await startCampaignFromSidePicker({
      ipc: { isAvailable: false } as IPC,
      loadSave: async (state) => { loaded.push(state); },
      setLoadError: vi.fn(),
    }, 'RS', 'apr_1992');

    const state = loaded[0] as typeof STARTUP;
    resolveBrowserEventDecision(state, 'rs_strategic_goals', 'all_six');

    expect(state.military.pending_event_decisions ?? []).toHaveLength(0);
    expect(state.military.event_flags.rs_strategic_goals).toBe('all_six');
    expect(state.military.event_decision_log).toContainEqual(expect.objectContaining({
      event_id: 'rs_strategic_goals',
      response_id: 'all_six',
      decision_source: 'player',
      faction: 'RS',
    }));
    expect(state.military.enabled_event_ids).toContain('rs_paramilitary_policy_1992');
    expect(state.military.closed_event_ids).toContain('csq_drina_partisan_resistance_1992');
    expect(state.military.event_causality_log).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from_event: 'rs_strategic_goals',
          to_event: 'rs_paramilitary_policy_1992',
          kind: 'enables',
          source_response_id: 'all_six',
        }),
        expect.objectContaining({
          from_event: 'rs_strategic_goals',
          to_event: 'csq_drina_partisan_resistance_1992',
          kind: 'closes',
          source_response_id: 'all_six',
        }),
      ]),
    );

    const parsed = parseGameState(state);
    const filed = parsed.firedEvents?.find((event) => event.id === 'rs_strategic_goals');
    expect(filed).toMatchObject({
      isDecision: true,
      title: 'Rs Strategic Goals',
      narrative: 'Presidential response filed in the campaign record.',
    });
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveBrowserEventDecision,
  startCampaignFromSidePicker,
} from '../src/ui/map/desktop/campaignRecruitmentActions';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter';
import type { IPC } from '../src/ui/map/desktop/useIPC';
import {
  advanceTurn,
  deserializeState,
  resolveDesktopEventDecision,
  serializeState,
  startNewCampaign,
} from '../src/desktop/desktop_sim';
import type { EventDefinition } from '../src/sim/events/event_types';

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

  it('applies the packaged start response once without pulling the same campaign again', async () => {
    const loadSave = vi.fn(async () => undefined);
    const getCurrentGameState = vi.fn(async () => 'duplicate-state');
    const ipc = {
      isAvailable: true,
      startNewCampaign: vi.fn(async () => ({ ok: true, stateJson: 'response-state' })),
      getCurrentGameState,
    } as unknown as IPC;

    const ok = await startCampaignFromSidePicker({
      ipc,
      loadSave,
      setLoadError: vi.fn(),
    }, { playerFaction: 'RBiH', decisionMode: 'historical', scenarioKey: 'apr_1992' });

    expect(ok).toBe(true);
    expect(loadSave).toHaveBeenCalledOnce();
    expect(loadSave).toHaveBeenCalledWith('response-state');
    expect(ipc.startNewCampaign).toHaveBeenCalledWith({
      playerFaction: 'RBiH',
      decisionMode: 'historical',
      scenarioKey: 'apr_1992',
    });
    expect(getCurrentGameState).not.toHaveBeenCalled();
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
      }, { playerFaction: faction, decisionMode: 'emergent', scenarioKey: 'apr_1992' });

      expect(ok).toBe(true);
      expect(setLoadError).not.toHaveBeenCalled();
      expect(loaded).toHaveLength(1);
      const state = loaded[0] as {
        meta: {
          player_faction: string;
          decision_mode?: string;
          headless_scenario_auto_control?: boolean;
          pending_proposal_reviews?: Array<{ proposed_action?: string; faction?: string }>;
        };
        political?: { control_events?: unknown[] };
        military: {
          pending_event_decisions?: Array<{ event_id: string; faction: string; requires_player_response?: boolean }>;
          fired_event_ids: string[];
          corps_command?: Record<string, {
            active_operations?: Array<{ name?: string; is_pre_planned?: boolean }>;
            queued_operations?: string[];
          }>;
        };
      };
      const pending = state.military.pending_event_decisions ?? [];
      expect(state.meta.player_faction).toBe(faction);
      expect(state.meta.decision_mode).toBe('emergent');
      expect(state.meta.headless_scenario_auto_control).not.toBe(true);
      expect(Object.keys((state.military as any).negotiation?.capital ?? {})).toEqual(['RBiH', 'RS', 'HRHB']);
      expect(Object.keys((state.military as any).negotiation?.patron_relationships ?? {})).toEqual(['RBiH', 'RS', 'HRHB']);
      expect(Object.keys((state.military as any).negotiation?.strategic_dimensions ?? {})).toEqual(['RBiH', 'RS', 'HRHB']);
      expect(state.political?.control_events ?? []).toHaveLength(0);
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        event_id: eventId,
        faction,
        requires_player_response: true,
      });
      expect(state.military.fired_event_ids).toContain(eventId);
      const playerCorpsOps = Object.entries(state.military.corps_command ?? {})
        .flatMap(([corpsId, command]) => (command.active_operations ?? [])
          .map((operation) => ({ corpsId, operation })))
        .filter(({ operation }) => operation.is_pre_planned === true)
        .filter(({ corpsId }) =>
          (faction === 'RS' && corpsId.startsWith('vrs_'))
          || (faction === 'HRHB' && corpsId.startsWith('hvo_'))
          || (faction === 'RBiH' && corpsId.startsWith('arbih_'))
        );
      if (faction === 'RS') {
        // Standing authorization (2026-08-31): the player's historical operations are live at
        // campaign birth in the browser fallback too, matching the Electron path and the
        // calibration line. Previously they were withheld pending an authorization review.
        // Asserted for RS only — it is the faction with pre-planned operations in this fixture.
        expect(playerCorpsOps.length).toBeGreaterThan(0);
        expect(state.meta.pending_proposal_reviews).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              faction: 'RS',
              proposed_action: 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina',
            }),
          ]),
        );
        // The old assertion here was `queued_operations` === undefined, proving the deferral
        // had DELETED the queue while withholding the live operation. Standing authorization
        // removed that deletion, so the assertion has no subject left; the meaningful contract
        // is the live-operations check above.
      }
    }
  });

  it('records historical mode explicitly in browser fallback', async () => {
    const loaded: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/data/derived/startup/apr_1992_initial_save.json')) return response(STARTUP);
      if (url.endsWith('/data/scenarios/events/war_1992.json')) return response(WAR_1992);
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const ok = await startCampaignFromSidePicker({
      ipc: { isAvailable: false } as IPC,
      loadSave: async (state) => { loaded.push(state); },
      setLoadError: vi.fn(),
    }, { playerFaction: 'RS', decisionMode: 'historical', scenarioKey: 'apr_1992' });

    expect(ok).toBe(true);
    expect((loaded[0] as { meta: { decision_mode?: string } }).meta.decision_mode).toBe('historical');
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
    }, { playerFaction: 'RS', decisionMode: 'emergent', scenarioKey: 'apr_1992' });

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
      title: 'The Assembly Speaks',
      narrative: 'Presidential response filed in the campaign record.',
    });
  });

  it('keeps every foundational option byte-identical across Electron and browser adapters', async () => {
    const catalog = WAR_1992 as EventDefinition[];
    const openingProjection = (state: any) => ({
      negotiation: state.military.negotiation,
      pending_event_decisions: state.military.pending_event_decisions,
      fired_event_ids: state.military.fired_event_ids,
      event_fire_counts: state.military.event_fire_counts,
      event_last_fired_turn: state.military.event_last_fired_turn,
      event_readiness: state.military.event_readiness,
      event_flags: state.military.event_flags,
      enabled_event_ids: state.military.enabled_event_ids,
      closed_event_ids: state.military.closed_event_ids,
      event_decision_log: state.military.event_decision_log,
      pending_event_notifications: state.military.pending_event_notifications,
      recruitment_modifiers: state.military.recruitment_modifiers,
      bot_priority_shifts: state.military.bot_priority_shifts,
      event_aggression_modifiers: state.military.event_aggression_modifiers,
      equipment_quality_modifiers: state.military.equipment_quality_modifiers,
      formation_morale: Object.fromEntries(Object.entries(state.military.formations)
        .map(([id, formation]: [string, any]) => [id, formation.morale])),
      war_alliance_rbih_hrhb: state.political.war_alliance_rbih_hrhb,
      paramilitary_policy: state.paramilitary_policy,
    });
    for (const { faction, eventId } of [
      { faction: 'RBiH' as const, eventId: 'rbih_state_identity' },
      { faction: 'RS' as const, eventId: 'rs_strategic_goals' },
      { faction: 'HRHB' as const, eventId: 'hrhb_political_goal' },
    ]) {
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
      }, { playerFaction: faction, decisionMode: 'emergent', scenarioKey: 'apr_1992' });
      const browserStart = loaded[0] as typeof STARTUP;
      const desktopStart = (await startNewCampaign(process.cwd(), faction, 'apr_1992', 'emergent')).state;
      expect(openingProjection(browserStart)).toEqual(openingProjection(desktopStart));

      const definition = catalog.find((entry) => entry.id === eventId)!;
      expect(browserStart.military.pending_event_decisions[0].response_options).toEqual(definition.response_options);
      for (const option of definition.response_options ?? []) {
        const browser = structuredClone(browserStart);
        const desktop = structuredClone(desktopStart);
        resolveBrowserEventDecision(browser, eventId, option.id, catalog);
        const desktopResolved = resolveDesktopEventDecision(desktop, eventId, option.id, process.cwd());
        expect(openingProjection(browser), `${eventId}:${option.id}`).toEqual(openingProjection(desktopResolved));
        expect(openingProjection(JSON.parse(serializeState(browser)))).toEqual(openingProjection(browser));
        expect(browser.military.event_decision_log.filter((receipt: any) => receipt.event_id === eventId)).toEqual([{
          event_id: eventId,
          response_id: option.id,
          decision_source: 'player',
          faction,
          turn: 0,
        }]);
        expect(browser.military.event_fire_counts[eventId]).toBe(1);
        expect(browser.military.event_last_fired_turn[eventId]).toBe(0);
        expect(browser.military.event_readiness[eventId]).toBe(0);

        const authoredNotifications = definition.notifications_to_other_factions?.[option.id] ?? {};
        expect(browser.military.pending_event_notifications
          .filter((notification: any) => notification.event_id === eventId && notification.response_id === option.id)
          .sort((a: any, b: any) => a.target_faction.localeCompare(b.target_faction)))
          .toEqual(Object.entries(authoredNotifications)
            .map(([target, content]) => {
              if (!content) throw new Error(`Missing authored notification ${eventId}:${option.id}:${target}`);
              return {
                notification_id: `${eventId}:${faction}:${target}`,
                event_id: eventId,
                response_id: option.id,
                source_faction: faction,
                target_faction: target,
                headline: content.headline,
                body: content.body,
                surfaced_on_turn: 1,
                consumed: false,
              };
            })
            .sort((a, b) => a.target_faction.localeCompare(b.target_faction)));

        for (const effect of option.effects ?? []) {
          if (effect.kind === 'morale_change') {
            for (const [formationId, beforeFormation] of Object.entries(browserStart.military.formations) as Array<[string, any]>) {
              if (beforeFormation.faction !== effect.faction || beforeFormation.status !== 'active' || beforeFormation.morale == null) continue;
              expect(browser.military.formations[formationId].morale, `${eventId}:${option.id}:morale:${formationId}`)
                .toBe(Math.max(0, Math.min(100, beforeFormation.morale + effect.delta)));
            }
          } else if (effect.kind === 'alliance_change') {
            const beforeAlliance = browserStart.political.war_alliance_rbih_hrhb ?? 0;
            expect(browser.political.war_alliance_rbih_hrhb).toBe(Math.max(-1, Math.min(1, beforeAlliance + effect.delta)));
          } else if (effect.kind === 'aggression_modifier') {
            expect(browser.military.event_aggression_modifiers).toContainEqual({
              faction: effect.faction,
              delta: effect.delta,
              expires_turn: effect.duration_turns,
            });
          } else if (effect.kind === 'equipment_quality_modifier') {
            expect(browser.military.equipment_quality_modifiers).toContainEqual({
              faction: effect.faction,
              multiplier: effect.multiplier,
              expires_turn: effect.duration_turns,
            });
          }
        }

        let browserReady = deserializeState(serializeState(browser));
        let desktopReady = deserializeState(serializeState(desktopResolved));
        if (faction === 'RBiH') {
          resolveBrowserEventDecision(browserReady, 'rbih_paramilitary_policy_1992', 'always_deny', catalog);
          desktopReady = resolveDesktopEventDecision(
            desktopReady,
            'rbih_paramilitary_policy_1992',
            'always_deny',
            process.cwd(),
          );
        }
        const [browserAdvanced, desktopAdvanced] = await Promise.all([
          advanceTurn(browserReady, process.cwd()),
          advanceTurn(desktopReady, process.cwd()),
        ]);
        expect(browserAdvanced.error, `browser advance ${eventId}:${option.id}`).toBeUndefined();
        expect(desktopAdvanced.error, `desktop advance ${eventId}:${option.id}`).toBeUndefined();
        for (const effect of option.effects ?? []) {
          if (effect.kind === 'aggression_modifier') {
            const expected = { faction: effect.faction, delta: effect.delta, expires_turn: effect.duration_turns };
            expect(browserAdvanced.state.military.event_aggression_modifiers).toContainEqual(expected);
            expect(desktopAdvanced.state.military.event_aggression_modifiers).toContainEqual(expected);
          } else if (effect.kind === 'equipment_quality_modifier') {
            const expected = { faction: effect.faction, multiplier: effect.multiplier, expires_turn: effect.duration_turns };
            expect(browserAdvanced.state.military.equipment_quality_modifiers).toContainEqual(expected);
            expect(desktopAdvanced.state.military.equipment_quality_modifiers).toContainEqual(expected);
          }
        }
        for (const [flag, value] of Object.entries(option.sets_flags ?? {})) {
          expect(browserAdvanced.state.military.event_flags[flag]).toEqual(value);
          expect(desktopAdvanced.state.military.event_flags[flag]).toEqual(value);
        }
        for (const shift of option.dimension_shifts ?? []) {
          const before = browserReady.military.negotiation!.strategic_dimensions![shift.faction][shift.dimension].event_modifier;
          expect(browserAdvanced.state.military.negotiation!.strategic_dimensions![shift.faction][shift.dimension].event_modifier)
            .toBe(before);
          expect(desktopAdvanced.state.military.negotiation!.strategic_dimensions![shift.faction][shift.dimension].event_modifier)
            .toBe(before);
        }
      }
      vi.restoreAllMocks();
    }
  });
});

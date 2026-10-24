import { describe, expect, it } from 'vitest';

import {
  advanceTurn,
  deserializeState,
  resolveDesktopEventDecision,
  serializeState,
  startNewCampaign,
} from '../src/desktop/desktop_sim.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import { resolvePlayerEventDecisionWithOpeningPolicy } from '../src/sim/events/opening_policy_transition.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { updateEventReadiness } from '../src/sim/events/pressure_system.js';
import { resolveEventDecision } from '../src/sim/events/resolve_decision.js';
import type { GameState } from '../src/state/game_state.js';
import { listBlockingPlayerDecisions } from '../src/state/player_decision_manifest.js';
import { resolveBrowserEventDecision } from '../src/ui/map/desktop/campaignRecruitmentActions.js';
import war1992Events from '../data/scenarios/events/war_1992.json';

const POLICY_EVENT_ID = 'rbih_paramilitary_policy_1992';
const POLICY_OPTIONS = ['always_deny', 'ask', 'always_allow'] as const;
const EXPECTED_TARGETS = ['op:brcko:bukvik_gornji_2', 'op:srebrenica:obadi'];
const EVENT_CATALOG = war1992Events as EventDefinition[];

async function openingState(): Promise<GameState> {
  return (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992', 'historical')).state;
}

async function pendingPolicyState(): Promise<GameState> {
  return resolveDesktopEventDecision(
    await openingState(),
    'rbih_state_identity',
    'civic',
    process.cwd(),
  );
}

async function authoredLegacyIdentityPending(): Promise<GameState> {
  const state = await openingState();
  const identity = EVENT_CATALOG.find((entry) => entry.id === 'rbih_state_identity')!;
  state.military.pending_event_decisions = [];
  state.military.fired_event_ids = state.military.fired_event_ids.filter((id) => id !== 'rbih_state_identity');
  delete state.military.event_fire_counts.rbih_state_identity;
  delete state.military.event_last_fired_turn.rbih_state_identity;
  delete state.military.event_readiness.rbih_state_identity;
  state.military.enabled_event_ids = state.military.enabled_event_ids.filter((id) => id !== POLICY_EVENT_ID);
  for (const turn of [2, 3]) {
    state.meta.turn = turn;
    updateEventReadiness(state, [identity]);
    evaluateEvents(state, () => 0.5, turn, [identity]);
  }
  delete state.meta.headless_scenario_auto_control;
  return deserializeState(serializeState(state));
}

function dimension(state: GameState, id: 'international_standing' | 'internal_cohesion' | 'negotiating_leverage'): number {
  return state.military.negotiation?.strategic_dimensions?.RBiH?.[id]?.effective_value ?? 0;
}

describe('pre-first-Advance RBiH paramilitary policy', () => {
  it('queues the complete policy decision only after the explicit turn-0 identity receipt', async () => {
    const state = await openingState();

    expect(state.meta).toMatchObject({
      phase: 'war',
      turn: 0,
      player_faction: 'RBiH',
      headless_scenario_auto_control: false,
    });
    expect(state.paramilitary_policy).toBe('ask');
    expect(state.military.pending_event_decisions?.map((decision) => decision.event_id)).toEqual([
      'rbih_state_identity',
    ]);

    const resolved = resolveDesktopEventDecision(
      state,
      'rbih_state_identity',
      'civic',
      process.cwd(),
    );

    const pending = resolved.military.pending_event_decisions ?? [];
    expect(pending.map((decision) => decision.event_id)).toEqual([
      POLICY_EVENT_ID,
    ]);
    expect(pending[0]).toMatchObject({
      event_id: POLICY_EVENT_ID,
      faction: 'RBiH',
      requires_player_response: true,
      historical_default_response_id: 'always_deny',
      turn_fired: 0,
    });
    expect(pending[0]?.response_options.map((option) => option.id)).toEqual([
      ...POLICY_OPTIONS,
    ]);
    expect(resolved.paramilitary_policy).toBe('ask');
    expect(resolved.military.event_decision_log).toEqual([
      expect.objectContaining({
        event_id: 'rbih_state_identity',
        response_id: 'civic',
        decision_source: 'player',
        faction: 'RBiH',
        turn: 0,
      }),
    ]);
    expect(resolved.military.fired_event_ids).toContain(POLICY_EVENT_ID);
    expect(resolved.military.event_fire_counts[POLICY_EVENT_ID]).toBe(1);
    expect(resolved.military.event_last_fired_turn[POLICY_EVENT_ID]).toBe(0);
    expect(resolved.pending_paramilitary_requests ?? []).toHaveLength(0);
    expect(resolved.political.control_events ?? []).toHaveLength(0);
    expect(listBlockingPlayerDecisions(resolved as any)).toEqual([
      expect.objectContaining({ id: POLICY_EVENT_ID, gatePolicy: 'hard_block' }),
    ]);
    expect(serializeState(deserializeState(serializeState(resolved)))).toBe(serializeState(resolved));
  });

  it.each([
    {
      responseId: 'always_deny' as const,
      policy: 'always_deny',
      flags: { rbih_paramilitary_policy: 'always_deny', rbih_paramilitary_refused: true },
      dimensions: { international_standing: 5, internal_cohesion: -3, negotiating_leverage: 0 },
      recruitment: [],
      priority: [],
    },
    {
      responseId: 'ask' as const,
      policy: 'ask',
      flags: { rbih_paramilitary_policy: 'ask' },
      dimensions: { international_standing: -3, internal_cohesion: -2, negotiating_leverage: 0 },
      recruitment: [{ faction: 'RBiH', pool_multiplier: 0.97, expires_turn: 52 }],
      priority: [],
    },
    {
      responseId: 'always_allow' as const,
      policy: 'always_allow',
      flags: { rbih_paramilitary_policy: 'always_allow', rbih_paramilitary_authorized: true },
      dimensions: { international_standing: -25, internal_cohesion: 0, negotiating_leverage: -15 },
      recruitment: [{ faction: 'RBiH', pool_multiplier: 0.95, expires_turn: 52 }],
      priority: [{ faction: 'RBiH', add_objectives: ['paramilitary_rear_clearance'], expires_turn: 104 }],
    },
  ])('applies the complete canonical $responseId response exactly once', async ({
    responseId,
    policy,
    flags,
    dimensions,
    recruitment,
    priority,
  }) => {
    const before = await pendingPolicyState();
    const beforeDimensions = {
      international_standing: dimension(before, 'international_standing'),
      internal_cohesion: dimension(before, 'internal_cohesion'),
      negotiating_leverage: dimension(before, 'negotiating_leverage'),
    };
    const resolved = resolveDesktopEventDecision(before, POLICY_EVENT_ID, responseId, process.cwd());

    expect(resolved.paramilitary_policy).toBe(policy);
    expect(resolved.military.pending_event_decisions ?? []).toHaveLength(0);
    expect(resolved.military.event_flags).toMatchObject(flags);
    expect(dimension(resolved, 'international_standing') - beforeDimensions.international_standing)
      .toBe(dimensions.international_standing);
    expect(dimension(resolved, 'internal_cohesion') - beforeDimensions.internal_cohesion)
      .toBe(dimensions.internal_cohesion);
    expect(dimension(resolved, 'negotiating_leverage') - beforeDimensions.negotiating_leverage)
      .toBe(dimensions.negotiating_leverage);
    expect(resolved.military.recruitment_modifiers ?? []).toEqual(expect.arrayContaining(recruitment));
    if (recruitment.length === 0) expect(resolved.military.recruitment_modifiers ?? []).toHaveLength(0);
    expect(resolved.military.bot_priority_shifts ?? []).toEqual(expect.arrayContaining(priority));
    if (priority.length === 0) expect(resolved.military.bot_priority_shifts ?? []).toHaveLength(0);
    expect(resolved.military.event_decision_log?.filter((receipt) => receipt.event_id === POLICY_EVENT_ID)).toEqual([
      expect.objectContaining({
        event_id: POLICY_EVENT_ID,
        response_id: responseId,
        decision_source: 'player',
        faction: 'RBiH',
        turn: 0,
      }),
    ]);
    expect(resolved.military.pending_event_notifications
      ?.filter((notification) => notification.event_id === POLICY_EVENT_ID)
      .map((notification) => notification.target_faction)).toEqual(['HRHB', 'RS']);

    const serialized = serializeState(resolved);
    expect(serializeState(deserializeState(serialized))).toBe(serialized);
    expect(() => resolveDesktopEventDecision(resolved, POLICY_EVENT_ID, responseId, process.cwd()))
      .toThrow(/exactly one pending decision/);
    expect(serializeState(resolved)).toBe(serialized);
  });

  it('keeps Electron and browser fallback byte-identical through identity and every policy response', async () => {
    const opening = await openingState();
    const desktopPending = resolveDesktopEventDecision(
      opening,
      'rbih_state_identity',
      'civic',
      process.cwd(),
    );
    const browserPending = deserializeState(serializeState(opening));
    resolveBrowserEventDecision(browserPending, 'rbih_state_identity', 'civic', EVENT_CATALOG);
    expect(serializeState(browserPending)).toBe(serializeState(desktopPending));

    for (const responseId of POLICY_OPTIONS) {
      const desktop = resolveDesktopEventDecision(desktopPending, POLICY_EVENT_ID, responseId, process.cwd());
      const browser = deserializeState(serializeState(browserPending));
      resolveBrowserEventDecision(browser, POLICY_EVENT_ID, responseId, EVENT_CATALOG);
      expect(serializeState(browser)).toBe(serializeState(desktop));
    }
  });

  it.each([
    ['wrong turn', (state: GameState) => { state.meta.turn = 1; }],
    ['wrong phase', (state: GameState) => { state.meta.phase = 'peace'; }],
    ['wrong player', (state: GameState) => { state.meta.player_faction = 'RS'; }],
    ['headless auto-control', (state: GameState) => { state.meta.headless_scenario_auto_control = true; }],
    ['already enabled', (state: GameState) => { state.military.enabled_event_ids.push(POLICY_EVENT_ID); }],
    ['already fired', (state: GameState) => { state.military.fired_event_ids.push(POLICY_EVENT_ID); }],
    ['already closed', (state: GameState) => { (state.military.closed_event_ids ??= []).push(POLICY_EVENT_ID); }],
    ['already pending', (state: GameState) => {
      state.military.pending_event_decisions?.push({
        ...(state.military.pending_event_decisions[0]!),
        event_id: POLICY_EVENT_ID,
      });
    }],
    ['already decided', (state: GameState) => { (state.military.event_decision_log ??= []).push({
      event_id: POLICY_EVENT_ID,
      response_id: 'always_deny',
      decision_source: 'player',
      faction: 'RBiH',
      turn: 0,
    }); }],
  ])('rejects %s without mutating the supplied canonical state', async (_label, arrange) => {
    const state = await openingState();
    arrange(state);
    const before = serializeState(state);
    expect(() => resolvePlayerEventDecisionWithOpeningPolicy(
      state,
      EVENT_CATALOG,
      'rbih_state_identity',
      'civic',
    )).toThrow();
    expect(serializeState(state)).toBe(before);
  });

  it('rejects a changed reviewed catalog and forged response without partial identity effects', async () => {
    const changedCatalog = structuredClone(EVENT_CATALOG);
    const policy = changedCatalog.find((eventDef) => eventDef.id === POLICY_EVENT_ID)!;
    policy.response_options = [...(policy.response_options ?? [])].reverse();

    for (const [catalog, responseId] of [
      [changedCatalog, 'civic'],
      [EVENT_CATALOG, 'forged_response'],
    ] as const) {
      const state = await openingState();
      const before = serializeState(state);
      expect(() => resolvePlayerEventDecisionWithOpeningPolicy(
        state,
        catalog,
        'rbih_state_identity',
        responseId,
      )).toThrow();
      expect(serializeState(state)).toBe(before);
    }
  });

  it.each([
    ['later opening turn', (state: GameState) => { state.meta.turn = 1; }],
    ['wrong phase', (state: GameState) => { state.meta.phase = 'peace'; }],
    ['wrong player', (state: GameState) => { state.meta.player_faction = 'RS'; }],
    ['undefined headless marker', (state: GameState) => { delete state.meta.headless_scenario_auto_control; }],
    ['headless marker', (state: GameState) => { state.meta.headless_scenario_auto_control = true; }],
    ['duplicate pending policy', (state: GameState) => { state.military.pending_event_decisions!.push(structuredClone(state.military.pending_event_decisions![0]!)); }],
    ['wrong fire count', (state: GameState) => { state.military.event_fire_counts[POLICY_EVENT_ID] = 2; }],
    ['wrong last-fired turn', (state: GameState) => { state.military.event_last_fired_turn[POLICY_EVENT_ID] = 4; }],
    ['not enabled', (state: GameState) => { state.military.enabled_event_ids = state.military.enabled_event_ids.filter((id) => id !== POLICY_EVENT_ID); }],
    ['closed', (state: GameState) => { (state.military.closed_event_ids ??= []).push(POLICY_EVENT_ID); }],
    ['already decided', (state: GameState) => { (state.military.event_decision_log ??= []).push({ event_id: POLICY_EVENT_ID, response_id: 'always_deny', decision_source: 'player', faction: 'RBiH', turn: 0 }); }],
    ['forged effects', (state: GameState) => { state.military.pending_event_decisions![0]!.response_options[2]!.effects = []; }],
    ['forged dimensions', (state: GameState) => { state.military.pending_event_decisions![0]!.response_options[2]!.dimension_shifts![0]!.delta = 25; }],
    ['forged notifications', (state: GameState) => { state.military.pending_event_decisions![0]!.notifications_to_other_factions = {}; }],
    ['forged descriptive source', (state: GameState) => { state.military.pending_event_decisions![0]!.source_note = 'forged'; }],
  ])('rejects policy response with %s and leaves input bytes unchanged', async (_label, arrange) => {
    const state = await pendingPolicyState();
    arrange(state);
    const before = serializeState(state);
    expect(() => resolvePlayerEventDecisionWithOpeningPolicy(
      state, EVENT_CATALOG, POLICY_EVENT_ID, 'always_allow',
    )).toThrow();
    expect(serializeState(state)).toBe(before);
  });

  it('preserves serialized legacy identity and naturally authored policy decisions through both adapters', async () => {
    const policy = EVENT_CATALOG.find((entry) => entry.id === POLICY_EVENT_ID)!;
    const serializedLegacy = serializeState(await authoredLegacyIdentityPending());
    const desktopIdentity = resolveDesktopEventDecision(
      deserializeState(serializedLegacy), 'rbih_state_identity', 'civic', process.cwd(),
    );
    const browserIdentity = deserializeState(serializedLegacy);
    resolveBrowserEventDecision(browserIdentity, 'rbih_state_identity', 'civic', EVENT_CATALOG);
    expect(serializeState(browserIdentity)).toBe(serializeState(desktopIdentity));
    expect(browserIdentity.military.event_decision_log?.find((entry) => entry.event_id === 'rbih_state_identity'))
      .toMatchObject({ response_id: 'civic', decision_source: 'player', faction: 'RBiH', turn: 3 });
    expect(browserIdentity.military.pending_event_decisions ?? []).toHaveLength(0);
    expect(browserIdentity.military.fired_event_ids).not.toContain(POLICY_EVENT_ID);

    for (const state of [desktopIdentity, browserIdentity]) {
      state.meta.turn = 4;
      updateEventReadiness(state, [policy]);
      evaluateEvents(state, () => 0.5, 4, [policy]);
    }
    expect(serializeState(browserIdentity)).toBe(serializeState(desktopIdentity));
    expect(browserIdentity.military.pending_event_decisions?.map((entry) => entry.event_id)).toEqual([POLICY_EVENT_ID]);
    const policyFireTurn = browserIdentity.military.pending_event_decisions?.[0]?.turn_fired;
    expect(policyFireTurn).toBeGreaterThanOrEqual(policy.trigger.turn_min!);
    expect(policyFireTurn).toBeLessThanOrEqual(policy.trigger.turn_max!);
    expect(browserIdentity.military.event_fire_counts[POLICY_EVENT_ID]).toBe(1);
    expect(browserIdentity.military.event_last_fired_turn[POLICY_EVENT_ID]).toBe(policyFireTurn);
    expect(browserIdentity.military.fired_event_ids.filter((id) => id === POLICY_EVENT_ID)).toHaveLength(1);

    const delayedBytes = serializeState(browserIdentity);
    const desktopDelayed = deserializeState(delayedBytes);
    desktopDelayed.meta.turn = 12;
    const desktopResolved = resolveDesktopEventDecision(
      desktopDelayed, POLICY_EVENT_ID, 'always_deny', process.cwd(),
    );
    const browserDelayed = deserializeState(delayedBytes);
    browserDelayed.meta.turn = 12;
    resolveBrowserEventDecision(browserDelayed, POLICY_EVENT_ID, 'always_deny', EVENT_CATALOG);
    expect(serializeState(browserDelayed)).toBe(serializeState(desktopResolved));
    expect(browserDelayed.paramilitary_policy).toBe('always_deny');
    expect(browserDelayed.military.event_decision_log?.filter((entry) => entry.event_id === POLICY_EVENT_ID)).toHaveLength(1);
  });

  it.each([
    ['turn-0 state with legacy turn-3 pending identity', async () => {
      const state = await authoredLegacyIdentityPending();
      state.meta.turn = 0;
      return state;
    }],
    ['turn-3 state with forged turn-0 pending identity', async () => {
      const state = await openingState();
      state.meta.turn = 3;
      delete state.meta.headless_scenario_auto_control;
      return state;
    }],
  ])('rejects mixed identity tuple %s through both adapters without mutation', async (_label, arrange) => {
    const source = await arrange();
    for (const adapter of ['desktop', 'browser'] as const) {
      const state = deserializeState(serializeState(source));
      const before = serializeState(state);
      expect(() => adapter === 'desktop'
        ? resolveDesktopEventDecision(state, 'rbih_state_identity', 'civic', process.cwd())
        : resolveBrowserEventDecision(state, 'rbih_state_identity', 'civic', EVENT_CATALOG)).toThrow();
      expect(serializeState(state)).toBe(before);
    }
  });

  it('preserves exact deny, ask, and allow first-Advance semantics through existing writers', async () => {
    const pending = await pendingPolicyState();
    const beforeWarCrimes = pending.military.negotiation?.capital?.RBiH?.war_crimes_events ?? 0;
    const branches = new Map<string, GameState>();

    for (const responseId of POLICY_OPTIONS) {
      const resolved = resolveDesktopEventDecision(pending, POLICY_EVENT_ID, responseId, process.cwd());
      const advanced = await advanceTurn(resolved, process.cwd());
      expect(advanced.error).toBeUndefined();
      branches.set(responseId, advanced.state);
    }

    const deny = branches.get('always_deny')!;
    expect(deny.pending_paramilitary_requests ?? []).toHaveLength(0);
    expect((deny.political.control_events ?? []).filter((event) => event.mechanism === 'paramilitary' && event.to === 'RBiH'))
      .toHaveLength(0);

    const ask = branches.get('ask')!;
    expect((ask.pending_paramilitary_requests ?? [])
      .filter((request) => request.faction === 'RBiH')
      .map((request) => request.target_osid)
      .sort()).toEqual(EXPECTED_TARGETS);
    expect((ask.political.control_events ?? []).filter((event) => event.mechanism === 'paramilitary' && event.to === 'RBiH'))
      .toHaveLength(0);

    const allow = branches.get('always_allow')!;
    expect(allow.pending_paramilitary_requests ?? []).toHaveLength(0);
    expect((allow.political.control_events ?? [])
      .filter((event) => event.mechanism === 'paramilitary' && event.to === 'RBiH')
      .map((event) => event.settlement_id)
      .sort()).toEqual(EXPECTED_TARGETS);
    expect(Object.entries(allow.military.formations)
      .filter(([, formation]) => formation.faction === 'RBiH' && formation.kind === 'paramilitary')
      .map(([id, formation]) => ({ id, target: formation.paramilitary_target, status: formation.status })))
      .toEqual([
        { id: 'para_rbih_t1_0', target: 'op:srebrenica:obadi', status: 'inactive' },
        { id: 'para_rbih_t1_1', target: 'op:brcko:bukvik_gornji_2', status: 'inactive' },
      ]);
    expect((allow.military.negotiation?.capital?.RBiH?.war_crimes_events ?? 0) - beforeWarCrimes).toBe(2);
    const civilianDeaths = Object.values(
      allow.displacement.displacement_humanitarian_aggregates?.RBiH ?? {},
    ).reduce((sum, row) => sum + (row.civilian_casualties_caused ?? 0), 0);
    expect(civilianDeaths).toBe(200);
    expect((allow.military.negotiation?.capital?.RBiH?.war_crimes_events_emergent ?? 0)).toBe(2);
  }, 120_000);
});

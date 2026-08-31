import { describe, expect, it } from 'vitest';

import { advanceTurn, loadStateFromPath, startNewCampaign } from '../src/desktop/desktop_sim.js';
import { selectBotBrigadeOrderFactions } from '../src/sim/turn_phases/war_phases.js';

function activePlayerPreplannedOperations(state: any, playerFaction: string): Array<{ corpsId: string; name: string }> {
  const formations = state.military?.formations ?? {};
  return Object.entries(state.military?.corps_command ?? {}).flatMap(([corpsId, command]: [string, any]) => {
    const corpsFaction = formations[corpsId]?.faction;
    return (command.active_operations ?? [])
      .filter((operation: any) => operation.is_pre_planned === true)
      .filter((operation: any) => {
        if (corpsFaction === playerFaction) return true;
        return (operation.participating_brigades ?? []).some((brigadeId: string) =>
          formations[brigadeId]?.faction === playerFaction
        );
      })
      .map((operation: any) => ({ corpsId, name: String(operation.name ?? '') }));
  });
}

function findOperation(state: any, corpsId: string, operationName: string): any | null {
  return (state.military?.corps_command?.[corpsId]?.active_operations ?? []).find(
    (operation: any) => operation?.name === operationName,
  ) ?? null;
}

function acceptOpeningHistoricalOperations(state: any, faction: string): void {
  for (const review of state.meta.pending_proposal_reviews ?? []) {
    if (review.faction !== faction) continue;
    if (!String(review.proposed_action ?? '').startsWith('HISTORICAL_OP:')) continue;
    if (review.accepted != null || review.resolved_turn != null) continue;
    review.accepted = true;
    review.resolved_turn = state.meta.turn;
  }
}

function controlCounts(state: any): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const controller of Object.values(state.political?.political_controllers ?? {})) {
    if (typeof controller !== 'string') continue;
    counts[controller] = (counts[controller] ?? 0) + 1;
  }
  return counts;
}

describe('desktop startNewCampaign historical operation authorization', () => {
  it('includes the player faction in bot order selection only when assisted execution is active', () => {
    const baseState = {
      factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
      meta: { player_faction: 'RS' },
    } as any;

    expect(selectBotBrigadeOrderFactions(baseState)).toEqual(['HRHB', 'RBiH']);

    baseState.meta.autonomy_level = 1;
    expect(selectBotBrigadeOrderFactions(baseState)).toEqual(['HRHB', 'RBiH', 'RS']);

    baseState.meta.autonomy_level = 2;
    expect(selectBotBrigadeOrderFactions(baseState)).toEqual(['HRHB', 'RBiH', 'RS']);

    baseState.meta.autonomy_level = 0;
    baseState.meta.headless_scenario_auto_control = true;
    expect(selectBotBrigadeOrderFactions(baseState)).toEqual(['HRHB', 'RBiH', 'RS']);
  });

  // CONTRACT INVERTED 2026-08-31 (owner: "Auto-authorize. It should be the same as headless
  // calibration runs, which do run those ops."). A selected player faction now opens the war
  // with the same operation slate the calibration line runs; the receipt is still recorded so
  // the president can countermand via stop-op.
  it('launches selected player-faction historical operations under standing authorization', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');

    expect(activePlayerPreplannedOperations(state, 'RS').length).toBeGreaterThan(0);
    expect(state.meta.pending_proposal_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          faction: 'RS',
          proposed_action: 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina',
        }),
        expect.objectContaining({
          faction: 'RS',
          proposed_action: 'HISTORICAL_OP:preplanned:jna_herzegovina_command:Operation Herzegovina',
        }),
      ]),
    );
    // The queue is no longer deleted: the deferral only removed it because it was withholding
    // the live operation. Follow-ons stay queued for their own turn.
    expect(state.military.corps_command?.vrs_drina?.queued_operations?.length ?? 0).toBeGreaterThan(0);
  });

  it('carries resolved historical operation receipts through an advance', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');

    const advanced = await advanceTurn(state, process.cwd());
    const drinaReview = advanced.state.meta.pending_proposal_reviews?.find((proposal) =>
      proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
    );

    expect(activePlayerPreplannedOperations(advanced.state, 'RS').length).toBeGreaterThan(0);
    expect(drinaReview).toBeDefined();
    expect(drinaReview?.faction).toBe('RS');
    // Standing authorization: resolved on arrival, never left awaiting an answer nobody gives.
    expect(drinaReview?.accepted).toBe(true);
  });

  it('launches an accepted selected player-faction historical operation on advance', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');
    const review = state.meta.pending_proposal_reviews?.find((proposal) =>
      proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
    );
    expect(review).toBeDefined();
    review!.accepted = true;
    review!.resolved_turn = state.meta.turn;
    const authorizedTurn = state.meta.turn;

    const advanced = await advanceTurn(state, process.cwd());

    expect(activePlayerPreplannedOperations(advanced.state, 'RS')).toEqual(
      expect.arrayContaining([
        { corpsId: 'vrs_drina', name: 'Operation Drina' },
      ]),
    );
    expect(advanced.state.military.corps_command?.vrs_drina?.queued_operations).toEqual([
      'Operation Podrinje Sweep',
      'Operation Pracha River',
      'Operation Zvezda 94',
    ]);
    const resolvedReview = advanced.state.meta.pending_proposal_reviews?.find((proposal) =>
      proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
    );
    expect(resolvedReview?.accepted).toBe(true);
    expect(resolvedReview?.resolved_turn).toBe(authorizedTurn);
  });

  it('gives accepted and preserved staged opening operations the same first-advance planning credit', async () => {
    const startupPath = `${process.cwd()}/data/derived/startup/apr_1992_initial_save.json`;
    const preserved = (await loadStateFromPath(startupPath)).state;
    preserved.meta.player_faction = 'RS';
    preserved.meta.headless_scenario_auto_control = false;
    preserved.meta.decision_mode = 'emergent';
    preserved.meta.autonomy_level = 1;

    const { state: authorized } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');
    authorized.meta.autonomy_level = 1;
    acceptOpeningHistoricalOperations(authorized, 'RS');

    let [preservedTurn, authorizedTurn] = await Promise.all([
      advanceTurn(preserved, process.cwd()),
      advanceTurn(authorized, process.cwd()),
    ]);
    expect(preservedTurn.error).toBeUndefined();
    expect(authorizedTurn.error).toBeUndefined();

    const preservedReport = preservedTurn.report?.details as any;
    const authorizedReport = authorizedTurn.report?.details as any;
    const battleTargets = (report: any) => (report?.attack_resolution_osid?.battles ?? [])
      .filter((battle: any) => battle.attacker_faction === 'RS')
      .map((battle: any) => battle.target_osid)
      .sort();

    expect(authorizedReport.player_assisted_execution).toEqual(
      preservedReport.player_assisted_execution,
    );
    expect(authorizedReport.attack_resolution_osid?.orders_seen_by_brigade).toEqual(
      preservedReport.attack_resolution_osid?.orders_seen_by_brigade,
    );
    expect(battleTargets(authorizedReport)).toEqual(battleTargets(preservedReport));
    expect(controlCounts(authorizedTurn.state)).toEqual(controlCounts(preservedTurn.state));

    const authorizedDrina = findOperation(authorizedTurn.state, 'vrs_drina', 'Operation Drina');
    expect(authorizedDrina?.started_turn).toBe(0);
    expect(authorizedDrina?.phase).toBe('execution');

    const planningDuration = authorizedDrina?.planning_duration;
    expect(planningDuration).toBeGreaterThan(1);
    expect(findOperation(preservedTurn.state, 'vrs_drina', 'Operation Drina')?.planning_duration)
      .toBe(planningDuration);
    expect(findOperation(preservedTurn.state, 'vrs_drina', 'Operation Drina')?.phase).toBe('execution');
    expect(authorizedTurn.state.meta.turn).toBe(1);
  });

  it('assists only participants of accepted selected player-faction historical operations', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');
    state.meta.autonomy_level = 0;
    const review = state.meta.pending_proposal_reviews?.find((proposal) =>
      proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
    );
    expect(review).toBeDefined();
    expect(review?.accepted).toBe(true);
    const assisted = await advanceTurn(state, process.cwd());
    const injectedDrina = findOperation(assisted.state, 'vrs_drina', 'Operation Drina');
    expect(injectedDrina?.phase).toBe('execution');

    const drina = findOperation(assisted.state, 'vrs_drina', 'Operation Drina');
    expect(drina).toBeDefined();
    expect(drina?.phase).toBe('execution');
    // Every player historical operation now carries standing authorization, so the assist
    // covers the union of their participants rather than Operation Drina's alone. The contract
    // under test is unchanged: ONLY participants of accepted operations are assisted.
    const participants = new Set<string>();
    for (const corpsId of Object.keys(assisted.state.military.corps_command ?? {})) {
      const cmd = (assisted.state.military.corps_command ?? {})[corpsId] as
        { active_operations?: Array<{ is_pre_planned?: boolean; participating_brigades?: string[] }> };
      for (const op of cmd?.active_operations ?? []) {
        if (op.is_pre_planned !== true) continue;
        for (const b of op.participating_brigades ?? []) {
          if (assisted.state.military.formations?.[b]?.faction === 'RS') participants.add(b);
        }
      }
    }
    expect(participants.size).toBeGreaterThan(0);

    const assistDiagnostics = (assisted.report?.details as any)?.player_historical_operation_assist;
    // Every accepted player historical operation is assisted now that all of them carry
    // standing authorization — previously only the one manually accepted above was.
    expect(Object.keys(assistDiagnostics?.eligible_attackers_by_corps ?? {})).toContain('vrs_drina');
    expect(assistDiagnostics.eligible_attackers_by_corps.vrs_drina).toBeGreaterThan(0);
    expect(assistDiagnostics.eligible_attackers_by_corps.vrs_drina).toBeLessThanOrEqual(participants.size);

    const ordersSeenByResolver = (assisted.report?.details as any)?.attack_resolution_osid
      ?.orders_seen_by_brigade ?? {};
    const playerAttackers = Object.keys(ordersSeenByResolver).filter((brigadeId) =>
      assisted.state.military.formations?.[brigadeId]?.faction === 'RS'
    );
    expect(playerAttackers.length).toBeGreaterThan(0);
    expect(playerAttackers.every((brigadeId) => participants.has(brigadeId))).toBe(true);

    const nonParticipant = Object.values(assisted.state.military.formations ?? {}).find((formation: any) =>
      formation.faction === 'RS' && formation.kind === 'brigade' && !participants.has(formation.id)
    ) as any;
    expect(nonParticipant).toBeDefined();
    expect(ordersSeenByResolver).not.toHaveProperty(nonParticipant.id);
  });
});

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

  it('does not silently launch selected player-faction historical operations from the baked startup snapshot', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');

    expect(activePlayerPreplannedOperations(state, 'RS')).toEqual([]);
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
    expect(state.military.corps_command?.vrs_drina?.queued_operations).toBeUndefined();
  });

  it('keeps unresolved selected player-faction historical operation reviews after advance', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');

    const advanced = await advanceTurn(state, process.cwd());
    const drinaReview = advanced.state.meta.pending_proposal_reviews?.find((proposal) =>
      proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
    );

    expect(activePlayerPreplannedOperations(advanced.state, 'RS')).toEqual([]);
    expect(drinaReview).toBeDefined();
    expect(drinaReview?.faction).toBe('RS');
    expect(drinaReview?.accepted).toBeUndefined();
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

  it('executes accepted opening operations on the same first-turn clock as preserved startup operations', async () => {
    const startupPath = `${process.cwd()}/data/derived/startup/apr_1992_initial_save.json`;
    const preserved = (await loadStateFromPath(startupPath)).state;
    preserved.meta.player_faction = 'RS';
    preserved.meta.headless_scenario_auto_control = false;
    preserved.meta.decision_mode = 'emergent';
    preserved.meta.autonomy_level = 1;

    const { state: authorized } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');
    authorized.meta.autonomy_level = 1;
    acceptOpeningHistoricalOperations(authorized, 'RS');

    const [preservedTurn, authorizedTurn] = await Promise.all([
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
  });

  it('assists only participants of accepted selected player-faction historical operations', async () => {
    const { state } = await startNewCampaign(process.cwd(), 'RS', 'apr_1992');
    const review = state.meta.pending_proposal_reviews?.find((proposal) =>
      proposal.proposed_action === 'HISTORICAL_OP:preplanned:vrs_drina:Operation Drina'
    );
    expect(review).toBeDefined();
    review!.accepted = true;
    review!.resolved_turn = state.meta.turn;

    const injected = await advanceTurn(state, process.cwd());
    const assisted = await advanceTurn(injected.state, process.cwd());

    const drina = findOperation(assisted.state, 'vrs_drina', 'Operation Drina');
    expect(drina).toBeDefined();
    const participants = new Set<string>(drina?.participating_brigades ?? []);
    expect(participants.size).toBeGreaterThan(0);

    const movementOrders = assisted.state.military.brigade_movement_orders ?? {};
    const attackOrders = assisted.state.military.brigade_attack_orders ?? {};
    const assistedOrderIds = new Set<string>([
      ...Object.keys(movementOrders),
      ...Object.keys(attackOrders),
    ]);

    expect([...participants].some((brigadeId) => assistedOrderIds.has(brigadeId))).toBe(true);

    const nonParticipantPlayerOrderIds = [...assistedOrderIds].filter((brigadeId) =>
      assisted.state.military.formations?.[brigadeId]?.faction === 'RS' &&
      !participants.has(brigadeId)
    );
    expect(nonParticipantPlayerOrderIds).toEqual([]);
  });
});

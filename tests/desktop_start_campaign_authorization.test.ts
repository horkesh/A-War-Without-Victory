import { describe, expect, it } from 'vitest';

import { startNewCampaign } from '../src/desktop/desktop_sim.js';

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

describe('desktop startNewCampaign historical operation authorization', () => {
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
});

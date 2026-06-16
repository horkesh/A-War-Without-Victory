import { describe, expect, it } from 'vitest';

import {
  buildBackTheOfficerViews,
  buildTgAftermathViews,
  buildFraming,
  buildAftermathStory,
  buildOpProposalCards,
  type BackTheOfficerRosterRow,
  type OpProposalReviewRow,
} from '../../src/ui/map/data/backTheOfficer.js';
import { FORCE_LAUNCH_COST } from '../../src/ui/map/utils/commandAuthority.js';

const ROSTER: BackTheOfficerRosterRow[] = [
  { id: 'off_dudakovic', name: 'Atif Dudaković', rank: 'corps_commander', status: 'active' },
  { id: 'off_fallen', name: 'Enver Hadžihasanović', rank: 'corps_commander', status: 'killed' },
];

// Minimal raw GameState shape exercising the Phase 3A telemetry fields the
// read-model reads (corps_command active ops + brigade_history.tg_participations).
function makeState() {
  return {
    military: {
      formations: {
        '5th_corps': { name: '5th Corps' },
        '7th_corps': { name: '7th Corps' },
        anchor_bde: {
          name: 'Anchor Brigade',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'anchor', formed_turn: 30 },
            ],
          },
        },
        donor_bde_a: {
          name: 'Donor A',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 800, donor_corps_id: '5th_corps' },
            ],
          },
        },
        donor_bde_b: {
          name: 'Donor B',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 600, donor_corps_id: '7th_corps' },
            ],
          },
        },
      },
      corps_command: {
        '1st_corps': {
          active_operations: [
            {
              id: 'op_trnovo',
              name: 'Operation Trnovo',
              tg_id: 'tg:trnovo',
              tg_display_name: 'TG Trnovo',
              tg_commander_officer_id: 'off_dudakovic',
            },
          ],
        },
      },
    },
  };
}

describe('back-the-officer read-model', () => {
  it('projects TG identity, commander, and donor lineage from state', () => {
    const views = buildBackTheOfficerViews(makeState(), ROSTER);
    expect(views).toHaveLength(1);
    const v = views[0];
    expect(v.tg_name).toBe('TG Trnovo');
    expect(v.tg_id).toBe('tg:trnovo');
    expect(v.commander?.name).toBe('Atif Dudaković');
    expect(v.commander?.lost).toBe(false);
    expect(v.donors.map((d) => d.corps_id)).toEqual(['5th_corps', '7th_corps']);
    expect(v.total_personnel_lent).toBe(1400);
    // Framing frames the decision as backing the named CO + names donor corps + cost.
    expect(v.framing).toContain('Atif Dudaković');
    expect(v.framing).toContain('5th Corps');
    expect(v.framing).toContain('1,400');
  });

  it('is empty and defensive on flag-off / pre-3A state', () => {
    expect(buildBackTheOfficerViews({ military: { formations: {}, corps_command: {} } }, ROSTER)).toEqual([]);
    expect(buildBackTheOfficerViews({}, ROSTER)).toEqual([]);
    expect(buildBackTheOfficerViews(null, undefined)).toEqual([]);
  });

  it('does not expose a raw operation id when a TG operation has no display name', () => {
    const state = makeState();
    delete (state.military.corps_command['1st_corps'].active_operations[0] as { name?: string }).name;
    const views = buildBackTheOfficerViews(state, ROSTER);
    expect(views).toHaveLength(1);
    expect(views[0].op_id).toBe('op_trnovo');
    expect(views[0].op_name).toBe('Unspecified operation');
    expect(views[0].op_name).not.toContain('op_trnovo');
  });

  it('falls back to army HQ donor lineage when participations are sparse', () => {
    const state = {
      military: {
        formations: { '2nd_corps': { name: '2nd Corps' }, '3rd_corps': { name: '3rd Corps' } },
        army_hq_operations: {
          farz: { tg_id: 'tg:farz', donor_corps_ids: ['2nd_corps', '3rd_corps'] },
        },
        corps_command: {
          '1st_corps': {
            active_operations: [{ id: 'op_farz', name: 'Farz 95', tg_id: 'tg:farz', tg_commander_officer_id: 'off_dudakovic' }],
          },
        },
      },
    };
    const views = buildBackTheOfficerViews(state, ROSTER);
    expect(views).toHaveLength(1);
    expect(views[0].donors.map((d) => d.corps_id)).toEqual(['2nd_corps', '3rd_corps']);
    expect(views[0].total_personnel_lent).toBe(0);
  });

  it('builds aftermath stories with per-donor casualties', () => {
    const state = {
      military: {
        formations: {
          '5th_corps': { name: '5th Corps' },
          donor_bde: {
            name: 'Donor',
            brigade_history: {
              tg_participations: [
                { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 800, personnel_returned: 500, donor_corps_id: '5th_corps' },
              ],
            },
          },
        },
        corps_command: {
          '1st_corps': {
            active_operations: [{ id: 'op_trnovo', name: 'Operation Trnovo', tg_id: 'tg:trnovo', tg_commander_officer_id: 'off_dudakovic' }],
          },
        },
      },
    };
    const aftermath = buildTgAftermathViews(state, ROSTER);
    expect(aftermath).toHaveLength(1);
    expect(aftermath[0].donors[0].casualties).toBe(300);
    expect(aftermath[0].total_casualties).toBe(300);
    expect(aftermath[0].anchor_lost).toBe(false);
    expect(aftermath[0].story).toContain('5th Corps');
  });

  it('reads anchor-death dissolution from a lost commander status', () => {
    const story = buildAftermathStory(
      'TG Bosna',
      { officer_id: 'off_fallen', name: 'Enver Hadžihasanović', rank: 'corps_commander', lost: true, status: 'killed' },
      [],
      0,
      true,
    );
    expect(story).toContain('dissolved');
    expect(story).toContain('killed');
    expect(story).toContain('Enver Hadžihasanović');
  });

  it('framing degrades gracefully with no commander and no donors', () => {
    const framing = buildFraming(null, 'Operation X', null, [], 0);
    expect(framing).toContain('the field commander');
    expect(framing).toContain('own corps');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Phase 2 slice 1 "Back the Officer": op-proposal decision cards.
// ──────────────────────────────────────────────────────────────────────────

function proposalState(opOverrides: Record<string, unknown>) {
  return {
    military: {
      formations: {
        '1st_corps': { name: '1st Corps' },
        '5th_corps': { name: '5th Corps' },
        '7th_corps': { name: '7th Corps' },
        donor_bde_a: {
          name: 'Donor A',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 800, donor_corps_id: '5th_corps' },
            ],
          },
        },
        donor_bde_b: {
          name: 'Donor B',
          brigade_history: {
            tg_participations: [
              { tg_id: 'tg:trnovo', op_id: 'op_trnovo', role: 'donor', formed_turn: 30, personnel_lent: 600, donor_corps_id: '7th_corps' },
            ],
          },
        },
      },
      corps_command: {
        '1st_corps': {
          active_operations: [
            {
              id: 'op_trnovo',
              name: 'Operation Trnovo',
              plan_id: 'plan_trnovo',
              tg_id: 'tg:trnovo',
              tg_commander_officer_id: 'off_dudakovic',
              ...opOverrides,
            },
          ],
        },
      },
    },
  };
}

const OP_PROPOSAL: OpProposalReviewRow = {
  id: 'PROP_30_ops_0',
  faction: 'RBiH',
  domain: 'ops',
  description: 'Corps commander proposes Operation Trnovo.',
  proposed_action: 'APPROVE_OP:1st_corps:plan_trnovo',
};

describe('op-proposal decision cards (Phase 2 slice 1)', () => {
  it('joins proposal → active op for officer, force ratio, donors, and assessment', () => {
    const state = proposalState({ force_ratio_estimate: 2.4, commander_assessment: 'launch' });
    const cards = buildOpProposalCards(state, ROSTER, [OP_PROPOSAL]);
    expect(cards).toHaveLength(1);
    const c = cards[0];
    expect(c.proposal_id).toBe('PROP_30_ops_0');
    expect(c.corps_id).toBe('1st_corps');
    expect(c.corps_name).toBe('1st Corps');
    expect(c.plan_id).toBe('plan_trnovo');
    expect(c.op_id).toBe('op_trnovo');
    expect(c.op_name).toBe('Operation Trnovo');
    expect(c.commander?.name).toBe('Atif Dudaković');
    expect(c.commander?.rank).toBe('corps_commander');
    expect(c.force_ratio_estimate).toBe(2.4);
    expect(c.commander_assessment).toBe('launch');
    expect(c.donors.map((d) => d.corps_id)).toEqual(['5th_corps', '7th_corps']);
    expect(c.total_personnel_lent).toBe(1400);
    // 'launch' → no override offered.
    expect(c.override_available).toBe(false);
    expect(c.override_ca_cost).toBe(FORCE_LAUNCH_COST);
    expect(c.framing).toContain('Atif Dudaković');
    expect(c.framing).toContain('2.4:1');
  });

  it('offers override only when the commander recommends postpone or abort', () => {
    for (const assessment of ['postpone', 'abort'] as const) {
      const cards = buildOpProposalCards(proposalState({ commander_assessment: assessment }), ROSTER, [OP_PROPOSAL]);
      expect(cards[0].override_available).toBe(true);
      expect(cards[0].override_ca_cost).toBe(FORCE_LAUNCH_COST);
    }
    const launch = buildOpProposalCards(proposalState({ commander_assessment: 'launch' }), ROSTER, [OP_PROPOSAL]);
    expect(launch[0].override_available).toBe(false);
    // No assessment at all → not an override candidate.
    const none = buildOpProposalCards(proposalState({}), ROSTER, [OP_PROPOSAL]);
    expect(none[0].commander_assessment).toBeNull();
    expect(none[0].override_available).toBe(false);
  });

  it('uses objective copy instead of an opaque operation name when available', () => {
    const cards = buildOpProposalCards(
      proposalState({ name: 'op_trnovo', objective_description: 'Seize the approaches to Trnovo' }),
      ROSTER,
      [OP_PROPOSAL],
    );
    expect(cards[0].op_name).toBe('Seize the approaches to Trnovo');
    expect(cards[0].op_name).not.toContain('op_trnovo');
  });

  it('is defensive when the op or officer cannot be resolved', () => {
    // Unknown corps — card still renders, op/officer null, donors empty.
    const orphan: OpProposalReviewRow = { ...OP_PROPOSAL, proposed_action: 'APPROVE_OP:9th_corps:ghost' };
    const cards = buildOpProposalCards(proposalState({}), ROSTER, [orphan]);
    expect(cards).toHaveLength(1);
    expect(cards[0].op_id).toBeNull();
    expect(cards[0].commander).toBeNull();
    expect(cards[0].force_ratio_estimate).toBeNull();
    expect(cards[0].donors).toEqual([]);
    expect(cards[0].override_available).toBe(false);
    // op_name must not fall back to the raw plan id.
    expect(cards[0].op_name).toBe('Unspecified operation');
    expect(cards[0].op_name).not.toContain('ghost');
  });

  it('ignores non-ops proposals and malformed actions; sorts by proposal id', () => {
    const stance: OpProposalReviewRow = { id: 'PROP_30_military_0', faction: 'RBiH', domain: 'military', proposed_action: 'SET_STANCE:1st_corps:offensive' };
    const malformed: OpProposalReviewRow = { id: 'PROP_30_ops_9', faction: 'RBiH', domain: 'ops', proposed_action: 'APPROVE_OP:' };
    const second: OpProposalReviewRow = { ...OP_PROPOSAL, id: 'PROP_30_ops_1' };
    const cards = buildOpProposalCards(proposalState({ commander_assessment: 'launch' }), ROSTER, [second, stance, malformed, OP_PROPOSAL]);
    // stance (wrong domain) + malformed action are dropped; remaining two sorted by id.
    expect(cards.map((c) => c.proposal_id)).toEqual(['PROP_30_ops_0', 'PROP_30_ops_1']);
  });

  it('returns [] on empty / flag-off / pre-3A inputs', () => {
    expect(buildOpProposalCards(proposalState({}), ROSTER, [])).toEqual([]);
    expect(buildOpProposalCards(proposalState({}), ROSTER, undefined)).toEqual([]);
    expect(buildOpProposalCards(null, undefined, [OP_PROPOSAL])).toHaveLength(1); // still renders the card defensively
    expect(buildOpProposalCards({}, undefined, [OP_PROPOSAL])).toHaveLength(1);
  });
});

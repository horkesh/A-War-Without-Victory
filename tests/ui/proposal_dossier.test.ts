import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildOpProposalCards, type OpProposalCardView } from '../../src/ui/map/data/backTheOfficer';
import { buildProposalDossier } from '../../src/ui/map/data/proposalDossier';
import {
  buildProposalDossierFacts,
  casualtyBand,
  intelQuality,
  officerJudgement,
  PROPOSAL_DOSSIER_DETAIL_BCS,
  PROPOSAL_DOSSIER_DETAIL_EN,
} from '../../src/ui/map/data/proposalDossierDetail';
import { withoutComments } from '../helpers/sourceComments';
import { getPlayerSafeOddsBand } from '../../src/shared/playerSafeOperationBalance';
import { setLocale } from '../../src/ui/map/i18n';

/**
 * Command loop L5 (proposal §5A, 2026-11-15): every offensive proposal the president sees
 * carries a short dossier. Odds are an attributed band, never a number; facts with nothing
 * known are left out; the refusal buttons are explained; the inputs are the corps staff's
 * own beliefs about their own plan.
 */

const nodeRequire = createRequire(import.meta.url);
const { buildOpProposalCardData } = nodeRequire('../../src/desktop/autonomy_ipc_contract.cjs') as {
  buildOpProposalCardData: (state: unknown, proposals: unknown[]) => Array<Record<string, unknown>>;
};

function card(overrides: Partial<OpProposalCardView> = {}): OpProposalCardView {
  return {
    proposal_id: 'PROP_1',
    corps_id: 'arbih_2nd_corps',
    corps_name: '2nd Corps',
    plan_id: 'plan_1',
    op_id: null,
    op_name: 'Advance on Vozuća',
    commander: { officer_id: 'off_delic', name: 'Sead Delić', rank: 'corps_commander', lost: false, status: 'active' },
    force_ratio_estimate: null,
    commander_assessment: null,
    donors: [],
    total_personnel_lent: 0,
    override_available: false,
    override_ca_cost: 15,
    framing: '',
    targets: ['Vozuća (Zavidovići)', 'Stog', 'Krčevine', 'Ozren'],
    target_osids: [],
    forces: ['221st Brigade', '222nd Brigade', '223rd Brigade', '224th Brigade', '225th Brigade'],
    dossier_inputs: {
      viability: 0.5,
      intel_confidence: 0.3,
      concentration: 0.9,
      pressure: 'moderate',
      staging_osid: 'op:zavidovici:vozuca',
      brigade_ids: ['b221', 'b222', 'b223', 'b224', 'b225'],
      commander_traits: { competence: 3, aggressiveness: 3 },
    },
    ...overrides,
  };
}

describe('proposal dossier bands', () => {
  it('bands a staff judgement in fixed steps', () => {
    expect(getPlayerSafeOddsBand(0.9)).toBe('favourable');
    expect(getPlayerSafeOddsBand(0.65)).toBe('favourable');
    expect(getPlayerSafeOddsBand(0.64)).toBe('even');
    expect(getPlayerSafeOddsBand(0.45)).toBe('even');
    expect(getPlayerSafeOddsBand(0.3)).toBe('hard');
    expect(getPlayerSafeOddsBand(0.1)).toBe('long');
  });

  it('bends the reading by the officer\'s file, and not without one', () => {
    expect(officerJudgement(0.5, null)).toBe(0.5);
    expect(officerJudgement(0.5, { competence: 3, aggressiveness: 3 })).toBe(0.5);
    expect(officerJudgement(0.5, { competence: 3, aggressiveness: 5 })).toBeCloseTo(0.62);
    expect(officerJudgement(0.5, { competence: 1, aggressiveness: 1 })).toBeCloseTo(0.34);
    expect(officerJudgement(0.98, { competence: 5, aggressiveness: 5 })).toBe(1);
  });

  it('names the intelligence quality and the casualty band', () => {
    expect(intelQuality(null)).toBeNull();
    expect(intelQuality(0.2)).toBe('poor');
    expect(intelQuality(0.5)).toBe('partial');
    expect(intelQuality(0.9)).toBe('good');
    expect(casualtyBand('favourable', 6)).toBe('light');
    expect(casualtyBand('even', 2)).toBe('light');
    expect(casualtyBand('even', 4)).toBe('heavy');
    expect(casualtyBand('hard', 2)).toBe('heavy');
    expect(casualtyBand('hard', 4)).toBe('severe');
    expect(casualtyBand('long', 1)).toBe('severe');
  });
});

/** The entry-chunk dossier (title, header, map target) plus the lazily loaded facts. */
function full(c: OpProposalCardView, names: Record<string, string> | null) {
  return { ...buildProposalDossier(c, names), ...buildProposalDossierFacts(c, names) };
}

describe('buildProposalDossier', () => {
  beforeEach(() => setLocale('en'));
  afterEach(() => setLocale('en'));

  it('writes an attributed dossier with no numbers from the staff estimates', () => {
    const dossier = full(card(), null);
    expect(dossier.header).toBe('Sead Delić asks to commit 5 brigades to take Vozuća (Zavidovići).');
    expect(dossier.facts).toEqual([
      'Objective: take Vozuća (Zavidovići), Stog, Krčevine and 1 more.',
      'Forces: 2nd Corps with 221st Brigade, 222nd Brigade, 223rd Brigade and 2 more.',
      'Odds: Sead Delić judges them even. The judgement rests on poor intelligence.',
      'Cost: heavy casualties expected.',
      'If you hold back: answer before the next Advance. Unanswered, the proposal lapses and the plan is not launched.',
      'Withhold: the corps drops this plan; its commander may plan again.',
      'Cancel: close without answering; an unanswered proposal lapses at Advance.',
    ]);
    expect(dossier.odds).toEqual({ judge: 'Sead Delić', band: 'even', intel: 'poor', staffBand: null });
    expect(dossier.facts.join(' ')).not.toMatch(/\d+\s*%|\b0\.\d+\b|op:|arbih_|plan_1|Unreported/);
  });

  it('shows the army staff voice when the officer reads the plan differently', () => {
    const dossier = full(card({
      // 0.55 staff viability reads even; this officer's file bends it to 0.69, favourable.
      dossier_inputs: { ...card().dossier_inputs!, viability: 0.55, commander_traits: { competence: 4, aggressiveness: 5 } },
    }), null);
    expect(dossier.odds?.band).toBe('favourable');
    expect(dossier.odds?.staffBand).toBe('even');
    expect(dossier.facts).toContain('Army staff read them as even.');
  });

  it('attributes to the corps staff when the officer is unknown or lost', () => {
    for (const commander of [null, { officer_id: 'x', name: 'Gone', lost: true }]) {
      const dossier = full(card({ commander: commander as OpProposalCardView['commander'] }), null);
      expect(dossier.odds?.judge).toBe('The 2nd Corps staff');
      expect(dossier.header.startsWith('2nd Corps asks')).toBe(true);
    }
  });

  it('leaves out what is not known and never invents odds or cost', () => {
    const dossier = full(card({ dossier_inputs: undefined, targets: ['Unreported'], forces: ['Unreported'] }), null);
    expect(dossier.header).toBe('Sead Delić asks for authority to launch Advance on Vozuća.');
    expect(dossier.facts.some((line) => /^(Objective|Forces|Odds|Cost):/.test(line))).toBe(false);
    expect(dossier.fieldTarget).toBeNull();
  });

  it('notes a thin front and donor corps on the forces line', () => {
    const dossier = full(card({
      donors: [{ corps_id: 'c3', corps_name: '3rd Corps', brigade_ids: ['x'], personnel_lent: 400 }],
      dossier_inputs: { ...card().dossier_inputs!, pressure: 'critical' },
    }), null);
    expect(dossier.facts[1]).toBe('Forces: 2nd Corps with 221st Brigade, 222nd Brigade, 223rd Brigade and 2 more. Drawn partly from 3rd Corps. The corps front is already under heavy pressure.');
  });

  it('names a generated plan after its origin settlement in the active language', () => {
    const generated = card({ op_name: 'Advance from Banovici', objective_origin_osid: 'op:banovici:banovici_2' });
    const names = { 'op:banovici:banovici_2': 'Banovići' };
    expect(buildProposalDossier(generated, names).title).toBe('Advance from Banovići');
    setLocale('bcs');
    expect(buildProposalDossier(generated, names).title).toBe('Napredovanje, polazište: Banovići');
    expect(buildProposalDossier(card(), names).title).toBe('Advance on Vozuća');
  });

  it('is deterministic', () => {
    expect(full(card(), null)).toEqual(full(card(), null));
  });

  it('renders in BCS', () => {
    setLocale('bcs');
    const dossier = full(card(), null);
    expect(dossier.header).toBe('Sead Delić traži da angažuje brigade (5) kako bi zauzeo Vozuća (Zavidovići).');
    expect(dossier.facts).toContain('Izgledi: Sead Delić ih ocjenjuje kao izjednačene. Ocjena se oslanja na slabe obavještajne podatke.');
    expect(dossier.facts).toContain('Uskrati: korpus odustaje od ovog plana; njegov komandant može planirati ponovo.');
    expect(dossier.facts).toContain('Snage: 221st Brigade, 222nd Brigade, 223rd Brigade i još 2 (2nd Corps).');
  });

  it('keeps EN and BCS detail dictionaries complete and the facts out of the entry chunk', () => {
    expect(Object.keys(PROPOSAL_DOSSIER_DETAIL_BCS).sort()).toEqual(Object.keys(PROPOSAL_DOSSIER_DETAIL_EN).sort());
    for (const value of Object.values(PROPOSAL_DOSSIER_DETAIL_BCS)) expect(value.trim().length).toBeGreaterThan(0);
    // Only the lazily loaded ProposalDossierFacts imports the detail module.
    const room = withoutComments(readFileSync('src/ui/map/data/presidentialDecisionRoom.ts', 'utf8'));
    const core = withoutComments(readFileSync('src/ui/map/data/proposalDossier.ts', 'utf8'));
    const surface = withoutComments(readFileSync('src/ui/map/components/command_surface/CommandSurface.tsx', 'utf8'));
    expect(room).not.toContain('proposalDossierDetail');
    expect(core).not.toContain('proposalDossierDetail');
    expect(surface).toContain("lazy(() => import('./ProposalDossierFacts'))");
  });
});

describe('proposal dossier inputs (read model and IPC mirror)', () => {
  // Own-side state only: the corps commander's belief state, his ready plan and his file.
  const rawState = {
    military: {
      formations: {
        arbih_2nd_corps: { name: '2nd Corps' },
        b221: { name: '221st Brigade' },
        b222: { name: '222nd Brigade' },
      },
      named_officer_data: [{ id: 'off_delic', name: 'Sead Delić', rank: 'corps_commander', competence: 4, aggressiveness: 2 }],
      named_officers: { off_delic: { status: 'active', assigned_corps_id: 'arbih_2nd_corps' } },
      corps_command: {
        arbih_2nd_corps: {
          commander_state: {
            current_plan: {
              plan_id: 'plan_1',
              status: 'ready',
              objective_description: 'Advance on Vozuća',
              staging_zone: 'zone:arbih_2nd_corps:op:zavidovici:vozuca',
              target_osids: ['op:zavidovici:stog'],
              assigned_brigades: ['b221', 'b222'],
              viability_score: 0.58,
              concentration_progress: 1,
            },
            intel_picture: { zone_confidence: { 'zone:arbih_2nd_corps:op:zavidovici:vozuca': 0.61 } },
            threat_assessment: { overall_pressure: 'heavy' },
          },
        },
      },
    },
  };
  const proposals = [{ id: 'PROP_1', faction: 'RBiH', domain: 'ops', proposed_action: 'APPROVE_OP:arbih_2nd_corps:plan_1' }];
  const roster = [{ id: 'off_delic', name: 'Sead Delić', rank: 'corps_commander', status: 'active' }];

  it('carries the staff estimates and the officer\'s file on the Decision Room card', () => {
    const [uiCard] = buildOpProposalCards(rawState, roster, proposals);
    expect(uiCard.dossier_inputs).toEqual({
      viability: 0.58,
      intel_confidence: 0.61,
      concentration: 1,
      pressure: 'heavy',
      staging_osid: 'op:zavidovici:vozuca',
      brigade_ids: ['b221', 'b222'],
      commander_traits: { competence: 4, aggressiveness: 2 },
    });
  });

  it('mirrors the same inputs on the IPC card', () => {
    const [uiCard] = buildOpProposalCards(rawState, roster, proposals);
    const [ipcCard] = buildOpProposalCardData(rawState, proposals);
    expect(ipcCard.dossier_inputs).toEqual(uiCard.dossier_inputs);
  });

  it('carries no inputs for a proposal whose plan is not ready', () => {
    const notReady = structuredClone(rawState);
    notReady.military.corps_command.arbih_2nd_corps.commander_state.current_plan.status = 'planning';
    const [uiCard] = buildOpProposalCards(notReady, roster, proposals);
    expect(uiCard.dossier_inputs).toBeUndefined();
    expect(buildOpProposalCardData(notReady, proposals)[0].dossier_inputs).toBeUndefined();
  });
});

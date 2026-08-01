import { describe, expect, it } from 'vitest';

import {
  APR1992_PRESIDENTIAL_INITIATIVE_REGISTRY,
  PRESIDENTIAL_INITIATIVE_LEVER_COSTS,
  assertPresidentialInitiativeRuntimeCatalog,
  evaluatePresidentialInitiativeCadence,
  parsePresidentialInitiativeRegistry,
  type PresidentialInitiativeRegistry,
} from '../src/sim/presidency/presidential_initiatives.js';
import type { GameState } from '../src/state/game_state.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import {
  countActionableItems,
  deriveInboxItems,
  isAdvanceBlockingInboxItem,
} from '../src/ui/map/data/inboxItems.js';
import { isPresidentialCadenceHold } from '../src/ui/map/data/presidentialCadenceHold.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';
import {
  ELITE_DEPLOY_COST,
  REPLACE_CO_COST,
  REQUEST_OP_COST,
  STOP_OP_COST,
} from '../src/ui/map/utils/commandAuthority.js';

const AUDIT_REPORT = 'docs/40_reports/audits/20260801_RS_104W_PRESIDENTIAL_CADENCE_AUDIT.md';

function gameState(turn = 20): GameState {
  return {
    meta: { turn, phase: 'war', player_faction: 'RS' },
    military: {
      formations: {
        vrs_test_corps: {
          id: 'vrs_test_corps',
          name: 'Test Corps',
          faction: 'RS',
          kind: 'corps',
          createdTurn: 0,
          status: 'active',
        },
      },
      fired_event_ids: ['source_gate'],
      event_flags: { source_gate_open: true },
      corps_command: {
        vrs_test_corps: {
          stance: 'balanced',
          active_operations: [{ name: 'Existing operation' }],
        },
      },
      command_authority: {
        current: 95,
        max: 100,
        spent_this_turn: 0,
        lifetime_spent: 0,
      },
    },
    political: {},
    factions: [],
    displacement: {},
  } as unknown as GameState;
}

function sourcedRow(id: string) {
  return {
    id,
    faction: 'RS',
    turn_window: { start: 8, end: 40 },
    state_predicate: {
      all_of: [{ kind: 'event_fired', event_id: 'source_gate' }],
    },
    source: {
      authority: 'BB2',
      locator: 'p. 410',
      claim: 'Synthetic unit-test source row; never shipped as authored content.',
      supports_historical_default: false,
    },
    historical_default: null,
    presentation: 'optional_counterfactual',
    lever: { kind: 'request_operation', authority_cost: 25 },
    cooldown_turns: 8,
    once: true,
  } as const;
}

function registry(rows: readonly ReturnType<typeof sourcedRow>[]): PresidentialInitiativeRegistry {
  return parsePresidentialInitiativeRegistry({
    schema_version: 1,
    scenario_id: 'test',
    source_audit: {
      disposition: 'supported_rows',
      report: AUDIT_REPORT,
      evidence_ids: [`${AUDIT_REPORT}#positive-hold-source-inventory`],
      rationale: 'Synthetic unit-test registry.',
    },
    initiatives: rows,
  });
}

function cadenceInput(candidateRegistry: PresidentialInitiativeRegistry) {
  return {
    registry: candidateRegistry,
    state: gameState(),
    faction: 'RS' as const,
    turn: 20,
    authority: { current: 95, max: 100 },
    last_source_backed_review_turn: 12,
    required_decision_count: 0,
    pending_optional_initiative_ids: [] as string[],
    initiative_receipts: [] as Array<{ initiative_id: string; turn: number }>,
  };
}

describe('APR1992 presidential initiative source registry', () => {
  it('ships the accepted audit disposition explicitly and admits no invented initiative row', () => {
    expect(APR1992_PRESIDENTIAL_INITIATIVE_REGISTRY).toMatchObject({
      schema_version: 1,
      scenario_id: 'apr1992',
      source_audit: {
        disposition: 'positive_hold',
        report: AUDIT_REPORT,
      },
      initiatives: [],
    });
  });

  it('pins every admitted lever to its existing canonical Authority cost', () => {
    expect(PRESIDENTIAL_INITIATIVE_LEVER_COSTS).toEqual({
      // Agreeing with a commander's surfaced proposal is free. This is not the
      // separate 25-Authority author-new-operation action.
      authorize_operation: 0,
      request_operation: REQUEST_OP_COST,
      stop_operation: STOP_OP_COST,
      deploy_elite_formation: ELITE_DEPLOY_COST,
      replace_corps_commander: REPLACE_CO_COST,
    });
  });

  it('fails closed when a row omits its citation or uses a sixth lever', () => {
    const noCitation = sourcedRow('no_citation') as Record<string, unknown>;
    delete noCitation.source;
    expect(() => registry([noCitation as ReturnType<typeof sourcedRow>]))
      .toThrow(/source/i);

    const sixthLever = {
      ...sourcedRow('generic_authority_spend'),
      lever: { kind: 'spend_authority', authority_cost: 25 },
    };
    expect(() => registry([sixthLever as unknown as ReturnType<typeof sourcedRow>]))
      .toThrow(/lever/i);

    const wrongCost = {
      ...sourcedRow('wrong_existing_lever_cost'),
      lever: { kind: 'request_operation', authority_cost: 24 },
    };
    expect(() => registry([wrongCost]))
      .toThrow(/authority_cost/i);
  });

  it('rejects an asserted historical default unless the citation explicitly supports it', () => {
    const row = {
      ...sourcedRow('unsupported_default'),
      historical_default: 'accept',
      presentation: 'historical_disposition',
    };
    expect(() => registry([row as unknown as ReturnType<typeof sourcedRow>]))
      .toThrow(/historical default/i);
  });

  it('keeps runtime fail-closed until a supported row is wired to its existing lever owner', () => {
    expect(assertPresidentialInitiativeRuntimeCatalog()).toBe('positive_hold');
    expect(() => assertPresidentialInitiativeRuntimeCatalog(registry([sourcedRow('future_row')])))
      .toThrow(/existing lever owner/i);
  });
});

describe('presidential initiative cadence evaluator', () => {
  it('selects at most one eligible sourced row in stable ID order under catalog permutation', () => {
    const ascending = evaluatePresidentialInitiativeCadence(cadenceInput(registry([
      sourcedRow('initiative_alpha'),
      sourcedRow('initiative_bravo'),
    ])));
    const descending = evaluatePresidentialInitiativeCadence(cadenceInput(registry([
      sourcedRow('initiative_bravo'),
      sourcedRow('initiative_alpha'),
    ])));

    expect(ascending).toEqual(descending);
    expect(ascending.kind).toBe('initiative');
    if (ascending.kind === 'initiative') {
      expect(ascending.initiative.id).toBe('initiative_alpha');
      expect(ascending.initiative.lever).toEqual({ kind: 'request_operation', authority_cost: 25 });
      expect(ascending.historical_default).toBeNull();
    }
  });

  it('does not add another optional initiative when one is already pending', () => {
    const input = cadenceInput(registry([sourcedRow('initiative_alpha')]));
    input.pending_optional_initiative_ids = ['initiative_existing'];

    expect(evaluatePresidentialInitiativeCadence(input)).toEqual({
      kind: 'none',
      reason: 'optional_initiative_pending',
    });
  });

  it('returns no initiative when the accepted source audit admits no row', () => {
    const result = evaluatePresidentialInitiativeCadence(cadenceInput(
      APR1992_PRESIDENTIAL_INITIATIVE_REGISTRY,
    ));

    expect(result).toEqual({
      kind: 'none',
      reason: 'no_eligible_source_row',
    });
  });

  it('does not manufacture cadence work below the near-cap threshold or across a required blocker', () => {
    const belowCap = cadenceInput(registry([sourcedRow('initiative_alpha')]));
    belowCap.authority.current = 89;
    expect(evaluatePresidentialInitiativeCadence(belowCap)).toEqual({
      kind: 'none',
      reason: 'authority_below_threshold',
    });

    const blocked = cadenceInput(registry([sourcedRow('initiative_alpha')]));
    blocked.required_decision_count = 1;
    expect(evaluatePresidentialInitiativeCadence(blocked)).toEqual({
      kind: 'none',
      reason: 'required_decision_pending',
    });
  });
});

describe('positive-hold Desk projection', () => {
  function loadedState(): LoadedGameState {
    return {
      label: 'test',
      turn: 20,
      phase: 'war',
      player_faction: 'RS',
      formations: [],
      militiaPools: [],
      controlBySettlement: {},
      statusBySettlement: {},
      brigadeAorByFormationId: {},
      attackOrders: [],
      aorOrders: [],
      recentControlEvents: [],
      allControlEvents: [],
      displacementEventLog: [],
      battlesByOsid: {},
      movementsByOsid: {},
      supplyTransitionsByOsid: {},
      historicalEventsByTurn: [],
      latestTurnSummary: null,
      turnSummaries: [],
      commandAuthority: { current: 95, max: 100 },
      rawGameState: gameState(),
    } as unknown as LoadedGameState;
  }

  it('projects the existing cadence-hold truth as monitor-only live posture, never an action or blocker', () => {
    const state = loadedState();
    const items = deriveInboxItems(state, null);
    const hold = items.find((item) => item.id === 'sit:presidential-cadence-hold:20');

    expect(isPresidentialCadenceHold(state, items)).toBe(true);
    expect(hold).toMatchObject({
      type: 'situation',
      severity: 'info',
      priorityBand: 'monitor',
      action: 'none',
      includeInDeskPacket: true,
    });
    expect(hold?.subtitle).toContain('Republika Srpska');
    expect(hold?.subtitle).toContain('95/100');
    expect(hold && isAdvanceBlockingInboxItem(hold)).toBe(false);
    expect(countActionableItems(items)).toBe(0);
  });

  it('wires the source gate into war turns without mutating the empty-registry state', async () => {
    const step = warPhases.find((candidate) => candidate.name === 'evaluate-presidential-initiative-registry');
    const state = gameState();
    const before = JSON.stringify(state);

    expect(step).toBeDefined();
    await step!.run({ state } as unknown as Parameters<(typeof warPhases)[number]['run']>[0]);
    expect(JSON.stringify(state)).toBe(before);
  });
});

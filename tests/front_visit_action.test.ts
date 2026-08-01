/**
 * Presidential FRONT VISIT action contract (Presidential Command Surface §10).
 *
 * Exercises the pure logic used by the desktop IPC handlers
 * (electron-main.cjs `initiate-front-visit` / `get-front-visit-availability`
 * delegate to front_visit_contract.cjs). Verifies the canon-safety contract:
 *   - force-queue builds the player faction's visit_to_front_<faction> decision
 *     (mirror of evaluate_events.ts:577) carrying the authored response_options
 *   - cooldown/cap use voluntary action_cadence (max_fires 5 / cooldown 10t):
 *     refuse 'exhausted' when fires used up; refuse 'on_cooldown' within cooldown
 *   - ENCLAVE REACHABILITY GATE: a cut-off enclave branch ('critical' supply)
 *     is EXCLUDED; a corridored target ('strained'/'adequate') is offered;
 *     all-cut-off → action unavailable ('all_cut_off')
 *   - the CA debit is the handler's responsibility (modelled here against the
 *     availability contract: insufficient CA is a handler guard, exercised via
 *     the documented FRONT_VISIT_COST and a thin debit harness)
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

/* eslint-disable @typescript-eslint/no-explicit-any */
const contract = require('../src/desktop/front_visit_contract.cjs');
const frontVisitEventIdForFaction: (f: string | null) => string | null = contract.frontVisitEventIdForFaction;
const isBranchReachable: (
  branchId: string,
  playerFaction: string,
  controllers: Record<string, string>,
  supplyByOsid: Record<string, string>,
) => boolean = contract.isBranchReachable;
const computeFrontVisitAvailability: (state: any, playerFaction: string | null, eventDef: any) => any =
  contract.computeFrontVisitAvailability;
const buildFrontVisitPendingDecision: (state: any, playerFaction: string, eventDef: any, availability: any) => any =
  contract.buildFrontVisitPendingDecision;
const FRONT_VISIT_BRANCH_AREAS: Record<string, string[]> = contract.FRONT_VISIT_BRANCH_AREAS;

const FRONT_VISIT_COST: number =
  require('../src/desktop/autonomy_ipc_contract.cjs').FRONT_VISIT_COST;

/**
 * Minimal RBiH visit_to_front event definition — the three front branches plus
 * the always-available stay/press branches. Mirrors the authored shape in
 * data/scenarios/events/war_1993.json (visit_to_front_rbih) for the fields the
 * contract reads.
 */
function makeRbihEventDef() {
  return {
    id: 'visit_to_front_rbih',
    title: 'Visit to the Front',
    category: 'command',
    responding_faction: 'RBiH',
    requires_player_response: true,
    staff_recommended_response_id: 'stay_capital_rbih',
    action_cadence: { max_fires: 5, cooldown_turns: 10, escalation: 'static' },
    effect: { kind: 'narrative', text: 'Arrangements are made for the presidential visit.' },
    response_options: [
      { id: 'visit_sarajevo', label: 'Visit the Sarajevo front' },
      { id: 'visit_eastern_front', label: 'Visit the eastern front' },
      { id: 'visit_bihac', label: 'Visit the Bihac pocket' },
      { id: 'stay_capital_rbih', label: 'Stay in Sarajevo' },
      { id: 'visit_press_rbih', label: 'Visit with international press', available_from_fire: 3 },
    ],
  };
}

/**
 * Build a state with RBiH controlling Tuzla (corridored=strained), Bihać
 * (strained), Sarajevo-stari (corridored=strained), and Srebrenica (cut
 * off=critical). Goražde omitted from this baseline (added per-test).
 */
function makeState(opts: {
  turn?: number;
  playerFaction?: string;
  ca?: number;
  fireCount?: number;
  lastFired?: number | null;
  controllers?: Record<string, string>;
  supply?: Record<string, string>;
} = {}) {
  const controllers: Record<string, string> = opts.controllers ?? {
    'op:tuzla:tuzla_2': 'RBiH',
    'op:bihac:bihac_2': 'RBiH',
    'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'RBiH',
  };
  const supply: Record<string, string> = opts.supply ?? {
    'op:tuzla:tuzla_2': 'strained',
    'op:bihac:bihac_2': 'strained',
    'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'strained',
  };
  const military: any = {
    command_authority: { current: opts.ca ?? 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 },
    event_fire_counts: {},
    event_last_fired_turn: {},
  };
  if (opts.fireCount != null) military.event_fire_counts['visit_to_front_rbih'] = opts.fireCount;
  if (opts.lastFired != null) military.event_last_fired_turn['visit_to_front_rbih'] = opts.lastFired;
  return {
    meta: { turn: opts.turn ?? 90, player_faction: opts.playerFaction ?? 'RBiH' },
    military,
    political: {
      political_controllers: controllers,
      last_supply_state_by_osid: supply,
    },
  };
}

describe('front visit — event resolution', () => {
  it('resolves the player faction visit_to_front event id', () => {
    expect(frontVisitEventIdForFaction('RBiH')).toBe('visit_to_front_rbih');
    expect(frontVisitEventIdForFaction('RS')).toBe('visit_to_front_rs');
    expect(frontVisitEventIdForFaction('HRHB')).toBe('visit_to_front_hrhb');
    expect(frontVisitEventIdForFaction(null)).toBeNull();
    expect(frontVisitEventIdForFaction('NOPE')).toBeNull();
  });
});

describe('front visit — force-queue inserts the player faction event', () => {
  it('builds a pending decision carrying the authored response_options', () => {
    const state = makeState();
    const def = makeRbihEventDef();
    const availability = computeFrontVisitAvailability(state, 'RBiH', def);
    expect(availability.available).toBe(true);

    const decision = buildFrontVisitPendingDecision(state, 'RBiH', def, availability);
    expect(decision).not.toBeNull();
    expect(decision.event_id).toBe('visit_to_front_rbih');
    expect(decision.faction).toBe('RBiH');
    expect(decision.turn_fired).toBe(90);
    // Mirror of evaluate_events.ts: queue shape carries response_options.
    const ids = decision.response_options.map((o: any) => o.id);
    // All three reachable fronts offered + the always-available stay/press.
    expect(ids).toContain('visit_sarajevo');
    expect(ids).toContain('visit_eastern_front');
    expect(ids).toContain('visit_bihac');
    expect(ids).toContain('stay_capital_rbih');
    expect(ids).toContain('visit_press_rbih');
  });
});

describe('front visit — voluntary action cooldown / cap', () => {
  it('fails closed when voluntary action cadence metadata is absent', () => {
    const def = makeRbihEventDef();
    delete (def as any).action_cadence;
    const a = computeFrontVisitAvailability(makeState(), 'RBiH', def);
    expect(a.available).toBe(false);
    expect(a.reason).toBe('no_action_cadence');
  });

  it('refuses with exhausted when max_fires reached', () => {
    const state = makeState({ fireCount: 5 }); // max_fires = 5
    const def = makeRbihEventDef();
    const a = computeFrontVisitAvailability(state, 'RBiH', def);
    expect(a.available).toBe(false);
    expect(a.reason).toBe('exhausted');
    expect(a.firesLeft).toBe(0);
  });

  it('refuses with on_cooldown when within cooldown_turns of last fire', () => {
    // last fired turn 85, cooldown 10 → blocked until turn 95. Current turn 90.
    const state = makeState({ turn: 90, fireCount: 1, lastFired: 85 });
    const def = makeRbihEventDef();
    const a = computeFrontVisitAvailability(state, 'RBiH', def);
    expect(a.available).toBe(false);
    expect(a.reason).toBe('on_cooldown');
    expect(a.cooldownUntil).toBe(95);
    expect(a.onCooldown).toBe(true);
  });

  it('allows a second explicit action only once the cooldown has elapsed', () => {
    const state = makeState({ turn: 95, fireCount: 1, lastFired: 85 });
    const def = makeRbihEventDef();
    const a = computeFrontVisitAvailability(state, 'RBiH', def);
    expect(a.available).toBe(true);
    expect(a.onCooldown).toBe(false);
    expect(a.firesLeft).toBe(4);
  });
});

describe('front visit — ENCLAVE REACHABILITY GATE', () => {
  it('excludes a cut-off enclave branch and offers a corridored target', () => {
    // Add Goražde (critical) + keep Tuzla (strained). The eastern-front branch
    // targets Tuzla (reachable). A hypothetical enclave branch on critical
    // supply must be excluded. We model this directly via isBranchReachable.
    const controllers = {
      'op:tuzla:tuzla_2': 'RBiH',
      'op:gorazde:gorazde_2': 'RBiH',
    };
    const supply = {
      'op:tuzla:tuzla_2': 'strained',
      'op:gorazde:gorazde_2': 'critical',
    };
    // Corridored target (Tuzla via visit_eastern_front) → reachable.
    expect(isBranchReachable('visit_eastern_front', 'RBiH', controllers, supply)).toBe(true);
    // Bihać not controlled here → not reachable.
    expect(isBranchReachable('visit_bihac', 'RBiH', controllers, supply)).toBe(false);
  });

  it('marks a Srebrenica-style cut-off (critical) front as unreachable, corridored Sarajevo as reachable', () => {
    const controllers = {
      'op:srebrenica:srebrenica_2': 'RBiH',
      'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'RBiH',
    };
    const supply = {
      'op:srebrenica:srebrenica_2': 'critical', // cut off
      'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'strained', // Butmir corridor
    };
    // Sarajevo branch reachable via the corridored stari-grad OSID.
    expect(isBranchReachable('visit_sarajevo', 'RBiH', controllers, supply)).toBe(true);
    // Srebrenica is not a player-visit branch id; assert the gate semantics on a
    // gated branch whose ONLY in-area OSID is critical → unreachable.
    const onlyCritical = {
      'op:bihac:bihac_2': 'RBiH',
    } as Record<string, string>;
    const critSupply = { 'op:bihac:bihac_2': 'critical' } as Record<string, string>;
    expect(isBranchReachable('visit_bihac', 'RBiH', onlyCritical, critSupply)).toBe(false);
  });

  it('filters the OFFERED branches to reachable targets in the queued decision', () => {
    // Bihać cut off (critical); Tuzla + Sarajevo corridored. Bihać excluded.
    const state = makeState({
      controllers: {
        'op:tuzla:tuzla_2': 'RBiH',
        'op:bihac:bihac_2': 'RBiH',
        'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'RBiH',
      },
      supply: {
        'op:tuzla:tuzla_2': 'strained',
        'op:bihac:bihac_2': 'critical', // Bihać encircled
        'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'strained',
      },
    });
    const def = makeRbihEventDef();
    const a = computeFrontVisitAvailability(state, 'RBiH', def);
    expect(a.available).toBe(true);
    expect(a.reachableBranchIds).toContain('visit_sarajevo');
    expect(a.reachableBranchIds).toContain('visit_eastern_front');
    expect(a.reachableBranchIds).not.toContain('visit_bihac');
    expect(a.unreachableBranchIds).toContain('visit_bihac');

    const decision = buildFrontVisitPendingDecision(state, 'RBiH', def, a);
    const ids = decision.response_options.map((o: any) => o.id);
    expect(ids).not.toContain('visit_bihac'); // cut-off front excluded
    expect(ids).toContain('visit_eastern_front');
    expect(ids).toContain('stay_capital_rbih'); // ungated always offered
  });

  it('all fronts cut off → action unavailable with all_cut_off', () => {
    const state = makeState({
      controllers: {
        'op:tuzla:tuzla_2': 'RBiH',
        'op:bihac:bihac_2': 'RBiH',
        'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'RBiH',
      },
      supply: {
        'op:tuzla:tuzla_2': 'critical',
        'op:bihac:bihac_2': 'critical',
        'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo': 'critical',
      },
    });
    const def = makeRbihEventDef();
    const a = computeFrontVisitAvailability(state, 'RBiH', def);
    expect(a.available).toBe(false);
    expect(a.reason).toBe('all_cut_off');
    expect(a.reachableBranchIds).toHaveLength(0);
    expect(buildFrontVisitPendingDecision(state, 'RBiH', def, a)).toBeNull();
  });
});

describe('front visit — CA debit guard (handler contract)', () => {
  // The CA debit lives in the IPC handler; this models the documented contract:
  // refuse when current < FRONT_VISIT_COST, debit FRONT_VISIT_COST on success.
  function debitGuard(state: any) {
    const def = makeRbihEventDef();
    const a = computeFrontVisitAvailability(state, 'RBiH', def);
    if (!a.available) return { ok: false, reason: a.reason };
    const auth = state.military.command_authority;
    if (auth.current < FRONT_VISIT_COST) return { ok: false, reason: 'insufficient_ca' };
    auth.current -= FRONT_VISIT_COST;
    auth.spent_this_turn += FRONT_VISIT_COST;
    auth.lifetime_spent += FRONT_VISIT_COST;
    return { ok: true, caCost: FRONT_VISIT_COST };
  }

  it('debits FRONT_VISIT_COST on success', () => {
    const state = makeState({ ca: 50 });
    const r = debitGuard(state);
    expect(r.ok).toBe(true);
    expect(r.caCost).toBe(FRONT_VISIT_COST);
    expect(state.military.command_authority.current).toBe(50 - FRONT_VISIT_COST);
    expect(state.military.command_authority.spent_this_turn).toBe(FRONT_VISIT_COST);
  });

  it('refuses with insufficient_ca when CA below cost', () => {
    const state = makeState({ ca: FRONT_VISIT_COST - 1 });
    const r = debitGuard(state);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('insufficient_ca');
    expect(state.military.command_authority.current).toBe(FRONT_VISIT_COST - 1); // untouched
  });
});

describe('front visit — branch-area mapping sanity', () => {
  it('only gates front-visit branches (not stay_/press_)', () => {
    const gated = Object.keys(FRONT_VISIT_BRANCH_AREAS).sort();
    expect(gated).toContain('visit_sarajevo');
    expect(gated).toContain('visit_drina_front');
    expect(gated).toContain('visit_mostar_front');
    // stay/press are NOT gated.
    expect(gated).not.toContain('stay_capital_rbih');
    expect(gated).not.toContain('visit_press_rbih');
  });
});

import type { GameState, FactionId, NegotiationLedgerEntry } from './game_state.js';
import type { NegotiationPressureStepReport } from './negotiation_pressure.js';
import type { FormationFatigueStepReport } from './formation_fatigue.js';
import type { AcceptanceReport } from './negotiation_offers.js';
import type { LoadedSettlementGraph } from '../map/settlements.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { computeSettlementValues } from './territorial_valuation.js';
import { getEffectiveSettlementSide } from './control_effective.js';

/**
 * Per-faction negotiation capital component breakdown.
 */
export interface NegotiationCapitalComponents {
  faction_id: FactionId;
  capital_before: number;
  capital_gain: number;
  capital_after: number;
  components: {
    base_capital: number;
    territorial_control_bonus: number;
    ivp_penalty: number;
    patron_bonus: number;
    enclave_liability_penalty: number;
  };
}

/**
 * Negotiation capital step report.
 */
export interface NegotiationCapitalStepReport {
  per_faction: NegotiationCapitalComponents[];
  ledger_entries_added: number;
}

/**
 * Update negotiation capital for all factions based on auditable inputs.
 *
 * Capital gain rules (deterministic):
 * capital_gain = 0
 *   + floor(pressure_delta_this_turn / 2)          // pressure delta from negotiation pressure report
 *   + floor(supplied_active_formations / 10)       // "capacity to bargain" proxy
 *   + floor(accepted_offers_count_this_turn * 2)  // diplomatic momentum
 *
 * Caps:
 * - Per turn gain capped at 5 (min(capital_gain, 5)) to prevent runaway.
 *
 * Ledger reason strings (fixed set):
 * - "pressure_gain"
 * - "supply_viability"
 * - "diplomatic_momentum"
 *
 * Ledger id format:
 * - "NLED_<turn>_<faction_id>_<kind>_<seq>"
 * Where seq is 1..N within that faction+turn, deterministic order by reason.
 */
export async function updateNegotiationCapital(
  state: GameState,
  _negotiationPressureReport: NegotiationPressureStepReport | undefined,
  _formationFatigueReport: FormationFatigueStepReport | undefined,
  _acceptanceReport: AcceptanceReport | undefined,
  settlementsGraph?: LoadedSettlementGraph
): Promise<NegotiationCapitalStepReport> {
  const currentTurn = state.meta.turn;
  const factions = [...(state.factions ?? [])].sort((a, b) => a.id.localeCompare(b.id));

  // Ensure ledger exists
  if (!state.negotiation_ledger || !Array.isArray(state.negotiation_ledger)) {
    state.negotiation_ledger = [];
  }

  const graph = settlementsGraph ?? (await loadSettlementGraph());
  const valuation = computeSettlementValues(state, graph);

  const per_faction: NegotiationCapitalComponents[] = [];
  let ledgerEntriesAdded = 0;

  for (const faction of factions) {
    // Ensure negotiation state exists with capital fields
    if (!faction.negotiation || typeof faction.negotiation !== 'object') {
      faction.negotiation = { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null };
    }
    if (!Number.isInteger(faction.negotiation.capital) || faction.negotiation.capital < 0) {
      faction.negotiation.capital = 0;
    }
    if (!Number.isInteger(faction.negotiation.spent_total) || faction.negotiation.spent_total < 0) {
      faction.negotiation.spent_total = 0;
    }

    const capitalBefore = faction.negotiation.capital;

    const exhaustion = faction.profile.exhaustion ?? 0;
    const baseCapital = 100.0 - exhaustion * 0.5;

    let controlledValue = 0;
    for (const entry of valuation.per_settlement) {
      const side = getEffectiveSettlementSide(state, entry.sid);
      if (side !== faction.id) continue;
      controlledValue += entry.by_side[faction.id] ?? 0;
    }
    const territorialControlBonus = (controlledValue / 100) * 0.1;

    const ivp = state.international_visibility_pressure;
    const ivpPenalty = (ivp?.negotiation_momentum ?? 0) * 10.0;

    const patronCommitment = faction.patron_state?.patron_commitment ?? 0;
    const patronBonus = patronCommitment * 5.0;

    const enclavePenalty =
      (state.enclaves ?? [])
        .filter((e) => e.faction_id === faction.id)
        .reduce((sum, e) => sum + e.humanitarian_pressure, 0) * 10.0;

    const nextCapital = Math.max(
      0,
      Math.floor(baseCapital + territorialControlBonus - ivpPenalty + patronBonus - enclavePenalty)
    );
    const totalGain = nextCapital - capitalBefore;
    faction.negotiation.capital = nextCapital;

    if (totalGain !== 0) {
      faction.negotiation.last_capital_change_turn = currentTurn;
      const reasons: Array<{ reason: string; amount: number }> = [
        { reason: 'base_capital', amount: Math.floor(baseCapital) },
        { reason: 'territorial_control_bonus', amount: Math.floor(territorialControlBonus) },
        { reason: 'ivp_penalty', amount: Math.floor(ivpPenalty) },
        { reason: 'patron_bonus', amount: Math.floor(patronBonus) },
        { reason: 'enclave_liability_penalty', amount: Math.floor(enclavePenalty) }
      ];
      reasons.sort((a, b) => a.reason.localeCompare(b.reason));
      for (let seq = 1; seq <= reasons.length; seq += 1) {
        const { reason, amount } = reasons[seq - 1];
        if (amount === 0) continue;
        const ledgerId = `NLED_${currentTurn}_${faction.id}_adjust_${seq}`;
        const entry: NegotiationLedgerEntry = {
          id: ledgerId,
          turn: currentTurn,
          faction_id: faction.id,
          kind: 'adjust',
          amount,
          reason
        };
        state.negotiation_ledger.push(entry);
        ledgerEntriesAdded += 1;
      }
    }

    per_faction.push({
      faction_id: faction.id,
      capital_before: capitalBefore,
      capital_gain: totalGain,
      capital_after: nextCapital,
      components: {
        base_capital: baseCapital,
        territorial_control_bonus: territorialControlBonus,
        ivp_penalty: ivpPenalty,
        patron_bonus: patronBonus,
        enclave_liability_penalty: enclavePenalty
      }
    });
  }

  // Sort deterministically
  per_faction.sort((a, b) => a.faction_id.localeCompare(b.faction_id));

  return { per_faction, ledger_entries_added: ledgerEntriesAdded };
}

/**
 * Spend negotiation capital for a faction (ledger-only, no treaty effects in Phase 12A).
 *
 * Rules:
 * - If amount > capital => error
 * - capital -= amount
 * - spent_total += amount
 * - append ledger entry kind="spend", reason="pre_treaty_reserve"
 */
export function spendNegotiationCapital(
  state: GameState,
  factionId: FactionId,
  amount: number,
  reason: string
): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Invalid amount: ${amount} (must be integer >= 0)`);
  }

  const faction = state.factions.find((f) => f.id === factionId);
  if (!faction) {
    throw new Error(`Faction not found: ${factionId}`);
  }

  // Ensure negotiation state exists
  if (!faction.negotiation || typeof faction.negotiation !== 'object') {
    faction.negotiation = { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null };
  }
  if (!Number.isInteger(faction.negotiation.capital) || faction.negotiation.capital < 0) {
    faction.negotiation.capital = 0;
  }
  if (!Number.isInteger(faction.negotiation.spent_total) || faction.negotiation.spent_total < 0) {
    faction.negotiation.spent_total = 0;
  }

  if (amount > faction.negotiation.capital) {
    throw new Error(`Insufficient capital: requested ${amount}, available ${faction.negotiation.capital}`);
  }

  // Validate reason is in fixed set
  const validReasons = ['pre_treaty_reserve'];
  if (!validReasons.includes(reason)) {
    throw new Error(`Invalid reason: ${reason} (must be one of: ${validReasons.join(', ')})`);
  }

  const currentTurn = state.meta.turn;

  // Deduct capital
  faction.negotiation.capital -= amount;
  faction.negotiation.spent_total += amount;
  faction.negotiation.last_capital_change_turn = currentTurn;

  // Ensure ledger exists
  if (!state.negotiation_ledger || !Array.isArray(state.negotiation_ledger)) {
    state.negotiation_ledger = [];
  }

  // Append ledger entry
  const ledgerId = `NLED_${currentTurn}_${factionId}_spend_1`;
  const entry: NegotiationLedgerEntry = {
    id: ledgerId,
    turn: currentTurn,
    faction_id: factionId,
    kind: 'spend',
    amount,
    reason
  };
  state.negotiation_ledger.push(entry);
}

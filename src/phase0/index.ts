/**
 * Phase 0 (Pre-War) systems. Phase_0_Specification_v0_4_0.md.
 */

export {
  PREWAR_CAPITAL_INITIAL,
  PREWAR_CAPITAL_TRICKLE_PER_TURN,
  PREWAR_CAPITAL_TRICKLE_MAX_BONUS,
  initializePrewarCapital,
  applyPrewarCapitalTrickle,
  spendPrewarCapital,
  getPrewarCapital,
  PHASE0_FACTION_ORDER,
  type PrewarCapitalTrickleOptions,
  type SpendPrewarCapitalResult
} from './capital.js';

export {
  INVESTMENT_COST,
  isToAllowedForFaction,
  getInvestmentTypesForFaction,
  isCoordinationEligibleFaction,
  applyInvestment,
  getInvestmentCost,
  getInvestmentCostWithCoordination,
  type InvestmentType,
  type InvestmentScope,
  type IsHostileMajorityFn,
  type ApplyInvestmentResult
} from './investment.js';

export {
  STABILITY_BASE,
  STABILITY_MIN,
  STABILITY_MAX,
  STABILITY_SECURE_MIN,
  STABILITY_CONTESTED_MIN,
  demographicFactor,
  organizationalFactor,
  geographicVulnerabilityTotal,
  computeStabilityScore,
  computeControlStatus,
  updateMunicipalityStabilityScore,
  updateAllStabilityScores,
  type GeographicInputs,
  type StabilityInputs
} from './stability.js';

export {
  RS_PRESSURE_PER_TURN,
  HRHB_PRESSURE_PER_TURN,
  DECLARATION_PRESSURE_THRESHOLD,
  DECLARING_FACTIONS,
  areRsEnablingConditionsMet,
  areHrhbEnablingConditionsMet,
  accumulateDeclarationPressure,
  type DeclarationPressureOptions
} from './declaration_pressure.js';

export {
  REFERENDUM_WAR_DELAY_TURNS,
  REFERENDUM_DEADLINE_TURNS_DEFAULT,
  OUTCOME_NON_WAR_TERMINAL,
  isReferendumEligible,
  updateReferendumEligibility,
  applyScheduledReferendum,
  holdReferendum,
  checkReferendumDeadline,
  isWarStartTurn,
  applyPhase0ToPhaseITransition,
  type ReferendumEligibilityOptions
} from './referendum.js';

export { runPhase0Turn, type Phase0TurnOptions } from './turn.js';

export { buildPhase0TurnOptions } from './phase0_options_builder.js';

export {
  generatePhase0Events,
  type Phase0EventType
} from './phase0_events.js';

export {
  initializePhase0Relationships,
  updateAllianceAfterInvestment,
  type Phase0Relationships
} from './alliance.js';

export { runPhase0BotInvestments } from './bot_phase0.js';

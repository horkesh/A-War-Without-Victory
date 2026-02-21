/**
 * Phase 0 (Pre-War) systems. Phase_0_Specification_v0_4_0.md.
 */

export {
    PHASE0_FACTION_ORDER, PREWAR_CAPITAL_INITIAL, PREWAR_CAPITAL_TRICKLE_MAX_BONUS, PREWAR_CAPITAL_TRICKLE_PER_TURN, applyPrewarCapitalTrickle, getPrewarCapital, initializePrewarCapital, spendPrewarCapital, type PrewarCapitalTrickleOptions,
    type SpendPrewarCapitalResult
} from './capital.js';

export {
    INVESTMENT_COST, applyInvestment,
    getInvestmentCost,
    getInvestmentCostWithCoordination, getInvestmentTypesForFaction,
    isCoordinationEligibleFaction, isToAllowedForFaction, type ApplyInvestmentResult, type InvestmentScope, type InvestmentType, type IsHostileMajorityFn
} from './investment.js';

export {
    STABILITY_BASE, STABILITY_CONTESTED_MIN, STABILITY_MAX, STABILITY_MIN, STABILITY_SECURE_MIN, computeControlStatus, computeStabilityScore, demographicFactor, geographicVulnerabilityTotal, organizationalFactor, updateAllStabilityScores, updateMunicipalityStabilityScore, type GeographicInputs,
    type StabilityInputs
} from './stability.js';

export {
    DECLARATION_PRESSURE_THRESHOLD,
    DECLARING_FACTIONS, HRHB_PRESSURE_PER_TURN, RS_PRESSURE_PER_TURN, accumulateDeclarationPressure, areHrhbEnablingConditionsMet, areRsEnablingConditionsMet, type DeclarationPressureOptions
} from './declaration_pressure.js';

export {
    OUTCOME_NON_WAR_TERMINAL, REFERENDUM_DEADLINE_TURNS_DEFAULT, REFERENDUM_WAR_DELAY_TURNS, applyPhase0ToPhaseITransition, applyScheduledReferendum, checkReferendumDeadline, holdReferendum, isReferendumEligible, isWarStartTurn, updateReferendumEligibility, type ReferendumEligibilityOptions
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

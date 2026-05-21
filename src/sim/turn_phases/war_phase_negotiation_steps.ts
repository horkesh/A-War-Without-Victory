import { applyWarTermination, checkWarTermination } from '../war_termination.js';
import { initiateDaytonNegotiation, shouldInitiateDayton } from '../negotiation/dayton_negotiation.js';
import { computeNegotiationBreakdown } from '../negotiation/compute_capital.js';
import { evaluatePeacePlans } from '../negotiation/peace_plans.js';
import { resolveCounterOffers } from '../negotiation/counter_offer_generator.js';
import { evaluatePatronEvents } from '../negotiation/patron_events.js';
import { updatePatronPressure } from '../negotiation/patron_pressure.js';
import { evaluateRuptureConsequences } from '../negotiation/rupture_consequences.js';
import type { NamedPhase } from '../turn_pipeline_types.js';

export const warPhaseNegotiationSteps: NamedPhase[] = [
    {
        name: 'evaluate-peace-plans',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            evaluatePeacePlans(context.state);
        }
    },
    {
        name: 'resolve-counter-offers',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const result = resolveCounterOffers(context.state);
            if (result.created_counter_offer_ids.length > 0) {
                context.report.counter_offers = result;
            }
        }
    },
    {
        name: 'check-victory-conditions',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const result = checkWarTermination(context.state);
            if (result.game_over) {
                applyWarTermination(context.state, result);
                context.report.war_termination = {
                    outcome: result.outcome,
                    winner: result.winner,
                    trigger: result.trigger
                };
            }
        }
    },
    {
        name: 'update-patron-pressure',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            updatePatronPressure(context.state);
            evaluatePatronEvents(context.state);
        }
    },
    {
        name: 'evaluate-rupture-consequences',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            evaluateRuptureConsequences(context.state);
        }
    },
    {
        name: 'compute-negotiation-capital',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            computeNegotiationBreakdown(context.state);
        }
    },
    {
        name: 'evaluate-dayton-trigger',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            if (context.state.meta.game_over) return;
            const neg = context.state.military.negotiation;
            if (neg?.dayton_result) return;
            if (neg?.pending_dayton) return;
            if (shouldInitiateDayton(context.state)) {
                const menu = initiateDaytonNegotiation(context.state);
                context.state.military.negotiation!.pending_dayton = menu;
            }
        }
    },
];

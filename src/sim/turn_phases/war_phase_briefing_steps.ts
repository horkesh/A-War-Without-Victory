import type { NamedPhase } from '../turn_pipeline_types.js';

export const warPhaseBriefingSteps: NamedPhase[] = [
    {
        name: 'assemble-command-briefing',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const playerFaction = context.state.meta.player_faction;
            if (!playerFaction) return;
            const { assembleCommandBriefing } = require('../briefing/collect_briefing.js');
            const briefing = assembleCommandBriefing(context.state, playerFaction);
            context.state.military.last_briefing = briefing;
        }
    },
    {
        name: 'compile-turn-summary',
        run: async (context) => {
            if (context.state.meta.phase !== 'war') return;
            const { getAARSnapshot } = await import('../turn_pipeline_types.js');
            const { compileTurnSummary } = await import('../compile_turn_summary.js');
            const { MAX_TURN_SUMMARIES } = await import('../../state/turn_summary.js');
            const snapshot = getAARSnapshot(context);
            if (!snapshot) return;
            const summary = compileTurnSummary(context.state, snapshot, context.report);
            const existing = context.state.turn_summaries ?? [];
            context.state.turn_summaries = [summary, ...existing].slice(0, MAX_TURN_SUMMARIES);
        }
    },
    {
        name: 'resolve-noop',
        run: () => {
            // placeholder: future resolution work goes here
        }
    }
];

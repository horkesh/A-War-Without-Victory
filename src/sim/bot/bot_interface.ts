import type { FrontEdge } from '../../map/front_edges.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import type { BotDifficulty, BotStrategyProfile, BotTimeContext } from './bot_strategy.js';

export interface BotDecisions {
    // Posture assignments: edge_id -> 'push' | 'hold' | 'probe'
    posture_assignments?: Record<string, 'push' | 'hold' | 'probe'>;
    // Formation assignments: formation_id -> edge_id (or other target)
    formation_assignments?: Record<string, string>;
}

/** Optional graph context for consolidation-aware edge scoring (Phase I). */
export interface ConsolidationContext {
    edges: EdgeRecord[];
    sidToMun: Map<string, string> | Record<string, string>;
    settlementsByMun: Map<string, string[]>;
}

export interface BotDecisionContext {
    rng: () => number;
    difficulty: BotDifficulty;
    strategy: BotStrategyProfile;
    timeContext?: BotTimeContext;
    /** When present, Phase I bot adds consolidation bonus to edge scores. */
    consolidationContext?: ConsolidationContext;
}

export interface Bot {
    id: string;
    factionId: FactionId;
    /**
     * Called once per turn before the pipeline runs.
     * decision-making logic goes here.
     */
    makeDecisions(state: GameState, frontEdges: FrontEdge[], context: BotDecisionContext): BotDecisions;
}

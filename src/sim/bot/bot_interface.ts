import type { GameState, FactionId } from '../../state/game_state.js';
import type { FrontEdge } from '../../map/front_edges.js';
import type { BotDifficulty, BotStrategyProfile, BotTimeContext } from './bot_strategy.js';

export interface BotDecisions {
    // Posture assignments: edge_id -> 'push' | 'hold' | 'probe'
    posture_assignments?: Record<string, 'push' | 'hold' | 'probe'>;
    // Formation assignments: formation_id -> edge_id (or other target)
    formation_assignments?: Record<string, string>;
}

export interface BotDecisionContext {
    rng: () => number;
    difficulty: BotDifficulty;
    strategy: BotStrategyProfile;
    timeContext?: BotTimeContext;
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

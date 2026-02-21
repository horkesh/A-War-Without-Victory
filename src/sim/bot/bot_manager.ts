import { FrontEdge } from '../../map/front_edges.js';
import type { GameState } from '../../state/game_state.js';
import type { BotDecisions, ConsolidationContext } from './bot_interface.js';
import {
    type BotDifficulty,
    getBotStrategyProfile,
    resolveBotDifficulty
} from './bot_strategy.js';
import { SimpleGeneralBot } from './simple_general_bot.js';

interface BotManagerOptions {
    seed?: string;
    difficulty?: BotDifficulty | string;
    scenarioStartWeek?: number;
}

type BotEntry = {
    bot: SimpleGeneralBot;
    strategy: ReturnType<typeof getBotStrategyProfile>;
};

export interface BotDecisionSummary {
    bot_id: string;
    faction: string;
    posture_counts: { hold: number; probe: number; push: number };
    formation_reassignments: number;
}

export interface BotRunDiagnostics {
    by_bot: BotDecisionSummary[];
    total_reassignments: number;
}

export class BotManager {
    bots: BotEntry[] = [];
    difficulty: BotDifficulty;
    private readonly rng: () => number;
    private readonly scenarioStartWeek: number;

    constructor(options: BotManagerOptions = {}) {
        this.difficulty = resolveBotDifficulty(options.difficulty);
        this.rng = createRng(options.seed ?? 'bot-manager-seed');
        this.scenarioStartWeek = Number.isInteger(options.scenarioStartWeek) ? (options.scenarioStartWeek as number) : 0;
        const rbihStrategy = getBotStrategyProfile('RBiH');
        const rsStrategy = getBotStrategyProfile('RS');
        const hrhbStrategy = getBotStrategyProfile('HRHB');
        this.bots.push({
            bot: new SimpleGeneralBot(
                'bot_rbih',
                'RBiH',
                0.5
            ),
            strategy: rbihStrategy
        });
        this.bots.push({
            bot: new SimpleGeneralBot(
                'bot_rs',
                'RS',
                0.5
            ),
            strategy: rsStrategy
        });
        this.bots.push({
            bot: new SimpleGeneralBot(
                'bot_hrhb',
                'HRHB',
                0.5
            ),
            strategy: hrhbStrategy
        });
    }

    public runBots(state: GameState, frontEdges: FrontEdge[], consolidationContext?: ConsolidationContext): BotRunDiagnostics {
        const allDecisions: { bot: SimpleGeneralBot; decision: BotDecisions }[] = [];
        const ordered = [...this.bots].sort((a, b) => a.bot.id.localeCompare(b.bot.id));
        for (const entry of ordered) {
            allDecisions.push({
                bot: entry.bot,
                decision: entry.bot.makeDecisions(state, frontEdges, {
                    rng: this.rng,
                    difficulty: this.difficulty,
                    strategy: entry.strategy,
                    timeContext: {
                        global_week: this.scenarioStartWeek + state.meta.turn
                    },
                    consolidationContext
                })
            });
        }
        const by_bot = allDecisions
            .map(({ bot, decision }) => {
                const postureAssignments = decision.posture_assignments ?? {};
                let hold = 0;
                let probe = 0;
                let push = 0;
                for (const posture of Object.values(postureAssignments)) {
                    if (posture === 'push') push += 1;
                    else if (posture === 'probe') probe += 1;
                    else hold += 1;
                }
                const formation_reassignments = Object.keys(decision.formation_assignments ?? {}).length;
                return {
                    bot_id: bot.id,
                    faction: bot.factionId,
                    posture_counts: { hold, probe, push },
                    formation_reassignments
                };
            })
            .sort((a, b) => a.bot_id.localeCompare(b.bot_id));
        this.applyDecisions(state, allDecisions);
        const total_reassignments = by_bot.reduce((sum, item) => sum + item.formation_reassignments, 0);
        return { by_bot, total_reassignments };
    }

    private applyDecisions(state: GameState, decisionsList: { bot: SimpleGeneralBot; decision: BotDecisions }[]) {
        if (!state.front_posture) state.front_posture = {};

        for (const { bot, decision } of decisionsList) {
            // Apply Posture
            if (decision.posture_assignments) {
                if (!state.front_posture[bot.factionId]) {
                    state.front_posture[bot.factionId] = { assignments: {} };
                }
                const assignments = state.front_posture[bot.factionId].assignments;
                for (const [edgeId, posture] of Object.entries(decision.posture_assignments).sort(([a], [b]) => a.localeCompare(b))) {
                    assignments[edgeId] = {
                        edge_id: edgeId,
                        posture: posture,
                        weight: 1
                    };
                }
            }

            // Apply Formation Moves
            if (decision.formation_assignments && state.formations) {
                for (const [formationId, edgeId] of Object.entries(decision.formation_assignments).sort(([a], [b]) => a.localeCompare(b))) {
                    const formation = state.formations[formationId];
                    // Security check: only move own formations
                    if (formation && formation.faction === bot.factionId) {
                        formation.assignment = {
                            kind: 'edge',
                            edge_id: edgeId
                        };
                    }
                }
            }
        }
    }
}

function createRng(seed: string): () => number {
    let a = hashSeed(seed);
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashSeed(seed: string): number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i += 1) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return (h ^ (h >>> 16)) >>> 0;
}

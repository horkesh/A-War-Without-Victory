/**
 * Post-game analysis generator — AI historian analyzes the completed war.
 *
 * COSMETIC ONLY — never affects gameplay or scoring.
 * Requires API key. Gracefully returns null without one.
 * Result cached in state.military.postgame_analysis.
 */

import type { GameState, FactionId } from '../../state/game_state.js';

export interface PostGameAnalysis {
    strategic_assessment: string;
    turning_points: string;
    historical_comparison: string;
    pyrrhic_verdict: string;
    generated_turn: number;
}

/**
 * Generate a post-game analysis using AI.
 * Returns null if no API key or generation fails.
 * Cached — only generates once per game completion.
 */
export async function generatePostGameAnalysis(
    _state: GameState,
    _playerFaction: FactionId,
): Promise<PostGameAnalysis | null> {
    // Check if already cached
    const existing = (_state.military as any)?.postgame_analysis;
    if (existing) return existing as PostGameAnalysis;

    // API call would go here — requires ai_client.ts with valid API key
    // For now, return null (UI shows "Enable AI Commander for analysis")
    return null;
}

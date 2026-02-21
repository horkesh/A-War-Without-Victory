import type { GameState } from '../state/game_state.js';
import type { FactionVictoryCondition, ScenarioVictoryConditions } from './scenario_types.js';

export interface FactionVictoryEvaluation {
    faction: string;
    passed: boolean;
    checks: {
        controlled_settlements?: { actual: number; required: number; passed: boolean };
        exhaustion?: { actual: number; max: number; passed: boolean };
        required_settlements_all?: { missing: string[]; passed: boolean };
    };
}

export interface VictoryEvaluation {
    result: 'winner' | 'co_winners' | 'no_winner';
    winner: string | null;
    co_winners: string[];
    by_faction: FactionVictoryEvaluation[];
}

function evaluateFactionCondition(
    faction: string,
    condition: FactionVictoryCondition,
    controlledCount: number,
    exhaustion: number,
    controllers: Record<string, string | null>
): FactionVictoryEvaluation {
    const checks: FactionVictoryEvaluation['checks'] = {};
    let passed = true;
    if (condition.min_controlled_settlements !== undefined) {
        const ok = controlledCount >= condition.min_controlled_settlements;
        checks.controlled_settlements = {
            actual: controlledCount,
            required: condition.min_controlled_settlements,
            passed: ok
        };
        passed = passed && ok;
    }
    if (condition.max_exhaustion !== undefined) {
        const ok = exhaustion <= condition.max_exhaustion;
        checks.exhaustion = {
            actual: exhaustion,
            max: condition.max_exhaustion,
            passed: ok
        };
        passed = passed && ok;
    }
    if (condition.required_settlements_all && condition.required_settlements_all.length > 0) {
        const missing = condition.required_settlements_all
            .filter((sid) => (controllers[sid] ?? null) !== faction)
            .sort((a, b) => a.localeCompare(b));
        const ok = missing.length === 0;
        checks.required_settlements_all = { missing, passed: ok };
        passed = passed && ok;
    }
    return { faction, passed, checks };
}

export function evaluateVictoryConditions(
    state: GameState,
    victoryConditions: ScenarioVictoryConditions | undefined
): VictoryEvaluation | null {
    if (!victoryConditions?.by_faction) return null;
    const controllers = state.political_controllers ?? {};
    const byFactionCount = new Map<string, number>();
    for (const controller of Object.values(controllers)) {
        if (!controller) continue;
        byFactionCount.set(controller, (byFactionCount.get(controller) ?? 0) + 1);
    }
    const factionExhaustion = new Map(
        (state.factions ?? []).map((f) => [f.id, f.profile.exhaustion ?? 0] as const)
    );
    const evaluations = Object.keys(victoryConditions.by_faction)
        .sort((a, b) => a.localeCompare(b))
        .map((faction) =>
            evaluateFactionCondition(
                faction,
                victoryConditions.by_faction[faction]!,
                byFactionCount.get(faction) ?? 0,
                factionExhaustion.get(faction) ?? 0,
                controllers
            )
        );
    const winners = evaluations.filter((e) => e.passed).map((e) => e.faction).sort((a, b) => a.localeCompare(b));
    if (winners.length === 0) {
        return { result: 'no_winner', winner: null, co_winners: [], by_faction: evaluations };
    }
    if (winners.length === 1) {
        return { result: 'winner', winner: winners[0]!, co_winners: [], by_faction: evaluations };
    }
    return { result: 'co_winners', winner: null, co_winners: winners, by_faction: evaluations };
}

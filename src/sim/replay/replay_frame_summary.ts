import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export interface ReplayControlSummary {
    faction: string;
    osids: number;
}

export interface ReplayFrameSummary {
    turn: number | null;
    date: string | null;
    activeFormations: number;
    totalCasualties: number;
    totalDisplaced: number;
    controlByFaction: ReplayControlSummary[];
}

type ReplayFrameLike = GameState & {
    turn?: number;
    metadata?: { turn?: number; date?: string };
    meta?: { turn?: number };
};

function readTurn(frame: ReplayFrameLike): number | null {
    if (typeof frame.turn === 'number') return frame.turn;
    if (typeof frame.metadata?.turn === 'number') return frame.metadata.turn;
    if (typeof frame.meta?.turn === 'number') return frame.meta.turn;
    return null;
}

function readDate(frame: ReplayFrameLike): string | null {
    const date = frame.metadata?.date;
    return typeof date === 'string' && date.length > 0 ? date : null;
}

function sumNumbers(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) {
        return value.reduce((sum, item) => sum + sumNumbers(item), 0);
    }
    if (value && typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>)
            .sort(strictCompare)
            .reduce((sum, key) => sum + sumNumbers((value as Record<string, unknown>)[key]), 0);
    }
    return 0;
}

function readTotalCasualties(frame: ReplayFrameLike): number {
    const military = frame.military as unknown as Record<string, unknown> | undefined;
    return sumNumbers(
        military?.casualty_totals_by_faction
        ?? military?.casualties_by_faction
        ?? military?.casualties
        ?? null,
    );
}

function readTotalDisplaced(frame: ReplayFrameLike): number {
    const displacement = frame.displacement as unknown as Record<string, unknown> | undefined;
    const aggregate = displacement?.displacement_humanitarian_aggregates as Record<string, unknown> | undefined;
    const direct = aggregate?.total_displaced ?? displacement?.total_displaced;
    return typeof direct === 'number' && Number.isFinite(direct) ? direct : 0;
}

function readActiveFormations(frame: ReplayFrameLike): number {
    const formations = frame.military?.formations ?? {};
    let active = 0;
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[id] as { status?: string } | undefined;
        if (formation?.status === 'active') active++;
    }
    return active;
}

function readControlByFaction(frame: ReplayFrameLike): ReplayControlSummary[] {
    const controllers = frame.political?.political_controllers ?? {};
    const counts = new Map<string, number>();
    for (const osid of Object.keys(controllers).sort(strictCompare)) {
        const faction = controllers[osid];
        if (typeof faction !== 'string' || faction.length === 0) continue;
        counts.set(faction, (counts.get(faction) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => strictCompare(a[0], b[0]))
        .map(([faction, osids]) => ({ faction, osids }));
}

export function buildReplayFrameSummary(frame: GameState | null | undefined): ReplayFrameSummary {
    if (!frame) {
        return {
            turn: null,
            date: null,
            activeFormations: 0,
            totalCasualties: 0,
            totalDisplaced: 0,
            controlByFaction: [],
        };
    }

    const replayFrame = frame as ReplayFrameLike;
    return {
        turn: readTurn(replayFrame),
        date: readDate(replayFrame),
        activeFormations: readActiveFormations(replayFrame),
        totalCasualties: readTotalCasualties(replayFrame),
        totalDisplaced: readTotalDisplaced(replayFrame),
        controlByFaction: readControlByFaction(replayFrame),
    };
}

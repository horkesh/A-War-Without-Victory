import { CANONICAL_FACTIONS, type GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { asRecord } from '../../state/schema_validators.js';

// BATCH C §3.10: replay frames are diagnostic-only. `military` and
// `displacement` sub-objects are read through `asRecord` so a malformed frame
// (a non-object sub-object) cannot throw downstream. Replay summaries never feed
// back into sim state.
function parseReplayFrameSubobject(value: unknown): Record<string, unknown> | undefined {
    if (value === undefined) return undefined;
    return asRecord(value) ?? undefined;
}

export interface ReplayControlSummary {
    faction: string;
    osids: number;
}

export interface ReplayFrameSummary {
    turn: number | null;
    date: string | null;
    activeFormations: number;
    /**
     * Military casualties so far, all sides: killed + wounded + missing/captured
     * from `military.casualty_ledger`, the ledger the Verdict cost ledger and the
     * war-dead totals read. `null` when the frame carries no readable record: a
     * figure the engine did not record is hidden, never shown as 0
     * (SENSITIVE_HISTORY_DESIGN_GATE §4, "False zero").
     */
    totalCasualties: number | null;
    /**
     * People displaced or killed so far, all sides: the sum of `refugees_created`
     * over `displacement.displacement_humanitarian_aggregates`. Each displacement
     * event adds displaced + killed + fled abroad, so the figure INCLUDES THE
     * KILLED and its label must say so (§4: "Displaced or killed"). It is the
     * measure behind the Humanitarian Ledger's "Displaced or killed, by people"
     * table and the Verdict cost ledger's displacement record. `null` when the
     * frame carries no aggregates record.
     */
    totalDisplacedOrKilled: number | null;
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

function nonNegativeCount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Military casualties from `military.casualty_ledger`: per side, killed +
 * wounded + missing/captured, summed in sorted side order.
 *
 * The engine creates the ledger on its first casualty write
 * (`initializeCasualtyLedger` in battle_resolution, attack_resolution_osid,
 * frontline_attrition, siege_attrition), with a row for every side, so a
 * `military` record without a ledger means no casualty has been recorded yet:
 * a true 0. `null` when the frame has no `military` record, the ledger is not an
 * object, or the ledger lacks a canonical side. The last case is the
 * player-visible projection (`src/desktop/player_visible_state.cjs` scopes the
 * ledger to the player's side): a one-side sum under an all-sides label would
 * understate the war, so it is hidden instead.
 */
function readTotalCasualties(frame: ReplayFrameLike): number | null {
    const military = parseReplayFrameSubobject(frame.military);
    if (!military) return null;
    if (military.casualty_ledger === undefined) return 0;
    const ledger = parseReplayFrameSubobject(military.casualty_ledger);
    if (!ledger) return null;
    if (!CANONICAL_FACTIONS.every((faction) => asRecord(ledger[faction]) !== null)) return null;
    let total = 0;
    for (const faction of Object.keys(ledger).sort(strictCompare)) {
        const row = asRecord(ledger[faction]);
        if (!row) continue;
        total += nonNegativeCount(row.killed)
            + nonNegativeCount(row.wounded)
            + nonNegativeCount(row.missing_captured);
    }
    return total;
}

/**
 * Displaced or killed from `displacement.displacement_humanitarian_aggregates`:
 * the sum of `refugees_created` over every caused-by key and every people key,
 * in sorted order. `null` when the frame carries no aggregates record.
 */
function readTotalDisplacedOrKilled(frame: ReplayFrameLike): number | null {
    const displacement = parseReplayFrameSubobject(frame.displacement);
    const aggregates = parseReplayFrameSubobject(displacement?.displacement_humanitarian_aggregates);
    if (!aggregates) return null;
    let total = 0;
    for (const causer of Object.keys(aggregates).sort(strictCompare)) {
        const byPeople = asRecord(aggregates[causer]);
        if (!byPeople) continue;
        for (const people of Object.keys(byPeople).sort(strictCompare)) {
            total += nonNegativeCount(asRecord(byPeople[people])?.refugees_created);
        }
    }
    return total;
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
            totalCasualties: null,
            totalDisplacedOrKilled: null,
            controlByFaction: [],
        };
    }

    const replayFrame = frame as ReplayFrameLike;
    return {
        turn: readTurn(replayFrame),
        date: readDate(replayFrame),
        activeFormations: readActiveFormations(replayFrame),
        totalCasualties: readTotalCasualties(replayFrame),
        totalDisplacedOrKilled: readTotalDisplacedOrKilled(replayFrame),
        controlByFaction: readControlByFaction(replayFrame),
    };
}

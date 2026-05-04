/**
 * LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER
 *
 * Tests for the read-only replay playback consumer.
 *
 * Lane requirements (T1–T6):
 *   T1: deterministic playback (same sequence → same output)
 *   T2: seek-to-turn out-of-bounds clamps gracefully
 *   T3: faction-agnostic (works for all 3 factions)
 *   T4: read-only (does not mutate input GameState)
 *   T5: getMetadata returns turn count + first-turn-date + last-turn-date
 *   T6: handles empty sequence (returns null/empty player)
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { replayPlayer } from '../src/sim/replay/replay_player.js';

// Build a minimal GameState-shaped frame for replay testing. We are exercising
// only the shape that ReplayPlayer reads — turn / metadata.date — so the rest
// of the GameState surface is intentionally cast through unknown.
function makeFrame(turn: number, date: string, faction: string = 'RBiH'): GameState {
    return ({
        schema_version: 2,
        meta: { turn, seed: `seed-${faction}-${turn}` },
        turn,
        metadata: { turn, date },
        // Faction-agnostic marker — included so we can verify the player does
        // not key off any faction-specific field.
        player_faction: faction,
        factions: [],
        military: {},
        political: {},
        displacement: {},
    } as unknown) as GameState;
}

function makeSequence(count: number, faction: string = 'RBiH'): GameState[] {
    const frames: GameState[] = [];
    for (let i = 0; i < count; i++) {
        // Deterministic ISO-like date string. No Date.now anywhere.
        const week = i % 52;
        const year = 1992 + Math.floor(i / 52);
        const date = `${year}-W${String(week + 1).padStart(2, '0')}`;
        frames.push(makeFrame(i, date, faction));
    }
    return frames;
}

describe('replayPlayer (LANE-NIGHTSHIFT-REPLAY-PLAYBACK-CONSUMER)', () => {
    it('T1: deterministic playback — same sequence yields same output across two players', () => {
        const seq = makeSequence(8);
        const a = replayPlayer(seq);
        const b = replayPlayer(seq);

        // Sweep both players in identical sequences, capturing observable state.
        const trace = (p: ReturnType<typeof replayPlayer>) => {
            const out: Array<{ idx: number; turn: number | null; date: string | null }> = [];
            for (let i = 0; i < p.getTurnCount(); i++) {
                p.seekToTurn(i);
                const cur = p.getCurrent() as { turn?: number; metadata?: { date?: string } } | null;
                out.push({
                    idx: p.getCurrentIndex(),
                    turn: cur?.turn ?? null,
                    date: cur?.metadata?.date ?? null,
                });
            }
            return out;
        };

        expect(trace(a)).toEqual(trace(b));
        expect(a.getTurnCount()).toBe(8);
        expect(b.getTurnCount()).toBe(8);
        // Spot-check a deterministic field.
        expect((a.getTurn(3) as { metadata?: { date?: string } } | null)?.metadata?.date)
            .toBe('1992-W04');
    });

    it('T2: seek-to-turn out-of-bounds clamps gracefully', () => {
        const seq = makeSequence(5);
        const p = replayPlayer(seq);

        // Negative → clamped to 0.
        expect(p.seekToTurn(-100)).toBe(0);
        expect(p.getCurrentIndex()).toBe(0);

        // Beyond end → clamped to last index.
        expect(p.seekToTurn(999)).toBe(4);
        expect(p.getCurrentIndex()).toBe(4);

        // NaN → defaults to 0 (not -1, not crash).
        expect(p.seekToTurn(Number.NaN)).toBe(0);

        // Infinity → clamped to last index.
        expect(p.seekToTurn(Number.POSITIVE_INFINITY)).toBe(4);

        // getTurn out-of-bounds returns null without throwing.
        expect(p.getTurn(-1)).toBeNull();
        expect(p.getTurn(5)).toBeNull();
        expect(p.getTurn(999)).toBeNull();
        expect(p.getTurn(Number.NaN)).toBeNull();
    });

    it('T3: faction-agnostic — works identically for RBiH, RS, HRHB', () => {
        const factions = ['RBiH', 'RS', 'HRHB'] as const;
        const counts: number[] = [];
        const firstDates: Array<string | null> = [];
        const lastDates: Array<string | null> = [];

        for (const faction of factions) {
            const p = replayPlayer(makeSequence(6, faction));
            counts.push(p.getTurnCount());
            const meta = p.getMetadata();
            firstDates.push(meta.firstTurnDate);
            lastDates.push(meta.lastTurnDate);

            // Mid-seek must land on the same logical index regardless of faction.
            p.seekToTurn(3);
            expect(p.getCurrentIndex()).toBe(3);
            const cur = p.getCurrent() as { player_faction?: string; turn?: number } | null;
            expect(cur?.turn).toBe(3);
            // The faction marker is preserved (proving the player doesn't strip
            // or remap fields), but the player itself is faction-agnostic.
            expect(cur?.player_faction).toBe(faction);
        }

        // Identical structural behaviour across all three factions.
        expect(counts).toEqual([6, 6, 6]);
        expect(firstDates).toEqual(['1992-W01', '1992-W01', '1992-W01']);
        expect(lastDates).toEqual(['1992-W06', '1992-W06', '1992-W06']);
    });

    it('T4: read-only — does not mutate input GameState frames', () => {
        const seq = makeSequence(4);
        // Snapshot canonical JSON before any player operation.
        const before = JSON.stringify(seq);

        const p = replayPlayer(seq);
        // Exercise every public method that could conceivably mutate.
        p.getTurnCount();
        p.getMetadata();
        p.getCurrent();
        p.getCurrentIndex();
        p.getTurn(0);
        p.getTurn(2);
        p.getTurn(99);
        p.seekToTurn(2);
        p.seekToTurn(-5);
        p.seekToTurn(99);

        const after = JSON.stringify(seq);
        expect(after).toBe(before);

        // Sequence reference identity preserved — and frame references too.
        expect(p.getTurn(0)).toBe(seq[0]);
        expect(p.getTurn(2)).toBe(seq[2]);
    });

    it('T5: getMetadata returns turn count + first-turn-date + last-turn-date', () => {
        const seq = makeSequence(10);
        const p = replayPlayer(seq);
        const meta = p.getMetadata();

        expect(meta.turnCount).toBe(10);
        expect(meta.firstTurnDate).toBe('1992-W01');
        expect(meta.lastTurnDate).toBe('1992-W10');
        expect(meta.firstTurn).toBe(0);
        expect(meta.lastTurn).toBe(9);
    });

    it('T6: handles empty sequence — returns empty player', () => {
        const p = replayPlayer([]);

        expect(p.getTurnCount()).toBe(0);
        expect(p.getCurrentIndex()).toBe(-1);
        expect(p.getCurrent()).toBeNull();
        expect(p.getTurn(0)).toBeNull();
        expect(p.getTurn(-1)).toBeNull();
        expect(p.seekToTurn(0)).toBe(-1);
        expect(p.seekToTurn(5)).toBe(-1);

        const meta = p.getMetadata();
        expect(meta.turnCount).toBe(0);
        expect(meta.firstTurnDate).toBeNull();
        expect(meta.lastTurnDate).toBeNull();
        expect(meta.firstTurn).toBeNull();
        expect(meta.lastTurn).toBeNull();

        // Defensive: null/undefined input also yields a clean empty player,
        // not a crash. (UI-tolerant contract.)
        const pn = replayPlayer(null as unknown as readonly GameState[]);
        expect(pn.getTurnCount()).toBe(0);
        expect(pn.getCurrent()).toBeNull();
    });
});

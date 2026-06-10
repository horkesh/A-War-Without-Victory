// @vitest-environment jsdom
/**
 * TIER1-REPLAY-LIVE: VerdictScreen Replay tab visibility with a live-play manifest.
 *
 * Complements endgame_verdict_screen_mount.test.ts which covers:
 *   - no manifest → Replay tab hidden
 *   - single-frame sparse manifest → Replay tab visible
 *
 * This test covers the multi-frame live-play manifest case — the shape produced
 * by the advance-turn accumulator after a real campaign played start→Dayton in
 * the Electron app.
 *
 * Proof classification: DIRECT LIVE-HOOK MOUNT PROOF
 * Real VerdictScreen, real React hooks, store selector replaced with test state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types';

// ── Test-controlled store state ──────────────────────────────────────────────

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (s: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

vi.mock('../../src/ui/map/desktop/useIPC', () => ({
    useIPC: () => ({ isAvailable: false }),
}));

// @ts-expect-error TS1378: top-level await — vitest provides ESM runtime
const { VerdictScreen } = await import('../../src/ui/map/components/VerdictScreen');

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeFV(faction: string): FactionVerdict {
    return {
        faction,
        pyrrhic_score: 50,
        grade: 'C',
        grade_description: 'Acceptable compromise',
        capital_breakdown: {
            territory_controlled_pct: 30, territory_controlled_km2: 15000,
            military_casualties_inflicted: 20000, military_casualties_taken: 40000,
            operations_launched: 50, operations_successful: 15,
            refugees_created: 500000, refugees_received: 80000,
            civilians_under_protection: 150000, civilian_casualties_caused: 3000,
            peace_plans_accepted: [], peace_plans_rejected: [],
            enclaves_held: [], enclaves_lost: [],
            war_crimes_events: 0, combat_effective_brigades: 20,
        } as any,
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 50, grade: 'C' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 50, grade: 'C' },
            { dimension: 'international_standing', label: 'International Standing', score: 50, grade: 'C' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 50, grade: 'C' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 50, grade: 'C' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 50, grade: 'C' },
        ],
        outcome_class: 'negotiated_escape' as any,
        condemnation_flags: [],
    };
}

/** Build a LoadedGameState that looks like a completed live-play campaign. */
function livePlayEndgame(replaySaveManifest?: LoadedGameState['replaySaveManifest']): LoadedGameState {
    return {
        label: 'live-proof',
        turn: 188,
        phase: 'war',
        metadata: { turn: 188, date: '1995-10-01' },
        formations: [],
        militiaPools: [],
        controlBySettlement: { 'op:banja_luka:centar': 'RS' },
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        gameOver: true,
        gameOutcome: 'timeout_stalemate',
        gameVerdict: {
            outcome_type: 'termination',
            outcome_label: 'Stalemate — Exhaustion',
            turn: 188,
            date: '1995-10-01',
            duration_weeks: 188,
            faction_verdicts: {
                RBiH: makeFV('RBiH'),
                RS: makeFV('RS'),
                HRHB: makeFV('HRHB'),
            },
        } as GameVerdict,
        replaySaveManifest,
        // VerdictScreen reads only the fields set above; the remaining required
        // LoadedGameState fields (turnSummaries, latestTurnSummary, pressureWarning)
        // are not exercised by the Replay-tab gate, so cast through `unknown`.
    } as unknown as LoadedGameState;
}

/** Sparse frame shape matching ReplayFrameSummary. */
function makeFrame(turn: number, date: string) {
    return {
        turn,
        date,
        activeFormations: 35,
        totalCasualties: turn * 500,
        totalDisplaced: turn * 5000,
        controlByFaction: [
            { faction: 'RS', osids: 420 },
            { faction: 'RBiH', osids: 250 },
            { faction: 'HRHB', osids: 42 },
        ],
    };
}

function render(): string {
    return renderToStaticMarkup(createElement(VerdictScreen));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VerdictScreen Replay tab — live-play multi-frame manifest', () => {
    beforeEach(() => { storeState = { loadedGameState: null }; });

    it('Replay tab is visible when a multi-frame live manifest is present', () => {
        storeState = {
            loadedGameState: livePlayEndgame({
                schema_version: 1,
                frame_count: 3,
                frames: [
                    makeFrame(1, '1992-04-06'),
                    makeFrame(94, '1993-10-17'),
                    makeFrame(188, '1995-10-01'),
                ],
            }),
        };
        const html = render();
        expect(html).toContain('Replay');
    });

    it('Replay tab shows frame data from the first frame (scrubber starts at index 0)', () => {
        storeState = {
            loadedGameState: livePlayEndgame({
                schema_version: 1,
                frame_count: 3,
                frames: [
                    makeFrame(1, '1992-04-06'),
                    makeFrame(94, '1993-10-17'),
                    makeFrame(188, '1995-10-01'),
                ],
            }),
        };
        const html = render();
        // The scrubber initialises at index 0 (frame 1). makeFrame(1,...) has
        // totalCasualties = 1 * 500 = 500.
        expect(html).toContain('500');
        // The date of the first frame is also present.
        expect(html).toContain('1992-04-06');
    });

    it('Replay tab is NOT visible when manifest is absent (live session not yet started)', () => {
        storeState = { loadedGameState: livePlayEndgame(undefined) };
        const html = render();
        // The verdict itself should render (gameOver = true), but with no replay tab
        expect(html.length).toBeGreaterThan(100);
        // "Replay" text may appear in other contexts; check for the specific
        // data attribute or the Active formations label that only renders in the scrubber
        expect(html).not.toContain('Active formations');
    });

    it('Replay tab is NOT visible when frame_count is 0', () => {
        storeState = {
            loadedGameState: livePlayEndgame({
                schema_version: 1,
                frame_count: 0,
                frames: [],
            }),
        };
        const html = render();
        expect(html).not.toContain('Active formations');
    });

    it('controlByFaction values from frames are surfaced in the replay scrubber', () => {
        storeState = {
            loadedGameState: livePlayEndgame({
                schema_version: 1,
                frame_count: 1,
                frames: [makeFrame(188, '1995-10-01')],
            }),
        };
        const html = render();
        // The scrubber renders faction:osids in format "RS:420"
        expect(html).toContain('RS:420');
    });
});

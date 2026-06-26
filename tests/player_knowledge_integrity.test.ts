/**
 * Player-knowledge integrity: verifies that the adapter filters enemy-truth
 * families (casualtyLedger, factionReserves, warPhaseSupplyPressure,
 * warPhaseExhaustion) to the player faction only when player_faction is set,
 * and passes all factions through in observer mode.
 *
 * Wave 2 additions: generateThreatAssessment uses uncertainty language (not raw
 * engine enum strings), and confidence is bucketed (not an exact percentage).
 */
import { describe, expect, it } from 'vitest';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { generateThreatAssessment } from '../src/ui/map/components/army_hq/generateThreatAssessment.js';

function buildMinimalState(playerFaction: string | null) {
    return {
        meta: { turn: 10, phase: 'war', ...(playerFaction ? { player_faction: playerFaction } : {}) },
        military: {
            formations: {},
            casualty_ledger: {
                RBiH: { killed: 100, wounded: 200, missing_captured: 10 },
                RS:   { killed: 300, wounded: 400, missing_captured: 20 },
                HRHB: { killed: 50,  wounded: 60,  missing_captured: 5 },
            },
            general_supply_reserve: { RBiH: 500, RS: 800, HRHB: 300 },
            heavy_munitions_reserve: { RBiH: 100, RS: 200, HRHB: 50 },
        } as any,
        political: {
            political_controllers: {},
            war_supply_pressure: { RBiH: 70, RS: 90, HRHB: 40 },
            war_exhaustion: { RBiH: 120, RS: 250, HRHB: 80 },
        } as any,
    };
}

describe('player-knowledge integrity — adapter-level filtering', () => {
    it('scopes casualtyLedger to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.casualtyLedger).toBeDefined();
        expect(Object.keys(parsed.casualtyLedger!)).toEqual(['RBiH']);
        expect(parsed.casualtyLedger!['RBiH'].killed).toBe(100);
        expect(parsed.casualtyLedger!['RS']).toBeUndefined();
        expect(parsed.casualtyLedger!['HRHB']).toBeUndefined();
    });

    it('scopes factionReserves to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.factionReserves).toBeDefined();
        expect(Object.keys(parsed.factionReserves!)).toEqual(['RBiH']);
        expect(parsed.factionReserves!['RBiH'].generalSupply).toBe(500);
        expect(parsed.factionReserves!['RS']).toBeUndefined();
    });

    it('preserves missing heavy-munitions reserve as unreported instead of zero', () => {
        const state = buildMinimalState('RBiH');
        delete state.military.heavy_munitions_reserve;

        const parsed = parseGameState(state);

        expect(parsed.factionReserves).toBeDefined();
        expect(parsed.factionReserves!['RBiH'].generalSupply).toBe(500);
        expect(parsed.factionReserves!['RBiH'].heavyMunitions).toBeUndefined();
    });

    it('scopes warPhaseSupplyPressure to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.warPhaseSupplyPressure).toBeDefined();
        expect(Object.keys(parsed.warPhaseSupplyPressure!)).toEqual(['RBiH']);
        expect(parsed.warPhaseSupplyPressure!['RBiH']).toBe(70);
        expect(parsed.warPhaseSupplyPressure!['RS']).toBeUndefined();
    });

    it('scopes warPhaseExhaustion to player faction only', () => {
        const parsed = parseGameState(buildMinimalState('RBiH'));
        expect(parsed.warPhaseExhaustion).toBeDefined();
        expect(Object.keys(parsed.warPhaseExhaustion!)).toEqual(['RBiH']);
        expect(parsed.warPhaseExhaustion!['RBiH']).toBe(120);
        expect(parsed.warPhaseExhaustion!['RS']).toBeUndefined();
    });

    it('works for RS player faction', () => {
        const parsed = parseGameState(buildMinimalState('RS'));
        expect(Object.keys(parsed.casualtyLedger!)).toEqual(['RS']);
        expect(Object.keys(parsed.factionReserves!)).toEqual(['RS']);
        expect(Object.keys(parsed.warPhaseSupplyPressure!)).toEqual(['RS']);
        expect(Object.keys(parsed.warPhaseExhaustion!)).toEqual(['RS']);
    });

    it('strips enemy-truth families when player_faction is absent (2026-05-18 contract; no observer mode)', () => {
        // Per docs/40_reports/implemented/20260518_player_faction_contract_and_codex_visibility.md
        // loaded gameplay state requires meta.player_faction. When the adapter is fed a
        // raw state with no player_faction (legacy/dev fallback paths), the scope helper
        // returns undefined for enemy-truth families rather than leaking RS/HRHB truth.
        const parsed = parseGameState(buildMinimalState(null));
        if (parsed.player_faction == null) {
            expect(parsed.casualtyLedger).toBeUndefined();
            expect(parsed.factionReserves).toBeUndefined();
            expect(parsed.warPhaseSupplyPressure).toBeUndefined();
            expect(parsed.warPhaseExhaustion).toBeUndefined();
        } else {
            // Dev fallback resolved a faction — verify scoping is consistent
            expect(Object.keys(parsed.casualtyLedger ?? {})).toHaveLength(1);
            expect(Object.keys(parsed.factionReserves ?? {})).toHaveLength(1);
            expect(Object.keys(parsed.warPhaseSupplyPressure ?? {})).toHaveLength(1);
            expect(Object.keys(parsed.warPhaseExhaustion ?? {})).toHaveLength(1);
        }
    });
});

// ─── Wave 2: generateThreatAssessment uncertainty language ───────────────────

function buildMinimalStateForThreat() {
    return {
        corpsFrontSectors: [
            { sector_id: 'sec-1', corps_id: 'corps-1', faction: 'RBiH' },
        ],
        formations: [{ id: 'corps-1', name: '2nd Corps', faction: 'RBiH' }],
        sectorIntel: [] as unknown[],
    } as any;
}

describe('player-knowledge integrity wave 2 — generateThreatAssessment', () => {
    it('does not emit raw engine enum strings (DENSE, FORTRESS, THIN, MODERATE)', () => {
        const state = buildMinimalStateForThreat();
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'DENSE', confidence: 0.9 },
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'FORTRESS', confidence: 0.85 },
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'THIN', confidence: 0.7 },
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'MODERATE', confidence: 0.6 },
        ];
        const items = generateThreatAssessment(state, 'RBiH');
        const allText = items.map((i) => i.detail + i.title).join(' ');
        // Raw engine enum values must not appear in player-facing text
        expect(allText).not.toMatch(/\bDENSE\b/);
        expect(allText).not.toMatch(/\bFORTRESS\b/);
        expect(allText).not.toMatch(/\bTHIN\b/);
        expect(allText).not.toMatch(/\bMODERATE\b/);
    });

    it('uses uncertainty-qualified language for known strength categories', () => {
        const state = buildMinimalStateForThreat();
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'dense', confidence: 0.75 },
        ];
        const items = generateThreatAssessment(state, 'RBiH');
        expect(items).toHaveLength(1);
        // Must contain a qualifying word indicating staff estimate, not engine truth
        expect(items[0].detail).toMatch(/estimated|assessed/i);
    });

    it('uses uncertainty-qualified language for fortress category', () => {
        const state = buildMinimalStateForThreat();
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'fortress', confidence: 0.9 },
        ];
        const items = generateThreatAssessment(state, 'RBiH');
        expect(items[0].detail).toMatch(/assessed|estimated/i);
    });

    it('does not emit exact confidence percentages (e.g. "73%")', () => {
        const state = buildMinimalStateForThreat();
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'moderate', confidence: 0.73 },
        ];
        const items = generateThreatAssessment(state, 'RBiH');
        const allText = items.map((i) => i.detail).join(' ');
        // No exact percentage should appear in player-facing detail text
        expect(allText).not.toMatch(/\d+%/);
    });

    it('emits a bucketed confidence label instead of a number', () => {
        const state = buildMinimalStateForThreat();
        // High confidence (>=0.8)
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'dense', confidence: 0.85 },
        ];
        const highItems = generateThreatAssessment(state, 'RBiH');
        expect(highItems[0].detail).toMatch(/High confidence/i);

        // Moderate confidence (0.5–0.8)
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'dense', confidence: 0.6 },
        ];
        const modItems = generateThreatAssessment(state, 'RBiH');
        expect(modItems[0].detail).toMatch(/Moderate confidence/i);

        // Low confidence (<0.5)
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'dense', confidence: 0.35 },
        ];
        const lowItems = generateThreatAssessment(state, 'RBiH');
        expect(lowItems[0].detail).toMatch(/Low confidence/i);
    });

    it('handles unknown strength_category gracefully without raw enum leak', () => {
        const state = buildMinimalStateForThreat();
        state.sectorIntel = [
            { friendly_sector_id: 'sec-1', offensive_signs: true, strength_category: 'UNKNOWN_FUTURE_VALUE', confidence: 0.6 },
        ];
        const items = generateThreatAssessment(state, 'RBiH');
        // Fallback text must still use uncertainty language
        expect(items[0].detail).toMatch(/estimated|assessed|unknown/i);
        // And must not echo the raw enum value back to the player
        expect(items[0].detail).not.toContain('UNKNOWN_FUTURE_VALUE');
    });
});

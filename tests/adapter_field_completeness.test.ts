/**
 * Adapter field completeness test — v0.6.5 integration test.
 *
 * Loads a real final_save.json and verifies that GameStateAdapter.parseGameState()
 * extracts all critical fields without undefined/null where values are expected.
 * Protects against the "silent UI killer": wrong nested path in the 2,409-line adapter
 * silently returns undefined, killing entire display chains.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

const SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');

// Skip all tests if no save file available (CI without scenario run)
const hasSave = existsSync(SAVE_PATH);

describe.skipIf(!hasSave)('GameStateAdapter field completeness', () => {
    const raw = hasSave ? JSON.parse(readFileSync(SAVE_PATH, 'utf8')) : null;
    const parsed = raw ? parseGameState(raw) : null as any;

    // ── Meta fields ──────────────────────────────────────────────────
    it('extracts turn, phase, label', () => {
        expect(parsed.turn).toBeGreaterThanOrEqual(0);
        expect(parsed.phase).toBe('war');
        expect(parsed.label).toContain('Turn');
    });

    // ── Formations ───────────────────────────────────────────────────
    it('extracts formations with required fields', () => {
        expect(parsed.formations.length).toBeGreaterThan(100);
        const sample = parsed.formations[0];
        expect(sample.id).toBeDefined();
        expect(sample.faction).toBeDefined();
        expect(sample.name).toBeDefined();
        expect(typeof sample.personnel).toBe('number');
        expect(typeof sample.cohesion).toBe('number');
    });

    it('formations have location_osid (war phase)', () => {
        const withLocation = parsed.formations.filter((f: any) =>
            f.status === 'active' && f.kind === 'brigade' && f.location_osid
        );
        expect(withLocation.length).toBeGreaterThan(50);
    });

    it('formations have corps assignment', () => {
        const withCorps = parsed.formations.filter((f: any) =>
            f.status === 'active' && f.kind === 'brigade' && f.corps_id
        );
        expect(withCorps.length).toBeGreaterThan(50);
    });

    // ── Political controllers ────────────────────────────────────────
    it('extracts political controllers (controlBySettlement)', () => {
        expect(Object.keys(parsed.controlBySettlement).length).toBeGreaterThan(600);
    });

    // ── Control events ───────────────────────────────────────────────
    it('extracts all control events', () => {
        expect(parsed.allControlEvents.length).toBeGreaterThan(0);
        const first = parsed.allControlEvents[0];
        expect(first.turn).toBeDefined();
        expect(first.settlementId).toBeDefined();
    });

    // ── Militia pools ────────────────────────────────────────────────
    it('extracts militia pools', () => {
        expect(parsed.militiaPools.length).toBeGreaterThan(50);
        const sample = parsed.militiaPools[0];
        expect(sample.munId).toBeDefined();
        expect(typeof sample.available).toBe('number');
    });

    // ── Corps front sectors ──────────────────────────────────────────
    it('extracts corps front sectors', () => {
        expect(parsed.corpsFrontSectors!.length).toBeGreaterThan(10);
        const sample = parsed.corpsFrontSectors![0];
        expect(sample.sector_id).toBeDefined();
        expect(sample.corps_id).toBeDefined();
        expect(sample.faction).toBeDefined();
    });

    // ── Operations ───────────────────────────────────────────────────
    it('extracts operations array', () => {
        expect(Array.isArray(parsed.operations)).toBe(true);
    });

    // ── Officers ─────────────────────────────────────────────────────
    it('extracts named officers', () => {
        expect(parsed.namedOfficerData!.length).toBeGreaterThan(10);
        const sample = parsed.namedOfficerData![0];
        expect(sample.id).toBeDefined();
        expect(sample.name).toBeDefined();
        expect(sample.faction).toBeDefined();
    });

    // ── Enclave resilience ───────────────────────────────────────────
    it('extracts enclave resilience data', () => {
        expect(parsed.enclaveResilience).toBeDefined();
        const sarajevo = parsed.enclaveResilience?.['sarajevo'];
        expect(sarajevo).toBeDefined();
        expect(typeof sarajevo!.resilience).toBe('number');
    });

    // ── Displacement ─────────────────────────────────────────────────
    it('extracts displacement state and exposes the per-turn event buffer', () => {
        expect(Array.isArray(parsed.displacementEventLog)).toBe(true);
        expect(Object.keys(parsed.displacementByMun ?? {}).length).toBeGreaterThan(50);
        const displacedOutTotal = Object.values(parsed.displacementByMun ?? {})
            .reduce((sum: number, row: any) => sum + row.displacedOut, 0);
        expect(displacedOutTotal).toBeGreaterThan(0);
    });

    // ── Casualty ledger ──────────────────────────────────────────────
    it('extracts casualty data per faction', () => {
        expect(parsed.casualtyLedger).toBeDefined();
        const rs = parsed.casualtyLedger?.['RS'];
        expect(rs).toBeDefined();
        expect(typeof rs?.killed).toBe('number');
    });

    // ── Supply data ──────────────────────────────────────────────────
    it('extracts faction supply reserves', () => {
        expect(parsed.factionReserves).toBeDefined();
        const rs = parsed.factionReserves?.['RS'];
        expect(rs).toBeDefined();
        expect(typeof rs?.generalSupply).toBe('number');
    });

    // ── Fired events ─────────────────────────────────────────────────
    it('extracts historical events by turn', () => {
        expect(parsed.historicalEventsByTurn.length).toBeGreaterThan(10);
    });

    // ── Turn summaries ───────────────────────────────────────────────
    it('extracts turn summaries for Chronicle', () => {
        expect(parsed.turnSummaries.length).toBeGreaterThan(0);
    });

    // ── No undefined critical fields ─────────────────────────────────
    it('no formation has undefined faction or status', () => {
        for (const f of parsed.formations) {
            expect(f.faction).toBeDefined();
            expect(f.status).toBeDefined();
        }
    });

    it('no control event has undefined settlement', () => {
        for (const e of parsed.allControlEvents) {
            expect(e.settlementId).toBeDefined();
        }
    });
});

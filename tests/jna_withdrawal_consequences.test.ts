/**
 * LANE-NIGHTSHIFT-JNA-WITHDRAWAL-CONSEQUENCES-AUDIT
 *
 * Verifies that the jna_withdrawal_1992 event has a non-empty consequence
 * payload that closes the D3.3 triage finding (Mladić Turn 8: "JNA withdrawal
 * event logged but no visible impact on VRS supply, personnel, or doctrine").
 *
 * Ring 1 / event-data tweak. Mechanism (generic event-consequence handler) is
 * unchanged — these tests verify that every effect kind on the event is
 * dispatched by the existing `applyEventEffects` switch in apply_effects.ts.
 *
 * See: docs/40_reports/implemented/20260507_JNA_WITHDRAWAL_CONSEQUENCES_AUDIT.md
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const EVENTS_PATH = path.resolve(__dirname, '..', 'data', 'scenarios', 'events', 'war_1992.json');

/** All effect kinds dispatched by `applyEventEffects` in src/sim/events/apply_effects.ts.
 *  Kept in alphabetic order matching EFFECT_KIND_ORDER.
 *  If a new kind is added to the dispatcher, mirror it here. */
const SUPPORTED_EFFECT_KINDS = new Set<string>([
    'aggression_modifier',
    'alliance_change',
    'alliance_lock',
    'bot_priority_shift',
    'cohesion_change',
    'control_change',
    'cost_ledger_annotation',
    'doctrine_constraint',
    'equipment_grant',
    'equipment_quality_modifier',
    'guerrilla_threat',
    'humanitarian_impact',
    'morale_change',
    'narrative',
    'negotiation_capital',
    'patron_pressure',
    'recruitment_modifier',
    'supply_delta',
]);

interface RawEffect { kind: string; faction?: string; delta?: number; multiplier?: number; pool_multiplier?: number; duration_turns?: number; text?: string; }
interface RawEvent { id: string; effect?: RawEffect; effects?: RawEffect[]; }

function loadEvents(): RawEvent[] {
    const text = fs.readFileSync(EVENTS_PATH, 'utf8');
    return JSON.parse(text) as RawEvent[];
}

function findJna(events: RawEvent[]): RawEvent {
    const ev = events.find(e => e.id === 'jna_withdrawal_1992');
    if (!ev) throw new Error('jna_withdrawal_1992 not found in war_1992.json');
    return ev;
}

function allEffects(ev: RawEvent): RawEffect[] {
    const all: RawEffect[] = [];
    if (ev.effect) all.push(ev.effect);
    if (ev.effects) all.push(...ev.effects);
    return all;
}

describe('jna_withdrawal_1992 — consequence-block audit (LANE-NIGHTSHIFT-JNA-WITHDRAWAL-CONSEQUENCES-AUDIT)', () => {
    it('T1: jna_withdrawal_1992 has a non-empty consequences (effect+effects) block', () => {
        const ev = findJna(loadEvents());
        const all = allEffects(ev);
        // Historically-correct payload (corrected 2026-05-31): RS supply gain
        // (depot inheritance), RBiH morale hit, narrative. The JNA withdrawal
        // STRENGTHENED the VRS (it inherited JNA equipment + Bosnian-Serb
        // personnel) and gave ARBiH/HVO nothing — so the prior RS recruitment/
        // equipment debuffs and the RBiH/HRHB supply boosts were removed.
        expect(all.length).toBeGreaterThanOrEqual(3);
        // Must contain at least one *mechanical* effect (not just narrative).
        const mechanical = all.filter(e => e.kind !== 'narrative');
        expect(mechanical.length).toBeGreaterThanOrEqual(2);
    });

    it('T2: every effect kind on jna_withdrawal_1992 is dispatched by applyEventEffects', () => {
        const ev = findJna(loadEvents());
        const all = allEffects(ev);
        for (const eff of all) {
            expect(
                SUPPORTED_EFFECT_KINDS.has(eff.kind),
                `effect kind "${eff.kind}" is not registered in applyEventEffects switch`,
            ).toBe(true);
        }
    });

    it('T3: per-faction direction — RS inherits JNA materiel (supply gain); ARBiH demoralized; no RS debuffs, no ARBiH/HVO supply boosts', () => {
        const ev = findJna(loadEvents());
        const all = allEffects(ev);

        // RS gets the historical depot-transfer supply gain (the primary effect).
        const rsSupply = ev.effect && ev.effect.kind === 'supply_delta' && ev.effect.faction === 'RS' ? ev.effect : undefined;
        expect(rsSupply, 'expected RS supply_delta (depot inheritance) preserved as primary effect').toBeDefined();
        expect(rsSupply!.delta).toBeGreaterThan(0);

        // ARBiH demoralized losing JNA-heavy ground.
        const rbihMorale = all.find(e => e.kind === 'morale_change' && e.faction === 'RBiH');
        expect(rbihMorale, 'expected RBiH morale_change (demoralization)').toBeDefined();
        expect(rbihMorale!.delta).toBeLessThan(0);

        // The JNA withdrawal STRENGTHENED the VRS — it must NOT carry RS recruitment
        // or equipment-quality debuffs (those were historically backwards; removed 2026-05-31).
        const rsRecruit = all.find(e => e.kind === 'recruitment_modifier' && e.faction === 'RS');
        expect(rsRecruit, 'RS recruitment_modifier debuff must NOT be present (JNA withdrawal strengthened RS)').toBeUndefined();
        const rsQual = all.find(e => e.kind === 'equipment_quality_modifier' && e.faction === 'RS');
        expect(rsQual, 'RS equipment_quality_modifier debuff must NOT be present (JNA withdrawal strengthened RS)').toBeUndefined();

        // ARBiH and HVO gained nothing from the JNA withdrawal (stayed starved under the
        // arms embargo) — no supply boosts for either.
        const rbihSupplies = all.filter(e => e.kind === 'supply_delta' && e.faction === 'RBiH');
        expect(rbihSupplies.length, 'RBiH must NOT receive a supply_delta from JNA withdrawal').toBe(0);
        const hrhbSupplies = all.filter(e => e.kind === 'supply_delta' && e.faction === 'HRHB');
        expect(hrhbSupplies.length, 'HRHB must NOT receive a supply_delta from JNA withdrawal').toBe(0);
    });

    it('T4: deterministic — re-loading the JSON yields a structurally identical event', () => {
        const a = findJna(loadEvents());
        const b = findJna(loadEvents());
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        // And the same effect-kind multiset on both loads
        const ka = allEffects(a).map(e => e.kind).sort();
        const kb = allEffects(b).map(e => e.kind).sort();
        expect(ka).toEqual(kb);
    });
});

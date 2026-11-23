/**
 * Data lint over the authored pre-planned operation table
 * (`_ALL_PRE_PLANNED` in src/sim/combat/pre_planned_operations.ts).
 *
 * Rulings (lane C batch 3, operations-expert seat, items 12a / 12b, accepted as FINAL):
 *   12a "An operation's assembly floor is checked at launch, not at admission; an op whose
 *        force cannot assemble lapses to recovery without attacking. Authored floors must
 *        not exceed the authored roster."
 *   12b A prestage march writes a column order to the axis staging cell with no controller
 *        check, so the staging cell must be held by the operation's faction or an ally at
 *        prestage time. Zvezda 94 breaks this today and is fixed as DATA in the calibration
 *        pass.
 *
 * Rules:
 *   R1  minimum_assembled_participants <= authored roster, and minimum_viable_participants
 *       <= authored roster (roster = distinct brigade ids over all axes).
 *   R1c assembled > viable is authored only where listed (admission checks viable, launch
 *       checks assembled; see 12a).
 *   R2  For every op that has a prestage/enqueue date, every staging cell (axis
 *       staging_osid, falling back to the op staging_osid) is held at t0 by the op's faction
 *       or an ally. Ops without prestage_from/enqueue_from never march ahead of time, so the
 *       rule is skipped for them explicitly (takeover ops such as Prijedor stage against
 *       enemy cells by design). Control source: initial_political_controllers of the
 *       apr1992 startup snapshot (the start of apr1992_definitive_188w); it approximates
 *       control at prestage time (the 12b scan found later flips benign for the other ops).
 *       Alliance: same faction, or RBiH<->HRHB mutual (the code's isFriendlyFaction gates
 *       this on the war_alliance_rbih_hrhb value at runtime; no static helper exists, so the
 *       lint is permissive on that pair).
 *
 * The allowlists make today's data pass and fail on any NEW violation. Each allowlisted
 * entry must also still violate: when the calibration pass lands the data row the stale
 * entry fails here and must be deleted.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { _ALL_PRE_PLANNED, type PrePlannedOp } from '../src/sim/combat/pre_planned_operations.js';

const SNAPSHOT = path.join(process.cwd(), 'data', 'derived', 'startup', 'apr_1992_initial_save.json');
const controllers: Record<string, string | null> =
    JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')).political.initial_political_controllers;

/** R2 allowlist, key `op name | cell`. */
const STAGING_CELL_ALLOWLIST: Record<string, string> = {
    'Operation Zvezda 94 | op:foca:izbisno':
        '2026-11-22, calibration-pass data row: izbisno is RBiH-held all war; the pass re-targets the axis staging and moves prestage_from (lanec_b3 item 12b).',
    'Lukavac 93 — TG Kalinovik | op:kalinovik:golubici_2':
        '2026-11-22, RBiH at t0 but measured benign: brigades arrive and hold at t60/t78 with no churn (lanec_b3 item 12b scan); kept as a known data row.',
};

/** R1c allowlist: ops authored with assembled > viable. */
const ASSEMBLED_ABOVE_VIABLE_ALLOWLIST: Record<string, string> = {
    'Srebrenica–Cerska Link-Up':
        '2026-11-22, by design: viable 1 / assembled 6 (lanec_b3 item 12a).',
    'Operation Zvezda 94':
        '2026-11-22, calibration-pass data row: viable 2 / assembled 3 today; the pass sets the floor to 2 (lanec_b3 item 12a).',
};

const opLabel = (op: PrePlannedOp): string => `${op.name} [${op.corps}]`;
const roster = (op: PrePlannedOp): Set<string> => new Set(op.axes.flatMap((axis) => axis.brigades));
const stagingCells = (op: PrePlannedOp): string[] =>
    [...new Set(op.axes.map((axis) => axis.staging_osid ?? op.staging_osid))].sort();
const isAllied = (opFaction: string, controller: string | null | undefined): boolean => {
    if (!controller) return false;
    if (controller === opFaction) return true;
    return (opFaction === 'RBiH' && controller === 'HRHB') || (opFaction === 'HRHB' && controller === 'RBiH');
};
const hasPrestage = (op: PrePlannedOp): boolean => op.prestage_from != null || op.enqueue_from != null;

describe('pre-planned operation table lint', () => {
    it('the table and the control snapshot are live (non-vacuous)', () => {
        expect(_ALL_PRE_PLANNED.length).toBeGreaterThan(25);
        expect(Object.keys(controllers).length).toBeGreaterThan(500);
        expect(_ALL_PRE_PLANNED.filter(hasPrestage).length).toBeGreaterThan(10);
        expect(_ALL_PRE_PLANNED.filter((op) => op.minimum_assembled_participants != null).length).toBeGreaterThan(5);
    });

    it('R1: authored floors never exceed the authored roster', () => {
        const violations: string[] = [];
        for (const op of _ALL_PRE_PLANNED) {
            const size = roster(op).size;
            const assembled = op.minimum_assembled_participants;
            const viable = op.minimum_viable_participants;
            if (assembled != null && assembled > size) violations.push(`${opLabel(op)}: assembled ${assembled} > roster ${size}`);
            if (viable != null && viable > size) violations.push(`${opLabel(op)}: viable ${viable} > roster ${size}`);
        }
        expect(violations).toEqual([]);
    });

    it('R1c: assembled > viable is authored only where listed, and every listed entry is still true', () => {
        const actual = _ALL_PRE_PLANNED
            .filter((op) => op.minimum_assembled_participants != null
                && op.minimum_viable_participants != null
                && op.minimum_assembled_participants > op.minimum_viable_participants)
            .map((op) => op.name)
            .sort();
        expect(actual).toEqual(Object.keys(ASSEMBLED_ABOVE_VIABLE_ALLOWLIST).sort());
    });

    it('R2: prestaged ops stage only in cells held by their faction or an ally (allowlist pins the known rows)', () => {
        const violations: string[] = [];
        const skipped: string[] = [];
        for (const op of _ALL_PRE_PLANNED) {
            if (!hasPrestage(op)) {
                skipped.push(op.name); // no prestage march: rule not evaluable, skipped explicitly
                continue;
            }
            for (const cell of stagingCells(op)) {
                if (!isAllied(op.faction, controllers[cell])) {
                    violations.push(`${op.name} | ${cell}`);
                }
            }
        }
        expect(skipped.length).toBeGreaterThan(0);
        expect(violations.sort()).toEqual(Object.keys(STAGING_CELL_ALLOWLIST).sort());
    });

    it('R2 evidence: the Zvezda 94 izbisno cell is RBiH at t0 for an RS op (the known live case)', () => {
        const zvezda = _ALL_PRE_PLANNED.find((op) => op.name === 'Operation Zvezda 94');
        expect(zvezda).toBeDefined();
        expect(stagingCells(zvezda!)).toContain('op:foca:izbisno');
        expect(controllers['op:foca:izbisno']).toBe('RBiH');
        expect(zvezda!.prestage_from).toBeDefined();
    });
});

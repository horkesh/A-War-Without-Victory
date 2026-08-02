import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

const CORPS_SOURCE = 'src/sim/combat/corps_front_sectors.ts';
const SOLVER_SOURCE = 'src/sim/combat/sector_topology_solver.ts';
const TYPES_SOURCE = 'src/sim/combat/sector_topology_solver_types.ts';

function source(path: string): string {
    return fs.readFileSync(path, 'utf8');
}

describe('sector topology pure boundary static contracts', () => {
    it('keeps process, timing, filesystem, console, and global invocation state outside the detached core', () => {
        const raw = source(CORPS_SOURCE);
        const start = raw.indexOf('export function buildCorpsFrontSectorsFromReadModel(');
        const end = raw.indexOf('/** @internal Exact legacy fixed-point sequence', start);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        const core = raw.slice(start, end);

        expect(core).toContain('state: SectorTopologyWorkingState');
        expect(core).toContain('stageRunner?: SectorTopologyStageRunner');
        expect(core).not.toMatch(/\bGameState\b/);
        expect(core).not.toMatch(/\b_perfTime\b|\b_activeInvocation\b/);
        expect(core).not.toMatch(/\bprocess\b|\bglobalThis\b|\bhrtime\b/);
        expect(core).not.toMatch(/\bgetNodeBuiltinModule\b|\bappendFileSync\b/);
        expect(core).not.toMatch(/\bconsole\s*\.|\bemitRoutineConsole(?:Debug|Warn)\b/);
    });

    it('keeps the pure entry module free of live state and ambient I/O escape hatches', () => {
        const raw = source(SOLVER_SOURCE);
        expect(raw).not.toMatch(/\bGameState\b/);
        expect(raw).not.toMatch(/\bprocess\b|\bglobalThis\b|\bhrtime\b/);
        expect(raw).not.toMatch(/node:fs|node:path|\bconsole\s*\./);
        expect(raw).not.toMatch(/\bas\s+(?:unknown\s+as\s+)?GameState\b/);
    });

    it('pins the complete formation projection allow-list instead of accepting FormationState widening', () => {
        const raw = source(TYPES_SOURCE);
        const start = raw.indexOf('type SectorTopologyFormationScalarKeys =');
        const end = raw.indexOf(';', start);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        const declaredKeys = [...raw.slice(start, end).matchAll(/\| '([^']+)'/g)]
            .map((match) => match[1]);

        expect(declaredKeys).toEqual([
            'id',
            'name',
            'faction',
            'status',
            'kind',
            'readiness',
            'lifecycle_status',
            'corps_id',
            'location_osid',
            'home_osid',
            'hq_osid',
            'hq_sid',
            'personnel',
            'cohesion',
            'experience',
            'honor',
            'assigned_sub_segment_id',
            'posture',
            'disrupted',
            'disrupted_turns',
            'stranded_status',
            'entrenchment_turns',
        ]);
        expect(raw).not.toMatch(/formations:\s*Record<FormationId,\s*FormationState>/);
        expect(raw).not.toMatch(/SectorTopologyMutableFormation\s*=\s*FormationState/);
    });

    it('uses a hand-authored constructed oracle that cannot call the imperative candidate body', () => {
        const raw = source('tests/sector_topology_constructed_oracle.test.ts');
        expect(raw).toContain('expectedConstructedMutations');
        expect(raw).toContain('expectedSector');
        expect(raw).not.toMatch(/\bbuildCorpsFrontSectors(?:FromReadModel)?\b/);
        expect(raw).not.toMatch(/latest_run_final_save|operational_contact_graph/);
    });
});

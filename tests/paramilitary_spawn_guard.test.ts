/**
 * §6 D1 stage 2 static guards (integrated ruling 2026-11-18, §3 and §9).
 *
 * - The offensive paramilitary detector is retired: no turn phase calls an offensive spawner, and
 *   the export and its detector-only constants are gone. The read side stays for old saves.
 * - `spawnParamilitary` is the only code that creates a paramilitary formation.
 * - `recordWarCrime` callers are an allowlist: the paramilitary capture and the bot-only HRHB
 *   minority-expulsion policy. Anything new that books a war crime has to come through here.
 *
 * Source-string checks strip comments first (tests/helpers/sourceComments.ts), so the prose that
 * explains a retirement cannot satisfy or trip the assertion.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import * as sweepModule from '../src/sim/combat/paramilitary_sweep';
import * as formationConstants from '../src/state/formation_constants';
import { withoutComments } from './helpers/sourceComments';

const SWEEP_FILE = 'src/sim/combat/paramilitary_sweep.ts';

function sourceFiles(): string[] {
    return (readdirSync('src', { recursive: true }) as string[])
        .map((entry) => join('src', entry).replace(/\\/g, '/'))
        .filter((file) => /\.(ts|tsx|cjs|mjs|js)$/.test(file) && !file.endsWith('.d.ts'))
        .sort();
}

function code(file: string): string {
    return withoutComments(readFileSync(file, 'utf8'));
}

/** The body of a top-level `function <name>(` in `source`, from its signature to the closing brace at column 0. */
function functionBody(source: string, name: string): string {
    const start = source.search(new RegExp(`\\nfunction ${name}\\(|\\nexport function ${name}\\(`));
    expect(start, `function ${name} not found`).toBeGreaterThanOrEqual(0);
    const end = source.indexOf('\n}\n', start);
    expect(end, `end of function ${name} not found`).toBeGreaterThan(start);
    return source.slice(start, end + 3);
}

describe('paramilitary spawn guards (§6 D1 stage 2)', () => {
    it('the offensive detector, its export and its detector-only constants are gone', () => {
        expect('detectOffensiveParamilitaryTargets' in sweepModule).toBe(false);
        for (const name of [
            'OFFENSIVE_PARA_MAX_DEPLOYMENTS_PER_FACTION_TURN',
            'OFFENSIVE_PARA_MIN_ORGANIZATIONAL_PENETRATION',
            'OFFENSIVE_PARA_MUNICIPALITY_SCOPE',
        ]) {
            expect(name in formationConstants, name).toBe(false);
        }
        // The read side stays, so an old save's offensive paramilitary still advances and resolves.
        for (const name of ['OFFENSIVE_PARA_UNIT_SIZE', 'OFFENSIVE_PARA_FADE_WEEK', 'OFFENSIVE_PARA_MARCH_TURNS', 'OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE']) {
            expect(name in formationConstants, name).toBe(true);
        }
        for (const file of sourceFiles()) {
            expect(code(file), file).not.toMatch(/detectOffensive\w*/);
        }
    });

    it('no turn phase calls an offensive spawner: phases import only detection and advance from the sweep module', () => {
        // §6 mechanics item 4 (6/6, 2026-11-23): apply-autonomy-transition deletes a non-manual side's undecided
        // requests without history. That function never spawns, never resolves and writes no history (asserted
        // here, so the allowance cannot become a spawn route).
        const allowed = new Set(['detectParamilitaryTargets', 'advanceParamilitaries', 'removeNonManualPlayerParamilitaryRequests']);
        const remover = functionBody(code(SWEEP_FILE), 'removeNonManualPlayerParamilitaryRequests');
        expect(remover.length).toBeGreaterThan(0);
        expect(remover).not.toMatch(/spawnParamilitary\(|resolvePlayerParamilitaryDecisions\(|paramilitary_decision_history/);
        let importers = 0;
        for (const file of sourceFiles().filter((f) => f.startsWith('src/sim/turn_phases/') || f === 'src/sim/turn_pipeline.ts')) {
            const source = code(file);
            for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'[^']*combat\/paramilitary_sweep\.js'/g)) {
                importers++;
                const names = match[1]!.split(',').map((name) => name.trim()).filter(Boolean);
                for (const name of names) expect(allowed.has(name), `${file} imports ${name}`).toBe(true);
            }
        }
        expect(importers).toBeGreaterThan(0);
        // In the sweep module the only spawn that can pass the offensive mode replays an old save's
        // offensive request (resolvePlayerParamilitaryDecisions); every other call spawns rear-pocket.
        const sweep = code(SWEEP_FILE);
        const resolver = functionBody(sweep, 'resolvePlayerParamilitaryDecisions');
        expect(resolver).toMatch(/spawnParamilitary\(/);
        const outside = sweep.replace(resolver, '').replace(functionBody(sweep, 'spawnParamilitary'), '');
        const calls = [...outside.matchAll(/spawnParamilitary\(([^;]*)\);/g)].map((match) => match[1]!);
        expect(calls.length).toBeGreaterThan(0);
        for (const args of calls) expect(args).not.toMatch(/offensive/);
    });

    it('every spawn sits behind the policy gate or the player\'s own decision (§6 D1 stage 2)', () => {
        const sweep = code(SWEEP_FILE);
        const detect = functionBody(sweep, 'detectParamilitaryTargets');
        const resolver = functionBody(sweep, 'resolvePlayerParamilitaryDecisions');
        const definition = functionBody(sweep, 'spawnParamilitary');
        // Outside its definition, spawnParamilitary is called only in detection and in the player's decision replay.
        const elsewhere = sweep.replace(detect, '').replace(resolver, '').replace(definition, '');
        expect(elsewhere).not.toMatch(/spawnParamilitary\(/);
        // In detection the one gate comes before any spawn, and the non-manual spawn is reachable only past it.
        const gate = detect.indexOf('resolveNonManualParamilitaryPolicy(');
        expect(gate).toBeGreaterThan(0);
        for (const match of detect.matchAll(/spawnParamilitary\(/g)) expect(match.index!).toBeGreaterThan(gate);
        // No other module calls the spawner or reaches around the gate.
        for (const file of sourceFiles().filter((f) => f !== SWEEP_FILE)) {
            expect(code(file), file).not.toMatch(/\bspawnParamilitary\s*\(/);
        }
    });

    it('spawnParamilitary is the only code that creates a paramilitary formation', () => {
        const creators: string[] = [];
        for (const file of sourceFiles()) {
            const hits = [...code(file).matchAll(/kind\s*:\s*['"]paramilitary['"]/g)].length;
            for (let i = 0; i < hits; i++) creators.push(file);
        }
        expect(creators).toEqual([SWEEP_FILE]);
        expect(functionBody(code(SWEEP_FILE), 'spawnParamilitary')).toMatch(/kind\s*:\s*['"]paramilitary['"]/);
    });

    it('recordWarCrime callers are an allowlist: the paramilitary capture and the bot-only HRHB expulsion policy', () => {
        const callers: string[] = [];
        for (const file of sourceFiles()) {
            if (file === 'src/state/war_crimes_record.ts') continue;
            const hits = [...code(file).matchAll(/\brecordWarCrime\s*\(/g)].length;
            for (let i = 0; i < hits; i++) callers.push(file);
        }
        expect(callers).toEqual([SWEEP_FILE, 'src/state/displacement_takeover.ts']);
        expect(functionBody(code(SWEEP_FILE), 'advanceParamilitaries')).toMatch(/\brecordWarCrime\s*\(/);
    });
});

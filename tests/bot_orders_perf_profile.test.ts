import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
    BOT_ORDERS_PERF_FLAG,
    buildBotOrdersPerfSnapshot,
    botOrdersPerfTime,
    dumpBotOrdersPerfProfile,
    isBotOrdersPerfEnabled,
    resetBotOrdersPerfProfile,
} from '../src/sim/combat/_perf_profile_bot_orders.js';

const ORIGINAL_FLAG = process.env[BOT_ORDERS_PERF_FLAG];

describe('bot-orders perf profile instrumentation', () => {
    afterEach(() => {
        resetBotOrdersPerfProfile();
        if (ORIGINAL_FLAG === undefined) {
            delete process.env[BOT_ORDERS_PERF_FLAG];
        } else {
            process.env[BOT_ORDERS_PERF_FLAG] = ORIGINAL_FLAG;
        }
    });

    it('default-OFF: wrapper calls through without collecting samples', () => {
        delete process.env[BOT_ORDERS_PERF_FLAG];

        const value = botOrdersPerfTime('bot_orders.test.default_off', () => 42);

        expect(isBotOrdersPerfEnabled()).toBe(false);
        expect(value).toBe(42);
        expect(buildBotOrdersPerfSnapshot().labels).toEqual([]);
    });

    it('flag-ON: wrapper records deterministic label summaries and rethrows errors', () => {
        process.env[BOT_ORDERS_PERF_FLAG] = 'true';

        botOrdersPerfTime('zeta', () => 'ok');
        botOrdersPerfTime('alpha', () => 'ok');
        expect(() => botOrdersPerfTime('alpha', () => {
            throw new Error('expected failure');
        })).toThrow('expected failure');

        const snapshot = buildBotOrdersPerfSnapshot();
        expect(snapshot.schema_version).toBe(1);
        expect(snapshot.flag).toBe(BOT_ORDERS_PERF_FLAG);
        expect(snapshot.labels.map((row) => row.label)).toEqual(['alpha', 'zeta']);
        expect(snapshot.labels.find((row) => row.label === 'alpha')?.count).toBe(2);
        expect(snapshot.labels.find((row) => row.label === 'zeta')?.count).toBe(1);
        for (const row of snapshot.labels) {
            expect(Number(row.total_ns)).toBeGreaterThan(0);
            expect(Number(row.mean_ns)).toBeGreaterThan(0);
            expect(Number(row.min_ns)).toBeGreaterThan(0);
            expect(Number(row.max_ns)).toBeGreaterThan(0);
        }
    });

    it('dump helper writes stable JSON only when profiling is enabled', () => {
        const dir = mkdtempSync(join(tmpdir(), 'awwv-bot-orders-profile-'));
        const outPath = join(dir, 'profile.json');
        try {
            delete process.env[BOT_ORDERS_PERF_FLAG];
            expect(dumpBotOrdersPerfProfile(outPath)).toBeNull();
            expect(existsSync(outPath)).toBe(false);

            process.env[BOT_ORDERS_PERF_FLAG] = 'true';
            botOrdersPerfTime('bot_orders.test.dump', () => 1);

            expect(dumpBotOrdersPerfProfile(outPath)).toBe(outPath);
            const parsed = JSON.parse(readFileSync(outPath, 'utf8')) as ReturnType<typeof buildBotOrdersPerfSnapshot>;
            expect(parsed.labels.map((row) => row.label)).toEqual(['bot_orders.test.dump']);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('static wiring: bot orders and commander hot call sites use the perf wrapper', () => {
        const brigadeAi = readFileSync(resolve('src/sim/combat/bot_brigade_ai_osid.ts'), 'utf8');
        const commanderLoop = readFileSync(resolve('src/sim/combat/commander/commander_loop.ts'), 'utf8');
        const runnerCli = readFileSync(resolve('tools/scenario_runner/run_scenario.ts'), 'utf8');

        expect(brigadeAi).toContain('botOrdersPerfTime');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.total');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.evaluators');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.eval.garrisonAndDetachments');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.eval.sectorAttack');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.eval.interiorMovement');
        expect(brigadeAi).toContain('buildSectorAssignmentByBrigade');
        expect(brigadeAi).toContain('sectorAssignmentByBrigade.get(brigade.id)');
        expect(commanderLoop).toContain('botOrdersPerfTime');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.buildBriefing');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.commanderDecide');
        expect(runnerCli).toContain('dumpBotOrdersPerfProfile');
    });

    it('static guard: profiling module has no Date.now/new Date/Math.random/locale sorting', () => {
        const raw = readFileSync(resolve('src/sim/combat/_perf_profile_bot_orders.ts'), 'utf8');
        const withoutComments = raw
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/.*$/gm, '$1');

        expect(withoutComments).not.toMatch(/Math\.random\s*\(/);
        expect(withoutComments).not.toMatch(/\bDate\.now\s*\(/);
        expect(withoutComments).not.toMatch(/\bnew\s+Date\s*\(/);
        expect(withoutComments).not.toMatch(/\bperformance\.now\s*\(/);
        expect(withoutComments).not.toMatch(/localeCompare\s*\(/);
        expect(withoutComments).toMatch(/process\.hrtime\.bigint\s*\(/);
    });
});

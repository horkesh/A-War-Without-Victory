#!/usr/bin/env node
/**
 * Claude Plays VRS: Turn-by-turn scenario runner with injected army-level decisions.
 *
 * Usage:
 *   npx tsx tools/claude_plays_vrs/run_commander.ts
 *
 * Reads strategy from mladic_strategy.json, runs 40w scenario with RS corps stances
 * overridden by the strategy file. Formula bot still generates detailed directives.
 * Outputs per-turn summary to stdout and saves final state.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { runScenario } from '../../src/scenario/scenario_runner.js';
import { assertTurnSuccess, runTurn } from '../../src/sim/turn_pipeline.js';
import { deserializeState, serializeState } from '../../src/state/serialize.js';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import { loadOperationalData } from '../../src/data/operational_data.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991 } from '../../src/sim/turn_pipeline.js';
import { stableStringify } from '../../src/utils/stable_json.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface TurnDecision {
    briefing: string;
    corps_stances: Record<string, 'offensive' | 'balanced' | 'defensive' | 'reorganize'>;
    operation_decisions: { approve_all: boolean };
    strategic_priority: string;
}

interface Strategy {
    _meta: { commander: string; faction: string };
    decisions: Record<string, TurnDecision>;
}

interface TurnSummary {
    turn: number;
    week: number;
    territory: Record<string, { osids: number; pct: string }>;
    rs_corps: Array<{
        id: string;
        stance: string;
        brigades: number;
        active_op: string | null;
        personnel: number;
    }>;
    battles: Array<{
        attacker_faction: string;
        target_osid: string;
        outcome: string;
        att_casualties: number;
        def_casualties: number;
    }>;
    territory_changes: Array<{ osid: string; from: string; to: string }>;
    personnel: Record<string, { total: number; brigades: number }>;
    events_fired: string[];
    commander_briefing: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Strategy loading
// ═══════════════════════════════════════════════════════════════════════════

function loadStrategy(path: string): Promise<Strategy> {
    return readFile(path, 'utf8').then(raw => JSON.parse(raw));
}

function getDecisionForTurn(strategy: Strategy, turn: number): TurnDecision | null {
    // Find the highest turn number <= current turn
    const turnKeys = Object.keys(strategy.decisions)
        .map(Number)
        .filter(k => !isNaN(k))
        .sort((a, b) => a - b);

    let bestKey: number | null = null;
    for (const k of turnKeys) {
        if (k <= turn) bestKey = k;
        else break;
    }

    return bestKey !== null ? strategy.decisions[String(bestKey)] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Decision injection
// ═══════════════════════════════════════════════════════════════════════════

function injectRsDecisions(state: GameState, decision: TurnDecision): void {
    const corpsCommand = state.military.corps_command ?? {};

    for (const [corpsId, stance] of Object.entries(decision.corps_stances)) {
        if (!corpsCommand[corpsId]) {
            corpsCommand[corpsId] = { stance: 'balanced' } as any;
        }
        corpsCommand[corpsId].stance = stance as any;
    }

    state.military.corps_command = corpsCommand;
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary extraction
// ═══════════════════════════════════════════════════════════════════════════

function extractTurnSummary(
    prevState: GameState,
    state: GameState,
    report: any,
    decision: TurnDecision | null,
    turn: number
): TurnSummary {
    const pc = state.political?.political_controllers ?? {};
    const prevPc = prevState.political?.political_controllers ?? {};
    const allOsids = Object.keys(pc);

    // Territory counts
    const territoryCounts: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
    for (const osid of allOsids) {
        const faction = pc[osid];
        if (faction && territoryCounts[faction] !== undefined) {
            territoryCounts[faction]++;
        }
    }
    const total = allOsids.length;
    const territory: Record<string, { osids: number; pct: string }> = {};
    for (const [f, count] of Object.entries(territoryCounts)) {
        territory[f] = { osids: count, pct: total > 0 ? ((count / total) * 100).toFixed(1) : '0' };
    }

    // Territory changes
    const territoryChanges: Array<{ osid: string; from: string; to: string }> = [];
    for (const osid of allOsids) {
        const prev = prevPc[osid];
        const curr = pc[osid];
        if (prev && curr && prev !== curr) {
            territoryChanges.push({ osid, from: prev, to: curr });
        }
    }

    // RS Corps status
    const formations = state.military.formations ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    const rsFactions = ['RS'];
    const rsCorps: TurnSummary['rs_corps'] = [];

    for (const [corpsId, cc] of Object.entries(corpsCommand).sort(([a], [b]) => a.localeCompare(b))) {
        const corpsFormation = formations[corpsId];
        if (!corpsFormation || corpsFormation.faction !== 'RS') continue;
        if (corpsFormation.kind === 'army_hq') continue;

        // Count brigades and personnel
        let brigadeCount = 0;
        let totalPersonnel = 0;
        for (const [, f] of Object.entries(formations)) {
            if (f.faction === 'RS' && f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active') {
                brigadeCount++;
                totalPersonnel += f.personnel ?? 0;
            }
        }

        const activeOps = cc.active_operations ?? [];
        const activeOp = activeOps[0] ?? null;
        rsCorps.push({
            id: corpsId,
            stance: cc.stance ?? 'balanced',
            brigades: brigadeCount,
            active_op: activeOp ? `${activeOp.name} (${activeOp.phase})` : null,
            personnel: totalPersonnel,
        });
    }

    // Battles from report
    const battles: TurnSummary['battles'] = [];
    const battleResults = (report as any)?.battle_results ?? (report as any)?.control_flip?.control_events ?? [];
    if (Array.isArray(battleResults)) {
        for (const b of battleResults) {
            if (b.attacker_faction || b.type === 'battle') {
                battles.push({
                    attacker_faction: b.attacker_faction ?? b.attacker ?? '?',
                    target_osid: b.target_osid ?? b.osid ?? '?',
                    outcome: b.outcome ?? b.result ?? '?',
                    att_casualties: b.attacker_casualties ?? b.att_casualties ?? 0,
                    def_casualties: b.defender_casualties ?? b.def_casualties ?? 0,
                });
            }
        }
    }

    // Personnel totals
    const personnel: Record<string, { total: number; brigades: number }> = { RS: { total: 0, brigades: 0 }, RBiH: { total: 0, brigades: 0 }, HRHB: { total: 0, brigades: 0 } };
    for (const [, f] of Object.entries(formations)) {
        if (f.kind === 'brigade' && f.status === 'active' && personnel[f.faction]) {
            personnel[f.faction].total += f.personnel ?? 0;
            personnel[f.faction].brigades++;
        }
    }

    // Events
    const firedEvents = state.military.fired_event_ids ?? [];
    const prevFired = prevState.military.fired_event_ids ?? [];
    const newEvents = firedEvents.filter((e: string) => !prevFired.includes(e));

    return {
        turn,
        week: turn,
        territory,
        rs_corps: rsCorps,
        battles,
        territory_changes: territoryChanges,
        personnel,
        events_fired: newEvents,
        commander_briefing: decision?.briefing ?? '',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Formatting
// ═══════════════════════════════════════════════════════════════════════════

function formatSummary(s: TurnSummary): string {
    const lines: string[] = [];
    const divider = '═'.repeat(72);

    lines.push('');
    lines.push(divider);
    lines.push(`  TURN ${s.turn} (Week ${s.week})`);
    lines.push(divider);

    if (s.commander_briefing) {
        lines.push('');
        lines.push(`  MLADIĆ: "${s.commander_briefing}"`);
    }

    lines.push('');
    lines.push('  TERRITORY:');
    for (const [f, t] of Object.entries(s.territory)) {
        lines.push(`    ${f.padEnd(6)} ${t.osids} OSIDs (${t.pct}%)`);
    }

    lines.push('');
    lines.push('  VRS CORPS STATUS:');
    for (const c of s.rs_corps) {
        const opStr = c.active_op ? ` | ${c.active_op}` : '';
        lines.push(`    ${c.id.padEnd(25)} ${c.stance.padEnd(10)} ${c.brigades} bde  ${c.personnel} pers${opStr}`);
    }

    if (s.battles.length > 0) {
        lines.push('');
        lines.push(`  BATTLES (${s.battles.length}):`);
        for (const b of s.battles.slice(0, 10)) {
            lines.push(`    ${b.attacker_faction} → ${b.target_osid}: ${b.outcome} (att: -${b.att_casualties}, def: -${b.def_casualties})`);
        }
        if (s.battles.length > 10) lines.push(`    ... and ${s.battles.length - 10} more`);
    }

    if (s.territory_changes.length > 0) {
        lines.push('');
        lines.push(`  TERRITORY CHANGES (${s.territory_changes.length}):`);
        const rsGains = s.territory_changes.filter(c => c.to === 'RS');
        const rsLosses = s.territory_changes.filter(c => c.from === 'RS');
        if (rsGains.length > 0) lines.push(`    RS gained: ${rsGains.map(c => c.osid.replace('op:', '')).join(', ')}`);
        if (rsLosses.length > 0) lines.push(`    RS lost: ${rsLosses.map(c => c.osid.replace('op:', '')).join(', ')}`);
        const otherChanges = s.territory_changes.filter(c => c.from !== 'RS' && c.to !== 'RS');
        if (otherChanges.length > 0) lines.push(`    Other: ${otherChanges.map(c => `${c.osid.replace('op:', '')} ${c.from}→${c.to}`).join(', ')}`);
    }

    lines.push('');
    lines.push('  FORCE STRENGTH:');
    for (const [f, p] of Object.entries(s.personnel)) {
        lines.push(`    ${f.padEnd(6)} ${p.total.toLocaleString()} personnel / ${p.brigades} brigades`);
    }

    if (s.events_fired.length > 0) {
        lines.push('');
        lines.push(`  EVENTS: ${s.events_fired.join(', ')}`);
    }

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    const baseDir = process.cwd();
    const scenarioPath = 'data/scenarios/apr1992_definitive_40w.json';
    const strategyPath = join(baseDir, 'tools/claude_plays_vrs/mladic_strategy.json');
    const outDir = join(baseDir, 'runs/claude_plays_vrs');

    await mkdir(outDir, { recursive: true });

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CLAUDE PLAYS VRS: General Ratko Mladić, Commanding      ║');
    console.log('║     40-Week Scenario — April 1992 to January 1993           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Loading strategy...');

    const strategy = await loadStrategy(strategyPath);
    console.log(`Commander: ${strategy._meta.commander}`);
    console.log(`Faction: ${strategy._meta.faction}`);
    console.log('');

    // Step 1: Create initial state using the scenario runner's initialStateOnly mode
    console.log('Initializing scenario (using standard scenario runner)...');
    const initResult = await runScenario({
        scenarioPath,
        outDirBase: join(baseDir, 'runs'),
        uniqueRunFolder: true,
        initialStateOnly: true,
        baseDir,
    });

    // Load the initial state
    const initialSaveRaw = await readFile(initResult.paths.initial_save, 'utf8');
    let state = deserializeState(initialSaveRaw);
    console.log(`Initial state loaded. Phase: ${state.meta.phase}. Turn: ${state.meta.turn}`);
    console.log(`OSIDs: ${Object.keys(state.political?.political_controllers ?? {}).length}`);
    console.log('');

    // Load dependencies for runTurn
    const graph = await loadSettlementGraph({
        settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'),
        edgesPath: join(baseDir, 'data/derived/settlement_edges.json')
    });

    let municipalityPopulation1991: MunicipalityPopulation1991 | undefined;
    try {
        const popPath = join(baseDir, 'data/derived/municipality_population_1991.json');
        const popRaw = JSON.parse(await readFile(popPath, 'utf8')) as any;
        const flat: MunicipalityPopulation1991 = {};
        const byMunDirect = popRaw.by_mun1990_id;
        if (byMunDirect) {
            for (const [munId, v] of Object.entries(byMunDirect) as any[]) {
                const b = v?.breakdown;
                flat[munId] = { total: v?.total ?? 0, bosniak: b?.bosniak ?? 0, serb: b?.serb ?? 0, croat: b?.croat ?? 0, other: b?.other ?? 0 };
            }
        }
        municipalityPopulation1991 = flat;
    } catch { /* non-fatal */ }

    let settlementPopulationBySid: Record<string, number> | undefined;
    try {
        const censusPath = join(baseDir, 'data/derived/census_rolled_up_wgs84.json');
        const censusRaw = JSON.parse(await readFile(censusPath, 'utf8')) as any;
        const bySid = censusRaw.by_sid ?? {};
        const popBySid: Record<string, number> = {};
        for (const [sid, v] of Object.entries(bySid) as any[]) {
            const p = v?.p;
            if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'number' && p[0] > 0) {
                popBySid[sid] = p[0];
            }
        }
        settlementPopulationBySid = Object.keys(popBySid).length > 0 ? popBySid : undefined;
    } catch { /* non-fatal */ }

    let municipalityHqSettlement: Record<string, string> | undefined;
    try {
        const { loadMunicipalityHqSettlement } = await import('../../src/scenario/oob_loader.js');
        municipalityHqSettlement = await loadMunicipalityHqSettlement(baseDir);
    } catch { /* non-fatal */ }

    const eventDefinitions = loadEventDefinitions(0);

    // Collect all summaries
    const allSummaries: TurnSummary[] = [];
    const weeks = 40;

    console.log('═'.repeat(72));
    console.log('  BEGINNING 40-WEEK CAMPAIGN');
    console.log('═'.repeat(72));

    // Step 2: Run turns
    for (let week = 0; week < weeks; week++) {
        // Snapshot just the fields we need for comparison (avoid full serialization validation)
        const prevPc = { ...(state.political?.political_controllers ?? {}) };
        const prevFiredEvents = [...(state.military.fired_event_ids ?? [])];
        const prevStateForSummary = { political: { political_controllers: prevPc }, military: { fired_event_ids: prevFiredEvents } } as GameState;

        // Get decision for this turn
        const decision = getDecisionForTurn(strategy, week);

        // Inject RS army-level decisions BEFORE the turn runs
        if (decision && state.meta.phase === 'war') {
            injectRsDecisions(state, decision);
        }

        // Run one turn
        if (state.meta.phase === 'peace') {
            const { runOneTurn } = await import('../../src/state/turn_pipeline.js');
            const result = runOneTurn(state, { seed: state.meta.seed });
            state = result.state;
        } else {
            const result = await runTurn(state, {
                seed: state.meta.seed,
                settlementGraph: graph,
                settlementEdges: graph.edges,
                municipalityPopulation1991,
                settlementPopulationBySid,
                municipalityHqSettlement: municipalityHqSettlement && Object.keys(municipalityHqSettlement).length > 0 ? municipalityHqSettlement : undefined,
                eventDefinitions,
            });
            assertTurnSuccess(result);
            state = result.nextState;

            // Extract and print summary
            const summary = extractTurnSummary(prevStateForSummary, state, result.report, decision, week);
            allSummaries.push(summary);
            console.log(formatSummary(summary));
        }
    }

    // Step 3: Final summary
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    CAMPAIGN COMPLETE                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const finalPc = state.political?.political_controllers ?? {};
    const finalOsids = Object.keys(finalPc);
    const finalCounts: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
    for (const osid of finalOsids) {
        const f = finalPc[osid];
        if (f && finalCounts[f] !== undefined) finalCounts[f]++;
    }
    const total = finalOsids.length;

    console.log('');
    console.log('  FINAL TERRITORY:');
    for (const [f, count] of Object.entries(finalCounts)) {
        console.log(`    ${f.padEnd(6)} ${count}/${total} (${((count / total) * 100).toFixed(1)}%)`);
    }

    // Personnel
    const formations = state.military.formations ?? {};
    const finalPersonnel: Record<string, { total: number; brigades: number }> = { RS: { total: 0, brigades: 0 }, RBiH: { total: 0, brigades: 0 }, HRHB: { total: 0, brigades: 0 } };
    for (const [, f] of Object.entries(formations)) {
        if (f.kind === 'brigade' && f.status === 'active' && finalPersonnel[f.faction]) {
            finalPersonnel[f.faction].total += f.personnel ?? 0;
            finalPersonnel[f.faction].brigades++;
        }
    }

    console.log('');
    console.log('  FINAL FORCE STRENGTH:');
    for (const [f, p] of Object.entries(finalPersonnel)) {
        console.log(`    ${f.padEnd(6)} ${p.total.toLocaleString()} personnel / ${p.brigades} brigades`);
    }

    // Save outputs
    const finalSavePath = join(outDir, 'final_save.json');
    let serialized: string;
    try {
        serialized = serializeState(state);
    } catch {
        // If validation fails, save raw JSON without validation
        serialized = stableStringify(state, 2);
    }
    await writeFile(finalSavePath, serialized, 'utf8');

    const summaryPath = join(outDir, 'commander_log.json');
    await writeFile(summaryPath, stableStringify(allSummaries, 2), 'utf8');

    const hash = createHash('sha256').update(serialized, 'utf8').digest('hex').slice(0, 16);
    console.log('');
    console.log(`  State hash: ${hash}`);
    console.log(`  Final save: ${finalSavePath}`);
    console.log(`  Commander log: ${summaryPath}`);
    console.log('');
    console.log('  Run comparison: node tools/compare_painted_vs_sim.cjs runs/claude_plays_vrs');
}

main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});

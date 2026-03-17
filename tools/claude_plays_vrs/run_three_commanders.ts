#!/usr/bin/env node
/**
 * Three Commanders: All three faction army commanders played by AI agents.
 *
 * Each commander:
 * - Reads game state reactively each turn
 * - Makes army-level decisions (corps stances, op approvals)
 * - Produces diagnostic observations (bugs, calibration issues, design gaps)
 * - Falls back to cadet (pre-scripted) strategy when reactive mode unavailable
 *
 * Usage:
 *   npx tsx tools/claude_plays_vrs/run_three_commanders.ts [--mode cadet|reactive]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import { runScenario } from '../../src/scenario/scenario_runner.js';
import { runTurn } from '../../src/sim/turn_pipeline.js';
import { deserializeState, serializeState } from '../../src/state/serialize.js';
import { loadSettlementGraph } from '../../src/map/settlements.js';
import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import type { FactionId, GameState, CorpsStance } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991 } from '../../src/sim/turn_pipeline.js';
import { stableStringify } from '../../src/utils/stable_json.js';
import { strictCompare } from '../../src/state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface CommanderProfile {
    faction: FactionId;
    commander: string;
    successor?: { name: string; transition_week: number };
    personality: { voice: string; competence: number; aggressiveness: number; risk_tolerance: string };
    strategic_doctrine: {
        priorities: string[];
        red_lines: string[];
        historical_expectations: Record<string, string>;
    };
    cadet_strategy: Record<string, { corps_stances: Record<string, string>; approve_all_ops: boolean }>;
}

interface Observation {
    severity: 'bug' | 'calibration' | 'design_gap' | 'historical_divergence';
    commander: string;
    faction: string;
    turn: number;
    description: string;
    expected: string;
    actual: string;
    affected_system: string;
}

interface CommanderDecision {
    faction: FactionId;
    commander_name: string;
    turn: number;
    briefing: string;
    corps_stances: Record<string, CorpsStance>;
    observations: Observation[];
}

interface TurnLog {
    turn: number;
    territory: Record<string, { osids: number; pct: string }>;
    personnel: Record<string, { total: number; brigades: number }>;
    decisions: CommanderDecision[];
    territory_changes: Array<{ osid: string; from: string; to: string }>;
    events: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Commander profiles
// ═══════════════════════════════════════════════════════════════════════════

async function loadCommander(path: string): Promise<CommanderProfile> {
    return JSON.parse(await readFile(path, 'utf8'));
}

// ═══════════════════════════════════════════════════════════════════════════
// Cadet decision engine (pre-scripted fallback)
// ═══════════════════════════════════════════════════════════════════════════

function getCadetDecision(profile: CommanderProfile, turn: number): Record<string, CorpsStance> | null {
    const turnKeys = Object.keys(profile.cadet_strategy)
        .map(Number).filter(k => !isNaN(k)).sort((a, b) => a - b);

    let bestKey: number | null = null;
    for (const k of turnKeys) {
        if (k <= turn) bestKey = k;
        else break;
    }

    if (bestKey === null) return null;
    const entry = profile.cadet_strategy[String(bestKey)];
    if (!entry) return null;

    const result: Record<string, CorpsStance> = {};
    for (const [corpsId, stance] of Object.entries(entry.corps_stances)) {
        result[corpsId] = stance as CorpsStance;
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Reactive decision engine (reads state, generates decisions + diagnostics)
// ═══════════════════════════════════════════════════════════════════════════

function generateReactiveDecision(
    profile: CommanderProfile,
    state: GameState,
    turn: number,
    prevTerritory: Record<string, number>
): CommanderDecision {
    const faction = profile.faction;
    const commanderName = (profile.successor && turn >= profile.successor.transition_week)
        ? profile.successor.name
        : profile.commander;

    const observations: Observation[] = [];
    const corpsStances: Record<string, CorpsStance> = {};

    // Count territory
    const pc = state.political?.political_controllers ?? {};
    const allOsids = Object.keys(pc);
    const totalOsids = allOsids.length;
    let ownOsids = 0;
    for (const osid of allOsids) { if (pc[osid] === faction) ownOsids++; }
    const territoryPct = totalOsids > 0 ? (ownOsids / totalOsids) * 100 : 0;
    const prevOwnOsids = prevTerritory[faction] ?? ownOsids;
    const territoryDelta = ownOsids - prevOwnOsids;

    // Analyze corps
    const formations = state.military.formations ?? {};
    const corpsCommand = state.military.corps_command ?? {};

    const factionCorps: Array<{
        id: string; stance: string; brigades: number; personnel: number;
        avgCohesion: number; avgMorale: number; hasOp: boolean; opPhase: string;
    }> = [];

    for (const [corpsId, cc] of Object.entries(corpsCommand).sort(([a], [b]) => strictCompare(a, b))) {
        const cf = formations[corpsId];
        if (!cf || cf.faction !== faction) continue;
        if (cf.kind === 'army_hq') continue;

        let brigCount = 0, totalPers = 0, totalCoh = 0, totalMor = 0;
        for (const [, f] of Object.entries(formations)) {
            if (f.faction === faction && f.corps_id === corpsId && f.kind === 'brigade' && f.status === 'active') {
                brigCount++;
                totalPers += f.personnel ?? 0;
                totalCoh += f.cohesion ?? 50;
                totalMor += f.morale ?? 50;
            }
        }

        factionCorps.push({
            id: corpsId,
            stance: cc.stance ?? 'balanced',
            brigades: brigCount,
            personnel: totalPers,
            avgCohesion: brigCount > 0 ? totalCoh / brigCount : 50,
            avgMorale: brigCount > 0 ? totalMor / brigCount : 50,
            hasOp: !!cc.active_operation,
            opPhase: cc.active_operation?.phase ?? '',
        });
    }

    // Check historical expectations
    const expectations = profile.strategic_doctrine.historical_expectations;
    for (const [weekKey, expectation] of Object.entries(expectations)) {
        const expectedWeek = parseInt(weekKey.replace('w', ''));
        if (turn === expectedWeek) {
            // Check territory expectation (parse % from string)
            const pctMatch = expectation.match(/(\d+)-?(\d+)?%/);
            if (pctMatch) {
                const expectedLow = parseInt(pctMatch[1]);
                const expectedHigh = pctMatch[2] ? parseInt(pctMatch[2]) : expectedLow + 5;
                if (territoryPct < expectedLow - 3) {
                    observations.push({
                        severity: 'historical_divergence',
                        commander: commanderName,
                        faction,
                        turn,
                        description: `Territory significantly below historical expectation at week ${turn}`,
                        expected: expectation,
                        actual: `${territoryPct.toFixed(1)}% (${ownOsids} OSIDs)`,
                        affected_system: 'territory_control',
                    });
                } else if (territoryPct > expectedHigh + 5) {
                    observations.push({
                        severity: 'historical_divergence',
                        commander: commanderName,
                        faction,
                        turn,
                        description: `Territory significantly above historical expectation at week ${turn}`,
                        expected: expectation,
                        actual: `${territoryPct.toFixed(1)}% (${ownOsids} OSIDs)`,
                        affected_system: 'territory_control',
                    });
                }
            }
        }
    }

    // Check for corps with 0 brigades (possible mechanical issue)
    for (const c of factionCorps) {
        if (c.brigades === 0) {
            observations.push({
                severity: 'bug',
                commander: commanderName,
                faction,
                turn,
                description: `Corps ${c.id} has 0 active brigades`,
                expected: 'All active corps should have at least 1 brigade',
                actual: `${c.id}: 0 brigades, ${c.personnel} personnel`,
                affected_system: 'brigade_assignment',
            });
        }
    }

    // Check for corps set to offensive but with no active operation (possible intent gap)
    for (const c of factionCorps) {
        if (c.stance === 'offensive' && !c.hasOp && c.brigades >= 3 && turn > 4) {
            observations.push({
                severity: 'design_gap',
                commander: commanderName,
                faction,
                turn,
                description: `Corps ${c.id} is offensive with ${c.brigades} brigades but has no active operation`,
                expected: 'Offensive corps with adequate force should be launching or preparing operations',
                actual: `${c.id}: offensive stance, ${c.brigades} brigades, no operation`,
                affected_system: 'operation_generation',
            });
        }
    }

    // Check for extremely low morale/cohesion (possible attrition imbalance)
    for (const c of factionCorps) {
        if (c.avgMorale < 25 && c.brigades > 0) {
            observations.push({
                severity: 'calibration',
                commander: commanderName,
                faction,
                turn,
                description: `Corps ${c.id} has critically low morale (${c.avgMorale.toFixed(0)})`,
                expected: 'Morale should not drop below 25 average without severe casualties or encirclement',
                actual: `${c.id}: morale ${c.avgMorale.toFixed(0)}, cohesion ${c.avgCohesion.toFixed(0)}, ${c.personnel} personnel`,
                affected_system: 'morale_system',
            });
        }
    }

    // Check for territory loss while on offensive (possible effectiveness issue)
    if (territoryDelta < -2 && factionCorps.some(c => c.stance === 'offensive')) {
        observations.push({
            severity: 'calibration',
            commander: commanderName,
            faction,
            turn,
            description: `Lost ${Math.abs(territoryDelta)} OSIDs this turn despite having corps on offensive`,
            expected: 'Offensive stance should at minimum prevent significant territory loss',
            actual: `${territoryDelta} OSIDs this turn. Offensive corps: ${factionCorps.filter(c => c.stance === 'offensive').map(c => c.id).join(', ')}`,
            affected_system: 'combat_effectiveness',
        });
    }

    // Generate stances based on reactive analysis
    for (const c of factionCorps) {
        let newStance: CorpsStance;

        if (faction === 'RS') {
            // Mladić logic: aggressive early, consolidate when tired
            if (turn < 12) {
                newStance = c.avgCohesion > 35 && c.personnel > 3000 ? 'offensive' : 'balanced';
            } else if (turn < 26) {
                // Post-blitz: offensive only if strong, otherwise balanced
                newStance = (c.avgCohesion > 45 && c.personnel > 5000 && c.avgMorale > 40) ? 'offensive' : 'balanced';
            } else {
                // Late war: defensive unless very strong
                newStance = (c.avgCohesion > 50 && c.personnel > 8000 && c.avgMorale > 50) ? 'balanced' : 'defensive';
            }
            // Herzegovina always defensive after Graz (w4)
            if (c.id === 'vrs_herzegovina' && turn >= 4) newStance = 'defensive';
            // SRK balanced for siege maintenance
            if (c.id === 'vrs_sarajevo_romanija' && newStance !== 'reorganize') newStance = 'balanced';

        } else if (faction === 'RBiH') {
            // Halilović/Delić: defensive early, build to balanced, selective offensive late
            if (turn < 15) {
                newStance = 'defensive';
            } else if (turn < 30) {
                newStance = c.avgCohesion > 40 && c.personnel > 5000 ? 'balanced' : 'defensive';
            } else {
                newStance = (c.avgCohesion > 50 && c.personnel > 8000 && c.avgMorale > 45) ? 'offensive' : 'balanced';
            }
            // 1st Corps (Sarajevo): always defensive unless very strong late
            if (c.id === 'arbih_1st_corps' && turn < 30) newStance = 'defensive';
            // 5th Corps (Bihać): balanced — Dudaković is aggressive
            if (c.id === 'arbih_5th_corps' && turn >= 15 && c.personnel > 3000) newStance = 'balanced';

        } else if (faction === 'HRHB') {
            // Petković: mostly defensive, small force
            newStance = 'defensive';
            // Central Bosnia: balanced if alliance strained
            if (c.id === 'hvo_central_bosnia') {
                const alliance = state.political.war_alliance_rbih_hrhb ?? 1.0;
                if (alliance < 0.0) newStance = 'offensive';
                else if (alliance < 0.3) newStance = 'balanced';
                else newStance = 'defensive';
            }
            // Posavina: always balanced (must hold)
            if (c.id === 'hvo_northwest_bosnia') newStance = 'balanced';
        } else {
            newStance = 'balanced';
        }

        // Never override reorganize from critical state
        if (c.avgCohesion < 20 && c.personnel < 2000) {
            newStance = 'reorganize';
        }

        corpsStances[c.id] = newStance;
    }

    // Generate briefing
    const briefing = generateBriefing(profile, commanderName, turn, territoryPct, territoryDelta, factionCorps, observations);

    return { faction, commander_name: commanderName, turn, briefing, corps_stances: corpsStances, observations };
}

function generateBriefing(
    profile: CommanderProfile,
    name: string,
    turn: number,
    pct: number,
    delta: number,
    corps: Array<{ id: string; brigades: number; personnel: number; hasOp: boolean }>,
    observations: Observation[]
): string {
    const totalBrigades = corps.reduce((s, c) => s + c.brigades, 0);
    const totalPersonnel = corps.reduce((s, c) => s + c.personnel, 0);
    const opsCount = corps.filter(c => c.hasOp).length;
    const deltaStr = delta > 0 ? `+${delta}` : delta === 0 ? '0' : `${delta}`;
    const issueCount = observations.length;

    if (profile.faction === 'RS') {
        if (turn < 12) return `${name}: Week ${turn}. We hold ${pct.toFixed(1)}% (${deltaStr} this turn). ${totalBrigades} brigades, ${totalPersonnel.toLocaleString()} men. ${opsCount} operations active. The offensive continues.${issueCount > 0 ? ` ${issueCount} concerns noted.` : ''}`;
        if (turn < 26) return `${name}: Week ${turn}. Territory ${pct.toFixed(1)}% (${deltaStr}). The initial momentum is fading. ${totalBrigades} brigades hold the line. ${opsCount} operations.${issueCount > 0 ? ` ${issueCount} issues require attention.` : ''}`;
        return `${name}: Week ${turn}. ${pct.toFixed(1)}% territory (${deltaStr}). We hold what matters. ${totalPersonnel.toLocaleString()} men entrenched. Conserve strength for Dayton.${issueCount > 0 ? ` ${issueCount} concerns.` : ''}`;
    } else if (profile.faction === 'RBiH') {
        if (turn < 15) return `${name}: Week ${turn}. We hold ${pct.toFixed(1)}% (${deltaStr}). ${totalBrigades} brigades forming. Survival is the mission. Every day we endure is a victory.${issueCount > 0 ? ` ${issueCount} issues noted.` : ''}`;
        if (turn < 30) return `${name}: Week ${turn}. ${pct.toFixed(1)}% territory (${deltaStr}). ${totalPersonnel.toLocaleString()} under arms. The army grows stronger. ${opsCount} operations.${issueCount > 0 ? ` ${issueCount} concerns.` : ''}`;
        return `${name}: Week ${turn}. ${pct.toFixed(1)}% (${deltaStr}). ${totalBrigades} brigades ready. We are no longer the rabble of April. Time to push back.${issueCount > 0 ? ` ${issueCount} issues.` : ''}`;
    } else {
        return `${name}: Week ${turn}. ${pct.toFixed(1)}% territory (${deltaStr}). ${totalBrigades} brigades. Herzegovina holds. Zagreb's orders stand.${issueCount > 0 ? ` ${issueCount} concerns.` : ''}`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Decision injection (for all factions)
// ═══════════════════════════════════════════════════════════════════════════

function injectAllDecisions(state: GameState, decisions: CommanderDecision[]): void {
    // Build ai_army_decisions structure that bot_corps_stance.ts now respects
    const aiArmyDecisions: Record<string, any> = {};

    for (const decision of decisions) {
        aiArmyDecisions[decision.faction] = {
            corps_directives: {} as Record<string, { stance: string }>,
        };
        for (const [corpsId, stance] of Object.entries(decision.corps_stances)) {
            aiArmyDecisions[decision.faction].corps_directives[corpsId] = { stance };
        }
    }

    (state.military as any).ai_army_decisions = aiArmyDecisions;
}

// ═══════════════════════════════════════════════════════════════════════════
// Summary formatting
// ═══════════════════════════════════════════════════════════════════════════

function formatTurnLog(log: TurnLog): string {
    const lines: string[] = [];
    const div = '═'.repeat(72);

    lines.push('');
    lines.push(div);
    lines.push(`  TURN ${log.turn} (Week ${log.turn})`);
    lines.push(div);

    // Territory
    lines.push('  TERRITORY:');
    for (const [f, t] of Object.entries(log.territory)) {
        lines.push(`    ${f.padEnd(6)} ${t.osids} OSIDs (${t.pct}%)`);
    }

    // Commander briefings
    for (const d of log.decisions) {
        lines.push('');
        lines.push(`  ${d.commander_name.toUpperCase()}: "${d.briefing}"`);
        const stanceStr = Object.entries(d.corps_stances).map(([c, s]) => `${c.replace(/^(vrs_|arbih_|hvo_)/, '')}=${s}`).join(', ');
        if (stanceStr) lines.push(`    Stances: ${stanceStr}`);
    }

    // Territory changes
    if (log.territory_changes.length > 0) {
        lines.push('');
        lines.push(`  TERRITORY CHANGES (${log.territory_changes.length}):`);
        for (const [f] of [['RS'], ['RBiH'], ['HRHB']]) {
            const gains = log.territory_changes.filter(c => c.to === f);
            const losses = log.territory_changes.filter(c => c.from === f);
            if (gains.length > 0) lines.push(`    ${f} gained ${gains.length}: ${gains.slice(0, 5).map(c => c.osid.replace('op:', '')).join(', ')}${gains.length > 5 ? ` +${gains.length - 5} more` : ''}`);
            if (losses.length > 0) lines.push(`    ${f} lost ${losses.length}: ${losses.slice(0, 5).map(c => c.osid.replace('op:', '')).join(', ')}${losses.length > 5 ? ` +${losses.length - 5} more` : ''}`);
        }
    }

    // Personnel
    lines.push('');
    lines.push('  FORCE STRENGTH:');
    for (const [f, p] of Object.entries(log.personnel)) {
        lines.push(`    ${f.padEnd(6)} ${p.total.toLocaleString()} / ${p.brigades} bde`);
    }

    // Observations (diagnostic)
    const allObs = log.decisions.flatMap(d => d.observations);
    if (allObs.length > 0) {
        lines.push('');
        lines.push(`  OBSERVATIONS (${allObs.length}):`);
        for (const o of allObs) {
            const icon = o.severity === 'bug' ? '🔴' : o.severity === 'calibration' ? '🟡' : o.severity === 'design_gap' ? '🔵' : '🟠';
            lines.push(`    ${icon} [${o.severity}] ${o.commander}: ${o.description}`);
        }
    }

    if (log.events.length > 0) {
        lines.push('');
        lines.push(`  EVENTS: ${log.events.join(', ')}`);
    }

    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    const baseDir = process.cwd();
    const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'reactive';
    const scenarioPath = 'data/scenarios/apr1992_definitive_40w.json';
    const outDir = join(baseDir, 'runs/three_commanders');
    await mkdir(outDir, { recursive: true });

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║          THREE COMMANDERS — All Factions AI-Driven          ║');
    console.log(`║          Mode: ${mode.padEnd(44)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Load commander profiles
    const cmdDir = join(baseDir, 'tools/claude_plays_vrs/commanders');
    const profiles: CommanderProfile[] = [
        await loadCommander(join(cmdDir, 'rs_mladic.json')),
        await loadCommander(join(cmdDir, 'rbih_halilovic.json')),
        await loadCommander(join(cmdDir, 'hrhb_petkovic.json')),
    ];
    for (const p of profiles) {
        const name = p.successor ? `${p.commander} → ${p.successor.name}` : p.commander;
        console.log(`  ${p.faction}: ${name}`);
    }
    console.log('');

    // Initialize scenario
    console.log('Initializing scenario...');
    const initResult = await runScenario({ scenarioPath, outDirBase: join(baseDir, 'runs'), uniqueRunFolder: true, initialStateOnly: true, baseDir });
    let state = deserializeState(await readFile(initResult.paths.initial_save, 'utf8'));
    console.log(`State loaded. Phase: ${state.meta.phase}. Turn: ${state.meta.turn}. OSIDs: ${Object.keys(state.political?.political_controllers ?? {}).length}`);

    // Load turn dependencies
    const graph = await loadSettlementGraph({ settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'), edgesPath: join(baseDir, 'data/derived/settlement_edges.json') });
    let municipalityPopulation1991: MunicipalityPopulation1991 | undefined;
    try {
        const popRaw = JSON.parse(await readFile(join(baseDir, 'data/derived/municipality_population_1991.json'), 'utf8')) as any;
        const flat: MunicipalityPopulation1991 = {};
        for (const [munId, v] of Object.entries(popRaw.by_mun1990_id ?? {}) as any[]) { flat[munId] = { total: v?.total ?? 0, bosniak: v?.breakdown?.bosniak ?? 0, serb: v?.breakdown?.serb ?? 0, croat: v?.breakdown?.croat ?? 0, other: v?.breakdown?.other ?? 0 }; }
        municipalityPopulation1991 = flat;
    } catch { /* non-fatal */ }
    let municipalityHqSettlement: Record<string, string> | undefined;
    try { const { loadMunicipalityHqSettlement } = await import('../../src/scenario/oob_loader.js'); municipalityHqSettlement = await loadMunicipalityHqSettlement(baseDir); } catch { /* non-fatal */ }
    const eventDefinitions = loadEventDefinitions(0);

    // Run
    const allLogs: TurnLog[] = [];
    const allObservations: Observation[] = [];
    const prevTerritory: Record<string, number> = {};
    const weeks = 40;

    console.log('');
    console.log('═'.repeat(72));
    console.log('  BEGINNING 40-WEEK CAMPAIGN — THREE COMMANDERS');
    console.log('═'.repeat(72));

    for (let week = 0; week < weeks; week++) {
        // Snapshot territory for delta
        const pc = state.political?.political_controllers ?? {};
        const territoryCounts: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
        for (const osid of Object.keys(pc)) { const f = pc[osid]; if (f && territoryCounts[f] !== undefined) territoryCounts[f]++; }
        const prevPc = { ...pc };
        const prevFired = [...(state.military.fired_event_ids ?? [])];

        // Generate decisions for all commanders
        const decisions: CommanderDecision[] = [];
        for (const profile of profiles) {
            if (mode === 'cadet') {
                const cadetStances = getCadetDecision(profile, week);
                if (cadetStances) {
                    decisions.push({
                        faction: profile.faction as FactionId,
                        commander_name: profile.commander,
                        turn: week,
                        briefing: `[Cadet mode] Following pre-scripted strategy.`,
                        corps_stances: cadetStances,
                        observations: [],
                    });
                }
            } else {
                decisions.push(generateReactiveDecision(profile, state, week, prevTerritory));
            }
        }

        // Inject decisions into state
        if (state.meta.phase === 'war') {
            injectAllDecisions(state, decisions);
        }

        // Update prevTerritory for next turn
        for (const [f, count] of Object.entries(territoryCounts)) { prevTerritory[f] = count; }

        // Run one turn
        if (state.meta.phase === 'peace') {
            const { runOneTurn } = await import('../../src/state/turn_pipeline.js');
            const result = runOneTurn(state, { seed: state.meta.seed });
            state = result.state;
        } else {
            const result = await runTurn(state, {
                seed: state.meta.seed, settlementGraph: graph, settlementEdges: graph.edges,
                municipalityPopulation1991,
                municipalityHqSettlement: municipalityHqSettlement && Object.keys(municipalityHqSettlement).length > 0 ? municipalityHqSettlement : undefined,
                eventDefinitions,
            });
            state = result.nextState;
        }

        // Build turn log
        const newPc = state.political?.political_controllers ?? {};
        const newTerritoryCounts: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
        for (const osid of Object.keys(newPc)) { const f = newPc[osid]; if (f && newTerritoryCounts[f] !== undefined) newTerritoryCounts[f]++; }
        const totalOsids = Object.keys(newPc).length;
        const territory: Record<string, { osids: number; pct: string }> = {};
        for (const [f, count] of Object.entries(newTerritoryCounts)) { territory[f] = { osids: count, pct: totalOsids > 0 ? ((count / totalOsids) * 100).toFixed(1) : '0' }; }

        const territoryChanges: Array<{ osid: string; from: string; to: string }> = [];
        for (const osid of Object.keys(newPc)) { if (prevPc[osid] && newPc[osid] && prevPc[osid] !== newPc[osid]) territoryChanges.push({ osid, from: prevPc[osid], to: newPc[osid] }); }

        const formations = state.military.formations ?? {};
        const personnel: Record<string, { total: number; brigades: number }> = { RS: { total: 0, brigades: 0 }, RBiH: { total: 0, brigades: 0 }, HRHB: { total: 0, brigades: 0 } };
        for (const [, f] of Object.entries(formations)) { if (f.kind === 'brigade' && f.status === 'active' && personnel[f.faction]) { personnel[f.faction].total += f.personnel ?? 0; personnel[f.faction].brigades++; } }

        const newFired = state.military.fired_event_ids ?? [];
        const newEvents = newFired.filter((e: string) => !prevFired.includes(e));

        const log: TurnLog = { turn: week, territory, personnel, decisions, territory_changes: territoryChanges, events: newEvents };
        allLogs.push(log);

        // Collect observations
        for (const d of decisions) allObservations.push(...d.observations);

        console.log(formatTurnLog(log));
    }

    // Final summary
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    CAMPAIGN COMPLETE                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const finalPc = state.political?.political_controllers ?? {};
    const finalCounts: Record<string, number> = { RS: 0, RBiH: 0, HRHB: 0 };
    for (const osid of Object.keys(finalPc)) { const f = finalPc[osid]; if (f && finalCounts[f] !== undefined) finalCounts[f]++; }
    const total = Object.keys(finalPc).length;

    console.log('');
    console.log('  FINAL TERRITORY:');
    for (const [f, count] of Object.entries(finalCounts)) console.log(`    ${f.padEnd(6)} ${count}/${total} (${((count / total) * 100).toFixed(1)}%)`);

    // Diagnostic report
    if (allObservations.length > 0) {
        console.log('');
        console.log('═'.repeat(72));
        console.log('  COMMANDER DIAGNOSTIC REPORT');
        console.log('═'.repeat(72));

        const bySeverity: Record<string, Observation[]> = { bug: [], calibration: [], design_gap: [], historical_divergence: [] };
        for (const o of allObservations) bySeverity[o.severity]?.push(o);

        for (const [sev, obs] of Object.entries(bySeverity)) {
            if (obs.length === 0) continue;
            const icon = sev === 'bug' ? '🔴' : sev === 'calibration' ? '🟡' : sev === 'design_gap' ? '🔵' : '🟠';
            console.log(`\n  ${icon} ${sev.toUpperCase()} (${obs.length}):`);
            // Deduplicate by description
            const seen = new Set<string>();
            for (const o of obs) {
                const key = `${o.faction}:${o.description}`;
                if (seen.has(key)) continue;
                seen.add(key);
                console.log(`    [${o.faction} w${o.turn}] ${o.description}`);
                console.log(`      Expected: ${o.expected}`);
                console.log(`      Actual:   ${o.actual}`);
            }
        }
    }

    // Save
    let serialized: string;
    try { serialized = serializeState(state); } catch { serialized = stableStringify(state, 2); }
    await writeFile(join(outDir, 'final_save.json'), serialized, 'utf8');
    await writeFile(join(outDir, 'campaign_log.json'), stableStringify(allLogs, 2), 'utf8');
    await writeFile(join(outDir, 'diagnostic_report.json'), stableStringify(allObservations, 2), 'utf8');

    const hash = createHash('sha256').update(serialized, 'utf8').digest('hex').slice(0, 16);
    console.log('');
    console.log(`  State hash: ${hash}`);
    console.log(`  Observations: ${allObservations.length} total (${allObservations.filter(o => o.severity === 'bug').length} bugs, ${allObservations.filter(o => o.severity === 'calibration').length} calibration, ${allObservations.filter(o => o.severity === 'design_gap').length} design gaps, ${allObservations.filter(o => o.severity === 'historical_divergence').length} divergences)`);
    console.log(`  Run comparison: node tools/compare_painted_vs_sim.cjs runs/three_commanders`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

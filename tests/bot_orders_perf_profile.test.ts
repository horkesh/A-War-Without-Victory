import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
    BOT_ORDERS_PERF_FLAG,
    buildBotOrdersPerfSnapshot,
    botOrdersPerfTime,
    isBotOrdersPerfEnabled,
    resetBotOrdersPerfProfile,
} from '../src/sim/combat/_perf_profile_bot_orders.js';
import { dumpBotOrdersPerfProfile } from '../src/sim/combat/_perf_profile_bot_orders_node.js';

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
        const commanderAssess = readFileSync(resolve('src/sim/combat/commander/assess.ts'), 'utf8');
        const combatPredictor = readFileSync(resolve('src/sim/combat/combat_predictor.ts'), 'utf8');
        const combatMath = readFileSync(resolve('src/sim/combat/combat_math.ts'), 'utf8');
        const brigadeEvalFront = readFileSync(resolve('src/sim/combat/bot_brigade_eval_front.ts'), 'utf8');
        const brigadeEvalAttack = readFileSync(resolve('src/sim/combat/bot_brigade_eval_attack.ts'), 'utf8');
        const brigadeEvalTypes = readFileSync(resolve('src/sim/combat/bot_brigade_eval_types.ts'), 'utf8');
        const brigadeEvalMovement = readFileSync(resolve('src/sim/combat/bot_brigade_eval_movement.ts'), 'utf8');
        const sectorAttackEvaluator = brigadeEvalAttack.slice(
            brigadeEvalAttack.indexOf('export function evaluateSectorAttack'),
            brigadeEvalAttack.indexOf('export function evaluateReorganize'),
        );
        const runnerCli = readFileSync(resolve('tools/scenario_runner/run_scenario.ts'), 'utf8');

        expect(brigadeAi).toContain('botOrdersPerfTime');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.total');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.evaluators');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.eval.garrisonAndDetachments');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.eval.sectorAttack');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.eval.interiorMovement');
        expect(brigadeEvalMovement).toContain('INTERIOR_MOVEMENT_PROFILE_PREFIX');
        expect(brigadeEvalMovement).toContain('.prioritySector');
        expect(brigadeEvalMovement).toContain('.offensiveTarget');
        expect(brigadeEvalMovement).toContain('.ownCorpsFront');
        expect(brigadeEvalMovement).toContain('.fallback');
        expect(brigadeAi).toContain('buildSectorAssignmentByBrigade');
        expect(brigadeAi).toContain('sectorAssignmentByBrigade.get(brigade.id)');
        expect(brigadeAi).toContain('buildAdjacentEnemyOsidsByLoc');
        expect(brigadeAi).toContain('adjacentEnemyByLoc.get(loc)');
        expect(brigadeAi).toContain('buildCorpsTerritoryOsidsByCorps');
        expect(brigadeAi).toContain('corpsTerritoryOsidsByCorps');
        expect(brigadeAi).toContain('buildOfficerCombatLookup');
        expect(brigadeAi).toContain('bot_orders.executeFactionDirectives.officerIndex');
        expect(brigadeAi).toContain('officerCombatLookup');
        expect(brigadeAi).toContain('let officerCombatLookup');
        expect(brigadeAi).toContain('getOfficerCombatLookup');
        expect(brigadeEvalTypes).toContain('officerCombatLookup?: OfficerCombatLookup');
        expect(brigadeEvalTypes).toContain('getOfficerCombatLookup?: () => OfficerCombatLookup | undefined');
        expect(brigadeEvalFront).toContain('SECTOR_MARCH_PROFILE_PREFIX');
        expect(brigadeEvalFront).toContain('.offAssignedFront');
        expect(brigadeEvalFront).toContain('.sectorReassignment');
        expect(brigadeEvalFront).toContain('.sectorAssignmentContext');
        expect(brigadeEvalFront).toContain('.assignedSectorLookup');
        expect(brigadeEvalFront).toContain('.pendingHomeReturn');
        expect(brigadeEvalFront).toContain('.frontSet');
        expect(brigadeEvalFront).toContain('.frontMembership');
        expect(brigadeEvalFront).toContain('.reserveNearFront');
        expect(brigadeEvalFront).toContain('.enclaveGuard');
        expect(brigadeEvalFront).toContain('.destination');
        expect(brigadeEvalFront).toContain('.trapReroute');
        expect(brigadeEvalFront).toContain('.retroactiveTooth');
        expect(brigadeEvalFront).toContain('.overstackRedistribution');
        expect(brigadeEvalFront).toContain('.overstackRedistribution.gate');
        expect(brigadeEvalFront).toContain('.overstackRedistribution.countHere');
        expect(brigadeEvalFront).toContain('.overstackRedistribution.rankCandidates');
        expect(brigadeEvalFront).toContain('.overstackRedistribution.candidateLoop');
        expect(brigadeEvalFront).toContain('.overstackRedistribution.destCount');
        expect(brigadeEvalFront).toContain('.overstackRedistribution.destination');
        expect(brigadeEvalFront).toContain('RETURN_TO_CORPS_PROFILE_PREFIX');
        expect(brigadeEvalFront).toContain('.returnToCorps.rosterScan');
        expect(brigadeEvalFront).toContain('.returnToCorps.territoryCheck');
        expect(brigadeEvalFront).toContain('.returnToCorps.collectTargets');
        expect(brigadeEvalFront).toContain('.returnToCorps.bfs');
        expect(brigadeEvalFront).toContain('.returnToCorps.walkBack');
        expect(brigadeEvalFront).toContain('corpsTerritoryOsidsByCorps?.get(corpsId)');
        expect(brigadeEvalFront).toContain('.pocketEvacuation.assignedSectorLookup');
        expect(brigadeEvalAttack).toContain('HOME_DEFENSE_PROFILE_PREFIX');
        expect(brigadeEvalAttack).toContain('.homeDefense.deepRearNearFront');
        expect(brigadeEvalAttack).toContain('DEFENSIVE_PROFILE_PREFIX');
        expect(brigadeEvalAttack).toContain('.defensive.deepRearNearFront');
        expect(brigadeEvalAttack).toContain('.defensive.selfRetreatPredictTargets');
        expect(brigadeEvalAttack).toContain('.defensive.selfRetreatSectorLookup');
        expect(brigadeEvalAttack).toContain('.defensive.sectorCounterAttackSectorLookup');
        expect(brigadeEvalAttack).toContain('.defensive.sectorCounterAttackCollectTargets');
        expect(brigadeEvalAttack).toContain('.defensive.sectorCounterAttackPredictTargets');
        expect(brigadeEvalAttack).toContain('.defensive.frontGapCountHere');
        expect(brigadeEvalAttack).toContain('.defensive.frontGapSearch');
        expect(brigadeEvalAttack).toContain('SECTOR_ATTACK_PROFILE_PREFIX');
        expect(brigadeEvalAttack).toContain('.sectorAttack.offAssignedFront');
        expect(brigadeEvalAttack).toContain('.sectorAttack.planningApproaches');
        expect(brigadeEvalAttack).toContain('.sectorAttack.planningApproachPath');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionPredictTargets');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionDirectObjective');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionDirectObjective.gates');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionDirectObjective.predict');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionDirectObjective.predictCombatOutcome');
        expect(sectorAttackEvaluator).toContain('SECTOR_ATTACK_DIRECT_OBJECTIVE_PREDICT_PROFILE_PREFIX,');
        expect(sectorAttackEvaluator).toContain('officerCombatLookup');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionTacticalAdjacency');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionAdjacentParticipants');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionApproachPath');
        expect(brigadeEvalAttack).toContain('.sectorAttack.executionIntermediateTargets');
        expect(sectorAttackEvaluator).toContain('predictCombatOutcome');
        expect(sectorAttackEvaluator.indexOf('.sectorAttack.executionApproachPath')).toBeLessThan(
            sectorAttackEvaluator.indexOf('.sectorAttack.executionPredictTargets'),
        );
        expect(brigadeEvalAttack).not.toContain('evaluateUncontestedOccupation');
        expect(commanderLoop).toContain('botOrdersPerfTime');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.buildBriefing');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.commanderDecide');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.decide.assessSituation');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.decide.allocateBrigades');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.decide.managePlan');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.decide.assembleBeliefState');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.decide.makeDecisions');
        expect(commanderLoop).toContain('commander.runCommanderForCorps.decide.emitCommanderOutput');
        expect(commanderAssess).toContain('currentZoneOsids');
        expect(commanderAssess).toContain('commander.runCommanderForCorps.decide.assessSituation.collectCorpsOsids');
        expect(commanderAssess).toContain('commander.runCommanderForCorps.decide.assessSituation.detectZones');
        expect(commanderAssess).toContain('commander.runCommanderForCorps.decide.assessSituation.evaluateForces');
        expect(commanderAssess).toContain('commander.runCommanderForCorps.decide.assessSituation.concentrationZones');
        expect(commanderAssess).toContain('commander.runCommanderForCorps.decide.assessSituation.assessThreats');
        const zoneDetection = readFileSync(resolve('src/sim/combat/commander/zone_detection.ts'), 'utf8');
        const friendlyComponentHelper = zoneDetection.slice(
            zoneDetection.indexOf('function collectFriendlyComponentsExcluding'),
            zoneDetection.indexOf('// detectZones'),
        );
        expect(zoneDetection).toContain('DETECT_ZONES_PROFILE_PREFIX');
        expect(zoneDetection).toContain('.groupComponents');
        expect(zoneDetection).toContain('.buildZoneAssessments');
        expect(zoneDetection).toContain('.frontFacts');
        expect(zoneDetection).toContain('.depth');
        expect(zoneDetection).toContain('.corridorWidth');
        expect(zoneDetection).toContain('.mustHold');
        expect(zoneDetection).toContain('memberCount');
        expect(zoneDetection).not.toContain('members: Set<string>');
        expect(zoneDetection).not.toContain('component.members.size');
        expect(zoneDetection).not.toContain('function bfsCountExcluding');
        expect(friendlyComponentHelper).toContain('let queue = [source]');
        expect(friendlyComponentHelper).not.toContain('let frontier = [source]');
        expect(friendlyComponentHelper).not.toContain('next.sort(strictCompare)');
        const commanderEmit = readFileSync(resolve('src/sim/combat/commander/emit.ts'), 'utf8');
        expect(commanderEmit).toContain('commander.runCommanderForCorps.decide.emitCommanderOutput.buildDirective');
        expect(commanderEmit).toContain('commander.runCommanderForCorps.decide.emitCommanderOutput.buildOperations');
        expect(commanderEmit).toContain('commander.runCommanderForCorps.decide.emitCommanderOutput.buildSectorStances');
        expect(commanderEmit).toContain('commander.runCommanderForCorps.decide.emitCommanderOutput.buildUpdatedState');
        expect(commanderEmit).toContain('commander.runCommanderForCorps.decide.emitCommanderOutput.buildPlanUpdates');
        expect(commanderEmit).toContain('commander.runCommanderForCorps.decide.emitCommanderOutput.buildPrepositioningOrders');
        expect(commanderEmit).toContain('BUILD_OPERATIONS_PROFILE_PREFIX');
        expect(commanderEmit).toContain('.plan.activeSlotUsers');
        expect(commanderEmit).toContain('.plan.primaryPool');
        expect(commanderEmit).toContain('.plan.attachedPool');
        expect(commanderEmit).toContain('.plan.reachableEnemyOsids');
        expect(commanderEmit).toContain('.plan.objectives');
        expect(commanderEmit).toContain('.plan.buildOperation');
        expect(commanderEmit).toContain('.probe.cooldown');
        expect(commanderEmit).toContain('.probe.selectBrigade');
        expect(commanderEmit).toContain('.probe.deriveObjectives');
        expect(commanderEmit).toContain('.probe.deriveObjectives.terrainCache');
        expect(commanderEmit).toContain('.probe.deriveObjectives.enemyTargets');
        expect(commanderEmit).toContain('.probe.deriveObjectives.directEnemyTargets');
        expect(commanderEmit).toContain('.probe.deriveObjectives.predictDirectTargets');
        expect(commanderEmit).toContain('.probe.deriveObjectives.predictedTargetMap');
        expect(commanderEmit).toContain('.probe.deriveObjectives.rankTargets');
        expect(commanderEmit).toContain('.probe.deriveObjectives.pickObjective');
        expect(commanderEmit).toContain('.probe.reachability');
        expect(commanderEmit).toContain('.probe.buildProbeOperation');
        expect(commanderEmit).toContain('predictDirectEnemyTargets');
        expect(commanderEmit).toContain('predictCombatOutcome');
        expect(commanderEmit).toContain('.predictDirectTargets.predictCombatOutcome');
        expect(commanderEmit).not.toContain('predictAllAdjacentTargets');
        expect(commanderEmit).toContain('directEnemyTargets');
        expect(commanderEmit).toContain('predictedTargetByOsid');
        expect(commanderEmit).toContain('buildOfficerCombatLookup');
        expect(commanderEmit).toContain('.probe.deriveObjectives.predictDirectTargets.officerIndex');
        expect(commanderEmit).toContain('officerCombatLookup');
        expect(commanderEmit).toContain('profilePrefix,');
        expect(commanderEmit).toContain('officerCombatLookup,');
        expect(combatPredictor).toContain('predictorPerfTime');
        expect(combatPredictor).toContain('profilePrefix?: string');
        expect(combatPredictor).toContain('.defenderFormationScan');
        expect(combatPredictor).toContain('.sectorLookup');
        expect(combatPredictor).toContain('.sectorDefensePower');
        expect(combatPredictor).toContain('.attackerPower');
        expect(combatPredictor).toContain('.casualties');
        expect(combatPredictor).toContain('.overextension');
        expect(combatPredictor).toContain('rankDefendersByPowerWithEntries');
        expect(combatPredictor).toContain('powerByFormationId');
        expect(combatPredictor).toContain('powerByFormationId.get(b.id)');
        expect(combatPredictor).toContain('getStandingOgDefenseBrigadeIds(sector)');
        expect(combatPredictor).toContain('isStandingOgDefenseBrigadeAvailable(state, f.id)');
        expect(combatPredictor).toContain('const avgReactivePower = avgBrigadePower');
        expect(combatPredictor).toContain('attackerCount * avgReactivePower * REACTIVE_DEFENSE_RATIO');
        expect(combatPredictor).toContain('collectDefenderFormationsAtTarget');
        expect(combatPredictor).toContain('let defenderFormations: FormationState[] | null = null');
        expect(combatPredictor).toContain('getDefenderFormations()');
        expect(combatPredictor).toContain('.rankDefendersByPower.computeDefenderPower');
        expect(combatPredictor).toContain('.rankDefendersByPower.sortAndTotal');
        expect(combatPredictor).toContain('defenderPowerProfilePrefix');
        expect(combatPredictor).toContain('profilePrefix ? `${profilePrefix}.rankDefendersByPower.computeDefenderPower` : undefined');
        expect(combatPredictor).toContain('defenderPowerProfileTime');
        expect(combatPredictor).toContain('rankDefendersByPowerWithEntries(sectorBrigades, sector, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus, profilePrefix, officerLookup)');
        expect(combatPredictor).toContain('buildLocalFrontDensityModifierByFormationIdForSector');
        expect(combatPredictor).toContain('buildLocalFrontDensityModifierByFormationIdForSector(sector)');
        expect(combatPredictor).toContain('.rankDefendersByPower.frontDensityIndex');
        expect(combatPredictor).toContain('officerLookup?: OfficerCombatLookup');
        expect(combatPredictor).toContain('defenders.length > 1');
        expect(combatPredictor).toContain('frontDensityModifierByFormationId');
        expect(combatPredictor).toContain('officerLookup,');
        expect(combatMath).toContain('type CombatMathProfileTimer');
        expect(combatMath).toContain('combatMathProfileTime');
        expect(combatMath).toContain('type LocalFrontDensityModifierLookup');
        expect(combatMath).toContain('type OfficerCombatLookup');
        expect(combatMath).toContain('densityModifierByFormationId?: LocalFrontDensityModifierLookup');
        expect(combatMath).toContain('officerLookup?: OfficerCombatLookup');
        expect(combatMath).toContain('getLocalFrontDensityModifier(state, formation, densityModifierByFormationId)');
        expect(combatMath).toContain("getThreeTierOfficerMod(formation, state, 'defend', officerLookup)");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.base'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.postureContext'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.supply'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.terrainFactors'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.frontDensity'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.officer'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.fatigue'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.home'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.morale'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.environmentCap'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.powerProduct'");
        expect(combatMath).toContain("combatMathProfileTime(profileTime, '.equipmentQuality'");
        expect(combatMath).not.toContain("'.computeDefenderPower.base'");
        const commanderBriefing = readFileSync(resolve('src/sim/combat/commander/briefing.ts'), 'utf8');
        expect(commanderBriefing).toContain('botOrdersPerfTime');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.getCorpsSectors');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.getCorpsSubordinates');
        const botCorpsAi = readFileSync(resolve('src/sim/combat/bot_corps_ai.ts'), 'utf8');
        const botCorpsHelpers = readFileSync(resolve('src/sim/combat/bot_corps_helpers.ts'), 'utf8');
        expect(botCorpsAi).toContain('commander.runCommanderForCorps.corpsSubordinatesIndex');
        expect(botCorpsAi).toContain('buildCorpsSubordinatesByCorps');
        expect(commanderBriefing).toContain('corpsSubordinatesByCorps');
        expect(botCorpsHelpers).toContain('buildCorpsSubordinatesByCorps');
        expect(botCorpsAi).toContain('commander.runCommanderForCorps.enemyEquipmentSummaryContext');
        expect(botCorpsAi).toContain('buildEnemyEquipmentSummaryContext');
        expect(commanderBriefing).toContain('enemyEquipmentSummaryContext');
        expect(commanderBriefing).toContain('buildEnemyEquipmentSummaryContext');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.frontGeometry');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.frontGeometry.collectOsids');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.frontGeometry.analyze');
        expect(commanderBriefing).toContain('AWWV_COMMANDER_FRONT_GEOMETRY');
        expect(commanderBriefing).toContain('collectFrontGeometryEnemyOsids');
        expect(commanderBriefing).toContain('subSegment.enemy_osids');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.collectIntelData');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.collectFatigueSummary');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.enemyEquipmentSummary');
        expect(commanderBriefing).toContain('buildEnemySectorByOsid');
        expect(commanderBriefing).toContain('enemySectorByOsid.get(enemyOsid)');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.adjacentCorps');
        expect(commanderBriefing).toContain('commander.runCommanderForCorps.buildBriefing.campaignIntent');
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
        expect(withoutComments).not.toMatch(/node:fs/);
        expect(withoutComments).not.toMatch(/node:path/);
        expect(withoutComments).not.toMatch(/writeFileSync|mkdirSync/);
        expect(withoutComments).toMatch(/hrtimeBigint\s*\(/);
    });

});

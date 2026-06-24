import { describe, expect, it } from 'vitest';
import { buildOpordDisplayModel } from '../src/ui/map/components/ops_modal/opordDisplay';
import { readFileSync } from 'node:fs';
import type { OpsPlanState } from '../src/ui/map/components/ops_modal/types';
import { formatPosture, toTitleCase } from '../src/ui/map/utils/formatters';

describe('buildOpordDisplayModel', () => {
    it('uses display names instead of raw OSIDs in OPORD-facing labels', () => {
        const plan: OpsPlanState = {
            opName: 'Operation Neretva',
            opType: 'general_offensive',
            tempo: 'standard',
            tolerance: 'victory',
            artilleryPreparation: true,
            activeAxisId: 'axis_main',
            schwerpunktOsid: 'op:sarajevo',
            defaultStagingOsid: '',
            axes: [
                {
                    id: 'axis_main',
                    name: 'Main Axis',
                    brigadeIds: ['b1', 'b2'],
                    objectives: ['op:sarajevo', 'op:pale'],
                    stagingOsid: 'op:kiseljak',
                },
            ],
        };

        const model = buildOpordDisplayModel(plan, {
            'op:sarajevo': 'Sarajevo',
            'op:pale': 'Pale',
            'op:kiseljak': 'Kiseljak',
        });

        expect(model.axes[0]?.stagingLabel).toBe('Kiseljak');
        expect(model.schwerpunktLabel).toBe('Sarajevo');
        expect(model.objectiveLabels).toEqual(['Sarajevo', 'Pale']);
    });

    it('keeps the live objective panel free of staging OSID jargon', () => {
        const source = readFileSync(
            new URL('../src/ui/map/components/ops_modal/ObjectiveList.tsx', import.meta.url),
            'utf8',
        );

        expect(source).toContain("t('opsPlanning.phase.stagingArea')");
        expect(source).not.toContain('Staging OSID');
    });

    it('keeps tactical shell faction labels player-safe in OOB and operation briefing surfaces', () => {
        const oobSource = readFileSync(
            new URL('../src/ui/map/components/OOBSidebar.tsx', import.meta.url),
            'utf8',
        );
        const briefingSource = readFileSync(
            new URL('../src/ui/map/components/OperationBriefingModal.tsx', import.meta.url),
            'utf8',
        );
        const attackSource = readFileSync(
            new URL('../src/ui/map/components/AttackConfirmation.tsx', import.meta.url),
            'utf8',
        );
        const eventSource = readFileSync(
            new URL('../src/ui/map/components/EventModal.tsx', import.meta.url),
            'utf8',
        );
        const decisionSource = readFileSync(
            new URL('../src/ui/map/components/EventDecisionModal.tsx', import.meta.url),
            'utf8',
        );
        const corpsDetailSource = readFileSync(
            new URL('../src/ui/map/components/CorpsDetail.tsx', import.meta.url),
            'utf8',
        );
        const sectorPanelSource = readFileSync(
            new URL('../src/ui/map/components/CorpsFrontPanel.tsx', import.meta.url),
            'utf8',
        );
        const authorizeSource = readFileSync(
            new URL('../src/ui/map/components/ops_modal/AuthorizePhase.tsx', import.meta.url),
            'utf8',
        );
        const commanderSelectionSource = readFileSync(
            new URL('../src/ui/map/components/CommanderSelectionModal.tsx', import.meta.url),
            'utf8',
        );
        const commanderPhaseSource = readFileSync(
            new URL('../src/ui/map/components/ops_modal/CommanderPhase.tsx', import.meta.url),
            'utf8',
        );
        const officerUtilsSource = readFileSync(
            new URL('../src/ui/map/utils/officerUtils.ts', import.meta.url),
            'utf8',
        );
        const operationsSectionSource = readFileSync(
            new URL('../src/ui/map/components/army_hq/OperationsSection.tsx', import.meta.url),
            'utf8',
        );
        const personnelContentSource = readFileSync(
            new URL('../src/ui/map/components/army_hq/PersonnelContent.tsx', import.meta.url),
            'utf8',
        );

        expect(oobSource).toContain('getPlayerSafeMilitaryFactionName(faction)');
        expect(oobSource).toContain('getPlayerSafeMilitaryFactionName(op.faction)');
        expect(oobSource).not.toContain('View ${faction} army summary');
        expect(briefingSource).toContain('getPlayerSafeMilitaryFactionName(operation.faction)');
        expect(briefingSource).toContain('findPlayerFacingOperationByKey');
        expect(briefingSource).not.toContain('loadedGameState.operations?.find');
        expect(attackSource).toContain('getPlayerSafeMilitaryFactionName(attacker.faction)');
        expect(attackSource).toContain('getPlayerSafeMilitaryFactionName(defender.faction)');
        expect(eventSource).toContain('getPlayerSafePoliticalFactionName(effect.faction)');
        expect(eventSource).toContain("getPlayerSafePoliticalFactionName('RBiH')");
        expect(decisionSource).toContain('function eventDecisionFactionLabel');
        expect(decisionSource).toContain("case 'RBiH': return t('desk.faction.rbih')");
        expect(decisionSource).toContain('eventDecisionFactionLabel(localizedDecision.faction)');
        expect(corpsDetailSource).toContain('getPlayerSafeMilitaryFactionName(corpsFormation.faction)');
        expect(corpsDetailSource).toContain('filterPlayerFacingOperations');
        expect(corpsDetailSource).not.toContain('loadedGameState?.operations?.filter');
        expect(corpsDetailSource).toContain("t('corpsDetail.prepareOperationInHq')");
        expect(sectorPanelSource).toContain('getPlayerSafeMilitaryFactionName(sector.faction)');
        expect(sectorPanelSource).toContain('filterPlayerFacingOperations');
        expect(sectorPanelSource).not.toContain('loadedGameState?.operations ?? []');
        expect(sectorPanelSource).toContain('getOsidDisplayName(objective, osidDisplayNames)');
        expect(sectorPanelSource).not.toContain('osidDisplayNames?.[objective] ?? objective');
        expect(oobSource).toContain('filterPlayerFacingOperations');
        expect(authorizeSource).toContain('findPlayerFacingOperationByKey');
        expect(authorizeSource).not.toContain('loadedGameState.operations ?? []).find');
        expect(commanderSelectionSource).toContain('findPlayerFacingOperationByKey');
        expect(commanderSelectionSource).not.toContain('operations?.find((o) => o.corps_id === context.corpsId && o.name === context.operationName)');
        expect(briefingSource).toContain('finiteCommanderRating(commander?.aggressiveness, 3)');
        expect(briefingSource).toContain('finiteCommanderRating(commander?.competence, 3)');
        expect(briefingSource).not.toContain('commander?.competence ??');
        expect(commanderSelectionSource).toContain('sortableOfficerRating(b.officer.competence) - sortableOfficerRating(a.officer.competence)');
        expect(commanderSelectionSource).toContain('getPreparationMaxTurns(preparationAggressiveness(officer.aggressiveness))');
        expect(commanderPhaseSource).toContain('sortableOfficerRating(b.officer.competence) - sortableOfficerRating(a.officer.competence)');
        expect(commanderPhaseSource).toContain('getPreparationMaxTurns(preparationAggressiveness(officer.aggressiveness))');
        expect(officerUtilsSource).toContain('Number.isFinite(a.competence) ? a.competence : -1');
        expect(operationsSectionSource).toContain("return 'Profile unreported'");
        expect(operationsSectionSource).toContain('formatOfficerRating(cmdOfficer.competence)');
        expect(operationsSectionSource).not.toContain('(cmdOfficer.competence * 100).toFixed(0)');
        expect(personnelContentSource).toContain("const displayValue = reported ? value.toFixed(1) : t('corpsFront.unreported')");
    });
});

describe('Army-HQ raw enum + faction-slug resolution (QA Batch F)', () => {
    it('resolves corps/sector stance enums to player-facing labels, not raw tokens', () => {
        // Single-word and multi-word stance enums humanize cleanly.
        expect(formatPosture('offensive')).toBe('Offensive');
        expect(toTitleCase('active_defense')).toBe('Active Defense');
        // Never leaks the raw snake_case token.
        expect(formatPosture('active_defense')).not.toContain('_');
        expect(toTitleCase('decisive_victory')).toBe('Decisive Victory');
    });

    it('renders opposing factions through the player-safe military name resolver', () => {
        const sectorPanelSource = readFileSync(
            new URL('../src/ui/map/components/CorpsFrontPanel.tsx', import.meta.url),
            'utf8',
        );
        // Identified-hostiles chips resolve RS/RBiH/HRHB → VRS/ARBiH/HVO.
        expect(sectorPanelSource).toContain('getPlayerSafeMilitaryFactionName(f)');
        // Corps stance no longer renders the bare enum.
        expect(sectorPanelSource).toContain('stanceLabel(corpsStance)');
        // Commander recommendation no longer renders the raw launch/postpone/abort enum.
        expect(sectorPanelSource).toContain('commanderAssessmentLabel(op.commander_assessment)');
        expect(sectorPanelSource).toContain("launch: 'Recommends launch'");
    });

    it('resolves commander assessment, recovery reason, axis status, and grade factors in OperationsSection', () => {
        const opsSource = readFileSync(
            new URL('../src/ui/map/components/army_hq/OperationsSection.tsx', import.meta.url),
            'utf8',
        );
        expect(opsSource).toContain('COMMANDER_ASSESSMENT_LABELS[op.commander_assessment]');
        expect(opsSource).not.toContain('op.commander_assessment.toUpperCase()');
        expect(opsSource).toContain('RECOVERY_REASON_LABELS[op.recovery_reason]');
        expect(opsSource).not.toContain("op.recovery_reason.toUpperCase().replace(/_/g, ' ')");
        expect(opsSource).toContain('AXIS_STATUS_LABELS[axis.status]');
        expect(opsSource).toContain('GRADE_FACTOR_LABELS[key]');
        // FULL DECISION-ROOM CONVERGENCE: the request-op input moved OUT of Army HQ
        // into the Presidential Decision Room (DirectiveCard). OperationsSection no
        // longer hosts the request-op affordance, so its player-safe placeholder is no
        // longer pinned here — DirectiveCard's directive.targetInput.placeholder owns
        // the player-safe "settlement, not OSID" wording (see directive_card tests).
        expect(opsSource).not.toContain('Objective OSID (e.g. bihac_1)');
        expect(opsSource).not.toContain("t('operationsSection.requestOp.placeholder')");
    });

    it('maps battle/engagement outcome chips in Sectors/Orbat sections', () => {
        const sectorsSource = readFileSync(
            new URL('../src/ui/map/components/army_hq/SectorsSection.tsx', import.meta.url),
            'utf8',
        );
        const orbatSource = readFileSync(
            new URL('../src/ui/map/components/army_hq/OrbatSection.tsx', import.meta.url),
            'utf8',
        );
        expect(sectorsSource).toContain('sectorBattleOutcomeLabel(battle.outcome)');
        expect(sectorsSource).not.toContain('toTitleCase(battle.outcome)');
        expect(sectorsSource).not.toContain("battle.outcome.replace(/_/g, ' ')");
        expect(orbatSource).toContain('engagementOutcomeLabel(e.outcome)');
        expect(orbatSource).not.toContain('toTitleCase(e.outcome)');
        expect(orbatSource).not.toContain("e.outcome.replace(/_/g, ' ')");
    });
});

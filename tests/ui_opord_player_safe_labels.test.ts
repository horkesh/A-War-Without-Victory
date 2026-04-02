import { describe, expect, it } from 'vitest';
import { buildOpordDisplayModel } from '../src/ui/map/components/ops_modal/opordDisplay';
import { readFileSync } from 'node:fs';
import type { OpsPlanState } from '../src/ui/map/components/ops_modal/types';

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

        expect(source).toContain('Staging Area');
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
        const operationDetailSource = readFileSync(
            new URL('../src/ui/map/components/OperationDetail.tsx', import.meta.url),
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
        expect(decisionSource).toContain('getPlayerSafePoliticalFactionName(decision.faction)');
        expect(operationDetailSource).toContain('getPlayerSafeMilitaryFactionName(op.faction)');
        expect(corpsDetailSource).toContain('getPlayerSafeMilitaryFactionName(corpsFormation.faction)');
        expect(corpsDetailSource).toContain('filterPlayerFacingOperations');
        expect(corpsDetailSource).not.toContain('loadedGameState?.operations?.filter');
        expect(corpsDetailSource).toContain('Full command review belongs in Army HQ');
        expect(sectorPanelSource).toContain('getPlayerSafeMilitaryFactionName(sector.faction)');
        expect(sectorPanelSource).toContain('filterPlayerFacingOperations');
        expect(sectorPanelSource).not.toContain('loadedGameState?.operations ?? []');
        expect(sectorPanelSource).toContain('Full command review belongs in Army HQ');
        expect(oobSource).toContain('filterPlayerFacingOperations');
        expect(authorizeSource).toContain('findPlayerFacingOperationByKey');
        expect(authorizeSource).not.toContain('loadedGameState.operations ?? []).find');
        expect(commanderSelectionSource).toContain('findPlayerFacingOperationByKey');
        expect(commanderSelectionSource).not.toContain('operations?.find((o) => o.corps_id === context.corpsId && o.name === context.operationName)');
    });
});

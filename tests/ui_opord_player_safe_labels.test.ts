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
});

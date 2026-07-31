import { describe, expect, it } from 'vitest';

import { buildArmyHqPresidentialHandoff } from '../../src/ui/map/data/armyHqPresidentialHandoff.js';

describe('Army HQ presidential handoff', () => {
    it('turns critical military reporting without an executable request into explicit presidential restraint', () => {
        const handoff = buildArmyHqPresidentialHandoff({
            corpsFormations: [
                { id: 'first', commandStrainLabel: 'compromised' },
                { id: 'second', commandStrainLabel: 'healthy' },
            ],
            readiness: [
                { corpsId: 'first', grade: 'DEGRADED', hasThreat: true },
                { corpsId: 'second', grade: 'INEFFECTIVE', hasThreat: false },
            ],
            pendingReviewCount: 0,
            pendingReserveCount: 0,
        });

        expect(handoff).toEqual({
            status: 'critical_hold',
            criticalCommandCount: 2,
            filedActionCount: 0,
            route: 'desk',
        });
    });

    it('routes a filed Army HQ proposal to the existing Decision Room instead of inventing another lever', () => {
        const handoff = buildArmyHqPresidentialHandoff({
            corpsFormations: [{ id: 'first', commandStrainLabel: 'compromised' }],
            readiness: [{ corpsId: 'first', grade: 'INEFFECTIVE', hasThreat: true }],
            pendingReviewCount: 1,
            pendingReserveCount: 1,
        });

        expect(handoff).toEqual({
            status: 'filed_action',
            criticalCommandCount: 1,
            filedActionCount: 2,
            route: 'decision_room',
        });
    });
});

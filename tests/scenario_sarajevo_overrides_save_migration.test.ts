import { describe, expect, it } from 'vitest';

import { normalizeScenario } from '../src/scenario/scenario_loader.js';
import { buildScenarioStartupState } from '../src/scenario/scenario_runner.js';
import { getSarajevoSiegeParams } from '../src/sim/combat/sarajevo_siege_params.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

describe('Sarajevo overrides save/load coordination', () => {
    it('loads old scenarios without overrides and resolves code defaults', async () => {
        const scenario = normalizeScenario({
            scenario_id: 'sarajevo_pre_override_shape',
            weeks: 1,
            turns: [],
        });

        const startup = await buildScenarioStartupState(scenario, process.cwd());

        expect(scenario.sarajevo_overrides).toBeUndefined();
        expect(getSarajevoSiegeParams(startup.state).defense_bonus).toBe(0.4);
    });

    it('preserves overrides through startup state serialization round-trip', async () => {
        const scenario = normalizeScenario({
            scenario_id: 'sarajevo_post_override_shape',
            weeks: 1,
            turns: [],
            sarajevo_overrides: { defense_bonus: 0.5 },
        });

        const startup = await buildScenarioStartupState(scenario, process.cwd());
        const roundTripped = deserializeState(serializeState(startup.state));

        expect(roundTripped.meta.sarajevo_overrides).toEqual({ defense_bonus: 0.5 });
        expect(getSarajevoSiegeParams(roundTripped).defense_bonus).toBe(0.5);
    });
});

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadStateFromPath } from '../src/desktop/desktop_sim.js';
import { getStartupSnapshotPath } from '../src/scenario/startup_snapshot.js';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import { selectBotEventResponse } from '../src/sim/events/evaluate_events.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

/**
 * EV1 (2026-11-14): pins how the bot resolves the events EV1 touched, so the zero-drift claim
 * is a test, not a code reading.
 *
 * 1. `staff_recommended_response_id` never reaches the bot. The six design counterfactuals and
 *    the NATO ultimatum got one; the headless pick must stay where the political scorer puts it.
 * 2. `us_halts_federation_advance_1995` got `historical_default_response_id: comply` and
 *    `bot_response_logic: historical` (was `accept_first` -> options[0] = comply), so the pick
 *    and its decision source (`bot_ai_default`) are unchanged.
 * 3. `drina_cleansing_decision_1992` stays unauthored (§6 panel). Headless resolves it by array
 *    position (`bot_v1` -> `systematic`): a positional artefact, not a historical claim. In
 *    emergent mode with Observer forcing an authored default, there is none, so it falls to the
 *    political scorer. Both are recorded hazards owned by
 *    docs/plans/2026-08-31-s6-ring3-half-migration-packet.md; this test makes them visible if
 *    they change.
 */

const baseDir = process.cwd();

async function loadOpeningState(): Promise<GameState> {
    return (await loadStateFromPath(getStartupSnapshotPath(baseDir, 'apr_1992'), baseDir)).state;
}

function catalog(): Map<string, EventDefinition> {
    return new Map(
        loadEventDefinitionsFromDir(0, resolve(baseDir, 'data/scenarios/events')).map((def) => [def.id, def]),
    );
}

function requireDef(defs: Map<string, EventDefinition>, id: string): EventDefinition {
    const def = defs.get(id);
    if (!def) throw new Error(`missing event ${id}`);
    return def;
}

describe('EV1: history-mode resolution of the nine events', () => {
    it('keeps staff recommendations out of the bot: headless still uses the political scorer', async () => {
        const defs = catalog();
        const state = await loadOpeningState();
        state.meta.decision_mode = 'historical';
        const cases: Array<[string, 'RBiH' | 'RS']> = [
            ['strategic_posture_review_rbih', 'RBiH'],
            ['strategic_posture_review_rs', 'RS'],
            ['nato_ultimatum_sarajevo_1994', 'RS'],
            ['csq_separate_peace_overture', 'RBiH'],
            ['csq_tripartite_federation_overture', 'RBiH'],
            ['csq_partition_referendum_proposal', 'RBiH'],
            ['csq_third_party_mediation_offered', 'RBiH'],
        ];
        for (const [id, faction] of cases) {
            const def = requireDef(defs, id);
            expect(def.staff_recommended_response_id, id).toBeTruthy();
            expect(def.historical_default_response_id, id).toBeUndefined();
            expect(selectBotEventResponse(state, def, faction, false).decisionSource, id).toBe('bot_political');
        }
    });

    it('resolves the US halt to comply through the authored default, as before', async () => {
        const def = requireDef(catalog(), 'us_halts_federation_advance_1995');
        const state = await loadOpeningState();
        state.meta.decision_mode = 'historical';
        expect(def.historical_default_response_id).toBe('comply');
        // Was `accept_first` (options[0] = comply). With an authored default the acceptance
        // report requires `historical` logic; both resolve to comply via bot_ai_default.
        expect(def.bot_response_logic).toBe('historical');
        expect(def.response_options?.[0]?.id).toBe('comply');
        const selection = selectBotEventResponse(state, def, 'RBiH', false);
        expect(selection.chosen.id).toBe('comply');
        expect(selection.decisionSource).toBe('bot_ai_default');
    });

    it('leaves Drina unauthored: positional pick headless, political scorer under emergent Observer', async () => {
        const def = requireDef(catalog(), 'drina_cleansing_decision_1992');
        expect(def.historical_default_response_id).toBeUndefined();
        expect(def.staff_recommended_response_id).toBeUndefined();

        const historical = await loadOpeningState();
        historical.meta.decision_mode = 'historical';
        const headless = selectBotEventResponse(historical, def, 'RS', false);
        expect(headless.chosen.id).toBe('systematic');
        expect(headless.decisionSource).toBe('bot_v1');

        const emergent = await loadOpeningState();
        emergent.meta.decision_mode = 'emergent';
        expect(selectBotEventResponse(emergent, def, 'RS', true).decisionSource).toBe('bot_political');
    });
});

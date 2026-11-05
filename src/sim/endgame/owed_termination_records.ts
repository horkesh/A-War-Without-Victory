/**
 * Terminal write of causally-owed no-choice records (see
 * `fireOwedFollowUpsAtTermination` in evaluate_events.ts).
 *
 * Every game-ending writer (peace plans, war termination, Dayton) freezes the endgame
 * snapshot before any owed record can be written, so the snapshot is re-frozen when a
 * record lands: the verdict and cost ledger then include its effects. Called from the
 * turn pipeline (in-turn endings) and from the desktop persistence choke point
 * (decision/peace/Dayton IPC endings). A no-op unless play has ended.
 */

import type { GameState } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { EventDefinition, FiredEvent } from '../events/event_types.js';
import { fireOwedFollowUpsAtTermination } from '../events/evaluate_events.js';
import { freezeEndgameSnapshot } from './endgame_snapshot.js';

export function writeOwedRecordsAtTermination(
    state: GameState,
    registry: EventDefinition[],
    edges?: EdgeRecord[],
): FiredEvent[] {
    if (state.meta.game_over !== true) return [];
    const fired = fireOwedFollowUpsAtTermination(state, registry, state.meta.turn, edges);
    if (fired.length > 0 && state.meta.endgame_snapshot) {
        delete state.meta.endgame_snapshot;
        freezeEndgameSnapshot(state);
    }
    return fired;
}

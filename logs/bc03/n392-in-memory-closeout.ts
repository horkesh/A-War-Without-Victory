import { readFileSync } from 'node:fs';
import {
    buildHistoricalDefaultDaytonProposal,
    resolveDaytonNegotiation,
} from '../../src/sim/negotiation/dayton_negotiation.ts';
import { deserializeState, serializeState } from '../../src/state/serialize.ts';

const source = 'runs/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n392/final_save.json';
const state = deserializeState(readFileSync(source, 'utf8'));
const before = {
    turn: state.meta.turn,
    game_over: state.meta.game_over,
    pending: Boolean(state.military.negotiation?.pending_dayton),
    dayton_result: Boolean(state.military.negotiation?.dayton_result),
    snapshot: Boolean(state.meta.endgame_snapshot),
    coha_active: state.military.event_flags?.coha_active,
};

if (
    before.turn !== 188
    || before.game_over === true
    || !before.pending
    || before.dayton_result
    || before.snapshot
    || before.coha_active !== false
) {
    throw new Error(`bad n392 precondition ${JSON.stringify(before)}`);
}

resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());
const serialized = serializeState(state);
const roundTrip = deserializeState(serialized);
const snapshot = roundTrip.meta.endgame_snapshot;
const result = roundTrip.military.negotiation?.dayton_result;
const after = {
    serialized_round_trip: serialized.length > 0,
    turn: roundTrip.meta.turn,
    game_over: roundTrip.meta.game_over,
    outcome: roundTrip.meta.outcome,
    pending: Boolean(roundTrip.military.negotiation?.pending_dayton),
    dayton_result: Boolean(result),
    dayton_result_keys: Object.keys(result ?? {}).sort(),
    snapshot: Boolean(snapshot),
    verdict: Boolean(snapshot?.verdict),
    verdict_keys: Object.keys(snapshot?.verdict ?? {}).sort(),
    cost_ledger: Boolean(snapshot?.cost_ledger),
    cost_ledger_keys: Object.keys(snapshot?.cost_ledger ?? {}).sort(),
    historical_comparison: Boolean(snapshot?.historical_comparison),
    historical_comparison_keys: Object.keys(snapshot?.historical_comparison ?? {}).sort(),
    frozen_turn: snapshot?.frozen_turn,
};

if (
    !after.serialized_round_trip
    || !after.game_over
    || after.outcome !== 'dayton'
    || after.pending
    || !after.dayton_result
    || !after.snapshot
    || !after.verdict
    || !after.cost_ledger
    || !after.historical_comparison
    || after.frozen_turn !== 188
) {
    throw new Error(`incomplete closeout ${JSON.stringify(after)}`);
}

console.log(JSON.stringify({ source, before, after }, null, 2));

/**
 * Repro: prove the consequence-receipt read-model classifies a REAL engine
 * causal chain as CONFIRMED, with the originating decision named.
 *
 * Drives the real desktop sim (startNewCampaign + advanceTurn) far enough that
 * the engine writes `enables` causality edges and fires downstream events. It
 * then locates a genuine edge {from_event=E, to_event=P, kind:'enables'} whose
 * P is in fired_event_ids, attributes the deciding event E to the PLAYER in a
 * synthesized event_decision_log entry (mirroring the player resolve path —
 * resolve_decision.ts writes exactly this), and runs buildConsequenceReceipts
 * against the REAL event catalog + REAL persisted causality substrate.
 *
 * A CONFIRMED receipt printed here means the promise→receipt loop is wired end
 * to end: prediction ids (future_consequences[*].opens_events) == real
 * causal-edge ids == fired events, and the read-model joins them correctly.
 *
 * Run: node node_modules/tsx/dist/cli.mjs tools/diagnostics/consequence_receipt_repro.ts
 */

import { startNewCampaign, advanceTurn } from '../../src/desktop/desktop_sim.js';
import { loadEventDefinitionsFromDir } from '../../src/sim/events/event_loader.js';
import { buildConsequenceReceipts } from '../../src/ui/map/data/consequenceReceipts.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { GameState } from '../../src/state/game_state.js';
import { join } from 'node:path';

const baseDir = process.cwd();
const TURNS = 16;

function loadCatalog(): Map<string, EventDefinition> {
    const dir = join(baseDir, 'data/scenarios/events');
    const defs = loadEventDefinitionsFromDir(0, dir);
    const map = new Map<string, EventDefinition>();
    for (const def of defs) map.set(def.id, def);
    return map;
}

async function main(): Promise<void> {
    const catalog = loadCatalog();
    let { state } = await startNewCampaign(baseDir, 'RS');
    console.log(`start: turn=${state.meta.turn} catalog_size=${catalog.size}`);

    for (let i = 0; i < TURNS; i++) {
        const res = await advanceTurn(state, baseDir);
        if (res.error) { console.error(`advanceTurn error at turn ${i}: ${res.error}`); process.exit(2); }
        state = res.state;
    }

    const military = state.military as GameState['military'];
    const causalityLog = military.event_causality_log ?? [];
    const firedIds = new Set(military.fired_event_ids ?? []);
    console.log(`after ${TURNS} turns: fired=${firedIds.size} causality_edges=${causalityLog.length}`);

    // Find a real enables edge whose target actually fired AND whose source
    // event exists in the catalog with a matching response option that
    // PREDICTS the target via future_consequences[*].opens_events.
    let chosen: { from: string; to: string; responseId: string } | null = null;
    for (const entry of causalityLog) {
        if (entry.kind !== 'enables' || entry.to_event === null) continue;
        if (!firedIds.has(entry.to_event)) continue;
        const def = catalog.get(entry.from_event);
        if (!def) continue;
        const responseId = entry.source_response_id ?? '';
        const option = (def.response_options ?? []).find((o) => o.id === responseId);
        if (!option) continue;
        const predicts = (option.future_consequences ?? []).some(
            (fc) => (fc.opens_events ?? []).includes(entry.to_event as string),
        );
        if (!predicts) continue;
        chosen = { from: entry.from_event, to: entry.to_event, responseId };
        break;
    }

    if (!chosen) {
        console.error('WARN: no real enables edge with a catalog-predicted target fired in this window.');
        console.error('      (bots default to historical; extend TURNS or pick a different faction).');
        process.exit(3);
    }

    console.log(`real causal edge: ${chosen.from} --[${chosen.responseId}]--> ${chosen.to}`);

    // Attribute the deciding event to the PLAYER, exactly as resolve_decision.ts
    // writes it on the player path. Everything else (fired set, causality log,
    // last-fired turns, closed set) is the engine's untouched output.
    const decisionTurn = military.event_last_fired_turn?.[chosen.from] ?? 1;
    const reproState = {
        ...state,
        military: {
            ...military,
            event_decision_log: [
                ...(military.event_decision_log ?? []),
                {
                    event_id: chosen.from,
                    response_id: chosen.responseId,
                    decision_source: 'player' as const,
                    faction: 'RS' as const,
                    turn: decisionTurn,
                },
            ],
        },
    } as unknown as GameState;

    const receipts = buildConsequenceReceipts(reproState, catalog);
    const confirmed = receipts.filter((r) => r.status === 'confirmed');
    console.log(`\nreceipts total=${receipts.length} confirmed=${confirmed.length}`);

    if (confirmed.length === 0) {
        console.error('FAIL: read-model produced no CONFIRMED receipt for a real fired causal chain.');
        process.exit(1);
    }

    for (const r of confirmed) {
        console.log(
            `CONFIRMED RECEIPT: decision="${r.decisionTitle}" / option="${r.decisionOptionLabel}" `
            + `(week ${r.decisionTurn}) -> consequence="${r.predictedLabel}" [${r.predictedEventId}] `
            + `fired week ${r.firedTurn} (+${r.turnsElapsed} weeks)`,
        );
    }
    console.log('\nPASS: promise→receipt loop confirmed end to end on a real engine causal chain.');
}

main().catch((err) => { console.error(err); process.exit(2); });

/**
 * F1i (2026-11-16): humanitarian convoys are not modelled in 1.0. The convoy_decision player
 * family, its modal, IPC channel, inbox/desk/records surfaces and i18n are retired. The optional
 * save fields `military.pending_convoy_decisions` / `convoy_decision_history` stay so an old save
 * still loads; nothing writes them and no player surface reads them.
 *
 * This proves the old-save path end to end: a save carrying one unanswered convoy plus a filed
 * convoy record goes through the real load path (migrate + shape validation + state validation),
 * and neither the player-visible projection nor the inbox, blockers, decision manifest or
 * consequence records show a convoy item.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { summarizePlayerDecisions, PLAYER_DECISION_FAMILIES } from '../src/state/player_decision_manifest.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { deriveInboxItems } from '../src/ui/map/data/inboxItems.js';
import { derivePresidentialBlockers } from '../src/ui/map/data/presidentialBlockers.js';
import { buildDecisionConsequenceLedger } from '../src/ui/map/data/decisionConsequenceLedger.js';

const require = createRequire(import.meta.url);
const { projectPlayerVisibleState } = require('../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleState(state: unknown, fallbackFaction?: string): Record<string, any>;
};

const PENDING_CONVOY = {
    id: 'convoy:30:srebrenica:RBiH',
    target_enclave: 'srebrenica',
    route_faction: 'RBiH',
    supply_amount: 0.5,
};

const FILED_CONVOY = {
    id: 'convoy:29:gorazde:RBiH',
    turn: 29,
    target_enclave: 'gorazde',
    route_faction: 'RBiH',
    target_faction: 'RBiH',
    supply_amount: 0.4,
    decision: 'allow',
    decided_by: 'player',
};

function legacyConvoySavePayload(): string {
    const raw = JSON.parse(readFileSync(
        join(process.cwd(), 'tests', 'fixtures', 'save_migration', 'v26_convoy_decisions.json'),
        'utf8',
    ));
    expect(raw.schema_version).toBe(26);
    expect(raw.meta.player_faction).toBe('RBiH');
    raw.military.pending_convoy_decisions = [PENDING_CONVOY];
    raw.military.convoy_decision_history = [FILED_CONVOY];
    return JSON.stringify(raw);
}

describe('F1i convoy save compatibility', () => {
    it('loads an old save carrying a pending convoy and a filed convoy record without validation errors', () => {
        const loaded = deserializeState(legacyConvoySavePayload());

        expect(loaded.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        // The legacy rows are kept as-is (nothing rewrites or resolves them).
        expect(loaded.military.pending_convoy_decisions).toEqual([PENDING_CONVOY]);
        expect(loaded.military.convoy_decision_history).toEqual([FILED_CONVOY]);
        // And the loaded save round-trips through the canonical serializer.
        expect(deserializeState(serializeState(loaded)).military.pending_convoy_decisions).toEqual([PENDING_CONVOY]);
    });

    it('shows no convoy item in the player-visible projection, inbox, blockers, manifest or records', () => {
        const loaded = deserializeState(legacyConvoySavePayload());

        const projected = projectPlayerVisibleState(JSON.parse(serializeState(loaded)));
        expect(projected.military).not.toHaveProperty('pending_convoy_decisions');
        expect(projected.military).not.toHaveProperty('convoy_decision_history');
        expect(JSON.stringify(projected)).not.toMatch(/convoy/i);

        const summary = summarizePlayerDecisions(loaded as any, 'RBiH');
        expect(PLAYER_DECISION_FAMILIES.map((family) => family.id)).not.toContain('convoy_decision');
        expect(summary.families.map((family) => family.id)).not.toContain('convoy_decision');
        expect(summary.blockingCount).toBe(0);

        // The UI reads the projection; also read the raw save to show the adapter ignores the rows.
        for (const source of [projected, JSON.parse(serializeState(loaded))]) {
            const view = parseGameState(source);
            expect(view).not.toHaveProperty('pendingConvoyDecisions');
            expect(view).not.toHaveProperty('convoyDecisionHistory');

            const inbox = deriveInboxItems(view, null);
            expect(inbox.map((item) => `${item.type} ${item.id} ${item.title} ${item.subtitle}`).join('\n'))
                .not.toMatch(/convoy/i);

            const blockers = derivePresidentialBlockers(view, null);
            expect(blockers.map((blocker) => `${blocker.type} ${blocker.id} ${blocker.summary}`).join('\n'))
                .not.toMatch(/convoy/i);

            const records = buildDecisionConsequenceLedger(view);
            expect(records.map((record) => `${record.id} ${record.family} ${record.title}`).join('\n'))
                .not.toMatch(/convoy/i);
        }
    });
});

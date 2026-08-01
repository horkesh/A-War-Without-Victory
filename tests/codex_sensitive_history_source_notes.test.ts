import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'vitest';

const require = createRequire(import.meta.url);
const inventory = require('../tools/diagnostics/codex_sensitive_claim_inventory.cjs');

type EventRow = {
    id: string;
    narrative?: string;
    source_note?: string;
};

const EVENT_FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
] as const;

const SOURCE_NOTE_EVENT_IDS = [
    'battle_of_the_barracks_sarajevo',
    'battle_of_the_barracks_tuzla',
    'battle_of_the_barracks_zenica',
    'battle_of_the_barracks_visoko',
    'drina_valley_ethnic_cleansing_1992',
    'operation_corridor_1992',
    'london_conference_1992',
    'hvo_arbih_tensions_rise_1992',
    'jajce_falls_1992',
    'srebrenica_enclave_forms_1992',
    'ahmici_massacre_1993',
    'central_bosnia_fighting_1993',
    'markale_area_shelling_1993',
    'morillon_enters_srebrenica_1993',
    'srebrenica_shelling_1993',
    'un_resolution_819_srebrenica_1993',
    'srebrenica_demilitarization_1993',
    'markale_massacre_1994',
    'anti_sniping_agreement_1994',
    'srebrenica_falls_1995',
    'zepa_falls_1995',
    'second_markale_massacre_1995',
    // §6 camp-system family (Prijedor camp system + HVO detention camps).
    // Documentary Ring-2 representation rows; provenance-only source notes.
    'omarska_camp_1992',
    'keraterm_camp_1992',
    'trnopolje_camp_1992',
    'hvo_detention_camps_1993',
    // §6 Ring-3 informational timeline records (Srebrenica column C9 + UN
    // safe-area enforcement-failure C11). Provenance-only source notes; no
    // response options, no hashed-state effects (narrative effect only).
    'srebrenica_column_breakout_1995',
    'un_safe_area_enforcement_1995',
] as const;

const REQUIRED_BOUNDARY_PHRASES = [
    'adds no casualty figures',
    'causal claims',
    'prohibited player choices',
] as const;

const BARRACKS_EVENT_IDS = [
    'battle_of_the_barracks_sarajevo',
    'battle_of_the_barracks_tuzla',
    'battle_of_the_barracks_zenica',
    'battle_of_the_barracks_visoko',
] as const;

function loadRows(): EventRow[] {
    return EVENT_FILES.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')) as EventRow[]);
}

test('sensitive-history Srebrenica/Zepa rows carry provenance-only source notes', () => {
    const rowsById = new Map(loadRows().map((row) => [row.id, row]));

    for (const id of SOURCE_NOTE_EVENT_IDS) {
        const row = rowsById.get(id);
        assert.ok(row, `missing event row ${id}`);
        assert.ok(row.source_note, `missing source_note for ${id}`);
        for (const phrase of REQUIRED_BOUNDARY_PHRASES) {
            assert.ok(
                row.source_note.includes(phrase),
                `source_note for ${id} must preserve boundary phrase: ${phrase}`,
            );
        }
        if (BARRACKS_EVENT_IDS.includes(id as (typeof BARRACKS_EVENT_IDS)[number])) {
            assert.ok(
                row.source_note.includes('equipment quantities'),
                `source_note for ${id} must preserve equipment-quantity boundary`,
            );
            assert.ok(
                row.source_note.includes('alternate-outcome framing'),
                `source_note for ${id} must preserve alternate-outcome boundary`,
            );
        } else {
            assert.ok(
                row.source_note.includes('alternate-outcome prevention framing'),
                `source_note for ${id} must preserve prevention-framing boundary`,
            );
        }
    }
});

test('Srebrenica/Zepa source notes do not introduce forbidden gameplay framing', () => {
    const sourceNotes = loadRows()
        .filter((row) => SOURCE_NOTE_EVENT_IDS.includes(row.id as (typeof SOURCE_NOTE_EVENT_IDS)[number]))
        .map((row) => row.source_note ?? '')
        .join('\n');

    for (const forbidden of ['prevent genocide', 'prevented genocide', 'reward', 'lever']) {
        assert.ok(
            !sourceNotes.toLowerCase().includes(forbidden),
            `source notes must not introduce forbidden sensitive-history framing: ${forbidden}`,
        );
    }
});

test('every inventoried sensitive claim has an explicit status and owner', async () => {
    const report = await inventory.scanSensitiveClaimInventory({ rootDir: process.cwd() });
    assert.ok(report.claims.length > 0);
    for (const claim of report.claims) {
        assert.ok(claim.status, `missing status for ${claim.claim_id}`);
        assert.ok(claim.owner, `missing owner for ${claim.claim_id}`);
        assert.ok(claim.subject_id, `missing subject_id for ${claim.claim_id}`);
        assert.ok(claim.ring, `missing ring for ${claim.claim_id}`);
        assert.ok(claim.player_interaction_type, `missing interaction type for ${claim.claim_id}`);
    }
});

test('Neretva, Grabovica, and Uzdol anchors are source-owned September 1993 content', async () => {
    const report = await inventory.scanSensitiveClaimInventory({ rootDir: process.cwd() });
    assert.strictEqual(report.historical_anchors.length, 2);
    for (const anchor of report.historical_anchors) {
        assert.strictEqual(anchor.status, 'pass', `${anchor.anchor_id} historical placement mismatch`);
        assert.strictEqual(anchor.event_window, 'turns 74-76');
        assert.ok(anchor.source.includes('Balkan Battlegrounds Vol. II, pp. 434-435'));
        assert.ok(anchor.source.includes('ICTY Halilovic Trial Judgment'));
        assert.strictEqual(anchor.owner, 'historian');
    }
});

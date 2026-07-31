/**
 * Phase B Sub-slice B1 — loader tests for runtime-causality substrate.
 *
 * Coverage map: Phase B Test Plan gates 1-21 (loader-side).
 * Reference: docs/40_reports/research/20260527_EVENT_FAMILY_PHASE_B_TEST_PLAN.md
 * Packet: docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md §2.2, §3.3, §3.6.
 *
 * No state-shape change, no evaluator change in B1. These tests exercise the
 * loader schema validation paths only.
 */

import assert from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, test } from 'vitest';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';

const REQUIRED_EVENT_FILES = [
    'war_1992.json',
    'war_1992_hrhb_summer.json',
    'war_1993.json',
    'war_1994.json',
    'war_1995.json',
    'consequences.json',
] as const;

const tempDirs: string[] = [];

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

function makeTempEventsDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'awwv-event-runtime-substrate-'));
    tempDirs.push(dir);
    return dir;
}

function writeCatalogRows(targetDir: string, rows: unknown[]): void {
    mkdirSync(targetDir, { recursive: true });
    for (const filename of REQUIRED_EVENT_FILES) {
        const fileRows = filename === 'war_1992.json' ? rows : [];
        writeFileSync(resolve(targetDir, filename), JSON.stringify(fileRows, null, 2), 'utf8');
    }
}

function assertCatalogRowsThrow(rows: unknown[], expected: RegExp): void {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, rows);
    assert.throws(
        () => loadEventDefinitionsFromDir(0, dir),
        expected,
    );
}

function validCatalogRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 'valid_event',
        trigger: { turn_min: 0, phase: 'war' },
        effect: { kind: 'narrative', text: 'Valid event fired.' },
        once: true,
        ...overrides,
    };
}

// ─── Gate 4: branch_tag vocabulary ──────────────────────────────────────────

test('rejects response option with unknown branch_tag', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                branch_tag: 'not_a_real_branch_tag_xyz',
            }],
        })],
        /response_options\[0\]\.branch_tag must be a known branch tag in event_families\.ts: not_a_real_branch_tag_xyz/,
    );
});

test('rejects response option with non-string branch_tag', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                branch_tag: 42,
            }],
        })],
        /response_options\[0\]\.branch_tag must be a non-empty string when present/,
    );
});

test('accepts response option with a known branch_tag from RS_BRANCH_TAGS', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                branch_tag: 'rs_all_six',
            }],
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

test('accepts response option with a composite-tag branch_tag', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                branch_tag: 'diplomacy_dayton',
            }],
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

// ─── Gate 11: enables_events_runtime / closes_events_runtime shape + alignment ──

test('rejects enables_events_runtime as non-array', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                enables_events_runtime: 'event_a',
            }],
        })],
        /response_options\[0\]\.enables_events_runtime must be a string array when present/,
    );
});

test('rejects closes_events_runtime as non-array', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                closes_events_runtime: { id: 'x' },
            }],
        })],
        /response_options\[0\]\.closes_events_runtime must be a string array when present/,
    );
});

test('rejects enables_events_runtime with non-string entries', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                enables_events_runtime: ['ok_event', 7],
            }],
        })],
        /response_options\[0\]\.enables_events_runtime must be a string array when present/,
    );
});

test('rejects enables_events_runtime targeting unknown event id', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                enables_events_runtime: ['missing_event'],
                future_consequences: [{
                    id: 'b',
                    label: 'Branch',
                    timing: 'future',
                    certainty: 'conditional',
                    opens_events: ['missing_event'],
                    explanation: 'Shows the later branch.',
                }],
            }],
        })],
        /Unknown event reference\(s\) in required event catalog: valid_event->missing_event/,
    );
});

test('rejects disjointness violation: same id in both enables and closes runtime arrays', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'event_a',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    enables_events_runtime: ['event_b'],
                    closes_events_runtime: ['event_b'],
                    future_consequences: [{
                        id: 'branch',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        opens_events: ['event_b'],
                        closes_events: ['event_b'],
                        explanation: 'Test fixture.',
                    }],
                }],
            }),
            validCatalogRow({ id: 'event_b', trigger: { turn_min: 1, phase: 'war' } }),
        ],
        /enables_events_runtime and closes_events_runtime must be disjoint: event_b/,
    );
});

test('rejects alignment violation: enables_events_runtime id not in future_consequences.opens_events', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'event_a',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    enables_events_runtime: ['event_b'],
                    // No future_consequences mentioning event_b → alignment violation.
                }],
            }),
            validCatalogRow({ id: 'event_b', trigger: { turn_min: 1, phase: 'war' } }),
        ],
        /enables_events_runtime ids must each appear in some future_consequences\[\*\]\.opens_events on the same option: event_b/,
    );
});

test('rejects alignment violation: closes_events_runtime id not in future_consequences.closes_events', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'event_a',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    closes_events_runtime: ['event_b'],
                }],
            }),
            validCatalogRow({ id: 'event_b', trigger: { turn_min: 1, phase: 'war' } }),
        ],
        /closes_events_runtime ids must each appear in some future_consequences\[\*\]\.closes_events on the same option: event_b/,
    );
});

test('accepts aligned enables_events_runtime', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'opener',
            response_options: [{
                id: 'accept',
                label: 'Accept',
                enables_events_runtime: ['target_a'],
                future_consequences: [{
                    id: 'b',
                    label: 'Branch',
                    timing: 'future',
                    certainty: 'conditional',
                    opens_events: ['target_a'],
                    explanation: 'Aligned branch visibility.',
                }],
            }],
        }),
        validCatalogRow({ id: 'target_a', trigger: { turn_min: 1, phase: 'war' } }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 2);
});

// ─── Gate 23 schema check (requires_enabled boolean) ────────────────────────

test('rejects requires_enabled as non-boolean', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ requires_enabled: 'true' })],
        /requires_enabled must be a boolean when present/,
    );
});

// ─── Phase B Sub-slice B1: source_tier / emergence_class / family schema ────

test('rejects unknown source_tier', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ source_tier: 'unknown_tier' })],
        /source_tier must be a known source tier when present: unknown_tier/,
    );
});

test('rejects unknown emergence_class', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ emergence_class: 'cinematic' })],
        /emergence_class must be a known emergence class when present: cinematic/,
    );
});

test('rejects empty family slug', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({ family: '' })],
        /family must be a non-empty string when present/,
    );
});

// ─── Gate 2: camp-exposure option-set freeze ────────────────────────────────

test('rejects R4-style camp-exposure row with fourth option', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            id: 'concentration_camps_revealed_1992',
            response_options: [
                { id: 'deny', label: 'Deny' },
                { id: 'obstruct', label: 'Obstruct' },
                { id: 'cooperate', label: 'Cooperate' },
                { id: 'authorize', label: 'Authorize' },
            ],
        })],
        /camp-exposure event concentration_camps_revealed_1992 must use option set \[deny, obstruct, cooperate\] exactly/,
    );
});

test('rejects H6-style camp-exposure row with renamed option', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            id: 'hvo_detention_camps_exposed_1993',
            response_options: [
                { id: 'deny', label: 'Deny' },
                { id: 'obstruct', label: 'Obstruct' },
                { id: 'admit', label: 'Admit' },
            ],
        })],
        /camp-exposure event hvo_detention_camps_exposed_1993 must use option set \[deny, obstruct, cooperate\] exactly/,
    );
});

test('accepts R4 camp-exposure row with exact deny/obstruct/cooperate set', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'concentration_camps_revealed_1992',
            response_options: [
                { id: 'deny', label: 'Deny' },
                { id: 'obstruct', label: 'Obstruct' },
                { id: 'cooperate', label: 'Cooperate' },
            ],
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

test('accepts H6-family camp-exposure row by family slug', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'h6_some_camp',
            family: 'hrhb_camp_exposure',
            response_options: [
                { id: 'deny', label: 'Deny' },
                { id: 'obstruct', label: 'Obstruct' },
                { id: 'cooperate', label: 'Cooperate' },
            ],
        }),
    ]);
    // hrhb_camp_exposure is Ring-3 family; row must not also be a runtime-enable
    // target, but it can exist with no runtime causality elsewhere. Loader accepts.
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

// ─── Gate 9: cross-faction option-id rejection with runtime causality ──────

test('rejects cross-faction option-id collision when one side carries enables_events_runtime', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'opener_rs',
                responding_faction: 'RS',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    enables_events_runtime: ['target'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        opens_events: ['target'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({
                id: 'opener_rbih',
                responding_faction: 'RBiH',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                }],
            }),
            validCatalogRow({ id: 'target', trigger: { turn_min: 1, phase: 'war' } }),
        ],
        /Cross-faction option id collision\(s\) carrying runtime causality in required event catalog: accept /,
    );
});

test('permits cross-faction option-id collision when no side has runtime causality', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'row_rs',
            responding_faction: 'RS',
            response_options: [{ id: 'accept', label: 'Accept' }],
        }),
        validCatalogRow({
            id: 'row_rbih',
            responding_faction: 'RBiH',
            response_options: [{ id: 'accept', label: 'Accept' }],
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 2);
});

// ─── Gate 10: composite-tag forbids meta-flag writer ────────────────────────

test('rejects sets_flags writing a composite tag at event level', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            sets_flags: { diplomacy_vance_owen: 'vance_owen_implemented' },
        })],
        /sets_flags must not write composite tag keys.*: diplomacy_vance_owen/,
    );
});

test('rejects sets_flags writing a composite tag inside a response option', () => {
    assertCatalogRowsThrow(
        [validCatalogRow({
            response_options: [{
                id: 'accept',
                label: 'Accept',
                sets_flags: { diplomacy_dayton: 'accepted' },
            }],
        })],
        /response_options\[0\]\.sets_flags must not write composite tag keys.*: diplomacy_dayton/,
    );
});

// ─── Gate 14: Ring-3 enabling rejection ─────────────────────────────────────

test('rejects enables_events_runtime targeting a Ring-3 family event (rs_drina_campaign)', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'opener',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    enables_events_runtime: ['drina_event'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        opens_events: ['drina_event'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({
                id: 'drina_event',
                trigger: { turn_min: 1, phase: 'war' },
                family: 'rs_drina_campaign',
            }),
        ],
        /Ring-3 enabling rejection in required event catalog/,
    );
});

test('rejects enables_events_runtime targeting Ring-3 H5 atrocity family', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'opener',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    enables_events_runtime: ['h5_atrocity'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        opens_events: ['h5_atrocity'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({
                id: 'h5_atrocity',
                trigger: { turn_min: 1, phase: 'war' },
                family: 'h5_croat_bosniak_war_atrocities',
            }),
        ],
        /Ring-3 enabling rejection in required event catalog/,
    );
});

test('rejects enables_events_runtime targeting un_safe_area_enforcement family', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'opener',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    enables_events_runtime: ['un_enforcer'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        opens_events: ['un_enforcer'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({
                id: 'un_enforcer',
                trigger: { turn_min: 1, phase: 'war' },
                family: 'un_safe_area_enforcement',
            }),
        ],
        /Ring-3 enabling rejection in required event catalog/,
    );
});

// ─── Gate 15: staff-recommendation runtime-causality rejection ─────────────

test('rejects runtime causality on a staff-recommendation-only row', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'opener',
                staff_recommended_response_id: 'brief',
                response_options: [
                    {
                        id: 'brief',
                        label: 'Brief',
                        enables_events_runtime: ['target'],
                        future_consequences: [{
                            id: 'b',
                            label: 'Branch',
                            timing: 'future',
                            certainty: 'conditional',
                            opens_events: ['target'],
                            explanation: 'Branch visibility.',
                        }],
                    },
                ],
            }),
            validCatalogRow({ id: 'target', trigger: { turn_min: 1, phase: 'war' } }),
        ],
        /response_options\[0\] on a staff-recommendation row must not carry enables_events_runtime or closes_events_runtime/,
    );
});

test('permits runtime causality when row carries both historical_default_response_id and staff_recommended_response_id', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'opener',
            historical_default_response_id: 'accept',
            staff_recommended_response_id: 'brief',
            response_options: [
                {
                    id: 'accept',
                    label: 'Accept',
                    enables_events_runtime: ['target'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        opens_events: ['target'],
                        explanation: 'Branch visibility.',
                    }],
                },
                { id: 'brief', label: 'Brief' },
            ],
        }),
        validCatalogRow({ id: 'target', trigger: { turn_min: 1, phase: 'war' } }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 2);
});

// ─── Gate 16: unreachable gate (requires_enabled with no opener) ────────────

test('rejects requires_enabled: true event with no opener anywhere in catalog', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({ id: 'orphan_gate', requires_enabled: true }),
        ],
        /Unreachable requires_enabled event\(s\) in required event catalog: orphan_gate\(no_opener\)/,
    );
});

test('rejects requires_enabled: true event whose only opener is itself requires_enabled with no historical default', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'opener_a',
                requires_enabled: true,
                enables_events: ['gated_b'],
            }),
            validCatalogRow({ id: 'gated_b', trigger: { turn_min: 1, phase: 'war' }, requires_enabled: true }),
        ],
        /Unreachable requires_enabled event\(s\) in required event catalog: (opener_a|gated_b)/,
    );
});

test('accepts requires_enabled: true event opened by a calendar-reachable row', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'calendar_opener',
            enables_events: ['gated_target'],
        }),
        validCatalogRow({
            id: 'gated_target',
            trigger: { turn_min: 1, phase: 'war' },
            requires_enabled: true,
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 2);
});

// ─── Gate 17/18: sensitive-act continuation rejection & §3.6 clause overlap ─

test('rejects response option scaling existing camp operation outside camp-exposure carve-out', () => {
    // §3.6 clause overlap (Game Designer Wave 2 v1.2 note): a row that scales
    // an existing camp operation by writing paramilitary_policy / detention_*
    // keys without being R4/H6 itself or un_hostage_crisis_1995 carve-out.
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'some_other_row',
                response_options: [{
                    id: 'expand',
                    label: 'Expand',
                    sets_flags: { detention_camp_scale: 'expanded' },
                }],
            }),
        ],
        /response_options\[0\]\.sets_flags writes sensitive-history scaling key 'detention_camp_scale' outside the camp-exposure carve-out/,
    );
});

test('permits paramilitary_policy on un_hostage_crisis_1995 carve-out row', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'un_hostage_crisis_1995',
            response_options: [{
                id: 'maintain',
                label: 'Maintain hostages',
                sets_flags: { paramilitary_policy: 'maintained' },
            }],
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

test('permits paramilitary_policy on R4 camp-exposure carve-out row', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'concentration_camps_revealed_1992',
            response_options: [
                {
                    id: 'deny',
                    label: 'Deny',
                    sets_flags: { paramilitary_policy: 'always_allow' },
                },
                { id: 'obstruct', label: 'Obstruct' },
                { id: 'cooperate', label: 'Cooperate' },
            ],
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

// ─── Gate 21: rupture-foreclosure prohibition (widened by Wave 2 review) ────
// Per Canon Compliance Wave 2 review + Sensitive History Design Gate §1 #3
// ("no negotiable condemnation"): the rule now applies to EVERY row,
// regardless of family. The SREBRENICA_FORECLOSURE_ALLOWLIST is empty in B1.

test('rejects B5 srebrenica_demilitarization_1993 family closing srebrenica_falls_1995', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'b5_demilitarization_row',
                family: 'srebrenica_demilitarization_1993',
                response_options: [{
                    id: 'comply_fully',
                    label: 'Comply',
                    closes_events_runtime: ['srebrenica_falls_1995'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        closes_events: ['srebrenica_falls_1995'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({ id: 'srebrenica_falls_1995', trigger: { turn_min: 150, phase: 'war' } }),
        ],
        /Rupture-foreclosure prohibition violated/,
    );
});

test('rejects B5 srebrenica_demilitarization_1993 family closing srebrenica_genocide_1995', () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'b5_demilitarization_row',
                family: 'srebrenica_demilitarization_1993',
                response_options: [{
                    id: 'comply_fully',
                    label: 'Comply',
                    closes_events_runtime: ['srebrenica_genocide_1995'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        closes_events: ['srebrenica_genocide_1995'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({ id: 'srebrenica_genocide_1995', trigger: { turn_min: 150, phase: 'war' } }),
        ],
        /Rupture-foreclosure prohibition violated/,
    );
});

test('rejects non-B5 family closing srebrenica_falls_1995 (no Gate §6 allowlist entry)', () => {
    // Wave 2 widening: even non-B5 families cannot foreclose the rupture
    // unless explicitly allowlisted. Allowlist is empty in B1.
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'some_other_family_row',
                family: 'rbih_state_identity',
                response_options: [{
                    id: 'civic',
                    label: 'Civic',
                    closes_events_runtime: ['srebrenica_falls_1995'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        closes_events: ['srebrenica_falls_1995'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({ id: 'srebrenica_falls_1995', trigger: { turn_min: 150, phase: 'war' } }),
        ],
        /Rupture-foreclosure prohibition violated/,
    );
});

test('rejects arbitrary row closing srebrenica_genocide_1995 outside allowlist', () => {
    // Locks the unconditional rule: any family, any row, must not foreclose
    // the genocide rupture without explicit allowlist entry.
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'no_family_arbitrary_row',
                response_options: [{
                    id: 'whatever',
                    label: 'Whatever',
                    closes_events_runtime: ['srebrenica_genocide_1995'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        closes_events: ['srebrenica_genocide_1995'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({ id: 'srebrenica_genocide_1995', trigger: { turn_min: 150, phase: 'war' } }),
        ],
        /Rupture-foreclosure prohibition violated/,
    );
});

test('SREBRENICA_FORECLOSURE_ALLOWLIST is empty in B1 (no row currently passes via allowlist)', () => {
    // Positive test path exercising the allowlist mechanism.
    // The production allowlist is intentionally empty in B1; we verify the
    // mechanism by confirming that even the simplest closure attempt fails
    // (no entry can be present, so EVERY foreclosure must fail). Future Gate
    // §6 sign-off will populate the allowlist with citation provenance, and
    // an additional positive test should be added when that lands.
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'candidate_for_future_gate_6_signoff',
                response_options: [{
                    id: 'accept',
                    label: 'Accept',
                    closes_events_runtime: ['srebrenica_falls_1995'],
                    future_consequences: [{
                        id: 'b',
                        label: 'Branch',
                        timing: 'future',
                        certainty: 'conditional',
                        closes_events: ['srebrenica_falls_1995'],
                        explanation: 'Branch visibility.',
                    }],
                }],
            }),
            validCatalogRow({ id: 'srebrenica_falls_1995', trigger: { turn_min: 150, phase: 'war' } }),
        ],
        /Rupture-foreclosure prohibition violated/,
    );
});

// ─── Gate 3: forbidden family slug rejection ────────────────────────────────
// Per Foundational packet drina_cleansing_decision_1992 + Stupčanica-95
// data-not-comment lesson. Enforced via FORBIDDEN_FAMILY_SLUGS, not author
// comments.

test("rejects row with `family: 'rs_drina_campaign'`", () => {
    assertCatalogRowsThrow(
        [
            validCatalogRow({
                id: 'drina_attempt',
                family: 'rs_drina_campaign',
            }),
        ],
        /Forbidden family slug\(s\) in required event catalog.*drina_attempt\(family=rs_drina_campaign\)/,
    );
});

// ─── Gate 10 positive paths: non-composite sets_flags keys are accepted ────
// TODO B2/B3: extend §3.6 clause-overlap rejection from sets_flags heuristic
// to a full effects-tree walk per Game Designer Wave 2 review.

test('accepts non-composite sets_flags key at row level', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'row_with_non_composite_flag',
            sets_flags: { rbih_pragmatic: 'set' },
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

test('accepts non-composite sets_flags key at option level', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'row_with_non_composite_option_flag',
            response_options: [{
                id: 'accept',
                label: 'Accept',
                sets_flags: { rs_aggressive: 'set' },
            }],
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

// ─── Deviation #2: arbitrary non-dictionary family slug is permitted ───────
// `family` is intentionally free-form (non-empty string) per design — the
// loader only rejects (a) empty strings and (b) FORBIDDEN_FAMILY_SLUGS.

test('accepts arbitrary non-dictionary `family` slug (free-form per design)', () => {
    const dir = makeTempEventsDir();
    writeCatalogRows(dir, [
        validCatalogRow({
            id: 'novel_family_row',
            family: 'novel_undocumented_family_slug_xyz',
        }),
    ]);
    const loaded = loadEventDefinitionsFromDir(0, dir);
    assert.strictEqual(loaded.length, 1);
});

// ─── Gates 7, 8, 13, 19, 20: deferred to B2/B3 (placeholder skips) ─────────

test.skip('TODO B2/B3: orphan flag readers — no loader pass yet', () => {
    // Gate 7: a flag key referenced by a trigger.condition that is never
    // written by any sets_flags in the catalog should be reported. Requires
    // an effects/condition walker not present in the B1 loader.
});

test.skip('TODO B2/B3: orphan flag writers — no loader pass yet', () => {
    // Gate 8: a flag key written by some sets_flags but never read by any
    // trigger.condition should be reported. Same requirement as gate 7.
});

test.skip('TODO B2/B3: downstream requires_enabled trigger.condition referencing branching sets_flags key — needs route walk', () => {
    // Gate 13: a downstream `requires_enabled` event whose trigger.condition
    // references a flag key set by a branching response option must verify
    // the branch route is actually reachable on the historical default path.
    // Requires evaluator-graph route walking, deferred to B2/B3.
});

test.skip('TODO B2/B3: R12 maintain_hostages route-based guard — needs evaluator graph', () => {
    // Gate 19: R12 `maintain_hostages` route must not flow into a Ring-3
    // sensitive-history event via flag-set chains. Requires the evaluator
    // graph (B2/B3) to walk routes; B1 cannot statically prove this.
});

test.skip('TODO B2/B3: R11 remove_mladic forward-looking guard — needs evaluator graph', () => {
    // Gate 20: R11 `remove_mladic` route must not retroactively foreclose
    // events that have already fired by the rupture date. Requires the
    // evaluator graph (B2/B3); B1 cannot statically prove this.
});

// ─── Gate 1, 3 spirit: production catalog loads cleanly with B1 passes ──────

test('existing 299-row production catalog loads cleanly through all B1 passes', async () => {
    const { loadEventDefinitions } = await import('../src/sim/events/event_loader.js');
    const loaded = loadEventDefinitions(0);
    // 289 → 293: +4 LANE-OBSERVER-FLAG-WRITER deadline "audit" events.
    // 293 → 294: +1 §6 atrocity-record event bijeljina_killings_1992.
    // 294 → 297: +3 HRHB Jul–Sep 1992 decision events (war_1992_hrhb_summer.json).
    // 297 → 299: +2 sourced HRHB October/November 1992 decision events.
    assert.strictEqual(loaded.length, 299);
});

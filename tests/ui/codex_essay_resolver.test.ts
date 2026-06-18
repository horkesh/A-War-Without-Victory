import { describe, it, expect } from 'vitest';
import {
    evaluateEssayCondition,
    resolveCodexEssay,
    type CodexRenderContext,
    type EssayEntry,
} from '../../src/ui/map/components/codex/codexEssayResolver.js';

function context(overrides: Partial<CodexRenderContext> = {}): CodexRenderContext {
    return {
        firedEventIds: new Set<string>(),
        eventFlags: {},
        historicalComparison: undefined,
        costLedger: undefined,
        gameOver: false,
        ...overrides,
    };
}

function essay(overrides: Partial<EssayEntry> = {}): EssayEntry {
    return {
        id: 'essay_test',
        event_id: 'test_event',
        title: 'Test Essay',
        year: 1995,
        category: 'political',
        content: 'Paragraph one.\n\nParagraph two.',
        ...overrides,
    };
}

describe('codexEssayResolver', () => {
    it('keeps regular essays locked until their event fires', () => {
        const resolved = resolveCodexEssay(essay(), context());
        expect(resolved.isUnlocked).toBe(false);
        expect(resolved.isGhost).toBe(false);
        expect(resolved.paragraphs).toEqual([]);
    });

    it('unlocks canonical essay content when the source event fired', () => {
        const resolved = resolveCodexEssay(
            essay(),
            context({ firedEventIds: new Set(['test_event']) }),
        );
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(false);
        expect(resolved.paragraphs.map((paragraph) => paragraph.text)).toEqual([
            'Paragraph one.',
            'Paragraph two.',
        ]);
    });

    it('surfaces a ghost essay when the historical rupture is absent at game over', () => {
        const resolved = resolveCodexEssay(
            essay({
                ghost_when: 'GAME_OVER AND NOT RUPTURE:srebrenica_genocide_1995',
                ghost_summary: 'History took a path your war never reached.',
            }),
            context({
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: -6,
                    territory_divergence: {},
                    casualty_ratio: 0.8,
                    displacement_ratio: 0.7,
                    rupture_divergence: [],
                    divergence_notes: ['Srebrenica enclave survived'],
                },
            }),
        );
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(true);
        expect(resolved.paragraphs[0]).toMatchObject({
            kind: 'ghost',
            text: 'History took a path your war never reached.',
        });
    });

    it('does not ghost the essay when the rupture occurred', () => {
        const resolved = resolveCodexEssay(
            essay({
                ghost_when: 'GAME_OVER AND NOT RUPTURE:srebrenica_genocide_1995',
            }),
            context({
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 0,
                    territory_divergence: {},
                    casualty_ratio: 1,
                    displacement_ratio: 1,
                    rupture_divergence: ['srebrenica_genocide_1995'],
                    divergence_notes: ['Srebrenica genocide occurred'],
                },
            }),
        );
        expect(resolved.isUnlocked).toBe(false);
        expect(resolved.isGhost).toBe(false);
    });

    it('appends comparison notes through a dynamic divergence section', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [
                    {
                        id: 'comparison',
                        insert_after_paragraph: -1,
                        condition: 'GAME_OVER AND COMPARISON_NOTES',
                        variant: 'divergence',
                        content: '{comparison_notes}',
                    },
                ],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 4,
                    territory_divergence: {},
                    casualty_ratio: 1.1,
                    displacement_ratio: 1.2,
                    rupture_divergence: [],
                    divergence_notes: [
                        'War lasted 4 weeks longer than the historical 188 weeks',
                        'Srebrenica enclave survived',
                    ],
                },
            }),
        );

        expect(resolved.paragraphs.slice(-2)).toEqual([
            {
                kind: 'dynamic',
                variant: 'divergence',
                text: 'War lasted 4 weeks longer than the historical 188 weeks',
            },
            {
                kind: 'dynamic',
                variant: 'divergence',
                text: 'Srebrenica enclave survived',
            },
        ]);
    });

    it('evaluates event flags and parentheses deterministically', () => {
        const result = evaluateEssayCondition(
            'GAME_OVER AND (FLAG:dayton_framework OR FLAG:ceasefire)',
            context({
                gameOver: true,
                eventFlags: { ceasefire: false, dayton_framework: true },
            }),
        );
        expect(result).toBe(true);
    });
});

// ─── v0.9.1: comparison-derived condition atoms ──────────────────────────

describe('codexEssayResolver — comparison condition atoms', () => {
    function withComparison(overrides: Partial<NonNullable<CodexRenderContext['historicalComparison']>>): CodexRenderContext {
        return context({
            gameOver: true,
            historicalComparison: {
                duration_delta_weeks: 0,
                territory_divergence: {},
                casualty_ratio: 1,
                displacement_ratio: 1,
                rupture_divergence: [],
                divergence_notes: [],
                ...overrides,
            },
        });
    }

    it('DURATION_LONGER matches positive delta, misses zero and negative', () => {
        expect(evaluateEssayCondition('DURATION_LONGER', withComparison({ duration_delta_weeks: 4 }))).toBe(true);
        expect(evaluateEssayCondition('DURATION_LONGER', withComparison({ duration_delta_weeks: 0 }))).toBe(false);
        expect(evaluateEssayCondition('DURATION_LONGER', withComparison({ duration_delta_weeks: -4 }))).toBe(false);
    });

    it('DURATION_SHORTER matches negative delta only', () => {
        expect(evaluateEssayCondition('DURATION_SHORTER', withComparison({ duration_delta_weeks: -6 }))).toBe(true);
        expect(evaluateEssayCondition('DURATION_SHORTER', withComparison({ duration_delta_weeks: 0 }))).toBe(false);
    });

    it('CASUALTY_ABOVE / CASUALTY_BELOW read casualty_ratio', () => {
        const high = withComparison({ casualty_ratio: 1.3 });
        expect(evaluateEssayCondition('CASUALTY_ABOVE:1.2', high)).toBe(true);
        expect(evaluateEssayCondition('CASUALTY_BELOW:1.2', high)).toBe(false);

        const low = withComparison({ casualty_ratio: 0.5 });
        expect(evaluateEssayCondition('CASUALTY_ABOVE:1.2', low)).toBe(false);
        expect(evaluateEssayCondition('CASUALTY_BELOW:1.2', low)).toBe(true);
    });

    it('DISPLACEMENT_ABOVE / DISPLACEMENT_BELOW read displacement_ratio', () => {
        const high = withComparison({ displacement_ratio: 1.5 });
        expect(evaluateEssayCondition('DISPLACEMENT_ABOVE:1.0', high)).toBe(true);
        expect(evaluateEssayCondition('DISPLACEMENT_BELOW:1.0', high)).toBe(false);
    });

    it('TERRITORY_ABOVE reads territory_divergence map (player_pct - historical_pct)', () => {
        const ctx = withComparison({ territory_divergence: { RS: 5, RBiH_HRHB_Federation: -5 } });
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS:3', ctx)).toBe(true);
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS:8', ctx)).toBe(false);
        expect(evaluateEssayCondition('TERRITORY_BELOW:RBiH_HRHB_Federation:-3', ctx)).toBe(true);
    });

    it('comparison atoms return false when historicalComparison is absent', () => {
        const ctx = context();
        expect(evaluateEssayCondition('DURATION_LONGER', ctx)).toBe(false);
        expect(evaluateEssayCondition('CASUALTY_ABOVE:0.5', ctx)).toBe(false);
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS:0', ctx)).toBe(false);
    });

    it('malformed thresholds do not match', () => {
        const ctx = withComparison({ casualty_ratio: 1.5 });
        expect(evaluateEssayCondition('CASUALTY_ABOVE:notanumber', ctx)).toBe(false);
        expect(evaluateEssayCondition('TERRITORY_ABOVE:RS', ctx)).toBe(false); // missing threshold
    });

    it('new atoms compose with AND / OR / NOT', () => {
        const ctx = withComparison({
            duration_delta_weeks: 10,
            casualty_ratio: 0.8,
            rupture_divergence: [],
        });
        expect(evaluateEssayCondition(
            'GAME_OVER AND DURATION_LONGER AND NOT RUPTURE:srebrenica_genocide_1995',
            ctx,
        )).toBe(true);
    });

    it('MILESTONE atoms match by id and optional status', () => {
        const ctx = withComparison({
            milestone_comparison: [
                {
                    id: 'srebrenica_genocide_1995',
                    label: 'Srebrenica Genocide',
                    historical_week: 171,
                    player_week: null,
                    delta_weeks: null,
                    status: 'absent',
                    summary: 'Srebrenica Genocide did not occur in this run.',
                },
                {
                    id: 'dayton_accords',
                    label: 'Dayton Accords',
                    historical_week: 182,
                    player_week: 188,
                    delta_weeks: 6,
                    status: 'late',
                    summary: 'Dayton Accords occurred at player week 188 against historical week 182.',
                },
            ],
        });

        expect(evaluateEssayCondition('MILESTONE:srebrenica_genocide_1995', ctx)).toBe(true);
        expect(evaluateEssayCondition('MILESTONE:srebrenica_genocide_1995:absent', ctx)).toBe(true);
        expect(evaluateEssayCondition('MILESTONE:dayton_accords:late', ctx)).toBe(true);
        expect(evaluateEssayCondition('MILESTONE:dayton_accords:early', ctx)).toBe(false);
        expect(evaluateEssayCondition('MILESTONE:washington_agreement', ctx)).toBe(false);
    });
});

// ─── #263: RESPONSE atom — per-unit expanded ids ─────────────────────────

describe('codexEssayResolver — RESPONSE atom matching', () => {
    it('matches an exact (un-expanded) decision response', () => {
        const ctx = context({
            decisionResponses: new Set(['decorate_a_unit_rbih:decorate_decline_rbih']),
        });
        expect(evaluateEssayCondition('RESPONSE:decorate_a_unit_rbih:decorate_decline_rbih', ctx)).toBe(true);
    });

    it('matches a per-unit EXPANDED steadfast branch via the `__` suffix (#263)', () => {
        // Runtime expands `decorate_steadfast_rbih` into `<base>__<formationId>`
        // (src/desktop/decorate_unit_contract.cjs). The authored essay condition
        // lists only the un-suffixed base id; it must still fire.
        const ctx = context({
            decisionResponses: new Set([
                'decorate_a_unit_rbih:decorate_steadfast_rbih__arbih_1st_corps',
            ]),
        });
        expect(
            evaluateEssayCondition('RESPONSE:decorate_a_unit_rbih:decorate_steadfast_rbih', ctx),
        ).toBe(true);
    });

    it('does not match a sibling branch that merely shares a prefix without the `__` boundary', () => {
        // `decorate_steadfast` must not match the exact base `decorate_steadfast_rbih`
        // chosen response (single-underscore sibling, not a `__` expansion).
        const ctx = context({
            decisionResponses: new Set(['decorate_a_unit_rbih:decorate_steadfast_rbih']),
        });
        expect(
            evaluateEssayCondition('RESPONSE:decorate_a_unit_rbih:decorate_steadfast', ctx),
        ).toBe(false);
    });

    it('returns false when the decision was not taken', () => {
        const ctx = context({
            decisionResponses: new Set(['decorate_a_unit_rbih:decorate_broadly_rbih']),
        });
        expect(
            evaluateEssayCondition('RESPONSE:decorate_a_unit_rbih:decorate_steadfast_rbih', ctx),
        ).toBe(false);
    });

    it('returns false when no decisionResponses set is present', () => {
        expect(
            evaluateEssayCondition('RESPONSE:decorate_a_unit_rbih:decorate_decline_rbih', context()),
        ).toBe(false);
    });
});

// ─── v0.9.1: template interpolation tokens ───────────────────────────────

describe('codexEssayResolver — template interpolation tokens', () => {
    function resolveWith(content: string, comparison: Partial<NonNullable<CodexRenderContext['historicalComparison']>>): string[] {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [
                    {
                        id: 'dyn',
                        insert_after_paragraph: -1,
                        condition: 'GAME_OVER',
                        variant: 'divergence',
                        content,
                    },
                ],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 0,
                    territory_divergence: {},
                    casualty_ratio: 1,
                    displacement_ratio: 1,
                    rupture_divergence: [],
                    divergence_notes: [],
                    ...comparison,
                },
            }),
        );
        return resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
    }

    it('{duration_delta_weeks} renders signed integer', () => {
        expect(resolveWith('Ran {duration_delta_weeks} weeks.', { duration_delta_weeks: 4 }))
            .toEqual(['Ran +4 weeks.']);
        expect(resolveWith('Ran {duration_delta_weeks} weeks.', { duration_delta_weeks: -6 }))
            .toEqual(['Ran -6 weeks.']);
    });

    it('{duration_delta_abs} renders unsigned absolute value', () => {
        expect(resolveWith('{duration_delta_abs} week gap.', { duration_delta_weeks: -6 }))
            .toEqual(['6 week gap.']);
    });

    it('{casualty_ratio_pct} and {displacement_ratio_pct} render rounded percentages', () => {
        expect(resolveWith('{casualty_ratio_pct}% / {displacement_ratio_pct}%.', {
            casualty_ratio: 1.1,
            displacement_ratio: 0.73,
        })).toEqual(['110% / 73%.']);
    });

    it('{rupture_list} renders player-safe rupture labels', () => {
        expect(resolveWith('Ruptures: {rupture_list}.', {
            rupture_divergence: ['srebrenica_genocide_1995', 'xxx_other'],
        })).toEqual(['Ruptures: Srebrenica Genocide 1995, Xxx Other.']);
    });

    it('{territory_RS_delta} renders signed one-decimal percentage', () => {
        expect(resolveWith('RS delta {territory_RS_delta}.', {
            territory_divergence: { RS: 3.45 },
        })).toEqual(['RS delta +3.5.']);
    });

    it('{territory_RBiH_HRHB_Federation_delta} handles multi-segment keys', () => {
        expect(resolveWith('Fed delta {territory_RBiH_HRHB_Federation_delta}.', {
            territory_divergence: { RBiH_HRHB_Federation: -5.21 },
        })).toEqual(['Fed delta -5.2.']);
    });

    it('signed() leaves zero unsigned but signs non-zero values', () => {
        // duration delta 0 → "0" (no leading "+"), matching conventional English.
        expect(resolveWith('Ran {duration_delta_weeks} weeks.', { duration_delta_weeks: 0 }))
            .toEqual(['Ran 0 weeks.']);
    });

    it('absent historicalComparison renders every token as empty string', () => {
        // No historicalComparison at all — token expands to empty.
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [{
                    id: 'dyn',
                    insert_after_paragraph: -1,
                    condition: 'GAME_OVER',
                    variant: 'divergence',
                    content: '[{duration_delta_weeks}][{casualty_ratio_pct}][{territory_RS_delta}][{rupture_list}]',
                }],
            }),
            context({ firedEventIds: new Set(['test_event']), gameOver: true, historicalComparison: undefined }),
        );
        const dyn = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
        expect(dyn).toEqual(['[][][][]']);
    });

    it('missing territory key renders as empty string', () => {
        // Comparison exists but the requested faction key isn't in territory_divergence.
        expect(resolveWith('Missing {territory_ZZZ_delta}.', {})).toEqual(['Missing .']);
    });

    it('unknown tokens pass through literally for review visibility', () => {
        expect(resolveWith('Keep {totally_unknown_token} visible.', {}))
            .toEqual(['Keep {totally_unknown_token} visible.']);
    });

    it('{comparison_notes} still works (backwards compatible)', () => {
        expect(resolveWith('{comparison_notes}', {
            divergence_notes: ['Note A', 'Note B'],
        })).toEqual(['Note A', 'Note B']);
    });

    it('milestone tokens render deterministic row summaries', () => {
        expect(resolveWith('{milestone_comparison}', {
            milestone_comparison: [
                {
                    id: 'dayton_accords',
                    label: 'Dayton Accords',
                    historical_week: 182,
                    player_week: 188,
                    delta_weeks: 6,
                    status: 'late',
                    summary: 'Dayton Accords occurred at player week 188 against historical week 182.',
                },
                {
                    id: 'srebrenica_genocide_1995',
                    label: 'Srebrenica Genocide',
                    historical_week: 171,
                    player_week: null,
                    delta_weeks: null,
                    status: 'absent',
                    summary: 'Srebrenica Genocide did not occur in this run.',
                },
            ],
        })).toEqual([
            'Srebrenica Genocide: historical W171; player not recorded; status absent. Srebrenica Genocide did not occur in this run.',
            'Dayton Accords: historical W182; player W188; delta +6w; status late. Dayton Accords occurred at player week 188 against historical week 182.',
        ]);
    });

    it('single milestone tokens render summary, status, and signed delta', () => {
        expect(resolveWith('{milestone_dayton_accords_status} / {milestone_dayton_accords_delta_weeks} / {milestone_dayton_accords_summary}', {
            milestone_comparison: [{
                id: 'dayton_accords',
                label: 'Dayton Accords',
                historical_week: 182,
                player_week: 188,
                delta_weeks: 6,
                status: 'late',
                summary: 'Dayton Accords occurred at player week 188 against historical week 182.',
            }],
        })).toEqual(['late / +6 / Dayton Accords occurred at player week 188 against historical week 182.']);
    });
});

describe('codexEssayResolver — cost-ledger finding atoms and tokens', () => {
    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 46000,
        total_civilian_killed: 38000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records 46,000 military killed and 38,000 civilian killed.',
                sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
            },
            {
                id: 'rupture_srebrenica_genocide_1995',
                category: 'rupture',
                severity: 'rupture',
                faction: 'RS',
                title: 'Srebrenica genocide',
                text: 'The ledger records the Srebrenica genocide.',
                sources: ['ICTY Krstic IT-98-33-T', 'ICJ Bosnia v. Serbia (2007)'],
            },
            {
                id: 'war_crimes_record_HRHB',
                category: 'war_crimes',
                severity: 'record',
                faction: 'HRHB',
                title: 'HRHB war-crimes record',
                text: 'HRHB capital records contain 4 war-crime events.',
                sources: ['Sensitive History Design Gate §4'],
            },
            {
                id: 'early_peace_implementation_record',
                category: 'duration',
                severity: 'record',
                title: 'Early negotiated settlement',
                text: 'The ledger records acceptance of peace plan vance_owen at week 50.',
                sources: ['Victory Conditions and Pyrrhic Scoring section 1'],
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('matches finding id, category, severity, and faction atoms', () => {
        const ctx = context({ gameOver: true, costLedger });

        expect(evaluateEssayCondition('FINDING:rupture_srebrenica_genocide_1995', ctx)).toBe(true);
        expect(evaluateEssayCondition('FINDING_CATEGORY:war_crimes', ctx)).toBe(true);
        expect(evaluateEssayCondition('FINDING_CATEGORY:duration', ctx)).toBe(true);
        expect(evaluateEssayCondition('FINDING_SEVERITY:rupture', ctx)).toBe(true);
        expect(evaluateEssayCondition('FINDING_FACTION:HRHB', ctx)).toBe(true);
        expect(evaluateEssayCondition('FINDING_FACTION:RBiH', ctx)).toBe(false);
    });

    it('renders deterministic cost finding body and source tokens', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [{
                    id: 'cost-findings',
                    insert_after_paragraph: -1,
                    condition: 'GAME_OVER AND FINDING_CATEGORY:rupture',
                    variant: 'divergence',
                    content: '{cost_findings}\n\nSources: {cost_finding_sources}',
                }],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                costLedger,
            }),
        );

        const dynamic = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
        expect(dynamic).toEqual([
            'Human cost record: The ledger records 46,000 military killed and 38,000 civilian killed.',
            'Srebrenica genocide [VRS]: The ledger records the Srebrenica genocide.',
            'HRHB war-crimes record [HVO]: HRHB capital records contain 4 war-crime events.',
            'Early negotiated settlement: The ledger records acceptance of peace plan vance_owen at week 50.',
            'Sources: ICJ Bosnia v. Serbia (2007); ICTY Krstic IT-98-33-T; RDC Sarajevo, Bosnian Book of the Dead (2007); Sensitive History Design Gate §4; Victory Conditions and Pyrrhic Scoring section 1',
        ]);
    });

    it('renders category-filtered Cost Ledger finding tokens', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [{
                    id: 'rupture-findings',
                    insert_after_paragraph: -1,
                    condition: 'GAME_OVER AND FINDING_CATEGORY:rupture',
                    variant: 'divergence',
                    content: '{cost_rupture_findings}',
                }],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                costLedger,
            }),
        );

        const dynamic = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
        expect(dynamic).toEqual([
            'Srebrenica genocide [VRS]: The ledger records the Srebrenica genocide.',
        ]);
    });

    it('renders duration-filtered Cost Ledger finding tokens', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [{
                    id: 'duration-findings',
                    insert_after_paragraph: -1,
                    condition: 'GAME_OVER AND FINDING_CATEGORY:duration',
                    variant: 'divergence',
                    content: '{cost_duration_findings}',
                }],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                costLedger,
            }),
        );

        const dynamic = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
        expect(dynamic).toEqual([
            'Early negotiated settlement: The ledger records acceptance of peace plan vance_owen at week 50.',
        ]);
    });

    it('renders faction-filtered war-crimes Cost Ledger finding tokens', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [{
                    id: 'hrhb-war-crimes',
                    insert_after_paragraph: -1,
                    condition: 'GAME_OVER AND FINDING_FACTION:HRHB',
                    variant: 'divergence',
                    content: '{cost_war_crimes_findings_HRHB}',
                }],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                costLedger: {
                    ...costLedger,
                    findings: [
                        ...costLedger.findings,
                        {
                            id: 'war_crimes_record_RS',
                            category: 'war_crimes',
                            severity: 'grave',
                            faction: 'RS',
                            title: 'RS war-crimes record',
                            text: 'RS capital records contain 14 war-crime events.',
                            sources: ['Sensitive History Design Gate §4'],
                        },
                    ],
                },
            }),
        );

        const dynamic = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
        expect(dynamic).toEqual([
            'HRHB war-crimes record [HVO]: HRHB capital records contain 4 war-crime events.',
        ]);
    });

    it('renders dynamic Cost Ledger IDs without raw faction brackets, annotation tags, or rupture IDs', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [{
                    id: 'player-safe-cost-ledger',
                    insert_after_paragraph: -1,
                    condition: 'GAME_OVER AND FINDING_CATEGORY:war_crimes',
                    variant: 'divergence',
                    content: [
                        '{cost_war_crimes_findings_RS}',
                        '{cost_annotation_accelerated_safe_areas_1993}',
                        '{rupture_list}',
                    ].join('\n\n'),
                }],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 0,
                    territory_divergence: {},
                    casualty_ratio: 1,
                    displacement_ratio: 1,
                    rupture_divergence: ['srebrenica_genocide_1995'],
                    divergence_notes: [],
                },
                costLedger: {
                    ...costLedger,
                    findings: [{
                        id: 'cost_war_crimes_findings_RS',
                        category: 'war_crimes',
                        severity: 'grave',
                        faction: 'RS',
                        title: 'War-crimes record',
                        text: 'The ledger records 14 war-crime events.',
                        sources: [],
                    }],
                    annotations: [{
                        event_id: 'accelerated_safe_areas_1993',
                        tag: 'accelerated_safe_areas_1993',
                        text: 'Safe-area diplomacy accelerated.',
                        turn: 70,
                        faction: 'RS',
                    }],
                },
            }),
        );

        const text = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text).join('\n');
        expect(text).toContain('War-crimes record [VRS]: The ledger records 14 war-crime events.');
        expect(text).toContain('Accelerated Safe Areas 1993 [VRS, W70]: Safe-area diplomacy accelerated.');
        expect(text).toContain('Srebrenica Genocide 1995');
        expect(text).not.toMatch(/\[(RS|RBiH|HRHB)\]/);
        expect(text).not.toContain('accelerated_safe_areas_1993');
        expect(text).not.toContain('srebrenica_genocide_1995');
    });

    it('cost-ledger atoms return false when the ledger is absent', () => {
        const ctx = context({ gameOver: true, costLedger: undefined });
        expect(evaluateEssayCondition('FINDING:human_cost_record', ctx)).toBe(false);
        expect(evaluateEssayCondition('FINDING_CATEGORY:human_cost', ctx)).toBe(false);
        expect(evaluateEssayCondition('FINDING_SEVERITY:grave', ctx)).toBe(false);
        expect(evaluateEssayCondition('FINDING_FACTION:RS', ctx)).toBe(false);
    });
});

describe('codexEssayResolver - cost-ledger annotation atoms and tokens', () => {
    const costLedger: NonNullable<CodexRenderContext['costLedger']> = {
        war_duration_weeks: 130,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 0,
        total_civilian_killed: 0,
        findings: [],
        annotations: [
            {
                event_id: 'early_nato_threshold_1994',
                tag: 'early_nato_threshold_1994',
                text: 'NATO intervention threshold lowered; VRS operational freedom constrained.',
                turn: 100,
                faction: 'RS',
            },
            {
                event_id: 'bihac_refugee_crisis_1994',
                tag: 'bihac_refugee_crisis_1994',
                text: 'A massive refugee wave floods RBiH-held central Bosnia.',
                turn: 124,
                faction: 'RBiH',
            },
        ],
    } as NonNullable<CodexRenderContext['costLedger']>;

    it('matches Cost Ledger annotation tags as condition atoms', () => {
        const ctx = context({ gameOver: true, costLedger });

        expect(evaluateEssayCondition('ANNOTATION:early_nato_threshold_1994', ctx)).toBe(true);
        expect(evaluateEssayCondition('ANNOTATION:bihac_refugee_crisis_1994', ctx)).toBe(true);
        expect(evaluateEssayCondition('ANNOTATION:missing_annotation', ctx)).toBe(false);
    });

    it('renders all annotations and single annotation tokens deterministically', () => {
        const resolved = resolveCodexEssay(
            essay({
                dynamic_sections: [
                    {
                        id: 'annotation-one',
                        insert_after_paragraph: -1,
                        condition: 'GAME_OVER AND ANNOTATION:early_nato_threshold_1994',
                        variant: 'divergence',
                        content: '{cost_annotation_early_nato_threshold_1994}',
                    },
                    {
                        id: 'annotation-all',
                        insert_after_paragraph: -1,
                        condition: 'GAME_OVER AND ANNOTATION:bihac_refugee_crisis_1994',
                        variant: 'note',
                        content: '{cost_annotations}',
                    },
                ],
            }),
            context({
                firedEventIds: new Set(['test_event']),
                gameOver: true,
                costLedger,
            }),
        );

        const dynamic = resolved.paragraphs.filter(p => p.kind === 'dynamic').map(p => p.text);
        expect(dynamic).toEqual([
            'Early NATO Threshold 1994 [VRS, W100]: NATO intervention threshold lowered; VRS operational freedom constrained.',
            'Early NATO Threshold 1994 [VRS, W100]: NATO intervention threshold lowered; VRS operational freedom constrained.',
            'Bihac Refugee Crisis 1994 [ARBiH, W124]: A massive refugee wave floods RBiH-held central Bosnia.',
        ]);
    });
});

describe('T2-C — FIXED tier-0 essay with no backing event unlocks as canonical (orphaned-wiring audit)', () => {
    // independence_referendum_1992: tier-0 FIXED, no backing event in the
    // catalog, now `ghost_when`-anchored on an always-firing campaign-opening
    // event. It must unlock as full canonical prose — NOT a "path not taken"
    // ghost — because tier-0 is canonical history that always happened.
    function fixedReferendumEssay(overrides: Partial<EssayEntry> = {}): EssayEntry {
        return essay({
            id: 'essay_independence_referendum_1992',
            event_id: 'independence_referendum_1992',
            tier: 0,
            ghost_when: 'EVENT:rs_strategic_goals OR EVENT:rbih_state_identity',
            content: 'The referendum.\n\nTwo legitimacies.',
            ...overrides,
        });
    }

    it('unlocks as canonical (non-ghost) when its always-fired anchor event has fired', () => {
        const resolved = resolveCodexEssay(
            fixedReferendumEssay(),
            context({ firedEventIds: new Set(['rs_strategic_goals']) }),
        );
        expect(resolved.isUnlocked).toBe(true);
        // The key assertion: a FIXED essay is NEVER a ghost, even when it
        // unlocked via ghost_when rather than a direct event_id fire.
        expect(resolved.isGhost).toBe(false);
        expect(resolved.paragraphs.every((p) => p.kind !== 'ghost')).toBe(true);
        expect(resolved.paragraphs.map((p) => p.text)).toEqual([
            'The referendum.',
            'Two legitimacies.',
        ]);
    });

    it('also unlocks via the RBiH-side anchor event (cross-faction reachability)', () => {
        const resolved = resolveCodexEssay(
            fixedReferendumEssay(),
            context({ firedEventIds: new Set(['rbih_state_identity']) }),
        );
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(false);
    });

    it('stays locked when no anchor event has fired', () => {
        const resolved = resolveCodexEssay(fixedReferendumEssay(), context());
        expect(resolved.isUnlocked).toBe(false);
    });

    it('a CONDITIONAL essay with the same ghost_when still surfaces AS a ghost (FIXED-only rule)', () => {
        const resolved = resolveCodexEssay(
            fixedReferendumEssay({ tier: 1, ghost_summary: 'A path not taken.' }),
            context({ firedEventIds: new Set(['rs_strategic_goals']) }),
        );
        expect(resolved.isUnlocked).toBe(true);
        expect(resolved.isGhost).toBe(true);
    });

    it('a FIXED essay whose event_id has no backing event AND no ghost_when stays permanently locked (§6 invariant)', () => {
        // Synthetic invariant: a tier-0 essay with no backing event and no
        // ghost_when is never reachable. (The former orphaned
        // bijeljina_massacre_1992 index/essay that exhibited this was removed in
        // PR #377 and replaced by the wired bijeljina_killings_1992; this
        // resolver-level invariant is retained as a general guard.)
        const resolved = resolveCodexEssay(
            essay({ id: 'essay_bijeljina', event_id: 'unbacked_orphan_example', tier: 0 }),
            context({ firedEventIds: new Set(['rs_strategic_goals', 'rbih_state_identity']) }),
        );
        expect(resolved.isUnlocked).toBe(false);
    });
});

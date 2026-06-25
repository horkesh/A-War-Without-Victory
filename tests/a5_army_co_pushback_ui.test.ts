// @vitest-environment jsdom
/**
 * LANE-NIGHTSHIFT-A5-ARMY-HQ-PUSHBACK-UI — Army HQ pushback panel render tests.
 *
 * DDR (authoritative): docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md (eee308e0)
 * Predecessors:
 *   A1 closeout: docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md (18136710)
 *   A2 closeout: docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md (ba6955bf)
 *   A3 closeout: docs/40_reports/implemented/20260506_A3_ARMY_LEVEL_ORDER_INTERPRETATION.md (c8ff93d8)
 *   A4 closeout: docs/40_reports/implemented/20260506_A4_ARMY_CO_ROSTER_PERSONALITIES.md (93c75b1d)
 *
 * Coverage:
 *   T1 — panel renders nothing when no traces + no warnings + no overrides.
 *   T2 — panel renders Mladić-class warning when officer with stubbornness=5 has recent autonomous launch.
 *   T3 — panel renders army CO pushback for trace with PARTIAL/REFUSED rationale.
 *   T4 — panel renders override history badge when recent_overrides.length >= 3.
 *   T5 — section ordering: warnings first, then objections, then override history.
 *   T6 — panel reads STUBBORNNESS_AUTONOMOUS_THRESHOLD from A3 constants module (no hardcoded 4).
 *   T7 — panel handles missing fields gracefully (pre-A4 saves with no roster applied → defaults).
 *   T8 — faction-symmetric: same render path for RBiH / RS / HRHB officers.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import {
    ArmyCoPushbackPanel,
    type ArmyCoOfficerInput,
    type ArmyCoPendingEventInput,
    type ArmyCoDecisionTraceInput,
} from '../src/ui/components/ArmyCoPushbackPanel';
import {
    STUBBORNNESS_AUTONOMOUS_THRESHOLD,
} from '../src/sim/combat/army_order_interpretation';

afterEach(() => {
    cleanup();
});

function makeOfficer(overrides: Partial<ArmyCoOfficerInput> = {}): ArmyCoOfficerInput {
    return {
        id: 'officer_x',
        name: 'Generic CO',
        faction: 'RS',
        rank: 'army_commander',
        ...overrides,
    };
}

describe('ArmyCoPushbackPanel', () => {
    it('T1 — renders nothing when no traces, no warnings, and no override history', () => {
        const { container } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers: [makeOfficer()],
                pendingOfficerEvents: [],
                decisionTraces: {},
                playerFaction: 'RS',
            }),
        );
        // Empty state → component returns null → container has no child.
        expect(container.firstChild).toBeNull();
        expect(container.querySelector('[data-testid="army-co-pushback-panel"]')).toBeNull();
    });

    it('T2 — renders Mladić-class warning when officer with stubbornness=5 has recent autonomous launch', () => {
        const mladic: ArmyCoOfficerInput = makeOfficer({
            id: 'mladic',
            name: 'Mladic',
            faction: 'RS',
            rank: 'army_commander',
            stubbornness: 5,
            last_autonomous_launch_turn: 30,
        });
        const { getByTestId } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers: [mladic],
                pendingOfficerEvents: [],
                decisionTraces: {},
                playerFaction: 'RS',
            }),
        );
        const warningSection = getByTestId('army-co-pushback-warnings');
        expect(warningSection).toBeTruthy();
        const warning = getByTestId('army-co-pushback-warning-mladic');
        expect(warning).toBeTruthy();
        expect(warning.textContent).toContain('WARNING');
        expect(warning.textContent).toContain('Mladic');
        expect(warning.textContent).toContain('RS');
        expect(warning.textContent).toContain('Stubbornness 5');
        expect(warning.textContent).toContain('command authority');
        expect(warning.textContent).toContain('Review pause');
        expect(warning.textContent).not.toMatch(/political_capital|Cooldown\s+\d+t|t30/i);
    });

    it('T3 — renders army CO pushback for a trace with PARTIAL/REFUSED rationale', () => {
        const traces: Record<string, ArmyCoDecisionTraceInput[]> = {
            RS: [
                {
                    turn: 30,
                    campaign_role: 'PRESS_OFFENSIVE',
                    rationale: 'General Mladić pushes back on the political directive — corps allocations will deviate from the literal reading.',
                },
            ],
        };
        const officers: ArmyCoOfficerInput[] = [
            makeOfficer({
                id: 'mladic',
                name: 'Mladic',
                faction: 'RS',
                rank: 'army_commander',
                stubbornness: 5,
            }),
        ];
        const { getByTestId } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers,
                pendingOfficerEvents: [],
                decisionTraces: traces,
                playerFaction: 'RS',
            }),
        );
        const objections = getByTestId('army-co-pushback-objections');
        expect(objections).toBeTruthy();
        const row = getByTestId('army-co-pushback-objection-RS');
        expect(row).toBeTruthy();
        expect(row.textContent).toContain('RS Main Staff');
        expect(row.textContent).toContain('Mladic');
        expect(row.textContent).toContain('PRESS_OFFENSIVE');
        expect(row.textContent).toContain('pushes back');
        expect(row.textContent).not.toMatch(/\bTurn\s+30\b/);
    });

    it('T4 — renders override history badge when recent_overrides.length >= 3', () => {
        const karadzic: ArmyCoOfficerInput = makeOfficer({
            id: 'karadzic',
            name: 'Karadzic',
            faction: 'RS',
            rank: 'army_commander',
            override_tolerance: 4,
            recent_overrides: [
                { turn: 20, resolution: 'override' },
                { turn: 24, resolution: 'override' },
                { turn: 28, resolution: 'override' },
            ],
        });
        const { getByTestId } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers: [karadzic],
                pendingOfficerEvents: [],
                decisionTraces: {},
                playerFaction: 'RS',
            }),
        );
        const overridesSection = getByTestId('army-co-pushback-overrides');
        expect(overridesSection).toBeTruthy();
        const reliefBadge = getByTestId('army-co-pushback-relief-karadzic');
        expect(reliefBadge).toBeTruthy();
        expect(reliefBadge.textContent).toContain('At relief threshold');
        expect(getByTestId('army-co-pushback-override-karadzic').textContent).not.toMatch(/last\s+12t/i);
    });

    it('T5 — section ordering: warnings first, then objections, then override history', () => {
        const officers: ArmyCoOfficerInput[] = [
            makeOfficer({
                id: 'mladic',
                name: 'Mladic',
                faction: 'RS',
                rank: 'army_commander',
                stubbornness: 5,
                last_autonomous_launch_turn: 30,
                recent_overrides: [
                    { turn: 20, resolution: 'override' },
                    { turn: 24, resolution: 'override' },
                    { turn: 28, resolution: 'override' },
                ],
            }),
        ];
        const traces: Record<string, ArmyCoDecisionTraceInput[]> = {
            RS: [
                {
                    turn: 30,
                    campaign_role: 'HOLD_AT_ALL_COSTS',
                    rationale: 'General Mladić pushes back on the political directive — corps allocations will deviate.',
                },
            ],
        };
        const { container } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers,
                pendingOfficerEvents: [],
                decisionTraces: traces,
                playerFaction: 'RS',
            }),
        );
        const panel = container.querySelector('[data-testid="army-co-pushback-panel"]');
        expect(panel).toBeTruthy();
        const sections = panel!.querySelectorAll('details');
        expect(sections.length).toBe(3);
        expect(sections[0].getAttribute('data-testid')).toBe('army-co-pushback-warnings');
        expect(sections[1].getAttribute('data-testid')).toBe('army-co-pushback-objections');
        expect(sections[2].getAttribute('data-testid')).toBe('army-co-pushback-overrides');
    });

    it('T6 — reads STUBBORNNESS_AUTONOMOUS_THRESHOLD from A3 constants module (no hardcoded 4)', () => {
        // Static-grep guard: the panel source must NOT hardcode the literal 4
        // for the threshold. We verify by behavior — an officer at threshold-1
        // produces no warning, while an officer at threshold produces one.
        const justBelow: ArmyCoOfficerInput = makeOfficer({
            id: 'just_below',
            name: 'Just Below',
            faction: 'RBiH',
            rank: 'army_commander',
            stubbornness: STUBBORNNESS_AUTONOMOUS_THRESHOLD - 1,
            last_autonomous_launch_turn: 30,
        });
        const atThreshold: ArmyCoOfficerInput = makeOfficer({
            id: 'at_threshold',
            name: 'At Threshold',
            faction: 'RBiH',
            rank: 'army_commander',
            stubbornness: STUBBORNNESS_AUTONOMOUS_THRESHOLD,
            last_autonomous_launch_turn: 30,
        });

        const r1 = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers: [justBelow],
                pendingOfficerEvents: [],
                decisionTraces: {},
                playerFaction: 'RBiH',
            }),
        );
        expect(r1.container.firstChild).toBeNull();
        cleanup();

        const r2 = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers: [atThreshold],
                pendingOfficerEvents: [],
                decisionTraces: {},
                playerFaction: 'RBiH',
            }),
        );
        expect(r2.getByTestId('army-co-pushback-warning-at_threshold')).toBeTruthy();
        // Threshold value surfaced in the rendered text.
        expect(r2.getByTestId('army-co-pushback-warning-at_threshold').textContent).toContain(
            `threshold ${STUBBORNNESS_AUTONOMOUS_THRESHOLD}`,
        );
    });

    it('T7 — handles missing fields gracefully (pre-A4 saves with no roster applied)', () => {
        // Officer with NO substrate fields populated (pre-A4 / older saves).
        const skeletonOfficer: ArmyCoOfficerInput = {
            id: 'skeleton',
            name: 'Skeleton',
            faction: 'HRHB',
            rank: 'army_commander',
            // no stubbornness, override_tolerance, last_autonomous_launch_turn, recent_overrides
        };
        const { container } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers: [skeletonOfficer],
                pendingOfficerEvents: undefined,
                decisionTraces: undefined,
                playerFaction: 'HRHB',
            }),
        );
        // No warnings, no objections, no overrides → panel renders nothing.
        expect(container.firstChild).toBeNull();
    });

    it('T8 — faction-symmetric: same render path for RBiH / RS / HRHB officers', () => {
        const factions = ['RBiH', 'RS', 'HRHB'] as const;
        for (const faction of factions) {
            const officer: ArmyCoOfficerInput = makeOfficer({
                id: `co_${faction}`,
                name: `Commander ${faction}`,
                faction,
                rank: 'army_commander',
                stubbornness: 5,
                last_autonomous_launch_turn: 30,
            });
            const r = render(
                createElement(ArmyCoPushbackPanel, {
                    currentTurn: 30,
                    officers: [officer],
                    pendingOfficerEvents: [],
                    decisionTraces: {},
                    playerFaction: faction,
                }),
            );
            const warning = r.getByTestId(`army-co-pushback-warning-co_${faction}`);
            expect(warning).toBeTruthy();
            expect(warning.textContent).toContain(faction);
            cleanup();
        }
    });

    it('T9 — respects pending army_co_proposes_op events as warning source', () => {
        const officers: ArmyCoOfficerInput[] = [
            makeOfficer({
                id: 'mladic',
                name: 'Mladic',
                faction: 'RS',
                rank: 'army_commander',
                stubbornness: 5,
                // No last_autonomous_launch_turn — warning sourced from event only.
            }),
        ];
        const events: ArmyCoPendingEventInput[] = [
            {
                event_id: 'army:RS:autonomous:30',
                type: 'army_co_proposes_op',
                faction: 'RS',
                turn: 30,
                officer_id: 'mladic',
                officer_name: 'Mladic',
                reason: 'Mladić proposes Krivaja-95 autonomously.',
                overridable: true,
            },
        ];
        const { getByTestId } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers,
                pendingOfficerEvents: events,
                decisionTraces: {},
                playerFaction: 'RS',
            }),
        );
        const warning = getByTestId('army-co-pushback-warning-mladic');
        expect(warning).toBeTruthy();
        expect(warning.textContent).toContain('proposal date');
        expect(warning.textContent).not.toMatch(/proposal turn|t30/i);
    });

    it('T10 — emits army_directive_pushback events as objections when no decision-trace exists for that faction', () => {
        const officers: ArmyCoOfficerInput[] = [
            makeOfficer({
                id: 'halilovic',
                name: 'Halilovic',
                faction: 'RBiH',
                rank: 'army_commander',
                stubbornness: 4,
            }),
        ];
        const events: ArmyCoPendingEventInput[] = [
            {
                event_id: 'army:RBiH:directive:30',
                type: 'army_directive_pushback',
                faction: 'RBiH',
                turn: 30,
                officer_id: 'halilovic',
                officer_name: 'Halilovic',
                reason: 'Halilović pushes back on the political directive.',
                overridable: true,
            },
        ];
        const { getByTestId } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers,
                pendingOfficerEvents: events,
                decisionTraces: {},
                playerFaction: 'RBiH',
            }),
        );
        const row = getByTestId('army-co-pushback-objection-RBiH');
        expect(row).toBeTruthy();
        expect(row.textContent).toContain('Halilovic');
        expect(row.textContent).toContain('pushes back');
    });

    it('T11 - renders unreported commander copy when warning source lacks a displayable officer name', () => {
        const officers: ArmyCoOfficerInput[] = [
            makeOfficer({
                id: 'unnamed',
                name: '',
                faction: 'RS',
                rank: 'army_commander',
                stubbornness: 5,
            }),
        ];
        const events: ArmyCoPendingEventInput[] = [
            {
                event_id: 'army:RS:autonomous:30',
                type: 'army_co_proposes_op',
                faction: 'RS',
                turn: 30,
                officer_id: 'unnamed',
                officer_name: '',
                reason: 'Autonomous operation proposed without a named source.',
                overridable: true,
            },
        ];
        const { getByTestId } = render(
            createElement(ArmyCoPushbackPanel, {
                currentTurn: 30,
                officers,
                pendingOfficerEvents: events,
                decisionTraces: {},
                playerFaction: 'RS',
            }),
        );

        const warning = getByTestId('army-co-pushback-warning-unnamed');
        expect(warning.textContent).toContain('Commander record unreported');
        expect(warning.textContent).not.toMatch(/Unknown commander/i);
    });
});

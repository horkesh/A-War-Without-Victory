import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { OfficerDossierPanel } from '../../src/ui/map/components/OfficerDossierPanel.js';
import { OfficerProfile } from '../../src/ui/map/components/OfficerProfile.js';
import type { NamedOfficerView } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n';

// ─── Combat-record aggregation over operation_history ────────────────────────

/**
 * State fixture: two officers, multiple ops each, plus an op with no commander
 * and an op for a third (zero-state) officer. Exercises the per-officer combat
 * ledger aggregated inside the adapter's officer projection pass.
 */
function makeStateWithHistory() {
    return {
        meta: { turn: 50, phase: 'war', player_faction: 'RBiH' },
        military: {
            formations: {},
            named_officer_data: [
                { id: 'off_a', name: 'Officer A', faction: 'RBiH', rank: 'corps_commander', competence: 4, aggressiveness: 4, defensive_skill: 3, political_reliability: 3 },
                { id: 'off_b', name: 'Officer B', faction: 'RS', rank: 'corps_commander', competence: 3, aggressiveness: 2, defensive_skill: 4, political_reliability: 4 },
                { id: 'off_quiet', name: 'Quiet Officer', faction: 'HRHB', rank: 'deputy', competence: 2, aggressiveness: 2, defensive_skill: 2, political_reliability: 3 },
            ],
            named_officers: {
                off_a: { officer_id: 'off_a', status: 'active', assigned_corps_id: 'arbih_1st_corps', turns_in_command: 12, battles: 3, victories: 2 },
                off_b: { officer_id: 'off_b', status: 'active', assigned_corps_id: 'vrs_drina_corps', turns_in_command: 8, battles: 1, victories: 0 },
                off_quiet: { officer_id: 'off_quiet', status: 'reserve', assigned_corps_id: null, turns_in_command: 0, battles: 0, victories: 0 },
            },
        },
        // operation_history is a top-level field on GameState.
        operation_history: [
            // Officer A: 3 ops (1 success, 1 partial, 1 failure).
            {
                operation_id: 'arbih_1st_corps:Op One:t10', operation_name: 'Op One', commander_officer_id: 'off_a',
                outcome: 'success', ended_turn: 14,
                casualties_suffered: { killed: 100, wounded: 200 },
                casualties_inflicted: { killed: 300, wounded: 400 },
                objectives_captured: ['osid_x', 'osid_y'],
            },
            {
                operation_id: 'arbih_1st_corps:Op Two:t20', operation_name: 'Op Two', commander_officer_id: 'off_a',
                outcome: 'partial', ended_turn: 24,
                casualties_suffered: { killed: 50, wounded: 50 },
                casualties_inflicted: { killed: 10, wounded: 10 },
                objectives_captured: ['osid_z'],
            },
            {
                operation_id: 'arbih_1st_corps:Op Three:t30', operation_name: 'Op Three', commander_officer_id: 'off_a',
                outcome: 'failure', ended_turn: 40,
                casualties_suffered: { killed: 500, wounded: 500 },
                casualties_inflicted: { killed: 0, wounded: 0 },
                objectives_captured: [],
            },
            // Officer B: 1 orphaned op (counts as a failure).
            {
                operation_id: 'vrs_drina_corps:Op Beta:t15', operation_name: 'Op Beta', commander_officer_id: 'off_b',
                outcome: 'orphaned', ended_turn: 18,
                casualties_suffered: { killed: 20, wounded: 30 },
                casualties_inflicted: { killed: 5, wounded: 5 },
                objectives_captured: ['osid_b1'],
            },
            // Op with no commander id — must be ignored by aggregation.
            {
                operation_id: 'orphan:Op None:t5', operation_name: 'Op None',
                outcome: 'success', ended_turn: 6,
                casualties_suffered: { killed: 1, wounded: 1 },
                casualties_inflicted: { killed: 1, wounded: 1 },
                objectives_captured: ['osid_none'],
            },
        ],
        political: { political_controllers: {} },
    };
}

describe('officer dossier combat-record aggregation', () => {
    it('aggregates per-officer counts, casualties, objectives, and last op deterministically', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = parseGameState(makeStateWithHistory() as any);
        const a = parsed.namedOfficerData?.find((o) => o.id === 'off_a');
        const b = parsed.namedOfficerData?.find((o) => o.id === 'off_b');

        expect(a?.combat_record).toBeDefined();
        expect(a?.combat_record?.operations_commanded).toBe(3);
        expect(a?.combat_record?.wins).toBe(1);
        expect(a?.combat_record?.partials).toBe(1);
        expect(a?.combat_record?.failures).toBe(1);
        // suffered: (100+200) + (50+50) + (500+500) = 1400
        expect(a?.combat_record?.casualties_suffered).toBe(1400);
        // inflicted: (300+400) + (10+10) + 0 = 720
        expect(a?.combat_record?.casualties_inflicted).toBe(720);
        // objectives: 2 + 1 + 0 = 3
        expect(a?.combat_record?.objectives_captured).toBe(3);
        // last op = highest ended_turn (40) → Op Three, failure
        expect(a?.combat_record?.last_operation?.name).toBe('Op Three');
        expect(a?.combat_record?.last_operation?.outcome).toBe('failure');
        expect(a?.combat_record?.last_operation?.ended_turn).toBe(40);

        // Officer B: orphaned counts as a failure.
        expect(b?.combat_record?.operations_commanded).toBe(1);
        expect(b?.combat_record?.wins).toBe(0);
        expect(b?.combat_record?.partials).toBe(0);
        expect(b?.combat_record?.failures).toBe(1);
        expect(b?.combat_record?.casualties_suffered).toBe(50);
        expect(b?.combat_record?.objectives_captured).toBe(1);
        expect(b?.combat_record?.last_operation?.name).toBe('Op Beta');
    });

    it('leaves combat_record undefined for an officer with no operations (zero-state)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed = parseGameState(makeStateWithHistory() as any);
        const quiet = parsed.namedOfficerData?.find((o) => o.id === 'off_quiet');
        expect(quiet).toBeDefined();
        expect(quiet?.combat_record).toBeUndefined();
    });

    it('is deterministic and stable across repeated parses (tie-break by op id)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const first = parseGameState(makeStateWithHistory() as any).namedOfficerData?.find((o) => o.id === 'off_a');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const second = parseGameState(makeStateWithHistory() as any).namedOfficerData?.find((o) => o.id === 'off_a');
        expect(JSON.stringify(first?.combat_record)).toBe(JSON.stringify(second?.combat_record));
    });

    it('omits combat_record when operation_history is absent entirely', () => {
        const parsed = parseGameState({
            meta: { turn: 2, phase: 'war', player_faction: 'RBiH' },
            military: {
                formations: {},
                named_officer_data: [
                    { id: 'off_x', name: 'Officer X', faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 3, political_reliability: 3 },
                ],
                named_officers: {
                    off_x: { officer_id: 'off_x', status: 'active', assigned_corps_id: null, turns_in_command: 0, battles: 0, victories: 0 },
                },
            },
            political: { political_controllers: {} },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        const x = parsed.namedOfficerData?.find((o) => o.id === 'off_x');
        expect(x?.combat_record).toBeUndefined();
    });
});

// ─── Dossier component smoke (read-only render) ──────────────────────────────

const OFFICER_WITH_RECORD: NamedOfficerView = {
    id: 'off_a',
    name: 'Officer A',
    faction: 'RBiH',
    rank: 'corps_commander',
    competence: 4,
    aggressiveness: 4,
    defensive_skill: 3,
    political_reliability: 3,
    origin: 'jna',
    status: 'active',
    assigned_corps_id: 'arbih_1st_corps',
    acting_commander: false,
    turns_in_command: 12,
    battles: 3,
    victories: 2,
    bio_short: 'A capable corps commander with a long service record.',
    command_style: 'Methodical staff planner',
    known_for: 'The Una offensive',
    combat_record: {
        operations_commanded: 3,
        wins: 1,
        partials: 1,
        failures: 1,
        casualties_suffered: 1400,
        casualties_inflicted: 720,
        objectives_captured: 3,
        last_operation: { name: 'Op Three', outcome: 'failure', ended_turn: 40 },
    },
};

const OFFICER_ZERO_STATE: NamedOfficerView = {
    id: 'off_quiet',
    name: 'Quiet Officer',
    faction: 'HRHB',
    rank: 'deputy',
    competence: 2,
    aggressiveness: 2,
    defensive_skill: 2,
    political_reliability: 3,
    origin: 'hv',
    status: 'reserve',
    assigned_corps_id: null,
    acting_commander: false,
    turns_in_command: 0,
    battles: 0,
    victories: 0,
};

const OFFICER_WAR_CRIMES: NamedOfficerView = {
    ...OFFICER_WITH_RECORD,
    id: 'off_wc',
    name: 'Indicted Officer',
    war_crimes_record: {
        court: 'ICTY',
        verdict: 'convicted',
        sentence: 'Life imprisonment',
        charges: 'Genocide; crimes against humanity',
        summary: 'Convicted by the ICTY.',
    },
};

describe('OfficerDossierPanel renders read-only dossier', () => {
    afterEach(() => setLocale('en'));

    it('renders identity, combat record, command status, and bio prose', () => {
        const html = renderToStaticMarkup(
            React.createElement(OfficerDossierPanel, { officer: OFFICER_WITH_RECORD, onClose: () => {} }),
        );
        expect(html).toContain('Officer A');
        expect(html).toContain('Combat Record');
        // combat-record numbers
        expect(html).toContain('1,400');
        expect(html).toContain('720');
        expect(html).toContain('Op Three');
        // command status + bio prose
        expect(html).toContain('Command Status');
        expect(html).toContain('A capable corps commander');
        expect(html).toContain('Methodical staff planner');
        expect(html).toContain('The Una offensive');
    });

    it('renders gracefully for a zero-state officer (no ops, no war crimes, no bio)', () => {
        const html = renderToStaticMarkup(
            React.createElement(OfficerDossierPanel, { officer: OFFICER_ZERO_STATE, onClose: () => {} }),
        );
        expect(html).toContain('Quiet Officer');
        // No combat-record section for an officer with no ops.
        expect(html).not.toContain('Combat Record');
        // Command status still renders, with the unassigned fallback.
        expect(html).toContain('Command Status');
        expect(html).toContain('Unassigned');
    });

    it('renders the war-crimes record verbatim from stored fields', () => {
        const html = renderToStaticMarkup(
            React.createElement(OfficerDossierPanel, { officer: OFFICER_WAR_CRIMES, onClose: () => {} }),
        );
        expect(html).toContain('ICTY');
        expect(html).toContain('Life imprisonment');
        expect(html).toContain('Genocide; crimes against humanity');
        expect(html).toContain('Convicted by the ICTY.');
    });

    it('OfficerProfile hides future legal status unless rendered as an explicit dossier', () => {
        const liveProfile = renderToStaticMarkup(
            React.createElement(OfficerProfile, { officer: OFFICER_WAR_CRIMES, label: 'LIVE COMMAND' }),
        );
        expect(liveProfile).not.toContain('WAR CRIMES - CONVICTED');
        expect(liveProfile).not.toContain('Life imprisonment');
        expect(liveProfile).not.toContain('Convicted by the ICTY.');

        const dossierProfile = renderToStaticMarkup(
            React.createElement(OfficerProfile, {
                officer: OFFICER_WAR_CRIMES,
                label: 'DOSSIER',
                showWarCrimesRecord: true,
            }),
        );
        expect(dossierProfile).toContain('WAR CRIMES - CONVICTED');
        expect(dossierProfile).toContain('Life imprisonment');
    });

    it('OfficerProfile renders the combat record block only in non-compact mode', () => {
        const full = renderToStaticMarkup(
            React.createElement(OfficerProfile, { officer: OFFICER_WITH_RECORD, label: 'TEST' }),
        );
        expect(full).toContain('Combat Record');

        const compact = renderToStaticMarkup(
            React.createElement(OfficerProfile, { officer: OFFICER_WITH_RECORD, label: 'TEST', compact: true }),
        );
        expect(compact).not.toContain('Combat Record');
    });
});

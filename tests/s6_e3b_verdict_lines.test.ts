/**
 * §6 E3b verdict (ruling 2026-11-17, signed 6/6): two war-crimes lines per side, in a fixed side
 * order, counting INCIDENTS, never deltas.
 *   - "Recorded in the historical record of this campaign" (every scripted war-crimes card that
 *     fired; option-level effects via event_decision_log), stating plainly what fired, genocide
 *     included where the Srebrenica record holds it.
 *   - "Authorized in play" (the authored count).
 * "Grave" = an authored incident or a §3.4 condemnation flag; the historical line then takes the
 * same severity (equal prominence). Copy is DRAFT for the §4 panel.
 */
import { describe, expect, it } from 'vitest';
import { buildCostLedger, COST_LEDGER_SOURCES } from '../src/sim/endgame/cost_ledger.js';
import { computeFactionVerdict } from '../src/sim/negotiation/scoring.js';
import { buildDisplayFindings } from '../src/ui/map/data/verdictFindings.js';
import { buildFactionFigureRows } from '../src/ui/map/data/verdictFigures.js';
import { enMessages } from '../src/ui/map/i18n/messages.en.js';
import { bcsMessages } from '../src/ui/map/i18n/messages.bcs.js';
import type { GameState } from '../src/state/game_state.js';

function capital(over: Record<string, unknown> = {}) {
    return {
        territory_controlled_pct: 30,
        territory_controlled_km2: 15000,
        civilians_under_protection: 0,
        refugees_created: 0,
        refugees_received: 0,
        military_casualties_inflicted: 0,
        military_casualties_taken: 0,
        civilian_casualties_caused: 0,
        enclaves_held: [],
        enclaves_lost: [],
        peace_plans_accepted: [],
        peace_plans_rejected: [],
        operations_launched: 0,
        operations_successful: 0,
        war_crimes_events: 0,
        war_crimes_events_emergent: 0,
        ...over,
    };
}

function state(over: {
    capital?: Record<string, Record<string, unknown>>;
    fires?: Record<string, number>;
    genocide?: boolean;
} = {}): GameState {
    return {
        meta: { turn: 188 },
        military: {
            casualty_ledger: {},
            event_fire_counts: over.fires ?? {},
            event_decision_log: [],
            negotiation: {
                capital: {
                    RBiH: capital(over.capital?.RBiH),
                    RS: capital(over.capital?.RS),
                    HRHB: capital(over.capital?.HRHB),
                },
                rupture_consequences: over.genocide
                    ? [{ id: 'srebrenica_genocide_1995', recorded_turn: 171, perpetrator_faction: 'RS', description: 'Fall of the Srebrenica safe area', condemnation_flag: 'genocide_condemnation' }]
                    : [],
            },
        },
        displacement: {},
        political: { political_controllers: {} },
    } as unknown as GameState;
}

/** RBiH: one scripted card, two recorded war crimes. RS: three cards (one authored), 11 in deltas. */
const RUN = state({
    capital: {
        RBiH: { war_crimes_events: 3, war_crimes_events_emergent: 2 },
        RS: { war_crimes_events: 10 },
    },
    fires: {
        trusina_killings_1993: 1,
        sarajevo_siege_begins_1992: 1,
        csq_accelerated_camps_discovery_1992: 1,
        srebrenica_falls_1995: 1,
    },
    genocide: true,
});

const warCrimeFindings = (s: GameState) => buildCostLedger(s).findings.filter((f) => f.category === 'war_crimes');

describe('two lines per side, fixed side order, incidents not deltas', () => {
    it('runs RBiH, RS, HRHB, the historical record before what was authorized; a side with neither is absent', () => {
        expect(warCrimeFindings(RUN).map((f) => f.id)).toEqual([
            'war_crimes_record_RBiH',
            'war_crimes_authorized_RBiH',
            'war_crimes_record_RS',
            'war_crimes_authorized_RS',
        ]);
    });

    it('counts incidents and names what fired', () => {
        const byId = new Map(warCrimeFindings(RUN).map((f) => [f.id, f]));
        expect(byId.get('war_crimes_record_RBiH')!.title).toBe('Recorded in the historical record of this campaign: ARBiH forces');
        expect(byId.get('war_crimes_record_RBiH')!.text).toBe('1 recorded incident: Trusina Killings.');
        expect(byId.get('war_crimes_authorized_RBiH')!.title).toBe('Authorized in play: ARBiH forces');
        expect(byId.get('war_crimes_authorized_RBiH')!.text).toBe('2 incidents authorized in play.');
        const rs = byId.get('war_crimes_record_RS')!.text;
        expect(rs.startsWith('3 recorded incidents: Siege of Sarajevo Intensifies, The Camps Are Found, Srebrenica Falls.')).toBe(true);
        expect(byId.get('war_crimes_authorized_RS')!.text).toBe('1 incident authorized in play.');
        for (const finding of byId.values()) expect(finding.text).not.toMatch(/\b(10|11)\b/);
    });

    it('states the genocide plainly where the Srebrenica record holds it, with the adjudication', () => {
        const rs = warCrimeFindings(RUN).find((f) => f.id === 'war_crimes_record_RS')!;
        expect(rs.text).toContain('The ICTY held the Srebrenica killings to be genocide, as did the International Court of Justice.');
        expect(rs.sources).toEqual([COST_LEDGER_SOURCES.srebrenicaGenocideAdjudication]);
        expect(COST_LEDGER_SOURCES.srebrenicaGenocideAdjudication).toContain('IT-98-33-A (2004)');
        expect(COST_LEDGER_SOURCES.srebrenicaGenocideAdjudication).toContain('ICJ, Bosnia and Herzegovina v. Serbia and Montenegro (2007)');
        const noRupture = warCrimeFindings(state({ fires: { srebrenica_falls_1995: 1 } })).find((f) => f.id === 'war_crimes_record_RS')!;
        expect(noRupture.text).not.toMatch(/genocide/i);
        expect(noRupture.sources).toEqual([]);
        for (const finding of warCrimeFindings(RUN)) {
            expect(finding.text).not.toMatch(/adjudicated|convicted|massacre was/i);
            if (finding.id !== 'war_crimes_record_RS') expect(finding.sources).toEqual([]);
        }
    });

    it('shows the "none" line beside the other when one count is zero', () => {
        const onlyAuthored = warCrimeFindings(state({ capital: { HRHB: { war_crimes_events: 1, war_crimes_events_emergent: 1 } } }));
        expect(onlyAuthored.map((f) => [f.id, f.text])).toEqual([
            ['war_crimes_record_HRHB', 'No recorded incident.'],
            ['war_crimes_authorized_HRHB', '1 incident authorized in play.'],
        ]);
        const onlyRecorded = warCrimeFindings(state({ fires: { ahmici_massacre_1993: 1 } }));
        expect(onlyRecorded.map((f) => [f.id, f.text])).toEqual([
            ['war_crimes_record_HRHB', '1 recorded incident: Ahmići Massacre.'],
            ['war_crimes_authorized_HRHB', 'No incident authorized in play.'],
        ]);
    });
});

describe('grave = an authored incident or a §3.4 condemnation flag; both lines share it', () => {
    it('an authored incident makes both of the side\'s lines grave', () => {
        const byId = new Map(warCrimeFindings(RUN).map((f) => [f.id, f.severity]));
        expect(byId.get('war_crimes_record_RBiH')).toBe('grave');
        expect(byId.get('war_crimes_authorized_RBiH')).toBe('grave');
    });

    it('a condemnation flag with nothing authored still makes both grave', () => {
        const s = state({ fires: { srebrenica_falls_1995: 1 }, genocide: true });
        expect(warCrimeFindings(s).map((f) => f.severity)).toEqual(['grave', 'grave']);
    });

    it('a recorded incident alone, with no flag, is a record on both lines (the old >= 10 delta rule is gone)', () => {
        const s = state({ capital: { RS: { war_crimes_events: 12 } }, fires: { sarajevo_siege_begins_1992: 1, markale_massacre_1994: 1, second_markale_massacre_1995: 1, tuzla_gate_massacre_1995: 1 } });
        expect(warCrimeFindings(s).map((f) => f.severity)).toEqual(['record', 'record']);
    });
});

describe('the verdict carries the incident counts; the figures show both lines, never deltas', () => {
    it('computeFactionVerdict records recorded and authored incidents', () => {
        expect(computeFactionVerdict(RUN, 'RS').war_crime_incidents).toEqual({ recorded: 3, authorized: 1 });
        expect(computeFactionVerdict(RUN, 'HRHB').war_crime_incidents).toEqual({ recorded: 0, authorized: 0 });
    });

    it('the figure rows show the two lines together and drop the delta row', () => {
        const rows = buildFactionFigureRows({
            verdict: computeFactionVerdict(RUN, 'RS'),
            frontLine: { held: 10, total: 20 },
            settled: false,
            brigadeCount: 0,
            personnel: 0,
        });
        const crimeRows = rows.filter((r) => r.id.startsWith('war_crime'));
        expect(crimeRows.map((r) => [r.id, r.label, r.value, r.kind])).toEqual([
            ['war_crimes_recorded', 'Recorded in the historical record of this campaign', '3', 'record'],
            ['war_crimes_authorized', 'Authorized in play', '1', 'record'],
        ]);
    });
});

describe('display: localized, fixed order, EN and BCS keys present', () => {
    it('the Verdict shows the engine lines in the same order and words', () => {
        const ledger = buildCostLedger(RUN);
        const display = buildDisplayFindings(ledger).filter((f) => f.category === 'war_crimes');
        const engine = ledger.findings.filter((f) => f.category === 'war_crimes');
        expect(display.map((f) => [f.id, f.title, f.text, f.severity])).toEqual(engine.map((f) => [f.id, f.title, f.text, f.severity]));
        expect(display.find((f) => f.id === 'war_crimes_record_RS')!.sources).toEqual([COST_LEDGER_SOURCES.srebrenicaGenocideAdjudication]);
    });

    it('every new key has EN and BCS copy', () => {
        const keys = [
            'warCost.finding.warCrimesRecorded.title',
            'warCost.finding.warCrimesRecorded.text',
            'warCost.finding.warCrimesRecorded.textOne',
            'warCost.finding.warCrimesRecorded.none',
            'warCost.finding.warCrimesRecorded.genocide',
            'warCost.finding.warCrimesAuthorized.title',
            'warCost.finding.warCrimesAuthorized.text',
            'warCost.finding.warCrimesAuthorized.textOne',
            'warCost.finding.warCrimesAuthorized.none',
            'verdict.report.stat.warCrimesRecorded',
            'verdict.report.stat.warCrimesAuthorized',
        ] as const;
        for (const key of keys) {
            expect(enMessages[key as keyof typeof enMessages], key).toBeTruthy();
            expect(bcsMessages[key as keyof typeof bcsMessages], key).toBeTruthy();
        }
    });
});

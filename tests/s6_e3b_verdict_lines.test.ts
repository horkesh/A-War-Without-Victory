/**
 * §6 E3b verdict (ruling 2026-11-17, signed 6/6): two war-crimes lines per side, in a fixed side
 * order, counting INCIDENTS, never deltas.
 *   - "Historical war-crimes record of this campaign" (every scripted war-crimes card that fired,
 *     by its signed incident label; option-level effects via event_decision_log), with the
 *     Srebrenica genocide stated plainly where the record holds it.
 *   - "War crimes arising from decisions in play" (the authored count).
 * "Grave" = an authored incident or a §3.4 condemnation flag; both shown lines then take the same
 * severity (equal prominence).
 *
 * Copy signed: SHDG §4 panel (narrative designer + historian), 2026-11-18. False-zero rule: the
 * record line shows only with a recorded incident or the genocide record; the decisions-in-play
 * line shows above zero, or beside a shown record line; a side with neither has no line.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
    buildCostLedger,
    COST_LEDGER_SOURCES,
    formatRecordedWarCrimeIncidents,
    WAR_CRIME_INCIDENT_LABELS,
} from '../src/sim/endgame/cost_ledger.js';
import { computeFactionGrade, computeFactionVerdict } from '../src/sim/negotiation/scoring.js';
import { SHIPPED_WAR_CRIME_CARDS } from '../src/sim/events/authored_war_crimes.js';
import { buildDisplayFindings } from '../src/ui/map/data/verdictFindings.js';
import { buildFactionFigureRows } from '../src/ui/map/data/verdictFigures.js';
import { setLocale } from '../src/ui/map/i18n/index.js';
import { enMessages } from '../src/ui/map/i18n/messages.en.js';
import { bcsMessages } from '../src/ui/map/i18n/messages.bcs.js';
import type { GameState } from '../src/state/game_state.js';
import type { NegotiationBreakdown } from '../src/state/negotiation_types.js';

afterEach(() => {
    setLocale('en');
});

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

const GENOCIDE_EN = 'The ICTY held the Srebrenica killings to be genocide, as did the International Court of Justice.';

const warCrimeFindings = (s: GameState) => buildCostLedger(s).findings.filter((f) => f.category === 'war_crimes');
const lines = (s: GameState) => warCrimeFindings(s).map((f) => [f.id, f.text]);
const figureRows = (s: GameState, faction: string) => buildFactionFigureRows({
    verdict: computeFactionVerdict(s, faction),
    frontLine: { held: 10, total: 20 },
    settled: false,
    brigadeCount: 0,
    personnel: 0,
}).filter((r) => r.id.startsWith('war_crime')).map((r) => [r.id, r.value]);

/** The signed incident labels (SHDG §4 panel, 2026-11-18), EN and BCS, for all 19 cards. */
const SIGNED_LABELS: Record<string, [en: string, bcs: string]> = {
    srebrenica_falls_1995: ['Srebrenica genocide', 'Genocid u Srebrenici'],
    zepa_falls_1995: ['Forcible transfer from Žepa', 'Prisilno premještanje stanovništva Žepe'],
    concentration_camps_revealed_1992: ['Omarska, Keraterm and Trnopolje camps', 'Logori Omarska, Keraterm i Trnopolje'],
    csq_accelerated_camps_discovery_1992: ['Prijedor-area camps exposed', 'Razotkriveni logori na području Prijedora'],
    drina_valley_ethnic_cleansing_1992: ['Ethnic cleansing in the Drina valley', 'Etničko čišćenje u dolini Drine'],
    sarajevo_siege_begins_1992: ['Siege of Sarajevo: shelling and sniping of civilians', 'Opsada Sarajeva: granatiranje i snajpersko djelovanje po civilima'],
    markale_area_shelling_1993: ['Shelling of civilians in Sarajevo', 'Granatiranje civila u Sarajevu'],
    markale_massacre_1994: ['First Markale massacre', 'Prvi masakr na Markalama'],
    second_markale_massacre_1995: ['Second Markale massacre', 'Drugi masakr na Markalama'],
    tuzla_gate_massacre_1995: ['Tuzla Gate massacre', 'Masakr na Tuzlanskoj kapiji'],
    un_hostage_crisis_1995: ['Taking of UN personnel as hostages', 'Uzimanje pripadnika UN-a za taoce'],
    ahmici_massacre_1993: ['Ahmići massacre', 'Masakr u Ahmićima'],
    sovici_doljani_attack_1993: ['Sovići-Doljani attack', 'Napad na Soviće i Doljane'],
    east_mostar_siege_1993: ['Siege of East Mostar', 'Opsada istočnog Mostara'],
    hvo_detention_camps_1993: ['HVO detention camps', 'Logori HVO-a'],
    hrhb_camp_exposure_response_1993: ['Heliodrom, Dretelj and Gabela camps exposed', 'Razotkriveni logori Heliodrom, Dretelj i Gabela'],
    stupni_do_massacre_1993: ['Stupni Do massacre', 'Masakr u Stupnom Dolu'],
    trusina_killings_1993: ['Trusina killings', 'Ubistva u Trusini'],
    grabovica_uzdol_massacres_1993: ['Grabovica and Uzdol massacres', 'Masakri u Grabovici i Uzdolu'],
};

describe('two lines per side, fixed side order, incidents not deltas', () => {
    it('runs RBiH, RS, HRHB, the historical record before decisions in play; a side with neither is absent', () => {
        expect(warCrimeFindings(RUN).map((f) => f.id)).toEqual([
            'war_crimes_record_RBiH',
            'war_crimes_authorized_RBiH',
            'war_crimes_record_RS',
            'war_crimes_authorized_RS',
        ]);
    });

    it('counts incidents and names what fired by its signed label', () => {
        const byId = new Map(warCrimeFindings(RUN).map((f) => [f.id, f]));
        expect(byId.get('war_crimes_record_RBiH')!.title).toBe('Historical war-crimes record of this campaign: ARBiH forces');
        expect(byId.get('war_crimes_record_RBiH')!.text).toBe('1 recorded incident: Trusina killings.');
        expect(byId.get('war_crimes_authorized_RBiH')!.title).toBe('War crimes arising from decisions in play: ARBiH forces');
        expect(byId.get('war_crimes_authorized_RBiH')!.text).toBe('2 incidents arose from decisions in play.');
        expect(byId.get('war_crimes_record_RS')!.text).toBe(
            '3 recorded incidents: Siege of Sarajevo: shelling and sniping of civilians, Prijedor-area camps exposed, '
            + `Srebrenica genocide. ${GENOCIDE_EN}`,
        );
        expect(byId.get('war_crimes_authorized_RS')!.text).toBe('1 incident arose from decisions in play.');
        for (const finding of byId.values()) expect(finding.text).not.toMatch(/\b(10|11)\b/);
    });

    it('states the genocide plainly where the Srebrenica record holds it, with the signed adjudication', () => {
        const rs = warCrimeFindings(RUN).find((f) => f.id === 'war_crimes_record_RS')!;
        expect(rs.text).toContain(GENOCIDE_EN);
        expect(rs.sources).toEqual([COST_LEDGER_SOURCES.srebrenicaGenocideAdjudication]);
        expect(COST_LEDGER_SOURCES.srebrenicaGenocideAdjudication).toBe(
            'ICTY: Prosecutor v. Radislav Krstić, IT-98-33-A, Appeal Judgement (19 April 2004); '
            + 'ICJ, Application of the Genocide Convention (Bosnia and Herzegovina v. Serbia and Montenegro), '
            + 'Judgment (26 February 2007)',
        );
        const noRupture = warCrimeFindings(state({ fires: { srebrenica_falls_1995: 1 } })).find((f) => f.id === 'war_crimes_record_RS')!;
        expect(noRupture.text).toBe('1 recorded incident: Srebrenica genocide.');
        expect(noRupture.sources).toEqual([]);
        for (const finding of warCrimeFindings(RUN)) {
            expect(finding.text).not.toMatch(/adjudicated|convicted|massacre was/i);
            if (finding.id !== 'war_crimes_record_RS') expect(finding.sources).toEqual([]);
        }
    });
});

describe('false zero: a line shows only when it has something true to state', () => {
    it('recorded 0 without genocide: the record line is hidden; the decisions-in-play line shows its count', () => {
        const s = state({ capital: { HRHB: { war_crimes_events: 1, war_crimes_events_emergent: 1 } } });
        expect(lines(s)).toEqual([
            ['war_crimes_authorized_HRHB', '1 incident arose from decisions in play.'],
        ]);
        expect(warCrimeFindings(s).map((f) => f.severity)).toEqual(['grave']);
    });

    it('recorded 0 with genocide: the record line is the genocide sentence alone, beside the none line', () => {
        const s = state({ genocide: true });
        const findings = warCrimeFindings(s);
        expect(findings.map((f) => [f.id, f.title, f.text])).toEqual([
            ['war_crimes_record_RS', 'Historical war-crimes record of this campaign: Bosnian Serb forces', GENOCIDE_EN],
            ['war_crimes_authorized_RS', 'War crimes arising from decisions in play: Bosnian Serb forces', 'No incident arose from decisions in play.'],
        ]);
        expect(findings[0]!.sources).toEqual([COST_LEDGER_SOURCES.srebrenicaGenocideAdjudication]);
        expect(findings.map((f) => f.severity)).toEqual(['grave', 'grave']);
    });

    it('authorized 0 beside a shown record line: the decisions-in-play line reads none', () => {
        expect(lines(state({ fires: { ahmici_massacre_1993: 1 } }))).toEqual([
            ['war_crimes_record_HRHB', '1 recorded incident: Ahmići massacre.'],
            ['war_crimes_authorized_HRHB', 'No incident arose from decisions in play.'],
        ]);
    });

    it('both 0: the side has no war-crimes findings', () => {
        expect(warCrimeFindings(state())).toEqual([]);
        expect(warCrimeFindings(RUN).some((f) => f.faction === 'HRHB')).toBe(false);
    });

    it('no line ever states a false zero for the record', () => {
        for (const s of [RUN, state(), state({ genocide: true }), state({ capital: { RS: { war_crimes_events_emergent: 2 } } })]) {
            for (const finding of warCrimeFindings(s)) {
                expect(finding.text.trim().length).toBeGreaterThan(0);
                expect(finding.text).not.toMatch(/no recorded incident/i);
            }
        }
    });

    it('the display carries no empty card in any hiding case', () => {
        const isLine = (id: string) => id.startsWith('war_crimes_record_') || id.startsWith('war_crimes_authorized_');
        for (const s of [state(), state({ genocide: true }), state({ capital: { HRHB: { war_crimes_events_emergent: 1 } } }), state({ fires: { ahmici_massacre_1993: 1 } })]) {
            const engine = warCrimeFindings(s).filter((f) => isLine(f.id));
            const display = buildDisplayFindings(buildCostLedger(s)).filter((f) => isLine(f.id));
            expect(display.map((f) => [f.id, f.title, f.text])).toEqual(engine.map((f) => [f.id, f.title, f.text]));
            for (const finding of display) expect(finding.text.trim().length).toBeGreaterThan(0);
        }
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

describe('the verdict carries the incident counts; the figures follow the false-zero rule', () => {
    it('computeFactionVerdict records recorded and authored incidents', () => {
        expect(computeFactionVerdict(RUN, 'RS').war_crime_incidents).toEqual({ recorded: 3, authorized: 1 });
        expect(computeFactionVerdict(RUN, 'HRHB').war_crime_incidents).toEqual({ recorded: 0, authorized: 0 });
    });

    it('both counts above zero: both rows, with the signed labels', () => {
        const rows = buildFactionFigureRows({
            verdict: computeFactionVerdict(RUN, 'RS'),
            frontLine: { held: 10, total: 20 },
            settled: false,
            brigadeCount: 0,
            personnel: 0,
        });
        const crimeRows = rows.filter((r) => r.id.startsWith('war_crime'));
        expect(crimeRows.map((r) => [r.id, r.label, r.value, r.kind])).toEqual([
            ['war_crimes_recorded', 'War-crime incidents, historical record', '3', 'record'],
            ['war_crimes_authorized', 'War-crime incidents arising from decisions in play', '1', 'record'],
        ]);
    });

    it('recorded 0: no recorded row; the authorized row only above zero', () => {
        expect(figureRows(state({ capital: { HRHB: { war_crimes_events_emergent: 1 } } }), 'HRHB')).toEqual([
            ['war_crimes_authorized', '1'],
        ]);
        expect(figureRows(state({ genocide: true }), 'RS')).toEqual([]);
    });

    it('authorized 0 beside a shown recorded row: the authorized row reads 0', () => {
        expect(figureRows(state({ fires: { ahmici_massacre_1993: 1 } }), 'HRHB')).toEqual([
            ['war_crimes_recorded', '1'],
            ['war_crimes_authorized', '0'],
        ]);
    });

    it('both 0: no war-crimes row', () => {
        expect(figureRows(state(), 'RBiH')).toEqual([]);
    });
});

describe('incident labels: signed EN and BCS for every war-crimes card; the card title as a fallback', () => {
    it('every shipped war-crimes card has exactly its signed label in EN and BCS, and the engine uses the EN one', () => {
        const shipped = SHIPPED_WAR_CRIME_CARDS.cards.map((card) => card.event_id).sort();
        expect(shipped).toEqual(Object.keys(SIGNED_LABELS).sort());
        expect(Object.keys(WAR_CRIME_INCIDENT_LABELS).sort()).toEqual(shipped);
        const en = enMessages as Record<string, string>;
        const bcs = bcsMessages as Record<string, string | undefined>;
        for (const [eventId, [enLabel, bcsLabel]] of Object.entries(SIGNED_LABELS)) {
            expect(en[`warCost.incident.${eventId}`], eventId).toBe(enLabel);
            expect(bcs[`warCost.incident.${eventId}`], eventId).toBe(bcsLabel);
            expect(WAR_CRIME_INCIDENT_LABELS[eventId], eventId).toBe(enLabel);
        }
        const incidentKeys = Object.keys(enMessages).filter((key) => key.startsWith('warCost.incident.'));
        expect(incidentKeys.sort()).toEqual(shipped.map((id) => `warCost.incident.${id}`));
    });

    it('the Verdict lists incidents by their BCS label in BCS', () => {
        setLocale('bcs');
        const display = buildDisplayFindings(buildCostLedger(RUN));
        expect(display.find((f) => f.id === 'war_crimes_record_RBiH')!.text).toContain('Ubistva u Trusini');
        const rs = display.find((f) => f.id === 'war_crimes_record_RS')!;
        expect(rs.title).toBe('Historijska evidencija ratnih zločina u ovoj kampanji: snage bosanskih Srba');
        expect(rs.text).toContain('Opsada Sarajeva: granatiranje i snajpersko djelovanje po civilima, Razotkriveni logori na području Prijedora, Genocid u Srebrenici');
        expect(display.find((f) => f.id === 'war_crimes_authorized_RS')!.title)
            .toBe('Ratni zločini proistekli iz odluka u igri: snage bosanskih Srba');
        expect(display.find((f) => f.id === 'war_crimes_authorized_RS')!.text).toBe('Broj incidenata proisteklih iz odluka u igri: 1.');
    });

    it('a card without a label falls back to its card title, in the engine and on the Verdict', () => {
        const unlabelled = { event_id: 'test_unlabelled_card', title: 'Unlabelled Card', count: 2 };
        expect(formatRecordedWarCrimeIncidents([
            { event_id: 'trusina_killings_1993', title: 'Trusina Killings', count: 1 },
            unlabelled,
        ])).toBe('Trusina killings, Unlabelled Card (2)');

        const ledger = buildCostLedger(RUN);
        const rbih = ledger.entries.find((entry) => entry.faction === 'RBiH')!;
        rbih.war_crime_incidents = {
            ...rbih.war_crime_incidents!,
            recorded: 3,
            recorded_incidents: [...rbih.war_crime_incidents!.recorded_incidents, unlabelled],
        };
        expect(buildDisplayFindings(ledger).find((f) => f.id === 'war_crimes_record_RBiH')!.text)
            .toBe('3 recorded incidents: Trusina killings, Unlabelled Card (2).');
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

    it('the signed strings, EN and BCS; the record line has no none string', () => {
        const signed: Array<[key: string, en: string, bcs: string]> = [
            ['warCost.finding.warCrimesRecorded.title', 'Historical war-crimes record of this campaign: {forces}', 'Historijska evidencija ratnih zločina u ovoj kampanji: {forces}'],
            ['warCost.finding.warCrimesAuthorized.title', 'War crimes arising from decisions in play: {forces}', 'Ratni zločini proistekli iz odluka u igri: {forces}'],
            ['warCost.finding.warCrimesAuthorized.text', '{count} incidents arose from decisions in play.', 'Broj incidenata proisteklih iz odluka u igri: {count}.'],
            ['warCost.finding.warCrimesAuthorized.textOne', '{count} incident arose from decisions in play.', 'Broj incidenata proisteklih iz odluka u igri: {count}.'],
            ['warCost.finding.warCrimesAuthorized.none', 'No incident arose from decisions in play.', 'Nijedan incident nije proistekao iz odluka u igri.'],
            ['verdict.report.stat.warCrimesRecorded', 'War-crime incidents, historical record', 'Incidenti ratnih zločina, historijska evidencija'],
            ['verdict.report.stat.warCrimesAuthorized', 'War-crime incidents arising from decisions in play', 'Incidenti ratnih zločina proistekli iz odluka u igri'],
        ];
        const en = enMessages as Record<string, string>;
        const bcs = bcsMessages as Record<string, string | undefined>;
        for (const [key, enText, bcsText] of signed) {
            expect(en[key], key).toBe(enText);
            expect(bcs[key], key).toBe(bcsText);
        }
        for (const key of ['warCost.finding.warCrimesRecorded.text', 'warCost.finding.warCrimesRecorded.textOne', 'warCost.finding.warCrimesRecorded.genocide']) {
            expect(en[key], key).toBeTruthy();
            expect(bcs[key], key).toBeTruthy();
        }
        expect(Object.prototype.hasOwnProperty.call(en, 'warCost.finding.warCrimesRecorded.none')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(bcs, 'warCost.finding.warCrimesRecorded.none')).toBe(false);
    });
});

describe('A+ grade descriptions, as signed', () => {
    const cap = (over: Record<string, unknown>) => capital(over) as unknown as NegotiationBreakdown;
    it('RBiH, RS and HRHB', () => {
        const s = state();
        expect(computeFactionGrade(cap({ territory_controlled_pct: 40 }), 'RBiH', s)).toEqual({
            grade: 'A+',
            description: 'Held more than 33% of the territory and lost no enclave, with no war-crime incident arising from decisions in play',
        });
        expect(computeFactionGrade(cap({ territory_controlled_pct: 60 }), 'RS', s)).toEqual({
            grade: 'A+',
            description: 'Held more than 55% of the territory, with no war-crime incident arising from decisions in play',
        });
        expect(computeFactionGrade(cap({ territory_controlled_pct: 25 }), 'HRHB', s)).toEqual({
            grade: 'A+',
            description: 'Held more than 20% of the territory with internal cohesion at 50 or above, and no war-crime incident arising from decisions in play',
        });
    });
});

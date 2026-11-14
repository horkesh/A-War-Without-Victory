/**
 * Guard: player-facing strings carry no developer text.
 *
 * Council fix 4 (R8 dry run, 2026-11-14; C1, C7, C14): dossiers showed worksheet ids, repo
 * paths, turn windows, "the row's", "calibration baseline", "machine-drafted", design-gate
 * citations and "not applicable" bullets. This test scans every string a player can read from
 * the message catalogues, the event catalogues and the officer prose, using the same denylist
 * the display filters use (`src/ui/shared/developerText.ts`).
 *
 * A legitimate use goes in ALLOWLIST with its reason. Deterministic: sources are read in a
 * fixed order and hits are sorted with strictCompare before the assertion.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { EventDefinition } from '../../src/sim/events/event_types';
import { restoreBosnianProperNames } from '../../src/ui/shared/bosnianPlaceNames';
import { enMessages } from '../../src/ui/map/i18n/messages.en';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs';
import { OFFICER_PROSE_BCS, OFFICER_PROSE_EN } from '../../src/ui/map/i18n/officerProse';
import {
    displayEventProse,
    resolveEventDisplayNarrative,
    resolveEventDisplayTitle,
    resolveEventNotificationDisplay,
    resolveEventSourceLine,
} from '../../src/ui/map/data/eventDisplayCopy';
import { resolvePredictedExplanation, resolvePredictedLabel } from '../../src/ui/map/data/consequenceReceipts';
import { DEVELOPER_TERMS, findDeveloperTerms, firstPlayerSafeText } from '../../src/ui/shared/developerText';
import { strictCompare } from '../../src/state/validateGameState';
import officerData from '../../data/scenarios/officers/apr1992_officers.json';
import war1992 from '../../data/scenarios/events/war_1992.json';
import war1992HrhbSummer from '../../data/scenarios/events/war_1992_hrhb_summer.json';
import war1993 from '../../data/scenarios/events/war_1993.json';
import war1994 from '../../data/scenarios/events/war_1994.json';
import war1995 from '../../data/scenarios/events/war_1995.json';
import consequences from '../../data/scenarios/events/consequences.json';

interface PlayerString {
    /** Where the string comes from: `en:<key>`, `bcs:<key>`, `event:<id>.<field>`, `officer:<field>`. */
    source: string;
    text: string;
}

interface AllowEntry {
    source: string;
    term: string;
    reason: string;
}

/**
 * Legitimate uses. Keep each entry narrow (one source, one term) and give the reason.
 */
const ALLOWLIST: ReadonlyArray<AllowEntry> = [
    {
        source: 'en:opportunity.axis.notApplicable',
        term: 'not_applicable',
        reason: 'Army HQ axis-state chip; the dossier panel hides not-applicable axes, this label is the fallback name of the state.',
    },
    {
        source: 'bcs:opportunity.axis.notApplicable',
        term: 'not_applicable',
        reason: 'BCS name of the same axis state; hidden on the dossier panel like the English one.',
    },
    {
        source: 'essay:un_resolution_819_srebrenica_1993.json.content',
        term: 'calibration',
        reason: 'Ordinary English in the essay ("the action it took would be calibrated to the minimum necessary"), not the calibration process.',
    },
    {
        source: 'en:humanitarianLedger.note.scope',
        term: 'row',
        reason: 'Means a visible row of the Humanitarian Ledger table; wording signed by the 2026-11-13 displacement-attribution panel (SENSITIVE_HISTORY_DESIGN_GATE.md §6).',
    },
];

const EVENT_CATALOGS: ReadonlyArray<ReadonlyArray<EventDefinition>> = [
    war1992, war1992HrhbSummer, war1993, war1994, war1995, consequences,
] as unknown as ReadonlyArray<ReadonlyArray<EventDefinition>>;

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

const eventById: ReadonlyMap<string, EventDefinition> = new Map(
    EVENT_CATALOGS.flatMap((catalog) => catalog.map((def) => [def.id, def] as const)),
);

function push(out: PlayerString[], source: string, text: unknown): void {
    if (typeof text === 'string' && text.trim().length > 0) out.push({ source, text });
}

function messageStrings(): PlayerString[] {
    const out: PlayerString[] = [];
    for (const key of Object.keys(enMessages).sort(strictCompare)) push(out, `en:${key}`, (enMessages as Record<string, string>)[key]);
    for (const key of Object.keys(bcsMessages).sort(strictCompare)) push(out, `bcs:${key}`, (bcsMessages as Record<string, string | undefined>)[key]);
    return out;
}

function officerStrings(): PlayerString[] {
    const out: PlayerString[] = [];
    const fields = ['bio_short', 'command_style', 'known_for', 'political_alignment_note'] as const;
    for (const officer of (officerData as { officers: Array<Record<string, unknown>> }).officers) {
        for (const field of fields) {
            const raw = officer[field];
            if (typeof raw !== 'string') continue;
            push(out, `officer:${String(officer.id)}.${field}:en`, OFFICER_PROSE_EN[raw] ?? raw);
            push(out, `officer:${String(officer.id)}.${field}:bcs`, OFFICER_PROSE_BCS[raw] ?? raw);
        }
    }
    return out;
}

/** Strings a player can read from one event, in either locale, as the UI resolves them. */
function eventStrings(def: EventDefinition): PlayerString[] {
    const out: PlayerString[] = [];
    const id = def.id;
    const bcs = def.localizations?.bcs;
    // Prose goes through the same display helper the dossier and notice use.
    const prose = (source: string, text: string | undefined) => push(out, source, displayEventProse(text));
    push(out, `event:${id}.title:en`, resolveEventDisplayTitle(id, def.title ?? '', { locale: 'en' }));
    push(out, `event:${id}.title:bcs`, resolveEventDisplayTitle(id, def.title ?? '', { locale: 'bcs' }));
    push(out, `event:${id}.narrative:en`, resolveEventDisplayNarrative(id, def.narrative ?? '', { locale: 'en' }));
    push(out, `event:${id}.narrative:bcs`, resolveEventDisplayNarrative(id, def.narrative ?? '', { locale: 'bcs' }));
    prose(`event:${id}.situation`, def.situation);
    prose(`event:${id}.staff_assessment`, def.staff_assessment);
    (def.trigger_evidence ?? []).forEach((line, index) => prose(`event:${id}.trigger_evidence.${index}`, line));
    push(out, `event:${id}.source_line:en`, resolveEventSourceLine(def, 'en'));
    push(out, `event:${id}.source_line:bcs`, resolveEventSourceLine(def, 'bcs'));
    for (const effect of [def.effect, ...(def.effects ?? [])]) {
        if (effect && effect.kind === 'narrative') prose(`event:${id}.effect.narrative`, effect.text);
    }
    if (bcs) {
        prose(`event:${id}.bcs.situation`, bcs.situation);
        prose(`event:${id}.bcs.staff_assessment`, bcs.staff_assessment);
        (bcs.trigger_evidence ?? []).forEach((line, index) => prose(`event:${id}.bcs.trigger_evidence.${index}`, line));
    }
    for (const option of def.response_options ?? []) {
        const base = `event:${id}.response.${option.id}`;
        prose(`${base}.label`, option.label);
        prose(`${base}.description`, option.description);
        prose(`${base}.bcs.label`, bcs?.response_options?.[option.id]?.label);
        prose(`${base}.bcs.description`, bcs?.response_options?.[option.id]?.description);
        (option.future_consequences ?? []).forEach((fc, index) => {
            // A consequence renders on the Turn Aftermath receipt only for an event it opens;
            // scan what that receipt shows (consequenceReceipts.ts), in both locales.
            for (const predictedId of fc.opens_events ?? []) {
                const predictedDef = eventById.get(predictedId);
                for (const locale of ['en', 'bcs'] as const) {
                    push(out, `${base}.future_consequences.${index}.label:${locale}`,
                        resolvePredictedLabel(predictedDef, predictedId, fc.label, locale));
                    push(out, `${base}.future_consequences.${index}.explanation:${locale}`,
                        resolvePredictedExplanation(fc.explanation, locale));
                }
            }
        });
        for (const effect of option.effects ?? []) {
            if (effect.kind === 'cost_ledger_annotation' || effect.kind === 'narrative') prose(`${base}.effect.${effect.kind}`, effect.text);
        }
        for (const target of FACTIONS) {
            const persisted = def.notifications_to_other_factions?.[option.id]?.[target];
            if (!persisted) continue;
            for (const locale of ['en', 'bcs'] as const) {
                const shown = resolveEventNotificationDisplay(
                    { event_id: id, response_id: option.id, target_faction: target, headline: persisted.headline, body: persisted.body },
                    { locale },
                );
                push(out, `${base}.notification.${target}.headline:${locale}`, shown.headline);
                push(out, `${base}.notification.${target}.body:${locale}`, shown.body);
            }
        }
    }
    return out;
}

/** Codex essays: the title, the content and the listed sources render (CodexPanel.tsx). */
function essayStrings(): PlayerString[] {
    const out: PlayerString[] = [];
    const dir = path.join(process.cwd(), 'data/scenarios/essays');
    const walk = (node: unknown, source: string): void => {
        if (typeof node === 'string') { push(out, source, node); return; }
        if (Array.isArray(node)) { node.forEach((child, index) => walk(child, `${source}.${index}`)); return; }
        if (node && typeof node === 'object') {
            for (const key of Object.keys(node as Record<string, unknown>).sort(strictCompare)) {
                if (key === 'id' || key === 'event_id' || key === 'condition' || key === 'when' || key === 'key') continue;
                walk((node as Record<string, unknown>)[key], `${source}.${key}`);
            }
        }
    };
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'essay_index.json').sort(strictCompare)) {
        const essay = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) as Record<string, unknown>;
        for (const field of ['title', 'content', 'sources'] as const) walk(essay[field], `essay:${name}.${field}`);
    }
    return out;
}

function allPlayerStrings(): PlayerString[] {
    const out: PlayerString[] = [...messageStrings(), ...officerStrings(), ...essayStrings()];
    for (const catalog of EVENT_CATALOGS) for (const def of catalog) out.push(...eventStrings(def));
    return out;
}

function isAllowed(source: string, term: string): boolean {
    return ALLOWLIST.some((entry) => entry.source === source && entry.term === term);
}

describe('player copy carries no developer text (council fix 4)', () => {
    it('the denylist is well formed', () => {
        const ids = DEVELOPER_TERMS.map((term) => term.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const entry of ALLOWLIST) {
            expect(ids, entry.source).toContain(entry.term);
            expect(entry.reason.length, entry.source).toBeGreaterThan(20);
        }
    });

    it('detects the council examples (positive control)', () => {
        const examples = [
            'Source dossier: B8 worksheet 2026-05-28 + v1.3 packet §3.6',
            'Per Phase A B9 worksheet (docs/40_reports/research/20260527_EVENT_FAMILY_B9.md)',
            'The turn 141-142 window is an exogenous calendar guardrail',
            'The historical default is a calibration baseline, not a recommendation.',
            "ground this row's provenance",
            'Editorial provenance: originally machine-drafted, then hand-corrected.',
            'Sources: Sensitive History Design Gate §4',
            'not applicable',
            '5th Corps commander state present',
            'Supply truth shows formations isolated',
            'JNA-background officer leading the RBiH army command at scenario start.',
            'Modeled as an RBiH army-command appointment.',
            'The civic-republic platform recorded at B1 (rbih_state_identity) makes it structural.',
        ];
        for (const example of examples) {
            expect(findDeveloperTerms(example).length, example).toBeGreaterThan(0);
        }
    });

    it('does not fire on ordinary player prose or message placeholders', () => {
        const clean = [
            'Hold Sarajevo through the winter.',
            'ICTY Karadžić Trial Judgment (IT-95-5/18-T, 24 March 2016).',
            'Balkan Battlegrounds, Vol. II, Ch. 15.',
            'Turn {turn} of {total}',
            '{count} brigades are waiting for orders.',
            'Why now',
        ];
        for (const text of clean) expect(findDeveloperTerms(text), text).toEqual([]);
    });

    it('hides a dirty source note and keeps the first clean citation', () => {
        expect(firstPlayerSafeText(['Per Sensitive History Design Gate §3', 'Balkan Battlegrounds, Vol. I, p. 167.']))
            .toBe('Balkan Battlegrounds, Vol. I, p. 167.');
        expect(firstPlayerSafeText(['BB1 p.167; docs/40_reports/audits/X.md H4'])).toBeNull();
    });

    it('no player-facing string contains a denylisted developer term', () => {
        const strings = allPlayerStrings();
        // Non-vacuous: the scan reaches every catalogue.
        expect(strings.filter((s) => s.source.startsWith('en:')).length).toBeGreaterThan(5000);
        expect(strings.filter((s) => s.source.startsWith('bcs:')).length).toBeGreaterThan(5000);
        expect(strings.filter((s) => s.source.startsWith('event:')).length).toBeGreaterThan(1000);
        expect(strings.filter((s) => s.source.startsWith('officer:')).length).toBeGreaterThan(40);

        const violations: string[] = [];
        for (const entry of strings) {
            for (const hit of findDeveloperTerms(entry.text)) {
                if (isAllowed(entry.source, hit.id)) continue;
                violations.push(`${entry.source} [${hit.id}] "${hit.match}" (${hit.why})`);
            }
        }
        violations.sort(strictCompare);
        // Joined so a failure prints every violation, not the first 50.
        expect(violations.join('\n')).toBe('');
    });

    it('withdrawn wording in the hash-pinned opening event never renders (§4 panel, P5)', () => {
        // rbih_state_identity cannot change without breaking older saves (opening_policy_transition.ts),
        // so "Srebrenica/Žepa rupture" and "Operation Storm Krajina liberation" stay in its data until a
        // catalog-versioning lane replaces them. Until then they must stay off every surface.
        const identity = eventById.get('rbih_state_identity');
        const flagged = (identity?.response_options ?? [])
            .flatMap((option) => option.future_consequences ?? [])
            .filter((fc) => /Srebrenica\/Žepa rupture|Krajina liberation/.test(fc.explanation ?? ''));
        expect(flagged.length).toBeGreaterThan(0);
        for (const fc of flagged) {
            for (const locale of ['en', 'bcs'] as const) {
                expect(resolvePredictedExplanation(fc.explanation, locale), fc.explanation).toBe('');
            }
        }
        // The Turn Aftermath receipt (consequenceReceipts.ts) is the only UI reader of explanations.
        const readers: string[] = [];
        const scan = (dir: string): void => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => strictCompare(a.name, b.name))) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) { if (entry.name !== 'node_modules') scan(full); continue; }
                if (!/\.tsx?$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
                const text = fs.readFileSync(full, 'utf8');
                if (/future_consequences|futureConsequences/.test(text) && /\.explanation\b/.test(text)) {
                    readers.push(path.relative(process.cwd(), full).split(path.sep).join('/'));
                }
            }
        };
        scan(path.join(process.cwd(), 'src/ui'));
        scan(path.join(process.cwd(), 'src/desktop'));
        expect(readers).toEqual(['src/ui/map/data/consequenceReceipts.ts']);
    });

    it('no player-facing string carries an ASCII-stripped Bosnian person or place name (C13)', () => {
        expect(restoreBosnianProperNames('Karadzic, Mladic and Milosevic at Gorazde')).toBe('Karadžić, Mladić and Milošević at Goražde');
        expect(restoreBosnianProperNames('karadzic_mladic_split_1995')).toBe('karadzic_mladic_split_1995');
        const stripped = allPlayerStrings()
            .filter((entry) => restoreBosnianProperNames(entry.text) !== entry.text)
            .map((entry) => `${entry.source}: ${entry.text.slice(0, 80)}`)
            .sort(strictCompare);
        expect(stripped.join('\n')).toBe('');
    });
});

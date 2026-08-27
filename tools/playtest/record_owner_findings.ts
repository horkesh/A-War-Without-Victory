/**
 * One-off recorder for findings raised by the owner from a screenshot review, so they
 * live in the same ledger as probe-emitted ones instead of only in chat.
 *
 * Owner-reported findings are NOT probe output: no probe detected them, and several are
 * not currently detectable by any probe. `probe` is set to `owner-review` so that is
 * visible at a glance, and each carries a note on whether it could be automated.
 *
 * Run: node node_modules/tsx/dist/cli.mjs tools/playtest/record_owner_findings.ts
 */
import { join } from 'node:path';
import { REPO_BASE_DIR } from '../ai_play/president_playthrough.js';
import { FindingsRecorder } from './findings.js';
import type { Finding } from './types.js';

const RUN_ID = 'owner-review-20260827';
const LEDGER = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');

const FINDINGS: Finding[] = [
    {
        kind: 'bug',
        severity: 'high',
        probe: 'owner-review',
        title: 'Priority-front labels pair a settlement with its own municipality under two names',
        detail:
            'The Situation panel reads "Priority fronts: Aginci (bosanska dubica) - Kozarska dubica '
            + '(bosanska dubica); Arapusa (bosanska krupa) - Donji dubovik (bosanska krupa)". Owner: '
            + 'it should read as one place — Aginci in Kozarska Dubica — not as a front between two. '
            + 'HYPOTHESIS, NOT VERIFIED: Bosanska Dubica was renamed Kozarska Dubica by RS, so both '
            + 'sides of the pair may be resolving to the SAME municipality under its 1990 name and its '
            + 'RS name, producing a front against itself. Needs verification against the front-pair '
            + 'source before anyone acts on that reading.',
        surface: 'ui:situation_panel',
        turn: 1,
        faction: 'RBiH',
        evidence: {
            observed: 'Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica)',
            owner_expectation: 'Aginci in Kozarska Dubica',
            second_instance: 'Arapusa (bosanska krupa) - Donji dubovik (bosanska krupa)',
            screenshot: 'tools/playtest/evidence/20260827_owner_review_situation_panel.png',
        },
        repro_note: 'Start any RBiH campaign; read the Situation panel on the Desk at 6 Apr 1992.',
    },
    {
        kind: 'bug',
        severity: 'medium',
        probe: 'owner-review',
        title: 'Place names are lower-cased after the first word',
        detail:
            'Labels render "Donji dubovik (bosanska krupa)" where every word of a proper place name '
            + 'should be capitalised: "Donji Dubovik (Bosanska Krupa)". Also seen in "Kozarska dubica", '
            + '"bosanska dubica", "Arapusa (bosanska krupa)". Looks like a single capitalise-first-letter '
            + 'transform applied to an id-derived string rather than a display name. Affects every '
            + 'multi-word Bosnian place name in the UI, which is most of them.',
        surface: 'ui:place_name_formatting',
        turn: 1,
        faction: 'RBiH',
        evidence: {
            observed: ['Donji dubovik (bosanska krupa)', 'Kozarska dubica', 'Arapusa (bosanska krupa)'],
            expected: ['Donji Dubovik (Bosanska Krupa)', 'Kozarska Dubica', 'Arapuša (Bosanska Krupa)'],
            note: 'Diacritics also worth checking separately — "Arapusa" vs "Arapuša" was not raised by the owner and is NOT claimed here.',
        },
        repro_note: 'Any surface listing settlements or municipalities.',
    },
    {
        kind: 'bug',
        severity: 'high',
        probe: 'owner-review',
        title: 'Territory bar counts allied HVO ground as "hostile-held"',
        detail:
            'The status bar reads "Friendly 31.5% | Hostile-held 68.5%" while the same bar shows ALLIED '
            + 'and the Situation panel reports "Bosniak-Croat Coordination — Alliance posture: close '
            + 'coordination". If HVO is an ally, HVO-held territory is not hostile. The split appears to '
            + 'be a binary player-vs-everyone-else computation that ignores alliance state, so the player '
            + 'is shown a strategic picture that is wrong in their own favour-reading. Note the alliance '
            + 'later degrades ("Alliance posture: strained" by 1 Jun 1992), so any fix has to track a '
            + 'CHANGING relationship, not a fixed faction list.',
        surface: 'ui:territory_bar',
        turn: 1,
        faction: 'RBiH',
        evidence: {
            observed: 'Friendly 31.5% | Hostile-held 68.5%, with ALLIED shown on the same bar',
            alliance_state: 'Bosniak-Croat Coordination: close coordination (t1) -> strained (t9)',
        },
        repro_note: 'Read the bottom status bar during any RBiH campaign while the HVO alliance holds.',
    },
    {
        kind: 'friction',
        severity: 'medium',
        probe: 'owner-review',
        title: 'Typography is inconsistent across surfaces',
        detail:
            'The game mixes font families between surfaces — the case-file opening uses a serif display '
            + 'face and large italics, while the in-game shell uses monospace and condensed sans. Owner '
            + 'raised this as a defect, not a deliberate contrast. Needs a single typographic system '
            + 'decided and applied, rather than per-surface choices.',
        surface: 'ui:typography',
        turn: 0,
        faction: 'RBiH',
        evidence: {
            surfaces: ['case-file opening (serif + large italic)', 'in-game shell (monospace / condensed sans)'],
        },
    },
    {
        kind: 'friction',
        severity: 'high',
        probe: 'owner-review',
        title: 'Opening screen needs a complete redesign to match the game aesthetic',
        detail:
            'Owner on the case-file opening, verbatim: it "screams AI slop design with big italic letters '
            + 'for highlight and so on. We need to rework it completely so it has the same aesthetic as '
            + 'the rest of the game." This is a REDESIGN, not a tweak — the current screen is the '
            + '2026-08-23 case-file flow that was routed to the desktop launch on 2026-08-27, so it is '
            + 'newly the first thing every player sees. Not to be actioned without a design pass.',
        surface: 'ui:case_file_opening',
        turn: 0,
        faction: 'RBiH',
        evidence: {
            owner_quote: 'screams AI slop design with big italic letters for highlight and so on',
            current_screen: 'tools/playtest/evidence/20260827_case_file_landing.png',
            note: 'The opening was made reachable by commit 554e89377; before that players never saw it.',
        },
    },
];

const recorder = new FindingsRecorder(RUN_ID, join(REPO_BASE_DIR, 'tmp-playtest', RUN_ID, 'findings.jsonl'));
for (const f of FINDINGS) recorder.record(f);
const { added, repeated } = recorder.mergeIntoLedger(LEDGER);
console.log(`owner findings: ${added.length} new, ${repeated.length} already known`);
for (const f of added) console.log(`  + [${f.severity}] ${f.title}  (${f.surface})`);

/**
 * Recorder for findings raised by the owner, so they live in the same ledger as
 * probe-emitted ones instead of only in chat.
 *
 * Owner-reported findings are NOT probe output: no probe detected them, and several are
 * not currently detectable by any probe. `probe` is set to `owner-review` so that is
 * visible at a glance.
 *
 * Batches are keyed by run id and recorded independently, so re-running one batch does
 * not inflate another's occurrence counts.
 *
 * Run: node node_modules/tsx/dist/cli.mjs tools/playtest/record_owner_findings.ts <batch>
 */
import { join } from 'node:path';
import { REPO_BASE_DIR } from '../ai_play/president_playthrough.js';
import { FindingsRecorder } from './findings.js';
import type { Finding } from './types.js';

const LEDGER = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');

const BATCHES: Record<string, Finding[]> = {
    // ── 2026-08-27, screenshot review of the Desk at 6 Apr 1992 ──────────────
    'owner-review-20260827': [
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
                + 'RS name, producing a front against itself. Verify against the front-pair source before '
                + 'acting on that reading.',
            surface: 'ui:situation_panel',
            turn: 1,
            faction: 'RBiH',
            evidence: {
                observed: 'Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica)',
                owner_expectation: 'Aginci in Kozarska Dubica',
                second_instance: 'Arapusa (bosanska krupa) - Donji dubovik (bosanska krupa)',
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
                + 'should be capitalised: "Donji Dubovik (Bosanska Krupa)". Also "Kozarska dubica", '
                + '"Arapusa (bosanska krupa)". Looks like a capitalise-first-letter transform applied to an '
                + 'id-derived string rather than a display name. Affects most multi-word Bosnian place names.',
            surface: 'ui:place_name_formatting',
            turn: 1,
            faction: 'RBiH',
            evidence: {
                observed: ['Donji dubovik (bosanska krupa)', 'Kozarska dubica', 'Arapusa (bosanska krupa)'],
                expected: ['Donji Dubovik (Bosanska Krupa)', 'Kozarska Dubica'],
                note: 'Diacritics ("Arapusa" vs "Arapuša") were NOT raised by the owner and are not claimed here.',
            },
        },
        {
            kind: 'bug',
            severity: 'high',
            probe: 'owner-review',
            title: 'Territory bar counts allied HVO ground as "hostile-held"',
            detail:
                'The status bar reads "Friendly 31.5% | Hostile-held 68.5%" while the same bar shows ALLIED '
                + 'and the Situation panel reports "Alliance posture: close coordination". If HVO is an ally, '
                + 'HVO-held territory is not hostile. Appears to be a binary player-vs-everyone-else split '
                + 'that ignores alliance state. Any fix must track a CHANGING relationship — the same '
                + 'campaign reaches "strained" by 1 Jun 1992.',
            surface: 'ui:territory_bar',
            turn: 1,
            faction: 'RBiH',
            evidence: {
                observed: 'Friendly 31.5% | Hostile-held 68.5%, with ALLIED on the same bar',
                alliance_state: 'close coordination (t1) -> strained (t9)',
            },
        },
        {
            kind: 'friction',
            severity: 'medium',
            probe: 'owner-review',
            title: 'Typography is inconsistent across surfaces',
            detail:
                'The game mixes font families between surfaces — the case-file opening uses a serif display '
                + 'face and large italics, the in-game shell uses monospace and condensed sans. Owner raised '
                + 'this as a defect, not deliberate contrast. Needs one typographic system decided and applied.',
            surface: 'ui:typography',
            turn: 0,
            faction: 'RBiH',
        },
        {
            kind: 'friction',
            severity: 'high',
            probe: 'owner-review',
            title: 'Opening screen needs a complete redesign to match the game aesthetic',
            detail:
                'Owner on the case-file opening, verbatim: it "screams AI slop design with big italic letters '
                + 'for highlight and so on. We need to rework it completely so it has the same aesthetic as '
                + 'the rest of the game." A REDESIGN, not a tweak. Newly the first thing every player sees, '
                + 'as of commit 554e89377.',
            surface: 'ui:case_file_opening',
            turn: 0,
            faction: 'RBiH',
            evidence: { current_screen: 'tools/playtest/evidence/20260827_case_file_landing.png' },
        },
    ],

    // ── 2026-08-27, sector→OG rename review ─────────────────────────────────
    'owner-review-20260827-og': [
        {
            kind: 'bug',
            severity: 'high',
            probe: 'owner-review',
            title: 'Copy says a formation group is "thinly held" — an OG holds ground, it is not held',
            detail:
                'The Situation panel reads "Widespread thinly held front OGs need staff review." and '
                + '"Front posture: widespread contact; thinly held OGs: widespread". Owner: an Operational '
                + 'Group is itself a COLLECTION OF FORMATIONS, so it cannot be "thinly held" — you hold '
                + 'ground, not a formation group. The phrasing should describe the group\'s dispersion, e.g. '
                + '"OG XXY is spread out" / overextended / dispersed.\n\n'
                + 'MECHANISM: sectors were renamed to OGs as a naming-only change (see the standing note '
                + 'that sectors ARE standing OGs). The rename substituted the NOUN everywhere but left the '
                + 'adjective that only made sense for terrain. "Thinly held sector" was correct English; '
                + '"thinly held OG" is a category error produced by a find-and-replace.\n\n'
                + 'This is a copy/design fix, NOT a sector-removal refactor — that is explicitly out of bounds.',
            surface: 'ui:operational_sitrep',
            turn: 1,
            faction: 'RBiH',
            evidence: {
                strings: [
                    'operationalSitrep.headline.frontExposed.widespread',
                    'operationalSitrep.headline.frontExposed.many',
                    'operationalSitrep.headline.frontExposed.several',
                    'operationalSitrep.headline.frontExposed.one',
                    'operationalSitrep.headline.frontExposed.none',
                    'situation.frontsLine',
                ],
                file: 'src/ui/map/i18n/messages.en.ts:3693,3742-3746',
                owner_suggestion: 'OG XXY is spread out (or similar)',
            },
        },
        {
            kind: 'bug',
            severity: 'high',
            probe: 'owner-review',
            title: 'Two sources for the same sitrep copy disagree: i18n says "OGs", the hardcoded fallback says "sectors"',
            detail:
                'The same five sitrep headlines exist twice. `messages.en.ts:3742-3746` says "thinly held '
                + 'front OGs"; the hardcoded English fallback in `operational_sitrep_views.ts:174-179` still '
                + 'says "thinly held front sectors". Whichever path renders the fallback shows the pre-rename '
                + 'term, so the player can see BOTH vocabularies for the same concept depending on code path. '
                + 'The rename updated the i18n table and missed the fallback beside it.',
            surface: 'ui:operational_sitrep',
            turn: 1,
            faction: 'RBiH',
            evidence: {
                i18n: 'src/ui/map/i18n/messages.en.ts:3742-3746 — "thinly held front OGs"',
                fallback: 'src/ui/shared/operational_sitrep_views.ts:174-179 — "thinly held front sectors"',
            },
        },
        {
            kind: 'bug',
            severity: 'medium',
            probe: 'owner-review',
            title: 'The Sector Attack operation type still says "Sector" in player-facing text',
            detail:
                'Measured across `messages.en.ts`: 104 keys have display text already renamed to OG, while '
                + '17 display strings still contain "sector". Most of those 17 are `{sector}` interpolation '
                + 'placeholders, which are harmless variable names. FIVE are genuinely player-visible and all '
                + 'belong to one family — the Sector Attack operation type: "Sector Attack", "One sector '
                + 'push", and "Sector Attack — Commits 3-8 brigades to push on a single sector". So the '
                + 'player is offered an operation named for the old concept while every other surface calls '
                + 'it an OG.',
            surface: 'ui:ops_planning',
            turn: 1,
            faction: 'RBiH',
            evidence: {
                keys: [
                    'opsPlanning.param.opType.sector_attack',
                    'opsPlanning.param.subtitle.sector_attack',
                    'opsPlanning.param.label.sectorAttack',
                    'opsPlanning.param.subtitle.sectorAttack',
                    'opsPlanning.param.title.sectorAttack',
                ],
                counts: { display_renamed_to_og: 104, display_still_sector: 17, genuinely_visible: 5 },
                note: 'The engine identifier `sector_attack` is a separate question and is NOT part of this finding.',
            },
        },
    ],

    // ── 2026-08-27, faction playthrough campaign (RBiH / RS / HRHB) ─────────
    'playthrough-20260827': [
        {
            kind: 'question',
            severity: 'high',
            probe: 'playthrough-observation',
            title: 'RS opens with six required presidential decisions; RBiH opens with one',
            detail:
                'Measured on the first turn of each campaign through the real UI. RS shows '
                + '"Decision 6 items - REQ 6" in the Decision Room at 6 Apr 1992; RBiH shows one '
                + 'required decision ("What Is Bosnia?"). HRHB behaves like RBiH. '
                + 'Compounding it, only TWO of the six surface as Presidential Inbox cards — the '
                + 'other four exist solely inside the Decision Room, so a player who works the inbox '
                + 'and presses Advance is refused with no visible reason on that screen. '
                + 'Recorded as a QUESTION, not a defect: a heavier opening for RS may be deliberate. '
                + 'But the six-to-one asymmetry has never been stated anywhere, and the split between '
                + 'inbox-visible and room-only decisions is a discoverability problem regardless of '
                + 'whether the count is intended.',
            surface: 'design:opening_decision_load',
            turn: 1,
            faction: 'RS',
            evidence: {
                RS: 'Decision 6 items - REQ 6 at 6 Apr 1992; 2 of 6 visible as inbox cards',
                RBiH: '1 required decision (What Is Bosnia?)',
                HRHB: 'behaves like RBiH',
                method: 'real Electron UI, DOM clicks, tools/playtest/run_electron.ts',
            },
        },
        {
            kind: 'friction',
            severity: 'high',
            probe: 'playthrough-observation',
            title: 'Decision Room room-only blockers are unreachable from the screen that refuses the turn',
            detail:
                'RBiH and HRHB both stall at turn 9 (1 Jun 1992) and RS at turn 1, on the same shape: '
                + 'a required item that exists ONLY inside the Decision Room while the turn surface '
                + 'shows nothing that leads to it. At the stall the shell offers ADVANCE (which does '
                + 'nothing), a SIGNATURE REQUIRED badge, and no REVIEW BLOCKERS affordance. '
                + 'The ALL tab then lists optional leadership gestures (Visit the front, Address the '
                + 'nation, Decorate a unit) ABOVE the single blocking item, so the first thing a player '
                + 'sees in the room is not what is holding their turn. '
                + 'Two factions reaching the identical state at different turns establishes this as '
                + 'structural rather than faction-specific or event-specific.',
            surface: 'ui:decision_room',
            turn: 9,
            faction: 'RBiH',
            evidence: {
                RBiH: 'stalls turn 9 (1 Jun 1992)',
                HRHB: 'stalls turn 9 (1 Jun 1992) — same state',
                RS: 'stalls turn 1 (6 Apr 1992) — same state, reached sooner via 6 opening decisions',
                screenshot: 'tools/playtest/evidence/20260827_turn9_decision_room_blocker.png',
                room_state: 'ALL 13 items - REQ 1 - REC 3 - MON 4 - RECORD 5; DECISION 1 item - REQ 1',
            },
            repro_note: 'Play RBiH or HRHB to turn 9, or RS to turn 1, through the UI.',
        },
        {
            kind: 'friction',
            severity: 'medium',
            probe: 'playthrough-observation',
            title: 'Advance is offered and does nothing when a room-only blocker is outstanding',
            detail:
                'At every stall the ADVANCE control is present and enabled, clicks register, and the '
                + 'date does not move. No message explains why. The engine is correct to refuse — a '
                + 'required decision is outstanding — but to the player an enabled button '
                + 'that silently does nothing is indistinguishable from a broken one. It cost this '
                + 'harness several hours of misdiagnosis for exactly that reason.',
            surface: 'ui:turn_loop',
            turn: 9,
            faction: 'RBiH',
            evidence: { observed: 'ADVANCE TURN -> enabled and clickable; date unchanged after four clicks and ~4 minutes' },
        },
    ],
};

const batch = process.argv[2];
const findings = batch ? BATCHES[batch] : undefined;
if (!findings) {
    console.error(`Usage: record_owner_findings.ts <batch>\nKnown: ${Object.keys(BATCHES).join(', ')}`);
    process.exit(1);
}

const recorder = new FindingsRecorder(batch, join(REPO_BASE_DIR, 'tmp-playtest', batch, 'findings.jsonl'));
for (const f of findings) recorder.record(f);
const { added, repeated } = recorder.mergeIntoLedger(LEDGER);
console.log(`${batch}: ${added.length} new, ${repeated.length} already known`);
for (const f of added) console.log(`  + [${f.severity}] ${f.title}  (${f.surface})`);

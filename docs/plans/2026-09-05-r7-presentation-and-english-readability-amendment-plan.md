# R7 Presentation and English-Readability Amendment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Discharge the located, in-scope half of the 2026-09-03 showcase GUI audit as R7 Phase 5's
own "Inspect English at 1920x1080" pass — display names, staff voice, number formatting, and English
text that fails to render legibly — while routing every bug, every unlocated finding, and every
polish item to a destination that is not this plan.

**Architecture:** Renderer-only. No new component, no new design-system primitive, no new shared
Toast. Where a correct implementation already exists in the tree (`osidDisplayName.ts`,
`formatFindingSeverity`, `formatPersonnel`), wire to it rather than writing a second one — four
competing "humanize a slug" implementations and four competing casualty formatters are the cause of
most of this audit, and this plan must not add a fifth of either.

**Tech Stack:** React 18, TypeScript, Tailwind/CSS, Vitest, Testing Library, Playwright. No new
runtime dependency.

---

## 1. Header Contract

**Inbox/package continuation — 2026-09-10:** the owner subsequently authorized the
separate Inbox/Desk repair and one replacement package in the existing R8 worktree.
Inbox source commit `7d97b72fc` includes the reviewed on-whiteboard correction
`ea33b23a5`; the replacement build and five-step packaged Inbox route pass. The original
package and all failed receipts remain preserved. Fresh three-faction 24-turn checks are
governed by the existing [R8 plan](2026-07-31-full-campaign-electron-validation-plan.md).
This supersedes the pending Inbox/package decision below, without changing the recorded
R7 date proof, PRE/POST provenance, consumed run budget or open baseline/acceptance gates.

### Date must remain on the whiteboard — owner correction, 2026-09-10

The owner correctly identifies that the date is now painted beside the whiteboard. The
`translateX(min(0px, calc(28vw - 616px)))` workaround in `WarroomDateBoard` moves its
entire region away from the artwork. The regression test requires that translation, and
the earlier screenshot review checks visibility/separation without board containment.
Those receipts do not establish correct date placement; item 3.9 is reopened. Date-only
acceptance reduced the required visible content, not its intended location on the board.

Continue the already-authorized date/header layout correction in the existing R8 worktree,
`F:/AWWV-worktrees/r8-decision-command-usability`, from clean tracked
`52107d35197d5a362f4c2b2a92db4624cb3a7f70`. The original R7 checkout remains clean at
`bd7b819750d32811738a87143a66bb02807ab867`; intervening R8 changes are preserved. The
separate Inbox/Desk overlap and its replacement-package question remain pending.

**Question:** can the complete date stay inside the artwork's actual whiteboard in every
RBiH/RS/HRHB room at 1920x1080, 1366x768 and 3440x1440, while the fixed Desk column and
artwork remain unchanged and header/cards/controls remain usable? Remove the detached-date
workaround and correct the necessary date/header/content layout in the existing
`WarroomShellLayer`, `PresidentDeskShell`, `DeskAuthorityHeader` and affected tests only;
extend the render-prop handoff only if required for the same geometry. No gameplay/state,
save, asset, dependency or simulation change. One Sol/medium implementer and an independent
Sol/medium reviewer cover source and actual images with compact handoffs.

**Commands/cost:** retain distinct `desk39-onboard-*` logs in the original R7 evidence
directory. Focused `npm run test:vitest -- <affected files>` RED/GREEN takes seconds;
the corrected nine-case Playwright proof takes a few minutes. Use the retained fixtures
and adapt the existing proof with actual unshifted whiteboard containment, image inspection,
card/label intersections, contrast >=4.5:1, header/control readability, fixed scene/column
bounds and maximum-scroll fade clearance. Inspect both initial and maximum scroll at every
faction/viewport. Run `npm run test:vitest -- tests/ui` (about ten minutes),
`npm run typecheck`, `npm run desktop:map:build`, `git diff --check` and the mandatory
local commit hook on reviewed source. Record exact commands/exits and preserve failures.
The local proof server uses `npm run dev:map -- --host 127.0.0.1 --port 3258 --strictPort`;
start/stop its owned process with retained logs. The proof reads original retained fixtures
by absolute path and writes only exclusive new evidence directories.

Candidate proof command: Node 22.23.2 runs
`F:/A-War-Without-Victory/logs/r7-english-readability/desk39-onboard-proof.mjs --out F:/A-War-Without-Victory/logs/r7-english-readability/desk39-onboard-browser-attempt1`
from this worktree, through the existing exclusive `desk39-layout-run-check.mjs` recorder.
In addition to the eighteen required endpoint screenshots, capture only the intermediate
scroll positions needed to expose every header text node and rendered Desk control above
the fade (maximum twelve per case; stop on an unreachable item). Compare shell/scene
bounds and artwork identity against retained BEFORE geometry, and freeze source/fixture/
authored-region hashes before and after the run. This remains a nine-case layout proof,
with no campaign or simulation execution.

Targeted proof correction: attempt 1 exhausts the arbitrary twelve-image traversal cap
for the long RBiH/RS packets at 1366x768. Date location, paint clearance, fade and contrast
pass there, but lower controls remain unvisited. The independent reviewer confirms the
finite remaining scroll targets; this is not evidence of unreachable game controls.
Preserve attempt 1 and its script. In `desk39-onboard-proof2.mjs`, bound traversal by the
initial stable target count, retaining the no-progress guard. After attempt 1 completes,
run only its cap-exhausted cases with `--cases rbih-1366x768,rs-1366x768 --out F:/A-War-Without-Victory/logs/r7-english-readability/desk39-onboard-browser-attempt2`.
Expected cost: two case loads plus the missing coverage, about two minutes. Pass requires
all controls covered, no geometry/paint regression and identical protected hashes across
both attempts. Stop on actual unreachability or any new source concern. Consolidate the
two corrected cases with the seven unaffected first-attempt cases, keeping both receipts;
do not rerun successful cases or change game source to satisfy the harness bound.

Artifact identity correction for consolidation: the BEFORE Vite URL embeds the original
checkout path, while this proof embeds the R8 worktree path. Comparing raw URL pathnames
therefore flags all nine images despite matching dimensions and fixed scene geometry.
Keep those flags and both browser receipts. A read-only
`desk39-onboard-consolidate.mjs` check (seconds) must normalize only the two known checkout
prefixes, require the same relative asset, and verify original/worktree SHA-256 plus Git
blob identity against the accepted prior source `88996a23d`. Fail on any actual asset,
source/fixture hash, geometry or case-coverage drift. This resolves file identity without
another browser campaign or weakening the fixed-artwork criterion.

**Pass/stop:** the label and every glyph must be visibly on the actual whiteboard, not
merely inside a translated DOM box. Dates remain complete and clear at both scroll ends;
header text and controls remain readable/reachable. Reject a fix that only changes the
test's proxy. Stop on forbidden surface changes or an unresolved physical layout conflict;
do not silently move artwork/column or waive a visual criterion. Reuse unaffected full-suite,
package and simulation evidence only for their original inputs. No new package or campaign
is part of this correction. The PRE/two-POST budget is exhausted; existing clean POST-A
still proves its recorded revision, and the inherited six-pin/calibration gate remains open.

**Source/image result:** independent review in `desk39-onboard-review.log` gives final
item 3.9 source/image GO after inspecting all eighteen endpoint and 77 intermediate
screenshots. The consolidated nine-case proof passes; original and targeted browser
exit-1 receipts remain intact with their bounded harness/path causes. Source/fixture/
region hashes are stable, and actual artwork bytes match the accepted prior Git blobs.
Contrast is 8.34:1 and last text clears the fade by at least 16.25px. At 1366x768 the
scroll viewport is 266px tall; the lower header and packet are accessed through scrolling.
The complete UI boundary passes 354 files / 2,988 tests in 848.44 seconds, exit 0
(`desk39-onboard-ui1.log`). Focused checks pass 75/75; typecheck and map build exit 0.
The mandatory normal typecheck hook and source commit pass, exit 0, in
`desk39-onboard-commit1.log`: `ea33b23a52d5be6b2a126512fc00ce9062a76a88`.
Focused documentation checks pass 13/13, and scope/link/hash checks pass. Item 3.9's
date-on-board criterion is repaired; aggregate R7 baseline/closeout gates remain open.

Local commit sequence after those checks: stage only the three frozen date source/test
files and the six existing amended documentation files, then run
`git commit -m "fix(ui): keep the R7 date on its whiteboard"` with the normal hook enabled.
Expected cost: about one minute for the required typecheck hook. Stop on a nonzero hook;
preserve its receipt and correct only a diagnosed cause. A small documentation follow-up
may record the resulting source commit and hook result; its ordinary docs-only hook still
runs. No branch integration, push, package or campaign follows from this sequence.

### Authorized date-layout continuation — 2026-09-09

Starting branch/HEAD verified: `codex/r7-english-readability` /
`31823917a057a8933669ad8fb9d8839cc258fdce`; no intervening commits. Preserve the
existing uncommitted Desk fade, its test, and all untracked evidence.

Owner authorization supersedes the gap-only limitation below: item 3.9 requires the
complete date (not the complete whiteboard) for RBiH, RS and HRHB at 1920×1080,
1366×768 and 3440×1440. Necessary DOM date-label/header layout changes are authorized;
the Desk column position and room artwork stay fixed, with readable header content
and controls. Phase 3 additionally owns `WarroomShellLayer.tsx` and, only if necessary,
`DeskAuthorityHeader.tsx` for this layout. A single atomic Desk/date source-and-test
commit replaces the per-file rule for this coupled slice; documentation may follow.

Question: can that small layout slice expose every date without text/card intersections,
clipping, inadequate contrast, lost controls, or maximum-scroll fade obstruction?
One Sol/medium implementer owns implementation and the nine-case screenshot/geometry
probe; a separate Sol/medium reviewer checks source and actual images independently.
Use distinct `logs/r7-english-readability/desk39-layout-*` attempts, preserving exact
commands and child exit codes. Run focused Desk/Warroom tests, then
`npm.cmd run test:vitest -- tests/ui`, `npm.cmd run typecheck`,
`npm.cmd run desktop:map:build`, and `git diff --check`; local `git commit` must run
the mandatory hook. Browser command is a bounded adaptation of the retained
`desk39-feasibility.mjs`/`probe-desk-bottom.mjs` harnesses, recorded before execution.
Expected cost: focused checks and nine-case browser proof a few minutes each, complete
UI boundary about 10 minutes, typecheck about two minutes, map build about one minute.
Pass requires actual screenshot inspection plus glyph bounds, clipping/occlusion,
text/card intersections, date contrast >=4.5:1, readable header/control content, fixed
column/artwork, and last text above the fade at maximum scroll. Stop on forbidden
surface needs, unexplained failures after targeted correction, or unmet acceptance;
never substitute DOM text presence or scrollWidth for visual proof.

After reviewed source is committed and tracked tree is clean, execute only the remaining
authorized POST-A using Node v22.23.2, process-local `AWWV_S6_GRADE_RUN=true`, and
`node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 188 --full-replay-save-sequence --out logs/r7-english-readability/post-188w`.
Expected cost 20–40 minutes. Use existing `compare-simulation.mjs` and retained PRE/POST-B
artifacts; record exact health/hash commands before launch. Pass requires clean provenance,
188 completed weeks, eight identical artifacts and consumed inputs, and required health
checks. Stop on drift/incomplete output; no pins, calibration, or simulation edits and no
extra campaign. Canon already consumed POST-B: do not rerun canon/baseline regression.
Reuse the unaffected prior 13,562-pass/31-skip full-suite and player-experience receipts
explicitly; no automatic full-suite, package or unchanged browser campaign repetition.
The inherited six-pin baseline gate remains failing until separately dispositioned;
POST-A agreement cannot close it or declare current behavior canonical.

POST-A cleanliness preparation: provenance includes untracked files. Preserve all evidence
in the owner checkout and use a new detached `F:/AWWV-worktrees/r7-readability-post-a`
at the final reviewed commit, with the same ignored node_modules junction as PRE and no
dependency installation. Keep the worktree afterward; never recursively remove a junction.
Write POST-A artifacts to the absolute owner-checkout output root above, outside the clean
runner checkout. Verify `git status --porcelain` is empty, Node is v22.23.2, and package/
lockfiles and consumed inputs match PRE before launch. Run
`node tools/engine_health_gate.cjs <POST-A-run-dir> --horizon 188w --json`, then from the
owner checkout `node logs/r7-english-readability/compare-simulation.mjs logs/r7-english-readability/pre-188w-clean/apr1992_definitive_188w__6898d6d2e324c7a3__w188 <POST-A-run-dir> data/derived/scenario/_baseline_tmp/apr1992_188w`.
These are read-only post-run checks (seconds/minutes), not extra campaigns. Preserve the
existing partial comparison; the final comparison path must not already exist. Verify
run_meta provenance and all 188 replay frames, plus the full final-save SHA-256/fingerprint,
before claiming clean completion.

**Build handoff — 2026-09-08:** after the reviewed dependency graph and owner instruction
to proceed, R9 Phase 1 takes serial ownership of package/lockfiles, Vite/test configuration
and install commands. This amendment declares no new runtime dependency and retains its
presentation-file ownership. R7 acceptance remains open and must use the resulting build
identity; coordinate any later shared-build edit through the R9 preparation owner.

| Field | Value |
|---|---|
| **Date** | 2026-09-05 |
| **Status** | DATE-ON-WHITEBOARD CORRECTION VERIFIED — source `ea33b23a5`; inherited baseline gate open |
| **Owner lane** | **R7 — Content, historical attribution, audio, accessibility, and opening experience** |
| **Command-board row** | 7 |
| **Parent plan (amended)** | [Content/history/audio plan](2026-07-31-content-history-localization-audio-plan.md) — this plan executes its **Phase 5** checklist line *"Inspect English at 1920x1080, 1366x768, and 3440x1440 across the required surfaces."* |
| **Sibling amendments** | [Opening screens](2026-08-23-opening-screens-implementation-plan.md) · [Cinematic opening and typography](2026-08-28-cinematic-opening-typography-implementation-plan.md) |
| **Source finding set** | [Showcase screenshot GUI audit](../40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md) (FROZEN, 29 findings) |
| **Panel record** | [Tier-1 specialist reports](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) |
| **Collision rules** | §8 of the roadmap: *"Map/Desk English layout strings — R1/R2 layout first; R7 accessibility/readability proof second."* R1/R2 are CLOSED, so their layout pass is complete and this is the open second pass. One file has one owning phase; see §4. |
| **Current next action** | Date correction is reviewed, validated and locally committed at `ea33b23a5`, and included in the owner-authorized replacement package at `7d97b72fc`. Follow the existing R8 plan for the three 24-turn checks. Preserve PRE/POST provenance, the exhausted run budget and failing baseline gate; broader R7 acceptance remains open. |

**Owner continuation:** date-only whiteboard acceptance is approved, and investigation of
the six pre-existing baseline mismatches is authorized. This supersedes the full-board
criterion for 3.9, but does not authorize moving the column, changing artwork, refreshing
baseline pins, or waiving clean POST-A or other global gates.

Bounded validation question: can the complete date remain readable at 1920×1080,
1366×768 and 3440×1440 using the permitted gap adjustment, and can existing artifacts and
Git history explain the baseline discrepancy? Use the existing Desk fixtures and browser
harness with before/after captures, focused Desk tests, typecheck and the mandatory hook;
inspect manifest history, runner hashing rules and PRE/POST-B consumed inputs/artifacts.
Expected cost: minutes for investigation and focused/browser checks, approximately two
minutes for typecheck. No new campaign is part of this initial investigation. Pass requires
unclipped complete dates at each viewport and an evidence-backed discrepancy explanation;
do not infer baseline acceptance from failure counts alone. Stop before column/art changes,
simulation edits, an unsupported pin refresh or an additional expensive campaign. The
previously authorized clean POST-A remains available after final reviewed source is ready.

### Why this is legally an R7 amendment and not a new lane

Roadmap §5: *"The linked plan is the task-level contract for each row. A workstream may not gain a
second active plan; amend the linked plan and this register together."* This plan is registered as an
amendment in `MASTER_ROADMAP.md` §5 (R7 row), the Current Execution Snapshot, `COMMAND_BOARD.md`
row 7, and the parent plan — in one change, exactly as the 2026-08-28 cinematic amendment was
(*"R7 amendment registered in roadmap, command board, and accepted functional-opening plan"*).

R7's own §3 In scope already claims this work: *"English string correctness, accessibility,
readability, and packaged-offline presentation proof."* R7's "Complete when" still lists **broader
English readability/accessibility** as open. Nothing reopens; nothing new is created.

---

## 2. Purpose and Non-Goals

### In scope

- English string correctness and staff voice across Desk, Decision Room, Army HQ, Records, Codex,
  Chronicle, War Summary, Dayton, and corps/OG surfaces.
- Player-facing **display names**: OSID/slug leakage, `_N` suffixes, missing diacritics, doubled
  municipality names.
- **Number formatting** consistency and unit disclosure.
- English text that **fails to render legibly** at a required resolution — truncation with room to
  spare, inter-sibling overlap, vertical letter-stacking.
- A transient receipt that is visually indistinguishable from permanent chrome (finding 21).

### Non-Goals

- **No engine, sim, state, scenario, calibration, or canon edit.** See the Scope Lock in §4.
- **No bug fixes.** Every bug in this audit is pre-seeded to R8 under owner decision D1
  (2026-09-04, HOLD FOR R8). This plan fixes presentation, not correctness.
- **No new UI pattern.** No shared Toast/notification component, no ResizeObserver charting
  rewrite, no grid-template rework, no design-system addition.
- **No diacritic guessing.** Ground-truth names exist for 100% of scored OSIDs (measured 712/712);
  a transliteration heuristic would be strictly worse and non-deterministic.
- **No OSID/`sid` key change.** Banned by `CLAUDE.md`; and unnecessary — measured 0 collisions.
- **No `messages.bcs.ts` translation.** Multilingual is post-1.0 by owner decision 2026-08-15.
- **No art regeneration** (finding 27) — the owner generates all images externally.
- **No repo-wide formatter consolidation and no full turns→weeks sweep** — both correctly declined
  by the panel; both recorded in the post-1.0 backlog with their key lists.
- **`docs/10_canon/FORAWWV.md` is not edited by this plan** (roadmap §3).

---

## 3. External-Agent Execution Contract

**Session-start commands**

```powershell
git status --short
git branch --show-current
npm.cmd run typecheck
```

**Required reading, in order**

1. `CLAUDE.md` (sacred rules; Windows `;` chaining; absolute paths)
2. This plan
3. [Panel record](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) — the
   `file.ts:line` citations behind every task below
4. [Frozen audit](../40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md)
5. Parent plan [§3 and Phase 5](2026-07-31-content-history-localization-audio-plan.md)
6. `docs/life_lessons/ui_map.md`

**Files to inspect before editing:** every `file.ts:line` named in the phase you are starting. Read
the surrounding function, not the cited line alone. Several fixes are one line inside a component
whose sibling lines belong to a different phase.

**Branch collision rule:** one file has one owning phase (§4). Do not edit a file outside your
phase's file list, even for an obviously-correct one-line fix — raise it instead.

**Global stop rule.** STOP and report rather than proceeding if:
- a fix requires touching `src/sim/**`, `src/state/**`, a scenario, calibration data, or canon;
- a "string fix" turns out to change which value is computed rather than how it is worded;
- a display-name fix cannot resolve a name from the existing lookup (that is a data bug, not a
  display bug — it is pre-seeded to R8);
- any baseline, fingerprint, or calibration artifact changes. **This plan must be byte-neutral to
  the simulation.** A changed hash means you edited something you should not have.

**Expected phase/commit boundaries:** one commit per phase minimum; within Phase 3, **one commit per
file** — the `className` fixes are independent and must not be merged into one edit. Two files in
Phase 3 carry two distinct tasks each (`PresidentialDecisionRoomPanel.tsx`: 3.4 + 3.5;
`PresidentDeskShell.tsx`: 3.7 + 3.9): one commit per file, two distinct diffs inside it.

---

## 4. Task Boundary Rules

### Scope Lock — allowed surfaces

- `src/ui/map/**` presentation code, its utils and data adapters
- `src/ui/shared/**` player-facing label helpers
- `src/ui/map/i18n/messages.en.ts`
- active UI tests under `tests/ui/**`
- R7/GUI documentation, roadmap control docs, and the ledger

### Scope Lock — forbidden surfaces

- `src/sim/**`, `src/state/**`, scenarios, calibration data, derived data pipelines
- `src/desktop/electron-main.cjs`, preload, IPC channels/payloads, save schema
- `docs/10_canon/**` — including and especially `FORAWWV.md`
- `messages.bcs.ts` and any locale contract
- OSID/`sid` key derivation

### Per-phase file ownership (the anti-collision contract)

Three seats independently proposed edits to overlapping files. Ownership is assigned **by file**,
not by finding, so no two phases can touch the same file:

**Three known collisions, resolved here so no implementer discovers them at edit time:**
`PresidentialDecisionRoomPanel.tsx` and `CorpsFrontPanel.tsx` were both claimed by the layout seat
and the data-truth seat; `PresidentDeskShell.tsx` and `CodexPanel.tsx` were both claimed by the
layout seat (findings 24 and 7d) and the voice seat. **Phase 3 owns all four of the layout-side
files outright** (`PresidentialDecisionRoomPanel.tsx`, `PresidentDeskShell.tsx`, `CodexPanel.tsx`,
plus `ArmyHQModal.tsx` for finding 17); **Phase 5 owns `CorpsFrontPanel.tsx`**. A voice or data-truth
change wanted inside a Phase-3-owned file is raised to the integrator, not made — and vice versa.

| Phase | Owns these files exclusively |
|---|---|
| 1 | `src/ui/map/i18n/messages.en.ts` |
| 2 | `generateChronicleEntries.ts`, `ChronicleOverlay.tsx`, `playerSafeText.ts`, `FormationDetail.tsx`, new municipality-name map module |
| 3 | `DirectiveCard.tsx`, `AdvanceTurnModal.tsx`, `PresidentialDecisionRoomPanel.tsx`, `SituationTab.tsx`, `PresidentDeskShell.tsx`, `DeskAuthorityHeader.tsx`, `WarroomShellLayer.tsx`, `CodexPanel.tsx`, `ArmyHQModal.tsx` |
| 4 | `formatters.ts`, `WarSummaryContent.tsx`, `TurnAftermathModal.tsx`, `TurnAftermathRecordsPanel.tsx`, `BrigadeRow.tsx`, `SettlementDetailContent.tsx` |
| 5 | `SectorsSection.tsx`, `CorpsFrontPanel.tsx`, `DaytonNegotiationModal.tsx`, `DaytonInstitutionalDimensions.tsx`, `CinematicVerdict.tsx`, `PersonnelContent.tsx`, `officerCharacter.ts` |

**Save/schema work:** never. **Scenario/hash drift:** never — see the global stop rule.
**Decision packet instead of implementation:** required for anything in §9 HELD.

---

## 5. Phase Sequence

Effort key: **XS** ≈ one line · **S** ≈ under an hour · **M** ≈ half a day.
Every task carries an implementer seat and a **different** reviewer seat (house rule).

---

### Phase 1 — `messages.en.ts` staff-voice and disclosure pass

**Implementer:** Narrative Designer · **Independent review:** Modern Wargame Expert (semantic
accuracy of every reworded number/label) + Canon Compliance Reviewer (items 19a, 23 only)

This phase is string-only. It changes no computed value. Every data-truth item whose fix the panel
described as "reword" lands here rather than in the data-truth seat's own phase, because
`messages.en.ts` has one owner.

| # | Task | Key / line | Effort |
|---|---|---|---|
| 1.1 | Engineering vocabulary → staff voice: drop *owns*, *shell*, *executable staff items*, *Ghost Entry*, the quoted-string chapter recap, *Responsible owner*, *recorded decision effect* | `:5164`, `:773`, `:2027`, `:343`, `:2015`, `:5171-5172`, `:3577`, `:4221`, `:3578`, `:444`, `:3637`, `:3655`, `:1925` | S |
| 1.2 | `Unreported` → **`No staff report`** across the 13 bare value-slot keys listed in the panel record. **Keep** the contextual phrases (`Cohesion unreported`, `Commander record unreported`) — they already read as prose | 13 keys, enumerated in panel §4 | S |
| 1.3 | Finding 2 — reword `situation.sustainmentCollapsed` to disclose a **cumulative, permanent** municipality count, not a live severity band beside "critical"/"strained" | `situation.sustainmentCollapsed` | XS |
| 1.4 | Finding 25 — disclose the unit on net territory: it is an **OSID count** | `warSummary.label.netOsids` | XS |
| 1.5 | Finding 8c — qualify the two `CRITICAL` labels by domain (reserve queue vs review queue: two different counts, both correct) | `PresidentialAttentionPanel` label keys | XS |
| 1.6 | Finding 10c — "Baseline: 1.0 = Standard Brigade" into staff voice | `corpsFront` baseline key | XS |
| 1.7 | Finding 20 — one time unit: **weeks**. Change only the three keys the audit named | `:2166`, `:1892`, `:1894` | S |
| 1.8 | Finding 18b — Patron Override gains its consequence clause (reuse `commandBriefing.item.patronOverride.detail:1085`) | `:2483` | XS |
| 1.9 | Findings 22a, 28, 29 — `Fielded personnel now` → `Fielded personnel`; `Open Turn Aftermath` → `View Aftermath`; spaced hyphen → em dash | `:3275`, `:449`, `:1077`, `:1085` | XS |
| 1.10 | Finding 19a — reword the paramilitary methodology sentence in place, **keeping every fact and the caveat**, dropping engine-voice framing. **Do NOT relocate it** | `:5471` | S |
| 1.11 | Finding 23 — replace the 19-name comma paragraph with a pointer to the roster already rendered as chips at `PersonnelContent.tsx:329-340`. **Touches no name** | `:3287` | S |

**Canon gates discharged in this phase** (Canon Compliance Reviewer signs both):
- **19a** — `SENSITIVE_HISTORY_DESIGN_GATE.md:143` requires the citation *content* to be present but
  dictates neither voice nor placement. It already sits under its own `Sources and model`
  sub-header. Reword in place. The audit's "move it to a tooltip/codex note" is **rejected**:
  relocating reduces the visibility of gate-required content for no wording benefit.
- **23** — §10 (provenance) governs any surface stating something about a named real person with a
  `war_crimes_record`. The fix changes only the duplicate summary sentence; the full unmodified list
  stays. **Constraint recorded for any future per-officer dossier work: key off the provenance
  manifest structurally per §10.0, never off a curated subset of "notable" names.**

**Tests first:** extend the existing i18n key-presence/vocabulary tests under `tests/ui` with a
banned-vocabulary assertion (`owns`, `shell`, `Ghost Entry`, `executable staff items`,
bare `Unreported` in a value-slot key).

**Verification:** `npm.cmd run test:vitest -- tests/ui` · `npm.cmd run typecheck`

---

### Phase 2 — Display-name pass (findings 3 and 9) — the audit's #2 headline

**Implementer:** Gameplay/UI Programmer · **Independent review:** Historian (name source and
diacritic fidelity — mandatory, per §13 "Historical/source review") + Code Review

The correct implementation **already exists** and is already consumed by ~30 components:
`buildOsidDisplayNameMap()` / `getOsidDisplayName()` (`src/ui/map/utils/osidDisplayName.ts:59,76`),
populated at `MapContainer.tsx:1602` into Zustand `osidDisplayNames`. It carries proper diacritics,
strips the pipeline's `"(+N)"` merge annotation, strips a trailing `_N`, and already de-duplicates
`Bratunac Bratunac`. Chronicle and three GameStateAdapter sites are simply not wired to it.

| # | Task | Files | Effort |
|---|---|---|---|
| 2.1 | Chronicle battle titles — add an `osidNameMap` param to `generateChronicleEntries()`; replace `getPlayerSafeSettlementName(battle.osid, …)` with `getOsidDisplayName`; pass the store map from the overlay | `generateChronicleEntries.ts:542,569,574`; `ChronicleOverlay.tsx:313` | S |
| 2.2 | Operation display names — harden `getPlayerSafeOperationName`'s slug branch to strip a trailing `_N` as `humanizeOsid` already does; closes the suffix leak at ~7 call sites | `playerSafeText.ts:324-361` | S |
| 2.3 | Finding 9 — "Home municipality" uses the naive path seven lines below a correct one on the same card. Build a small `mun1990_id → mun1990_name` map from the same geojson (measured clean 1:1, 110 municipalities, 0 conflicts) and use it | `FormationDetail.tsx:788` (correct sibling at `:779`) | S |
| 2.4 | Turn the measured **0 collisions / 712 keys** result into an executable invariant so a future OSID/OOB data change cannot silently reintroduce one | new test under `tests/ui` | S |

**Explicitly NOT in this phase:**
- Full diacritic threading into `GameStateAdapter`'s operation-building pass (**M**, needs
  objectives-array-vs-raw-name precedence worked out). Task 2.2 is the bounded fix; the remainder is
  recorded in the post-1.0 backlog. The precedence hazard is **measured absent** for authored
  catalog names (`def.name` bypasses the humanizer entirely), which is why 2.2 is safe alone.
- `src/sim/combat/tactical_group_naming.ts`'s missing diacritics — `src/sim/`, forbidden, pre-seeded
  to R8.

**Verification — enumerate, do not sample.** Run one long scenario; for every Chronicle entry, every
`state.operations[]`/`operationHistory[]` record, and every formation's `location_osid`, run the
CURRENT and FIXED humanizers over the same input and diff. Anything still matching the existing
`looksLikeRawPlayerFacingToken()` regex (`playerSafeText.ts:51`) is a real remaining leak.
Every OSID appearing in a 188-week run must resolve via `osidDisplayNames`; measured coverage is
100%, so **any miss is itself a bug** and pre-seeds to R8 rather than being patched here.

---

### Phase 3 — English text that will not render legibly

**Implementer:** UI/UX Developer · **Independent review:** Code Review + QA Engineer

One commit per file. These are independent one-line `className` fixes and must not be merged.

| # | Task | File:line | Effort |
|---|---|---|---|
| 3.1 | Finding 12 — acronym letter-stacking (`VRS`→`V/R/S`, `ARBiH`→`AR/BiH`): add `whitespace-nowrap shrink-0` to the label spans | `SituationTab.tsx:278,341` | S |
| 3.2 | Finding 7b — DirectiveCard buttons paint over each other: add `truncate` to the three button `className`s, add the missing `title` | `DirectiveCard.tsx:835,851,862,871`; title at `:867` | S |
| 3.3 | Finding 7a — AdvanceTurnModal labels truncate with room to spare: `truncate` → `line-clamp-2 leading-tight`, add `title={label}`. **No grid-template change** | `AdvanceTurnModal.tsx:86-95` | S |
| 3.4 | Finding 7c — Decision Room `ALL` lens chip collides with its own badge: widen `min-w` for the `all` lens, or drop the redundant aggregate digits shown above | `PresidentialDecisionRoomPanel.tsx:74-114` (`:90`, `:102-114`) | S |
| 3.5 | Finding 21 — the action receipt is an in-flow block reusing the header card's exact styling, cleared only by a flat 8s timeout: give it distinct styling and a dismiss control following the existing `desk-close-overlay` pattern. **No new Toast component** | `PresidentialDecisionRoomPanel.tsx:599-614,483-490`; pattern at `PresidentDeskShell.tsx:96-106` | S |

| 3.6 | Finding 17 — the corps card's OG list is cut mid-name (`OG VISOKO`, `OG MAGLAJ`) with a dead black band below it, because the corps cards sit in one CSS Grid with **no `content-start`**: default `align-content` computes as `stretch`, so surplus height in the scroll area is pushed into the row tracks instead of packing row 2 under row 1. Add `content-start` to the grid container className. **One word, no restructuring, no change to the `auto-fit`/`minmax` column logic** | `ArmyHQModal.tsx:724` | S |
| 3.7 | Finding 7d (desk half) — the RESERVE REQUEST body cuts flush mid-sentence. The content is **not lost**: `president-desk-scroll-region` is a genuinely scrollable `overflow-y-auto` with no visual affordance, which at a glance — and in a press screenshot — is indistinguishable from truncated text. Add a bottom fade/scroll-shadow (mask-image gradient or a pinned gradient overlay) | `PresidentDeskShell.tsx:107-109` | S |
| 3.8 | Finding 7d (Codex half) — same root cause, different container: the campaign-context essay cuts mid-citation (`…in Prosecutor v.`) inside a `max-h-44 overflow-y-auto` `<section>` with no cue. Add the same affordance **independently**. **Two small CSS additions in two files — deliberately NOT a shared component**, so no design-system scope creep | `CodexPanel.tsx:359-362` | S |
| 3.9 | Finding 24 — the whiteboard date (`26 Jul 1993`) is a DOM date label anchored to the background whiteboard and is sliced to a ~12px sliver ("26 Jul 1…") by the `PresidentDeskShell` right column, which lands its `flex gap-3` exactly across the whiteboard. Adjust the date-label/header layout and header-to-packet gap as necessary to expose every date character at all nine faction/viewport combinations (owner-approved date-only criterion). **Treat the accidental sliver as the bug; do not reposition the column** | `WarroomShellLayer.tsx:474-515`; retained fade in `PresidentDeskShell.tsx:107-109` | S-M |

**3.4 and 3.5 are the same file: one commit, two distinct diffs — do not merge the edits.**
**3.7 and expanded 3.9 form one coupled Desk/date commit, preserving the fade and layout as distinct diffs.**

**3.9 needs one live visual-iteration pass in a browser.** The whiteboard artwork is baked
into a `.webp`, but the date itself is the DOM `warroom-date-board-label` in
`WarroomShellLayer.tsx`. The continuation measurements correct the earlier assumption that
all faction plates have identical overlap: their date positions differ. Acceptance is a
before/after screenshot at the same window size: under the owner-approved continuation, the
**complete date must be readable, with no clipped characters**; the whole board need not be exposed.
The owner-authorized expansion includes date-label/header layout and gap adjustments. If tuning requires the column to move or
the art to change, STOP — that is out of this plan.

**Provenance for 3.6–3.9.** All four were HELD as UNLOCATED in the first panel round and were closed
by the 2026-09-05 screenshot pass (panel record §5), which read the on-disk PNGs directly rather
than reasoning from source. Two independent screenshots corroborate 17; `command_surface.png`
(whiteboard fully legible, no right-column overlay) against `fresh_shots/{rbih,hrhb}/01_desk.png`
settles 24. Do not re-derive these from source — the citations above are the result.

**Verification — box intersection, never `scrollWidth`.** `scrollWidth === clientWidth` cannot see
this class of bug: under `justify-end` overflow projects from the start edge and is excluded from
`scrollWidth` in LTR. That is the lesson PR #491 already paid for. Assert sibling
`getBoundingClientRect()` non-intersection (7b), single-line label height (12), and drawn-content
containment (7a).

Per-task verification for the screenshot-pass additions:

- **3.6** — with `expandedCorpsId` set to a corps with a long OG list, assert the compressed
  siblings' `getBoundingClientRect().top` equals `expandedCard.bottom + gap`. That is a
  content-driven constant; before the fix it tracks container height, after it must not.
- **3.7 / 3.8** — for each container assert `scrollHeight > clientHeight` implies the fade is
  present; screenshot-diff to confirm the last visible line fades rather than hard-clips.
- **3.9** — before/after screenshot at identical window size (see the task note).

---

### Phase 4 — Number formatting and unit truth

**Implementer:** Gameplay/UI Programmer · **Independent review:** Modern Wargame Expert

| # | Task | File:line | Effort |
|---|---|---|---|
| 4.1 | Finding 6a — **`fmtK` has no M-scale branch**, so 1,211,000 displaced renders `1211k`. Add it | `formatters.ts:125-128`; surfaces at `WarSummaryContent.tsx:245` | XS |
| 4.2 | Finding 6b — the same screen prints `Killed 5k / Wounded 18k` and `4,755 killed / 17,767 wounded`. One formatter for both sections | `WarSummaryContent.tsx:196,200,234-235` | XS |
| 4.3 | Finding 6c — friendly casualties render through raw `String(...)`, a third style with no separator. Route through `formatPersonnel`/`fmtK` | `TurnAftermathModal.tsx:492`, `TurnAftermathRecordsPanel.tsx:186` | XS |
| 4.4 | Finding 6d — two components inline-duplicate `>=1000 ? toFixed(1)+'k'`, identical to the exported `formatPersonnel` they do not import. Import it | `BrigadeRow.tsx:153`, `SettlementDetailContent.tsx:921` | XS |

**Voice rule 4 constraint (canon-adjacent):** round to what a briefing officer would say **except**
where canon forbids rounding to avoid minimising a cost. Check `SENSITIVE_HISTORY_DESIGN_GATE.md`
before rounding anything cost/casualty-adjacent. Finding 19b is the worked example — see §7.

**Verification.** Unit-test `fmtK` across the scale boundaries (999 / 1,000 / 999,999 / 1,000,000 /
1,211,000) — 4.1 exists because nobody had ever passed it a seven-digit number. Then assert on one
rendered frame that the **same** underlying number is not printed in two styles: `WarSummaryContent`'s
Overview tab reproduces 6a, 6b and finding 25 together, so it is the single frame that proves all of
them. `npm.cmd run test:vitest -- tests/ui` · `npm.cmd run typecheck`.

**This phase must not change any value.** If a formatter change alters a displayed magnitude rather
than its presentation, stop — that is a data question, not a formatting one.

---

### Phase 5 — Remaining located component copy

**Implementer:** UI/UX Developer · **Independent review:** Narrative Designer

| # | Task | File:line | Effort |
|---|---|---|---|
| 5.1 | Finding 11 (label half) — `Cost Signal: rupture` renders a raw engine enum via `.toString()`. Reuse the existing `formatFindingSeverity` (`WarCostSummary.tsx:70-76`, keys at `messages.en.ts:4210-4212`); add the missing `warCost.findingSeverity.none` | `CinematicVerdict.tsx:114` | S |
| 5.2 | Finding 18a — `RBIH` is canonical `RBiH` destroyed by a CSS `uppercase` class, not a bad string. Remove the transform on this span only | `DaytonNegotiationModal.tsx:361` | XS |
| 5.3 | Finding 13a — the strikethrough price has its explanation only in a hover `title`, invisible at a glance. Add a visible "locked" sub-label | `DaytonInstitutionalDimensions.tsx:184-185,197,200` | XS |
| 5.4 | Finding 10d — the corps card shows the same density twice under two labels and exposes `SUBSEGMENTS: 1`. Show once; gate `sub_segments` on `> 1` | `SectorsSection.tsx:412-414,417,440-442` | XS |
| 5.5 | Finding 5 (component half) — merge the stacked `Unreported / Enemy picture unconfirmed` pair into one sentence, and give `No staff report` a de-emphasised token (italic / lower opacity / **no `tabular-nums`**) so it never carries a number's visual weight | `SectorsSection.tsx:159-162` | S |
| 5.6 | Finding 20 (component half) — drop `formatTenure`'s month branch; weeks throughout | `officerCharacter.ts:211-215` | S |

**5.4 and 5.5 are the same file: one commit, two distinct diffs.**

**Verification.** 5.1: assert no player-facing string equals a raw engine enum — render every
`costEmphasis.severity` value including the `none` key added here, and assert each resolves to a
label present in `messages.en.ts`. 5.2: assert the rendered text is `RBiH`, not `RBIH` — a
`textContent` assertion, since the string was always correct and only the CSS transform was wrong.
5.3: assert the locked price carries a visible sub-label, not only a `title` attribute (a hover-only
explanation is invisible in a screenshot and to a keyboard user). 5.4: assert the density figure
appears exactly once per corps card and that `sub_segments` is absent when it equals 1. 5.6: assert
no tenure string contains "mo" or "month". `npm.cmd run test:vitest -- tests/ui` ·
`npm.cmd run typecheck`.

---

### Phase 6 — Integrated proof and closeout

**Implementer:** QA Engineer · **Independent review:** Process QA + Reports Custodian

- [x] **Close the finding-1 coverage gap.** `tools/ui/verify_toolbar_fit.mjs` initially reported
      **PARTIAL** — it exercises only the chips present in the one tracked save it loads. Re-run
      with `--save` pointing at a save where **both** state-dependent chips (RESERVE and REVIEWS) are
      simultaneously live. A save without them passes every width trivially, which is not the same
      as passing. Record FULL or record why it remains PARTIAL.
- [x] Re-capture the audit's surfaces at **1920×1080, 1366×768, and 3440×1440** (the parent plan's
      Phase 5 resolutions) and confirm each discharged finding by image, not by diff.
- [x] Confirm **zero simulation drift**: baseline artifacts, fingerprints and calibration hashes are
      byte-identical to the pre-plan HEAD. A changed hash fails this phase.
- [x] Produce the **bug/friction split table** required by roadmap §12 (*"bugs and friction remain
      separately reported"*) — friction discharged here, bugs pre-seeded to R8, neither merged.
- [x] Create `docs/40_reports/implemented/20260905_R7_PRESENTATION_ENGLISH_READABILITY.md`.
- [x] Update roadmap, command board, ledger, knowledge ledger, and napkin together.

**Global verification barriers (roadmap §11) — all must pass before this plan closes:**

```powershell
npm.cmd run typecheck
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run test:vitest
npm.cmd run qa:player-experience
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
npm.cmd run desktop:release:check
node tools/ui/verify_toolbar_fit.mjs
git diff --check
```

**Gate the whole `tests/ui` directory, not the files you touched.** A focused suite is a
false-green at the UI boundary — this is a recorded project lesson, not a preference.

---

## 6. Determinism and Save-Schema Gates

- No `Math.random()`, `Date.now()`, or wall-clock value enters any changed file — including comments.
- No persisted-state field is written, renamed, or migrated. This plan reads state and renders it.
- Faction iteration stays in canonical `RBiH`, `RS`, `HRHB` order.
- The new municipality-name map (2.3) is built deterministically from the committed geojson at load,
  by the same mechanism as the existing OSID map. It is a lookup, not derived data, and **no
  pipeline output changes**.
- **Byte-neutrality is the acceptance test for the whole plan**: two long scenarios before and after
  must produce identical hashes.

## 7. UI and Player-Truth Gates

- No fix may make a false statement true-looking. Where a value is genuinely unknown, the surface
  says `No staff report` — it does not invent a number.
- No fix may hide a real cost. **Finding 19b is closed as working-as-designed:**
  `SENSITIVE_HISTORY_DESIGN_GATE.md:143` states verbatim *"It does not round numbers to make the
  decision look small."* The `−4.04 international standing` precision is **canon-required**. Do not
  route it as a defect and do not round it.
- Real people's names are never shortened, softened, or truncated for scan-friendliness. Fix the
  container; never the name.
- Every rendered acronym, name, and label must survive CSS `text-transform` — check for a transform
  before assuming a display defect is a string defect (finding 18a is the worked example).

## 8. Historical and Sensitive-History Gates

- **Historian sign-off is mandatory on Phase 2.** Display names are historical identity content;
  `Medojevići`, `Svrake`, `Čajniče` must match the settlement source, not a transliteration.
- Diacritics come from `settlement_name` ground truth (measured: 319 of 744 rows carry one, and
  every scored OSID resolves). **No heuristic restoration.**
- The `_N` suffix is a derivation artifact disambiguating 1990-census sub-parts, **not** a "second
  battle" ordinal. Stripping it is a correction, not a loss of meaning — measured 0 collisions
  across all 712 scored OSIDs.
- Canon Compliance Reviewer signs Phase 1 items 19a and 23 before merge.

## 9. Routing of everything this plan does NOT do

The frozen audit has 29 findings. This plan discharges the located English/presentation half. The
rest has a destination, and every destination is named. **Nothing is left as "considered".**

### 9.1 The destination rule (settled Phase 1; do not re-argue)

First YES wins:

1. Is it English text the player reads — wording, a name, a label, a number's formatting, or text
   failing to render legibly? → **this plan (R7 amendment).**
2. Else, does the product state something false, contradictory, or blank where a value belongs, or
   does one control obstruct another? → **Bug**, pre-seeded into R8's findings register.
3. Else (pixels only, nothing false) → **post-1.0 backlog.**

### 9.2 Routed to R8's pre-seeded finding register

The register lives in **Phase 3 of
[2026-07-31-full-campaign-electron-validation-plan.md](2026-07-31-full-campaign-electron-validation-plan.md)**,
not in a new file. **R8 remains WAITING ON R7; the register is inert until R8 opens.**

| Register ID | Finding | Why it is a bug, not text |
|---|---|---|
| B1 | 10b — `intel_confidence` dead; FORCE BALANCE permanently REDACTED. **Measured display-only — D1 covers it; final, in this register** (§9.6) | a blank where a value belongs |
| B2 | 10a — `sector_combat_ratings[sid]` absent; blank OFFENSIVE POWER plus a sentence in a number slot. **Measured ENDGAME-ONLY — 7/7 mid-war snapshots in perfect parity, 0 missing; 63/63 missing at turn 188. D1 covers it; final** (§9.6) | same |
| B3 | 8a — `generateTacticalGroupName` non-injective at ordinal ≥ 2 | two distinct sectors given one identity |
| B4 | `army_reserve_system.ts:716,755` bakes an operation name into a sentence that reaches the player raw | sim-side writer; forbidden surface |
| B5 | 8b — two Commander Replacement cards claim the same consequence | contradictory |
| B6 | 15 — cross-OSID marker collision around the Sarajevo ring | **one control obstructs another** (markers are click targets) |
| B7 | 8d — review-before-advance lists the same two decisions twice | contradictory |
| B8 | 8f — two objective cards share one hardcoded CTA | states a false "next lever" for one of them |
| B9 | **Not an audit finding** — surfaced by B2's measurement. Near war-end, something rebuilds `corps_front_sectors` back to 63 later in the same turn **without a paired rating recompute**; that asymmetry, not the wipe, leaves the final state inconsistent. Rebuild site **not yet identified** (§9.6) | an engine path that leaves two paired maps disagreeing |

**B6 is priced L and is not a `className` pass.** `buildFormationsGeoJSON.ts:90-115` anchors every
marker at its own OSID centroid with no awareness of any other OSID's marker; there is no
zoom-dependent declutter and no cross-OSID screen-space collision check anywhere in the render path.
A real fix is a post-projection collision-avoidance or clustering pass — multi-day,
**graphics-programmer**, with real regression risk to marker hit-testing
(`MapContainer.tsx:2004-2025`). It is recorded so R8 can weigh it, and it is an explicit candidate
for R8 to prove *outside the 1.0 definition of done* under roadmap §12 rather than to fix.

### 9.3 Closing with NO code — do not schedule an implementer

| Finding | Disposition |
|---|---|
| 19b — the `−4.04 international standing` precision | **Working as designed.** `SENSITIVE_HISTORY_DESIGN_GATE.md:143`, verbatim: *"It does not round numbers to make the decision look small."* Canon **requires** this precision. Not a defect; do not route it as one and do not round it. |
| 27 — HRHB wall map washed out | All three plates composite through the same `WarroomScenePlate` with no faction-conditional sizing, cropping or filter. The difference is in the generated `.webp` content. **No code fix exists**; the owner generates all art externally. Post-1.0 backlog row. |
| 8e — decorate-a-unit identical copy and effects | **One authored template stamped over N real formations** (`war_1993.json:8172-8194`, cloned verbatim by `src/desktop/decorate_unit_contract.cjs`, whose own comment confirms this is deliberate). Neither a duplicate-render bug nor two coincidentally-identical entities — a **content-authoring gap**. It belongs to neither this plan nor R8's register as a code item; it routes to Narrative Designer / Game Designer. Post-1.0 backlog row. |

### 9.4 Routed to the post-1.0 backlog

Recorded in `MASTER_ROADMAP.md` §10's backlog table **with their key lists, so nobody re-greps
them**: the four-formatter consolidation, the full turns→weeks sweep, 8e's per-candidate decorate
content, 27's art regeneration, and the `PRESIDENTIAL_DESK_BACKGROUND` dead export.

### 9.5 STILL HELD — three items, each with a named owner and ONE unblocking query

**These are findings, not shrugs.** The 2026-09-05 screenshot pass closed seven of the nine items
the first round left open; these three survived it, and each carries exhaustive negative evidence
rather than an absence of effort. None blocks the located work above. **None may be implemented by
guessing.**

| ID | What is unresolved | Owner | The ONE unblocking query |
|---|---|---|---|
| 14 | Left COMMAND rail clips the first list item's title. All four candidate screenshots checked; none reproduces it. `OOBSidebar.tsx` re-read in full: **grep for `sticky` returns zero hits**, and the COMMAND header (`:319-321`) is a normal `shrink-0` flex sibling above the scroll region (`:324-329`), not a positioned element that could sit on top of content below it. **The mechanism this finding requires does not exist in that file.** | UI/UX Developer | A live interactive session, or the original auditor's click-path. More source-reading and more static screenshots will not advance it — both are exhausted. |
| 13b | `Visit the front ~~10~~ CA`. Every component rendering the front-visit CA cost was read: `DeskAuthorityHeader.tsx:179-197` and `FrontVisitSection.tsx:154-166` use muted colour / `cursor-not-allowed` only, **no `line-through`**; `DirectiveCard.tsx`'s front-visit branch has no cost strikethrough at all. The only cost-lock `line-through` in the tree is `DaytonInstitutionalDimensions.tsx:197` — which is finding 13a, already scheduled at task 5.3. Every save in the evidence set shows **100/100 Command Authority**, so no capture can reach an unaffordable state. | Modern Wargame Expert | A save with CA < 10 on the desk, or the original audit capture if one exists outside `tmp_gui_observation/`. Absent either, close it as "already fixed, or auditor shorthand for the muted/disabled styling". |
| 22b | Stray `×` glyph beside the Army HQ date. No literal in `ArmyHQModal.tsx:405-426` or anywhere in `army_hq/`. **Probably not a string at all** — likely a close-icon element or a font-fallback artifact. | Narrative Designer (hands off to UI/UX if it proves to be an element) | Is it a DOM element or a rendered glyph? One devtools inspection answers it. |

**Disposition rule:** when a HELD item is located, it re-enters this plan **only if** the §9.1
decision rule sends it here. If it is a bug it pre-seeds to R8; if it is polish it goes to the
post-1.0 backlog. Locating a finding does not by itself earn it a place in this plan.

### 9.6 D1's reach over engine defects the audit never saw — ASKED, ANSWERED, AND RULED

**The question that was raised.** Owner decision D1 (2026-09-04) said HOLD FOR R8: no unscheduled
defect repair, P1/P2 bugs pre-seed to R8. The panel then surfaced **four engine defects that are not
among the 29 audited findings at all** (B1–B4). D1 was made about the audit's own bugs; it was not
self-evident that it reached defects that had never been in front of the owner. The record of what
was asked is kept here because the same question will recur the next time a panel finds something
the audit missed.

**The part that was the integrator's to rule.** D1 governs **scheduling**, and its logic — do not
open unscheduled repair work while R7 is the live lane — applies as well to a defect discovered on
2026-09-05 as to one discovered on 2026-09-03. **For a defect whose only consequence is
player-facing presentation, D1 covers it.** That disposed of **B3** (a display-name collision in a
pure label field) and **B4** (a string leak into an evidence row) immediately. Both are recorded in
the register; neither is touched.

**The part that was not.** B1 and B2 were not yet known to be presentation-only. The roadmap carries
a standing owner order from 2026-09-01 — *"engine health is sacrosanct… engine-health defects are
fixed before tuning"* — and that order and D1 point opposite ways for a defect that reaches
simulation behaviour. A standing order about what the engine *is* outranks a scheduling decision
about UI repair. So the recommendation was **one bounded read-only query per defect** — a grep and a
read, changing no code, breaching D1 in neither direction — and the call was surfaced to the owner
rather than made here.

**Both queries have now been run. Nothing was changed to run them.**

#### B1 — MEASURED DISPLAY-ONLY. D1 covers it. Closed; returns to the owner for nothing.

Exhaustive reader list for `CorpsFrontSector.intel_confidence`, **all under `src/ui/`**:
`CorpsFrontPanel.tsx:405-407,626` · `SectorsSection.tsx:152,157-158` · `SituationTab.tsx:487` ·
`GameStateAdapter.ts:2578`. **No bot, AI, or targeting path branches on it.** B1 therefore sits with
B3 and B4: recorded in the R8 register, not repaired now, and not an owner decision.

**But record what a future fix actually means, because the blank panel understates it.** A separate
and fully load-bearing intel system exists — `state.military.sector_intel[sectorId][].confidence`,
computed every turn at `sector_intel.ts:91-129` — and **it does gate simulation behaviour**:
`bot_corps_directives.ts:58-59,286` (`INTEL_GATE_LAUNCH_THRESHOLD`, default `0.30`, gates whether a
corps may launch an operation at all) · `combat_predictor.ts:82` ·
`sector_offensive.ts:716,1105-1106` · `commander/{briefing,belief,decide,emit}.ts`.

**The UI is reading a dead twin of a live system.** Whoever eventually closes B1 is not filling in a
blank label — they are wiring a dead field to a load-bearing one, and the plan's existing caution
applies directly: `sector_intel` is the structure already documented as corrupted by per-turn
sector-id churn. That work is R8's to schedule and is **not** a UI patch.

#### B2 — MEASURED ENDGAME-ONLY. D1 covers it. Closed; no engine repair scheduled.

`sector_combat_ratings` is **not** display-only in the source: `army_hq_gathering.ts:269,340-360`
(`computeSectorThreatAvg`) feeds `CorpsAssessment.sector_threat_avg`, which feeds
`computeOpportunityScore` (`:521-522`) and the skip test at `:875`; `CorpsAssessment` is consumed by
`bot_corps_directives`, `bot_corps_stance`, `bot_strategy`, `army_co_lifecycle`,
`army_order_interpretation`, `operation_preparation`, and the commander modules. That is why it was
measured rather than assumed.

**The measurement (2026-09-05): ZERO mid-war occurrences.** Seven mid-war full-state snapshots
(turns 41, 44, 60 ×3, 70, 80) show `corps_front_sectors` and `sector_combat_ratings` in **perfect
parity every time** — 79/79, 79/79, 89/89 ×3, 83/83, 89/89. **0 missing, 7/7.** At turn 188 of the
canonical run `apr1992_definitive_188w__46834a3b41033bff__w188_n388`: 63 active sectors, ratings map
empty, **63/63 missing**. The absence is an endgame artifact and does not occur in ordinary play.

**It is explained by code, not merely correlated.** Every writer of `corps_front_sectors`' key set —
the `partition-corps-front-sectors` step and all four entry points in
`final_sector_truth_reconciliation.ts` — calls `computeSectorCombatRatings` immediately afterward,
in the same function, against the just-written map, and that function emits one entry per key
unconditionally, **even for 0-brigade sectors** (`sector_combat_rating.ts:81-98`). The two maps are
always rebuilt as a pair. The one standalone mutator outside the pairing, `bot_corps_ai.ts:431`
(`delete corps_front_sectors[sid]` for 0-edge ghosts), only ever **removes** keys — it can leave a
stale extra rating, never a missing one — and is resynced the same turn by
`recompute-sector-combat-ratings` (`war_phases.ts:2614`). Exhaustive grep found no path that adds a
sector key without the pairing.

**CORRECTION — this plan previously stated the consequence wrongly.** The earlier text here said an
absent sector is excluded from both the numerator and the denominator, silently skewing the average.
**That is the *partial*-absence case, and it does not occur.** Absence is all-or-nothing: with the
map empty, `computeSectorThreatAvg`'s loop never executes, `count === 0`, and **every corps takes
the flat `0.5` fallback** (`army_hq_gathering.ts:341-360`). Because `0.5 > 0`, the
`sector_threat_avg <= 0` skip test at `:875` **never fires**. The real consequence is narrower than
described: at the final turn only, LOW/HIGH_THREAT bonus logic runs on a uniform `0.5` instead of a
real signal.

**Disposition: B2 joins B1 as D1-covered and FINAL in the R8 register.** It does not return to the
owner and no engine repair is scheduled. Display-only in practice, on measured evidence rather than
on a reading of the source.

**Evidence limitation, recorded so it is not overstated later.** The seven snapshots are
**opportunistic saves from different playtest configurations**, not a systematic per-turn trace of
the canonical scenario. A fresh instrumented run was offered and **deliberately declined**: seven
clean mid-war samples plus a code-level pairing argument is sufficient to *route* a defect nobody is
repairing, and a fresh run is not justified for one. If B2 is ever scheduled for repair, that run
becomes worth doing first.

#### B9 — the endgame rebuild asymmetry (new; nobody had named it)

The measurement surfaced a second half to the endgame wipe. The
`final_sector_truth_reconciliation.ts` guard clauses fire when sectors momentarily go empty near
war-end — and then **something rebuilds `corps_front_sectors` back to 63 later in the same turn
WITHOUT a paired rating recompute.** That asymmetry, not the wipe itself, is what leaves the final
state inconsistent.

**Routed to the R8 register as B9, not to the post-1.0 backlog.** The backlog is for *"optional
improvements outside the 1.0 outcome"*; an inconsistent state at war's end is not optional — the
endgame is what every campaign reaches, and R8 is the lane that plays campaigns to Dayton, so R8 is
where it will actually be encountered. **It is recorded, not scheduled.** Its only measured
consequence is the same bounded one as B2 — final-turn corps assessments running on a uniform `0.5`
— so it does not trigger the §9.6 escalation rule as it stands. **If anyone finds a mid-war
manifestation, it does, and the call returns to the owner.**

**First step for whoever picks it up: the rebuild site was not identified.** Find what re-populates
`corps_front_sectors` after the guard clause fires, in the same turn, without calling
`computeSectorCombatRatings`. Everything else about this defect is downstream of that answer.

### 9.7 Traceability of the D1 carve-out

D1 permits a bug found during R7 Phase 5 to be *a pure display-layer fix* to ride this amendment
**as a readability fix, recorded as such**. The R8 register carries a
`Discharged early via R7 amendment? Y/N + amendment task id` column for exactly this. **Any task
added to this plan under that carve-out must set that column in the same change** — otherwise the
carve-out becomes a hole in the register and a bug disappears from R8's gate without ever having
been fixed under R8's eyes. As of this writing no register row is discharged early; every one reads
`N`.

## 10. Roadmap and Ledger Closeout

**§13 Orchestrator Closeout Contract** — R7 closes with every field supplied:

```text
Workstream: R7 (presentation/English-readability amendment)
Plan: docs/plans/2026-09-05-r7-presentation-and-english-readability-amendment-plan.md
Base and final commit:
Tasks completed:
Focused verification:
Long-run/package evidence:
Behavior/baseline disposition:   <- must state BYTE-IDENTICAL
Historical/source review:        <- Historian sign-off on Phase 2 display names
Bug findings:                    <- SEPARATE field; pre-seeded to R8, not fixed here
Friction findings:               <- SEPARATE field; discharged by this plan
Ledger/canon/docs propagation:
Remaining dependency:
Next workstream: R8
```

**Propagation checklist:** `MASTER_ROADMAP.md` R7 row + Snapshot + §10 post-1.0 backlog rows ·
`COMMAND_BOARD.md` row 7 · parent R7 plan status paragraph · **R8's pre-seeded register in
[2026-07-31-full-campaign-electron-validation-plan.md](2026-07-31-full-campaign-electron-validation-plan.md)
Phase 3** (set the `Discharged early?` column if the D1 carve-out is used — §9.7) ·
`docs/PROJECT_LEDGER.md` · `docs/PROJECT_LEDGER_KNOWLEDGE.md` · `.claude/napkin.md` ·
`docs/40_reports/README.md` §1A.

**Bug and friction stay separate fields, never one merged list.** Roadmap §12 requires that *"bugs
and friction remain separately reported"*. This plan discharges **friction**; the register in R8's
plan holds **bugs**. Do not produce a combined findings table at closeout — the closeout block above
has two distinct fields for exactly this reason.

## 11. Copy-Ready Prompt

> Execute `docs/plans/2026-09-05-r7-presentation-and-english-readability-amendment-plan.md`
> task-by-task using the `executing-plans` skill. This is an R7 amendment: renderer-only, display
> layer only. Read the panel record at
> `docs/40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md` for the `file.ts:line`
> citation behind every task. Respect the per-phase file ownership table in §4 — one file has one
> owning phase; raise anything outside your phase rather than fixing it. Do not touch `src/sim/**`,
> `src/state/**`, scenarios, calibration, or canon. Do not fix bugs: every bug in this audit is
> pre-seeded to R8 by owner decision. The acceptance test for the whole plan is byte-neutrality —
> if a baseline hash moves, you edited something you should not have. Gate the whole `tests/ui`
> directory, never a focused subset. Implementer and reviewer seats are named per phase and must be
> different people.

## Execution checkpoint — 2026-09-09

Owner authorized execution after the Task 8 closeout integration. Starting source is
`16389f6c9` on `codex/r7-english-readability`; pre-existing validation artifacts remain.
First question: identify which numbered tasks are still open by checking current source,
tests and receipts in phase/task order. Inventory is read-only and costs minutes;
`logs/r7-english-readability/current-task-inventory.log` records the result.

Phase 1 question: can the listed English labels become clear staff prose while preserving
all interpolation fields, quantities, contextual missing-report phrases, historical facts,
and sensitive-history caveats? Run a focused failing vocabulary/semantic test first, then
`npm.cmd run test:vitest -- tests/ui`, `npm.cmd run typecheck`, the required map build,
and `git diff --check`. Logs use `logs/r7-english-readability/phase1-*`; the starting
`npm.cmd run typecheck` receipt is `start-typecheck.log`. Expected cost is minutes per
local gate. Pass requires all listed string tasks resolved, the full UI gate green,
and independent semantic and canon review; no simulation or persisted-data edits.
Stop on conflicting canon, unclear value semantics, forbidden-file requirements or
repeated verification failure. Final visual, long-run and global acceptance gates in
Phase 6 remain required; local Phase 1 checks cannot close them. Their commands, input
identity, cost and stopping rule will be fixed before launching those runs.

Phase 1 ownership clarification: item 1.5's reserve and review counts both consume
`attention.critical` in `PresidentialAttentionPanel.tsx`. Assign that component to Phase 1
solely for its two label call sites and two distinct translation keys; keep the shared key
for any other consumers. This is the wiring required by the already listed domain-label
task, with no value, ordering or layout change. Phase 1 also owns the missing
`warCost.findingSeverity.none` translation needed by Phase 5.1, so Phase 5 does not edit
Phase 1's file. For Phase 5.2, textContent alone cannot detect CSS uppercase: verify the
rendered computed text-transform and visible casing as well as the underlying text.

Phase 1 first full UI gate: 344 files, 2,939 tests; 316 files/2,886 tests passed and
28 files/53 tests failed, exit 1, in 614.17 seconds. Receipt:
`logs/r7-english-readability/phase1-ui-suite.log`. The UI filter also matches root
`tests/ui_*` consumers. Classify the failed old-copy assertions individually and retain
all quantity, sparse-truth and negative controls when updating expected wording.
Run the affected tests first, then one complete UI rerun (about 10 minutes measured).
The first focused RED was 9 failures/13 passes; the implementation focused GREEN is
22/22. Starting and Phase 1 typechecks and the first Phase 1 map build passed.
Review requested count-neutral grammar for the shared archive-count summary; that
correction is included before final verification. These are interim receipts, not
Phase 1 or amendment acceptance.

Phase 2 source precheck is GO (`logs/r7-english-readability/phase2-source-precheck.log`).
Current operational GeoJSON covers 712/712 scored OSIDs with zero display collisions;
110 municipality IDs map without conflicts. Of the 712 scored labels, 710 are census-derived
and two are the explicitly authored Mostar Istok/Zapad operational splits. Preserve these
source labels exactly; do not claim that all 712 are literal census names. Task 2.2's pure
slug suffix removal already exists and its existing focused suite passes 7/7; retain it
and add only any missing discriminating regression coverage. The initial inventory's
claim that this suffix removal was absent is corrected in its appended root note.

## Phase 1 closeout — 2026-09-09

Phase 1 is COMPLETE, independently reviewed GO. The production slice is the English
catalog plus the two explicitly assigned critical-queue label call sites. All eleven
listed tasks are implemented; the full reserve roster and sensitive-history facts,
caveat and precision remain intact. The three new English keys use the existing fallback
contract; Bosnian translation remains deferred. Shared UI tests retain their original
quantity, visibility and missing-data controls with corrected text expectations.

Evidence under `logs/r7-english-readability/`: `phase1-ui-final.log` passes 344 files and
2,939 tests, exit 0 (573.04 seconds); `phase1-typecheck.log` and
`phase1-final-map-build.log` pass, exit 0. Independent Canon Compliance and Modern Wargame
semantic review is GO in `phase1-review.log`, after the count-neutral archive wording
correction. Initial red and correction receipts remain preserved. Documentation/diff
verification and the mandatory local commit-hook result are recorded in
`phase1-docs.log` and `phase1-commit.log`. Phase 2 is next. No simulation, save, dependency,
scenario, baseline or canon change occurred; fresh long-run and visual acceptance remain
required at the integrated closeout. No push or merge is authorized by this checkpoint.

## Phase 2 bounded validation plan — 2026-09-09

Base: Phase 1 commit `46961f056`. Question: can Chronicle and formation home-municipality
labels consume the existing canonical map names without changing identifiers, source data,
state or operation-name semantics? Reuse `osidDisplayNames` and `osidPropertiesMap`; no new
fetch, persisted field or naming heuristic. The source precheck above remains applicable.

Run discriminating focused tests RED/GREEN, including the actual lookup helpers over all
712 scored OSIDs, 110 municipality mappings, and authored numeric operation names; then
`npm.cmd run test:vitest -- tests/ui`, `npm.cmd run typecheck`,
`npm.cmd run desktop:map:build`, and `git diff --check`. Logs use
`logs/r7-english-readability/phase2-*`. Cost: focused checks seconds/minutes, full UI about
10 minutes, typecheck minutes, map build about 40 seconds on this host. Independent
Historian/source and code review must pass. Stop for missing authoritative names,
conflicting source mappings, forbidden-surface requirements or repeated unexplained
failures. Do not repair data under this presentation packet.

The exhaustive 188-week display-name enumeration and before/after simulation identity
proof remain required; local lookup tests alone cannot close that acceptance. Root owns
those integrated runs and will record exact inputs, commands, expected cost and stopping
rule before launch. No worker starts a duplicate campaign or updates a baseline.

## Integrated simulation proof — bounded execution

Question: do the presentation-only edits leave all eight baseline artifacts, simulation
fingerprints and consumed calibration inputs byte-identical to pre-amendment commit
`16389f6c9c66f13517806bae30ac78165563b66e`? Use Node v22.23.2 and unchanged dependencies.
PRE runs in clean detached checkout `F:/AWWV-worktrees/r7-readability-pre`; package and
lockfile match the implementation branch, and a node_modules junction reuses the installed
runtime without an installer. Data prerequisite check passed (`pre-data-prereqs.log`).

Bound: one PRE and two POST 188-week runs. PRE and POST-A command, with respective fixed
output roots `F:/A-War-Without-Victory/logs/r7-english-readability/pre-188w` and `post-188w`:
`node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 188 --full-replay-save-sequence --out <root>`.
Set process-local `AWWV_S6_GRADE_RUN=true` for clean start-time provenance. Do not use
`--map`, `--unique`, or timing output. POST-B is the required `npm.cmd run test:baselines`
and supplies the second independent final run, avoiding an unnecessary fourth campaign.
Compare the eight baseline artifacts and consumed-input hashes in stable path order;
Git revision provenance is expected to identify different commits, never silently scrubbed.
The full replay enables exhaustive display-name enumeration over the run.

Expected cost: 20–40 minutes per run; run PRE alongside independent UI work, and POST only
from the final clean reviewed implementation commit. Pass: complete 188 weeks, baseline
gate exit 0, identical simulation artifact hashes and inputs, complete name coverage.
Stop acceptance on unexplained drift, missing names, or incomplete runs; do not refresh
baselines, alter calibration, relax thresholds, or launch extra campaigns to seek green.
Logs and artifacts stay under the existing R7 log directory; baseline runner's existing
`data/derived/scenario/_baseline_tmp` output is retained and cited separately.

Control setup correction: the first launch was stopped at the opening turns because this note was accidentally appended in the PRE checkout. The note was moved here and that exact edit restored. Preserve pre-188w.log as INVALID (interrupted exit 1); the clean restart uses pre-188w-clean output and log. No completed campaign was repeated.

Phase 2 implementation checkpoint: independent Historian/code/determinism review is GO
(`phase2-review.log`) after one targeted correction. The municipality lookup now fails
closed to `—` when canonical properties are missing, instead of guessing ASCII names.
The final focused correction suite passes 5 files/90 tests (`phase2-review-green.log`,
exit 0). Typecheck (`phase2-typecheck.log`) and map build (`phase2-map-build.log`, 25.74s)
pass, exit 0. Full UI validation remains pending; no integrated acceptance is claimed.

## Phase 3 bounded validation plan

Question: do the nine listed layout fixes make existing English text legible without
changing content, actions, column position, grid templates or room art? Keep one production
file per commit (paired items in the same file share that commit), with independent
Code Review/QA and relevant focused tests. Root owns live browser evidence; the implementer
owns the specified CSS and receipt dismissal changes. Preserve the pre-layout capture at
`logs/r7-english-readability/visual-before/desk.png` (1920x1080, rbih_w68 fixture).

Commands: focused Vitest files for each component, typecheck and mandatory commit hook;
full `npm.cmd run test:vitest -- tests/ui` after the phase; browser geometry and screenshots
at 1920x1080, 1366x768, 3440x1440. Measure sibling rectangles/single-line heights and content
containment, expanded HQ grid row placement, visible scroll fades and whiteboard/date
occlusion. No scrollWidth-only acceptance. Estimated cost: focused checks seconds/minutes,
full UI about 10 minutes, live inspection roughly 15–30 minutes. Stop if the whiteboard
requires moving the column or changing art, if geometry remains ambiguous, or if a fix
changes player truth. Preserve failed receipts and perform targeted correction verification.

Phase 3.9 feasibility review identified an acceptance conflict: the existing header already
covers the upper whiteboard at 1920x1080; changing only the header-to-packet gap can reveal
the complete date but cannot reveal the entire board. Owner clarification requested:
accept the complete date with no clipped characters, or keep 3.9 blocked. Do not silently
substitute date visibility for full-board acceptance. Other Phase 3 items remain authorized.

## R7 Phase 2 implementation closeout — 2026-09-09

Chronicle battle titles now use the existing canonical OSID display-name map. Formation
home municipalities use a deterministic lookup from the existing map properties, with `—`
for missing authoritative data. Existing operation-suffix handling is retained and protected
by an authored-number regression. No identifiers, simulation, saves, inputs or dependencies
changed. All 712 scored names and 110 municipality mappings have executable source invariants.

Independent Historian/code/determinism review is GO after one fallback correction
(`logs/r7-english-readability/phase2-review.log`). Focused correction: 5 files/90 tests,
exit 0. Full UI gate: 345 files/2,944 tests, exit 0, 610.71s (`phase2-ui.log`). Typecheck,
map build and diff check pass, exit 0 (`phase2-typecheck.log`, `phase2-map-build.log`,
`phase2-diff-check.log`). Mandatory commit hook receipt: `phase2-commit.log`.
The exhaustive 188-week enumeration and final simulation/visual gates remain required;
this is the implementation checkpoint, not final amendment acceptance. Phase 3 follows.

PRE control completed 188 weeks, exit 0 (`pre-188w-clean.log`), final_state_hash
`e414dc69f6e875fc`; start provenance confirms clean commit `16389f6c9`.
A read-only SHA256 comparison to the committed baseline manifest found 6/8 mismatches
(`pre-baseline-hashes.json`); formation_delta and watched_operations match. This mismatch
exists before all amendment source changes. Preserve the manifest and artifacts; final
baseline acceptance remains unmet. Continue authorized presentation work and compare POST
against this clean PRE; do not refresh baselines or silently waive the required gate.

Toolbar finding-1 gap is now CLOSED with FULL coverage: the existing verifier loaded
`tmp_gui_observation/pitch_saves/rbih_w68.json` on the owned Vite server at port 3247.
`node tools/ui/verify_toolbar_fit.mjs --save tmp_gui_observation/pitch_saves/rbih_w68.json --url http://127.0.0.1:3247 --out logs/r7-english-readability/toolbar-fit`
passed exit 0 at 1920, 1600, 1440, 1400, 1366 and 1280px, with REVIEWS, RESERVE and TENSIONS
present at every width and no start-side overflow, crest collision or wrapping.
Receipt: `toolbar-fit.log`; the toolbar production code is unchanged by this amendment.
Before-layout desk images for all three factions and all three required viewports passed
capture (`desk-before.log`, exit 0); `desk-before/geometry.json` records actual card bounds
and overflowing scroll regions with maskImage=none before the fix.

## Phase 4 bounded validation plan

Question: do the four formatting tasks preserve numeric magnitude, missing-value truth,
and canon-required precision while consistently presenting briefing counts? Read the
sensitive-history gate §3 ask-mode and §4 Cost Ledger constraints; leave their exact costs
and civilian integer counts unchanged. Use existing formatters, with only the required
million branch addition; no state/data changes or new format framework.
Focused tests cover 999/1000/999999/1000000/1211000, consistent same-number casualty text
in WarSummaryContent, and affected aftermath/personnel callers. Then full UI tests,
typecheck, independent Modern Wargame review and mandatory hook. Cost: focused minutes,
UI approximately 10 minutes; reuse integrated screenshot matrix for the same-frame proof.
Stop if displayed magnitude changes, canon precision is reduced, or unknown data becomes
zero. Root retains full-suite, visual and commit ownership; no additional scenario run.

## Phase 5 bounded validation plan

Question: do the six component-copy tasks expose readable labels and truthful units while
preserving enum values, faction identity, numeric precision and all existing actions?
Reuse existing English catalog keys (including Phase 1's `warCost.findingSeverity.none`).
The named `formatFindingSeverity` helper is currently private in WarCostSummary.tsx;
assign its export and `none` mapping to item 5.1 so CinematicVerdict can reuse that exact
helper without a duplicate mapping or new formatting module. Existing record/grave/rupture
labels and the Cost Ledger's numbers/prose remain intact.

Focused tests render all severity values, assert RBiH casing plus absence of inherited
uppercase, require a visible locked sublabel, count density once and hide single subsegments,
and exercise week-only tenure. Browser evidence must check computed text-transform and
visible text, since textContent alone cannot detect CSS uppercase. Then full UI tests,
typecheck, independent Narrative/Modern Wargame review, and mandatory commit hooks.
Cost: focused minutes, full UI about 10 minutes; use the final three-resolution captures
for visual proof. Stop on a changed severity meaning, real name truncation, hidden cost,
or required engine/data changes. Group the two SectorsSection tasks in one file commit.

Phase 2 exhaustive run enumeration is GO: 188 completed frames, all three faction views,
712/712 replay OSIDs resolved, 466 formation locations resolved, 582 operation/history
inputs and 1,558 unique Chronicle player strings with no raw-token leak. Chronicle produces
1,326 deduplicated source-name corrections. Receipts: `phase2-display-name-enumeration.log`,
`.json` and `-run.log`. The initial 446 apparent misses were extractor artifacts caused by
`${from_osid}__${to_osid}` values; preserve the initial receipt and exact origin classification,
not R8 bug rows. Corrected parsing adds zero display-name bugs to the existing R8 register.

Phase 3 interim full UI gate passed 352 files/2,951 tests, exit 0, 605.77s
(`phase3-ui-final.log`). Browser review then caught Recommended text outside its own
clipping box despite fitting the outer cell: the first metric geometry PASS was invalid.
The correction reduces only MetricCell tracking from 0.14em to 0.08em, retaining grid,
font size and values. Focused RED/GREEN: `phase3-advance-spacing-red.log` / `-green.log`,
20 tests pass after correction. Final browser measurement waits for entry animation and
compares drawn text to the label's clipping box (`phase3-text-geometry-final.log`).
The next full UI run after Phase 4 must include this corrected source; the earlier pass
is not silently attributed to it. Phase 4 is independent and remains authorized while
Phase 3.9 awaits the owner decision.

Phase 3 review correction: the first Codex mask left its final citation within the 24px
fade even at maximum scroll. The targeted correction changes only section padding from
`py-2` to `pt-2 pb-6`, preserving its height limit, scroll behavior, content and mask.
`phase3-codex-padding-green.log` passes 20 tests, exit 0. At all three required viewports,
`codex-bottom-final.log` passes and the final text ends 3.5px above the fade start; before
measurement and screenshots remain in `codex-bottom-probe/`. The desk requires no padding
change: its last text already clears the fade because of child-card padding
(`desk-bottom-probe/bottom.json`). Independent review records the initial concern and
this targeted verification in `phase3-review.log`; the existing 3.9 owner question remains.

## Final integrated validation execution bound

Run against frozen reviewed presentation source. The final `npm.cmd run test:vitest`
includes the complete `tests/ui` boundary and supersedes a separate final UI-only run;
this avoids repeating the same ten-minute subset. The Phase 4 interim run completed
353 files with 2,960 passing tests and one civilian-precision RED failure introduced
during the run (`phase4-ui.log`, exit 1). Its targeted corrected run passes all 65 tests
and final typecheck is exit 0. Do not count the interim run as corrected-source acceptance.

Question: does the completed amendment preserve simulation bytes and all existing player
journeys while rendering the audited English surfaces at all three required resolutions?
Commands: `npm.cmd run test:vitest` (~31 minutes), `npm.cmd run canon:check`,
`npm.cmd run qa:player-experience` (nested typecheck, release check, runtime contracts,
player journeys, first-hour browser, live-surface browser; approximately 10–20 minutes),
the already declared POST-A 188-week CLI run and POST-B `npm.cmd run test:baselines`,
then `node tools/engine_health_gate.cjs <POST-A-run-dir> --horizon 188w --json`,
three-resolution screenshot/geometry checks, and `git diff --check`.
Use process-local Git Bash PATH precedence on Windows. The umbrella player-experience
receipt supplies its named nested gates; do not repeat passing nested commands unchanged.
Keep exact command, exit code and logs under `logs/r7-english-readability/final-*`.

Pass requires all named gates, complete visual evidence, no hidden cost/name/unit,
and identical PRE/POST-A/POST-B deterministic artifact and consumed-input hashes.
Stop on forbidden-surface requirements or unexplained drift; do not refresh a baseline,
start additional campaigns, or silently waive the known pre-existing manifest mismatch.
The pending whiteboard acceptance question remains separate and must be resolved by the
owner before claiming item 3.9. No push, merge, packaging or R9 work is part of this run.

Integrated command expansion: `canon:check` invokes the determinism static scan and,
when the manifest exists, the same `run_baseline_regression.ts` entry point as
`test:baselines`. Its already-running nested baseline regression is POST-B within the
fixed one-PRE/two-POST budget; do not launch a duplicate standalone baseline run. It
started on frozen reviewed presentation source while local presentation commits/docs
were pending, so preserve its actual commit/dirty provenance and do not describe it as
a clean-final-commit run. This is a deviation from the earlier clean-run preparation,
not a waived acceptance condition. POST-A still requires a clean reviewed checkout.
The final comparison must report exact deterministic bytes and consumed inputs, with
provenance differences separately visible. The known manifest mismatch may cause both
canon:check and its nested baseline gate to exit nonzero; record both accurately.

## Final regression correction and gate retry

The first integrated full suite exposed three stale recap expectations (`Unreported`
versus the approved `No staff report`) and one real avoidable non-null assertion in
Phase 5's subsegment display. The assertion is removed with optional access inside the
unchanged >1 guard; the inventory pin remains seven. Only the three recap text
expectations change, preserving all missing-data and quantity controls. Focused corrected
validation passes 133 tests, exit 0 (`final-regression-green.log`), and typecheck passes
(`final-regression-typecheck.log`). No simulation input, value or behavior changes.

Question for the required retry: does frozen corrected source pass the complete global
Vitest gate, including the entire UI boundary and the corrected global guards? After the
initial full run finishes collecting its failure set, run `npm.cmd run test:vitest` once
more with process-local Git Bash precedence, to `final-vitest-corrected.log` (~31 minutes).
This retry is required by the existing all-global-gates-pass acceptance after a real new
source/test failure; it replaces a separate ten-minute UI-only repeat. Preserve the first
full result and every RED receipt. Stop and diagnose any additional unexplained failure;
do not change a baseline, remove a check, or claim targeted tests alone close the global gate.
The player-experience umbrella already passed all six nested steps and its output scan;
this final assertion correction preserves the same guarded rendering behavior.

The completed first full run exits 1 with six real failing assertions across four files.
In addition to the four above, one old density assertion requires the duplicate removed
by 5.4, and the existing sector contrast guard catches 5.5's 70%-alpha prose. Measured
12px text over the actual panel background has only 3.674:1 contrast. Keep that guard;
restore the full secondary text color while retaining italics and no tabular numerals,
as permitted by 5.5. Correct the density expectation to exactly one occurrence while
preserving the front-segment/no-kilometer checks. Targeted tests, typecheck and actual
three-resolution color/contrast proof precede independent correction review and the
already required single corrected full-suite retry. This is an actual readability fix,
not a blanket test exemption. The log's deliberately failing child-process fixture is
the runner's passing positive control, not a seventh product failure.

Corrected sector verification passes 62 focused tests and typecheck, exit 0. The actual
three-resolution browser measurement now reports 5.991:1 contrast, italic prose without
tabular numerals, density once and no single-subsegment label at each viewport
(`final-regression-sector-contrast-capture.log`, exit 0). These targeted images supersede
the earlier lower-opacity sector target; the other unchanged integrated captures remain
valid for their stated routes and limitations.

## Reviewed execution checkpoint — acceptance still open

The final corrected `npm.cmd run test:vitest` passes, exit 0
(`final-vitest-corrected.log`): the five execution-group summaries total 13,562 passes and
31 skipped. This includes the complete UI boundary and all four formerly failing files.
All 77 inventoried source/test files retained their SHA-256 hashes throughout the gate
(`final-source-freeze-check.log`, exit 0). The final Phase 5 commit is `1bc1f7369`;
its mandatory hook passes (`phase5-contrast-amend.log`, exit 0). The player-experience
umbrella passes all nested gates and its output scan (`final-player-experience.log`, exit 0).
Independent review is GO for completed scope and targeted corrections (`final-review.log`).

Toolbar coverage is FULL at all six widths. Integrated and supplemental evidence covers
all three specified resolutions; the actual Cost Ledger target is now captured and
independently reviewed (`final-cost-ledger-*`), superseding the earlier wrong-route captures.
The designated report records exact command receipts, visual limitations, historical
failed/overwritten-log provenance and the existing bug/friction split. No duplicate report
or new R8 register was created. The owned visual server is stopped and port 3247 is clear.

Acceptance remains open. Whiteboard 3.9 still awaits the owner's criterion decision; the
reviewed Desk fade/test remain uncommitted to preserve the required one-file 3.7/3.9 commit.
Canon/embedded baseline remain exit 1 on six pins already mismatched in the clean PRE run.
PRE and POST-B match in all eight deterministic artifacts and consumed inputs, but POST-B
dirty provenance and the pending clean POST-A are not waived. Keep the fixed campaign
budget: POST-B already consumed the baseline slot; do not run a duplicate or refresh pins.
Next is the owner whiteboard/baseline disposition, then the final Desk commit and clean
POST-A if still required by that disposition. R7 broader closeout and R8/R9 stay gated.

### Baseline investigation result

The owner-authorized read-only investigation found all eight manifest hashes match retained
`n392` exactly. Clean n392 and clean R7 PRE both used Node 22.23.2, but four consumed inputs
differ: the 1993/1994/1995 event catalogs and `oob_brigades.json`. The last pin update is
`2c2aa72a8`, preceding later BC03/BC04/BC05 and honorific work. Weekly event evidence first
differs at week 54 (Ahmici now fires); battle records at 77; territory counts at 162.
The six mismatches include real state/output changes, not only names, whitespace or runtime
metadata. No claim assigns every downstream change to a single commit.

Original n392 provenance is `c2f6592ec`, not an ancestor of PRE; its source/data/package/runner
comparison to merged `2c2aa72a8` differs only in the subsequently updated manifest. Preserve
that distinction rather than substituting an invented Git lineage. The calibration authority
continues to bless n392 and requires BC settlement before final calibration adoption.
Investigation therefore does not authorize a pin refresh. The downstream unblock is accepted
calibration evidence and an explicit reconciliation decision; R7 PRE/POST-B identity and
the pending clean POST-A are separate presentation-neutrality evidence.
Receipts: `baseline-investigation.json`, `baseline-investigation-detailed.log` (exit 0),
`baseline-history.log`; no campaign, baseline, calibration or simulation modification.

Date-only continuation is independently BLOCKED within gap-only scope. Live glyph/card
intersections put RS/HRHB 1920 and all three 1366 dates inside the fixed header. RBiH
1920 is gap-feasible, RBiH/RS 3440 already avoid the cards, and HRHB 3440 was deliberately
left unmeasured after the stop condition. See `desk39-feasibility-summary.json`, its raw
run log and eight screenshots; the intentionally stopped process exit was not captured.
No 3.9 edit was made. Proceeding needs authorization to change header/date-label layout,
followed by all-faction/all-resolution verification. The existing Desk fade/test remain
unchanged and held; their latest applicable full boundary is `final-vitest-corrected.log`.

### Authorized layout execution receipts

The next owner continuation expands header/date layout scope as recorded in §1. The
starting preservation check (`desk39-layout-start-preservation.log`, exit 0) confirms all
77 prior source/test hashes unchanged. First root validation launches
`desk39-layout-{ui,typecheck,map-build}1.log` exit 1 before executing their npm scripts:
the cmd.exe wrapper rejected command quoting. Preserved retries invoke the same npm
scripts through Node 22's `node_modules/npm/bin/npm-cli.js`, with exact executable and
argument arrays in each receipt. `typecheck2` and `map-build2` exit 0. A later reviewed
header-shadow correction makes these interim checks; final source is frozen only after
the all-faction screenshot/scroll proof. No baseline or scenario run was launched by
these UI commands.

The accepted implementation translates the date-board parent, carrying its region clip
with it, and adds a single-line paper-backed label. The Desk column/header, map and artwork
remain unchanged; the original Desk fade is preserved. Focused final checks pass 48 tests,
and corrected browser attempt2 passes all nine initial/max-scroll cases. Attempt1 remains
explicitly invalidated because translated child rectangles did not prove painted visibility.
Final source is inventoried in `desk39-layout-final-freeze.json`; final typecheck3 and
map-build3 and the complete UI3 boundary pass, exit 0; independent source/image review is GO.

Documentation verification question: do the existing control docs retain truthful pending
gates and correct desktop/readability scope? Run `npm.cmd run test:vitest -- tests/docs_desktop_v09_truth.test.ts tests/docs_truth_no_skip_guard.test.ts tests/v092_playtest_package_docs.test.ts`
and `git diff --check` (seconds; pass all 13 existing tests and no whitespace errors).
Stop on false closure, baseline waiver or unrelated edits. Source commit hook and the final
POST-A evidence reconciliation remain separate required receipts.

Final source gate: `desk39-layout-ui3.log` passes 354 files/2,974 tests, exit 0;
typecheck3 and map-build3 pass, exit 0. `desk39-layout-freeze-check.log` confirms the three
reviewed hashes unchanged, no forbidden-surface change and 76 unaffected prior files; the
remaining prior file is the extended Desk test. Independent source/18-image review is GO
in `desk39-layout-review.log`. Documentation checks pass 13/13 in `desk39-layout-docs3.log`;
the two earlier roadmap-length failures remain preserved and the guard is unchanged.
The mandatory hook receipt will be `desk39-layout-commit1.log`; no hook pass is claimed
until that local commit succeeds. Clean POST-A and the inherited baseline gate remain open.

### Clean POST-A and final reconciliation

Reviewed source is committed locally as `88996a23d2441a391b25706c734626b5732e37b5`;
`desk39-layout-commit1.log` confirms mandatory hook/commit exit 0. Clean detached checkout
`F:/AWWV-worktrees/r7-readability-post-a` passes preflight: 31 consumed inputs match PRE,
package files match, Node is 22.23.2 and Git is clean. All original untracked evidence is
preserved in the owner checkout. No dependency installation occurred; retain the checkout
and its ignored node_modules junction.

POST-A completes 188 weeks, exit 0 (`desk39-layout-post-a-run1.log`). The required health
gate passes, exit 0 (`desk39-layout-post-a-health1.log`), with 667/712 matched OSIDs and
zero consistency failures. Existing comparison tooling passes all eight raw-byte artifacts
and all normalized consumed inputs across PRE/POST-A/POST-B, exit 0
(`desk39-layout-post-a-comparison1.log`, `final-simulation-comparison.json`). The separate
provenance/replay/final-save check passes, exit 0 (`desk39-layout-post-a-provenance1.log`/`.json`):
clean `88996a23d`, exactly 188 frames, full replay identical to PRE, and final-state SHA
`e414dc69f6e875fcd2a7394582921f20ca03123112baf12e9308c50035c29c50`.

The visual checkbox uses the previously reviewed unaffected integrated/supplemental captures
plus the new nine-case initial/max-scroll Desk proof; no unchanged browser campaign is
repeated. Zero R7 simulation drift is established, but baseline-pin acceptance is not:
the inherited six-pin gate still fails, and POST-B retains dirty provenance. The fixed
one-PRE/two-POST budget is consumed. Final calibration adoption after BC settlement and an
explicit pin-reconciliation decision remain under existing calibration authority. Do not
refresh pins, rerun baseline/canon wrappers, declare current behavior canonical or close R7.
No source changes follow the reviewed commit; final documentation and receipt reconciliation
use focused documentation checks and the mandatory local documentation hook only.

Final documentation checks pass 13/13 (`desk39-layout-final-docs1.log`, exit 0); reviewed
source hashes, clean POST-A checkout and diff checks pass (`desk39-layout-final-state1.log`,
exit 0). The targeted final confirmation uses the existing `desk39-layout-review.log`;
the local documentation-hook outcome is recorded in `desk39-layout-final-docs-commit1.log`.

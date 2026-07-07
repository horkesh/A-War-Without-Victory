# Presidential GUI Decision-Access Overhaul — Execution Plan (v2, fully developed)

**Date:** 2026-07-06 (v2 — developed to execution grade; supersedes the v1 draft of the same date)
**Status:** READY FOR EXECUTION — owner directed the analysis (2026-07-05), the plan (2026-07-06), and full development for dispatch to builder agents.
**Owner problem statement:** "Player does not easily have access to decisions and information. Instead of being president, he is buried in huge windows with bunch of data, much of it repeating."
**Scope class:** UI-layer only (`src/ui/**`) + one audio-preferences default + process protocol. No sim, scenario, event JSON, save-schema, or canon changes anywhere in this plan.
**Roadmap authority:** The active road is D2 owner playthrough → D3 → D4 → 1.0. This plan is the owner-directed runway TO a meaningful D2 (WP-9 re-couples it). It satisfies the "no lane ahead of D2 without a new owner directive" rule.

---

## How to use this document (orchestrator instructions)

- Each Work Packet (WP) below is **self-contained**: verified anatomy with `file:line` citations, numbered steps, exact test commands, acceptance criteria, and a copy-paste **DISPATCH PROMPT**.
- Every dispatch prompt must be sent **together with Part A (Common Rails) verbatim**. Do not paraphrase the rails.
- Packets were specified against code read on 2026-07-05/06 at the then-current `main`. Every packet starts with a **PREMISE CHECK** step; if the premise no longer holds, the builder STOPS and reports instead of improvising (verify-the-premise discipline — it already corrected three stale claims during planning, see Part B).
- One packet = one PR. Never bundle packets. WP-1 and WP-2 may share a session but not a commit.
- Dispatch mode per the stall-pattern lesson: WP-5/WP-6 are small enough to build directly in the orchestrator session; WP-1/WP-2/WP-3/WP-4/WP-7 are worktree-builder sized; WP-8 is direct + asset-gated; WP-9 is owner process.

---

## Part A — COMMON RAILS (include verbatim in every dispatch prompt)

```
RAILS (non-negotiable):

READ FIRST, in this order, before any edit:
1. F:/A-War-Without-Victory/CLAUDE.md
2. F:/A-War-Without-Victory/docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md (your packet section ONLY, plus Part A/B)
3. Every file your packet lists under "Files in play" — read the actual current code; the packet's line numbers are a map, not gospel.

PREMISE CHECK: your packet lists verified premises. Re-verify each with a grep/read
before building. If any premise is false, STOP, report the mismatch, do not improvise.

SCOPE FENCE:
- You may edit ONLY files under src/ui/**, tests/**, and the docs files your packet names.
- FORBIDDEN: any file under src/sim/**, src/scenario/**, src/state/**, src/cli/**,
  tools/scenario_runner/**, data/**, docs/10_canon/**. If your change seems to need one,
  STOP and report.
- No new dependencies. No Math.random(), Date.now(), new Date() without args, or timestamps.
  All new list orderings use explicit, stable comparators (sort by stable string id last).
- All new player-visible copy goes through t('...') with keys added to BOTH
  src/ui/map/i18n/messages.en.ts AND messages.bcs.ts (CI enforces parity). When you delete
  copy, delete its keys from BOTH files. BCS translations: plain, sober register; if unsure,
  mirror the tone of neighboring keys.
- Player-visible copy NEVER contains raw ids, OSIDs, turn numbers (use dates), file paths,
  or internal vocabulary (handoff, lens, loop, dossier-count, read-model, adapter).
- Honest-absence rule is inviolable: never render a missing value as 0, '--' meaning zero,
  or any invented number. Omission or explicit unreported copy only, per your packet.

TESTS:
- TDD: write the packet's NEW contract test first, watch it fail (paste the red output),
  then build, then watch it pass (paste the green output).
- You MUST run the FULL relevant suite, not only your new file:
    grep -l "<HostComponentName>" tests/ -r   (do this for EVERY component you touched)
  and run every hit. A change to a shared render surface that only runs its own test file
  is the #1 recurring failure in this repo (3 CI-red round-trips in one 48h window).
- Test command form (Windows, this repo):
    npx.cmd vitest run <files> --pool=forks --reporter=dot
- Never run desktop:map:build concurrently with vitest. If a run is contaminated by the
  vite temp-file race, re-run EVERY distinct failed file in isolation - never extrapolate
  from one.

GATE (all must pass before you open a PR; paste outputs as evidence):
1. npm.cmd run typecheck            (tsc --noEmit)
2. full grep-derived vitest suites for every touched component + your new tests
3. npm.cmd run desktop:map:build
4. npm.cmd run qa:player-experience  (self-scanning wrapper: release build, Electron runtime
   contracts, 45-file player-journey gate, first-hour browser gate, live-surface sweep,
   output scan)
5. git diff --check
Report results honestly. A failing gate is a report, not a thing to explain away.

EVIDENCE: your final message must include: files changed with line counts, red/green test
proof, gate outputs, and the exact acceptance-criteria checklist from your packet with
each item marked MET/NOT-MET. Screenshot evidence paths from the qa sweep where the packet
asks for them.

DOCS: append a PROJECT_LEDGER.md entry (behavioral UI change format: what changed,
verification, determinism/scope boundary) and add your packet's row to
docs/40_reports/GUI_MASTER.md. Do not touch any other master doc unless your packet says so.
```

---

## Part B — Verified anatomy and premise corrections (read before dispatching)

Everything below was verified by reading code on 2026-07-05/06. Three prior-doc claims were found **stale** — builders must trust this section and their own reads over older docs.

### B1. Decision Room (WP-1 target)

`src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` (745 lines). Render order in the main component (`PresidentialDecisionRoomPanel`, line 492+):

| Section | Lines (approx) | Gated by | Screenshot label |
|---|---|---|---|
| Header: title + `showAdvanced` toggle + advance-readiness chip | 584–610 | always | "Decision Room" header |
| Metric tiles `MetricCell` ×5 + loop steps `ProductLoopStep` ×8 | 612–633 | `showAdvanced` | "ADVANCED REVIEW" + "DECISION LOOP" |
| `NextOrderCard` ×≤3 (`view.nextOrders`) | 635–644 | **always** | "WHAT'S EXPECTED OF ME?" |
| `CommandQuestionLane` ×≤5 (`view.commandQuestions`) | 646–655 | **always** | "PRIORITY LANES" |
| Lens strip `LensButton` | 657–668 | `showAdvanced` | category tabs |
| Card list `PriorityCard` — **capped `slice(0, showAdvanced ? 7 : 4)`** | 564, 670–685 | always | the actual decisions |
| Aside: `PriorityDossier` (hosts the ONLY `<DirectiveCard>` instance, line 416) | 687–696 | always | "PRIORITY DOSSIER" |
| Aside: `CompactLink` inspect-next + `SourceHandoffLink` lists | 698–726 | `showAdvanced` | "INSPECT" lists |
| Aside: review-before-advance `CompactLink` list | 728–739 | **always** | duplicate of advance-sensitive cards |

Two structural bugs to internalize:
- **The deep-link effect (lines 508–516) sets `showAdvanced=true`** for any non-`all` lens request — so entering from a Desk category card lands the player in the meta-heavy view. That is why the QA screenshots show the worst layout.
- **The card list is hard-capped at 4 (7 advanced) with no overflow affordance** — items beyond the cap are silently invisible in the list (only reachable via lenses).

Read-model: `src/ui/map/data/presidentialDecisionRoom.ts` (~2,300 lines). `buildPresidentialDecisionRoomView` (line 2226) returns `PresidentialDecisionRoomView` (line 315) with fields `cards`, `lenses`, `metrics`, `loopSteps`, `nextOrders`, `commandQuestions`, `sourceHandoffs`, `inspectNext`, `advanceReadiness`, `activeDossier`, `emptyState`, `hasPlayerFaction`. Known external consumers to check before deleting any field: `presidentialCategories.ts`, `warroom/CommandCard.tsx` / `CommandCardStrip`, `PresidentDeskShell`, `warroomPriorityDocket.ts`, `preAdvanceCommandReview.ts`, plus tests.

### B2. Advance / aftermath flow (WP-2 target)

- `PresidentialToolbar.tsx:172-191` — **a quiet fast path already exists on the map toolbar**: when `preAdvanceReview.status !== 'blocked'`, the Advance button calls `advanceTurnAndSync` directly, no modal. The modal opens only when blocked (`setAdvanceTurnPending(true)`).
- `utils/shellNavigation.ts:205-207` — the Warroom wall-calendar route sets `advanceTurnPending=true` **unconditionally** → `AdvanceTurnModal` renders every time from the Warroom, blocked or not.
- `desktop/orderActions.ts` `advanceTurnAndSync` (lines ~51-78) — after a successful advance it builds `buildTurnAftermathView(...)` and, if non-null, calls `setTurnAftermathOpen(true)` **unconditionally** (lines 70-73). This is the every-turn modal ceremony.
- Blocker truth: `data/presidentialBlockers.ts` (`derivePresidentialBlockers`) and `data/preAdvanceCommandReview.ts` (`buildPreAdvanceCommandReviewView`). **Neither may change in this plan.**

### B3. Map panel rails (WP-4 target)

`src/ui/map/components/panelRail.ts` — `derivePanelRailState` (line 100) returns `{primary, secondary}`; parent renders as PRIMARY and leaf as SECONDARY (e.g. `sector` + `formation`, lines 110-118). App renders both rails: `App.tsx:1713-1727`. Secondary style anchors at `right: 25.5rem` (panelRail.ts:66-73) — that is the screenshot's triple-stack. Panels register as counter occluders via `data-awwv-counter-occluder` (see 2026-07-05 ledger entries); fewer panels ⇒ fewer occluders, for free.

### B4. Levers / convergence — **PREMISE CORRECTION (stale doc)**

The 2026-06-08 status note in `docs/plans/2026-06-01-presidential-command-surface-design.md` ("Army-HQ lever buttons are ALL still live... convergence did NOT happen") is **STALE**. Verified 2026-07-06:
- `<DirectiveCard>` is instantiated in exactly ONE place: `PresidentialDecisionRoomPanel.tsx:416`.
- `OperationsSection.tsx` (:721, :813), `CommanderSection.tsx` (:6), `AutonomyPanel.tsx` (:11, :84, :277, :357, :502), `OperationBriefingModal.tsx` (:352, :537) all carry code + comments stating levers are issued ONLY from the Decision Room; their own IPC lever calls are gone.
- Remaining lever-IPC call sites outside `DirectiveCard.tsx`: `ArmyReservePanel.tsx:155` (`handleApprove` → `approveReserveRequest`) and `ReserveRequestModal.tsx:68` (`approveReserveRequest`) — contradicting ArmyReservePanel's own comment (:125-129) that approve is Decision-Room-only. WP-5 resolves exactly this residue.

### B5. Archives (WP-6 target)

`DecisionHistoryOverlay` is still a top-level overlay: imported `App.tsx:57`, open/toggle handlers `App.tsx:1096-1161` (including keyboard-shortcut paths), mounted `App.tsx:1823`. Records-side destination already exists (Army HQ → Records → Decision Consequences; see GUI_MASTER rows `20260606_DECISION_CONSEQUENCE_RECORD_FOCUS`, `20260605_RECORDS_ROUTE_COHESION`). Operation History / Opportunity Ledger already live inside Army HQ Records.

### B6. Numbers (WP-7 target)

- `utils/combatEffectiveness.ts` — single owner of the effectiveness math; returns `EffectivenessBreakdown` incl. `value`, `modifiers`, `missingFields`; header comment: "Typical brigade: 300-1500". Consumers: `CorpsDetail.tsx:311` (renders `t('corpsDetail.combatEff')` = "Combat Eff." + raw aggregate — the "3,572 A" in screenshot 22), `FormationDetail.tsx:685-703` (raw `value` — the red "174"), `ArmyHQCorpsCard.tsx`, `ArmyHQModal.tsx`.
- Army HQ duplicate: `ArmyHQModal.tsx` renders a corps "Command Access" strip AND full corps cards with the same stats on one screen (screenshot 08).

### B7. Audio — **PREMISE CORRECTION (cheapest win in the plan)**

A complete audio stack already ships: `src/ui/map/audio/{audio_engine,audioAssets,audio_event_adapter,audio_preferences,sound_manifest}.ts` + 17 `.ogg` cues (`turn_advance`, `battle`, `event_critical`, `ui_open`...). The game is silent because `audio_preferences.ts:20` sets `DEFAULT_AUDIO_PREFERENCES = { muted: true, ... }`. WP-8 is one default flip + ambient beds.

### B8. "Unreported" surface (WP-3 target)

68 occurrences of `nreported` in `messages.en.ts` alone (≈60+ distinct keys across `forceReadiness.*`, `armyHqCorps.*`, `orbat.*`, `operationsSection.*`, `formationDetail.*`, `corpsCard.*`, `sectorsSection.*`, `corpsFront.*`, `strategicPosition.*`, `armyReserve.*`, `personnel.*`, `oob.*`, tooltips). Screenshots 22–24 show the own-force cluster: Sector Intelligence header (CORPS STANCE / OPERATIONAL SECURITY / CONFIDENCE all UNREPORTED), Combat Power Assessment (Offensive Power / Defense per Front Segment "Unreported"), supply priority, "Posture pending".

---

## Part C — Work packets

---

### WP-1 — Flatten the Decision Room to cards + dossier

> **STATUS 2026-07-06: IMPLEMENTED + gate-green** — see PROJECT_LEDGER `2026-07-06 - WP-1 Decision Room flattened to cards plus dossier` (flat card list + dossier, cap removed, deep-link trap removed, advance-sensitive badge, read-model pruning with consumer table; 34 files / 473 grep-derived tests + full `qa:player-experience`). Commit 0 below is ABSORBED by that implementation. Retained here as the spec of record; do not re-execute.

**Objective:** The Decision Room shows a prioritized list of decision cards and one dossier. All meta-scaffolding (metrics, loop steps, next-orders, command-question lanes, inspect/handoff asides, duplicate advance list, the advanced toggle, the 4-card cap) is deleted.

**Files in play:** `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` (primary), `src/ui/map/data/presidentialDecisionRoom.ts` (second commit only), `src/ui/map/utils/decisionRoomLensRequest.ts` (read), `src/ui/map/i18n/messages.en.ts` + `messages.bcs.ts`, tests.

**Verified premises (re-check):** section anatomy per Part B1; `<DirectiveCard>` instantiated only at line 416; card cap at line 564; deep-link `setShowAdvanced(true)` at lines 508-516.

**Steps (commit 0 — hotfix grade, land first even if the rest of WP-1 waits):**
0. Two surgical deletions identified in the 2026-07-06 release review as the highest-damage lines on the surface: (a) remove the card cap at line 564 (`mainCards = filteredCards.slice(0, showAdvanced ? 7 : 4)` → render all `filteredCards`; the panel column scrolls) — a pending decision beyond the 4th is currently INVISIBLE with no overflow affordance; (b) in the deep-link effect (lines 508-516), delete the `setShowAdvanced(true)` line — Desk category cards must not dump the player into the meta-heavy advanced view. Both are strict subsets of commits 1's full flatten; if commit 0 ships separately, commits 1-2 rebase over it trivially.

**Steps (commit 1 — panel):**
1. Delete `showAdvanced` state, its toggle button (lines 590-605), and every `showAdvanced &&` block: metric tiles + loop steps (612-633), lens-strip gate (render the lens strip ALWAYS instead), inspect-next aside (698-711), source-handoffs aside (713-726).
2. Delete the `nextOrders` block (635-644) and `commandQuestions` block (646-655) and their card components (`NextOrderCard`, `CommandQuestionLane`, `ProductLoopStep`, `MetricCell`, `SourceHandoffLink`) once unreferenced.
3. Delete the separate "review before advance" `CompactLink` list (728-739). Replace with a per-card badge: any card whose id appears in `view.advanceReadiness.items` renders an `ADVANCE-SENSITIVE` chip (new i18n key, e.g. `decisionRoom.advanceSensitiveBadge`). Keep the advance-readiness headline chip in the header (606-608) — it is the one legitimate summary.
4. Remove the card cap: render ALL `filteredCards` in the main column; the column scrolls (`overflow-y-auto` with the panel's existing height bounds). Cards stay compact (`PriorityCard` as-is is fine).
5. Lens strip: always visible, one row, `all` first, category lenses after; keep counts + urgent pips on the lens buttons (they are now the ONLY counters on the surface).
6. Deep-link effect: keep lens/category/cardId focus behavior; delete the `setShowAdvanced(true)` line.
7. Layout: keep the two-column grid (cards left, dossier right). On narrow widths the dossier stacks below — verify the existing responsive classes still hold.
8. Copy pass within the panel: subtitle (`decisionRoom.subtitle`) becomes plain staff voice, e.g. EN "Decisions awaiting the President." Remove/replace any key whose EN copy contains "handoff", "loop", "lens", "inspection" from the VISIBLE panel (key deletions from both locale files; keys still used by other surfaces stay).

**Steps (commit 2 — read-model pruning, only after commit 1 is green):**
9. For each now-unrendered view field (`metrics`, `loopSteps`, `nextOrders`, `commandQuestions`, `sourceHandoffs`, `inspectNext`): grep consumers across `src/`, `tests/`, `tools/`. Delete field + builder code ONLY at zero non-test consumers; update/delete its tests. If `warroomPriorityDocket.ts`, `preAdvanceCommandReview.ts`, Desk, or CommandCard strip consume a field, LEAVE IT (data reuse is fine; only the Decision Room rendering dies). Report the consumer table in your evidence.

**Out of scope:** DirectiveCard internals; `presidentialBlockers`/`preAdvanceCommandReview`; Desk category cards (they keep deep-linking, now into the flat view).

**Tests:**
- NEW (write first): `tests/ui/decision_room_flat_contract.test.ts` —
  a. fixture with 6 cards (2 urgent, 1 advance-sensitive) ⇒ renders exactly 6 `decision-room-priority-card-*` nodes, ordered urgent-first then stable by id; zero nodes matching loop-step/next-order/command-question/metric testids or their removed i18n strings;
  b. the first card is rendered before (DOM order) any dossier/aside content;
  c. advance-sensitive card carries the badge; header advance chip present;
  d. deep-link request with `{lens: 'opportunity', cardId}` ⇒ lens active + card focused, and no advanced-mode artifacts exist to reveal;
  e. fixture with 0 cards ⇒ `view.emptyState` copy and nothing else.
- Run FULL existing suites: `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui/presidential_decision_room_panel_i18n.test.ts tests/ui/decision_room_review_proposal.test.ts tests/ui/directive_card_stop_op_action.test.ts tests/ui/decision_room_stop_op_executing.test.ts --pool=forks --reporter=dot` PLUS every other hit of `grep -rl "DecisionRoom\|decision_room\|decisionRoom" tests/`. Expect existing assertions on deleted chrome to go red — rewrite them to the flat contract in this PR; do not skip/disable.

**Acceptance criteria:**
- [ ] With exactly 1 pending item, that item's card is the first interactive element and fully visible without scrolling at 1280×800 and 1920×1080 (verify in the qa sweep screenshots; name the files).
- [ ] The item's title appears at most twice on the surface (card + dossier).
- [ ] No visible copy contains: handoff, lens, loop, dossier count, "what's expected".
- [ ] N pending items ⇒ N cards rendered (no cap).
- [ ] All 5 levers still issuable via dossier DirectiveCard (run the directive suites).

**DISPATCH PROMPT (WP-1):**
```
You are a UI builder on AWWV. Execute Work Packet WP-1 (Flatten the Decision Room) from
docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md. Read Part A
(rails), Part B1 (anatomy), and the WP-1 section in full; follow the steps and commit
split exactly (commit 1 = panel flatten, commit 2 = read-model pruning with consumer
table). Write the new contract test FIRST (red proof), then build. Rewrite displaced
assertions in existing Decision Room suites in the same PR - never skip them. Deliver
the WP-1 acceptance checklist item-by-item with evidence, including qa sweep screenshot
filenames showing the flat Decision Room.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-2 — Quiet-turn one-click advance + aftermath digest

**Objective:** A turn with nothing required of the President costs one click and produces a digest line, not two modals. Loud turns keep the full ceremony.

**Files in play:** `src/ui/map/desktop/orderActions.ts`, `src/ui/map/data/turnAftermath.ts`, `src/ui/map/store/gameStore.ts` (one new UI flag), `src/ui/map/utils/shellNavigation.ts`, `src/ui/map/components/warroom/AdvanceTurnModal.tsx` (minor), `src/ui/map/components/TurnAftermathModal.tsx` (minor), `src/ui/map/components/BottomStatusStrip.tsx` (digest host), i18n, tests.

**Verified premises (re-check):** toolbar fast path exists (`PresidentialToolbar.tsx:172-191`); Warroom calendar sets `advanceTurnPending` unconditionally (`shellNavigation.ts:205-207`); aftermath modal opens unconditionally (`orderActions.ts:70-73`).

**Steps:**
1. In `data/turnAftermath.ts` add `export function classifyTurnAftermathWeight(view: TurnAftermathView): 'quiet' | 'heavy'`. Enumerate the actual `TurnAftermathView` fields (read the type first) and classify HEAVY if ANY of: pending player-required action/blocker surfaced in the view; any §6/rupture/atrocity-class entry; any battle/territory entry involving the player faction; any peace-plan/Dayton/patron/convoy item; any casualty or displacement beat scoped to the player faction; any field you cannot confidently classify (**default-to-heavy on unknown — pin this in a test**). Otherwise QUIET. Pure function, deterministic, no state reads.
2. In `advanceTurnAndSync` (orderActions.ts): after building `aftermath`, call the classifier. HEAVY ⇒ current behavior. QUIET ⇒ `setTurnAftermath(aftermath)` + set a new store flag `turnAftermathDigest: { headline: string } | null` (one authored-sentence digest derived from the view; new i18n key family `aftermath.digest.*`) and do NOT open the modal.
3. Digest surface: `BottomStatusStrip` renders the digest line with a `Review` affordance that opens the retained full `TurnAftermathModal` on demand; the digest clears on next advance or dismissal. Keep it one line; no counts-dashboard.
4. Warroom calendar parity: in `shellNavigation.ts` advance handling, mirror the toolbar's gate — if `buildPreAdvanceCommandReviewView(...).status !== 'blocked'`, advance directly (same `advanceTurnAndSync` deps); only set `advanceTurnPending=true` when blocked. Keep an explicit secondary "Review before advancing" affordance available from the Warroom (the calendar hover/long-affordance or the existing Advance Clearance desk button) so a player can ALWAYS opt into the review modal.
5. Do NOT modify `derivePresidentialBlockers` or `buildPreAdvanceCommandReviewView` logic. Do not touch the Chronicle turn-record filing path (verify the digest does not double-file; the aftermath view itself already files what it files).

**Out of scope:** the content of TurnAftermathModal; blocker derivation; sim advance IPC.

**Tests:**
- NEW (first): `tests/ui/turn_aftermath_quiet_digest.test.ts` — classifier unit tests (quiet fixture, each heavy trigger, unknown-field ⇒ heavy) + integration: quiet advance ⇒ no `setTurnAftermathOpen(true)`, digest flag set, Review opens modal with the retained view; heavy advance ⇒ modal opens exactly as today.
- NEW: warroom advance parity test — unblocked state + calendar advance ⇒ no AdvanceTurnModal, turn advanced; blocked state ⇒ modal, and a required decision can never be bypassed (assert through `derivePresidentialBlockers` fixtures for convoy/peace/event-required families).
- Run full: every `grep -rl "AdvanceTurnModal\|advanceTurnAndSync\|TurnAftermath\|advance_turn\|preAdvance" tests/` hit, incl. `tests/ui/advance_turn_button_gated_feedback.test.ts`.

**Acceptance criteria:**
- [ ] Quiet fixture: advance = 1 click from both toolbar and Warroom calendar; no modal; digest visible; full report reachable via Review.
- [ ] Heavy/blocked fixtures: identical behavior to today (modal, blockers, ESC-gating).
- [ ] Classifier defaults to heavy on unrecognized content (test-pinned).
- [ ] No change to blocker/pre-advance modules (git diff proves).

**DISPATCH PROMPT (WP-2):**
```
You are a UI builder on AWWV. Execute WP-2 (Quiet-turn advance + aftermath digest) from
docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md. Read Part A,
Part B2, and WP-2 fully. Start by reading data/turnAftermath.ts and enumerating
TurnAftermathView's fields; your classifier must cover every field explicitly and
default unknown content to 'heavy' (test-pinned). Blocker modules are read-only.
Red-first tests, full grep-derived suites, full gate, WP-2 checklist with evidence.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-3 — Own-force "Unreported" presentation cleanup

**Objective:** Keep the honest-absence DATA discipline untouched; change the PRESENTATION for player-owned entities from per-field "Unreported" labels to omitted rows + one diegetic panel notice. Enemy-intel fog presentation unchanged.

**Files in play (priority-5 surfaces this packet; nothing else):** `CorpsFrontPanel.tsx` (Sector Intelligence header + Combat Power Assessment + logistics), `FormationDetail.tsx` (overview), `CorpsDetail.tsx`, `OOBSidebar.tsx`, `army_hq/ForceReadiness.tsx` + `army_hq/OrbatSection.tsx`. Plus one new shared component + i18n + tests + a findings note.

**Verified premises (re-check):** 68 `nreported` hits in `messages.en.ts` (Part B8); screenshot clusters on own-force turn-0 surfaces; napkin's ~30 unreported rules govern the read-model layer (which this packet must NOT touch).

**Steps:**
1. **Inventory first (commit 0, docs-only):** grep all `nreported` i18n keys + their render sites; produce `docs/40_reports/working/20260706_unreported_surface_triage.md` — one row per render site: file:line, key, entity ownership (OWN-FORCE / ENEMY-INTEL / NEUTRAL-SYSTEM), disposition (OMIT+NOTICE this packet / KEEP label / FOLLOW-UP packet). This table is the contract for step 3 and for the follow-up packet covering remaining surfaces.
2. New shared component `src/ui/map/components/OwnForceReportGapNotice.tsx`: given a list of omitted field labels, renders ONE line — EN: "Staff returns incomplete — {fields} expected in a coming briefing." (new keys `reportGap.notice`, `reportGap.fieldSeparator`; cap the visible list at 3 fields + "and N more"). Neutral styling, `data-awwv-report-gap` attribute carrying the full machine list for tests.
3. In the 5 surfaces, for OWN-FORCE fields only (player faction owns the entity): when the read-model reports absence, omit the field row entirely and register its label with the panel's gap notice (rendered once, at the section bottom). Explicit reported zero still renders `0`. Enemy-intel and cross-faction rows: untouched. Keep provenance in `data-awwv-reported="false"`-style attributes where tests need it.
4. "Posture pending" (FormationDetail) → key `formationDetail.postureAwaitingOrder`, EN "Awaiting first posture order".
5. **Read-only companion (same PR, docs only):** trace WHY corps stance / operational security / confidence / supply priority are absent at turn 0 for the player's own corps — from the rendering component through the adapter/read-model to the state field. Write findings (field names, where the sim would write them, whether a staff-report default is plausible) into the triage doc. DO NOT fix in sim — flag as a candidate sim lane for the orchestrator.

**Out of scope:** any adapter/read-model logic change (presentation only); the other ~10 surfaces with unreported copy (follow-up packet uses the same pattern + the triage table); enemy fog.

**Tests:**
- NEW (first): `tests/ui/own_force_report_gap.test.ts` — turn-0-like own-corps fixture ⇒ (a) zero visible strings matching `/[Uu]nreported/` within the 5 surfaces' own-force sections; (b) gap notice present listing the omitted fields; (c) a fixture field with explicit `0` renders `0`; (d) an enemy-contact fixture still renders its redacted/unreported copy verbatim.
- Run full: every `grep -rl "nreported" tests/` hit + full suites of the 5 touched components (grep by component name). Update own-force assertions; enemy-intel assertions must remain and pass unchanged.

**Acceptance criteria:**
- [ ] qa sweep turn-0 screenshots of Sector Intelligence + Formation Detail (own corps) show zero "Unreported" labels and no invented values; notice line present.
- [ ] Enemy-intel surfaces byte-identical in rendered copy (their tests untouched and green).
- [ ] Triage table filed and complete for ALL 68 key-sites (disposition column filled).
- [ ] No `src/ui/map/data/*` read-model file in the diff.

**DISPATCH PROMPT (WP-3):**
```
You are a UI builder on AWWV. Execute WP-3 (Own-force Unreported presentation) from
docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md. Read Part A,
Part B8, WP-3. The honest-absence rule is inviolable: you are changing PRESENTATION
(omit + one notice) for OWN-FORCE fields on 5 named surfaces only; read-models, enemy
fog, and all other surfaces are out of scope. Commit 0 is the triage table - build it
before touching any component. Red-first tests, full grep-derived suites incl. every
test file containing "nreported", full gate, WP-3 checklist with evidence.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-4 — One detail panel on the map (breadcrumb instead of second rail)

**Objective:** At most one detail panel is open on the tactical map. The parent context that today spawns a second panel becomes a breadcrumb in the single panel's header; the leaf selection owns the panel.

**Files in play:** `src/ui/map/components/panelRail.ts`, `src/ui/map/App.tsx` (rails render 1713-1727 + railState 530), the five detail panels' headers (`SelectionPanel`, `CorpsFrontPanel`, `CorpsDetail`, `FormationDetail`, `ArmyReservePanel`), `src/ui/map/store/gameStore.ts` (selection setters already exist — reuse), new `PanelBreadcrumb.tsx`, tests.

**Verified premises (re-check):** Part B3 anatomy; parent=primary/leaf=secondary combos in `derivePanelRailState` lines 100-147; panels self-register as counter occluders.

**Steps:**
1. Rework `derivePanelRailState` to return `{ panel: PanelRailPanel | null, trail: BreadcrumbLevel[] }` where the panel is the LEAF of the current selection (priority: formation > sector > corps > army/army_reserve > settlement > orbat > inbox) and `trail` is the ordered ancestor chain that is currently selected (e.g. corps ⇒ sector ⇒ formation gives panel=formation, trail=[corps, sector]). Keep the function pure and unit-testable; keep `inbox` as the empty-selection default; keep `orbat` and `army_reserve` semantics (army_reserve with a selected formation ⇒ panel=formation, trail=[army_reserve]).
2. New `PanelBreadcrumb.tsx`: renders trail chips + current leaf name; clicking a chip calls the existing store setter for that level and CLEARS deeper selections (the store's exclusive-selection helpers at gameStore.ts:370-460 already model most of this — reuse, don't fork). Escape in a panel = go up one breadcrumb level; Escape at root = close panel. Respect the focused-control shortcut guard (napkin 2026-06-26): only bind when no interactive element has focus.
3. App.tsx: delete the secondary-rail render block (1724-1727) and the `railSlot="secondary"` pathway; render the single panel from `railState.panel`; mount `PanelBreadcrumb` into each detail panel's header (panels receive `trail` via props or read the store).
4. `selectedOsid` alongside a formation/sector/corps selection no longer opens SelectionPanel as a second panel — it stays a map highlight; the settlement panel opens only when the settlement is the leaf selection. Preserve the existing rule that field-inspection clears transient chrome.
5. Delete `SECONDARY_PANEL_STYLE`, `LEFT_SECONDARY_PANEL_STYLE`, `railSlot` props, and `PanelRailState.secondary` when dead (grep src+tests+tools first). Do NOT remove the occluder machinery; it still guards sidebar/minimap/toolbar/panel.
6. Sanity-check drill-down flows cited in napkin (field-formation-in-corps / in-sector keep `selectedOsid` context; Army-Reserve drilldowns keep osid context) — the context ids still flow, only the second WINDOW is gone.

**Out of scope:** panel content, OOB sidebar, minimap, Deck counter logic (it adapts via occluders automatically).

**Tests:**
- NEW (first): `tests/ui/panel_rail_exclusivity.test.ts` — (a) every multi-selection state from the old combo table ⇒ exactly one panel + correct trail; (b) breadcrumb click selects parent and re-derives panel; (c) Escape walks up then closes; (d) settlement+formation ⇒ formation panel only.
- Run full: existing panelRail tests (grep `panelRail`), `tests/ui_map_deck_counter_visibility.test.ts`, `tests/ui_map_corps_selection_highlight.test.ts`, `tests/ui/render_churn_guards.test.ts`, `tests/ui_map_render_smoke.test.ts`, plus full suites of all five panels (grep by name). Many existing tests assert the two-rail model — rewrite to the new contract in this PR.

**Acceptance criteria:**
- [ ] No reachable UI state renders two detail panels (test-pinned across all old combos).
- [ ] qa sweep sector-overview/formation-detail screenshots show ≥60% of map width clear with a panel open (name the files).
- [ ] Sector→formation→back drill-down works via breadcrumb with selection context preserved.
- [ ] Counter-visibility suite green without loosening any assertion.

**DISPATCH PROMPT (WP-4):**
```
You are a UI builder on AWWV. Execute WP-4 (single detail panel + breadcrumb) from
docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md. Read Part A,
Part B3, WP-4, and panelRail.ts + App.tsx:1700-1740 + gameStore selection setters before
designing. Leaf-wins rule; parent chain becomes breadcrumb chips wired to EXISTING store
setters. Rewrite displaced two-rail test assertions in this PR. Red-first tests, full
grep-derived suites (all five panels + map render/counter suites), full gate, WP-4
checklist with evidence including screenshot filenames.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-5 — Convergence residue: reserve-approve call sites, static lever guard, Desk nav dedup, stale-doc correction

**Objective:** Close the last decision-SUBTRACT residue found in Part B4, pin single-host-per-lever with a static guard, remove the Desk's duplicate nav buttons, and correct the stale design-doc status.

**Files in play:** `ArmyReservePanel.tsx`, `ReserveRequestModal.tsx`, `presidential_desk/PresidentDeskShell.tsx`, `docs/plans/2026-06-01-presidential-command-surface-design.md`, new static-guard test, i18n.

**Verified premises (re-check):** Part B4 — the ONLY lever-IPC calls outside `DirectiveCard.tsx` are `ArmyReservePanel.tsx:155` and `ReserveRequestModal.tsx:68` (`approveReserveRequest`), contradicting ArmyReservePanel's own :125-129 comment.

**Steps:**
1. Determine reachability of both `approveReserveRequest` call sites (who renders the approve buttons; who opens `ReserveRequestModal` — grep openers). For each LIVE path: replace the approve action with a handoff that opens the Decision Room focused on the matching elite-deploy card (`decisionRoomLensRequest` with `cardId`; the card model already exists — `presidentialDecisionRoom.ts:1061`). Decline may remain in place (it is not a lever) — verify `declineReserveRequest` is not one of the five levers and leave it. For DEAD code paths: delete them (verify src+tests+tools importers first; STOP if a consumer makes deletion unsafe).
2. NEW static guard test `tests/ui/lever_single_host_guard.test.ts`: reads the source tree and asserts the five lever IPC methods (`stageOpDirectiveOrder`, `stageOpHaltOrder`, `stageOperationForceLaunch`, `stageCoReplacementOrder`, `approveReserveRequest`) appear as CALLS only in `DirectiveCard.tsx` (+ `useIPC.ts` definitions). Comments don't count; use an AST-light or line-parse approach consistent with existing static guard tests (grep tests/ for precedent, e.g. the retired-chrome and palette guards).
3. Desk nav dedup in `PresidentDeskShell.tsx`: keep `Call Army HQ` and `Advance Clearance` buttons; remove `War Map`, `Records`, `Command Surface` quick-buttons (duplicated in the persistent top nav — verify each destination remains reachable from the visible top-level nav in BOTH shell contexts before deleting; if any is not, STOP and report).
4. Docs: rewrite the stale status paragraph at the top of `2026-06-01-presidential-command-surface-design.md` to reflect verified reality (levers converged as of code comments in OperationsSection/CommanderSection/AutonomyPanel/OperationBriefingModal; residue = reserve-approve sites closed by this packet; date + cite this plan).
5. Click-depth verification (evidence only): from Desk category card → Decision Room card focused — confirm the `cardId` deep-link path works end-to-end and record the click count.

**Tests:** new static guard (red-first if possible by temporarily counting the ArmyReservePanel site); full suites for ArmyReservePanel, ReserveRequestModal, PresidentDeskShell, Decision Room (grep-derived); first-hour browser gate is part of the standard gate and covers the Desk.

**Acceptance criteria:**
- [ ] Static guard green and would fail if any lever call is added outside DirectiveCard.
- [ ] Elite-deploy remains fully issuable (integration test through the Decision Room card) and the reserve panel/modal no longer issue it directly.
- [ ] Desk shows no nav button duplicating a visible top-nav destination; every removed destination reachable in ≤1 click from persistent nav.
- [ ] Design doc status corrected with citations.

**DISPATCH PROMPT (WP-5):**
```
You are a UI builder on AWWV. Execute WP-5 (convergence residue + lever guard + Desk
dedup) from docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md.
Read Part A, Part B4, WP-5. Step 1 is investigation-first: establish reachability of
both approveReserveRequest call sites before changing anything, and STOP on premise
mismatch. The static guard test is the heart of this packet - make it strict. Full
grep-derived suites, full gate, WP-5 checklist with evidence.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-6 — Archive spines: retire the top-level DecisionHistoryOverlay

**Objective:** Exactly two archive entry points — Chronicle (memory) and Records (reference). The standalone DecisionHistoryOverlay retires into Army HQ → Records → Decision Consequences, which already exists.

**Files in play:** `App.tsx` (1096-1161 handlers, 1823 mount, line 57 import), `DecisionHistoryOverlay.tsx` (retire), whatever openers the grep finds (toolbar/shortcuts/desk), `utils/shellNavigation.ts` (route re-point), tests.

**Verified premises (re-check):** Part B5; Records-side destination exists (`20260606_DECISION_CONSEQUENCE_RECORD_FOCUS`).

**Steps:**
1. Inventory every opener of the overlay (grep `DecisionHistory` across src+tests; include keyboard shortcuts at App.tsx:1136/1161 and any Desk/Chronicle affordances).
2. Re-point every opener to the existing Army HQ Records → Decision Consequences route (via shellNavigation, preserving any row-focus payload the overlay supported — check what focus params the overlay accepted and map them to the Records row-focus mechanism that `20260606` shipped).
3. Verify column/content parity: any data visible in the overlay but missing from the Records subtab gets ADDED to the Records subtab (grep the overlay's row model vs the Records panel's). No data may become unreachable.
4. Delete `DecisionHistoryOverlay.tsx` + mount + handlers + its i18n keys (both locales) once zero importers (src+tests+tools). If a consumer blocks deletion, STOP and report.
5. NEW contract test: top-level archive launchers == {Records, Chronicle} (assert the toolbar/nav model); the re-pointed shortcut opens Records → Decision Consequences.

**Out of scope:** Chronicle internals, Codex (not an archive), Records data model beyond parity additions.

**Tests:** full grep-derived suites for DecisionHistory, Records routing (`records_route`, decision-consequence focus tests), shellNavigation; new contract test red-first.

**Acceptance criteria:**
- [ ] Zero references to DecisionHistoryOverlay in src/.
- [ ] Every row/filter previously visible in the overlay demonstrably reachable in Records (evidence: side-by-side field list).
- [ ] Old shortcut/openers land on the Records subtab with focus preserved.

**DISPATCH PROMPT (WP-6):**
```
You are a UI builder on AWWV. Execute WP-6 (retire DecisionHistoryOverlay into Records)
from docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md. Read
Part A, Part B5, WP-6. Data-parity first (step 3) - nothing becomes unreachable; then
re-point openers; delete last, only at zero importers across src+tests+tools, else STOP.
Red-first contract test, full grep-derived suites, full gate, WP-6 checklist.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-7 — Qualitative-first numbers + Army HQ same-screen dedup

**Objective:** Presidential surfaces lead with judgments; raw scalars demote to tooltips/Records. The Army HQ screen states each corps fact once.

**Files in play:** `utils/combatEffectiveness.ts` (band-label owner), `CorpsDetail.tsx` (:311), `FormationDetail.tsx` (:685-703), `ArmyHQCorpsCard.tsx`, `ArmyHQModal.tsx` (Command Access strip), `CorpsFrontPanel.tsx` (Force Balance bar, Op Slots copy — locate via grep `opSlots|forceBalance` incl. i18n keys), i18n, tests.

**Verified premises (re-check):** Part B6.

**Steps:**
1. In `combatEffectiveness.ts` add the single band-label mapping (`effectivenessBandLabel(breakdown): { grade: string; labelKey: string }`) reusing whatever grade derivation already produces the "A" in "3,572 A" (read `aggregateEffectiveness` first; extend, don't fork). New i18n keys `effectiveness.band.*` (EN e.g. "Combat ready", "Degraded", "Marginal", "Ineffective") in both locales. Respect `missingFields` — incomplete inputs render the existing incomplete/unreported treatment, never a favorable band (Army-HQ-grades rule, 2026-06-24).
2. CorpsDetail :311 and FormationDetail :685-703: primary render = "GRADE — Band label"; exact numeric `value` moves to the row `title` tooltip and stays available in Records/ORBAT deep surfaces. Kill the red bare number.
3. `Op Slots 0/2` → sentence key (EN: "No operations staged — capacity for 2."). Force Balance bar: add end labels (friendly/hostile) + a `title` with the qualitative reading; no numeric change.
4. Army HQ dedup (`ArmyHQModal.tsx`): the top Command Access strip reduces each corps chip to name + single readiness pill (navigation only); sector/operation counts and effectiveness live ONLY on the corps cards below. One fact, one place, per screen.
5. NEW static guard test: rendered fixtures of CorpsDetail/FormationDetail/ArmyHQ cards contain no text matching `/Combat Eff\.\s*[\d,]/` or `/Effectiveness:\s*\d/`; band labels come from the i18n family.

**Out of scope:** the effectiveness math; Records/ORBAT numeric detail surfaces (numbers stay there deliberately); OOBSidebar unless grep shows it renders raw effectiveness (Part B6 found it does not).

**Tests:** full grep-derived suites for the four components + combatEffectiveness unit tests; i18n parity; new static guard red-first.

**Acceptance criteria:**
- [ ] No unexplained raw scalar on Desk/Decision Room/Army HQ cards/Corps or Formation detail primary rows (screenshot evidence).
- [ ] Numbers remain findable (tooltip + Records) — name where.
- [ ] Missing grade-critical fields still render the incomplete treatment (test-pinned).
- [ ] Army HQ renders each corps stat exactly once per screen.

**DISPATCH PROMPT (WP-7):**
```
You are a UI builder on AWWV. Execute WP-7 (qualitative-first numbers + Army HQ dedup)
from docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md. Read
Part A, Part B6, WP-7. Extend the existing grade logic in combatEffectiveness.ts -
do not fork the math. Incomplete inputs must never earn a favorable band. Red-first
static guard, full grep-derived suites, i18n parity both locales, full gate, WP-7
checklist with screenshot evidence.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-8 — Ambient audio floor (default un-mute + beds)

**Objective:** End silent-by-default. Low, sober ambience + the existing cue set on by default at conservative volume; mute still one click.

**Files in play:** `src/ui/map/audio/audio_preferences.ts` (:20), `audio_engine.ts`, `sound_manifest.ts`, `audioAssets.ts`, `audio_event_adapter.ts`, mount points (warroom shell layer, App map view, Chronicle/Records overlays), `SettingsScreen.tsx` (verify slider), tests. Assets: owner-supplied.

**Verified premises (re-check):** Part B7 — full engine + 17 cues exist; `DEFAULT_AUDIO_PREFERENCES.muted === true` is the only reason for silence.

**Steps (commit 1 — no assets needed):**
1. Flip `muted` default to `false`; set a conservative default `masterVolume` (read the existing default; if >0.6, lower to 0.5). Persisted user prefs keep winning (normalize path already handles this — verify).
2. Verify the engine gates playback on first user gesture (browser + packaged Electron autoplay policy). If not, add resume-on-first-pointerdown in `audio_engine.ts`. No cue may error before first gesture (assert in test).
3. Verify the OS/in-game reduced-motion + mute accessibility contracts still hold (existing a11y guard tests).

**Steps (commit 2 — asset-gated; build fully, degrade gracefully):**
4. Add loop support to the engine if absent (`loop: true` channel with independent gain; verify by reading audio_engine.ts first).
5. Manifest entries for 3 ambient beds: `ambient_warroom` (interior room tone), `ambient_field` (wind + very distant, non-graphic rumble), `ambient_archive` (paper/room tone). Mount: warroom shell mounts warroom bed; tactical map mounts field bed at low gain; Chronicle/Records overlays mount archive bed; hard-cut on surface change is acceptable (crossfade optional). Missing asset file ⇒ silent no-op with a single console-free internal skip (same fallback philosophy as command-card art).
6. Owner asset manifest (deliverable of this packet even if files arrive later): three `.ogg`, loopable, ≤60s each, LUFS-matched to existing cues, non-musical, no VO, nothing graphic.

**Out of scope:** music, VO, per-event new cues, volume-mixing UI beyond what Settings already has.

**Tests:** update the preferences-default test; new bus contract test (mute silences beds + cues; no playback before first gesture; missing bed asset ⇒ no throw). Manual listen pass in the packaged build (evidence: state what you heard where).

**Acceptance criteria:**
- [ ] Fresh profile: audible cue on turn advance and directive confirm; ambience in warroom (once assets land).
- [ ] Mute toggle silences everything; persisted prior prefs honored.
- [ ] No autoplay errors in the browser gates (gate output proves).

**DISPATCH PROMPT (WP-8):**
```
You are a UI builder on AWWV. Execute WP-8 (ambient audio floor) from
docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md. Read Part A,
Part B7, WP-8. Commit 1 (default un-mute + gesture gating) must land independently of
assets; commit 2 builds bed support that no-ops gracefully while asset files are absent,
and delivers the owner asset manifest. Full gate incl. browser sweeps (autoplay proof),
WP-8 checklist.
[APPEND PART A RAILS VERBATIM HERE]
```

---

### WP-9 — D2 friction-diary discipline (process; owner + orchestrator, no code)

**Objective:** Played sessions, not contract inventories, drive the UI backlog from here to D2.

**Protocol:**
1. Create `docs/40_reports/playtests/` with `TEMPLATE.md`: date/build/faction; turns played + minutes per turn; the 3 worst friction moments (each: surface, what you were trying to do, what happened, screenshot path); 1 best moment; "Did I feel like the President?" 1–5 + one sentence why; any bug vs friction split.
2. Cadence: after WP-1..WP-4 merge, owner plays ≥10 turns per session, ≥1 session/week, packaged desktop build (`npm run desktop`), diary filed per session.
3. Triage rule (orchestrator): diary top-3 items become the front of the UI backlog before ANY new polish lane; each maps to a packet-style spec using this plan's format.
4. Grade honesty: any self-graded UI row in `GAME_STATE_RATING_MASTER.md` may not exceed the latest diary's feel-grade band; note the coupling in that doc's reading guide on the next touch.
5. D2 trigger: two consecutive diaries with no NEW top-3 friction inside the Desk → Decision → Advance loop ⇒ schedule the D2 full-campaign playthrough.

**Deliverable now:** the template file + a MASTER_ROADMAP line "GUI decision-access runway (owner-directed, pre-D2) → this plan" + COMMAND_BOARD row. (Docs-only; orchestrator does this directly, no dispatch.)

---

## Part D — Sequencing, PR discipline, rollback

| Order | Packet | Size | Mode | Depends on | Parallel-safe with |
|---|---|---|---|---|---|
| 1 | WP-1 Decision Room flatten | M | worktree builder | — | WP-4, WP-8 |
| 2 | WP-2 Quiet advance + digest | M | worktree builder | — (rebase after WP-1 if same files) | WP-4 |
| 3 | WP-4 Panel exclusivity | M | worktree builder | — | WP-1, WP-2 |
| 4 | WP-3 Unreported presentation | M-L | worktree builder | — | WP-6 |
| 5 | WP-5 Convergence residue | S | direct | WP-1 merged (card focus target) | WP-3 |
| 6 | WP-6 Archive spine | S | direct | — | WP-3 |
| 7 | WP-7 Qualitative numbers | S-M | direct | WP-1 merged (copy overlap) | WP-8 |
| 8 | WP-8 Audio | S + assets | direct | — | anything |
| 9 | WP-9 Diaries | process | owner | WP-1..WP-4 merged | — |

- One packet = one PR = one revert unit. Each PR's ledger entry names the packet id.
- Builders work in worktrees; if a builder stalls dirty, salvage via patch-extraction (`git -C <wt> diff > patch` applied on a fresh branch), never git-inside-the-worktree; verify `pwd` before any worktree git op.
- After each merge, the orchestrator runs a parent-side sanity: `git status --short`, spot-Read of claimed new files (agent "wrote file" claims are draft until the parent sees them on disk).
- Conflict surface: WP-1/WP-2/WP-7 all touch Decision-Room-adjacent copy — merge in numbered order; WP-4 touches App.tsx broadly — do not run another App.tsx packet concurrently.

## Part E — Global acceptance: the President Test

Run after WP-1..WP-7 merge, before declaring the runway done (orchestrator, manually, packaged build, fresh RBiH campaign):

1. **Find:** From game start, identify what needs deciding in ≤1 click (Desk or Decision Room shows the queue, above the fold).
2. **Decide:** Resolve the first required decision in ≤3 clicks from seeing it (card → dossier → confirm), with staff assessment and cost visible before confirming.
3. **Advance:** A quiet turn costs exactly 1 click and <5 seconds of ceremony; the aftermath digest is one line.
4. **Look:** Open the map, select a sector, drill to a brigade and back — never more than one detail panel; own-force panels contain zero "Unreported" labels and zero unexplained raw scalars.
5. **Remember:** Find yesterday's decision in Records in ≤3 clicks; find the war's story in Chronicle.
6. **Hear:** The room is not silent.

Each numbered item is pass/fail; any fail becomes a diary-format finding and a follow-up packet. Then WP-9 cadence begins, and D2 is scheduled per its trigger.

## Appendix — Deferred (explicitly NOT in this plan)

- Sim-side fix for absent own-force turn-0 staff data (WP-3 files the findings; separate gated lane with 188w `matched_osids` diff + `test:baselines`).
- The remaining unreported surfaces beyond WP-3's five (follow-up packet reuses WP-3's pattern + triage table).
- Nav-shell unification (Warroom top bar vs map toolbar) beyond WP-5's Desk dedup — larger IA change; revisit after two diary cycles say it still hurts.
- Music/VO; convoy/patron command-card art wiring ("ready but unrendered" loose end); AI Advisor repurpose.

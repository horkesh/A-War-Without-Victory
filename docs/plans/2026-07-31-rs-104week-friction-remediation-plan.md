# RS 104-Week Friction Remediation Plan

**Status:** IN PROGRESS — all source packets independently approved; fresh packaged 104-week RS acceptance and completed diary pending
**Date:** 2026-07-31
**Source diary:** `docs/40_reports/playtests/20260731_rs_104week_player_diary.md`
**Scope:** The five confirmed friction findings from the RS 104-week owner-player Electron run
**Order:** Correctness bugs first (completed locally in the originating repair pass), then information hierarchy, map handoff, cadence, and presentation
**Activation boundary:** Full roadmap execution is active. The owner separately authorized commits, remote pushes, final merge, documentation propagation, and repository cleanup. Signing, store upload, public release creation, and a public `1.0` tag remain unauthorized.

## 1. Outcome

The player should be able to move through:

`Desk -> Decision Room -> supporting evidence/map -> recorded action or explicit hold -> Advance`

without:

- translating a named operation dossier into map geography by memory;
- seeing the same situation described as both non-blocking and urgent;
- losing the presidential role for 12-13 weeks while Command Authority sits capped;
- scanning an ultrawide Army HQ whose useful content occupies only part of the canvas;
- or fighting a horizontally overflowing bottom strip to read active campaign paths.

The plan must preserve three existing truths:

1. Required work means an existing Advance blocker or authored required response. Friction work must not create new blockers.
2. A historical campaign may legitimately have quiet weeks. Cadence remediation may expose sourced, optional initiatives or a positive hold posture, but may not fabricate historical decisions.
3. All ordering, grouping, eligibility, and map-focus output must be deterministic and derived from existing state plus authored data.

## 2. Evidence Baseline

The diary recorded:

- 18 Decision Room items at turn 104, 13 described as urgent;
- nine repeated siege/enclave briefings that did not block Advance;
- a largest consequential-choice gap of 13 weeks, plus two 12-week gaps;
- Command Authority at cap in 87 of 105 observed states;
- no shared focus between the Cerska-Kamenica dossier and the map;
- `WarSummaryContent` capped at 1100px on a 3440px-wide Army HQ;
- and an overflowing active-branch row in `BottomStatusStrip`.

Before implementation, preserve the relevant final-save fixture or a redacted projection of it under a deterministic test fixture. Do not make tests depend on the 197 MiB screenshot/evidence directory.

Proposed fixture:

- `tests/fixtures/ui/rs_turn104_priority_projection.json`

It should contain only the player-visible inputs needed by the five read models: pending decisions/reviews, command briefing items, historical-operation review data, Command Authority, active branch tags, and the map objective identifiers.

## 3. Alternatives Considered

### Approach A — copy and CSS patches on each surface

Change labels from `Urgent`, widen Army HQ, add overflow clipping, and add a map button directly in the dossier.

**Advantage:** Fast and low-risk locally.
**Failure:** Desk, Command Surface, Decision Room, and Advance would still compute different meanings. It would hide symptoms without creating one agenda contract.

### Approach B — replace the existing command shells with one new executive dashboard

Move all presidential work into a new single-screen owner.

**Advantage:** Maximum conceptual unity.
**Failure:** Reopens the recently completed shell-convergence architecture, duplicates working routing, and is too large for a D2 friction pass.

### Approach C — one shared priority/read-model contract plus bounded surface changes

Keep current shells, but give them one priority vocabulary and one set of derived groupings. Add a first-class operation-map focus route, source-bounded optional cadence, responsive Army HQ composition, and bounded active-path overflow.

**Recommendation:** Approach C. It fixes the information model before changing presentation and reuses the existing Decision Room, field-inspection, and shell-navigation architecture.

## 4. Work Packets

### Packet FR-01 — One presidential priority contract

**Problem:** `Required`, `Staff Review`, `Urgent`, `Critical Signals`, and category counts currently answer different questions.

**Contract**

Add a pure presentation type:

```ts
type PresidentialPriorityBand =
  | 'required'
  | 'recommended'
  | 'monitor'
  | 'record';
```

Meanings:

- `required`: an existing blocker or authored response that must be resolved before Advance.
- `recommended`: a filed, executable or time-sensitive matter worth reviewing this week, but not an Advance blocker.
- `monitor`: a live condition with no filed presidential lever.
- `record`: resolved history, aftermath, cost, or chronicle material.

`severity` remains available for threat/cost presentation. It must not silently stand in for presidential priority. A critical battlefield report with no executable matter is `monitor`, not `required` or `recommended`.

**Recommended implementation**

- Add `src/ui/map/data/presidentialPriority.ts`.
- Derive `priorityBand` once for every `PresidentialDecisionRoomCard`.
- Make `deriveInboxItems`, `buildPresidentialCommandCategories`, `derivePreAdvanceCommandReview`, and `buildWarroomPriorityDocket` consume the shared result rather than reclassifying cards.
- Keep existing blocker derivation in `presidentialBlockers.ts` authoritative. The new module reads blocker truth; it does not redefine it.
- Replace aggregate `urgentCount` with explicit band counts. Retain a compatibility field only during the same patch if needed to keep the change reviewable, then remove it before packet close.

**Primary files**

- `src/ui/map/data/presidentialPriority.ts` (new)
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/ui/map/data/presidentialCategories.ts`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/data/preAdvanceCommandReview.ts`
- `src/ui/map/data/presidentialBlockers.ts`
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- `src/ui/map/components/presidential_desk/DeskPacket.tsx`
- `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- EN/BCS message catalogs

**Tests**

- Create `tests/ui/presidential_priority_contract.test.ts`.
- Extend `presidential_decision_room.test.ts`, `presidential_categories.test.ts`, `pre_advance_command_review.test.ts`, `president_desk_shell.test.ts`, and `warroom_shell_ownership.test.ts`.
- Feed the same turn-104 fixture to every surface and assert identical band totals.
- Assert a critical no-lever briefing is `monitor`.
- Assert a historical operation authorization remains `required`.
- Assert no item changes the existing blocker count merely because its threat severity is critical.

**Acceptance**

- At the RS turn-104 fixture, all four surfaces report the same Required/Recommended/Monitor/Record totals.
- No screen uses `urgent` as an unexplained aggregate.
- `Advance` remains blocked by exactly the pre-existing blocker set.

### Packet FR-02 — Consolidate repeated siege/enclave briefs

**Problem:** Nine related briefings appeared as separate urgent items even though they described monitoring work and shared the same destination.

**Recommended implementation**

- Group command-briefing candidates before they become Decision Room cards.
- Group key: briefing family + navigation target + player faction. Use stable ASCII ordering for group members.
- For siege/enclave items, emit one theatre summary card with:
  - affected enclave count;
  - critical/warning split;
  - names of changed enclaves, bounded to a readable list plus `+N`;
  - this-week delta derived from current versus previous player-visible briefing inputs;
  - one `Review Enclaves` handoff.
- Preserve every source item in a collapsible evidence list or dossier detail. Grouping changes presentation only; it must not delete event, command-briefing, or chronicle records.
- Do not add “since last reviewed” persistence in this packet. Use deterministic “changed this week” evidence unless a later design explicitly authorizes review-state persistence.

**Primary files**

- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/ui/map/data/preAdvanceCommandReview.ts`
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- EN/BCS message catalogs

**Tests**

- Create `tests/ui/command_briefing_consolidation.test.ts`.
- Assert nine siege/enclave inputs become one visible summary card with a count weight of nine.
- Assert unrelated critical briefs do not merge.
- Assert grouping is invariant under input-array permutation.
- Assert the evidence dossier still exposes all nine stable source IDs.

**Acceptance**

- The RS turn-104 fixture shows one enclave/siege monitor card rather than nine duplicate priority rows.
- The underlying source count remains auditable.
- No grouped monitor blocks Advance.

### Packet FR-03 — Historical operation dossier -> map focus -> return

**Problem:** The dossier knows the operation definition and objective names, but it exposes no objective identifiers or shared map focus.

**Recommended implementation**

1. Extend `HistoricalOperationAuthorizationDetails` with stable, ordered raw references:

   - `objectiveOsids`
   - `stagingOsids`
   - `formationIds`
   - `corpsId`

2. Add a bounded field target:

```ts
{
  kind: 'field-operation-plan';
  proposalId: string;
  objectiveOsids: string[];
  stagingOsids: string[];
  formationIds: string[];
}
```

3. Add `Show on map` beside, not instead of, the existing Army HQ source handoff.
4. The map route should:

   - close reference overlays;
   - frame the union of objective/staging OSID centroids with bounded padding;
   - highlight objectives and staging with distinct existing-token colors;
   - highlight participating friendly formations when their locations are reported;
   - open a compact context card with `Return to dossier`;
   - keep raw OSIDs internal and use the existing player-safe name resolver.

5. If a definition has no stable OSIDs, omit/disable the action with honest copy. Do not geocode names or guess a municipality.

**Primary files**

- `src/ui/map/data/historicalOperationAuthorization.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/ui/map/utils/fieldInspectionTarget.ts`
- `src/ui/map/utils/shellNavigation.ts`
- `src/ui/map/store/gameStore.ts`
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- `src/ui/map/map/MapContainer.tsx`
- a small new pure selector under `src/ui/map/map/operationPlanFocus.ts`
- EN/BCS message catalogs

**Tests**

- Create `tests/ui/historical_operation_map_focus.test.ts`.
- Extend `ui_shell_navigation.test.ts`, `ui_map_game_state_adapter.test.ts`, and Decision Room component tests.
- Assert Cerska-Kamenica returns its exact authored objective/staging OSIDs in stable order.
- Assert the field route clears conflicting selection, sets the focus, and retains a return receipt.
- Assert missing definitions do not create a guessed focus.
- Add an Electron checkpoint at the turn-40 Cerska-Kamenica dossier: click `Show on map`, verify all expected objective markers are in viewport, select one objective, then return to the same dossier.

**Acceptance**

- The player can answer “where is this operation and what is committed?” without manual name translation.
- The dossier remains the decision owner; the map is supporting evidence and cannot authorize the operation.

### Packet FR-04 — Source-bounded cadence and near-cap Authority opportunities

**Problem:** The earlier 19-turn drought improved, but the RS run still had 13- and 12-week consequential gaps while Authority remained capped.

**Guardrail**

The target is an 8-10 week cadence of **meaningful, sourced review opportunities**, not a forced signature every 8-10 turns. A quiet interval is preferable to a fabricated historical choice.

**Recommended implementation**

Phase A — cadence audit:

- Add a pure report that lists consequential player-decision receipts by faction and computes gaps.
- Separate required authored decisions, optional source-backed decisions, ordinary emergent proposals, notices, and positive-hold weeks.
- Run the report for RBiH, RS, and HRHB through 104 turns before authoring content.

Phase B — fill only evidenced gaps:

Use this order:

1. retime an existing sourced event within its documented historical window;
2. expose an already-existing operation, reserve, personnel, patron, or diplomatic lever as an optional presidential review;
3. add a new authored initiative only when a Historian source packet and the locked design criteria below both pass;
4. if none is justified, retain the quiet interval and make the hold posture explicit.

Optional near-cap initiatives may appear when:

- current Authority is at least 90% of its displayed cap;
- at least eight turns have passed since a consequential authored/source-backed review;
- no required blocker is pending;
- no other optional initiative is pending;
- a data-authored initiative for the faction, time window, and current state is eligible.

Each initiative row must define:

- stable ID;
- faction;
- turn window;
- deterministic state preconditions;
- cited historical basis;
- whether the historical record supports a default response;
- available existing lever and Authority cost;
- cooldown/once rule;
- explicit `optional/counterfactual` presentation when no historical disposition exists.

There must be no generic “spend Authority because it is full” event. Authority recovery is a trigger to inspect eligible content, not historical evidence by itself.

**Primary files**

- New `src/sim/presidency/presidential_initiatives.ts`
- New authored data file under `data/scenarios/presidential_initiatives/`
- `src/sim/turn_phases/war_phases.ts` only after the read model and authored data pass the locked evidence/design criteria
- `src/state/game_state.ts` only if an initiative receipt/cooldown cannot reuse existing proposal/event receipts
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/ui/map/components/presidential_desk/DeskAuthorityHeader.tsx`
- scenario/diary QA reports

**Tests**

- Create `tests/presidential_initiatives.test.ts`.
- Create `tests/rs_104week_decision_cadence.test.ts`.
- Extend the all-faction cadence diagnostics.
- Assert initiative eligibility and ordering are deterministic under input permutation.
- Assert no initiative appears without an authored source row.
- Assert no initiative becomes an Advance blocker.
- Assert at most one optional initiative is pending.
- Assert historical defaults are absent unless the source row explicitly provides one.
- Compare two identical 104-turn runs byte-for-byte for initiative receipts.

**Historical evidence disposition**

Every authored row requires Historian verification and a citation to the relevant *Balkan Battlegrounds* volume/page or a higher-tier primary, tribunal, or UN source. The Game Designer verifies only that the row uses an existing presidential lever, remains optional, and cannot become an Advance blocker. If no source-backed lever exists for a gap, the deterministic outcome is a documented positive-hold interval: close that gap as intentionally quiet, do not invent content, and continue with the remaining gaps.

**Acceptance**

- Canonical RS play offers a consequential authored or source-backed review at least every 8-10 weeks where the source inventory supports one.
- The player can choose restraint without signing a fictional decision.
- Authority at/near cap creates an intelligible optional opportunity, not silent overflow and not automatic spending.

### Packet FR-05 — Army HQ ultrawide composition and hold-copy hierarchy

**Problem:** `WarSummaryContent` uses `max-w-[1100px]` inside a full-screen modal, leaving most of a 3440px canvas empty. Four objective cards repeat variants of `hold present policy`.

**Recommended implementation**

- Replace the hard 1100px root cap with responsive composition:
  - readable text blocks remain bounded;
  - card/table regions expand to two columns at normal desktop and three columns on ultrawide;
  - focused sections never stretch prose beyond a readable measure.
- Use container queries or existing responsive breakpoints; do not key behavior to a single captured resolution.
- Add one Summary-level, non-interactive posture band:
  - `No presidential signature is due; current policy remains in force.`
- In objective cards, shorten non-actions to their local truth:
  - `No staff request filed`
  - `No presidential signature due`
- Do not render four separate instructions to hold policy.
- Preserve keyboard order: tabs -> posture band -> objectives -> detailed summaries.

**Primary files**

- `src/ui/map/components/army_hq/WarSummaryContent.tsx`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`

**Tests**

- Extend `war_summary_campaign_cost_i18n.test.ts`, `army_hq_presidential_handoff.test.ts`, and readability/contrast tests.
- Add a viewport/layout contract for 1366x768, 1920x1080, 2560x1440, and 3440x1440.
- Assert no horizontal document scroll.
- Assert objective cards occupy at least two columns at 1920 and three at 3440 where content count permits.
- Assert one posture statement and no repeated `hold present policy` suffixes.
- Capture Army HQ Summary and Briefing screenshots at 1920 and 3440 in the Electron verification run.

**Acceptance**

- The 3440px Summary uses the available canvas without producing overlong prose.
- Hold is presented once as an executive posture, while individual cards report only their local lack of a filed lever.

### Packet FR-06 — Bound the bottom active-path row

**Problem:** `BottomStatusStrip` mounts every active `BranchTagBadgeRow` chip in a horizontally scrolling region. Late-campaign paths overflow, truncate, and compete with the core map controls.

**Recommended implementation**

- Treat active branch tags as campaign-path status, not an unbounded ticker.
- Keep at most two full chips visible in the strip.
- Add a deterministic `+N active paths` button when more exist.
- Open a keyboard-accessible popover listing every active path in stable order with full text.
- Prefer an authored display priority if one is added to the event taxonomy; otherwise preserve current stable alphabetical order. Do not derive “importance” from object insertion order.
- Reserve fixed space for map modes, territory, aftermath digest, and Layers. The path summary may shrink, but the bottom strip must not create a page-level or local horizontal scrollbar.
- Give every truncated visual label a full accessible name/title; preferably do not truncate the two visible chips.

**Primary files**

- `src/ui/map/components/BottomStatusStrip.tsx`
- `src/ui/map/components/BranchTagBadgeRow.tsx`
- optional pure helper `src/ui/map/data/activeBranchTagSummary.ts`
- EN/BCS message catalogs

**Tests**

- Create `tests/ui/bottom_status_active_paths.test.ts`.
- Extend `v47_readability_remediation.test.ts` and keyboard/focus tests.
- Assert 0, 1, 2, and 8 active tags.
- Assert stable visible-tag selection under input permutation.
- Assert the overflow popover exposes all tags and returns focus to its trigger.
- Browser/Electron hit-test the strip at 1366, 1920, and 3440 widths; assert `scrollWidth <= clientWidth`.

**Acceptance**

- No horizontal scrollbar or clipped half-chip appears in the late RS state.
- All active paths remain discoverable and keyboard accessible.

## 4.7 Activation Preflight Corrections

The mandatory Product/UX/Historian preflight passed this packet for execution after R1 with these binding corrections:

- Freeze `tests/fixtures/ui/rs_turn104_priority_projection.json` from the cited final autosave; include stable source ids and player-visible projection truth, never the 197 MiB evidence tree at test time.
- FR-01 and FR-02 are one adjacent integration unit. Put shared band semantics in `presidentialPriority.ts`, attach the band to Inbox and Decision Room projections, and avoid the existing `presidentialDecisionRoom -> deriveInboxItems` dependency cycle. `warroomPriorityDocket.ts` must consume band counts rather than `urgentCount`.
- Consolidated cards retain non-rendered stable `sourceIds`. A this-week delta is optional and omitted when no prior player-visible briefing exists; this packet adds no persistence merely to manufacture a delta.
- FR-03 rebases on R1 and includes `App.tsx`, `field-operation-plan` in `fieldInspectionTarget.ts`, an App-owned return receipt, and UI-only focus cleared on hide/campaign replacement. It must preserve the retained viewport, apply focus only after current-revision reveal paint, perform no hidden camera work, create no renderer, serialize no focus, and never authorize from the map. `shellNavigation.ts` and `GameStateAdapter.ts` change only if the post-R1 API proves it necessary.
- Replace `localeCompare` in touched historical-operation selection with `strictCompare`. Sort and deduplicate objective/staging/formation references, omit guessed data, and show only player-visible friendly formations.
- FR-04A audits every faction before any content is written. A row requires the locked citation/lever/cost/once-or-cooldown schema; a gap may remain longer than ten turns only as an explicitly evidenced positive hold. `operation_lukavac_93` cannot support cadence work until its 15,000-troop prose is reconciled with *Balkan Battlegrounds* II p.410's approximately 10,000 and its July–August chronology.
- FR-05 and FR-06 may develop independently, but one integration owner controls EN/BCS catalogs. R7, not this packet, owns the later `bcs -> bs` migration.
- Invert the stale `bottom_status_strip_overflow.test.ts` contract that currently requires horizontal scrolling; the accepted strip has at most two visible paths plus an accessible deterministic overflow popover and no horizontal scroll.

R1's post-integration lifetime remains two MapLibre owners (main plus minimap) and one Deck owner per campaign epoch, with zero additional warm construction/release. R2 verification must rerun that ownership, hidden-input/focus, and current-revision gate after its shared-file changes.

## 4.8 2026-08-01 Source Closeout and Rejected Runtime Attempt

FR-01/02/04/05 remain reviewed and green. FR-03 and FR-06 are now implemented and independently approved:

- FR-03 uses exact authored references, the retained current-revision map/Deck owners, objective/staging/participant evidence, bounded focus, and same-dossier return. It performs no map-side authorization, hidden camera work, guessed targeting, or persistence.
- FR-06 uses full semantic labels without truncation, one chip plus `+N` below 1600 px, at most two plus `+N` at wider geometry, stable ordering, and a complete keyboard-accessible popover.
- Command/OOB Situation prose owns wrapping width. Packaged checkpoints now fail if document, strip, OOB, Situation prose, branch chips, or `+N` are locally or ancestor clipped.
- The Warroom docket names `Review Before Advance` and `PENDING` counts separately. Near-cap quiet weeks reuse the shared sourced-policy-hold explanation; no decision or event was invented.
- A missing visible final-tour stack badge produces an explicit not-applicable evidence receipt. Existing but unclickable/unstable stack surfaces still fail closed.

The packaged attempt `20260801-r2-rs-104w-owner-postfix-v1` reached exact turn 104 and then failed the retired unconditional stack-badge assumption. Its 456 screenshots and progress/error artifacts are negative lineage only: no accepted final diagnostics packet was emitted, so it is not a completed diary or Electron acceptance. See the [R2 source closeout report](../40_reports/implemented/20260801_R2_RS_FRICTION_FR03_FR06_AND_RUNTIME_HARDENING.md).

Remaining gate: after the next Electron lease, rebuild the transient unpacked package and run a fresh no-resume 104-week RS owner campaign. Acceptance requires exact turn 104, clean final diagnostics, all operation handoff receipts, materialized geometry receipts, verified process cleanup, and a newly completed diary. Do not reuse or resume the rejected run.

## 5. Execution Order

1. Freeze the turn-104 UI fixture and add RED cross-surface priority tests.
2. Implement FR-01 and make all priority consumers green.
3. Implement FR-02 immediately adjacent to FR-01 so duplicate monitor volume cannot distort the new counts.
4. Rebase on the integrated R1 shared-file result, then implement FR-03 and prove the Cerska-Kamenica round trip in Electron.
5. Complete the all-faction cadence/source audit before writing any FR-04 content.
6. Implement only Historian-approved FR-04 initiative rows; otherwise close each gap as a positive hold, then prove replay determinism.
7. Implement FR-05 and FR-06 presentation packets with one catalog owner.
8. Run the integrated verification matrix and a fresh, clean RS 104-week owner diary.

FR-01 and FR-02 must land together or in immediately adjacent changes: exposing a correct priority vocabulary while leaving nine duplicate monitor cards would still fail the player outcome.

## 6. Integrated Verification Matrix

Minimum automated gate:

- focused packet tests;
- `npm.cmd run qa:player-journeys`;
- `npm.cmd run typecheck`;
- unpackaged `desktop:map:build` and `desktop:sim:build`;
- `canon:check` static/determinism scan without approving or overwriting baselines;
- `git diff --check`.

Minimum Electron gate:

- clean RS campaign in the current unpackaged production Electron entry;
- exact turn 40 operation dossier -> map focus -> dossier return;
- turn-104 priority-count equality across Desk, Command Surface, Decision Room, and Advance;
- one consolidated siege/enclave summary;
- Army HQ screenshots at 1920x1080 and 3440x1440;
- bottom-strip overflow proof at 1366, 1920, and 3440 widths;
- zero console errors, page errors, failed requests, invalid hit targets, or accessibility/readability failures;
- final save and projected-state hashes recorded;
- no package/installer/release mutation.

## 7. Determinism Checklist

- Stable ASCII sort for grouped cards, objective OSIDs, formation IDs, and active tags.
- No locale-sensitive sort in simulation or persisted outputs.
- No random initiative selection.
- No wall-clock or elapsed-real-time eligibility.
- UI-only focus/popover state is not serialized as campaign truth.
- Cadence eligibility uses turn numbers and durable receipts only.
- Grouped cards retain source IDs and do not erase historical/event records.
- Reordering equivalent input arrays produces byte-identical derived outputs.
- Approved scenario baselines are never overwritten as part of verification.

## 8. Documentation and Ledger

When implementation occurs:

- update `docs/20_engineering/MAP_UI_MASTER.md` for the priority contract, operation-plan focus target, Army HQ responsive layout, and bottom-strip overflow policy;
- update `docs/40_reports/GUI_MASTER.md` with implementation status and evidence links;
- update the Rulebook/Systems Manual only if FR-04 adds a new player-visible presidential initiative mechanic or durable state;
- append `docs/PROJECT_LEDGER.md` with packet-by-packet RED/GREEN evidence and historical citations;
- append `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for reusable architecture/history lessons;
- append the source diary with remediation results without altering its original score;
- write a fresh diary before changing the recorded 3/5 President-feel score.

## 9. Definition of Done

This friction plan is complete only when:

- all six packets meet their acceptance criteria;
- the integrated tests and Electron gates are green;
- a fresh RS 104-week diary no longer reports any of the five source frictions;
- bugs and friction remain separately classified;
- and no release-state action has occurred without explicit owner authorization.

# Two-Level Event Surfacing + Codex Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:**
1. **Two-level event surfacing.** The respondent faction (player or AI) gets the full decision event. The other two factions receive a deterministic informational notification on the next turn ("EU4 news pop" pattern).
2. **Codex visibility fix.** Stop rendering Codex essays that were never surfaced to the player and have no `ghost_when` trigger.

**Architecture:** Treat foreign-faction decision visibility as a first-class state-owned `EventNotification` queue, drained one turn after the decision is resolved. Codex render-pass is filtered by the resolver's `isUnlocked || isGhost` truth — not by raw `essay_index.json` membership.

**Tech Stack:** TypeScript simulation/event code, React Codex + Inbox read models, Vitest, JSON scenario event catalogs.

**Status:** AUTHORED 2026-05-17. Phase 0 design decisions DECIDED 2026-05-17 (see Phase 0 table). Phase B scope corrected 2026-05-17: test player-faction selection must be explicit and separate from gameplay scenario data.

**Source investigation (read-only, in-session 2026-05-17):**
- Codex visibility bug: `src/ui/map/components/CodexPanel.tsx:140-175` renders every essay in `essaysByYear` regardless of resolver verdict; `codexEssayResolver.ts:474-480` already returns the right `isUnlocked`/`isGhost` truth and is not the bug.
- Initial event-offer non-surfacing: `src/sim/events/evaluate_events.ts:224-225` gates queuing on `isPlayerRespondent = playerFaction != null && respondingFaction === playerFaction`. Gameplay scenario JSONs are intentionally faction-neutral unless a scenario is explicitly authored around one player faction, so tests must not "fix" this by writing `player_faction` into every `apr1992_*.json`. Inbox filter at `src/ui/map/data/inboxItems.ts:88-89` is correct and is not the bug.

**Testing policy correction 2026-05-17:**
- Event-surfacing tests should prefer **RS** fixtures where possible because RS has denser early political/military event coverage.
- Test faction selection belongs in explicit test harness state, test-only scenario fixtures, or direct state builders. It must not be propagated into gameplay scenario JSON just to make tests richer.
- Gameplay/default desktop faction selection remains a shell/start-campaign concern, not a scenario-data rewrite.

---

## Phase 0 — Design Decisions (DECIDED 2026-05-17)

| # | Decision | Resolution | Note |
|---|---|---|---|
| D1 | Notification text granularity | **Per-recipient text** | Author distinct `{headline, body}` for each recipient faction × response option. Doubles authoring cost vs broadcast but lets HRHB and RBiH receive faction-tinted framing (e.g., HRHB sees patron-tilt language, RBiH sees federal-tilt language). Override of original broadcast recommendation. |
| D2 | Notification surface | **Presidential Inbox, new `kind: 'intelligence_notification'`** | Reuses inbox/rail/projection plumbing. Distinct INTEL badge, read-only, dismissable. Does not block advance. |
| D3 | AI faction response timing | **Resolve immediately, same turn the event fires** | Matches current decision flow. AI deliberation systems deferred to a later milestone (v1.0 AI Commander work). |

---

## Required Reading

- `src/ui/map/components/CodexPanel.tsx`
- `src/ui/map/components/codexEssayResolver.ts`
- `src/sim/events/evaluate_events.ts`
- `src/sim/events/event_types.ts`
- `src/sim/events/resolve_decision.ts`
- `src/state/game_state.ts`
- `src/state/serialize.ts`
- `src/state/validateGameState.ts`
- `src/state/player_decision_manifest.ts`
- `src/scenario/scenario_loader.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/sim/turn_phases/peace_phases.ts`
- `src/ui/map/data/inboxItems.ts`
- Dedicated test fixture scenarios or direct test state builders for explicit RS/RBiH/HRHB coverage; do not mass-edit `data/scenarios/apr1992_*.json`
- `data/scenarios/events/war_1992.json` (events `rs_strategic_goals`, `rbih_state_identity`)
- `docs/40_reports/implemented/20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md` (precedent for `responding_faction` ownership)

---

## Parallelization

- **Phase A (Codex filter) is independent.** Renderer-only, no state, no sim. Ship first as a quick win.
- **Phase B (player_faction boundary) is independent.** Separates gameplay faction selection from RS-first event-surfacing test fixtures without yet building the two-level system.
- **Phases C.1 → C.5 are serial.** Schema → emission → UI → tests. Behind a feature flag (`AWWV_TWO_LEVEL_NOTIFICATIONS=true`) until calibration is brought back to green.
- **Phase D (content backfill) is parallel and ongoing.** Each event is an independent revertable edit.

---

## Phase A — Codex Visibility Fix

**Files:**
- `src/ui/map/components/CodexPanel.tsx` (modify)
- `tests/ui/CodexPanel.visibility.test.tsx` (new)

**Changes:**
1. At `CodexPanel.tsx:140`, before `.map((essay) => …)`, add a `.filter((essay) => { const r = resolvedEssays.get(essay.id); return Boolean(r?.isUnlocked || r?.isGhost); })`.
2. Guard the year-section render with `yearEssays.length === 0 → null` so empty years collapse.
3. Keep `essaysByYear` grouping logic at lines 74-82 unchanged.

**Tests:**
- Un-fired essay, no `ghost_when` → not rendered.
- Un-fired essay, satisfied `ghost_when` at `GAME_OVER` → rendered as ghost.
- Fired essay → rendered unlocked.
- Year with zero qualifying essays → year header hidden.
- `npm run test:vitest -- CodexPanel`

**Docs / Ledger:**
- Append `docs/PROJECT_LEDGER.md` (behavioral change to Codex visibility).
- Update `docs/40_reports/GUI_MASTER.md` Codex section if it documents prior behavior.

**Consult:** `/ui-ux-developer` (mandatory per CLAUDE.md for UI changes).

**Risk:** Low. UI-only. No state schema, no sim effect, byte-stable for 40w hash.

---

## Phase B — Player-Faction Boundary And RS-First Test Fixtures

**Goal:** Restore/prove player-faction event surfacing without mutating gameplay scenario data for test convenience. Gameplay scenario JSON stays faction-neutral unless deliberately authored; tests use explicit RS fixtures for denser event coverage.

**Files:**
- `src/scenario/scenario_loader.ts` (validate an authored `player_faction` when present; missing/null remains absent)
- `src/scenario/scenario_runner.ts` (keep the legacy desktop/startup fallback isolated to harness/startup state, not JSON data)
- `tests/scenario_player_faction_contract.test.ts` (new/updated — missing/null remains faction-neutral; authored RS/HRHB/RBiH are preserved; invalid values reject)
- RS-first event-surfacing integration tests should use explicit test fixtures/state builders, not `data/scenarios/apr1992_*.json`

**Tests:**
- Existing scenario-loader tests.
- `tests/scenario_player_faction_contract.test.ts` — assert gameplay scenario normalization stays faction-neutral by default and RS can be selected explicitly in tests.
- Turn-1 integration: use an explicit RS test fixture/state builder to assert RS-owned military/political decision surfacing; use explicit RBiH fixtures only for RBiH-specific event ownership.
- Smoke triad: `tsc --noEmit` + `vitest run` + `desktop:map:build`.

**Calibration impact:** No gameplay scenario JSON changes in Phase B. If a later phase changes runtime faction defaults or event resolution, bracket with 40w scenario run + before/after diff and re-anchor in CALIBRATION_MASTER.md as needed.

**Consult:** `/canon-compliance-reviewer` (scenario schema), `/scenario-creator-runner-tester` (scenario data).

---

## Phase B+ — `player_faction` Contract Hardening + Null-Defect Audit

**Goal:** Phase B establishes the boundary between gameplay faction selection and test fixtures. Phase B+ removes masking fallbacks and inconsistent null-handling only after the product owner approves the runtime contract. After B+, active gameplay state has a selected `player_faction`; scenario JSON remains allowed to be faction-neutral.

**Source:** In-session 2026-05-17 sweep dispatched two parallel `Explore` agents across `src/sim`, `src/state`, `src/scenario`, `src/ui`, `src/desktop`. Findings: ~25 read sites with three different null-handling conventions — SKIP-WHEN-NULL (hides feature), OVERSHOW-WHEN-NULL (forgiving filter shows enemy content), NULL-MASKED-AS-RBIH (silent default in warroom suite). The OVERSHOW pattern silently leaks enemy-faction content into Presidential Inbox, Supply ledger, Operation Opportunity dossier, and Autonomy panel. The NULL-MASKED-AS-RBIH pattern in `warroom_utils.getPlayerFaction()` is reused by 11+ warroom files (Newspaper, Magazine, Diplomacy, Reports, IVP, Command Briefing, FactionOverview, Settings, WarPlanningMap), silently rendering everyone as RBiH regardless of intent.

### B+.1 — Tighten the type contract

**Files:**
- `src/state/game_state.ts` (active loaded gameplay state should carry `player_faction`; do not require all scenario JSON to author it)
- `src/state/validateGameState.ts` (already added in Phase B — confirm it asserts on the non-optional type)
- `src/state/migration.ts` (new migration step — route legacy saves without `player_faction` through the same gameplay selection/default policy used by desktop startup; do not encode this in scenario JSON)

**Outcome:** Runtime gameplay surfaces receive an explicit selected faction, while scenario definitions can remain faction-neutral. TypeScript hardening should target loaded gameplay/read-model boundaries, not raw scenario JSON.

### B+.2 — Consolidate the matchesPlayerFaction helpers

**Files:**
- `src/ui/map/data/inboxItems.ts` (modify — collapse the 4 call sites at lines 35-37, 89, 133, 192, 211 onto one canonical helper)
- `src/ui/map/data/operationOpportunityLedger.ts:147-148` (modify — use the same helper)
- `src/ui/map/data/GameStateAdapter.ts:80, 263-265` (modify — use the same helper)
- `src/ui/map/components/AutonomyPanel.tsx:46-47` (modify — use the same helper)
- New: `src/ui/map/data/playerFactionMatch.ts` (canonical helper, exported once; semantics: strict match, no fallback)

**Outcome:** One predicate, one semantics. Removing the `!playerFaction || ...` short-circuit means filters strictly match; with B+.1 the helper can drop the null branch entirely.

### B+.3 — Remove the warroom RBiH fallback

**Files:**
- `src/ui/warroom/components/warroom_utils.ts:218-220` (remove the `?? 'RBiH'` and `(gameState.factions[0]?.id) || 'RBiH'` fallbacks; return `gameState.meta.player_faction` directly — type now guarantees non-null)
- All 11+ warroom consumers of `getPlayerFaction()` — verify TypeScript stays green; no behavior change at sites that already feed the function `gameState`.

**Outcome:** Warroom Newspaper/Magazine/Diplomacy/Reports/IVP/Command Briefing/FactionOverview/Settings/WarPlanningMap all now render the *configured* faction. After B+.1 + B+.2 land, this removal is dead-code cleanup, not a behavior change.

### B+.4 — Audit SKIP-WHEN-NULL sim sites

**Files (audit + simplify):**
- `src/sim/turn_phases/war_phases.ts:1059-1060, 1095-1096, 1154, 1255, 1292-1293, 1315-1316, 1369-1370` — remove the now-dead `playerFaction == null` branches; confirm the kept branch matches intent.
- `src/sim/combat/paramilitary_sweep.ts:218, 362` — same; the player's paramilitary policy will start *actually applying* now.
- `src/sim/political/political_directive_producer.ts:280` — same.
- `src/sim/codex/dynamic_section_builder.ts:178-179` — remove the `?? 'RBiH'` fallback; type guarantees non-null.

**Outcome:** Several features start running for the first time: assisted stance recommendations (autonomy_level=1), stance proposals, opportunity proposals, paramilitary policy enforcement. **This is a real behavior change**, not a cleanup.

### B+.5 — Audit SKIP-WHEN-NULL UI sites

**Files (audit + simplify):**
- `src/ui/shared/playerVisibility.ts:81` — remove `if (!playerFaction) return [...state.formations]` fallback; type now guarantees.
- `src/ui/map/App.tsx:689, 701` — `selectPrimaryArmy` / `selectPrimaryCorps` buttons will now work.
- `src/ui/map/components/PresidentialInbox.tsx:226-230` — OpeningBrief now always renders.
- `src/ui/map/data/presidentialDecisionRoom.ts:1105-1107` — Decision Room empty state `hasPlayerFaction: false` branch becomes unreachable; remove.
- `src/ui/warroom/components/NewsTicker.ts:126` — news ticker now always populates.
- `src/ui/map/data/turnAftermath.ts:218-220, 495-499` — casualty relevance and territory flip direction will now compute against a real faction.

**Outcome:** Multiple surfaces that have been silently empty start showing real content. Visual QA pass required.

### B+.6 — Tests

**Files:**
- `tests/state/player_faction_contract.test.ts` (new — `player_faction` field is non-optional in type; validateGameState rejects null; migration converts legacy saves)
- `tests/ui/inboxItems.faction_scope.test.ts` (new — inbox does NOT show enemy-faction items when playerFaction is set; confirms removal of the OVERSHOW fallback)
- `tests/ui/warroom_player_faction.test.tsx` (new — warroom helpers return configured faction, no RBiH default)
- `tests/sim/paramilitary_player_policy.test.ts` (new — player paramilitary policy now applies; ask/allow/deny routes through UI)
- Smoke triad mandatory: `tsc --noEmit` + `vitest run` + `desktop:map:build`. TypeScript will catch every site that hasn't been updated.

### B+.7 — Calibration impact

**Expected drift:** 40w + 188w hashes WILL move. Behavior changes that flip-on:
- Paramilitary policy enforcement for player faction.
- Assisted stance recommendations + opportunity proposals at autonomy_level=1.
- Decision Room cards actually populate (player can now see them; if any auto-accept logic exists, it may now fire).

**Mitigation:** Bracket as `LANE-V09X-PLAYER-FACTION-CONTRACT` with before/after 40w + 188w runs. Document drift in `docs/40_reports/CALIBRATION_MASTER.md`. Re-anchor anchors/benchmarks if they shift; do not chase pre-fix hashes — they were produced by a defective null state.

### B+.8 — Risks

| Risk | Mitigation |
|---|---|
| Visual/UX baselines tuned against the silent RBiH warroom default | After B+.3, re-screenshot warroom for each faction (RBiH/RS/HRHB) and decide if palette tweaks needed; content QA, not a code blocker. |
| Existing saves lack `player_faction` field | B+.1 migration sets default + warns; assertion in validateGameState is non-fatal for migrated saves. |
| A legitimate consumer was relying on the OVERSHOW fallback to *intentionally* show cross-faction content (e.g., debug/observer view) | Grep for any explicit `player_faction = null` writes; if found, route them through a separate `observer_mode` flag instead of overloading `player_faction`. |
| Test suite has expected values built against the broken state | Each B+.x lane runs vitest before claiming green; update expected values per lane, do not bulk-update. |

### B+.9 — Consult

- `/canon-compliance-reviewer` (state schema tightening).
- `/systems-programmer` (type contract change).
- `/ui-ux-developer` (warroom render verification after fallback removal).
- `/determinism-auditor` (calibration drift documentation).

---

## Phase C — Two-Level Event Surfacing

### C.1 — State Schema

**Files:**
- `src/state/game_state.ts` (add `pending_event_notifications: EventNotification[]` under `state.military` or new `state.intelligence` branch)
- `src/state/serialize.ts` (round-trip)
- `src/state/validateGameState.ts` (shape check)

**Type:**
```ts
interface EventNotification {
  notification_id: string;              // `${event_id}:${source_faction}:${target_faction}`
  event_id: string;
  source_faction: FactionId;            // who took the action
  target_faction: FactionId;            // recipient
  response_id: string;                  // which option was selected
  surfaced_on_turn: number;             // = decision_turn + 1
  headline: string;                     // authored
  body: string;                         // authored
  consumed: boolean;                    // true once player opens / dismisses
}
```

**Determinism:** sorted iteration over factions when emitting; `strictCompare` on `notification_id`.

**Consult:** `/canon-compliance-reviewer`, `/systems-programmer`.

### C.2 — Event JSON Schema Extension

**Files:**
- `data/scenarios/events/war_1992.json` (extend `rs_strategic_goals`, `rbih_state_identity` first)
- `src/sim/events/event_types.ts` (add the type below to the event definition)

**Type (per D1 decision — per-recipient text):**
```ts
notifications_to_other_factions?: Record<
  string,                                          // response_option_id
  Partial<Record<FactionId, {                      // recipient faction
    headline: string;
    body: string;
  }>>
>;
```

**Shape:**
```json
"notifications_to_other_factions": {
  "all_six": {
    "RBiH": {
      "headline": "RS Assembly endorses Six Strategic Goals",
      "body": "Belgrade-aligned deputies adopt Karadžić's territorial maximalist platform. Sarajevo intelligence reads this as a hardening of war aims; federal options narrow."
    },
    "HRHB": {
      "headline": "Karadžić Assembly clarifies territorial reach",
      "body": "RS adoption of the Six Goals sharpens the corridor and ethnic-separation claims that bear on western Herzegovina; Mostar leadership weighs patron consultation."
    }
  },
  "selective": { "RBiH": { "headline": "...", "body": "..." }, "HRHB": { "headline": "...", "body": "..." } },
  "aggressive": { "RBiH": { "headline": "...", "body": "..." }, "HRHB": { "headline": "...", "body": "..." } }
}
```

**Emission contract:** for each recipient `f` in `[RBiH, RS, HRHB] \ source_faction`, lookup `notifications_to_other_factions[response_id][f]`. If absent for a given recipient (sparse authoring), skip that recipient with a warn-log; the source-faction event still resolves. No fallback text — silent skip is preferable to broadcasting wrong-faction framing.

**Consult:** `/historian` (mandatory for historical claims), `/narrative-designer` (prose authoring; must produce two distinct faction-tinted bodies per option).

### C.3 — Emission Logic

**Files:**
- `src/sim/events/evaluate_events.ts` (modify — when `respondingFaction` resolves and respondent is AI, immediately resolve via `applyAIDefaultResponse(...)` then call `emitNotifications(...)`)
- `src/sim/events/resolve_decision.ts` (or wherever `pending_event_decisions` items are popped on player response — add `emitNotifications(state, def, response_id, source_faction, currentTurn)` at the end)
- `src/sim/events/emit_notifications.ts` (new — pure helper that pushes one `EventNotification` per `[RBiH, RS, HRHB] \ source_faction` recipient with `surfaced_on_turn = currentTurn + 1`)
- `src/sim/events/ai_default_response.ts` (new — deterministic policy; v1 picks `response_options[0]`, gated by per-event override map for canonical defaults)
- `src/sim/turn_phases/war_phases.ts` (add early-turn phase step `surface-event-notifications`)
- `src/sim/turn_phases/peace_phases.ts` (same)

**Behavior:**
- Player respondent: `pending_event_decisions` queued as today; notifications emitted on response resolution.
- AI respondent: resolution + notification emission happen in the same `evaluateEvents` step.
- Notification surfacing: a phase step drains `pending_event_notifications` where `surfaced_on_turn <= currentTurn && !consumed` into the recipient inbox via the projection in C.4.

**Consult:** `/gameplay-programmer`, `/determinism-auditor`.

### C.4 — UI / Inbox Projection

**Files:**
- `src/ui/map/data/inboxItems.ts` (add notifications loop alongside `eventDecisions`; filter `target_faction === playerFaction && surfaced_on_turn <= currentTurn && !consumed`; render as `kind: 'intelligence_notification'`)
- `src/ui/map/data/types.ts` (add `'intelligence_notification'` to the inbox `kind` union)
- `src/ui/map/components/IntelligenceNotificationCard.tsx` (new — small read-only card with "INTEL" badge, dismiss button)

**Behavior:** Notifications appear in Presidential Inbox with a distinct badge. No response options. Dismiss sets `consumed = true`. Not a pre-advance blocker.

**Explicitly NOT in scope:** `src/state/player_decision_manifest.ts`. The manifest exists for *decisions* with advance-gate classification per `20260516_PRESIDENTIAL_DECISION_SURFACE_CORRECTNESS.md`. Notifications are informational, never block advance, and must not enter the manifest — that would force a gate policy where none belongs.

**Consult:** `/ui-ux-developer` (mandatory).

### C.5 — Tests

**Files:**
- `tests/sim/events/two_level_surfacing.test.ts` (new)
- `tests/state/serialize.notifications.test.ts` (new)
- `tests/ui/inboxItems.notifications.test.ts` (new)

**Cases:**
- Player as RS triggers `rs_strategic_goals`, picks `all_six`, advance 1 turn → RBiH and HRHB each have a matching `EventNotification` with `surfaced_on_turn === 2` and the right headline.
- Player as RBiH, AI-driven RS picks default response → RBiH gets the notification at turn 2 even though never saw the modal.
- Serialize round-trip of `pending_event_notifications`.
- Inbox projection respects `target_faction` and `surfaced_on_turn` gating.
- Determinism: same scenario → byte-stable `notification_id` and ordering across two runs.

### C.6 — Calibration Impact

40w hash WILL drift (new state field serialized; AI default responses may drive downstream effects). Run 40w + 188w before/after, document expected drift in CALIBRATION_MASTER.md, re-anchor.

---

## Phase D — Notification Content Backfill

After C.5 lands, sweep `data/scenarios/events/war_*.json` to add `notifications_to_other_factions` for every `requires_player_response` event. Per D1 (per-recipient text), each event needs **~6 authored blocks**: one `{headline, body}` per (response option × non-source recipient faction) pair. For an event with 3 options and 2 non-source recipients, that's 6 distinct authored bodies tinted to each recipient's strategic frame. `/historian` reviews factual claims for both recipient framings; `/narrative-designer` ensures the two framings are genuinely distinct (federal-tilt vs patron-tilt vs Belgrade-tilt depending on recipient) and not just paraphrases.

**Tracking file (new):** `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md` — checklist by event × response_option × recipient_faction × authored-yes/no. Sparse coverage is engine-tolerated during backfill (per C.2 silent-skip contract), but the tracker's terminal state must be 100% coverage before v1.0 ship.

---

## Recommended Sequence

1. **Today:** Phase A + corrected Phase B (small, immediate value; proves surfacing with explicit RS-first test fixtures and leaves gameplay scenario JSON faction-neutral).
2. **Next:** Phase B+ (contract hardening + null-defect audit; expect calibration drift, re-anchor). Must land before Phase C.3 emission logic so the AI-default-response policy runs against a clean contract.
3. **Then:** Phase C.1 — C.3 behind `AWWV_TWO_LEVEL_NOTIFICATIONS` feature flag.
4. **Following:** Phase C.4 — C.5, flip flag on.
5. **Ongoing:** Phase D content backfill in parallel with anything else.

---

## Files Touched (Preview)

```
src/ui/map/components/CodexPanel.tsx                                 [A]
src/scenario/scenario_loader.ts                                      [B]
src/state/validateGameState.ts                                       [B, B+.1, C.1]
tests/scenario_player_faction_contract.test.ts                       [B]
RS-first event-surfacing test fixtures/state builders                 [B, C.5]
src/state/game_state.ts                                              [B+.1, C.1]
src/state/migration.ts                                               [B+.1]
src/ui/map/data/playerFactionMatch.ts (new)                          [B+.2]
src/ui/map/data/inboxItems.ts                                        [B+.2, C.4]
src/ui/map/data/operationOpportunityLedger.ts                        [B+.2]
src/ui/map/data/GameStateAdapter.ts                                  [B+.2]
src/ui/map/components/AutonomyPanel.tsx                              [B+.2]
src/ui/warroom/components/warroom_utils.ts                           [B+.3]
src/sim/turn_phases/war_phases.ts                                    [B+.4, C.3]
src/sim/combat/paramilitary_sweep.ts                                 [B+.4]
src/sim/political/political_directive_producer.ts                    [B+.4]
src/sim/codex/dynamic_section_builder.ts                             [B+.4]
src/ui/shared/playerVisibility.ts                                    [B+.5]
src/ui/map/App.tsx                                                   [B+.5]
src/ui/map/components/PresidentialInbox.tsx                          [B+.5]
src/ui/map/data/presidentialDecisionRoom.ts                          [B+.5]
src/ui/warroom/components/NewsTicker.ts                              [B+.5]
src/ui/map/data/turnAftermath.ts                                     [B+.5]
src/state/serialize.ts                                               [C.1]
data/scenarios/events/war_1992.json (and 1993/94/95)                 [C.2, D]
src/sim/events/event_types.ts                                        [C.2]
src/sim/events/evaluate_events.ts                                    [C.3]
src/sim/events/resolve_decision.ts                                   [C.3]
src/sim/events/emit_notifications.ts (new)                           [C.3]
src/sim/events/ai_default_response.ts (new)                          [C.3]
src/sim/turn_phases/war_phases.ts                                    [C.3]
src/sim/turn_phases/peace_phases.ts                                  [C.3]
src/ui/map/data/inboxItems.ts                                        [C.4]
src/ui/map/data/types.ts                                             [C.4]
src/ui/map/components/IntelligenceNotificationCard.tsx (new)         [C.4]
tests/...                                                            [A, B, C]
docs/PROJECT_LEDGER.md                                               [A, B, C]
docs/PROJECT_LEDGER_KNOWLEDGE.md                                     [C.3]
docs/10_canon/ (Engine Invariants + Systems Manual)                  [C.1]
docs/40_reports/GUI_MASTER.md                                        [A, C.4]
docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md (new)                 [D]
```

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| 40w hash drift from new state field (C.1) | Behind feature flag; re-anchor calibration in dedicated commit. |
| AI default response picks an ahistorical option that locks bad consequences | v1 policy = `response_options[0]`; add per-event canonical-default override map for the few decisions where default matters (consult `/historian`). |
| Notification text accuracy for sensitive-history events | Route all notification bodies through `/historian` review before merge. Treat as Ring-2 per `/game-designer §3.4` if any sensitive-history OSID is referenced. |
| Test coverage accidentally changes gameplay faction defaults | Keep RS-first coverage in explicit fixtures/state builders; do not mass-edit gameplay scenario JSON. |
| Notification spam if every event fires for all 3 factions | C.4 inbox projection should cap visible notifications per turn at 5 with "+N more" overflow; surplus stays in queue. |

---

## Out of Scope

- AI faction multi-turn deliberation systems.
- Runtime localization of per-recipient notification text.
- Notification text translation/localization (deferred to v1.1 "Mother Tongue").
- Codex render-state for never-defined essays (not a real case; `essay_index.json` is the only source).
- Reverting or modifying `ghost_when` semantics — they remain GAME_OVER-gated and correct.

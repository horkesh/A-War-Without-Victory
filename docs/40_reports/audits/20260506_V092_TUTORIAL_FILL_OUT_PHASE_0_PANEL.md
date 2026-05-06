# v0.9.2 Tutorial Fill-Out Phase 0 Panel

**Lane:** `LANE-NIGHTSHIFT-TUTORIAL-FILL-OUT-PHASE-0-PANEL`
**Date:** 2026-05-06
**Type:** AUDIT-ONLY (Ring 1, no source / test / scenario / canon code touched)
**Mandate:** v1.0 ship-readiness sprint — tutorial onboarding is a v1.0 ship-blocker per master roadmap.
**Scope:** Inventory of current tutorial state + 3-5 lane plan for content/integration fill-out + acceptance criteria + stop triggers.
**Sibling lanes (file-disjoint):** Codex Wave 4 (data/codex), A11y Phase 0 (different audit file), Perf Phase 0 (different audit file).

---

## 0. Executive Summary

Two tutorial systems exist in parallel and are **NOT integrated**:

1. **`OnboardingOverlay` (UI overlay, the canonical v0.9.2 surface)** — 8 step-card flow shipped in commit `d6da6ad4` (LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1). Reads/writes `meta.tutorial_state` via three IPC handlers (`tutorial:dismiss`, `tutorial:advance-step`, `tutorial:restart`). Mounted at App root (`appScreen === 'game' && loadedGameState`). Body copy already 30-60 word CoS-briefing voice, faction-agnostic, 8/8 step targets resolved (one as `null` welcome anchor, seven as `data-tutorial-step` tokens). 5/5 contract tests GREEN (`tests/tutorial_content_v1.test.ts`).

2. **`TUTORIAL_OBJECTIVES` (sim-side learn-by-doing objective list, LEGACY)** — 11-objective task list at `src/sim/tutorial/tutorial_objectives.ts`. Action-triggered (`orbat_opened`, `corps_stance_changed`, etc.). Has its own `TutorialState` shape that **does not match** `meta.tutorial_state`. Selectors are `[data-tutorial="..."]` (different attribute namespace from the onboarding overlay's `data-tutorial-step="..."`). 7/7 contract tests GREEN (`tests/tutorial_objectives.test.ts`). **Not wired into any UI host** — there is no objective-tracker component reading `TUTORIAL_OBJECTIVES`, no action dispatch path firing the `actionTrigger` strings, and no host that consumes `getCurrentObjective(...)`.

The overlay flow is content-complete and structurally sound. The fill-out work is therefore primarily about (a) wiring depth, (b) coverage gaps the 8-step pass deliberately deferred, (c) reconciling the legacy objective list (delete vs. resurface as a learn-by-doing follow-on layer), (d) telemetry / first-run gating, and (e) accessibility.

**Bottom line:** v0.9.2 tutorial **skeleton + first-pass content is shipped**. Fill-out is mid-priority polish + integration work, not foundational rebuild.

---

## 1. PHASE 1 — Inventory Of Current Tutorial State

### 1.1. Predecessor Commits

| Commit | Date | Lane | Scope |
|---|---|---|---|
| `eb4e3460` | (early) | (legacy) | feat(tutorial): tutorial objective system + overlay + codex shell |
| `0ea3fa96` | (legacy) | — | chore: bump version to v0.5.2 — Tutorial & Onboarding |
| `58d08507` | (legacy) | LANE-NIGHTSHIFT-G2+G4+G5 | feat(ui): mission E G2 + G4 + G5 — onboarding, opportunity pulse, severity pip |
| `e4c661d5` | 2026-05-03 | LANE-NIGHTSHIFT-ROUND2 | Round-2 six-lane ship — included tutorial **skeleton** (state-meta + IPC + 3 placeholder steps) |
| `d6da6ad4` | 2026-05-04 | LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1 | feat(ui): tutorial content v1 — 8 first-session steps + restart IPC (this is the current authoritative content layer) |

`d6da6ad4` is the live state. It replaced the 3-step skeleton with 8 real steps, added `tutorial:restart` IPC, and wired `data-tutorial-step` anchors into 6 host components.

### 1.2. The 8-Step Onboarding Overlay (Authoritative)

Source: `src/ui/map/components/onboarding/onboardingSteps.ts`.

| # | id | Title | `target_ui_element` | Status |
|---|---|---|---|---|
| 1 | `01_welcome` | You Are the President | `null` (overlay-self) | Content complete, anchor implicit |
| 2 | `02_map` | Reading the Map | `map-container` | Content complete, **anchor MISSING in source — see §1.3** |
| 3 | `03_brief` | The Brief | `presidential-toolbar` | Content + anchor complete |
| 4 | `04_inspect` | Inspect Before You Decide | `warroom-status-bar` | Content + anchor complete |
| 5 | `05_decide` | The Decision Room | `decision-room` | Content + anchor complete |
| 6 | `06_execute` | Operations | `army-hq-tab-briefing` | Content + anchor complete |
| 7 | `07_report` | Advance and Read the Aftermath | `advance-turn-button` | Content + anchor complete |
| 8 | `08_judge` | The Cost Ledger | `cost-ledger` | Content + anchor complete |

Each body is 30-60 words, faction-agnostic (test-enforced, T2 in `tutorial_content_v1.test.ts`), CoS-briefing voice, lexicographic `id` ordering deterministic.

### 1.3. `data-tutorial-step` Anchor Inventory (Source Files)

Found via `Grep -r "data-tutorial-step" src/`:

| Anchor token | File | Status vs. step list |
|---|---|---|
| `presidential-toolbar` | `src/ui/map/components/PresidentialToolbar.tsx:223` | step 03 — WIRED |
| `advance-turn-button` | `src/ui/map/components/PresidentialToolbar.tsx:408` | step 07 — WIRED |
| `warroom-status-bar` | `src/ui/map/components/warroom/WarroomStatusBar.tsx:191` | step 04 — WIRED |
| `decision-room` | `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx:365` | step 05 — WIRED |
| `army-hq-tabs` | `src/ui/map/components/army_hq/ArmyHQModal.tsx:283` | unused by step list (orphan-ish; available for future) |
| `army-hq-tab-${id}` | `src/ui/map/components/army_hq/ArmyHQModal.tsx:290` | step 06 expects `army-hq-tab-briefing` — VERIFIED: `HQ_TABS[0] = { id: 'briefing', label: 'BRIEFING' }` (ArmyHQModal.tsx:35), so `data-tutorial-step="army-hq-tab-briefing"` IS emitted **only when the Army HQ modal is open**. Runtime-conditional anchor — the spotlight cannot resolve unless the player has the modal open at the moment step 06 fires. Documented exemption candidate (AC-5) or step 06 needs to chain "open Army HQ first" guidance. |
| `cost-ledger` | `src/ui/map/components/WarCostSummary.tsx:65` | step 08 — WIRED |
| `<welcome-self>` | `src/ui/map/components/onboarding/OnboardingOverlay.tsx:129` (overlay sets its own attribute when target is null) | step 01 — WIRED (welcome) |

**Anchor gaps:**

- **`map-container` (step 02 `02_map`)** — listed in `TUTORIAL_SPOTLIGHT_TARGETS` but **NO source file currently emits `data-tutorial-step="map-container"`**. The lane spec in commit `d6da6ad4` explicitly notes: *"MapContainer.tsx untouched (Mission A's exclusive territory). map-container token reserved in TUTORIAL_SPOTLIGHT_TARGETS for Mission A to wire when ready."* This is a **deliberate deferred wire**, not a regression. Step 02 still renders (overlay handles missing anchor by falling back to centered card), but the spotlight target cannot resolve. Counted as a coverage gap in §2.A.
- **`army-hq-tab-briefing`** — depends on tab strip rendering a tab with id `briefing` whose own `data-tutorial-step` attribute is set via dynamic interpolation. Needs runtime verification (tabs are typically only rendered while the modal is open).

### 1.4. `meta.tutorial_state` Save-Schema Field

Source: `src/state/game_state.ts:1304-1314` — `StateMeta.tutorial_state?: { dismissed: boolean; current_step?: string; completed_steps: string[] }`. Optional (older saves treated as "not yet dismissed"). UI-only, sim does not read. Round-trip byte-stable (T1 in `tutorial_onboarding_skeleton.test.ts`).

### 1.5. IPC Surface

`src/desktop/electron-main.cjs` exposes:

- `tutorial:dismiss` (line 3013)
- `tutorial:advance-step` (line 3028) — idempotent append, current_step updates
- `tutorial:restart` (line 3055) — resets `dismissed=false`, `current_step=undefined`, `completed_steps=[]`

All three go through `readCanonicalCurrentState` / `writeCanonicalCurrentState` so tutorial state round-trips through the canonical serializer.

`src/desktop/preload.cjs` and `src/ui/map/desktop/useIPC.ts` expose the bridge to the renderer.

### 1.6. Host Mount

`src/ui/map/App.tsx:182-203` defines `OnboardingOverlayWrapper`. Mounted at line 987:

```
{appScreen === 'game' && loadedGameState && <OnboardingOverlayWrapper />}
```

Visibility predicate inside overlay (`shouldShowOnboarding`): treats `undefined` / `null` tutorial_state as "not yet dismissed" so overlay shows on a fresh campaign. Faction-agnostic (no `player_faction` gate).

### 1.7. Tests

| File | Suite | Tests | Status |
|---|---|---|---|
| `tests/tutorial_onboarding_skeleton.test.ts` | LANE-NIGHTSHIFT-ROUND2 | 3 (T1 round-trip, T2 dismiss, T3 advance-step) | GREEN |
| `tests/tutorial_content_v1.test.ts` | LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1 | 5 (T1 ordering, T2 targets/copy, T3 dismiss, T4 restart, T5 round-trip) | GREEN |
| `tests/tutorial_objectives.test.ts` | (legacy sim layer) | 7 | GREEN — but **the system under test is not wired anywhere** |
| `tests/modal_migration.test.ts` etc. | Wave 1+2+3 | M4 invariant: `data-tutorial-step` anchors not stripped/added by migration | GREEN |

### 1.8. Legacy `TUTORIAL_OBJECTIVES` System

Source: `src/sim/tutorial/tutorial_objectives.ts` — 11 objectives (review_forces, check_frontline, read_briefing, set_corps_stance, fortify_sarajevo, check_supply, launch_operation, respond_to_event, check_diplomacy, consult_advisor, survive).

**Status: ORPHANED**

- `Grep` finds zero importers of `tutorial_objectives.ts` outside the test file.
- No UI component renders the current objective.
- No action dispatch dispatches the trigger strings (`orbat_opened`, etc.).
- Selectors use `[data-tutorial="..."]` — incompatible namespace from the new `data-tutorial-step` token system.
- "Fortify Sarajevo" objective hard-codes a faction-coupled action (faction-agnostic violation).

This system is **dead code today**, but represents the **learn-by-doing layer** the commit `d6da6ad4` description implies is reserved for future fill-out. Decision required (LANE B, §2.B): delete vs. resurface.

### 1.9. State-Machine Coverage

| Capability | Status |
|---|---|
| Step ordering (lexicographic, deterministic) | DONE |
| Skip / dismiss at every step | DONE (overlay `Skip Tutorial` button) |
| Persistent "completed" flag | DONE (`meta.tutorial_state.dismissed`) |
| Restart action | DONE (overlay `OnboardingRestartButton` + `tutorial:restart` IPC) |
| Auto-mount only when in-game | DONE (`appScreen === 'game' && loadedGameState`) |
| Restart-button host (Help menu / settings) | **NOT MOUNTED** — `OnboardingRestartButton` is exported but no App-shell consumer mounts it |
| Per-step "Back" / scrub | NOT IMPLEMENTED (one-way advance only) |
| Contextual triggers (open this step when player opens Decision Room) | NOT IMPLEMENTED (linear walkthrough only) |
| First-time vs. returning detection | Partial (visibility = `dismissed !== true`; no separate "returning user" gate) |
| Tutorial-completed milestone (all-8-done) | **PARTIAL** — overlay returns `null` when no next step, but no auto-dismiss writer fires; comment: *"auto-dismiss path is owned by the App shell / IPC handler"* — the App shell does not currently call `dismissTutorial` after step 8 is advanced. Visible symptom: a player who completes all 8 steps gets the overlay re-shown on next launch (still `dismissed=false`) but with no next step → renders nothing → invisible state. |
| Telemetry (which step the player skipped at) | NOT IMPLEMENTED |
| Accessibility (focus mgmt, keyboard nav, ARIA) | NOT IMPLEMENTED — no `role="dialog"`, no focus trap, no `aria-labelledby`, no Esc-to-skip |

---

## 2. PHASE 2 — Proposed Lanes (3-5)

Five lanes proposed. Sequencing constraint: **B before A** (state-machine plumbing first, then richer content authored against it). C and E parallel-safe with B once B's substrate is stable. D is autonomous-friendly throughout.

### Lane A — Tutorial Step Content Expansion + Coverage Gaps

**Owner roles:** Narrative Designer (copy), UI/UX Developer (anchor wiring), Product Manager (scope arbitration).

**File ownership (proposed):**
- `src/ui/map/components/onboarding/onboardingSteps.ts` (extend step list)
- `src/ui/map/components/MapContainer.tsx` (Mission A territory; **needs cross-lane handoff** — Mission A wires `data-tutorial-step="map-container"`)
- `src/ui/map/components/army_hq/ArmyHQModal.tsx` (verify `army-hq-tab-briefing` resolves at overlay-query time)
- New copy review pass for all 8 existing bodies (canon-compliance recheck)
- `tests/tutorial_content_v1.test.ts` (extend assertion set)

**Estimated content/code size:** ~150-300 LoC (mostly new step entries + tests). Wiring `map-container` is ~5 LoC in MapContainer plus a test assertion. Ten new steps would add ~80 LoC of content + ~40 LoC of tests.

**Risk class:** Low. Content-only, faction-agnostic, deterministic. Risk concentrated at the Mission A handoff.

**Sequencing dependency:** Wait until B ships per-step "back" / scrub if those are part of the new step structure; otherwise parallel-safe.

**Scope candidates for new steps (all autonomous-friendly except where flagged):**
- `09_corps_orders` — explain corps stance / orders panel (anchor: corps stance picker, exists in OOB sidebar — needs ID confirm)
- `10_supply` — supply map mode (anchor: map-mode toggle, NEEDS-AUTHORING)
- `11_friction` — command friction explanation (anchor: command-review surface, depends on which review UI is canonical post-v0.8.4)
- `12_events` — divergence event modal (anchor: event modal close button, exists in modal-migration Wave 3)
- `13_save_load` — save / load is a real operation (anchor: file menu)
- **STOP-AND-ASK candidates:** narrative voice direction for "loss is the point" framing in step `08_judge` extension; whether to add a "tutorial scenario" preset distinct from the historical April 1992 start.

**Coverage gap to close (deferred from `d6da6ad4`):** wire `map-container` anchor into MapContainer.tsx. **One-line attribute add.**

**Autonomous-friendly:** Yes for anchor-wiring + 4-6 new steps following the existing voice. **Needs user direction** for narrative tone extensions and any tutorial-scenario branching.

### Lane B — Tutorial State-Machine Hardening

**Owner roles:** UI/UX Developer, Gameplay Programmer, Systems Programmer (save-schema review).

**File ownership (proposed):**
- `src/ui/map/components/onboarding/OnboardingOverlay.tsx` (back / scrub, auto-dismiss after final step)
- `src/desktop/electron-main.cjs` (IPC handlers — auto-dismiss-on-completion, contextual-trigger handler if added)
- `src/state/game_state.ts` (extend `tutorial_state` shape if needed — "completed_at_turn" milestone, "first_run" flag)
- `src/ui/map/App.tsx` (mount `OnboardingRestartButton` in Help / Settings)
- `tests/tutorial_onboarding_skeleton.test.ts` (extend with scrub + auto-dismiss tests)

**Estimated content/code size:** ~200-350 LoC.

**Risk class:** Medium. Touches save schema (substrate add). Subject to STOP rule: "Tutorial state-machine requires substrate addition (new save schema field) → defer to substrate-then-content lane." If `first_run` or `completed_at_turn` field is needed, lane splits into B0 (substrate, single small commit) → B1 (state-machine consumes substrate).

**Items:**
1. **Auto-dismiss after final step.** Currently when `resolveNextStep` returns `null`, overlay renders `null` but does not write `dismissed=true`. Two approaches: (a) overlay calls `ipc.dismissTutorial()` in a `useEffect` when next is null and dismissed is false; (b) the `tutorial:advance-step` handler detects "step 8 was just appended and is the final step" and writes `dismissed=true` in the same operation. **Approach (b) is more deterministic and is the recommended path.**
2. **Mount restart button.** `OnboardingRestartButton` is exported but unmounted. Wire it into the toolbar Help menu OR Settings drawer (host TBD — needs UI/UX developer scope decision).
3. **Per-step Back / scrub.** Optional — current overlay is one-way (Next / Skip only). Adds player goodwill but doubles state-machine surface area. **Recommendation: defer to v0.9.x post-1.0 unless playtest shows demand.**
4. **First-run vs. returning-user detection.** Today, ANY save without `tutorial_state` (or with `dismissed=false`) shows the overlay. Risk: a returning player loading an old save sees the tutorial. Add a `meta.tutorial_state.first_run_completed` flag set on first dismissal/completion that survives across saves (or persist at user level via `localStorage`). **STOP-AND-ASK:** is per-save or per-user the right granularity? Per-save is determinism-clean; per-user requires non-deterministic side-channel.
5. **Contextual triggers (stretch).** Open step 05 when player opens Decision Room for the first time, etc. Adds UX polish but requires a generic event-bus listener. **Recommendation: defer to post-1.0.**

**Sequencing dependency:** Sub-items 1+2 are no-dependency, low-risk. Sub-item 4 is the substrate item that could trigger the STOP rule.

**Autonomous-friendly:** Items 1, 2, 5-test. **Needs user direction:** items 3 (worth the complexity?), 4 (per-save vs per-user), 5 (deferred?).

### Lane C — Anchor Coverage + Modal-Migration Integration

**Owner roles:** UI/UX Developer.

**File ownership (proposed):**
- `src/ui/map/components/MapContainer.tsx` (add `data-tutorial-step="map-container"` — also touched by Lane A)
- One representative modal from each of Wave 1 / Wave 2 / Wave 3 verified to preserve existing anchors (already test-enforced via `modal_migration.test.ts` M4)
- `tests/onboarding_anchor_resolution.test.ts` (NEW) — runtime test that for each token in `TUTORIAL_SPOTLIGHT_TARGETS`, exactly one source file emits `data-tutorial-step="<token>"` (or there is a documented exemption for dynamic-tab anchors).

**Estimated content/code size:** ~80-150 LoC (mostly the new test file + ~5 LoC anchor add). The existing M4 invariant tests already protect modal-migration regressions.

**Risk class:** Low.

**Sequencing dependency:** Independent of A and B; can ship first.

**Autonomous-friendly:** Yes.

### Lane D — Tutorial Telemetry / Metrics

**Owner roles:** Gameplay Programmer + QA Engineer.

**File ownership (proposed):**
- `src/sim/telemetry/tutorial_metrics.ts` (NEW) — pure deterministic counters (no clock, no PII)
- `src/desktop/electron-main.cjs` (IPC handlers emit deterministic metrics line into existing telemetry sink, if one exists; otherwise NEW `data/derived/tutorial_metrics.ndjson` sink)
- `tests/tutorial_metrics.test.ts` (NEW)

**Captured signals:** which step the player skipped at, completion rate, restart count, average advance latency in turns. **No identifying data, no clock — derived from `meta.turn` deltas only.**

**Estimated content/code size:** ~150 LoC.

**Risk class:** Low (pure derived data) — but **STOP-AND-ASK:** does AWWV ship with any telemetry sink today? If not, this lane creates a new substrate (telemetry pipeline) for a polish feature. **Recommendation:** scope D to *file-local NDJSON sink only*, no network — purely for offline playtest analysis. Skip if the team hasn't decided whether to ship telemetry at all.

**Sequencing dependency:** Independent. Ships any time after B item 1 (so completion counter is correct).

**Autonomous-friendly:** Yes if scoped to local NDJSON sink. **Needs user direction** if any telemetry implies a network sink — that is a product decision.

### Lane E — Tutorial Accessibility (a11y)

**Owner roles:** UI/UX Developer + (handoff to A11y Phase 0 sibling lane for shared a11y patterns).

**File ownership (proposed):**
- `src/ui/map/components/onboarding/OnboardingOverlay.tsx` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, focus restore)
- `src/ui/map/components/onboarding/OnboardingStep.tsx` (button labels, `aria-describedby`)
- `tests/tutorial_a11y.test.ts` (NEW)

**Items:**
1. `role="dialog"` + `aria-modal="true"` + `aria-labelledby={titleId}` on overlay container.
2. Focus trap: tab cycles between Skip and Next; Esc invokes Skip.
3. Focus restore on dismiss.
4. Visible focus ring on overlay buttons.
5. Screen-reader announcement of step number ("Step 3 of 8: The Brief").

**Estimated content/code size:** ~120 LoC (overlay edits + tests).

**Risk class:** Low. Pure UI-layer.

**Sequencing dependency:** Coordinate with sibling A11y Phase 0 audit so a11y patterns don't diverge.

**Autonomous-friendly:** Yes, but **defer to A11y Phase 0 lane completion** so shared focus-trap / Esc-to-dismiss patterns can be inherited from there rather than diverging.

### Lane Summary Table

| Lane | Scope | Risk | Autonomous? | Sequencing |
|---|---|---|---|---|
| A | Step content + coverage gaps | Low | Mostly yes; narrative tone needs user direction | After B sub-items 1-2 |
| B | State-machine hardening | Medium | Items 1, 2 yes; items 3, 4, 5 need user direction | First (gates A) |
| C | Anchor coverage + modal integration | Low | Yes | Independent, ship anytime |
| D | Telemetry | Low if local-only | Yes if local NDJSON | Independent |
| E | Accessibility | Low | Yes, but coordinate w/ A11y Phase 0 | After B; coordinate w/ A11y Phase 0 |

---

## 3. PHASE 3 — Acceptance Criteria + Stop Triggers

### Acceptance Criteria (12)

1. **AC-1 First-run completion path.** A new player on a fresh save can advance through all 8 steps without dead-ends or invisible states. After step 8, overlay auto-dismisses and does not re-show on next save reload.
2. **AC-2 Skip at any step.** Skip button is enabled and functional on every step; sets `tutorial_state.dismissed=true` and preserves `completed_steps`. Idempotent on repeat skip.
3. **AC-3 Restart at any time.** `OnboardingRestartButton` is mounted in the App shell (Help menu or Settings) and invokes `tutorial:restart` IPC. After restart, overlay re-mounts at step `01_welcome` regardless of prior state.
4. **AC-4 Persistent completion flag.** `meta.tutorial_state.dismissed=true` survives save/load round-trips. (Already T1+T5 in tutorial_content_v1.test.ts; extend to verify post-step-8 auto-dismiss path.)
5. **AC-5 Anchor coverage.** Every token in `TUTORIAL_SPOTLIGHT_TARGETS` resolves to either (a) exactly one source file emitting `data-tutorial-step="<token>"`, or (b) a documented dynamic-anchor exemption (e.g. `army-hq-tab-briefing` rendered via interpolation). Test-enforced.
6. **AC-6 Modal-migration anchors preserved.** All `data-tutorial-step` JSX attributes carried by Wave 1+2+3 modals continue to be preserved. (Already enforced by `modal_migration*.test.ts` M4 — extend if Lane C adds new anchors.)
7. **AC-7 No host regressions.** Mounting / unmounting the overlay does not break existing modal / map / warroom behavior. Smoke: `tsc --noEmit` clean, `npm run test:vitest` GREEN, `desktop:map:build` succeeds.
8. **AC-8 Canon compliance + faction-agnostic copy.** All step bodies pass: no faction names (regex test enforces), no spoilers for events/divergences, voice consistent with CoS-briefing precedent. Re-audited by Narrative Designer + Historian on each new step.
9. **AC-9 Determinism.** Tutorial state in save: ordering by id lexicographic; `completed_steps` append-in-call-order; no clock, no `Math.random`. (Already T1 in `tutorial_content_v1.test.ts`.)
10. **AC-10 Faction-agnostic mechanism.** Overlay does NOT gate on `meta.player_faction`. Tests cover RBiH / RS / HRHB starting saves identically.
11. **AC-11 Full-flow integration test.** A new test file exercises the full 8-step flow: mount fresh → advance step 1 → advance step 2 → ... → advance step 8 → assert overlay null and `dismissed=true`. Pure / Electron-free using `applyAdvanceStepPure` mirror.
12. **AC-12 A11y baseline (if Lane E ships).** Overlay has `role="dialog"`, `aria-modal="true"`, focus trap, Esc-to-skip, focus restore. Test-enforced per A11y Phase 0 patterns.

### Stop Triggers (5)

- **ST-1 Anchor not found.** A tutorial step references a `data-tutorial-step` token that no current source file emits AND is not documented as a dynamic-anchor exemption → STOP. Either wire the anchor (cross-lane handoff to A or C) or remove the step. Do not ship a tutorial that points at a target that can never resolve.
- **ST-2 Narrative voice direction needed.** Tutorial copy requires user direction on tone (e.g. how heavy to lean on "loss is the point", whether to name the war by which name, whether to address the player as "you, the President" or third-person institutional voice) → STOP-AND-ASK. Default to existing CoS-briefing precedent only for already-shipped 8 steps; new steps require sign-off.
- **ST-3 Save-schema substrate addition.** Lane B item 4 (first_run flag) or any item that requires extending `meta.tutorial_state` shape → defer to substrate-then-content sequencing. Substrate ships in its own commit with its own canon/schema review before content lane consumes it.
- **ST-4 Telemetry network sink.** Lane D requires a network sink (vs. local NDJSON only) → STOP-AND-ASK. This is a product decision, not an implementation choice.
- **ST-5 Legacy `TUTORIAL_OBJECTIVES` reconciliation.** Decision required from Product Manager: delete `src/sim/tutorial/tutorial_objectives.ts` (it is currently dead code) OR resurface as a learn-by-doing post-overlay layer. **Either path ships in its own dedicated commit; not bundled with content fill-out.** STOP this audit at proposing the question; do not silently delete or silently re-wire.

---

## 4. Reading Order For The Implementer

1. This audit (overview).
2. `src/ui/map/components/onboarding/onboardingSteps.ts` (the canon step list).
3. `src/ui/map/components/onboarding/OnboardingOverlay.tsx` (the overlay component + IPC bridge contract).
4. `src/desktop/electron-main.cjs` lines 3013-3070 (IPC handlers — single owner of `meta.tutorial_state` writes).
5. `src/state/game_state.ts:1304-1314` (`StateMeta.tutorial_state` shape).
6. `tests/tutorial_content_v1.test.ts` (the contract tests; extend, don't replace).
7. `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md` (the original v0.9.2 plan — phases 1-5 framework still applies; this audit finishes Phase 1 and starts Phase 2).
8. `src/sim/tutorial/tutorial_objectives.ts` (the LEGACY learn-by-doing system; orphaned; reconciliation required per ST-5).

---

## 5. Out-Of-Scope For This Audit

- No source code touched.
- No engine sim changes.
- No canon edits.
- No tutorial copy authored or rewritten.
- Sibling lanes (Codex Wave 4, A11y Phase 0, Perf Phase 0) are separate audit files and separate file-disjoint lanes.

---

## 6. Open Questions Surfaced For User

1. **(ST-2)** Should new tutorial steps add stronger "this is a tragedy, you cannot win" framing, or stay procedural like the existing 8?
2. **(ST-3)** Acceptable to add a `first_run_completed` flag to `meta.tutorial_state`? Scope: per-save? per-user (localStorage)?
3. **(ST-4)** Tutorial telemetry — local NDJSON only, or any plan for network sink?
4. **(ST-5)** Legacy `TUTORIAL_OBJECTIVES` (11 sim-side learn-by-doing objectives, currently orphaned) — delete, or resurface as a follow-on layer after the 8-step overlay completes?
5. **(Lane B item 3)** Per-step Back / scrub navigation — implement now, or defer post-1.0?
6. **(Lane B item 5)** Contextual triggers (open step on first interaction with a UI surface) — implement now, or defer post-1.0?

---

**END OF AUDIT — `LANE-NIGHTSHIFT-TUTORIAL-FILL-OUT-PHASE-0-PANEL`**

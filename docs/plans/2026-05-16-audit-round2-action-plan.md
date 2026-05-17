# Audit Round 2 — Consolidated Action Plan

**Date:** 2026-05-16
**Lane:** Studio Health / Repo Truth + UI/product polish (mixed)
**Status:** O7-O9 implemented 2026-05-16; O10 deferred; O11 operator-only
**Source:** `docs/40_reports/audits/20260516_CODE_AUDIT.md` Round 2 (Findings 7–12)
**Sister plans:**
- `docs/plans/2026-05-16-working-tree-eol-normalization-plan.md` (Findings 1+4)
- `docs/plans/2026-05-16-ops-planning-modal-target-discovery-plan.md` (the same playtest's UX gap)

---

## Scope

Six findings from the second-pass audit. Four are real defects requiring code/data changes (Findings 7, 8, 9, 10); two are environment limitations that need to be re-attempted on the Windows host (Findings 11, 12). The plan covers only the four code/data lanes — Findings 11, 12 are simply assigned back to whoever has Windows access.

## Lanes

### Lane O7 — Officer roster dead-corps-ref cleanup

**Implementation status:** Implemented 2026-05-16. See `docs/40_reports/implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md`. Parent-workspace 40w verification completed at `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1845` with `final_state_hash` `d6d1e1c9decf6b00`, 26/26 anchor checks passed, and 6/6 benchmark checks passed. That does not match the older `n1740` hash anchor, but the workspace already contained broad engine/data changes before O7-O9, so this is current dirty-workspace evidence rather than an O7-only hash verdict.

**Source:** Finding 7 — 8 officers' `home_corps_id` and 7 officers' `compatible_corps_ids` reference IDs that don't exist in `oob_corps.json`; one runtime corps (`jna_herzegovina_command`) has no `oob_corps.json` entry.

**Three parts:**

1. **Rename pass** on `data/scenarios/officers/apr1992_officers.json`:
   - Every occurrence of `"vrs_ibk"` → `"vrs_east_bosnian"`
   - Every occurrence of `"vrs_hk"` → `"vrs_herzegovina"`
   - Affects 8 home_corps_id values + 5 compatible_corps_ids entries.

2. **Decide on ARBiH 7th Corps** (Hadžihasanović, Alagić, Čuškić):
   - **Option (a) historically correct:** add `arbih_7th_corps` to `data/source/oob_corps.json` with `display_name: "7th Corps"`, `faction: "RBiH"`, `hq_mun: <central Bosnia mun>`, `hq_osid` if known. Hadžihasanović formed the 7th Corps in central Bosnia in November 1992 — the OOB is missing that beat.
   - **Option (b) faster:** rewrite Hadžihasanović/Alagić's `home_corps_id` to `arbih_3rd_corps` (his actual prior command), delete Čuškić's `home_corps_id: arbih_7th_corps` (set to `null`, mark `available_from_turn` to when historically promoted), strip `compatible_corps_ids: ['arbih_7th_corps']`.
   - Recommend (a) — content-true, ~30 min of work, unlocks 3 officers as first-class.

3. **Add `jna_herzegovina_command` to `data/source/oob_corps.json`**: it's emitted at runtime, so the source-of-truth should reflect it. Add with appropriate `display_name`, `faction: "JNA"` (or whichever the runtime tags it), `hq_mun` per where the runtime places it.

**Regression test:** `tests/canon_officer_corps_refs.test.ts` — for every officer in `apr1992_officers.json`, assert (a) `home_corps_id === null` or exists in `oob_corps.json`, and (b) every `compatible_corps_ids[i]` exists in `oob_corps.json`. Snapshot test guards against recurrence.

**Acceptance:**
- AC-O7-1: `python3 -c "..."` cross-reference script (see Finding 7 in `docs/40_reports/audits/20260516_CODE_AUDIT.md`) reports `count: 0` for all four orphan-check buckets.
- AC-O7-2: At Turn 0, the OpsPlanningModal Commander phase for `vrs_east_bosnian` shows the corps's commander officers (Simić, Gavrić, etc.) in the HOME CORPS list, not in OUT OF REGION.
- AC-O7-3: `npm run sim:scenario:run:40w` keeps the napkin hash anchor `n1740 = 86ebf26ae0271465`. (Data-only changes to officer corps_id should not alter the sim because affected officers were already loaded as reserve.)

**Risk:** if the runtime sorts officer roster by `home_corps_id`, rename changes ordering and changes the hash. Mitigation: run AC-O7-3 first; if hash drifts, that's a separate finding (deterministic ordering should not depend on the value, only on the officer id key).

**Effort:** ~half-day including the regression test.

---

### Lane O8 — `useIPC.ts` contract cleanup

**Implementation status:** Implemented 2026-05-16. See `docs/40_reports/implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md`.

**Source:** Finding 8.

**Three parts:**

1. **Fix `getAdvisorRecommendation` browser fallback** (line 209):
   - Change `Promise.resolve({ error: 'Desktop IPC not available' })` → `Promise.resolve({ ok: false, error: 'Desktop IPC not available' })`.
   - Update WindowAwwv interface return type (line 66) to `Promise<{ ok: boolean; recommendation?: unknown; error?: string }>` after inspecting Electron-side return shape.

2. **Type the 5 query methods** by reading `src/desktop/electron-main.cjs` (and/or `preload.cjs`) for the actual return shapes of:
   - `queryMovementRange`
   - `queryMovementPath`
   - `querySupplyPaths`
   - `queryCorpsSectors`
   - `queryBattleEvents`

   Lift each return shape into a typed interface. Update WindowAwwv + the browser fallback type parameter.

3. **Add a TypeScript contract lint**: `tests/ipc_contract_shape.test.ts` — at compile-time (or via a deterministic AST walk), assert every `WindowAwwv` method returns one of:
   - `Promise<{ ok: boolean; ... }>` for actions
   - `Promise<void>` for fire-and-forget (`focusWarroom`, `openTacticalMapWindow`)
   - `Promise<string | null>` for nullable getters (`getCurrentGameState`, `getMapServerUrl`)
   - `() => () => void` for subscriptions
   - No bare `Promise<unknown>`.

**Acceptance:**
- AC-O8-1: `getAdvisorRecommendation` browser fallback returns object with `ok: false`.
- AC-O8-2: All 5 query methods have non-`unknown` return types in WindowAwwv.
- AC-O8-3: New contract lint passes.

**Effort:** ~quarter-day. Cheapest finding in the round.

---

### Lane O9 — Tutorial copy + spotlight-target hygiene

**Implementation status:** Implemented 2026-05-16. See `docs/40_reports/implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md`.

**Source:** Finding 9.

**Four parts:**

1. **Edit `src/ui/map/components/onboarding/onboardingSteps.ts`** to fix the three copy defects:
   - **Step 03**: `"RECORDS opens Army HQ Records."` → `"RECORDS opens the Army HQ records view."`
   - **Step 05**: replace internal-jargon line. Suggested rewrite: *"Before you advance the turn, the Decision Room surfaces every pending choice. Each row links back to the panel it came from — open it, decide, return. Resolve what you can; defer what you must."*
   - **Step 06**: the Approve/Decline/Force-Launch buttons aren't visible at Turn 0 because all ops are in planning phase. Either (a) defer step 06 to fire after Turn 1 has rolled, or (b) reword to describe the lifecycle: *"Your corps commanders propose operations and present them for your decision when they're ready to launch. Approve to authorize, decline to refuse, or force-launch to override their judgment at the cost of command authority. Brigades never attack alone — every assault flows through a corps operation."*

2. **Resolve step 08 spotlight target gap**: `target_ui_element: 'cost-ledger'` points at a UI surface that doesn't exist (no `data-tutorial-step="cost-ledger"` in the current tree). Either:
   - Add a Cost Ledger entry-point button to the top toolbar with `data-tutorial-step="cost-ledger"`, OR
   - Change step 08 target to wherever the Cost Ledger actually surfaces (likely CODEX or VERDICT) and update copy to say so.

3. **Add a spotlight-token lint test**: `tests/onboarding_spotlight_targets.test.ts` — for every step where `target_ui_element !== null`, assert there exists at least one component in `src/ui/map/` rendering `data-tutorial-step="<token>"`. Pure AST/grep test, no runtime needed.

4. **Optional (later lane): make step transitions practice-based** rather than tell-based. Add a `requires_user_action: string | null` field per step; step N's Next button enables only after the player has triggered the named action (e.g. step 03 enables after the player has opened RECORDS at least once). Industry-standard onboarding pattern, higher retention than passive description. Defer to a separate lane if not done in this PR.

**Acceptance:**
- AC-O9-1: Three copy defects (redundancy, jargon, promise-gap) fixed in `onboardingSteps.ts`.
- AC-O9-2: Step 08 has a working `target_ui_element` reachable in the live tree.
- AC-O9-3: Spotlight-token lint test passes on current state and fails when a token is removed from the live tree.

**Effort:** ~half-day including lint test. The optional "practice-based" lane is a separate ~2-day item if pursued.

---

### Lane O10 — Codex source-depth standardization (optional, defer)

**Source:** Finding 10.

**Implementation status:** Deferred. This remains a content-QA/canon-gated lane, not an engineering blocker.

Sample showed quality is high; minor source-depth inconsistency. No actionable defect. **Recommend deferring to a content-QA lane** unless a `/historian` review is already scheduled. Optional regex/floor test:

```ts
// tests/codex_essay_source_quality.test.ts
// For every essay in data/scenarios/essays/:
//   - sources array must have >=1 entries
//   - if category === 'humanitarian', >=2 ICTY sources
//   - if category === 'diplomatic', >=1 primary doc
//   - every ICTY citation matches /IT-\d+-\d+(\/\d+)?-(T|A|R)/
```

**Effort:** ~quarter-day for the test alone; the underlying content audit is multi-day and is canon-gated.

---

### Lane O11 — Off-sandbox tasks (assign to Windows host)

**Source:** Findings 11, 12.

**Implementation status:** Still operator-only. This requires Windows-host scenario/browser verification.

Two intended audit lanes blocked in the Cowork Linux sandbox:

- **CLI scenario run + output audit** — sandbox's `node_modules/esbuild` is Windows-built. Re-attempting requires running on the Windows host. Expected output: 40w hash matches `n1740 = 86ebf26ae0271465`. Additional pass: walk `run_summary.json` for orphan formation/corps refs, brigade-roster integrity, displacement reconciliation.
- **Decision Room walkthrough via Chrome** — viewport regression mid-session, deferred to a clean Chrome session.

No code work; these are environment limitations. Assigning to "whoever has Windows access".

---

## Sequencing

Across the four code lanes (O7, O8, O9, O10):

1. **Lane O8** (~quarter-day) — cheapest, lowest risk, hardens contract surface that the other lanes depend on.
2. **Lane O9** (~half-day) — affects first-time player experience; fast win.
3. **Lane O7** (~half-day) — surface bug today, compounds over time; data-only change.
4. **Lane O10** (deferred / optional) — no actionable defect, only an optional test.

Total: ~1 day at single-stream, or ~half-day with two engineers (O8+O9 parallel, then O7).

## Determinism + canon posture

All lanes are renderer-only or data-only with no expected sim behavior change:
- O7 (data rename) — should be byte-stable; AC-O7-3 protects via 40w hash gate.
- O8 (typing only) — no runtime change.
- O9 (UI strings + test) — no runtime change.
- O10 (test only) — no runtime change.

No `Math.random`, no `Date.now`, no `Intl`, no scenario data semantic changes. No FORAWWV touch.

## Out of scope for this plan

- Adding ARBiH 6th Corps (not in current OOB; would be a separate content lane).
- The "practice-based tutorial" optional follow-up under Lane O9.
- Cost Ledger as its own top-level surface (vs nested under CODEX) — Lane O9 decides between adding a button or repointing the spotlight; choosing to elevate Cost Ledger to a first-class surface is a separate product call.
- CLI scenario integrity walk (Lane O11) deliverable — that's a Windows-host task.
- Decision Room walkthrough (Lane O11) — that's a clean-Chrome-session task.

## Owner

Unassigned. Lanes O7/O8/O9 are self-contained — any frontend or data engineer can pick them up. Lane O10 is canon-gated and should wait for content review.

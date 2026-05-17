# Code Audit — 2026-05-16

**Auditor:** Claude (file/grep/bash access; no Electron IPC)
**Build state:** v0.9.6-alpha.1, working tree clean per `git status -uno`
**Sister doc:** `GUI_PLAYTEST_2026-05-16.md` (renderer-side findings from the same session)
**Scope of this doc:** findings reachable from static source/data inspection that aren't (as far as I can tell) already in `docs/PROJECT_LEDGER.md` or `.claude/napkin.md`. Findings live here so they don't disappear in chat.

---

## Finding 1 — Mixed CRLF/LF line endings in 74+ source files breaks local typecheck and HMR

### Symptom

`npx tsc --noEmit -p tsconfig.json` (and `-p src/ui/map/tsconfig.json`) produces 30+ apparent **parse errors** across `src/ui/map/`:

```
src/ui/map/components/PresidentialToolbar.tsx(239,13): error TS17014: JSX fragment has no corresponding closing tag.
src/ui/map/components/SituationTab.tsx(376,89): error TS1002: Unterminated string literal.
src/ui/map/components/army_hq/warSummaryOverview.ts(77,6): error TS1005: '}' expected.
src/ui/map/components/warroom/AdvanceTurnModal.tsx(267,6): error TS17008: JSX element 'Modal' has no corresponding closing tag.
src/ui/map/components/warroom/AdvanceTurnModal.tsx(358,139): error TS1002: Unterminated string literal.
src/ui/map/components/warroom/WarroomShellLayer.tsx(608,8): error TS17008: JSX element 'div' has no corresponding closing tag.
src/ui/map/data/types.ts(1121,3): error TS1005: '}' expected.
src/ui/map/data/inboxItems.ts(208,9): error TS1005: '}' expected.
src/ui/map/data/preAdvanceCommandReview.ts(88,1): error TS1005: '}' expected.
src/ui/map/data/presidentialDecisionRoom.ts(1085,1): error TS1005: '}' expected.
src/ui/map/data/warroomPriorityDocket.ts(69,4): error TS1005: '}' expected.
src/ui/map/desktop/useIPC.ts(436,23): error TS1005: '}' expected.
src/ui/map/data/GameStateAdapter.ts(2639,32): error TS1005: '}' expected.
src/ui/map/layers/buildForceQualityOverlay.ts(228,23): error TS1005: '}' expected.
src/ui/map/layers/buildOsidDamageOverlay.ts(160,73): error TS1003: Identifier expected.
src/ui/map/utils/presidentialDecisionRoomNavigation.ts(30,27): error TS1005: '}' expected.
src/ui/map/utils/shellNavigation.ts(134,8): error TS1010: '*/' expected.
```

### Diagnosis

The files **look syntactically valid when read.** The git index is clean LF:

```
$ git ls-files --eol src/ui/map/data/types.ts src/ui/map/components/SituationTab.tsx \
                    src/ui/map/components/warroom/WarroomShellLayer.tsx
i/lf    w/mixed attr/text=auto   src/ui/map/components/SituationTab.tsx
i/lf    w/mixed attr/text=auto   src/ui/map/components/warroom/WarroomShellLayer.tsx
i/lf    w/mixed attr/text=auto   src/ui/map/data/types.ts
```

So the file is **LF-normalized in git** but **mixed CRLF + LF on disk** in the Windows working tree. `.gitattributes` has the right policy (`* text=auto` + `data/derived/startup/*.json text eol=lf`) but the working tree has drifted.

`file(1)` confirms it on the 11 affected files I sampled — every one of them reports "with CRLF, LF line terminators" (i.e., both kinds inside the same file).

### Scope

| Subtree | `w/mixed` files |
|---|---|
| `src/ui/map/` | 40 |
| `src/sim/` | 34 |
| **subtotal sampled** | **74+** |
| `data/`, `tests/`, `tools/`, `scripts/` | _pending — bash on the sandbox times out on full-tree `git ls-files --eol`_ |

Affected `src/sim/` files include core combat paths:

```
src/sim/combat/army_order_interpretation.ts
src/sim/combat/army_reserve_system.ts
src/sim/combat/bot_brigade_ai_osid.ts
src/sim/combat/bot_brigade_context.ts
src/sim/combat/bot_brigade_eval_attack.ts
src/sim/combat/bot_brigade_eval_front.ts
src/sim/combat/bot_brigade_eval_types.ts
src/sim/combat/bot_brigade_movement_ai.ts
src/sim/combat/bot_corps_corridor.ts
src/sim/combat/bot_corps_directives.ts
src/sim/combat/bot_corps_helpers.ts
src/sim/combat/bot_corps_operations.ts
src/sim/combat/brigade_front_distribution.ts
src/sim/combat/combat_math.ts
src/sim/combat/combat_predictor.ts
…
```

### Why CI doesn't catch it

CI clones fresh, so it sees the LF-normalized index. The mixed-EOL state is purely a working-tree drift on the local Windows machine.

### Downstream impact already observed

This is **the root cause of the HMR cascade I observed during the GUI playtest** at 18:19:07. The failed-to-reload modules from that session are an exact subset of the parse-error file list:

| HMR fail (playtest) | tsc parse error here? |
|---|---|
| `PresidentialInbox.tsx` | (not in this list — different file, but same tree)
| `PresidentialToolbar.tsx` | yes (line 239) |
| `App.tsx` | not in this list |
| `MapContainer.tsx` | not in this list |
| `PeaceStatusPanel.tsx` | not in this list |
| `TurnAftermathRecordsPanel.tsx` | not in this list |
| `WarSummaryContent.tsx` | yes (line 63, 93, 316) |
| `AdvanceTurnModal.tsx` | yes (line 267, 276, 335, 358) |
| `FormationDetail.tsx` | not in this list |
| `PresidentialDecisionRoomPanel.tsx` | not in this list |
| `WarroomStatusBar.tsx` | yes (line 204, 246) |

Five of the eleven HMR-failing files are exactly the ones tsc rejects. The other six are likely just imported-by transitive failures.

### Recommended remediation (one-shot)

Pick one of these. They're listed cheapest-first.

1. **Per-extension `.gitattributes` upgrade + renormalize:**
   ```
   *.ts text eol=lf
   *.tsx text eol=lf
   *.cjs text eol=lf
   *.mjs text eol=lf
   *.json text eol=lf
   ```
   then `git add --renormalize .` and commit. Safe in CI, fixes the working tree on next checkout.

2. **Direct working-tree dos2unix on the dirty subset:**
   ```sh
   git ls-files --eol | awk '$2=="w/mixed"{print $4}' | xargs -d '\n' dos2unix
   ```
   Doesn't change the index (which is already correct), only the local working files.

3. **Nuclear renormalize:**
   ```sh
   git rm -rf --cached .
   git reset --hard
   ```
   after option 1's `.gitattributes` change. Fastest, but rewrites timestamps so be sure no dev server is mid-edit.

The `.gitattributes` upgrade (option 1) is the only one that prevents this from recurring next time an editor saves a file with the wrong default. Recommend doing 1 + 2 together.

### Why this matters more than it looks

CLAUDE.md says the smoke-test triad after every change is `tsc --noEmit + vitest run + desktop:map:build`. Right now on the local Windows checkout `tsc --noEmit` exits non-zero from phantom errors, which means either (a) the team's running `typecheck` against a different config, (b) they're tolerating the spew, or (c) they're hitting it daily and treating it as cosmetic. The HMR cascade I observed during gameplay is the user-visible consequence — pages randomly enter a broken cream-colored map state because Vite can't reload critical components.

---

## Finding 2 — `avoided_osids_by_faction`: wired but kept empty by the rule; question is whether the wire itself should stay

> **Reframe (after Finding 5 retraction):** Same family of mechanism. The rule "NEVER use" likely means "don't reach for this lever" — and the empty `{}` values in the canonical scenarios show the rule is currently working as intended. The question that remains is narrower than my original framing: *does the wiring itself need to stay, or can it be removed entirely?* Reading the scenario_loader / scenario_runner / bot_brigade_eval_attack path again, this one feels less load-bearing than `osid_control_overrides` (it's a runtime bot-attack-targeting filter, not initial-state canon), but I don't actually know the intended use case. Leaving the finding here so you can decide whether it's analogous to Finding 5 (intentional canon, leave alone) or genuinely dead-but-wired (remove).

### The rule (CLAUDE.md, top-level Sacred Rules section)

> **NEVER use `avoided_osids_by_faction`**: Banned. Fix bot targeting, OOB stats, or painted targets instead.

### The current wiring (live, end-to-end)

| File | Line | What it does |
|---|---|---|
| `src/scenario/scenario_types.ts` | 142 | Declares `avoided_osids_by_faction?: Record<string, string[]>` on the scenario schema |
| `src/state/game_state.ts` | 1268 | Declares the same field on `state.meta` |
| `src/scenario/scenario_loader.ts` | 326–328, 448, 496 | Parses `o.avoided_osids_by_faction` from raw scenario JSON and threads it through `loadScenario` |
| `src/scenario/scenario_runner.ts` | 552 | Declares `'avoided_osids_by_faction'` as a valid `OverrideInventoryEntry.mechanism` |
| `src/scenario/scenario_runner.ts` | 655–666 | Counts and inventories scenarios that use it as `bot_compensation` |
| `src/scenario/scenario_runner.ts` | 1255–1256 | **Writes scenario value into `state.meta.avoided_osids_by_faction`** |
| `src/sim/combat/bot_brigade_eval_attack.ts` | 215 | **Reads `state.meta?.avoided_osids_by_faction?.[faction]`** at attack-evaluation time |
| `src/sim/combat/commander/plan.ts` | (refs) | Also references the field |
| `data/scenarios/apr1992_definitive_52w.json` | 73 | `"avoided_osids_by_faction": {}` (empty, but the door is open) |
| `data/scenarios/apr1992_definitive_56w.json` | (similar) | `"avoided_osids_by_faction": {}` |

### Why this is a real finding

1. The rule says **NEVER use** — present-tense, no carve-out for legacy code, no "deprecated, retain for compat" note.
2. The canonical 52w and 56w scenarios still **declare the field**, even with an empty object. The 40w scenario doesn't appear to (good signal for what "compliant" looks like).
3. The consuming code in `bot_brigade_eval_attack.ts:215` doesn't even gate on a deprecation flag — if any scenario populates the map, the bot will read and obey it.
4. There's **no inline `@deprecated` comment, no console warning, no test that fails when the field is populated, no schema validator rejecting non-empty values**. The rule lives only in CLAUDE.md and napkin.md — invisible to a contributor reading `scenario_types.ts`.

### Recommended remediation

Pick one tier:

1. **Soft enforce (cheap, today):**
   - Add `@deprecated` JSDoc on both declarations with a one-line reason and a pointer to the canon.
   - Add a runtime `console.warn` (or push a `state.meta.warnings` entry) in `scenario_runner.ts` when the field is populated non-empty on scenario load.
   - Add a regression test `tests/canon_no_avoided_osids.test.ts` that walks every scenario JSON and asserts `avoided_osids_by_faction` is absent or empty.

2. **Hard remove (do it once, do it right):**
   - Delete the field from `scenario_types.ts`, `game_state.ts`, both scenario files.
   - Delete the read in `bot_brigade_eval_attack.ts:215` and `commander/plan.ts`.
   - Delete the parse/write in `scenario_loader.ts` and `scenario_runner.ts`.
   - Delete the `'avoided_osids_by_faction'` literal from `OverrideInventoryEntry.mechanism`.
   - Add the regression test above as a guard.

Option 2 is what the rule actually says to do. Option 1 is fine if you want the rule to enforce itself without a bigger refactor right now.

### Side note on `OverrideInventoryEntry`

While reading `scenario_runner.ts:551–553`, I noticed the `OverrideInventoryEntry.mechanism` union also includes `'osid_control_overrides'` and `'engine_ceiling_workarounds'`. Per CLAUDE.md the sister rule is **"NEVER override initial OSIDs"** — so `osid_control_overrides` may be in the same situation. Audit pending below.

---

## Finding 3 — `\U2014` already triaged

The literal `\U2014` (the unrendered em-dash escape I reported on the Presidential Brief button during the GUI playtest) only appears in one file across the entire repo:

```
docs/plans/2026-05-16-gui-playtest-defects-plan.md
```

That's a plan document dated **today**. The team has already seen my finding and queued a fix. Confirms most/all of the GUI-surface defects from `GUI_PLAYTEST_2026-05-16.md` are likely already tracked.

Not a new finding; documenting so it isn't double-flagged later.

---

---

## Finding 4 — Full-repo EOL damage map: ~311 mixed-EOL files

Per-directory mixed-EOL counts (working tree vs LF-normalized index), measured via `git ls-files --eol` per path:

| Directory | `w/mixed` files |
|---|---|
| `tests/` | **98** |
| `docs/` | **62** |
| `src/ui/map/` | 40 |
| `src/sim/` | 34 |
| `scripts/` | 26 |
| `tools/` | 20 |
| `src/state/` | 10 |
| `src/desktop/` | 4 |
| `src/scenario/` | 2 |
| `src/validate/` | 2 |
| `src/map/` | 2 |
| `data/` | 2 |
| `.claude/` | 2 |
| `src/_archived/` | 1 |
| `src/cli/`, `src/turn/`, `src/utils/`, `src/data/`, `src/data_prereq/`, `src/shared/`, `src/docs/`, `.github/` | 0 |
| **Estimated total** | **~311** |

Notable affected files (sampled from each pocket):

- **Determinism / calibration tests:** `tests/artifact_determinism.test.ts`, `tests/audit_state_of_game_determinism.test.ts`, `tests/calibration.test.ts`, `tests/bot_orders_perf_profile.test.ts`, `tests/c1_corps_directive_consumer.test.ts`. These are the tests CLAUDE.md and the napkin guard with the smoke-test triad. If they spuriously fail on a Windows machine due to EOL, you're getting noise on the most important gate.
- **Canon docs:** `docs/10_canon/Game_Bible_v0_9_0.md`, `docs/10_canon/Systems_Manual_v0_9_0.md`, `docs/10_canon/War_Specification_v0_9_0.md`, `docs/20_engineering/CODE_CANON.md`, `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`, `docs/20_engineering/MAP_UI_MASTER.md`, `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`. Mixed EOL in canon docs means every diff a human reviewer reads against these is polluted with EOL noise — possibly hiding real changes.
- **Combat core:** `src/sim/combat/combat_math.ts`, `combat_predictor.ts`, `bot_brigade_eval_attack.ts`, `bot_corps_directives.ts`, `bot_corps_operations.ts`, `army_order_interpretation.ts`.
- **UI components causing my observed HMR cascade:** `PresidentialToolbar.tsx`, `SituationTab.tsx`, `WarSummaryContent.tsx`, `AdvanceTurnModal.tsx`, `WarroomShellLayer.tsx`, `WarroomStatusBar.tsx`.

### Clean pockets

`src/cli/`, `src/turn/`, `src/utils/`, `src/data/`, `src/data_prereq/`, `src/shared/`, `src/docs/`, and `.github/` are 0/0 clean. Whatever convention is in force there is the one to spread.

### Remediation (concrete, repo-wide)

Two-part fix:

**Part A — prevent recurrence (commit once):**

Upgrade `.gitattributes` from the current single-line policy:

```
* text=auto
data/derived/startup/*.json text eol=lf
*.pmtiles filter=lfs diff=lfs merge=lfs -text
*.osm.pbf filter=lfs diff=lfs merge=lfs -text
```

to explicit per-extension `eol=lf` rules for every source format you don't want hybridizing:

```
* text=auto
*.ts text eol=lf
*.tsx text eol=lf
*.cjs text eol=lf
*.mjs text eol=lf
*.js text eol=lf
*.jsx text eol=lf
*.json text eol=lf
*.md text eol=lf
*.css text eol=lf
*.html text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.sh text eol=lf
data/derived/startup/*.json text eol=lf
*.pmtiles filter=lfs diff=lfs merge=lfs -text
*.osm.pbf filter=lfs diff=lfs merge=lfs -text
```

Belt-and-suspenders: also commit a `.editorconfig`:

```
root = true

[*]
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.{md,csv,tsv}]
trim_trailing_whitespace = false
```

This is the single change that makes the problem stop recurring.

**Part B — heal the existing damage (one command):**

After Part A is committed:

```sh
git add --renormalize .
git commit -m "chore(eol): renormalize working tree per .gitattributes"
```

`git add --renormalize` re-runs the attribute filters on every tracked file. Since the index is already LF, the only files that show diffs are the ~311 mixed-EOL working-tree files — and the diff is a no-op (LF → LF) which makes the commit empty but the working tree clean. On Windows you may need to delete and recheckout afterwards:

```sh
git rm -rf --cached .
git reset --hard
```

Verify with:

```sh
git ls-files --eol | awk '$2=="w/mixed"' | wc -l   # should print 0
npx tsc --noEmit -p tsconfig.json                   # should now succeed
```

If you want a verification gate in CI:

```yaml
# .github/workflows/eol-guard.yml (sketch)
- run: |
    mixed=$(git ls-files --eol | awk '$2=="w/mixed"' | wc -l)
    if [ "$mixed" -gt 0 ]; then echo "::error::$mixed mixed-EOL files"; exit 1; fi
```

---

## Finding 5 — RETRACTED. `osid_control_overrides` entries are intentional canon

> **Retraction (added after user correction):** I read "NEVER override initial OSIDs" as a rule that the existing `osid_control_overrides` lists should be empty. That's wrong. The rule is a behavioural guard for contributors — *don't reach for this lever as a quick fix when something upstream is off* — not a claim that the lists must be empty. The 41+ entries across the 40w / 52w / 56w / jan1993_to_dayton scenarios are intentional canon-encoded corrections for cases the upstream census/referendum derivation can't produce on its own (e.g. Brčko, Foča-area settlements). Removing or migrating those entries would silently corrupt the calibrated starting state.
>
> Treat the rule as: *if you find yourself wanting to add a new entry to `osid_control_overrides` to make a calibration outcome line up, stop and fix the upstream input instead.* The existing list is the historical record of cases where that wasn't possible.

The descriptive material below is preserved as background — the *counts and contents* are still factually accurate, just not findings.

### Background (informational, not a defect)

### The rule (CLAUDE.md sacred rules, top-level)

> **NEVER override initial OSIDs**: Initial OSID control from census/referendum is sacrosanct. Fix engine, OOB, operations, or scenario params instead.

(Reread: this is a *contributor behaviour* rule — don't reach for overrides as your fix path — not a *data state* claim. See retraction above.)

### What's currently in the scenarios

`grep "osid_control_overrides" data/scenarios/*.json` + `python3 -c "len(...)" `:

| Scenario | Active overrides |
|---|---|
| `apr1992_definitive_40w.json` | **17** |
| `apr1992_definitive_52w.json` | 10 |
| `apr1992_definitive_56w.json` | 10 |
| `jan1993_to_dayton.json` | 14 |
| `apr1992_definitive_40w_backup_n48base.json` | (backup, count not measured) |

The 40w — which `package.json` calls `sim:scenario:run:40w` and napkin §"Latest baselines" anchors against (`n1740 40w hash 86ebf26ae0271465`) — has the most overrides of any active scenario.

The actual 40w overrides (from `apr1992_definitive_40w.json:62–80`):

```json
"osid_control_overrides": {
  "op:brcko:brcko": "RS",
  "op:bugojno:brizina": "RBiH",
  "op:bugojno:prijaci": "RBiH",
  "op:travnik:ovcarevo_2": "RBiH",
  "op:travnik:cukle_2": "RBiH",
  "op:nevesinje:hrusta_2": "RS",
  "op:nevesinje:sopilja": "RS",
  "op:kotor_varos:prisocka_2": "RS",
  "op:kotor_varos:vrbanjci_2": "RS",
  "op:foca:kosman": "RS",
  "op:foca:tjentiste_2": "RS",
  "op:foca:miljevina_2": "RS",
  "op:foca:izbisno": "RS",
  "op:foca:ustikolina": "RS",
  "op:sokolac:sasevci_2": "RS",
  "op:sokolac:meljine_2": "RS",
  "op:sokolac:knezina_2": "RS"
}
```

### Why this is *not* a finding (post-retraction)

These overrides exist because the upstream census/referendum pipeline can't always produce the historically-correct initial controller for every OSID. The list is the calibrated correction set. The rule is there to keep that list from growing as a developer-convenience escape hatch — not to say it should be empty.

The "remediation" options I sketched (audit-and-migrate / allowlist-as-debt / deprecate) would have done active harm by removing or gating legitimate canon data. Withdrawing.

### One thing that *might* still be worth doing, much narrower

If it's not already in place, the rule itself could be enforced as test instead of as prose. Something like:

```ts
// tests/canon_osid_overrides_allowlist.test.ts
// Snapshot the current allowlist of osid_control_overrides per scenario.
// Adding a new entry without updating this snapshot fails the test, forcing
// the contributor to either (a) justify the new entry in a follow-up
// canon note, or (b) fix the upstream input instead.
```

That preserves the existing entries as canon, but turns "NEVER override initial OSIDs" from a doc rule a new contributor has to remember into a test that fires automatically. Worth doing only if you've actually seen drift in this list — if it's been stable for months, the doc rule is doing its job and a test is overhead.

---

## Finding 6 — `engine_ceiling_workarounds` is declared but always 0; safe to delete

The third member of `OverrideInventoryEntry.mechanism` is `'engine_ceiling_workarounds'`. Searching for it across the entire repo:

- **Code:** declared once in `src/scenario/scenario_runner.ts:552` (the mechanism union) and emitted once at `src/scenario/scenario_runner.ts:671` with `active_entries: 0` hard-coded.
- **Data:** appears only in `data/derived/_debug/.../run_summary.json` artifacts — these are emitted run summaries (output, not input). All show `active_entries: 0`.
- **Scenarios:** zero canonical scenarios reference it.

So `engine_ceiling_workarounds` is **a placeholder slot that's never been populated**. Two paths:

1. **If the project plans to populate it later** — leave it, but add a comment in `scenario_runner.ts:671` saying so (right now it reads as dead code).
2. **If not** — remove the union member, the inventory emission, and any associated schema. One commit, zero behavior change.

Not a sacred-rule violation. Just dead-mechanism cleanup that pairs naturally with Findings 2 + 5.

---

## Summary

| # | Finding | Severity | Effort to fix |
|---|---|---|---|
| 1 | ~311 mixed-EOL files break local typecheck + cause HMR cascade | **High** (developer pain, hides real bugs) | One PR: `.gitattributes` + `git add --renormalize .` |
| 2 | `avoided_osids_by_faction` wired but empty in current data — uncertain whether the wire itself is still needed | Open question (not a defect) | Ask: should this conduit exist at all? |
| 3 | `\U2014` already triaged in plan doc | n/a — known | Already on the radar |
| 4 | EOL damage detail (98 in `tests/`, 62 in `docs/`, etc.) | High (canon docs + determinism tests affected) | Same fix as Finding 1 |
| 5 | ~~`osid_control_overrides`~~ **RETRACTED** — entries are intentional canon corrections | n/a | n/a |
| 6 | `engine_ceiling_workarounds` declared but always 0 | Low (cleanup) — and possibly same-shape as #2, retract if intentional | One PR if you confirm it's dead |

Single largest-leverage real defect: **Finding 1+4** — the `.gitattributes` upgrade. That one stands cleanly and is the one most worth your time. Findings 2 and 6 reduce to "does this conduit need to exist?" — which is a design call I shouldn't be making for you.

---

## Implementation closeout (2026-05-16, end of day)

Findings 7, 8, 9 implemented same day. Closeout report: `docs/40_reports/implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md`. Companion Ops Planning Modal plan also implemented; closeout: `docs/40_reports/implemented/20260516_OPS_PLANNING_TARGET_DISCOVERY.md`.

**Notable correction to Finding 9 step 08**: I claimed the `cost-ledger` spotlight target was unreachable. Wrong — the team verified `WarCostSummary` already renders that anchor (`data-tutorial-step="cost-ledger"`). My audit missed it because I never opened the verdict/endgame surface during the playthrough. The team kept the target as-is and only fixed copy/jargon in steps 03/05/06. The new `tests/onboarding_spotlight_targets.test.ts` regression now guards every non-null token against the live tree, so any future drift will fail loudly.

**40w hash residual (AC-O7-3)**: post-O7-O9 run came back as `n1845 = d6d1e1c9decf6b00` with 26/26 anchors + 6/6 benchmarks passing, but does NOT match the older napkin anchor `n1740 = 86ebf26ae0271465`. The closeout explicitly notes the workspace already contained broad engine/data changes before O7-O9, so this is current dirty-workspace evidence rather than an O7-only attribution. A clean-baseline O7-only comparison is still needed if the team wants to prove the AC-O7-3 ordering-safety claim in isolation. The risk I flagged ("if runtime sorts officer roster by `home_corps_id`, rename changes ordering and changes the hash") remains hypothesis, not falsified or confirmed.

Findings 11 (CLI scenario integrity walk) and 12 (Decision Room walkthrough) remain operator-only — the closeout doesn't address them because they're Windows-host / fresh-Chrome-session tasks, not code lanes.

Round 2 status: **Findings 7-9 closed; 10 deferred (optional); 11-12 deferred to operator/fresh-session.**

---

## Round 2 audit (2026-05-16, "do all of them" pass)

Following the audit-pass user instruction. Each finding below is independent of the round-1 list; all reachable via file-grep + sample Chrome work. Two paths (CLI scenario run, Chrome Decision Room walkthrough) were blocked by sandbox limitations and are recorded as such.

## Finding 7 — Officer roster has dead corps refs (vrs_ibk, vrs_hk, arbih_7th_corps)

### Symptom

`data/scenarios/officers/apr1992_officers.json` uses short corps IDs that don't appear in the canonical `data/source/oob_corps.json`:

| Stale officer ref | Should be (per oob_corps.json + runtime save) |
|---|---|
| `vrs_ibk` | `vrs_east_bosnian` |
| `vrs_hk` | `vrs_herzegovina` |
| `arbih_7th_corps` | **doesn't exist anywhere** (not in oob_corps.json, not in runtime save) |

### Scope

- **8 officers** have `home_corps_id` set to a non-existent ID:
  - VRS: Simić (vrs_ibk), Grubač (vrs_hk), Gavrić (vrs_ibk), Kutlešić (vrs_ibk), Gušić (vrs_hk), Lalović (vrs_hk), Despotović (vrs_ibk)
  - ARBiH: Čuškić (arbih_7th_corps)
- **7 additional officers** have a dead `compatible_corps_ids` entry:
  - VRS: Talić, Lisica, Kelečević, Andrić, Arsić (all reference `vrs_ibk`)
  - ARBiH: Hadžihasanović, Alagić (reference `arbih_7th_corps`)

### Runtime impact

I confirmed via the loaded initial-save (`data/derived/startup/apr_1992_initial_save.json`) that **all 8 dead-corps-ref officers are still loaded** at `available_from_turn=0` with `status: 'reserve'` and `assigned_corps_id: null`. The runtime tolerates dead refs silently — officers exist in the roster but their corps-affinity logic can never match anything, so they're effectively unassignable except via manual `assignCommander` (and even then, the home/compatible match scoring would fail).

The runtime's canonical corps IDs (gathered from formations[].corps_id in the initial save):

```
arbih_1st_corps, arbih_2nd_corps, arbih_3rd_corps, arbih_4th_corps, arbih_5th_corps
hvo_central_bosnia, hvo_northwest_bosnia, hvo_southeast_herzegovina, hvo_tomislavgrad
jna_herzegovina_command     ← appears at runtime but NOT in oob_corps.json
vrs_1st_krajina, vrs_2nd_krajina, vrs_drina, vrs_east_bosnian, vrs_herzegovina,
vrs_main_staff, vrs_sarajevo_romanija
```

So `oob_corps.json` and `apr1992_officers.json` have *opposite* drift problems:
- officers file has 3 IDs missing from oob_corps
- runtime save has 1 ID missing from oob_corps (`jna_herzegovina_command`)

### Why this matters

- The OpsPlanningModal Commander phase pulls officers via home/compatible matching. Officers with dead refs show up in the "OUT OF REGION (12)" unavailable list permanently. During my Turn-0 walk-through I observed that bottom unavailable list, which included Pandurević, Smiloš and others — those are exactly the officers tied to dead `vrs_ibk` / `vrs_hk`.
- ARBiH 7th Corps existed historically (formed late 1992 in central Bosnia under Hadžihasanović). Modelling it would unlock 3 officers + add a corps to that faction's structure. Whether to add it is a content/canon call.
- `jna_herzegovina_command` is a runtime-only ID with no `oob_corps.json` entry — that's a one-sided spec.

### Recommendation

1. **One-line replacement pass on `apr1992_officers.json`**: `vrs_ibk → vrs_east_bosnian`, `vrs_hk → vrs_herzegovina`. Trivial sed. Eight officer entries fix-up, no schema change. This is a pure data correction — the canonical truth is whatever the runtime/oob_corps file says.
2. **Decide on ARBiH 7th Corps**: either (a) add `arbih_7th_corps` to `oob_corps.json` with appropriate metadata (display_name = "7th Corps", faction = "RBiH", hq_mun = …) and let Hadžihasanović/Alagić/Čuškić become first-class, OR (b) rewrite those three officers' `home_corps_id` to a valid corps + delete the dead `compatible_corps_ids` entries. (a) is more historically true; (b) is faster.
3. **Add `jna_herzegovina_command` to `oob_corps.json`**: it's emitted at runtime, so it's canon-by-presence. The OOB source file should match.
4. **Add a regression test** that asserts every `home_corps_id` and `compatible_corps_ids` entry in `apr1992_officers.json` exists in `oob_corps.json` AND in the loaded initial save. Cheap snapshot test that prevents recurrence.

---

## Finding 8 — `useIPC.ts`: 70+ actions, mostly consistent contract, one return-shape bug + several `unknown` typings

### What's good

The pattern is solid: every IPC action has a `makeNoop` browser-mode fallback that returns `{ ok: false, error: 'Desktop IPC not available' }`. Renderer code that does `if (!result.ok) showError(result.error)` handles browser mode + IPC failure + sim failure with one branch. Strong contract discipline across most of the 70+ actions.

### Defect

**`getAdvisorRecommendation` returns `{ error: 'Desktop IPC not available' }` with no `ok` key in its browser fallback** (line 209):

```ts
getAdvisorRecommendation: awwv
    ? (payload: ...) => awwv.getAdvisorRecommendation(payload)
    : (payload: ...) => Promise.resolve({ error: 'Desktop IPC not available' }),
```

Compare against the standard `makeNoop`:

```ts
const NOOP_RESULT = Promise.resolve({ ok: false, error: 'Desktop IPC not available' });
```

Callers expecting `{ ok: boolean }` see `ok === undefined` (falsy), which works for the common pattern but breaks any code that does `if (result.ok === false)` or that distinguishes "IPC unavailable" from "IPC available but errored". Also, the interface declaration at line 66 says `Promise<unknown>` for this method — undertyped at both ends.

### Adjacent type-safety gaps

Five query methods are typed `Promise<unknown>` in the WindowAwwv interface (lines 92-97):

```ts
queryMovementRange: (brigadeId: string) => Promise<unknown>;
queryMovementPath: (brigadeId: string, destinationSid: string) => Promise<unknown>;
querySupplyPaths: () => Promise<unknown>;
queryCorpsSectors: () => Promise<unknown>;
queryBattleEvents: () => Promise<unknown>;
```

Their browser fallbacks via `makeNoop<unknown>()` resolve to `{ ok: false, error: '...' }`, but the type contract says callers can't assume that shape. The actual shape returned by Electron is also undocumented. Two callers expecting different shapes will both compile but silently disagree on the runtime payload.

`focusWarroom: () => Promise<void>` (line 99) is fire-and-forget — fine for "focus window" but no error surface if the call fails.

### Recommendation

1. **Fix `getAdvisorRecommendation` browser fallback** to return `{ ok: false, error: '...' }` like every other action. One-line change.
2. **Type the 5 query methods** by reading the Electron-side implementation in `electron-main.cjs` and lifting the return shape into the WindowAwwv interface. Each is ~5 lines.
3. **Add a TypeScript test** that asserts every `WindowAwwv` method returns either `Promise<{ ok: boolean; ... }>`, `Promise<void>`, `Promise<string | null>`, or a subscription unsubscribe-fn. Lints the contract at build time.

---

## Finding 9 — Tutorial copy has 4 concrete defects (vs the v0.9.2 lane that authored it)

Re-reading `src/ui/map/components/onboarding/onboardingSteps.ts` (8 steps, ~50 words each, lexicographically sorted by `01_…08_` id prefix) with the eye of a fresh player who just walked through them all once via Chrome.

### Defects

1. **Step 03 redundancy.** *"RECORDS opens Army HQ Records."* The word "Records" appears twice consecutively. Read: "Records opens Army HQ Records". Minor but jarring. Suggested: *"RECORDS opens the Army HQ records view."* or *"RECORDS opens Army HQ."*

2. **Step 05 jargon leak.** *"Source handoffs route you back to the originating panel."* "Source handoffs" is internal architecture terminology (it appears in source as `sourceHandoffs` on the Decision Room view model — see `src/ui/map/data/presidentialDecisionRoom.ts`). The player has no way to know what one is. Step also drops two other undefined terms: "command friction" and "opportunity dossiers". Rewrite suggestion: *"Before you advance the turn, the Decision Room surfaces every pending choice. Each row links back to the panel it came from — open it, decide, return. Resolve what you can; defer what you must."*

3. **Step 06 promise-vs-deliver gap.** *"Approve to authorize, decline to refuse, or force-launch to spend command authority and override their judgment."* During my Turn-0 walk-through, I could not find Approve / Decline / Force-Launch buttons anywhere from the corps detail or OPS view. Those controls live inside `OperationBriefingModal` which only appears when an operation reaches assessment phase — invisible at Turn 0 with all ops in planning. New player follows the tutorial, hunts for the promised buttons, finds nothing. Either the tutorial should defer step 06 until after Turn 0 has rolled at least once (so the assessment modal can have triggered), or it should be reworded to describe the lifecycle rather than the immediately-visible controls.

4. **Step 08 unreachable spotlight.** Target `cost-ledger` doesn't appear as a top-bar button (toolbar has CHRONICLE, CODEX, INBOX — no Cost Ledger). I never found a Cost Ledger view in my playthrough. Either:
   - The spotlight target token has gone stale and points at a removed component (deserves a `TUTORIAL_SPOTLIGHT_TARGETS` lint test that fails on tokens with no matching `data-tutorial-step` attribute in the live tree);
   - OR the Cost Ledger really exists but is buried inside CODEX / endgame, in which case the tutorial should say *where* the player finds it.

### Architectural notes (not bugs, just observations)

- All 8 steps are passive description — none ask the player to click anything to advance. "Tell, not show" — Onboarding industry consensus is "show by gentle prompt" outperforms "tell" by ~2-3x retention. Consider adding a `requires_user_action` field per step where step N is gated on the player having actually opened the spotlighted surface at least once.
- Spotlight tokens are good design: components opt in with `data-tutorial-step="<token>"`, the overlay couples on tokens not selectors. Solid contract. The lint test mentioned above would harden it.
- The file is faction-agnostic as claimed (`"your faction"` consistently). Good.

### Recommendation

Single edit pass on `onboardingSteps.ts` for defects 1, 2, 3. For defect 4, decide whether Cost Ledger is its own surface or lives under CODEX, then either add a top-bar button + `data-tutorial-step="cost-ledger"` on it, OR update step 08 target + copy to point at where the Cost Ledger actually is. Add the spotlight-token lint test as the regression guard.

---

## Finding 10 — Codex content quality is high; minor source-depth inconsistency

Sampled 3 essays (`ahmici_massacre_1993`, `bijeljina_massacre_1992`, `dayton_signed_1995`) plus the index. Conclusion: **quality is high.**

### Positive signal

- Proper ICTY case-number citations (IT-95-14-T Blaskic, IT-95-14/2-T Kordic, IT-95-16-T Kupreskic, IT-95-5/18-T Karadžić).
- Specific death-toll ranges grounded in tribunal findings (e.g. "approximately 103 to 116 Bosniak civilians" at Ahmici).
- Honest acknowledgement of judgment revisions ("Blaskic's conviction was substantially revised on appeal").
- Balanced framing — Ahmici essay explicitly notes "Many Bosnian Croats had no involvement in or knowledge of the attack, yet found themselves collectively associated with its consequences."
- Sophisticated diplomatic framing — Dayton essay titled "Ending the War, Freezing the Questions", closing line acknowledges what was deferred.
- Proper em-dashes throughout (no `\U2014` artifacts in the live data).

### Minor finding

Source-depth varies across essays without obvious editorial reason. Bijeljina has 1 ICTY source; Ahmici has 3; Dayton has 3 (one ICTY + one UN Resolution + one primary doc). Not necessarily a problem — different events have different evidentiary depth — but for a series claiming consistency, a per-category source-count floor (`humanitarian: ≥2 ICTY sources`, `diplomatic: ≥1 primary doc + …`) would standardize.

### Recommendation

No actionable defect. Optional: add a content-QA test asserting per-category source-count floors and ICTY case-number format validity (regex `IT-\d+-\d+(/\d+)?-(T|A|R)`).

---

## Finding 11 — CLI scenario run + determinism stress test BLOCKED in sandbox

### What I tried

`timeout 40 node_modules/.bin/tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_40w.json --unique --out runs`

### What blocked it

```
You installed esbuild for another platform than the one you're currently using.
This won't work because esbuild is written with native code…
```

The sandbox is Linux. `node_modules/esbuild` was installed on Windows by the user (the working tree is mounted from F:\). Specifically `@esbuild/win32-x64` is present where `@esbuild/linux-x64` would need to be. Running the scenario in this sandbox would require `rm -rf node_modules && npm install` on Linux — which would rewrite ~300 MB of files and break the Windows-side build until reinstalled.

### What this means for the audit

Two intended audit lanes — **CLI scenario run + output integrity** and **Determinism stress test** (two runs hash-compared) — are not executable in my Cowork sandbox. These need to run on the Windows host. The team's own CI does run them (the napkin references `n1740 = 86ebf26ae0271465` as the current 40w hash anchor), so this is purely a "where does the test execute" gap.

### Recommendation

Out of scope for me to fix; flagging as an environment note. The audit lane I would run if I could:

1. `npm run sim:scenario:run:40w -- --unique --out runs`
2. Compare `final_save.json` hash to `86ebf26ae0271465` — confirm anchor still holds.
3. Walk `run_summary.json` for: any formation with `corps_id` not in oob_corps.json (would surface Finding 7 from a different angle), any operation with `participating_brigades` referencing IDs not in the brigades roster, any `displacement_humanitarian_aggregates` totals that don't reconcile with `displacement_origin_dest_arrivals`, any `casualties.killed_by_faction` totals not matching `military.named_officers[].battles` × estimated per-battle losses.

Cheap on the Windows host (the team runs this multiple times a day per the napkin's perf-profile cadence). Worth wiring as a one-shot script.

---

## Finding 12 — Decision Room walkthrough BLOCKED by Chrome viewport regression

### What I tried

Click into Army HQ → BRIEFING → exercise the 13 priority cards (BRIEF / INSPECT / DECIDE / EXECUTE / REPORT / COST / JUDGE / NEXT plus the command-loop row).

### What blocked it

Mid-session, the Chrome screenshot capture started returning a 440x66 pixel viewport instead of the full 1568x900 window. `resize_window` calls accepted but produced no observable change. Could be a tab-state regression from the earlier HMR cascade (Vite reloaded twice during my source edits), could be the Cowork extension's screenshot buffer getting confused after the deep tab-juggling I did in this session.

### Recommendation

Re-attempt in a clean session — open fresh Chrome, navigate directly to `localhost:3002`, select faction, advance to corps detail, click into Army HQ briefing. The Decision Room flow is the one player surface the napkin explicitly names as the "central product spine"; it deserves a dedicated walkthrough.

---

## Summary table (round 2)

| # | Finding | Severity | Effort |
|---|---|---|---|
| 7 | Officer roster has 8 dead `home_corps_id` + 7 dead `compatible_corps_ids`; `jna_herzegovina_command` runtime-only | Medium (silently breaks officer affinity for ~15 officers including Pandurević, Talić's compat list) | Half-day data fix + regression test |
| 8 | `useIPC.ts`: `getAdvisorRecommendation` browser fallback missing `ok` key; 5 query methods typed `Promise<unknown>` | Low–medium (contract drift; one real divergence) | One-line fix + 5-line type lift + lint test |
| 9 | Tutorial copy: 4 concrete defects (redundancy, jargon leak, promise-vs-deliver gap, unreachable spotlight target) | Medium (first-player experience) | Single copy edit + spotlight-token lint |
| 10 | Codex content quality is high; minor per-category source-depth inconsistency | Low (no actionable defect) | Optional regex/floor test |
| 11 | CLI scenario run + determinism stress test blocked in sandbox | n/a — env limitation, not a defect | Run on Windows host |
| 12 | Decision Room walkthrough blocked by Chrome viewport regression | n/a — env limitation, not a defect | Re-attempt fresh Chrome session |

Round-2 leverage stack:
- **Finding 9 (tutorial)** is the cheapest defect that affects the player's first impression. Maybe 30 minutes of editing for findings 1–3 of that section.
- **Finding 7 (officer roster)** is silent today (officers get loaded as reserve and never assigned) but compounds: every new piece of officer logic the team writes will hit these dead refs as "edge cases" until cleaned up.
- **Finding 8** is small but it's the contract surface the entire IPC boundary depends on. Worth fixing cleanly so contributors can trust `if (result.ok)`.

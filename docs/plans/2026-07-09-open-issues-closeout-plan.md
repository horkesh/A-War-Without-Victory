# Open Issues Closeout Plan

**Date:** 2026-07-09
**Status:** Active tracker-triage plan. Docs/process only; no runtime code, scenario data, canon text, or calibration thresholds change here.
**Current release rule:** Open GitHub issues are not pre-D2 blockers unless this plan or the owner explicitly marks them as an active release blocker. The current release path remains WP-9 owner friction diaries -> D2 owner full-campaign playthrough -> D3 operator gate -> D4 final docs/release sweep -> 1.0 tag.

## Closeout Categories

| Category | Meaning | Close rule |
|---|---|---|
| `close-now` | Already superseded or duplicate; no implementation needed. | Comment with the canonical reference, then close. |
| `owner-decision` | Requires owner/design/source approval, not agent implementation. | Keep open until owner decides pre-1.0 vs post-1.0/deferred; close only after decision is recorded. |
| `deferred-calibration` | Real engine/calibration debt that needs a scoped implementation branch and 40w/188w proof. | Keep open; do not pull into D2 unless owner reclassifies it as a release blocker. |
| `deferred-infrastructure` | Engineering debt that is not release-path blocking while CI gates compensate. | Keep open or close only after a replacement contract lands. |
| `tracker-split` | Aggregated issue with mixed stale and real residuals. | Replace with smaller issues or comment a narrowed residual list before closing. |

## Issue Classification

| Issue | Classification | Closeout path |
|---|---|---|
| #237 `i18n(§6): native-speaker polish for camp/Foča/Višegrad essay BCS translations` | `owner-decision` | Native-speaker/signoff lane. Decide pre-1.0 required vs post-1.0 LQA. |
| #195 `i18n: Bosnian diacritic LQA — fast-track war-crimes labels + safe subset` | `owner-decision` | Same BCS LQA lane as #237; can be combined only with owner approval. |
| #194 `design: FORAWWV open rulings D2/D3/D4 (owner decisions)` | `owner-approved` | Owner approved the D2/D3/D4 packet recommendations on 2026-07-09. Record approval and close; do not edit `FORAWWV.md` automatically. |
| #192 `assets: soundscape sourcing approval (owner + §6 sensitivity gate)` | `owner-approved` | Owner approved the recommended sourcing order and Section 6 sensitivity lane on 2026-07-09. Record approval and close; implementation still needs supplied/wired assets plus proof. |
| #170 `Codex review-thread backlog: engine/cache/event follow-ups` | `tracker-split` | Narrow to current residuals only, or replace with individual issues. Do not treat stale closed comments as active work. |
| #41 `Calibration: op-axis 2-hop concentration support off-by-one` | `deferred-calibration` | One-change calibration branch only; requires focused proof plus 40w/188w gates. |
| #31 `Calibration debt: WA timing + anchor failures + HV teleportation source` | `deferred-calibration` | Calibration session work; not D2 release-path work by default. |
| #24 `Operation Jackal "ghost-op" pattern` | `deferred-calibration` | Scenario/control attribution work; requires baseline and engine-health proof. |
| #23 `Washington Agreement cannot fire in 188w runs` | `deferred-calibration` | Event/pipeline calibration; resolve only with 188w proof and receipt checks. |
| #22 `apr1992_definitive_188w missing war_timeline ref` | `deferred-calibration` | Scenario wiring change; output-affecting and must run baseline/engine-health gates. |
| #20 `Option K: HRHB campaign-plan wiring` | `deferred-calibration` | Depends on scenario/doctrine wiring and HVO posture work; keep out of D2 unless owner pulls forward. |
| #18 `Add tier_boost EventEffect for event-driven main_effort tier promotion` | `deferred-calibration` | Keep as the canonical `tier_boost` issue. Requires event-effect design and engine proof. |
| #17 `New EventEffect: tier_boost for event-driven brigade tier promotion` | `close-now` | Duplicate of #18; close with pointer to #18 as canonical. |
| #16 `OOB: assign equipment_class for historically motorized/mechanized brigades` | `deferred-calibration` | Historian/OOB data lane; requires source-backed data and 188w proof. |
| #13 `HVO offensives blocked by N1297 organizational readiness gate` | `deferred-calibration` | Parent calibration architecture issue for #16/#18/#9. |
| #11 `Low combat tempo in long-run scenarios` | `deferred-calibration` | Broad calibration theme; close only when smaller causal issues are resolved or superseded. |
| #10 `SUPERSEDED: Srebrenica/Zepa fall receipts are event-owned` | `close-now` | Already superseded by event-owned receipt doctrine; close with current docs pointer. |
| #9 `HVO Croat-Bosniak war doesn't emerge` | `deferred-calibration` | Historical/event-calibration lane; depends on HVO posture/equipment/tier issues. |
| #6 `Baked startup snapshot drifts across platforms` | `deferred-infrastructure` | Keep open while CI regenerate-before-test compensates; close only after cross-platform artifact contract is replaced. |

## Execution Plan

1. Land this tracker classification as docs/process only.
2. Comment and close #10 as superseded by event-owned receipt doctrine.
3. Comment and close #17 as duplicate of canonical #18.
4. Leave #18 open as the single `tier_boost` EventEffect design/calibration issue.
5. Leave remaining owner-decision issues open; do not close without explicit owner approval. #194 and #192 received owner approval on 2026-07-09 and should be closed with approval comments.
6. Leave calibration issues open and behind WP-9/D2 unless owner reclassifies them.
7. For #170, schedule a separate tracker-split pass only if owner wants issue cleanup beyond obvious housekeeping.

## Verification

- Docs-only diff.
- `git diff --check`.
- GitHub issue evidence: #10 and #17 closed; #18 remains open.
- No changes to `docs/10_canon/FORAWWV.md`, runtime code, scenario data, baselines, or generated artifacts.

## Done Means

- The tracker has a written classification for every open issue.
- Obvious housekeeping issues are closed with traceable comments.
- Remaining open issues are intentionally open and not implied release blockers.
- Command Board and ledger point future agents to this plan before acting on old GitHub issues.

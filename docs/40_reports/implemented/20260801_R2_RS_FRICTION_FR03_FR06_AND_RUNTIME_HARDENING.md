# R2 RS Friction: FR-03/FR-06 and Runtime Hardening

**Date:** 2026-08-01
**Status:** Source, harness, and non-Electron gates complete; fresh packaged RS acceptance still required
**Workstream:** R2 — RS Desk -> Decision -> Advance friction
**Plan:** [RS 104-week friction remediation](../../plans/2026-07-31-rs-104week-friction-remediation-plan.md)

## Outcome

The final R2 source packets now close the direct historical-operation evidence handoff and the late-campaign active-path overflow found in the RS owner diary. The same bounded change also fixes two presentation bugs discovered during the attempted 104-week acceptance run, makes the Warroom docket counts semantically explicit, explains capped-Authority quiet weeks without inventing decisions, and hardens the Electron harness against a false mandatory stack-picker assumption.

This is not final R2 acceptance. A fresh packaged, no-resume 104-week RS run must still materialize the new geometry receipts and complete the final surface tour. The prior attempted run is retained only as negative evidence.

## Product Changes

### FR-03 — dossier -> retained map -> same dossier

- Historical-operation authorization now exposes sorted, deduplicated authored objective OSIDs, staging OSIDs, formation IDs, and corps identity. Missing authored references remain missing; no name geocoding or target inference was added.
- The Decision Room dossier owns an exact `Show on map` action. It hands an App-owned field-plan focus to the existing campaign tactical viewport instead of creating a new renderer or authorizing from the map.
- The retained map frames the exact objective/staging union after current-revision readiness, suspends normal bounds only for the evidence view, distinguishes objectives and assembly areas, highlights reported friendly participants, and exposes a compact operation-plan card.
- `Return to dossier` restores normal bounds and the exact originating dossier. Focus is UI-only, is cleared on campaign replacement/hide, and never enters save, replay, scenario, or simulation state.
- The lifecycle remains one retained main-map owner and one retained Deck owner; hidden camera work and duplicate renderer ownership fail the harness.

### FR-06 and presentation bugs

- Active campaign paths are stable-alphabetical and bounded. At viewports below 1600 px the strip shows one full semantic label plus deterministic `+N`; at 1600 px and above it shows at most two full labels plus `+N`. The popover retains every full path in stable order and restores keyboard focus.
- Visible path chips no longer accept one-letter flex collapse or CSS truncation. Full accessible titles remain as redundant discovery aids.
- Situation prose owns `min-width: 0`, `max-width: 100%`, and `overflow-wrap: anywhere`. The Command/OOB scroll owner is vertical-only, but runtime acceptance additionally requires its content width to fit; `overflow-x: hidden` is not treated as proof.
- The bottom strip and OOB now expose stable geometry selectors used by packaged checkpoints.

### Docket and quiet-week truth

- The Warroom dock now labels its weighted readiness-card count `Review Before Advance` and separately shows the source pending-review count as `PENDING N`; it no longer presents the first value under the ambiguous generic `STAFF REVIEW` label.
- A shared pure cadence-hold selector is used by both the Desk Authority band and Warroom. When Authority is at least 90% of cap and no sourced Required or Recommended presidential act is filed, the weekly loop visibly says `NO SOURCED INITIATIVE · POLICY HOLDS` and provides the existing full explanation through its accessible name/title.
- No event, initiative, signature, Authority cost, recurrence rule, or simulation cadence was created. Quiet intervals remain truthful policy holds.

## Harness Hardening and Runtime Receipts

- A final-tour stack-picker proof is now explicitly `not-applicable` when no visible formation stack badge exists. The harness captures a receipt and screenshot with reason `no-visible-formation-stack-badge`. If a badge exists but is not hit-testable, unstable, exposes no exact member, or fails to open the exact formation detail, the tour still fails closed.
- Exact-counter verification now keeps the target identities frozen to the initial ready-map sample. Panel reflow may make an original target unavailable, which is reported explicitly; it may not silently substitute a newly visible counter and turn that accidental extra probe into an acceptance blocker.
- Packaged local OSM/hillshade `ERR_ABORTED` requests are classified only inside the explicit historical-operation navigation window, for exact loopback origin/path, GET/fetch, non-main-frame, pre-teardown requests. Remote, expired, and out-of-window failures remain fatal.
- `war-map` and every light checkpoint map now record and assert `mapChromeGeometry` before the screenshot:
  - document `scrollWidth <= clientWidth + 2`;
  - bottom-strip local width fits and ancestor-visible ratio is at least 0.98;
  - OOB `overflowX` is hidden as a failsafe **and** `scrollWidth <= clientWidth + 2`;
  - Situation content and every representative prose sentinel fit locally, remain at least 98% ancestor-visible, and compute `overflow-wrap: anywhere`;
  - branch row contains one or two chips, row/chips/remainder remain at least 98% ancestor-visible, each chip is at least 48 px and its rendered text fits `scrollWidth <= clientWidth + 1`, and `+N` is at least 24 px.

These checks reject concealed overflow, half-chips, inaccessible prose, and document-level horizontal scrolling. The actual numeric packaged receipts remain an acceptance output of the next run, not a claim of this source closeout.

## Rejected 104-Week Run — Negative Evidence Only

The fresh packaged attempt labeled `20260801-r2-rs-104w-owner-postfix-v1` used:

```text
node tools/ui/paradox_local_qa.cjs --turns=104 --label=20260801-r2-rs-104w-owner-postfix-v1 --faction=RS --strategic --auto-recruit --light-checkpoint-tour --final-checkpoint-tour --packaged-executable="dist-packaged/win-unpacked/A War Without Victory.exe"
```

The exact executable SHA-256 was `2CEF3FCCAD217606340BAFE4105693E6ACA3307655EFF53D4D8F789BF243B513`. The campaign reached exact turn 104 in the war phase and produced 456 screenshots (`000`–`455`), including the final `war-map` image. It then exited 1 because the old final tour unconditionally required a visible stack badge:

```text
Error: No visible formation stack badge was available for final-turn-104-stack-picker
```

Negative evidence is retained locally under `tmp-paradox-qa-20260710/`, including the 73,530,267-byte progress packet and the error receipt. Because the process failed before final receipt emission, it has no accepted final diagnostics JSON and is **not** a completed diary, clean-runtime claim, or R2 acceptance packet.

Useful non-acceptance observations remain diagnostic only: Owen–Stoltenberg did not end the war after only HRHB and RS accepted; field-plan presentations for Donji Vakuf, Cerska–Kamenica, and Trnovo exposed exact objectives/assembly/participants; and the run observed two 13-week source-backed decision gaps rather than the previously suspected 19-turn gap. The new capped-Authority explanation addresses comprehension; no unsupported decision was inserted.

### Later negative lineage

The rebuilt package used executable SHA-256 `72B49C7EF477371015BADB28E6CD833F5FDF9225F19F47FE365D7CCEE346F771` and ASAR SHA-256 `D53B1848ACB0F51AFB2DCF2115463E54F3513D0008057D83DE0D64D932FB61AD`. Fresh no-resume run `20260801_r2_rs104_fresh_v4` reached exact turn 104 and wrote autosave SHA-256 `65C7AFA2DB0D71411E9EF86D5023248BB0FAF6545C3D9B7C80D496C108E08A06`, but the final surface tour remained on the Desk/Warroom route after an Army HQ handoff and timed out waiting for the field Records toolbar. The harness now restores the exact War Map route and current-revision readiness before that toolbar check.

Resume diagnostic `20260801_r2_rs104_v4_routefix_resume2` then exposed a separate harness defect after five exact counter/detail successes. The probe had frozen an initial counter sample but selected later candidates from the changing post-panel viewport; it therefore substituted newly visible `rs_1st_krnjin_light_infantry` and failed on an undeclared extra target. RED/GREEN coverage now selects only an unattempted member of the frozen target set and preserves the existing fail-closed rule when no exact formation can be verified. Both runs remain negative evidence: neither is a fresh accepted diary, and the route repair still requires live proof in the next no-resume campaign.

## Verification and Review

- Geometry/harness focused: 7 files / 97 tests.
- R2 owner/contract matrix: 18 files / 231 tests.
- Full player journeys: 44 files / 770 tests.
- `tsc --noEmit -p tsconfig.json`: pass.
- `node --check tools/ui/paradox_local_qa.cjs`: pass.
- Counter target-set RED/GREEN: 1 file / 46 tests.
- `git diff --check`: pass.
- Independent UI/UX review first blocked hidden-overflow evidence gaps, then approved the corrected measured-width, wrapping, ancestor-visibility, and semantic-label contracts.
- Earlier independent FR-03 review approved exact authored identity, retained renderer ownership, current-revision focus, same-dossier return, and bounded navigation-abort classification.

## Scope and Remaining Gate

Changed scope is UI read models, retained map handoff/presentation, diagnostics/harness, tests, and documentation. Simulation, historical event content, scenario balance, save schema, deterministic baselines, package version, tag, installer, signing, store upload, publication, and public release state are unchanged. `docs/10_canon/FORAWWV.md` is unchanged.

Next: rebuild the transient unpacked package only after the Electron lease, run a fresh no-resume 104-week RS campaign, require clean final diagnostics plus materialized geometry receipts, then write the actual completed owner diary. The rejected run above remains negative lineage and cannot satisfy that gate.

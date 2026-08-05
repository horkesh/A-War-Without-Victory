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

Fresh no-resume run `20260802-r2-rs104-fresh-v5` used executable SHA-256 `0E80B7112051F109A8055C13B7F6453BC9A7E3666DEF718E3B5CB9EADA8607F0` and ASAR SHA-256 `87093DEAAC7A5292BE7DFBD1A83AAF099C8359B5D08E09DE9798B79634AB0890`. It reached exact turn 104, completed the route, counter, Army HQ, and full final tours, wrote 512 screenshots through `511-playthrough-final.png`, and preserved state/autosave hashes across inspection. It had zero console messages, page errors, unexpected network failures, and main-process stderr. It then failed closed on ten readability observations, reducing to four defects:

- the historical-operation participant row deliberately truncated `1st Podrinje Light Infantry Brigade` instead of wrapping it;
- the absolutely positioned `DIPLOMATIC` category stamp occluded long faction badges;
- direct Desk flex children were allowed to shrink, letting content bleed beneath the status dock rather than remaining inside the shell scroll owner;
- the QA diagnostic treated `[role="dialog"][aria-modal="false"]` as an active modal root, displacing the real event modal and duplicating underlying Desk observations.

RED-first tests now require wrapped operation identities, a normal-flow wrapping event-metadata row, nonshrinking Desk cards under the existing vertical scroll owner, and exclusion of explicitly non-modal dialogs from active-modal diagnostics. The focused four-file matrix passes 74 tests; the adjacent eight-file matrix passes 94 tests; TypeScript, harness syntax, and diff hygiene pass. Run v5 remains rejected negative evidence. A newly built package and brand-new no-resume campaign are still required.

Fresh no-resume run `20260802-r2-rs104-fresh-v6` used the rebuilt external tactical-map bundle `feature-command-ui-BhDCO6zV.js` (SHA-256 `AC7CD9F235DE583FC67FBD9D5A027D8D95992197C48A294942BB8006E7A98299`) and packaged index SHA-256 `51E895DA67142BEB433331DB830EEC88DE4212F4C9131988FD14ADADE6DEEAF2`. The EXE/ASAR hashes remained equal to v5 because `signAndEditExecutable` is disabled and the tactical map is shipped as unpacked `extraResources`, not inside `app.asar`; direct bundle inspection confirmed every repaired selector/class in the package.

Run v6 reached exact turn 104, completed its full route/counter/Army-HQ tour, captured 512 screenshots through `511-playthrough-final.png`, preserved final-tour state/autosave integrity, and exited with zero console messages, page errors, unexpected network failures, or main-process stderr. All v5 readability defects were absent. It failed closed only because the diagnostic counted the Warroom whiteboard date under an `aria-hidden="true"` scene board: bitmap-backed transparency was misread as 1.27:1 against black, while overlays correctly covering the decorative background were reported as occlusion. Visual inspection shows dark navy date text on the light whiteboard; the scene board is intentionally absent from the accessibility tree.

A RED harness contract now requires effective visibility to reject any `aria-hidden="true"` ancestor. The implementation applies that rule to text, active-modal discovery, alerts, controls, and overflow candidates. The focused harness/Warroom matrix passes 3 files / 101 tests; harness syntax and diff hygiene pass. Run v6 remains negative diagnostic lineage, not acceptance or a diary.

Fresh no-resume run `20260802-r2-rs104-fresh-v7` again reached exact turn 104, completed the full route/counter/Army-HQ tour, captured 512 screenshots through `511-playthrough-final.png`, and recorded zero console, page, unexpected-network, and main-process-stderr diagnostics. Every v5 and v6 finding was absent. It failed closed on five repeated observations of the live `Intelligence brief` family label in a Decision Packet card painting beneath the fixed bottom status dock. Screenshot `225-officer-event-after-acknowledge.png` confirms this was a product defect, not a diagnostic false positive.

The remaining cause was nested vertical scroll ownership: `PresidentDeskShell` owned the viewport above the status dock while `DeskPacket` created a second composited `max-h-[48vh]` scroller. The prior nonshrinking-card repair was necessary but not sufficient. A RED regression now requires the outer Desk to be the only vertical scroll owner. The repair removes the packet scroller, adds outer overscroll containment and bottom padding, hides horizontal overflow, and makes the packet and situation panels full-width intrinsic-height children. The focused Desk/harness/Warroom matrix passes 3 files / 82 tests; TypeScript, harness syntax, and diff hygiene pass. Run v7 remains rejected negative evidence.

Fresh no-resume run `20260802-r2-rs104-fresh-v8` reached exact turn 104, completed the full route, frozen-counter, Army-HQ, and final surface tours, captured all 512 screenshots through `511-playthrough-final.png`, and again recorded zero console, page, unexpected-network, and main-process-stderr diagnostics. Every v5-v7 content and classifier finding was absent. It failed closed on six duplicate-checkpoint observations of the live bottom-dock labels `WAR`, `REQUIRED 1`, and `SIGNATURE REQUIRED` at y=766-781.

The screenshot alone did not establish which surface owned the hit-test conflict, so a bounded fresh turn-1 probe added exact sampled `elementsFromPoint` identities to fully occluded text rows without weakening the gate. All nine samples returned the Strategic Situation `aside`, proving a real product defect: the scrolling Desk descendant could still paint and receive input outside the shell's intended bottom boundary. The same probe found three independent Army HQ contrast defects: `In execution` at 4.20:1, the commander label/name at 3.07:1, and the officer `compliance` label at 3.07:1.

RED-first coverage now requires a hard-clipped non-scrolling Desk shell plus one bounded inner vertical scroll region whose direct cards remain intrinsic-height. The repair applies that structure and raises the three Army HQ tones to readable palette tokens. Occlusion diagnostics retain the exact top-hit tag/id/test-id/class evidence so future stacking failures remain attributable. The focused six-file matrix passes 118 tests; TypeScript, harness syntax, and diff hygiene pass. Run v8 and the turn-1 probe remain rejected negative evidence. A rebuilt package and brand-new no-resume acceptance run are still required.

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

Next: rebuild the transient unpacked package with the hard-clipped Desk viewport and Army HQ contrast repair, run a brand-new no-resume 104-week RS campaign, require clean final diagnostics plus materialized geometry receipts, then write the actual completed owner diary. Every rejected run above remains negative lineage and cannot satisfy that gate.

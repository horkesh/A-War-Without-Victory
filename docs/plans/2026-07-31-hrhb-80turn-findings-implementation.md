# HRHB 80-turn findings implementation plan

**Date:** 2026-07-31
**Scope:** Repair every confirmed bug and the four material friction findings from the HRHB 80-turn packaged-Electron diary, then verify a freshly built (not packaged) Electron runtime.
**Release constraint:** Do not commit, stage, push, package, switch branches, or change release state.

## Evidence-led diagnosis

1. **HRHB text contrast:** the primary `faction-hrhb` Tailwind text token is `#4080b8`, below WCAG AA on the dark panel surfaces used by the Desk and Decision Room.
2. **Map-counter QA quota:** the harness fixes its required verification count from the first viewport sample, then fails when normal detail-panel/viewport churn makes some of that initial sample unreachable.
3. **Simultaneous event identity:** the UI sorts pending event decisions by required status, fire turn, and event id; the harness reads unsorted save order and binds receipts to the wrong event.
4. **Event/reserve priority:** required event handling is incorrectly gated behind `strategicRun`, so resume/diary runs can enter reserve handling while an event modal is still mandatory.
5. **Reserve churn:** `tickEliteLoans` force-recalls a healthy, needed loan at twelve turns even though canon defines operation-tied loans with no fixed expiry.
6. **Historical peace ending:** fresh desktop state is emergent, so all bot delegations accepted Cutileiro and manufactured a unanimous turn-one settlement despite the documented RBiH rejection. Normalize all three responses to the documented pre-war record only when the player selects the documented Cutileiro response.
7. **HRHB decision drought:** source-backed presidential beats are missing between the summer decisions and the later 1992/1993 sequence.
8. **Operation Jackal visibility:** a specifically tagged historical operation authorization is presented as an ordinary advisory proposal and can be advanced past.

## Implementation

### 1. Lock regressions first

- Extend contrast tests to audit the primary HRHB text token.
- Add an active-operation elite-loan test that crosses the former twelve-turn cap.
- Add harness contracts for dynamic counter coverage, visible event identity, deterministic pending-event order, and event-before-reserve priority.
- Add a real fresh-campaign HRHB Cutileiro acceptance regression proving that live emergent bot state is normalized to the documented RBiH rejection and cannot end the war at turn one.
- Add Decision Room and Inbox tests proving only `HISTORICAL_OP:` authorizations are blocking; ordinary autonomy proposals remain advisory.
- Add event-data acceptance assertions for the two new late-1992 HRHB events and their historical defaults.

### 2. Repair confirmed bugs

- Replace the primary HRHB text token with the audited contrast-safe HRHB blue.
- Remove the noncanonical elite-loan maximum-duration recall.
- Make counter coverage adaptive to the identities that remain reachable after each exact click while requiring at least one exact formation verification when owned formations exist.
- Mirror the UI event-priority comparator in the harness.
- Expose the visible event id on the response rail/buttons and bind harness receipts to that id.
- Handle required events before reserve requests in every run mode.

### 3. Resolve friction and polish

- Add a Bosanski Brod/Orašje HRHB decision anchored to BB1 pp.181–183.
- Add a Jajce alliance/defence decision anchored to BB1 pp.183–184.
- Keep both historical defaults calibration-inert apart from traceable flags, dimension shifts, and cost-ledger annotations.
- Promote tagged historical operation authorizations to a presidential signature-due blocker with stronger title/action copy; leave ordinary proposals unchanged.
- Add reserve recurrence context (prior approvals, cumulative authority, and last recall reason where available) to the release dossier.
- Clarify the no-hard-expiry reserve rule and the historical-operation signature rule in canon/UI documentation.

### 4. Verification

- Run targeted Vitest suites after each red-to-green cycle.
- Run typecheck and the relevant broader fast/UI suites.
- Build map, simulation bundle, and War Room outputs without invoking any package target.
- Run a focused HRHB Electron regression far enough to cross the repaired cadence and former reserve-expiry window; archive diagnostics/screenshots without changing release state.
- Review `git diff --check`, the scoped diff, and working-tree status.

## Determinism and historical constraints

- New events use stable ids, bounded deterministic turn windows, explicit historical defaults, and source notes.
- Historical-path effects do not change control, formation placement, supply, or combat calibration.
- Event priority uses a shared stable ordering: required first, earlier `turn_fired`, then strict ASCII event id.
- No random selection, wall-clock input, filesystem-order dependence, or uncited location rule is introduced.

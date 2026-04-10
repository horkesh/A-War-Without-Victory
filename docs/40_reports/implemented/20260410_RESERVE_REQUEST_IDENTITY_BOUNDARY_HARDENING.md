# 2026-04-10 - Reserve Request Identity Boundary Hardening

## Lane

- **Lane title:** `fix(desktop): align reserve approval with canonical request identity`
- **Date:** 2026-04-10
- **Branch/worktree:** `codex/hardening-444-pocket`

## Why this lane

After the player-truth shell pass, the next highest-value bounded seam on the global board was in the reserve system rather than the territorial residual board. Reserve requests already had canonical packet identity via `request_id`, and both decline/history paths consumed that identity, but the approval path still keyed off `corps_id`.

That made approval a second truth owner:

- UI approval selected a request row but sent only `corps_id`
- desktop IPC accepted only `corpsId`
- desktop sim found the first pending request for that corps and removed all same-corps entries

This beat Gorazde, Podrinje, and the 444th salient because:

- Gorazde remains content/runtime audit until source ownership is proven
- Podrinje remains redesign-blocked because no canonical stranded lifecycle owner exists
- 444th remains doctrine realism, not a packet-identity bug
- the reserve seam was already bounded by an existing canonical owner: `ArmyReserveRequest.request_id`

## Seam and root cause

### Exact seam

Reserve request approval was keyed by `corps_id` while decline/history were keyed by `request_id`.

### Root cause

The approval path was implemented as a corps-level convenience action instead of a packet-level action:

- `ArmyReservePanel` called `approveReserveRequest(req.corps_id, ...)`
- preload and `useIPC` exposed approval with `corpsId`
- `electron-main.cjs` handled `approve-reserve-request` with `corpsId`
- `desktop_sim.ts` resolved the request with `pending_reserve_requests.find(r => r.corps_id === corpsId)` and removed all matching same-corps requests

That silently collapsed request identity and made the approval boundary inconsistent with the rest of the reserve system.

## Canonical owner after cleanup

- **Canonical owner:** `ArmyReserveRequest.request_id`
- **Demoted path:** corps-keyed approval/removal using `corps_id`

## Changes made

1. Hardened the desktop sim approval owner
   - `approveReserveRequest(...)` in `src/desktop/desktop_sim.ts` now accepts `requestId`
   - request lookup now resolves by canonical request identity
   - approval now removes only the selected request, not all requests for the same corps
   - decline path now uses the same normalized request-id helper for save-compatibility consistency

2. Threaded `request_id` across the full approval boundary
   - `src/desktop/electron-main.cjs`
   - `src/desktop/preload.cjs`
   - `src/ui/map/desktop/useIPC.ts`
   - `src/ui/map/components/ArmyReservePanel.tsx`

3. Tightened UI row identity
   - `ArmyReservePanel` now keys pending-request cards by `req.request_id` instead of positional index when available

4. Added regression coverage
   - `tests/reserve_request_identity_boundary.test.ts` proves:
     - approval removes only the selected `request_id` even when multiple requests share a corps
     - the full player approval boundary uses `request_id`, not `corps_id`

## Player-visible result

The player now approves the exact request they clicked, not a corps-wide proxy action. If reserve requests ever appear with multiple same-corps entries, approval/history/decline will all tell the same story.

## Proof

This is a desktop/read-model/action-boundary lane, not a scenario-runtime behavior lane, so the strongest truthful proof is local identity regression plus the full verification bar. Live scenario residuals are intentionally unchanged.

### Baseline

- `tests/reserve_request_identity_boundary.test.ts` initially failed in two ways:
  - approval by selected `request_id` returned the wrong result because sim approval still expected `corpsId`
  - the source boundary test found the UI/preload/main-process path still threaded `corps_id`

### Post-fix

- the same identity regression now passes
- broader reserve tests remain green
- full repo verification remains green
- `recovery:check` reruns the representative recovery/scenario contract suite successfully, proving the lane did not destabilize the broader product substrate

### Exact verification

- `npx.cmd vitest run tests/reserve_request_identity_boundary.test.ts`
- `npx.cmd vitest run tests/reserve_request_identity_boundary.test.ts tests/army_reserve_system.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npm.cmd run build`

### Scenario / anomaly proof

- **Baseline live board:** latest 40-week residual board in `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n5` remained the reference substrate (`anomaly count = 14`, Gorazde pair + Podrinje pair still visible)
- **Post-fix rerun:** not applicable as a scenario-delta claim because this lane changes only the reserve action boundary, not sim runtime rules or persisted scenario outputs
- **Truthful difference:** request approval identity is now consistent across approve / decline / history; live scenario residuals remain unchanged, which is correct for this lane

## Files changed

- `src/desktop/desktop_sim.ts`
- `src/desktop/electron-main.cjs`
- `src/desktop/preload.cjs`
- `src/ui/map/desktop/useIPC.ts`
- `src/ui/map/components/ArmyReservePanel.tsx`
- `tests/reserve_request_identity_boundary.test.ts`
- `docs/40_reports/implemented/20260410_RESERVE_REQUEST_IDENTITY_BOUNDARY_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual risks

- `redirectReserveLoan(...)` still routes by destination corps because it is a direct retasking action rather than a pending-request approval; if future UX lets the player redirect into a specific pending request, that path should adopt request identity too
- Gorazde remains content/runtime audit
- Podrinje remains redesign-blocked
- 444th remains doctrine realism

## Next lane

- **Next bounded lane selected:** campaign-level stop-check after commit; if no stronger bounded seam appears beyond Gorazde audit / redesign / realism residuals, the campaign should pause with the board explicitly classified rather than forcing a fake hardening lane

# 2026-04-10 Desktop Autonomy Boundary Truth Hardening

## Lane summary

- **Lane:** `fix(desktop): scope autonomy IPC to the active player faction`
- **Type:** Desktop / read-model boundary hardening
- **Canonical owner after cleanup:** `state.meta.player_faction` plus `pending_proposal_reviews[*].faction`, enforced at the desktop IPC boundary
- **Demoted path:** renderer-only faction filtering and id-based writeback without ownership checks

## Candidate seams considered

1. **Desktop autonomy boundary truth**
   - Chosen.
   - Highest-value bounded wrong-now seam after the UI truth batch because the renderer fix still depended on a permissive desktop contract.
2. **Packaged/runtime startup-snapshot truth**
   - Deferred.
   - Still a bounded hardening candidate, but larger than the active wrong-now ownership leak in autonomy IPC.
3. **Gorazde residual territorial pair**
   - Demoted.
   - Still content/runtime audit territory; not yet a truthful hardening claim.
4. **Podrinje stranded lifecycle ownership**
   - Demoted.
   - Redesign-blocked because no canonical lifecycle owner exists.
5. **444th Konjic overextension**
   - Demoted.
   - Doctrine/realism, not a truth-owner contradiction.

## Exact seam

The 2026-04-10 renderer fix made `AutonomyPanel` filter `pending_proposal_reviews` by active player faction, but the desktop IPC boundary still had two competing truths:

- `get-autonomy-state` returned the full mixed-faction `pending_proposal_reviews` array.
- `accept-proposal` and `reject-proposal` trusted any matching `proposal.id` without checking `proposal.faction` against `state.meta.player_faction`.

That left the renderer as the only owner gate even though the desktop boundary already owned both the active player faction and the proposal packets.

## Change

1. Added `src/desktop/autonomy_ipc_contract.cjs`
   - `getPendingProposalReviewsForPlayer(state)` scopes readback to the active player faction while keeping observer/no-player-faction reads broad.
   - `resolvePendingProposalAccess(proposals, proposalId, playerFaction)` rejects cross-faction proposal ids with `proposal_not_owned_by_player`.
2. Updated `src/desktop/electron-main.cjs`
   - `get-autonomy-state` now returns `getPendingProposalReviewsForPlayer(state)`.
   - `accept-proposal` and `reject-proposal` now call `resolvePendingProposalAccess(...)` before mutating proposal state.
3. Added regression coverage
   - `tests/desktop_autonomy_boundary_truth.test.ts`

## Why scenario proof is not relevant

This lane does not change:

- simulation behavior
- persisted schema
- scenario outputs
- anomaly generation

So the strongest truthful proof is desktop-boundary regression coverage plus the full verification bar.

## Before / after proof

### Baseline

- desktop `get-autonomy-state` could hand mixed-faction `pending_proposal_reviews` to the renderer
- `accept-proposal` / `reject-proposal` resolved by `proposal.id` only

### Post-fix

- desktop readback now scopes proposal packets to the active `player_faction`
- desktop writeback now rejects cross-faction proposal ids with `proposal_not_owned_by_player`
- the renderer remains a downstream consumer instead of the first and only owner gate

## Verification

### Targeted

- `npx.cmd vitest run tests/desktop_autonomy_boundary_truth.test.ts tests/desktop_persistence_contract.test.ts tests/autonomy_panel_player_faction_truth.test.ts`
  - passed
  - `3` files / `8` tests

### Full verification bar

- `npm.cmd run test:vitest`
  - passed
  - `241` files / `3123` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed
- `npm.cmd run recovery:check`
  - passed

## Files changed

- `src/desktop/autonomy_ipc_contract.cjs`
- `src/desktop/electron-main.cjs`
- `tests/desktop_autonomy_boundary_truth.test.ts`
- `docs/40_reports/implemented/20260410_DESKTOP_AUTONOMY_BOUNDARY_TRUTH_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual board after lane

- **Next bounded hardening lane:** packaged/runtime startup-snapshot truth
- **Content/runtime audit:** Gorazde residual territorial pair
- **Redesign-blocked:** Podrinje stranded same-faction brigade lifecycle
- **Later realism:** 444th Konjic salient discipline

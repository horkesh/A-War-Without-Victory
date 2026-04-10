# 2026-04-10 Autonomy Player-Faction Review Truth Hardening

## Lane summary

- **Lane:** `fix(ui): align autonomy proposal review with active player faction`
- **Type:** UI / player-truth hardening
- **Canonical owner after cleanup:** `loadedGameState.player_faction` plus `pending_proposal_reviews[*].faction`
- **Demoted path:** hardcoded `RBiH` filtering inside `AutonomyPanel`

## Candidate seams considered

1. **Autonomy proposal review player-faction truth**
   - Chosen.
   - Highest-value bounded wrong-now seam on the global board because it hid live review work from two playable factions.
2. **Commander zone-label humanization**
   - Deferred to the next lane.
   - Also bounded, but weaker than a faction-filtering bug that could make an entire review surface look empty.
3. **Gorazde residual territorial pair**
   - Demoted.
   - Still content/runtime audit territory; owner disagreement not yet classified tightly enough for hardening.
4. **Podrinje stranded lifecycle ownership**
   - Demoted.
   - Redesign-blocked because no canonical lifecycle owner exists.
5. **444th Konjic overextension**
   - Demoted.
   - Doctrine/realism, not a truth-owner contradiction.

## Exact seam

`src/ui/map/components/AutonomyPanel.tsx` filtered `pending_proposal_reviews` with `p.faction === 'RBiH'`. That meant the sim could publish real pending proposals for RS or HRHB, but the player-facing review surface would still render none of them.

The packet truth already existed. The panel was competing with it by remembering one default faction instead of consuming the live owner.

## Change

1. `src/ui/map/App.tsx`
   - passes the live `playerFaction` into `AutonomyPanel`
2. `src/ui/map/components/AutonomyPanel.tsx`
   - adds `filterPendingProposalsForPlayer(...)`
   - filters proposals against the live player faction instead of a hardcoded literal
3. `tests/autonomy_panel_player_faction_truth.test.ts`
   - locks both sides of the contract:
     - proposals are filtered by active player faction
     - `App.tsx` passes `playerFaction` into the panel

## Why scenario proof is not relevant

This lane does not change:

- simulation behavior
- persisted schema
- scenario outputs
- anomaly generation

So the strongest truthful proof is source-boundary regression coverage plus the full verification bar.

## Before / after proof

### Baseline

- `AutonomyPanel` filtered with `p.faction === 'RBiH'`
- RS and HRHB campaigns could receive proposal packets but still show an empty review surface

### Post-fix

- `App.tsx` passes `playerFaction={playerFaction}`
- `AutonomyPanel` filters via `filterPendingProposalsForPlayer(...)`
- proposal visibility now follows the active campaign faction instead of a remembered default

## Verification

### Targeted

- `npx.cmd vitest run tests\autonomy_panel_player_faction_truth.test.ts tests\desktop_persistence_contract.test.ts`
  - passed
  - `2` files / `4` tests

### Full verification bar

- `npm.cmd run test:vitest`
  - passed
  - `240` files / `3119` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed
- `npm.cmd run recovery:check`
  - passed

## Files changed

- `src/ui/map/App.tsx`
- `src/ui/map/components/AutonomyPanel.tsx`
- `tests/autonomy_panel_player_faction_truth.test.ts`
- `docs/40_reports/implemented/20260410_AUTONOMY_PLAYER_FACTION_REVIEW_TRUTH_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual board after lane

- **Next bounded hardening lane:** commander zone-label humanization in reserve/autonomy text
- **Content/runtime audit:** Gorazde residual territorial pair
- **Redesign-blocked:** Podrinje stranded same-faction brigade lifecycle
- **Later realism:** 444th Konjic salient discipline

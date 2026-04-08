# Operation AAR Provenance / Final-Control Honesty
**Date:** 2026-04-08  
**Status:** Implemented

## Lane Summary

This lane closed a player-facing truth seam in completed operation history.

Before this change, the AAR stack treated:

- `objective currently held at finalization`

as if it were equivalent to:

- `objective captured by this operation`

That ambiguity was already called out by prior anomaly triage: zero-attack success operations were not necessarily gameplay bugs, but the AAR/export layer could not tell the player whether control changed because of logged operation activity or because the objective simply ended up in friendly hands by finalization.

This lane did not redesign combat causality. It made the existing truth easier to explain:

- `objectives_captured` still means objectives held at finalization
- new provenance fields now separate:
  - objectives logged as captured during the operation
  - objectives held at finalization without any logged capture
  - a stable provenance summary for the whole AAR

## Canonical Owner

- Canonical owner: `src/sim/combat/operation_aar.ts`
- Adapter carrier: `src/ui/map/data/GameStateAdapter.ts`
- Canonical player-facing surface: `src/ui/map/components/OperationHistoryPanel.tsx`

The UI now consumes an explicit AAR provenance contract instead of inferring meaning from final-control counts alone.

## What Changed

### 1. Sim-owned AAR provenance

`finalizeOperationAAR()` now computes and persists:

- `objectives_logged_captured`
- `objectives_held_without_logged_capture`
- `capture_provenance`

The provenance summary is deterministic and derived from:

- objective order already owned by the operation
- `weekly_log[].objectives_captured_this_turn`
- `total_attacks`
- final objective control at AAR finalization

Current summary values:

- `no_objectives_held`
- `logged_capture`
- `held_without_logged_capture`
- `held_without_logged_attack`
- `mixed`

This is intentionally narrower than combat-causality proof. It does **not** claim that a logged capture was definitely caused by direct combat. It only distinguishes:

- logged during the operation
- merely held at the end
- held at the end with zero logged attacks

### 2. Adapter compatibility

`GameStateAdapter` now maps the new provenance fields through to the tactical-map UI.

It also derives a backward-compatible fallback when loading older AAR blobs that do not yet contain the new fields, so old saves do not silently lose this interpretation layer.

### 3. Player-facing history honesty

`OperationHistoryPanel` now speaks the contract explicitly:

- card summary uses `Held at end X/Y`
- expanded objective section is titled `Objectives Held at End`
- objectives that were only held at finalization are visually distinguished from objectives logged during the operation
- a targeted provenance note appears for the ambiguous cases
- a `Logged during operation:` line appears when such captures exist

This preserves the existing panel while making its central claim more honest.

## Files Changed

- `src/sim/combat/operation_aar.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/components/OperationHistoryPanel.tsx`
- `tests/operation_aar.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/ui_player_visibility.test.ts`

## Verification

### Targeted

- `node --check src\\desktop\\electron-main.cjs`
  - PASS
- `npx.cmd vitest run tests/operation_aar.test.ts tests/ui_player_visibility.test.ts`
  - PASS
- `npx.cmd tsx --test tests\\ui_map_game_state_adapter.test.ts`
  - PASS

### Full required verification

- `npm.cmd run test:vitest`
  - PASS (`216/216` files, `3020/3020` tests)
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - PASS
- `npm.cmd run build`
  - PASS

### Verification notes

- Full Vitest still emits pre-existing stderr/anomaly warnings from unrelated long-run integration coverage.
- Those warnings were already present outside this lane and did not block success.

## Residual Risks

- This lane improves AAR honesty, but it still does **not** prove direct combat causality for objective control changes.
- `weekly_log.objectives_captured_this_turn` remains a provenance-limited signal: it tells us the controller changed while the operation was active, not why.
- Per-axis provenance remains summarized only through existing axis objective/attack counts; there is not yet a per-axis held-vs-logged provenance split.
- The live command-decision shell still has other possible product-value lanes, especially around review queue coherence and command consequence legibility.

## Why This Was Worth Doing

This was more valuable than another packaged-runtime micro-lane because it repaired a core presidential review record:

- players read operation history to understand whether command decisions produced results
- the old surface over-attributed final control to the operation itself
- the new surface tells a more truthful story without inventing new causality or redesigning the system

## Integration Notes

### `docs/PROJECT_LEDGER.md`

Add:

`2026-04-08 - Operation AAR Provenance / Final-Control Honesty: strengthened the completed-operation AAR contract so operation history now distinguishes objectives logged as captured during the operation from objectives merely held at finalization. finalizeOperationAAR() now persists objectives_logged_captured, objectives_held_without_logged_capture, and a deterministic capture_provenance summary; the tactical-map adapter preserves those fields for new saves and derives a backward-compatible fallback for older AAR blobs. OperationHistoryPanel now labels objective status as "Held at end" and surfaces provenance notes for ambiguous no-logged-attack / held-without-logged-capture outcomes instead of implying that all final control was produced by direct operation capture.`

### `docs/plans/MASTER_ROADMAP.md`

If roadmap language references the open AAR provenance debt, mark it complete only if wording matches the delivered scope:

- completed-operation history now distinguishes `held at end` from `logged during operation`
- zero-attack success is no longer presented as clean capture truth on the player-facing history surface
- no claim of direct combat-causality proof

Suggested next product lane:

- `Army HQ / Presidential Review Queue Coherence`

### `.claude/architect_notes.md`

Add:

`When a player-facing history surface summarizes outcomes from live control state, never let "held at finalization" masquerade as "captured by this operation." If direct causality is not available, export a narrower provenance contract from the sim owner itself: what was logged during the operation, what was only held at the end, and the minimal deterministic summary the UI can speak honestly.`

## Recommended Next Lane

`Army HQ / Presidential Review Queue Coherence`

Reason:

- this lane improved the truth of completed command history
- the next strongest player-facing seam is the live review surface that tells the player what still needs attention now, why it matters, and what institution owns it
- that is a better pre-`v0.9.0` product investment than continuing to mine smaller AAR edge cases

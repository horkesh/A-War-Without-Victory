# Live Surface Browser Sweep and Command Copy

**Date:** 2026-06-19
**Type:** UI/read-model player-copy polish and live browser QA gate

## Summary

Added `qa:live-surface:browser`, a non-destructive Puppeteer/Vite sweep that starts the tactical map, runs the RBiH first-hour flow through the war-start splash and foundational decision, then visits Desk, War Map, Army HQ, Records, Chronicle, and Codex.

The sweep rejects console/page errors, shell stacking, visible raw technical tokens (`OPSEC`, `SITREP`, `IVP`, `Expires T`, `convoy_decision`, `op:`, `.json`), and uncleared Vite port listeners. It writes screenshots and JSON evidence under `.tmp_live_surface_browser_sweep/`.

## Player Impact

- Decision Room and Warroom status English copy now uses `Situation` / `Operational Situation Report` instead of `SITREP` shorthand.
- The Codex panel has a stable `data-testid="codex-panel"` marker so shell ownership checks distinguish the actual Codex surface from Records' Codex handoff card.
- The live sweep gives the polish phase a repeatable browser proof over the major first-hour surfaces instead of relying on manual screenshots.

## Verification

- Red proof: `qa:live-surface:browser` initially failed on visible `Operational SITREP` in Army HQ.
- Red/green guard: `npx.cmd vitest run tests/ui/gui_audit_label_discipline.test.ts`
- Focused command-surface pack: `npx.cmd vitest run tests/ui/gui_audit_label_discipline.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/warroom_priority_docket.test.ts`
- Browser gate contract and Codex marker pack: `npx.cmd vitest run tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/codex_panel_unlock_state.test.ts tests/ui/dilemma_spine.test.ts`
- Live browser proof: `npm.cmd run qa:live-surface:browser`

## Scope

UI/read-model copy, tests, and browser QA tooling only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

# LANE-V094-MODAL-WRAPPER — Foundation Ship (Migrations DEFERRED)

**Date:** 2026-05-05
**Status:** PARTIAL SHIP — wrapper foundation shipped; existing-modal migrations deferred to follow-up lane.
**Predecessor:** v0.9.4 Phase 1+2 UI shell audit (`cdb2d30f`); P1 backlog item.

## Outcome

Reusable `<Modal>` component shipped at `src/ui/shared/Modal.tsx` with full feature set:
- Backdrop + panel composition
- ESC key dismiss (configurable)
- Click-outside dismiss (configurable; default ON)
- Focus trap (focus first focusable on open; restore previous focus on close)
- `aria-modal=true`, `role=dialog`, `aria-labelledby` props
- Z-index from canonical `src/ui/shared/zIndex.ts` (`Z.MODAL_BACKDROP`, `Z.MODAL_PANEL`)
- Standard entry/exit transition (CSS class hooks)

10/10 lane tests GREEN; `npx tsc --noEmit` clean.

## Files

- `src/ui/shared/Modal.tsx` (NEW; reusable wrapper component)
- `tests/modal_wrapper.test.ts` (NEW; 10 tests covering render / ESC dismiss / click-outside / focus trap / aria attrs / z-index from canonical / determinism)
- `src/ui/map/styles/globals.css` (modified — modal animation styles added)
- `docs/40_reports/implemented/20260505_V094_MODAL_WRAPPER.md` (NEW; this file)

## Migrations DEFERRED

Sub-agent died after authoring the wrapper but before migrating 5-8 existing modals (SettingsModal, DiplomacyModal, MagazineModal, CommandBriefingModal, IvpBreakdownModal, etc.). The migrations are deferred to a follow-up lane. Reasons for deferral:
1. Each existing modal has bespoke behavior (custom transitions, custom dismiss logic, modal-specific tutorial anchors) that requires careful per-modal verification
2. The agent didn't get past wrapper authoring before dying
3. Shipping the wrapper foundation as a building block + deferring careful migrations is safer than rushing migrations that could break tutorial onboarding `data-tutorial-step` anchors

## Sensitive-history compliance

- Ring 1 / no §6 surface (UI-only)
- Faction-symmetric mechanism (no faction coupling)
- No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch
- Z-index from canonical source (`src/ui/shared/zIndex.ts`); palette unchanged (`FACTION_GLOW_RGB` byte-stable)
- Tutorial anchors: untouched in this commit (no migrations done; foundation ship only)

## Verification

- `npx tsc --noEmit`: clean
- `tests/modal_wrapper.test.ts`: 10/10 GREEN
- Existing modal behavior: NOT touched (no migrations done)
- Phase-3 visual layers: NOT affected (Modal.tsx is a new component; no existing imports changed)

## Successor handoff

`LANE-V094-MODAL-MIGRATION` (follow-up): migrate 5-8 existing modals to use `<Modal>` wrapper. Per-modal verify-before-exit:
- SettingsModal (already touched in palette canonicalization)
- DiplomacyModal
- MagazineModal
- CommandBriefingModal
- IvpBreakdownModal
- (Other Army HQ modals as identified by grep)

Each migration must preserve:
1. Existing visible behavior (open/close, content, hooks called)
2. Tutorial `data-tutorial-step` anchors (if any modal has them)
3. Existing z-index numerical values (now via Z tokens)
4. Existing aria/accessibility contracts

## Note on lane workflow

Sub-agent ran out of steam after authoring the wrapper component + 10 tests. Test file used `.tsx` extension which doesn't match codebase convention (existing `loading_skeleton.test.ts`, `load_error_toast.test.ts`, `empty_state.test.ts` all use `.ts`). Parent agent renamed the file + verified compilation + tests + authored this report.

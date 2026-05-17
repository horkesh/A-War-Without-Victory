# Sarajevo Special Casing Branch B

Date: 2026-05-17

## Scope

Implemented Branch B from `docs/plans/2026-05-17-sarajevo-special-casing-canon-plan.md`: Sarajevo numeric siege parameters now resolve through optional `scenario.sarajevo_overrides`, while Sarajevo ID-set membership remains code-side engine geometry.

## Implementation

- Added `SarajevoSiegeOverrides` to scenario typing and normalization.
- Persisted scenario overrides on `state.meta.sarajevo_overrides` during scenario startup; absent overrides remain absent.
- Added `getSarajevoSiegeParams(state)` as the single numeric resolution helper.
- Migrated Sarajevo defense bonus, attacker casualty multiplier, RBiH/RS siege exhaustion surcharge, and integrity floor consumers to the helper.
- Added static canon annotations on Sarajevo ID-set constants.
- Added deterministic inventory script and committed inventory artifact under `docs/40_reports/working/`.
- Added regression scenario `data/scenarios/regression/sarajevo_override_defense_bonus_050.json`.

## Save Migration Coordination

No save migration step is required for existing saves because `sarajevo_overrides` is optional and defaults are code-side. Scenarios without the field load unchanged; scenarios with the field persist through startup save serialization.

## Sensitive-History Review

The change does not alter default Sarajevo outcomes. The only regression scenario uses `defense_bonus: 0.50` as a bounded mechanistic exercise and does not add a player-facing brutality lever. ID-set membership is explicitly marked non-tunable.

## Verification

- `node tools\diagnostics\sarajevo_constant_inventory.cjs` emitted 13 deterministic inventory entries.
- Focused Sarajevo tests passed during lane closeout: 7 files / 13 tests.
- Parent integration `npx.cmd tsc --noEmit --pretty false` passed after the concurrent B3 lane type repair.
- A dirty-worktree 40w run completed as `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1849`, hash `569b622cecf15916`, with 27/27 anchors. It is not accepted as byte-identity proof because concurrent B3 and embargo behavior changes were present in the same workspace. Final no-override/default-path evidence belongs to the integrated parent closeout run.
- Integrated parent 40w run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1853` completed with hash `c16ba5bc33b79277`, 27/27 anchors, diagnostics WARN-only, and consistency PASS.
- Integrated parent 188w run `runs\apr1992_definitive_188w__210e69404d054959__w188_n1854` completed with hash `1f81ab4263ace3e9`. It retains the already-dirty n1847 25/27 anchor set; temporary probes showed Sarajevo default helper migration was not isolated as the source of that inherited late-war drift.

# Revised bounded initialization proposal

Status: **PROPOSAL ONLY — renewed sensitive-history review required before implementation.**

## Proposed behavior

Before queuing any opening foundational decision for an ordinary player campaign, materialize the negotiation consequence substrate once through a single shared browser-safe helper. The helper must:

1. Preserve the existing `military.negotiation` object and every existing field.
2. Create `capital`, `patron_relationships`, and `peace_plan_history` only if absent or structurally unavailable under the existing typed caller contract.
3. In canonical faction order `RBiH`, `RS`, `HRHB`, add only a missing capital entry with `createEmptyCapital()` and only a missing patron entry with `createDefaultPatronRelationship(faction)`.
4. Add `strategic_dimensions` only when the whole store is absent, using `initializeStrategicDimensions()`; do not repair or overwrite a present partial store in this change.
5. Return the same negotiation object and be idempotent. A second call must serialize byte-identically to the first result.
6. Perform no derived computation, event write, phase transition, counter reset, policy write, receipt write, capture/control write, or migration.

Call it in both ordinary startup adapters after the player/headless metadata overlay and before `queueOpeningFoundationalDecision()` / `queueBrowserOpeningFoundationalDecision()`. In Electron, the call must remain after the `observerParity` early return. Do not call it from `createInitialGameState()`, `buildScenarioStartupState()`, startup snapshot generation, save migration, deserialization, `runTurn()`, or any headless/no-player path.

Then reapply the already reviewed queue candidate unchanged in intent: after an explicit turn-0 RBiH identity receipt, atomically queue exactly one complete existing `rbih_paramilitary_policy_1992` decision and resolve it through the canonical shared transition. No preselection, hidden consent, direct policy write, new consequence writer, or downstream tuning is permitted.

## Precise implementation files

Allowed production files for the revised complete candidate:

- `src/sim/negotiation/initialize_negotiation_state.ts` (new): sole browser-safe fill-only initializer.
- `src/sim/negotiation/compute_capital.ts`: replace the private duplicate initialization with the shared helper; retain the existing per-turn derived update loop unchanged.
- `src/desktop/desktop_sim.ts`: initialize only ordinary player campaign state before opening queueing; retain the queue transition/wrapper from the reviewed candidate.
- `src/ui/map/desktop/campaignRecruitmentActions.ts`: initialize browser fallback state before opening queueing; consume the single shared queue/resolver transition rather than mirror it.
- `src/desktop/electron-main.cjs`: route event resolution through the candidate atomic wrapper as already reviewed.
- `src/ui/map/App.tsx`: pass the validated event catalog to the shared browser resolution path as already reviewed.

Allowed tests:

- `tests/negotiation_capital.test.ts`: fill-only, preservation, canonical completeness, and idempotence unit contract.
- `tests/startup_snapshot_contract.test.ts`: frozen baked/headless input remains unchanged and observer parity returns it byte-identically.
- `tests/browser_campaign_start_fallback.test.ts`: all three browser starts receive the initialized substrate before their foundational response and match Electron's ordinary startup semantics.
- `tests/player_start_surface_contracts.test.ts`: all three ordinary starts preserve opening order and option shifts; observer/no-player behavior stays unchanged.
- `tests/pre_first_advance_paramilitary_policy.test.ts` (new): revised real RED/GREEN branch fixture.
- `tests/desktop_persistence_contract.test.ts`: atomic canonical IPC and no direct policy/substrate mutation in the handler.

No other source, event data, save migration, snapshot, phase, sweep, capture, control, displacement, casualty, war-crime, scoring, calibration, baseline, telemetry, reference, package, or documentation file is allowed without a new owner decision and renewed review.

## RED design

Add failing assertions before production edits:

- ordinary Electron `startNewCampaign()` for RBiH, RS, and HRHB has all three canonical capital and patron entries plus six dimensions per faction before the foundational response;
- browser fallback produces the same substrate and canonical serialization for equivalent ordinary input;
- resolving one representative authored foundational option per faction changes each exact authored dimension delta rather than zero;
- a synthetic partial negotiation state with sentinel existing capital, patron, history, counter-offer, dimension, and optional fields retains every sentinel byte after initialization; missing canonical entries alone are added;
- two initializer calls are byte-identical to one;
- `observerParity: true`, the baked snapshot file, and n94/n95 initial saves remain byte-identical at their recorded SHA-256;
- the existing real allow fixture records exactly two RBiH `war_crimes_events` and two `war_crimes_events_emergent`, while its displacement aggregate remains 200; deny and ask retain their reviewed branch semantics;
- no test expects the headless first-turn latent defect to be repaired in this candidate.

## Cheap-first validation plan after renewed GO

1. **Static ownership check.** Question: is there one initializer and are forbidden paths untouched? Command: focused `rg`/diff inspection. Expected cost: under one minute. Pass: one helper; only allowed files; no call in scenario factory, migration, phase, or writer. Stop on any violation.
2. **Initializer RED/GREEN.** Command: `npx.cmd vitest run tests/negotiation_capital.test.ts tests/startup_snapshot_contract.test.ts tests/browser_campaign_start_fallback.test.ts tests/player_start_surface_contracts.test.ts` with a 180-second cap. Pass: all selected tests green and frozen snapshot hashes unchanged. Stop on timeout or unexpected failure.
3. **Policy RED/GREEN.** Command: `npx.cmd vitest run tests/pre_first_advance_paramilitary_policy.test.ts tests/player_start_surface_contracts.test.ts tests/desktop_persistence_contract.test.ts` with a 180-second cap. Pass: all branch, dimension, war-crime, persistence, hostile-input, and browser/Electron assertions green. Stop on first unexpected failure; diagnose cheaply before one targeted retry.
4. **Typecheck.** Command: `npx.cmd tsc --noEmit --incremental false --pretty false` with a 180-second cap. Pass: exit 0. Stop on timeout/nonzero.
5. **Independent implementation review.** One fresh reviewer covers systems, determinism, save compatibility, UI ownership, and sensitive-history bindings. One targeted correction verification only.

No package build, native run, full suite, turn-39 run, 188-week run, score comparison, or adoption follows automatically. A separately planned native first-Advance attempt remains subject to the existing review bindings. A required broad suite, if later authorized for the final behavioral candidate, must not be claimed from the frozen b371 suite.

## Renewed review authority

All six seats must review this revised initialization scope and return compatible GO verdicts before implementation:

- Game Designer: confirm restoring all three factions' opening option consequences preserves the intended opening design and does not create a new optimization surface.
- UI/UX Developer: confirm the substrate adds no hidden choice or display owner and the two-step RBiH flow remains explicit and blocking.
- Historian: confirm the full existing consequence record remains coupled to explicit choices and historical/counterfactual labeling.
- Scenario-tester/calibration: confirm headless/no-player bytes, n91-n95, telemetry, references, protected controls, and acceptance floors remain untouched; approve only the first-Advance capability proof.
- Engine/systems: confirm single ownership, deterministic canonical ordering, fill-only idempotence, save compatibility, browser safety, and no computation/phase/writer change.
- Red-team: confirm no hidden consent, consequence suppression, reward framing, or alternate atrocity control path.

The implementer is excluded from these seats. Any BLOCK, split, missing seat, or unmet condition returns to the owner. The prior queue-only integration decision is retained as evidence but does not count as approval of this new initialization scope.


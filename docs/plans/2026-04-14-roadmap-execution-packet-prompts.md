# Roadmap Execution Packet Prompt Shelf

**Date:** 2026-04-14  
**Status:** ACTIVE PROMPT LIBRARY  
**Purpose:** Provide copy-paste Claude packets derived from the roadmap and current repo truth, so execution stays bounded and review stays fast.

---

## 0. How to use this shelf

These prompts are meant to be handed to Claude as-is or with only tiny local edits.

Every packet on this shelf follows the same discipline:

1. inspect current repo truth first
2. do not trust prior prose or reports by themselves
3. no-op cleanly if another lane already landed the seam
4. keep scope inside one strategic lane
5. say exactly what is proven vs source-verified only

If a packet discovers that the target seam is already landed, Claude should:

- avoid churn
- optionally tighten proof or docs if there is an honest small follow-up
- otherwise report a no-op with evidence

Do **not** rewrite roadmap docs during these packets unless the prompt explicitly asks for it.

---

## 1. Sequencing and parallelism

### Parallel-safe now

- Packet 1. Save/Load Truth Inventory And Entrypoint Audit
- Packet 5. Review Queue Ownership Cleanup
- Packet 6. Entrypoint Simplification
- Packet 8. Commander Exhaustion Visibility In Explanation Surfaces

### Likely already in flight or should inspect first

- Packet 2. Desktop Load-Path Coherence And Failure Contract
- Packet 3. Post-Load UI State Reset Sweep

### Best after the current save/load lane closes

- Packet 4. Adapter-After-Deserialize Truth Proof
- Packet 7. Adapter Boundary Simplification

---

## 2. Packet 1 - Save/Load Truth Inventory And Entrypoint Audit

**When to use:** while code-heavy save/load work is still moving and you want one honest inventory doc first.

```text
Tighten the save/load truth inventory honestly.

Current accepted state:
- The roadmap already has a milestone-grade owner: docs/plans/2026-03-31-v08to09-save-load-and-replay-hardening-plan.md
- We now have a packet backlog: docs/plans/2026-04-14-roadmap-execution-packet-backlog.md
- Recent save/load hardening is in motion, so do not trust prior prose without inspecting repo truth
- This packet is inventory/audit first, not broad implementation theater

Your task:
1. Inspect the actual current save/load/replay entrypoints and owners before writing anything:
   - src/desktop/*
   - src/ui/map/desktop/*
   - src/ui/map/store/gameStore.ts
   - src/state/serialize*
   - src/cli/*
   - relevant save/load/replay tests
2. Produce or update one engineering doc that honestly inventories:
   - canonical save entrypoint(s)
   - canonical load entrypoint(s)
   - desktop-specific path(s)
   - headless/scenario/replay path(s)
   - owner modules for serialize / deserialize / post-load reconstruction
   - what is directly tested vs only source-verified
3. Explicitly demote misleading co-equal entrypoints if the code shows they are not truly peers.
4. Do not touch unrelated roadmap/planning files.
5. If you find one tiny doc-safe clarification or naming cleanup that makes ownership materially clearer, do it. Do not start large code refactors.
6. Update ledger/knowledge honestly if the doc changes are worth preserving.

Verification required:
- git diff --check
- if you changed code accidentally, stop and either revert your own accidental code edits or explicitly report the scope change

Deliverable:
- exact docs commit hash
- exact inventory doc path
- exact wording about what is proven vs not proven
- exact entrypoints/owners you named
- exact verification result
```

---

## 3. Packet 2 - Desktop Load-Path Coherence And Failure Contract

**When to use:** current load lane if the seam is still open after inspecting repo truth.

```text
Close the desktop load-path coherence seam honestly.

Current accepted state:
- Save/load hardening already has a roadmap owner and packet backlog
- Another lane may already be touching:
  - src/desktop/electron-main.cjs
  - src/ui/map/store/gameStore.ts
  - tests/ui/desktop_load_error_classification.test.ts
  - tests/ui/gamestore_load_reset.test.ts
- You must inspect repo truth first and no-op cleanly if the seam is already landed

Your task:
1. Inspect the current desktop/manual load path end to end:
   - electron-main.cjs
   - preload/useIPC bridge
   - App.tsx / gameStore load handling
   - any existing load error classification helpers/tests
2. Tighten one coherent owner contract for desktop load:
   - one canonical desktop load owner
   - explicit malformed/incompatible save behavior
   - honest player-facing error classification where appropriate
   - no accidental double owners between main process, preload bridge, and UI store
3. Add direct proof where there is a clean seam.
4. Do not claim full save/load E2E proof unless a direct test actually exercises it.
5. Do not touch unrelated roadmap/planning files.
6. Update docs/ledger wording honestly if proof scope changes.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/ui/desktop_load_error_classification.test.ts tests/ui/gamestore_load_reset.test.ts tests/ui_map_desktop_bridge.test.ts tests/integration_save_load.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact desktop load owner/failure contract you established
- whether the seam was already partly or fully landed when you inspected it
- exact proof added
- exact wording for anything still source-verified only
- exact verification results
```

---

## 4. Packet 3 - Post-Load UI State Reset Sweep

**When to use:** after or alongside the desktop load lane, but only if stale UI-local state still survives save replacement.

```text
Sweep post-load UI-local state honestly and narrowly.

Current accepted state:
- Recent inbox dismissal-reset hardening already landed for one seam
- More stale local state may still survive save replacement elsewhere
- This packet is about reset contracts after loading a different save, not general UI cleanup

Your task:
1. Inspect current save-replacement behavior for UI-local state in:
   - src/ui/map/App.tsx
   - src/ui/map/store/gameStore.ts
   - relevant UI shell components
   - current save/load/reset tests
2. Identify state that can become stale when a different save is loaded:
   - dismiss/ack flags
   - modal-open state
   - shell selections
   - cached queue indices
3. Fix one bounded cluster of real stale-state seams.
4. Keep intentional survivors only if you can name why they should survive save replacement.
5. Add focused proof where there is a clean seam.
6. Do not overclaim React behavior that is only source-verified.
7. Do not touch unrelated roadmap/planning files.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/ui/gamestore_load_reset.test.ts tests/ui/inbox_items.test.ts tests/ui_shell_navigation.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact stale-state seams fixed
- exact states intentionally left alone
- exact proof added
- exact wording for any source-verified-only reset behavior
- exact verification results
```

---

## 5. Packet 4 - Adapter-After-Deserialize Truth Proof

**When to use:** once the current load-path churn settles and you want one real parity proof.

```text
Add one honest adapter-after-deserialize proof seam.

Current accepted state:
- Save/load hardening is active
- Real-save round-trip proof already exists in some form, but adapter-after-deserialize parity is still the review target here
- This is not permission to claim all adapted fields are proven

Your task:
1. Inspect current serialize/deserialize and adapter read-model flow:
   - src/state/serialize.ts
   - src/ui/map/data/GameStateAdapter.ts
   - tests/save_load_roundtrip.test.ts
   - tests/save_load_real_roundtrip.test.ts
   - tests/ui_map_game_state_adapter.test.ts
   - tests/ui_adapter_boundary.test.ts
2. Pick one bounded field family that matters to the player and is cheap to prove, for example:
   - review/queue packets
   - formation counts
   - front-edge / sector counts
   - political controller counts
3. Add a direct proof test that shows:
   - raw save truth before serialize/deserialize
   - same raw truth after deserialize
   - same player-facing adapted truth for the owned fields
4. Be explicit about fields that are intentionally recomputed instead of parity-owned.
5. Do not touch unrelated roadmap/planning files.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/save_load_roundtrip.test.ts tests/save_load_real_roundtrip.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui_adapter_boundary.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact parity fields proven
- exact fields intentionally not covered
- exact test(s) added
- exact wording that distinguishes direct parity proof from recomputation/source verification
- exact verification results
```

---

## 6. Packet 5 - Review Queue Ownership Cleanup

**When to use:** whenever one review/action family still has multiple summary surfaces pretending to own it.

```text
Close one review-queue ownership seam honestly.

Current accepted state:
- We already hardened several presidential inbox seams
- The roadmap still calls for queue ownership cleanup across Army HQ / presidential / shell surfaces
- This packet should close one action family at a time, not all review UX in one swing

Your task:
1. Inspect one bounded review/action family end to end:
   - src/ui/map/App.tsx
   - src/ui/map/components/army_hq/*
   - src/ui/map/components/PresidentialToolbar.tsx
   - src/ui/warroom/*
   - tests/army_hq_presidential_review_coherence.test.ts
   - tests/ui_shell_navigation.test.ts
   - tests/ui/inbox_items.test.ts
2. Pick one family where summary and queue ownership still compete.
3. Make one canonical queue owner explicit.
4. Keep summary surfaces as summaries/routing only; they must not rebuild action logic if the queue owner already exists.
5. Add or tighten direct proof for the owned routing/ownership seam.
6. Update docs/ledger wording honestly.
7. Do not touch unrelated roadmap/planning files.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/army_hq_presidential_review_coherence.test.ts tests/ui_shell_navigation.test.ts tests/ui/inbox_items.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact action family cleaned up
- exact canonical queue owner
- exact summary surfaces demoted to advertise-and-route only
- exact proof added
- exact verification results
```

---

## 7. Packet 6 - Entrypoint Simplification

**When to use:** doc/code clarity pass for top-level product startup and pipeline entrypoints.

```text
Demote false co-equal entrypoints honestly.

Current accepted state:
- Product architecture simplification already has a roadmap owner
- The repo still has multiple entrypoint-looking files and docs that can mislead a new implementer
- This packet is about naming, guidance, and bounded demotion, not sweeping architecture surgery

Your task:
1. Inspect actual startup and pipeline entrypoints in code and docs:
   - src/index.ts
   - src/sim/turn_pipeline.ts
   - src/turn/pipeline.ts
   - src/sim/run_combat_browser.ts
   - docs/20_engineering/PIPELINE_ENTRYPOINTS.md
   - docs/20_engineering/REPO_MAP.md
2. Decide which entrypoints are canonical today and which are legacy, scoped, or secondary.
3. Tighten docs and any small code annotations/comments so a new implementer can tell where the real product starts.
4. If a tiny naming/comment cleanup is needed in code, keep it surgical.
5. Do not touch unrelated roadmap/planning files.
6. Update ledger/knowledge honestly if you establish a durable rule.

Verification required:
- git diff --check
- if code changed: npx.cmd tsc --noEmit -p tsconfig.json

Deliverable:
- exact commit hash
- exact canonical entrypoints named
- exact files/surfaces demoted
- exact wording that stops overclaiming equivalence
- exact verification results
```

---

## 8. Packet 7 - Adapter Boundary Simplification

**When to use:** after the load-path inventory and parity proof have settled enough that one adapter seam can be simplified cleanly.

```text
Simplify one adapter boundary honestly.

Current accepted state:
- GameStateAdapter remains a hotspot
- Some adapter seams are canonical shaping; others are accidental truth invention
- This packet should narrow one seam, not start a heroic adapter rewrite

Your task:
1. Inspect one bounded adapter seam across:
   - src/ui/map/data/GameStateAdapter.ts
   - src/ui/map/data/types.ts
   - src/desktop/preload.cjs
   - src/desktop/electron-main.cjs
   - tests/adapter_field_completeness.test.ts
   - tests/ui_map_game_state_adapter.test.ts
   - tests/ui_adapter_boundary.test.ts
2. Pick one seam where the adapter is doing more than shaping already-owned truth.
3. Simplify it so:
   - canonical truth owner is explicit
   - adapter shaping is narrower
   - invented packet logic is reduced, not moved around
4. Add focused proof for the simplified seam.
5. Document exactly what remains recomputed.
6. Do not touch unrelated roadmap/planning files.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/adapter_field_completeness.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui_adapter_boundary.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact seam simplified
- exact truth owner before/after
- exact proof added
- exact wording for remaining recomputed/inferred behavior
- exact verification results
```

---

## 9. Packet 8 - Commander Exhaustion Visibility In Explanation Surfaces

**When to use:** explanation-surface packet that consumes already-landed faction war-exhaustion truth without inventing new commander cognition.

```text
Surface faction-exhaustion drag honestly in one explanation surface.

Current accepted state:
- Commander plan scoring already reads faction war_exhaustion
- The roadmap still wants player-facing explanation surfaces grounded in real traces/briefing truth
- This packet must consume existing truth, not invent a new psychological model for the commander

Your task:
1. Inspect the current command-review explanation surfaces and truth sources:
   - src/sim/combat/commander/briefing.ts
   - src/ui/map/components/army_hq/*
   - relevant explanation helpers/tests
   - tests/ui_army_hq_war_summary_visibility.test.ts
   - commander briefing / trace tests
2. Add one bounded player-facing surface that exposes already-owned faction exhaustion drag or war-strain context.
3. Keep wording honest:
   - show that broader national exhaustion is shaping command appetite
   - do not imply new commander reasoning that does not exist in the briefing payload
4. Add focused proof for the exact surface/helper seam you touch.
5. Do not touch unrelated roadmap/planning files.
6. Update ledger/docs honestly about proof scope.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/ui_army_hq_war_summary_visibility.test.ts tests/commander/briefing_campaign_intent.test.ts tests/commander/commander.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact explanation surface added/tightened
- exact source-truth fields consumed
- exact proof added
- exact wording for anything still source-verified only
- exact verification results
```

---

## 10. Review rule for every packet

After Claude returns a report for any packet above, acceptance should follow the same order:

1. inspect commit(s), not prose
2. inspect changed files directly
3. rerun the required verification
4. compare docs wording against actual proof scope
5. either accept, repair, or send back a corrective packet

That review pass is part of the system, not optional cleanup.

---

## 11. Packet 13 - Dayton Trigger Pipeline Step And Pending Snapshot

**When to use:** once the current political/load lane settles enough to move Dayton initiation out of adapter read logic.

```text
Move Dayton initiation out of the adapter read path honestly.

Current accepted state:
- The repo already has live Dayton machinery:
  - shouldInitiateDayton(...)
  - initiateDaytonNegotiation(...)
  - resolveDaytonNegotiation(...)
- The current design problem is ownership:
  - GameStateAdapter derives pendingDayton by calling initiation helpers from the read path
- The design contract is now resolved in docs/plans/2026-04-14-design-gate-resolutions-and-ungating.md

Your task:
1. Inspect the current Dayton flow end to end:
   - src/sim/negotiation/dayton_negotiation.ts
   - src/ui/map/data/GameStateAdapter.ts
   - src/ui/map/components/DaytonNegotiationModal.tsx
   - tests/dayton_negotiation.test.ts
   - any related player-shell tests
2. Add one canonical persisted pending-Dayton packet/state owner.
3. Move the mutating initiation into a proper pipeline/state path.
4. Make the adapter a pure reader of pending Dayton state.
5. Keep the packet save/load safe and honest.
6. Do not redesign Dayton negotiation itself.
7. Update docs/ledger wording honestly.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/dayton_negotiation.test.ts tests/scoring.test.ts tests/player_faction_shell_boundary_truth.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact pending-Dayton state owner added
- exact pipeline step / mutation owner
- exact adapter side effect removed
- exact proof added
- exact verification results
```

---

## 12. Packet 14 - Stranded Brigade Lifecycle Owner

**When to use:** after the current save/load/political cleanup lane, when opening the first bounded engine packet for stranded brigades.

```text
Add the canonical stranded-brigade lifecycle owner honestly.

Current accepted state:
- The Podrinje-style ownerless drift seam is no longer a mystery warning bucket
- Movement-order truth has already been cleaned up
- The remaining gap is lifecycle ownership, not wording
- The design contract is now resolved in docs/plans/2026-04-14-design-gate-resolutions-and-ungating.md

Your task:
1. Inspect the current ownerless/stranded path:
   - src/sim/combat/brigade_assignment.ts
   - src/sim/turn_phases/war_phases.ts
   - src/state/formation_lifecycle.ts
   - enclave-related files
   - the implemented reports around Podrinje strandedness
2. Add one explicit stranded lifecycle owner and minimal state machine.
3. Keep the behavior narrow:
   - hold in place
   - degrade deterministically
   - recover on reconnection
   - collapse on prolonged isolation if that is part of the chosen contract
4. Do not add breakout AI or generic dynamic enclave creation.
5. Add focused proof.
6. Update docs/ledger wording honestly.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/army_reserve_system.test.ts tests/final_sector_live_owner_real_save.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact stranded lifecycle owner added
- exact persisted state fields added
- exact behavior intentionally not implemented
- exact proof added
- exact verification results
```

---

## 13. Packet 15 - Consequence Substrate Audit And Pressure Completion

**When to use:** first consequence-system packet after ungating.

```text
Open the consequence system through substrate truth, not spectacle.

Current accepted state:
- The consequence-system gate is resolved into phased work
- Pressure, exhaustion, patron, and peace-response substrates already exist in the repo
- This packet is not permission to implement every divergence chain

Your task:
1. Inspect live consequence substrates and dead wires:
   - strategic dimensions
   - negotiation pressure
   - peace plan response
   - patron pressure/events
   - endgame scoring hooks
2. Produce or update one honest substrate owner map.
3. Close one bounded consequence symmetry seam, preferably pressure/peace-response for non-RS factions if still missing after inspection.
4. Keep the work inside existing political/event substrate when possible.
5. Do not touch sensitive-history rupture chains in this packet.
6. Update docs/ledger wording honestly.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/sim/political/political_peace_plan.test.ts tests/negotiation_patron_pressure.test.ts tests/scoring.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact substrate owners named
- exact dead wire or asymmetry closed
- exact proof added
- exact wording for what remains intentionally deferred
- exact verification results
```

---

## 14. Packet 16 - Endgame Verdict Packet Contract

**When to use:** first victory/Pyrrhic packet after ungating.

```text
Separate war termination from endgame judgment honestly.

Current accepted state:
- The repo already has both scenario victory conditions and a verdict/scoring engine
- The design problem is contract blur, not total absence
- The design contract is now resolved in docs/plans/2026-04-14-design-gate-resolutions-and-ungating.md

Your task:
1. Inspect the current split across:
   - src/scenario/victory_conditions.ts
   - src/sim/war_termination.ts
   - src/sim/negotiation/scoring.ts
   - tests/victory_conditions_a2.test.ts
   - tests/war_termination.test.ts
   - tests/scoring.test.ts
2. Make the contract explicit:
   - termination owner
   - verdict packet owner
   - comparison left for later consumer
3. If a small code/schema cleanup is needed to make that boundary real, do it narrowly.
4. Do not turn the work into full UI polish.
5. Keep sensitive-history condemnation logic aligned with the boundary doc.
6. Update docs/ledger wording honestly.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/victory_conditions_a2.test.ts tests/war_termination.test.ts tests/scoring.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact termination/judgment split established
- exact verdict packet fields or contract clarified
- exact proof added
- exact verification results
```

---

## 15. Packet 17 - Sensitive-History Boundary Enforcement And Srebrenica Rupture Contract

**When to use:** docs-plus-state packet after the boundary has been architecturally resolved.

```text
Implement the sensitive-history boundary honestly and with restraint.

Current accepted state:
- The sensitive-history gate is resolved by docs/plans/2026-04-14-design-gate-resolutions-and-ungating.md
- The project may represent mechanical precursors and locked rupture consequences
- The project must not gamify atrocity

Your task:
1. Inspect the existing substrate around:
   - patron events
   - strategic dimensions
   - peace-plan / endgame hooks
   - any Srebrenica-related events/tests/docs
2. Implement one bounded contract that enforces the boundary:
   - mechanical precursor truth is allowed
   - rupture consequence is locked / non-optimizable
   - downstream condemnation / comparison hooks are explicit
3. Do not add player-issued atrocity controls or optimization surfaces.
4. Keep wording specific, restrained, and historically grounded.
5. Update docs/ledger wording honestly.

Verification required:
- npx.cmd tsc --noEmit -p tsconfig.json
- npx.cmd vitest run tests/negotiation_patron_pressure.test.ts tests/sim/political/phase7_dayton_plan.test.ts
- npm.cmd run desktop:map:build

Deliverable:
- exact commit hash
- exact sensitive-history boundary you enforced in code/docs
- exact things intentionally not implemented
- exact proof added
- exact verification results
```

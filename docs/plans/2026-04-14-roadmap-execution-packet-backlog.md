# Roadmap Execution Packet Backlog

**Date:** 2026-04-14  
**Status:** ACTIVE WORKING BACKLOG  
**Purpose:** Translate existing roadmap-grade plans into bounded execution packets that Claude can implement and a reviewer can audit quickly.

**Companion prompt shelf:** `docs/plans/2026-04-14-roadmap-execution-packet-prompts.md`

---

## 0. Why this document exists

The repo is not short on roadmap plans.

What it is short on is **packetization**:

- one strategic area per prompt
- 3-8 adjacent seams
- one proof bar
- explicit rejected/deferred seams
- one owner-facing done-means block

This document is therefore not a new roadmap.
It is the execution backlog derived from the roadmap and current repo truth.

---

## 1. Operating rule

Use this order before preparing a new Claude packet:

1. Read `MASTER_ROADMAP.md`
2. Read the milestone-grade plan that already owns the lane
3. Check the latest scorecard / ledger / implemented reports
4. Decide whether the lane is:
   - `packet-ready now`
   - `packet-ready after current lane closes`
   - `still intentionally blocked`
5. Only write a new plan when the existing milestone plan is stale, over-broad, or missing a needed design decision

Do **not** write a fresh roadmap doc for a lane that already has an execution-grade plan.

---

## 2. Readiness classes

### `Packet-ready now`

The lane already has:

- a roadmap owner
- a milestone-grade plan
- enough current repo truth to carve a bounded implementation packet

### `Packet-ready after current lane`

The lane is real and planned, but the next bounded packet depends on one currently-running or just-preceding packet closing first.

### `Still intentionally blocked`

Do not hand this to Claude for implementation yet.

The lane still needs:

- a policy choice
- a canon boundary decision
- a scoring/contract choice
- or a redesign gate that would make implementation prompts fake certainty

---

## 3. Packet-ready now

### Packet 1. Save/Load Truth Inventory And Entrypoint Audit

**Lane:** `v0.8-to-v0.9 save/load and replay hardening`  
**Source plan:** `2026-03-31-v08to09-save-load-and-replay-hardening-plan.md`

**Goal:** Produce one truthful inventory of save/load/replay entrypoints, current owners, desktop-vs-headless differences, and already-landed proof.

**Adjacent seams:**
- save/load entrypoints
- desktop/manual load path
- scenario/headless load path
- serializer/deserializer owners
- replay-related entrypoints
- existing proof surfaces and missing proof surfaces

**Likely file families:**
- `src/cli/*`
- `src/state/serialize*`
- `src/ui/map/desktop/*`
- `src/desktop/*`
- existing save/load/replay tests
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- `docs/20_engineering/REPO_MAP.md`

**Done means:**
- one inventory doc/update exists
- canonical owners are named
- false co-equal entrypoints are explicitly demoted or flagged
- the packet ends with exact open seams for follow-on implementation

### Packet 2. Desktop Load-Path Coherence And Failure Contract

**Lane:** `v0.8-to-v0.9 save/load and replay hardening`  
**Source plan:** `2026-03-31-v08to09-save-load-and-replay-hardening-plan.md`

**Goal:** Make desktop/manual load path behavior coherent with the canonical save/load contract and visibly honest on failure.

**Adjacent seams:**
- desktop IPC load entrypoint
- file-dialog/manual load path
- post-load reconstruction behavior
- incompatible or malformed save behavior
- browser/headless parity where relevant

**Likely file families:**
- `src/desktop/electron-main.cjs`
- `src/ui/map/desktop/useIPC.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/store/gameStore.ts`
- desktop/load-path tests

**Done means:**
- one canonical desktop load owner is clear
- failure behavior is explicit instead of accidental
- targeted tests cover the owned seams
- docs say exactly what is still not proven

### Packet 3. Post-Load UI State Reset Sweep

**Lane:** `v0.8-to-v0.9 save/load and replay hardening`  
**Source plan:** `2026-03-31-v08to09-save-load-and-replay-hardening-plan.md`

**Goal:** Audit and harden UI-local state that must reset when a different save is loaded.

**Adjacent seams:**
- local dismiss/ack state
- modal-open state that should not survive save replacement
- fingerprint-based reset contracts
- stateful shell selections that can become stale after load

**Likely file families:**
- `src/ui/map/App.tsx`
- `src/ui/map/store/gameStore.ts`
- `src/ui/map/components/*`
- focused UI shell tests

**Done means:**
- no known stale local-state gate survives save replacement silently
- every kept exception is documented as intentional
- ledger wording distinguishes direct proof from source-verified resets

### Packet 4. Adapter-After-Deserialize Truth Proof

**Lane:** `v0.8-to-v0.9 save/load and replay hardening`  
**Source plan:** `2026-03-31-v08to09-save-load-and-replay-hardening-plan.md`

**Goal:** Prove the player-facing read model after deserialize matches the same raw save truth before deserialize for the chosen owned fields.

**Adjacent seams:**
- deserialize
- adapter mapping
- formation counts
- settlement/front-edge/sector packet counts
- queue/review packet reconstruction

**Likely file families:**
- `src/state/serialize.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- existing save/load round-trip tests

**Done means:**
- one direct proof test covers owned adapter-after-deserialize parity
- parity fields are explicit
- non-owned or intentionally recomputed fields are documented instead of implicitly trusted

### Packet 5. Review Queue Ownership Cleanup

**Lane:** `v0.8-to-v0.9 UI surface ownership`  
**Source plans:** `2026-03-31-v08to09-ui-surface-ownership-plan.md`, `2026-04-03-v08to09-ui-density-and-shell-cohesion-plan.md`

**Goal:** Close one bounded “who owns this pending review work?” seam at a time so no shell summary competes with the queue owner.

**Adjacent seams:**
- Army HQ review summary
- presidential queue summary
- tactical-map shortcuts
- status-bar/toolbar summaries
- action routing vs summary ownership

**Likely file families:**
- `src/ui/map/App.tsx`
- `src/ui/map/components/army_hq/*`
- `src/ui/warroom/*`
- `src/ui/map/components/PresidentialToolbar.tsx`
- relevant shell tests

**Done means:**
- one action family has one queue owner
- summary surfaces advertise and route, but do not rebuild action logic
- ownership docs and tests agree

### Packet 6. Entrypoint Simplification

**Lane:** `v0.8-to-v0.9 product architecture simplification`  
**Source plan:** `2026-04-03-v08to09-product-architecture-simplification-plan.md`

**Goal:** Demote or annotate false co-equal entrypoints so a new implementer can tell where the real product starts.

**Adjacent seams:**
- root/startup entrypoints
- legacy runner variants
- desktop/browser entrypoint distinctions
- root guidance docs

**Likely file families:**
- `src/index.ts`
- `src/sim/turn_pipeline.ts`
- `src/turn/pipeline.ts`
- `src/sim/run_combat_browser.ts`
- top-level engineering docs

**Done means:**
- current canonical entrypoints are named
- misleading parallel entrypoints are demoted, documented, or retired
- root docs stop overclaiming equivalence

### Packet 7. Adapter Boundary Simplification

**Lane:** `v0.8-to-v0.9 product architecture simplification`  
**Source plan:** `2026-04-03-v08to09-product-architecture-simplification-plan.md`

**Goal:** Narrow one read-model/adaptor truth seam at a time so adapters shape truth instead of inventing it.

**Adjacent seams:**
- `GameStateAdapter` false owners
- preload/electron payload shaping
- post-load read-model reconstruction
- packet-vs-raw truth boundaries

**Likely file families:**
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`
- `src/desktop/preload.cjs`
- `src/desktop/electron-main.cjs`

**Done means:**
- one adapter seam becomes simpler and more honest
- docs and tests explicitly name what is canonical vs recomputed
- no new packet is invented just to paper over missing engine truth

### Packet 8. Commander Exhaustion Visibility In Explanation Surfaces

**Lane:** `v0.8-to-v0.9 commander explanation surfaces`  
**Source plan:** `2026-03-31-v08to09-commander-explanation-surfaces-plan.md`

**Goal:** Surface already-owned faction-exhaustion drag truth in one player-facing command-review surface without pretending to add deeper commander cognition.

**Adjacent seams:**
- command briefing packet
- Army HQ explanation surface
- player-safe language for exhaustion drag
- shell routing to the canonical explanation owner

**Likely file families:**
- `src/sim/combat/commander/briefing.ts`
- `src/ui/map/components/army_hq/*`
- possibly `src/ui/warroom/*` summary consumers

**Done means:**
- the player can see the already-real exhaustion effect in one owned review surface
- wording is staff-abstracted, not fake omniscience
- no new explanation logic is invented in UI-only code

---

## 4. Packet-ready after current lane

### Packet 9. Save-Load-Continue Hash Chain

**Why not now:** depends on current save/load truth packets closing first and on a chosen continue-from-save owner.

### Packet 10. Queue Inventory Unification For Autonomy And Political Review

**Why not now:** scorecard still treats this as a contract choice; avoid implementation before the queue owner is chosen.

### Packet 11. GameStateAdapter Hotspot Decomposition

**Why not now:** do this after at least one more adapter-boundary packet so decomposition follows proven ownership lines instead of guesswork.

### Packet 12. Shell Density Tightening

**Why not now:** should follow more ownership cleanup so the compacted UI reflects settled hierarchy instead of moving targets.

### Packet 13. Dayton Trigger Pipeline Step And Pending Snapshot

**Lane:** `v0.9.0 political review / Dayton integrity`  
**Design owner:** `2026-04-14-design-gate-resolutions-and-ungating.md`

**Why after current lane:** the current desktop/load/political truth passes are still moving, but the design contract is now explicit.

**Goal:** move Dayton initiation out of the adapter read path and into one canonical pipeline/state owner.

### Packet 14. Stranded Brigade Lifecycle Owner

**Lane:** `v0.9.0 stranded brigade lifecycle`  
**Design owner:** `2026-04-14-design-gate-resolutions-and-ungating.md`

**Why after current lane:** now ungated by contract, but should follow current save/load/political cleanup before opening a new engine state machine lane.

**Goal:** add explicit stranded lifecycle ownership for same-faction unreachable brigades.

### Packet 15. Consequence Substrate Audit And Pressure Completion

**Lane:** `v0.9.0 consequence system`  
**Design owners:** `2026-04-14-design-gate-resolutions-and-ungating.md`, `2026-04-14-v090-consequence-system-refresh-plan.md`

**Why after current lane:** the design gate is resolved; this is now an ordinary sequencing decision.

**Goal:** map live consequence substrates and complete per-faction pressure/peace consequence symmetry.

### Packet 16. Endgame Verdict Packet Contract

**Lane:** `v0.9.0 victory / Pyrrhic scoring`  
**Design owners:** `2026-04-14-design-gate-resolutions-and-ungating.md`, `2026-04-14-v090-victory-pyrrhic-scoring-contract-plan.md`

**Why after current lane:** this depends on fresh consequence and Dayton contracts but is no longer design-blocked.

**Goal:** separate war termination from endgame judgment and define the canonical verdict packet.

### Packet 17. Sensitive-History Boundary Enforcement And Srebrenica Rupture Contract

**Lane:** `v0.9.0 sensitive history`  
**Design owners:** `2026-04-14-design-gate-resolutions-and-ungating.md`, `2026-03-31-v090-sensitive-history-design-gate-plan.md`

**Why after current lane:** the moral/design boundary is now explicit, but this still needs a careful docs-plus-state implementation packet.

**Goal:** implement the three-ring sensitive-history contract and the locked Srebrenica rupture path without gamifying atrocity.

---

## 5. Still intentionally blocked

### Blocked A. All-at-once consequence mega-sprint

**Still blocked because:** the design gate is resolved, but the project should still refuse the old “implement all consequence chains now” shape.

### Blocked B. Atrocity as optimization system

**Still blocked because:** the sensitive-history contract explicitly rejects atrocity-as-toy or genocide-as-tactic gameplay.

### Blocked C. Freeform Dayton redesign

**Still blocked because:** the current ungating resolves trigger ownership and pending-state architecture, not a full map-redrawing peace sandbox.

### Blocked D. Generic dynamic enclave generation

**Still blocked because:** stranded-brigade lifecycle is now explicit, but dynamic enclave creation remains a much wider simulation redesign.

---

## 6. Planning refreshes required

These areas need fresh planning work before they become Claude-ready:

1. `v0.9.0 consequence system` â€” split the old mega-plan into smaller programs and current repo-truth prerequisites
2. `v0.9.0 victory / Pyrrhic scoring` â€” turn the current philosophy plan into a concrete scoring/data contract
3. `v0.9.4 legendary map features` â€” write feature-level specs for the still-open map features before implementation

---

## 7. Review discipline for every packet

Every packet handed to Claude should include:

- one lane owner
- one bounded objective
- one list of adjacent seams
- explicit out-of-scope items
- exact verification commands
- a required completion block:
  - `Canonical owner`
  - `Demoted path`
  - `Player-visible truth`
  - `Canonical UI surface`
  - `Done means`

And every acceptance pass should:

1. inspect commits, not prose
2. rerun verification
3. check docs against code
4. call out overclaims
5. either accept, repair, or send a corrective packet

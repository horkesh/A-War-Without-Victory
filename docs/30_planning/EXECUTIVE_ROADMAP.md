# AWWV Revised Phase-by-Phase Executive Roadmap

(Adjusted after Warroom GUI MVP 1.0 completion)

---

## Phase 0 — GUI MVP foundation (✅ COMPLETE)

**Objective:** Deliver a functional command-room interface anchored at Turn 0 / Phase 0.

**Status:** ✅ Completed and validated

### What is already done

- Fully interactive warroom GUI (8 regions, all wired).
- Modal system (DOM-based, accessible, deterministic).
- Turn advancement UI (placeholder logic, correctly isolated).
- Map zoom (3 levels) with correct visual semantics.
- Newspapers, magazines, reports, ticker – structurally complete.
- Asset staging fixed and build clean.
- No canon violations, no simulation mutation beyond Turn counter placeholder.

### Evidence

- `npm run warroom:build` → PASS
- `npm run dev:warroom` → interactive, stable
- GUI code fully isolated under `src/ui/warroom/`

### Executive takeaway

UI is not a risk, not a blocker, and not provisional. It is a stable shell ready to receive real simulation output.

---

## Phase 1 — Validation recovery (hard gates)

(unchanged, but now clearly simulation-only)

**Objective:** Restore full trust in the simulation core by making all mandatory gates green.

### Scope

- Fix TypeScript typecheck failures (non-UI).
- Fix determinism static scan failure.
- Ensure full test suite can run to completion.

### Success criteria

- `npm run typecheck` → PASS
- `npm test` → PASS (including determinism scan)

### What this phase explicitly does NOT touch

- Warroom GUI (already clean and building).
- Any UI code paths (except if static scan reveals shared utilities).

### Risk if skipped

Simulation results are not auditable. GUI would display untrustworthy state.

### Executive status

🔴 **Primary blocker to all simulation progress**

---

## Phase 2 — Deterministic replay contract

**Objective:** Lock in byte-identical replay for identical inputs.

### Scope

- Green baseline regression.
- Conscious baseline updates if outputs changed.
- Ledgered justification for any baseline movement.

### Success criteria

- `npm run test:baselines` → PASS
- Baseline manifest stable and committed.

### Why this matters more now

The GUI now makes output visible. Any nondeterminism will be immediately observable and damaging.

### Executive status

🔴 **Blocking** — Must be completed before pipeline → GUI integration.

---

## Phase 3 — Canon-correct war start (Phase 0 → Phase I)

**Objective:** Enforce the core historical invariant: **No referendum → no war.**

### Scope

Complete Phase 0 logic so that:

- Phase I cannot begin without referendum.
- War starts exactly at the canon-defined offset.
- Scenario tests for both positive and negative cases.

### Why this phase moves up

The GUI already starts at Turn 0 / Phase 0. Incorrect war-start logic would immediately undermine the UI's narrative credibility.

### Success criteria

Automated tests prove:

- No referendum = no war.
- Referendum = war at correct turn.

### Executive status

🟠 **Canon-critical** — This is the conceptual keystone of the project.

---

## Phase 4 — Turn pipeline → GUI integration

**Objective:** Replace UI placeholders with real simulation execution.

### Scope

- Connect calendar click to `executeTurnPipeline()`.
- After turn execution:
  - Update GameState.
  - Re-render map political control.
  - Refresh faction overview stats.
- Preserve determinism and UI isolation.

### Key constraint

GUI must remain a consumer, never a driver, of simulation logic.

### Success criteria

- Advancing a turn runs the real pipeline.
- GUI reflects new state without manual refresh.
- No additional nondeterminism introduced.

### Executive status

🟡 **Integration phase** — Enabled only after Phases 1–3 are green.

---

## Phase 5 — Map & data authority consolidation

**Objective:** Lock down geography and Turn-0 data as unquestioned truth.

### Scope

- Align map build documentation with real entrypoints.
- Remove unsafe type assertions in Turn-0 metadata loading.
- Confirm map and settlement data contracts.

### Why it sits here

GUI already consumes map output. This phase ensures that what the GUI shows is authoritative and reproducible.

### Success criteria

- One canonical map build path.
- Type-safe Turn-0 initialization.
- No ambiguity for future contributors.

### Executive status

🟡 **Structural hygiene**

---

## Phase 6 — MVP declaration and freeze

**Objective:** Explicitly declare "this is MVP" and stop adding features.

### Scope

Confirm MVP checklist:

- Deterministic simulation loop.
- Canon-correct war start.
- Functional warroom GUI.
- Reproducible builds.
- Document known limitations (already partially done in GUI report).

### Success criteria

- MVP definition is explicit, bounded, and reviewable.
- All MVP gates are green.
- Remaining ideas are clearly labeled post-MVP.

### Executive status

🟢 **Convergence phase**

---

## Phase 7 — Post-MVP extensions (explicitly deferred)

**Examples**

- Dynamic content generation for newspapers/reports.
- Corps and unit visualization at map zoom levels.
- Desperation visuals, props, sound.
- Diplomacy panel (Phase II+).

**Rule:** None of these may be pulled forward into MVP work.

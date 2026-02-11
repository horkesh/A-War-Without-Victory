# Engine and Determinism

- **Both:** No randomness; no timestamps in derived artifacts; stable ordering (strictCompare); deterministic serialization; round-trip identity; validateState/validateGameStateShape; denylisted derived keys (fronts, corridors, derived, cache).
- **Claude:** TypeScript migration; invariant validation on load; “every settlement exactly one brigade” as requirement; mistake log and ledger in refactoring plan.
- **ChatGPT:** Same seed + same inputs → identical state; serialized state diff empty between identical runs.

**Canon:** Engine Invariants v0.3.0; PHASE_A_INVARIANTS.md; serialize.ts; turn_pipeline determinism tests.

**Raw refs:** Claude Code review and improvement suggestions (both UUIDs); `2026-01-22_chatgpt_Bosnia_War_Simulation_Design.md`.

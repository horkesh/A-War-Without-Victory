# Working On: v0.7.0 — Event Flag Wiring

## Context
v0.6.x is COMPLETE. Roadmap cross-examined and cleaned up. Calibration baseline re-frozen at 92.0% (n1030).

## What's Next
v0.7.0: Event flag wiring — the foundation for Dynamic Codex.

### Scope
1. **~25 orphan flags** need wiring to downstream consumers (engine systems, events, UI)
2. **~29 FIXED events** need design pass — which should become CONDITIONAL?
3. **FIXED→CONDITIONAL conversion** for key events (Srebrenica, 2nd Markale, Žepa, endgame chain)
4. **New condition types** needed: `enclave_supply_status`, `corridor_severed`, `brigade_count_below`, `artillery_in_zone`

### Plan
`docs/plans/2026-03-23-event-flag-wiring-plan.md` — 6 phases, est. 5-7 sessions.

### Key Design Decisions Still Open
- Which FIXED events should become conditional? (Srebrenica, Markale, Deliberate Force)
- How does the player see canonical vs dynamic Codex layers in the UI?
- How does the command autonomy slider interact with event decisions?

### Parallelism Opportunity
v0.7.1 (essay templates) can run alongside v0.8.0 (political bot) — no dependency between them. Both depend on v0.7.0 (flags).

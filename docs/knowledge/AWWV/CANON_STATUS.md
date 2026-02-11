# AWWV Knowledge Base — Canon Status

Recovered from dual-source archives and aligned with `docs/CANON.md`. Treat both AI sources as fallible.

---

## Canonical (locked)

- **Engine Invariants v0.3.0** — Correctness constraints; code must conform.
- **Phase Specifications v0.3.0** — How frozen systems work.
- **Systems Manual v0.3.0** — Complete system behavior (implementation spec).
- **Rulebook v0.3.0** — Player-facing experience.
- **Game Bible v0.3.0** — Design philosophy and constraints.
- **Phase A Invariants** — Turn pipeline, serialization, determinism, save/load.
- **One turn = one week;** determinism; political control §9; exhaustion §8; supply/corridors §4–6; fronts §6; fragmentation §7.
- **Settlement substrate;** mun1990 = 110; CASE C documented; NW geometry resolved; Bužim→Cazin.
- **context.md** — Process canon (ledger, mistake guard, git).

---

## Accepted but tunable

- **Terrain pipeline (H6.x)** — H6.2 data-only; scalar schema and consumption not yet defined; toolchain (Docker, osmium, gdalwarp) may evolve.
- **Treaty/negotiation** — Implemented; capital/spend ledger and “EU-style peace score” in design; structural acceptance constraints tunable.
- **Formation roster, militia pools, commitment/fatigue** — Implemented; parameters and formulae tunable within invariants.
- **Phase 0 / Phase I** — Referendum gate, war start; specification tunable within “no war without referendum” rule.

---

## Proposed but not adopted

- **External patron pressure / IVP** — Mentioned in design and Claude audit; not formalized in Engine Invariants or Phase specs.
- **Arms embargo asymmetry** — Not in current systems.
- **Heavy equipment / maintenance** — Cited in PHASE KB-A as example of historically discussed but missing system; not in canon.
- **JNA garrison locations as canonical data** — Claude suggested; not in current data contract.
- **“Legitimacy” as a formal invariant** — context.md says authority, control, legitimacy distinct; Engine Invariants define control and authority only.
- **Sarajevo exceptions / enclaves** — Searched in Claude audit; no formal canon clause.

---

## Explicitly rejected / deprecated

- **Corridor rights in treaties** — Deprecated; use territorial annexes (transfer/recognize).
- **Inferring political control from formations, AoR, or fronts** — Invalid (Engine Invariants §9.1).
- **One-turn fragmentation or reunification** — Invalid (§7).
- **Any system that reduces exhaustion** — Invalid (§8).
- **Reopening CASE C as a bug** — Rejected; documented mismatch, no silent fixes.

---

*Use this to guide gap closure and canon revisions; do not retroactively “fix” canon without explicit decision.*

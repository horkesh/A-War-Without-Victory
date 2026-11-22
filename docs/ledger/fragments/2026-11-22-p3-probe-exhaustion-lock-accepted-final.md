## 2026-11-22 — P3 appendix C: candidate B attempted and not adopted; the probe-exhaustion lock is accepted as final

**Why.** Fable consult 8 appendix C: the unlock instrument (probes add no completion exhaustion from week 100) broke P-B at one front, where the VRS Drina line at Šekovići-Slivnje stands empty. Candidate B was the defence row meant to staff that line, so that the unlock could be repeated.

**Candidate B** (branch `claude/p3-cand-b-relief-persists` @ a051c6d86, kept as the record, never a PR): an empty-sector relief order persists while the donor is en route, and the donor filter skips brigades reserved for an operation, including a dated prestage.
- Pair 1 (on 86132662d): health gate FAIL, idle execution 110 / 101 against 38. The whole jump was one operation, Posavina Corridor, which attacked early, then sat in execution with no orders. That was an existing engine gap, closed by #840 (the never-ending-op exit).
- Pair 2 (rebased unchanged onto the #840 tree, against main's hash-identical pair 7cb87ce9 / 55644ff8): hashes 908d658f / de9a61a1. Every guard, both validators and health --strict pass (idle 29 / 28). Battles per week fell in both modes: 2.62 → 2.50 historical, 2.63 → 2.52 emergent. HVO probes after week 100 fell 11 → 0 / 19 → 1 (HVO Northwest Bosnia 10 → 0 / 18 → 1), and VRS Herzegovina Corps probes 10 → 3 / 11 → 0. This fails the appendix B bar.

**Ruling applied** (orchestrator, 2026-11-22, brief 13 (c)):
- B is ATTEMPTED (two builds, both off the bar).
- Consult 4's probe-exhaustion lock is ACCEPT AS FINAL, as consult 8 appendix C's alternative.
- The unlock instrument does not ship.

**Change.** Docs only: `docs/10_canon/Systems_Manual_v0_9_0.md`, "Defence of a held line", gains the accepted-as-final entry. No code, no hash change.

## 2026-11-16 — Pass 39: RR1 moved from Part 3 to the package (P3); #709 (N6) recorded

Docs only; no `src/` or `data/` change, no hash change.

- Orchestrator correction: RR1 (the dated per-faction settings in `data/scenarios/timelines/apr1992.json`: the RS reinforcement multiplier and the RBiH "Controlled Counteroffensive" aggression) moves the hash if it is changed, so it cannot sit in Part 3 (after the freeze, hash unchanged). It is now in the work list P3 row beside F2 and RS replacement, disposition pending the chapters integration (fix by tying them to causes, or a written reason, before the freeze). The Chronicle "Washington Pivot" truth fix stays in Part 3 (UI only).
- #709, N6: enemy-concentration zones survive the per-turn sector renumbering (a stable-key map; older saves keep the positional lookup). Control-identical (0 cells differ, 251 control events identical); the state moved only by the new `intel_picture` field and the corrected zones; baselines re-pinned in the PR. The main hash after #709 is not recorded until confirmed.

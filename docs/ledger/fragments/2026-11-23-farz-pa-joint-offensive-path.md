## 2026-11-23 — Farz guard P-A: the joint-offensive path in historical mode (tooling only)

**Ruling.** Orchestrator ruling 2026-11-22 on the lane B two-seat sitting (historian and operations-expert, independent; war-or-game not seated), the stricter of the proposed sets.

**History.** Uragan 95 / Farz was one joint 2nd and 3rd Corps offensive in September 1995 (BB1 printed pp. 384-388): the 2nd Corps' Spreča push and the 3rd Corps' Ozren and Vozuća attacks ran side by side. The owner ruling of 2026-09-29 already lets either corps make an objective's final capture. Historical mode accepted only the authored Farz receipt or the Uragan 95 partner receipt, so a run in which another operation of that same offensive took a cell failed (k_bfsd: the 2nd Corps' Operacija Slap 2, started t181, took Spreča at t182).

**The receipt.** In historical mode a Farz cell now also passes when ALL of these hold:
- the capture is an operation-owned combat capture by an operation of the 2nd or 3rd Corps;
- that operation started inside the window (t177 or later) and targeted the cell;
- the capture came no earlier than the earlier of the authored Farz and Uragan 95 starts, and no later than the authored Farz's end (Farz is still running);
- the authored Farz itself took at least one cell.

Unchanged: the early-fall scan [160, 177) fails a cell; the cell must be RBiH at t188; the authored Farz must exist and start in the window; probes, sweeps and operationless captures never count; emergent mode is untouched. Rows passed this way print `(joint offensive: <operation id>)`.

**What it keeps out.** An operation launched before the window that runs into it (k_bfsd Operacija Nada 2, 3rd Corps t167; a4n_emer Operacija Odbrana, 3rd Corps t171), a capture before the joint launch, a capture after Farz ended, an operation aimed at another cell, and any other corps (the 1st Corps among them).

**Contract tests** (`tests/farz_objective_gate.test.ts`, 8 new, 36/36): Slap 2 passes; Nada 2 and Odbrana stay out; an untargeted operation and a 1st Corps operation stay out; a capture before the joint launch or after Farz's end stays out; an earlier Uragan start opens the window; the path is closed when Farz took no cell; a probe never counts; emergent mode is unchanged.

**Measured** on the ten historical 188-week runs of the sitting (`_logs/fable-9/runs/k_*`, `_logs/lane-b/runs/*_hist`): 8 of 10 pass, against 7 of 10 before. The one change is k_bfsd (Spreča credited to Slap 2). a4_hist (Farz launched t182, one cell) and ctl3_hist (Donja Bočinja RBiH since t132) still fail.

No `src/` change, so the simulation hash is unchanged.

## 2026-11-17 — Pass 66: the corrected hash-moving order; #774 and #776 off the queue; the schema rule

Docs only; no `src/` or `data/` change, no hash change.

- Corrected hash-moving order (orchestrator, 2026-11-17): #766, then #754, then #735, then #739, then the first READY among #774, #776, #773 and E3a1. #774 (package P2) and #776 (the RF-ROSTER precedence fix) are OFF the queue and get no GO until each Codex finding is reproduced with a failing test, fixed (or answered in the PR) and re-measured; P2's merge proof re-runs after #766. The four Codex comments (#774 x3 for the F1g lane, #776 x1 for RF-ROSTER) are marked "routed, fix pending".
- Schema rule: v40 = #773, v41 = §6 E2, and any other migration PR claims the next free number at READY time; the batch-b-lane's peace-phase PR (engine skeleton, PhaseName narrowed to 'war', peace UI, about 16 dead state fields, five canon edits) takes the next free number.

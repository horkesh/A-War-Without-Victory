## 2026-11-17 — Pass 71: #787 recorded; the retired-field sweep; the FORAWWV line 402 correction; the commander attribution plan; #776 fixed on its head

Docs only; no `src/` or `data/` change, no hash change.

- #787 (consult 6 PR (a)): siege counters, bombardment attrition, the siege morale drain and `siege_active` retired; byte-identical on apr1992; Engine Invariants and Systems Manual §6.10 struck to stubs; SD6 and SD8 rewritten; SB1 accepted as final. Auto-merging.
- New pre-freeze item, the retired-field sweep (L7 lane, after its retirements): one PR strips every dead GameState field, one migration, an old-save fixture.
- FORAWWV.md:402 sentence 3 corrected by the unanimous five-seat panel (names the live war step activate-corps); it lands in the batch-b-lane's bottom_up retirement PR with EI §14.10, SM:893 and War_Spec:49. Not a steward edit.
- Commander attribution plan (RF-ROSTER): PR1 hardening, 2a home and compatible restriction plus the 7th Corps ties, 2c dated corps-CO schedule for 14 corps (fixes the reversed 2nd Krajina order), 2b rank retype after the seats design op-commander eligibility; each measured alone.
- #776's Codex finding is fixed on the PR head (341a9973b), not merged; #776 merges after #739.
- #785 (merged, 7bbce683d; test only): the list-driven guard that every event catalog file reaches every consumer. #784 (notice audience) is still pending.

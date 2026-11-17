## 2026-11-16 — Pass 51: #748 (the t76 Belgrade historical default) recorded; a determinism finding registered

Docs only; no `src/` or `data/` change, no hash change.

- #748: `rs_belgrade_pressure_response_1993`'s historical default is now `accept_belgrade_directive` (Pale stayed in step with Belgrade in autumn 1993; BB1 pp.11-13, Karadžić 377-383 and 3286-3287), with native BCS copy and smaller costs; historian ruling, calibration HOLD, scores recorded: historical 709 / 709 / 708 / 682, guard intact, emergent 710 / 707 / 707 / 670 (guard intact, Farz 4 of 4). Hash-moving: the main pin is final_save 8c9fbf1d30e8a976, "main hash at #748".
- New determinism finding (must-fix, batch-b-lane): `meta.peace_war_start_control_path` stores an absolute filesystem path in GameState, so the final hash of any scenario that sets it (sep1991_to_dayton) depends on the checkout location; it matters for the freeze byte test.
- Chapters block: the army-stance override retirement is proven hash-neutral in seven scenarios; the PR is coming.

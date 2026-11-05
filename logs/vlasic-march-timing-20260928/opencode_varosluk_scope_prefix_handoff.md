# Conditional measurement: March Vlašić scope + authorized march

**Dispatch only after owner authorization for this new 156-week prefix and independent reviewer GO.** Codex drives April 1995 calibration. OpenCode runs exactly one 156-week prefix on the current uncommitted candidate with the authorization-gated dug-in march and owner-approved March objective list `[paklarevo, gornje_krcevine]`. Preserve all prior work. No production/test/scenario/canon/paint change in this task.

## Question, command, acceptance, cost, stop

Question: Does the authorization gate restore the early Donji Vakuf RS trio and 40/40 protected anchors, while the narrowed March ridge objectives capture Paklarevo and perhaps Gornje Krčevine through ordinary combat by w156 without taking Varošluk, raising April fit above retained n9's 704/712 toward the agreed 705/712 floor? Compare Jan 1993 and Apr 1994 fits to n9's 707/712 each; neither may regress. Preserve Donja Mahala HRHB, Doljani w104 RBiH, Ljubunci/Lug/Paroš HRHB, and Gornja Presjenica RS. The prefix is a diagnostic gate, not full 188-week acceptance or merger authority.

Exact command from repo root in `pwsh` (not Windows PowerShell 5.1), with `AWWV_VLASIC_TRACE=1`, `AWWV_DEBUG_AXIS_READINESS=Vlasic`, `AWWV_DEBUG_REASON_CODES=movement_reject,battle_power,battle_stack`:

`node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 156 --unique --out runs`

Expected cost: one 156-week simulation, about 3–5 minutes plus artifact analysis. Stop after exactly one completed prefix. If a cheap gate or campaign fails, retain evidence, inspect all failure categories, and do not retry, retune or launch 188 weeks. Do not delete incomplete run artifacts; if launcher fails before a valid run, report for Codex decision.

## Cheap gates

Confirm approved scope edit and reviewed movement gate are in source, focused catalog/movement tests and affected suites/typecheck/diff check are green or rerun only invalidated gates, scenario/tsx/harness and n9/n11 comparator artifacts exist, selector topics parse, and no post-scope prefix exists. Use a unique CreateNew marker before launch. Redirect stdout/stderr to file and record child exit, run path, 156 rows, final hash.

## Evidence report

Report t20 Jajce release blocked versus n11, Jajce/Donji Vakuf operation timing and 16th Krajina roster, Donji Vakuf trio control, t150–156 Vlašić 17th/737th transit, Paklarevo/Gornje Krčevine/Varošluk battles and control, 40/40 anchors, four checkpoint fits available, all other controller differences, anomaly/diagnostic failures. Distinguish measured facts from inference. Write `logs/vlasic-march-timing-20260928/opencode_varosluk_scope_prefix_result.md` with raw evidence paths, exits/counts/verdict and next remaining question. No second campaign, full suite, map refresh, merge, baseline adoption, or October calibration.

# n32 Sana state and exit-marker probe

## Result

The proposed parallel 517th Škucani / 506th Sanski-town orders are **not
feasible at the first actual selector gate in the hydrated n32 counterfactual**.
The saved state is sufficient to hydrate derived fronts; the proposed split
remains counterfactual, not an observed n32 order layout.

## Observed n32 state

- Evidence: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n32/save_w183.json`,
  `save_w184.json`, `brigade_temporal_log.jsonl`, and `weekly_report.jsonl`.
- Formation IDs are `arbih_506th_mountain` and `arbih_517th_light`, both
  `arbih_5th_corps`, active, at `op:bihac:bihac_2` at t183 and in transit
  toward `op:titov_drvar:prekaja_2` at t184.
- At both turns, the existing `sana_sanski_most_kljuc` axis owns **both**
  brigades. Its objectives are `op:kljuc:hadzici`,
  `op:kljuc:kljuc_2`, and `op:kljuc:krasulje_2`; index is 0 at t183 and 1 at
  t184. `op:kljuc:hadzici` is RS-controlled at t183 and RBiH-controlled at
  t184; the remaining two are RS-controlled at both snapshots.
- The snapshots report `launch_blocker: zero_eligible_axis` for this axis.
  `war_front_edges_osid` and `corps_front_sectors` are derived fields omitted
  from the saves, not missing indispensable state. Production hydration via
  `computeFrontEdgesOsid` and `buildCorpsFrontSectors` yields 266 edges / 59
  sectors at t183 and 265 edges / 59 sectors at t184. A repeat derivation
  produced the identical stdout hash.
- Temporal rows t183–188 show the two brigades reaching
  `op:kljuc:hadzici` at t187 and remaining there at t188; no retained row
  shows a Škucani or Sanski-town attack.
- The n32 weekly report records an ordinary HRHB win at Prekaja by the Kralj
  Petar Krešimir IV brigade in Operacija Kamen at t175. Its Sana diagnostic
  lists Donji Dubovik among current objectives at t175 but Hadžići in its place
  at t176. The first 174 weekly rows match retained n30 byte for byte; the
  first n30/n32 difference is t175 operation diagnostics. This corroborates the
  previously measured n30 Prekaja-to-Hadžići planning boundary, while the
  exact n32 reconciliation inputs at t176 were not saved.

These are observations. The probe's split is explicitly counterfactual: it
replaces the saved objective order with 517th →
`op:sanski_most:skucani_vakuf_2` and 506th →
`op:sanski_most:sanski_most_2`, and gives each brigade its own axis. The source predicate in
`src/sim/combat/operation_approach_osids.ts` assigns a brigade to the first
matching axis, so duplicate cross-axis ownership would require a separate
design decision. Both proposed objectives are RS-controlled in both snapshots.

## Checks

- Log-local diagnostic command:
  `node node_modules/tsx/dist/cli.mjs logs/prusac-diagnostic-20260929/sana_n32_hydration_probe.ts`
  — exit **0** at t183 and t184; repeat exit **0**. The unchanged-n32 positive
  control invoked the real selector and returned non-empty approaches. The
  counterfactual returned empty approach sets for both brigades at both turns.
- First actual gate: **approach-set gate** — at least one proposed brigade has
  no legal approach OSID, so simultaneous lawful orders cannot be emitted.
- Negative control: the labeled counterfactual split fails this feasibility
  predicate at both t183 and t184; the unchanged n32 axis remains the positive
  control.
- Probe evidence: `sana_n32_hydration_probe.stdout`, `.stderr`, `.exit`,
  `sana_n32_hydration_probe_repeat.stdout`, and
  `sana_n32_hydration_probe_repeat.exit`; repeated stdout SHA-256 is
  `84b4d9e7d5e4c096794a49d7f2c624d8d0fa412e494018700cad7181f6cf9fe7` for
  both runs.
- Campaign/prefix/full suite/map refresh: not run.
- Exit probe command:
  `powershell -NoProfile -ExecutionPolicy Bypass -File logs/prusac-diagnostic-20260929/sana_exit_marker_probe.ps1`
  — supervisor exit **0**, child marker **0**. Evidence is
  `sana_exit_marker_probe.stdout` (`v22.23.2`), empty stderr, and
  `sana_exit_marker_probe.exit` (`0`). The probe changes both Refresh and cast,
  so the original blank-marker cause remains **unproved**.
- `git diff --check` — exit **0** (with the repository's existing CRLF
  normalization warning for `docs/PROJECT_LEDGER.md`).

## Recommendation

Do not claim calibration acceptance. The next recommendation is to preserve the
hydration/selector probe as a diagnostic only; a production design would need a
separately authorized counterfactual order-emission test that also proves the
downstream order consumer, without changing authored operations or production
behavior.

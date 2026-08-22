# HV 1995 EXPEDITIONARY WAVE — HANDOFF

**Status 2026-08-22.** Branch `codex/master-roadmap-execution` @ `ce43a36d1`, clean, pushed.
Durable handoff for whoever picks this up next. Pairs with the `docs/PROJECT_LEDGER.md` entries
of 2026-08-21/22, which carry the same arc in narrative form.

> ## ★ SUPERSEDED IN TWO PLACES — read this before acting on anything below
>
> Codex executed this handoff on 2026-08-22 and **refuted two of its factual claims**. Both
> corrections are upheld, independently re-verified, and recorded in
> `docs/life_lessons/` (process + architecture, 2026-08-22 batch). Full successor report:
> `docs/40_reports/implemented/20260822_HV_1995_TIMING_MOBILITY_CI_RESOLUTION.md`.
>
> 1. **§4's "wall 2" is WRONG.** `brigade_movement.ts:167/198/219` is a **non-operational fallback
>    mover**: its pipeline step is guarded by `if (getOperationalData(context)) return;`
>    (`war_phases.ts:1730-1743`), so it never runs in any OSID scenario, including
>    `apr1992_definitive_188w`. The line numbers and the exclusion are real; the module is not
>    reached. **The two live executors are `processOsidColumnMovement` and
>    `applyBrigadeMovementOrders`**, and both now admit `hv_phantom`.
> 2. **§8's CI claim is WRONG.** The two runs are **not** byte-identical. Three 188w actuals
>    changed (`final_save.json`, `run_summary.json`, `weekly_report.jsonl`); equal red *counts*
>    hid changed *outputs*. The new `final_save` actual is `034820889a972be7…` — bit-for-bit the
>    local branch hash — so **CI did exercise the history merge**. The anomaly does not exist and
>    does not gate the manifest. The original claim came from comparing a single artifact whose
>    label had been mis-read (`activity_summary.json`), then generalising to all sixteen.
>
> **What still stands:** the measurements table (§3), the coupling constraint (§4, honoured by the
> successor), the reading of the +16 as a cascade rather than the force fighting (§5), the
> objective-filter analysis (§6), and the open items (§7).
>
> **Outcome of the work this handoff commissioned:** the coupled timing+mobility candidate measured
> **609/712, 31/31 anchors** — *below* the 611 floor — and was **not promoted**. Floor unchanged.

Read this with `docs/PROJECT_LEDGER.md` (last ~6 entries cover the same arc in detail).
Everything below is measured unless marked NOT ESTABLISHED.

---

## 1. One-paragraph orientation

The 1995 Croatian Army (HV) expeditionary force in `HV_PHANTOM_DEFS_1995` was wrong in five
independent ways. Four were historical-data errors and are now **fixed and merged** — they move
zero territory. The fifth is a **timing error worth +16 matched OSIDs**, split onto its own branch
and **deliberately not merged**, because it is a calibration change and deserves to be decided as
one. Underneath all five sits the actual engine defect, **not yet fixed**: formations of kind
`hv_phantom` have no movement path at all and fight in zero battles across the whole war.

---

## 2. State of the tree

| ref | what | status |
|---|---|---|
| `ce43a36d1` | branch HEAD (ledger) | pushed |
| `0fd09c19f` | merge of the history corrections | **MERGED** |
| `845db429e` | the history corrections themselves | merged via above |
| `3b40d1619` | `lane/hv-1995-spawn-timing` — the +16 | **HELD, pushed, unmerged** |
| `archive/hv-1995-bundled-86eb00339` | tag on the original 5-in-1 bundle | archived, branch retired |

Worktree `F:\awwv-hv-data` is parked on `lane/hv-1995-spawn-timing`. Clean.

---

## 3. The measurements (188w, `apr1992_definitive_188w`)

| tree | matched | anchors | final_save sha256 (16) |
|---|---|---|---|
| baseline `607ef038c` | 611 | 31/31 | `dd90c75508a9cf2e` |
| **history corrections only (merged)** | **611** | **31/31** | `034820889a972be7` |
| spawn turn only | 627 | 31/31 | `4ac1c64ee5a197e8` |
| both (= the original bundle) | 627 | 31/31 | `e4f01cd17eb8520c` |

**The spawn-turn-only run and the both run differ in ZERO OSIDs.** The timing change is necessary
and sufficient for all sixteen cells. The four historical corrections measure at exactly zero.

Two independent constructions of the history-only tree — the reviewer's (revert the timing out of
the bundle) and mine (rebuild forward from baseline) — landed on the **same hash**
`034820889a972be7`. The split is measured, not argued.

Note the merged tree keeps `matched` at 611 but **changes the state hash**. Territory-neutral is
not state-identical: formation rosters changed. Expect derived-artifact hashes to move.

Full suite on the pre-split bundle: **7 files / 15 tests failed — identical to the main baseline**,
failing set unrelated to this lane. `tsc --noEmit` clean. 104 tests pass across the 7
phantom/catalog/location suites on the merged tree.

---

## 4. THE OPEN BUG — `hv_phantom` cannot move

This is the real engine-health item and the reason the +16 should not be read as a success.

**Two independent walls, either one fatal. Both verified on merged main.**

1. **Orders are never issued.** `src/sim/combat/brigade_movement_orders.ts:75` filters to
   `kind === 'brigade' | 'og' | 'operational_group' | 'jna_phantom'`. `hv_phantom` is absent.
2. **Orders would never be executed.** `src/sim/combat/brigade_movement.ts:167`, `:198`, `:219`
   each test `(formation.kind ?? 'brigade') !== 'brigade'` → `continue`. This excludes **both**
   phantom kinds, so fixing only wall 1 changes nothing.

`grep -c hv_phantom` returns **0** in `brigade_movement.ts`, `brigade_movement_orders.ts` and
`brigade_front_distribution.ts`. Also excluded from the corps subordinate roster at
`src/sim/combat/corps_command.ts:126` and `:151` (both admit `jna_phantom`, neither admits
`hv_phantom`).

**Why it was built this way, and why that reasoning does not transfer.** The 1992 `jna_phantom`
ghosts carry `capture_osids`: they spawn, flip control of a fixed list, and dissolve. Such a thing
never needs legs. The 1995 HV wave was written by copying that class but carries **no**
`capture_osids` — so it inherited the immobile chassis without the capture power that made
immobility acceptable. It has neither. The design memo
(`docs/40_reports/proposals/20260523_HV_EXPEDITIONARY_GHOST_DESIGN.md`) claims a composition
"matching the historical Mistral 2 + Southern Move" and never mentions mobility once.

**Their only remaining locomotion** is advance-after-capture
(`attack_resolution_osid.ts:1562-1564`, moves `attackerFormations[0]` into a flipped OSID with no
kind check). That requires attacking an adjacent cell first. They spawn at `op:livno:livno_2`;
exactly one Mistral objective is adjacent — `op:glamoc:vidimlije_2` — and the engine **strips it**
because it is already friendly-held (see §6). The one door out is closed.

**Measured consequence:** across 188 turns and **616 battles carrying a full attacker stack**
(`AWWV_DEBUG_REASON_CODES=battle_stack`), **not one 1995-wave brigade appears in any of them** —
not as named attacker, not as an unnamed stack member. Zero battles, zero casualties either way.

### ★ The constraint that governs the fix

**The movement fix and the timing change MUST land together.** Giving these brigades legs while
they still spawn at turn 150 puts 12,000 elite troops with 51 tanks loose in western Bosnia from
**mid-February 1995** — through Srebrenica and through Storm. That is the largest ahistorical
intervention available in the scenario. The Historian's ruling is explicit: if the timing cannot
move in the same change, **do not fix the movement**.

Sequence: merge `lane/hv-1995-spawn-timing` first (or carry it in the same branch), then fix
movement, then re-measure. Expect the +16 to change character entirely — the cascade that produces
it today (§5) disappears once the force can actually fight.

---

## 5. What the +16 actually is — read it as a warning

It is **not** the force fighting. The mechanism is an operation-slot cascade:

with the wave spawning at 174, `hv_7th_hgr_1995` does not exist during Mistral 1's t160-170 window
→ it was `mistral_1_glamoc`'s ONLY candidate, so the axis is never constructed → Mistral 1 dies at
t163 instead of t168 → the `hvo_tomislavgrad` op slot frees five turns early → Mistral 2 builds
t175 instead of t182 and completes its Šipovo axis 5/5 → Southern Move's staging anchors hold, so
it builds at t182 and takes 5/6 Mrkonjić objectives. **It never built at all at baseline.**

So: **removing an immobile unit from a candidate list unblocks an operation slot.**

The map lands closer to history and the engine did not get there the way history did. BB1 p.417
n.643 has **five** HV Home Defense regiments and **three** reserve infantry brigades pinning the VRS
2nd Krajina Corps southeast and southwest of Drvar — exactly where ten of the sixteen cells sit. In
the sim those formations fight zero battles. **Right answer, wrong route.** This is an
engine-health concern, not a calibration win, and it is exactly the kind of agreement that looks
like validation and is not.

Cells: 16 gained, 0 lost, a strict superset. 4 stopped going RS (`bihac:orasac_2`,
`bosanski_petrovac_2`, `kljuc:hadzici`, `kljuc:kljuc_2` — a known-open mismatch), 6 new RBiH gains
across Bosanski Petrovac / Ključ / Sanski Most / Bosanski Novi, 6 new HRHB gains across Mrkonjić
Grad + `sipovo:pribeljci_2`.

**NOT ESTABLISHED:** why the ten ARBiH-side cells moved. VRS redeployment against the new
Mrkonjić/Šipovo pressure is plausible and untraced.

---

## 6. Second defect found in the same arc — the silent objective filter

`src/sim/combat/operation_opportunities.ts:1149-1154` strips friendly-held objectives at op-build
time and **logs nothing**. An axis authored with seven objectives and built with six is
indistinguishable in every artifact from one authored with six.

- **4 of 19 authored catalog axes lose objectives to it; 3 lose their FIRST.**
- `mistral_1_glamoc` already begins with `op:glamoc:vidimlije_2`, with a Wave 23A comment stating
  the intent — *"inserted reachable-first so the brigade brain never heads an unreachable
  objective."* The engine deletes it; `vidimlije_2` was captured at t116/t117, 43 turns before
  Mistral 1 builds. **Someone already authored the fix and nothing told them it had been removed.**
- **Control case:** `kupres_cincar_line` also loses its first objective and succeeds anyway (4/4
  captured, six brigades). So the filter is an **amplifier, not an independent cause** — the engine
  absorbs the loss iff the axis's formations can march. Fixing the filter alone would NOT have
  saved Mistral 1.

Two harder silent failures in the same function, **code-read, not observed firing at HEAD**:
`if (filteredObjectives.length === 0) continue;` makes an entire axis vanish;
`if (builtAxes.length === 0) return null;` makes the whole operation decline to spawn.

**Suggested instrumentation** (same class as the merged reason-code lane): at the filter site, when
`filteredObjectives.length < axis.objectives.length`, record `objectives_authored`,
`objectives_dropped_friendly[]`, `first_objective_dropped`. All live locals.

---

## 7. Smaller open items, none blocking

- **25 tanks on `hv_1st_hgz_1995`** is now the least defensible line in the loadout. BB1 p.410 has
  the 1st HGZ **airlifted by Mi-8** southeast of Obrovac — a light, air-mobile elite formation. The
  trim cut three home-guard regiments and left the single largest number untouched because that row
  was **renamed rather than re-costed**. 25 of the wave's 51 tanks sit on a helicopter-inserted unit.
- **Supporting echelon under-modelled:** BB1 p.417 n.643 gives five HDRs + three reserve brigades;
  the wave models three + one.
- **Personnel is not authorable.** `getPhantomSpawnProfile` (`jna_phantom_brigades.ts:48`) returns a
  flat **2000** for any def carrying equipment, 800 for one without. Wave strength moves only in
  2000-man steps by adding/removing rows. Current wave = **6 rows = 12,000 men, 51 tanks** (was 8
  rows / 16,000 / 136).
- **The 12,000-14,000 band is DERIVED, not quoted** — the Historian built it from BB1 pp.417/427 and
  the p.298 fn 304 rotation note. Cite it as derived if it is used to judge a loadout.
- **ICTY Gotovina IT-06-90 is marked `[UNVERIFIED]`** in the source comment. Nobody here has read
  the judgement. If someone does and it gives HV-only strengths for Maestral, it replaces the band
  with a figure. Nothing found there would move the timing or the Central Bosnia ruling.
- **`run_meta.json` records no flag configuration.** Its keys are `out_dir, provenance, run_id,
  scenario_id, scenario_path, weeks`. A run made with `AWWV_DEBUG_REASON_CODES` set is
  indistinguishable afterwards from one without. Worth fixing before flags multiply.
- Three standing red test files; ping-pong on `op:glamoc:glamoc_2`; the t0 recruitment pass that
  computes refusals and discards them.

---

## 8. Traps — every one of these cost time today

- **`data/derived/latest_run_final_save.json` is TRACKED and every 188w run rewrites it.** It is
  both a dirty-tree hazard and a false-evidence hazard: it has been observed holding a *different
  tree's* state. Never read HEAD claims off it. `git checkout --` it after any run. An exit-time
  guard for tracked `data/derived/` files is not built.
- **CI is RED and was red before this work.** Run `32532844577` is **byte-identical** to
  `32050627175` from 2026-08-17 — same 16 mismatches, same two scenarios, same `expected`/`actual`
  pairs. The golden manifest (`data/derived/scenario/baselines/manifest.json`, 8 artifacts ×
  `apr1992_definitive_188w` / `apr1992_definitive_52w` / `baseline_ops_4w` / `noop_4w`) is stale.
  **UNRESOLVED ANOMALY, do not refresh the pins before settling it:** the merge deletes two brigades
  from `apr1992_definitive_188w` and my local run's `final_save.json` hash moved, yet CI's `actual`
  for that scenario is unchanged across the merge. The workflow step
  (`.github/workflows/event-system-ci.yml:119`) shows no caching. Either CI is not exercising what
  it appears to, or something upstream short-circuits. Regenerating the manifest against a run that
  is not reflecting code changes would bake the problem in permanently.
- **Windows caches a file's size and mtime while a writer holds the handle open.** A healthy 73-min
  test run appeared frozen at 30,134 bytes for 33 minutes. **File size is not a liveness signal on
  this platform; process CPU time is.**

---

## 9. ★ The process lesson this arc actually produced

**Five instances in one session of the same failure: a derived signal read as a primary one, by a
check that answered a narrower question than the claim it carried.**

- a ledger sentence read outside its scope, hiding the larger mover;
- a colleague's *"I verified"* accepted unchecked → a false claim committed;
- `grep` scoped to `src/`, conclusion unscoped → a real event
  (`holbrooke_us_belgrade_channel_1995`, live in `war_1995.json` turns 176-178) called a
  fabrication;
- **two successive "0 failures" progress reports on the gating test suite, produced by grepping `×`
  when vitest marks a failing FILE with `❯`** — seven files had already failed;
- `attacker_brigade` naming only the stack's first attacker, read as proof of non-participation.

> **A probe that cannot fail is indistinguishable from a probe that works. Give monitoring checks a
> positive control before quoting their output.**

Related standing rules that were violated and should not be again: **one change per calibration
run, never bundle** (the original `86eb00339` was five edits in one commit — the split exists to
undo that); **never commit into a worktree another agent is running in**; **implementer ≠ reviewer**.

---

## 10. Recommended next actions, in order

1. **Settle the CI anomaly in §8** before anyone touches the golden manifest.
2. **Decide the timing branch** `lane/hv-1995-spawn-timing` (`3b40d1619`). It is measured, reviewed
   and ready; it is a calibration decision, not a technical one.
3. **Fix `hv_phantom` movement — with the timing change in the same tree, never without it.** Both
   walls in §4. Then re-measure 188w and expect the §5 cascade to change shape.
4. Instrument the objective filter (§6) — cheap, and it closes a three-month-old silent failure.
5. Re-cost the 1st HGZ's 25 tanks (§7).

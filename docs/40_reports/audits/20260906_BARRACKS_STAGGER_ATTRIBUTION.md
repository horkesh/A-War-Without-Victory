# Attribution ruling — n391 and the Battle of the Barracks stagger

Scenario-tester seat, 2026-09-06. No code or data changed. **No new scenario run was launched.**
Everything below is replayed from committed artifacts and the two existing run directories.

---

## VERDICT IN ONE LINE

**The +21 at oct1995 is NOT attributable to the barracks stagger, and n391 is not admissible as
the treatment half of any pair.** Your framing was right on the conclusion and wrong on three of
its premises — including which run is the project's canonical baseline. Details below.

---

## Q1 — Is the +21 at oct1995 attributable to the barracks stagger? **NO.**

### MEASURED: the two runs consumed four different data files, not one

`runs/…n388/run_meta.json` vs `runs/…n391/run_meta.json`, `provenance.consumed_inputs.files`
(31 paths, content-hashed). Diffing them:

| path | n388 | n391 | changed by |
|---|---|---|---|
| `data/scenarios/apr1992_definitive_188w.json` | `1238130b35e8` | `7db056062b0b` | `d9f0451b0 calibration(foca): earn takeover through operation` |
| `data/scenarios/events/consequences.json` | `356a011d4695` | `2fac4889d390` | `02dfd7967` |
| `data/scenarios/events/war_1992.json` | `927e2d8d32fe` | `7596df56b934` | `0716e6c68` (barracks) **and** `a5d1a1cf4 fix(§6): relabel rs_strategic_goals` |
| `data/scenarios/events/war_1995.json` | `3b98c3a79de3` | `56d5779b6b35` | `02dfd7967`, `8fd422b7b osmace_2`, `c3b1753f4 obadi` |

All four `painted_control_*.json` hashes are **identical** across the two runs, so the reference
did not move — the delta is genuine engine/data behaviour, not a repaint. That much is clean.

### MEASURED: the engine differs by ~20 sim-core files

`git diff --stat 4b4e8e388 0716e6c68^ -- src data` (n390's tree vs the pre-barracks HEAD line)
lists 64 files. The sim-core subset:

```
src/sim/combat/attack_resolution_osid.ts            57 +-
src/sim/combat/battle_resolution.ts                 32 +-
src/sim/combat/combat_math.ts                       24 +-
src/sim/combat/enclave_resilience.ts                54 +-
src/sim/combat/pre_planned_operations.ts           100 +-
src/sim/combat/sector_offensive.ts                  51 +-
src/sim/combat/operation_opportunity_catalog_central_bosnia.ts  68 +-   <- Vlasić
src/sim/combat/militia_casualties.ts               151 +   (new)
src/sim/combat/paramilitary_sweep.ts                19 +
src/sim/events/evaluate_events.ts                   39 +
src/sim/formation_spawn.ts                          48 +
src/sim/turn_phases/war_phases.ts                   23 +-
src/state/casualty_ledger.ts                        65 +-
src/state/game_state.ts                             19 +-
```

n388's tree (`3474df2e0`, 2026-08-31) is even further back — it is the **merge-base** of n390's
branch and HEAD, so it precedes every one of the above.

### MEASURED: the geography of the +21 rules the barracks out

I replayed `final_save.json → political.control_events` over `initial_political_controllers`
to week 188 for both runs and scored each OSID against `painted_control_oct1995.json`
(the same `stateAt` the verifier uses, `tools/verify_checkpoints.cjs:85-89`).

**26 gained, 5 lost, net +21.** By municipality:

```
sanski_most        +6      hadzici          -1
bosanski_petrovac  +4      ilidza           -1
kljuc              +2      rogatica         -1
konjic             +2      visegrad         -2
travnik            +2
bihac +1  bratunac +1  gorazde +1  kotor_varos +1  lukavac +1
maglaj +1  skender_vakuf +1  trnovo +1  vlasenica +1  zvornik +1
```

- **15 of the 26 gains sit in the Sana valley / western Krajina** (Sanski Most, Bosanski
  Petrovac, Ključ, Bihać, Skender Vakuf, Kotor Varoš). That is the documented HRHB
  western-Bosnia cascade site. The verifier's own cascade block confirms it independently:
  **26 → 38 matched, +12**, with `bosanski_petrovac 4/8→8/8`, `kljuc 2/7→4/7`,
  `sanski_most 2/10→8/10`. The barracks events fire in Visoko / Sarajevo / Tuzla / Zenica at
  turns 3-9. Sanski Most at week 188 is ~200 km and 180 turns away.
- **Three of the gained OSIDs are named verbatim in a different commit.** `034e9c4af
  calibration(vlasic)` contains the strings `op:travnik:gornje_krcevine`,
  `op:travnik:varosluk` and `op:skender_vakuf:donji_koricani` in its own diff. Those three
  are on the gained list. That is direct, self-documented attribution to a non-barracks change.
- `op:bratunac:pobudje_2`, `op:vlasenica:cerska_2`, `op:zvornik:krizevici` are the eastern
  cells owned by `c3b1753f4 obadi`, `8fd422b7b osmace_2`, `918661e0d fix(engine): restore
  eastern enclave continuity` — and n388's verifier output names exactly `pobudje_2` and
  `cerska_2` as its "never-captured cell(s)".

**What n391 IS evidence of:** the aggregate behaviour of the tree at `dad680710` — every change
merged since 2026-08-31 taken together, including foča, Vlasić, the two §6 enclave
event-ownership fixes, militia casualty persistence, the probe/queued-brigade fix, enclave
continuity, and the two event-data commits. It is a rebaseline observation, not a change test.
It is **not** evidence about `0716e6c68` specifically, in either direction.

### MEASURED: what the barracks stagger demonstrably DID do

`weekly_report.jsonl`, `events_fired`:

| | n388 | n391 |
|---|---|---|
| visoko | w4 | **w3** |
| sarajevo | w4 | **w4** |
| tuzla | w4 | **w6** |
| zenica | w4 | **w7** |

In n388 all four fire in a single week. In n391 they fire in four separate weeks, each at the
low edge of its new window (3-4→3, 4-9→4, 6-7→6, 7-8→7). **The change is live and does exactly
what it claims.** That is a real, measured, attributable result of `0716e6c68` — it is simply a
different proposition from "+21 at oct1995".

I verified the barracks diff independently: `git show 0716e6c68 -- data/scenarios/events/war_1992.json`
touches only `turn_min`/`turn_max` on the four `battle_of_the_barracks_*` entries plus array
re-sort. 186 insertions / 186 deletions, no body change. Your read was correct.

---

## Q2 — n388's commit: **RECOVERABLE, and already recorded.** Your premise was wrong.

`runs/apr1992_definitive_188w__46834a3b41033bff__w188_n388/run_meta.json`,
`provenance.git_commit` = **`3474df2e0dc7c20375c6724352b4ea79178fb761`**
(`git log -1 3474df2e0` → `docs(ledger): record preserved orphan branch tips`, 2026-08-31),
`git_dirty: false`, Node `v22.23.2`.

It is also written down in prose: **`docs/40_reports/CALIBRATION_MASTER.md:93-95`** names
the run dir, the commit `3474df2e0dc7c20375c6724352b4ea79178fb761`, `git_dirty:false`,
Node 22.23.2 and final-state hash `a29714d7dabc2d9f`.

Whatever you read that showed `?` was not `run_meta.json`. Nothing about n388's provenance is
missing — this is not a baseline-hygiene finding.

### The actual baseline-hygiene finding is the opposite of the one you looked for

**n388 is the project's declared canonical baseline; n390 is not, and cannot be.**

`CALIBRATION_MASTER.md:88-104`, heading "★ CURRENT RE/CALIBRATION AUTHORITY — 2026-08-31":

> The owner-authorized clean run is `…w188_n388` at commit `3474df2e0…`. It is the current
> canonical measurement.
>
> | jan1993 **697 / 712** floor **694** | apr1994 **677** floor **674** | apr1995 **671** floor **668** | oct1995 **644** floor **641** |

n390's commit `4b4e8e388` is **not an ancestor of HEAD** (`git merge-base --is-ancestor
4b4e8e388 HEAD` → false). Its merge-base with HEAD *is* `3474df2e0`, i.e. n388's commit. The
branch it sat on was re-landed under new SHAs (`4b4e8e388 feat(harness): let a Level-3
playthrough run to completion` reappears on main as `4dfd2fc78` with the same subject). n390
also ran on **Node v24.13.0** against n391's **v22.23.2** — a node-major difference, which
`src/scenario/run_provenance.ts:589-592` makes a **blocking** hard-fail.

So: you spent the investigation treating an off-mainline, wrong-node-major run as the baseline,
and the actual documented baseline as the unknown. That is the real hygiene finding, and it is
worth a ledger line.

---

## Q3 — The correct paired comparison, and what it costs

### The trees involved

- `0716e6c68~1` = `a93fa0c58` (docs-only). Its `src/` + `data/` tree is the pre-barracks state.
- `0716e6c68` = barracks stagger only.
- `dad680710` = HEAD = barracks + `02dfd7967`; the two commits after it are docs-only, so
  its `src`/`data` tree is identical to `02dfd7967`'s. **This is the tree n391 already measured.**

### Recommended: ONE run, not two

Take the control at `a93fa0c58` and pair it against the n391 you already have. That isolates
`{barracks stagger + flag-name fix}` as a unit against an otherwise identical tree — which is
the unit PR #502 actually ships anyway.

```bash
git stash push .claude/scheduled_tasks.lock data/derived/latest_run_final_save.json
git switch --detach a93fa0c58
git status --porcelain          # MUST be empty — see Q4
npm run sim:scenario:run:188w   # package.json:54
node tools/verify_checkpoints.cjs runs/<control_dir>
# then score the treatment against the control's four numbers:
node tools/verify_checkpoints.cjs \
  runs/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n391 \
  --base jan=<C1>,apr94=<C2>,apr95=<C3>,oct=<C4> --cascade-base <Ccascade>
```

**Caveat that makes this cheaper option conditional:** n391 is `git_dirty:true`, so under the
repo's own rule (Q4) it cannot legally be the treatment half. If you want a verdict that
survives review, the honest version is two runs at `a93fa0c58` and `dad680710`, both clean.

**Cost.** `docs/PROJECT_LEDGER.md:29357` prices the programme at "19 × 188w ≈ 22 hours" →
**~70 min per 188w run**. One run ≈ 70 min; the defensible two-run pair ≈ 2h20m serial.
Do not substitute 40w/43w: `.claude/napkin.md:36` records a one-line objective addition that
measured **+3 at 43w and −26 at 188w**.

**Third run only if you need barracks *alone*** (control `a93fa0c58` vs treatment `0716e6c68`),
+70 min. I do not think that is worth buying — see Q7.

---

## Q4 — Does `git_dirty: true` disqualify n391? **Yes, for a paired verdict. No, for description.**

This is not my judgement call; the repo already ruled on it.

`src/scenario/run_provenance.ts:573-579`:

```ts
for (const [label, prov] of [['first', a], ['second', b]] as const) {
    if (prov.git_dirty === true) {
        blocking.push(`${label} run was produced from a DIRTY tree — its commit does not describe it`);
    } else if (prov.git_dirty === null) {
        blocking.push(`${label} run could not certify tree cleanliness (git unavailable at run time)`);
    }
}
```

`blocking`, not `advisory`. And `CALIBRATION_MASTER.md:319` states the same as lane policy:
"**S0 — Baseline.** No RE run starts until a clean `git_dirty:false` four-checkpoint 188w exists."

Two corrections to your framing of the dirt itself:

1. **`run_meta.json` does not record which paths were dirty.** n391's `provenance` keys are
   `collapse_enabled, consumed_inputs, git_commit, git_dirty, harness, node_version,
   schema_version` — no `dirtyPaths`. `GitState` carries `dirtyPaths`
   (`run_provenance.ts:286`) but it is not stamped. So "the only dirty path is
   `.claude/scheduled_tasks.lock`" is an inference from the tree **now**, not a fact about the
   tree **then**.
2. **The tree is not that clean now either.** `git status --porcelain` right now:
   ```
    M .claude/scheduled_tasks.lock
    M data/derived/latest_run_final_save.json
   ```
   Both tracked. The second is a run-output artifact, so it may well have been dirty at n391's
   launch too.

**And a finding you did not ask for.** `npm run sim:scenario:run:188w` routes through
`tools/scenario_runner/run_scenario_with_preflight.ts`, which has a §6-grade start-time gate
that **refuses** on a dirty tree (`run_scenario_with_preflight.ts:63-85`), with a single escape
hatch, `AWWV_PROVENANCE_OVERRIDE` (`run_provenance.ts:148`). Using the hatch stamps a key into
provenance whose "PRESENCE disqualifies the run from a §6 verdict" (`run_provenance.ts:217-220`).
n391 has **no such key** and yet is `git_dirty:true`. Therefore **n391 was not launched through
the gated entrypoint** — it went through the ungated sibling `run_scenario.ts`, which
`run_provenance.ts:95-100` explicitly warns about:

> ★ THE START-TIME CLEANLINESS GATE IS ENTRYPOINT-SCOPED, NOT UNIVERSAL. […]
> `tools/scenario_runner/run_scenario.ts` is a live sibling with NO gate.

**Ruling.** n391 is admissible as a *descriptive* observation of HEAD — its event-firing turns,
its four checkpoint scores, its guard status, its anchor count. Those are self-evidencing facts
about that artifact. It is **inadmissible** as either half of a controlled pair, and inadmissible
as a new canonical baseline. Re-take it clean through `npm run sim:scenario:run:188w` before it
becomes anything the project cites.

---

## Q5 — Teočak 4 → 1 battles: real, unattributable, and it *weakens* the guard

MEASURED from `weekly_report.jsonl`, battles targeting `op:ugljevik:teocak_krstac_2`
(turn is the `battle_id` prefix):

- **n388, 4 battles:** t16 `rs_3rd_semberija_light_infantry` (attacker **won**), t17 same
  (lost), t18 same (lost), t74 `rs_2nd_majevica_light_infantry` (lost, 395 attacker casualties).
- **n391, 1 battle:** t15 `rs_1st_majevica_light_infantry` (lost).

Not noise — a different RS brigade, at a different turn, and a different count. But **not
attributable to the barracks stagger** either: `src/sim/formation_spawn.ts` (+48),
`sector_offensive.ts` (+51), `pre_planned_operations.ts` (+100) and `enclave_resilience.ts`
(+54) all changed in the same gap, and any of them reassigns which RS brigade is in front of
Teočak at t15-18. The barracks change *is* a plausible contributor — it grants RBiH 13 tanks +
26 artillery and an RS `aggression_modifier` at t3-9 — but plausible is not measured.

**The part worth flagging to the panel:** the enclave guard's evidentiary value lives in the
`CONTESTED-AND-HELD` label, not the `HOLDS` verdict. Going 4 → 1 moves that cell closer to the
vacuous-pass failure mode `tools/verify_checkpoints.cjs:108-125` was repaired to eliminate. The
verdict is unchanged and correct; the *evidence behind it* got thinner. Worth a line in the §6
record even though nothing breached.

---

## Q6 — The floor, and whether 665 clears it

**The floor is four numbers, and it is stated against exactly these checkpoints.**
`CALIBRATION_MASTER.md:99-104` (see Q2 for the full block):

| checkpoint | floor | n388 (baseline) | n391 | vs floor |
|---|---:|---:|---:|---:|
| jan1993 | 694 | 697 | 702 | **+8** |
| apr1994 | 674 | 677 | 678 | **+4** |
| apr1995 | 668 | 671 | 672 | **+4** |
| oct1995 | **641** | 644 | **665** | **+24** |

`node tools/verify_checkpoints.cjs runs/…n391 --base jan=694,apr94=674,apr95=668,oct=641
--cascade-base 26` prints **NET across checkpoints: +40** and `cascade base 26 +12`, with no
`SCORE REGRESSION` line. **665 clears the oct1995 floor by 24.** Nothing regresses anywhere.

`CALIBRATION_MASTER.md:544` separately notes the engine-health gate's `188w.matched_osids_min`
is **622** — also cleared.

Two things that are *not* on any floor and moved anyway:
- **Anchors: n388 is 30/31, n391 is 31/31.** n388 fails `op:lukavac:brijesnica_donja_2`
  (expected RBiH, actual RS); n391 passes it. `CALIBRATION_MASTER.md` describes n388 as the
  canonical clean baseline without recording that it is 30/31 — worth correcting in the ledger.
- **Faction totals** (`run_summary.json → vs_historical`): RS delta **+24 → +8**, RBiH
  **−15 → +2**, HRHB **−9 → −10**. n391 is a markedly less RS-over-extended end state.

### Why `verify_checkpoints.cjs` exits rc=1 in both runs

Not a threshold assertion — no `--base` was supplied, so scores were non-gating in your
invocations. The breach comes from the Operation FARZ P-A discriminator
(`tools/verify_checkpoints.cjs:382`, which sets `breached = true`):

```
P-A discriminator — the 2nd-Corps signature cell, captured by 2nd Corps, in the window
  *** FAIL — needs an arbih_2nd_corps capture at t>=160 ***
```

Same cause in both runs, and **already carved out in canon**. `CALIBRATION_MASTER.md:108-110`:

> The generic checkpoint verifier still exits red only on the separately carved-out Farz
> discriminator; **that output is not a §6 breach.**

Note the sub-result *did* improve: n388 has `Spreča / north Ozren  RS  *** NOT TAKEN ***`;
n391 has it `RBiH ** TAKEN **`, so P1 is now 4/4. P-A still fails because the capture came from
`arbih_327th_vitezka_mountain (arbih_3rd_corps)` at t168, and the discriminator requires 2nd
Corps. That is a genuine open item, unchanged in character.

Enclave guard: 9/9 in both, Srebrenica and Žepa both `FALLS ON SCHEDULE`. Eastern capture
provenance CLEAN in both, and n391 is strictly cleaner (3 never-captured cells → 1).

---

## Q7 — Can PR #502 un-draft on this? **Yes — but not on the +21, and not for the reason stated.**

### One correction to your brief first

You described `02dfd7967` as three flag renames plus `zepa_fell`. Substantively accurate, but
its diffstat is **4099 lines** (`consequences.json` +3396/−703, `war_1995.json` 26/8), which is
overwhelmingly reformatting. I normalised and compared parsed JSON at `02dfd7967~1` vs
`02dfd7967`: `consequences.json` has **exactly one** semantically changed entry,
`csq_enclave_held_alt_intervention`, whose trigger flags go
`srebrenica_fallen/zepa_fallen/gorazde_fallen` → `srebrenica_fell/zepa_fell/gorazde_fell`.
Array order unchanged, 135 entries in and out.

**But `02dfd7967` is not inert.** `war_1995.json`'s `zepa_falls_1995` gains
`"sets_flags": { "zepa_fell": true }` — a new flag *write*. And the repaired read sits on a
`turn_min: 145` gate for an alt-history intervention branch, upstream of the oct1995
checkpoint. Before the fix all three `flag_not_set` conditions were trivially true (nothing
wrote those names); after it they are real reads. At t145 neither enclave has fallen either
way, so I expect no behavioural change — **but I have not measured that**, and "expect" is not
a merge criterion. If the panel wants that closed, it is the same control run as Q3.

### The ruling

Un-drafting PR #502 does **not** require the paired run, provided the PR's claims are corrected:

1. **Strike any claim that the barracks stagger produced +21, or any territorial gain.**
   The evidence does not support it and the geography actively contradicts it. Substitute the
   claim that *is* measured and *is* the point of the change: the four events now fire at
   w3/w4/w6/w7 instead of all four at w4, matching their historical dates.
2. **Cite n391 as a rebaseline observation of HEAD, never as an A/B result**, and state its
   `git_dirty:true` status inline. Do not let 665/712 enter `CALIBRATION_MASTER.md` as a new
   floor from this artifact — the S0 rule at `CALIBRATION_MASTER.md:319` forbids it.
3. Nothing in the tree breaches: 9/9 enclave cells, both falls on schedule, eastern provenance
   clean, all four checkpoints above floor, cascade +12, anchors 31/31, and the only red is the
   carved-out FARZ discriminator.

### What I would actually spend the 70 minutes on

Not on isolating the barracks change — you would be buying a number you don't need, for a change
whose correctness rests on historical dates rather than on match-%. Spend it on a **clean
`git_dirty:false` run at `dad680710`** through `npm run sim:scenario:run:188w`. That single run:

- replaces n391 with an admissible artifact for the same tree;
- gives the project a legal successor to the now-34-commits-stale n388 baseline, which
  `CALIBRATION_MASTER.md` still names as current authority from 2026-08-31;
- lets PR #502 cite something that survives `run_provenance`'s own comparator.

If that reproduces 702/678/672/665, everything above stands and the PR merges on it. If it does
not, the dirty-tree question stops being academic.

**One process note.** `docs/life_lessons/calibration.md` and `.claude/napkin.md:36` both record
this exact failure shape — a multi-commit gap read as a single-change result. Nothing here is
new engineering; it is the same lesson arriving through a new door. The novel part is the
baseline inversion in Q2, which is worth its own ledger line.

---

## MEASURED vs INFERRED

**MEASURED:** every hash, every commit SHA and ancestry relation, the 26/5/21 OSID
decomposition and its municipality breakdown, both verifier outputs and both exit codes (taken
unpiped), the barracks firing turns in both runs, the Teočak battle records, the anchor
counts (30/31 vs 31/31), the faction deltas, the semantic JSON diffs of all three event files,
the current `git status`, and every quoted line from `CALIBRATION_MASTER.md`,
`run_provenance.ts`, `run_scenario_with_preflight.ts` and `verify_checkpoints.cjs`.

**INFERRED:** that the western-Bosnia 15 belong to the cascade site rather than to a
190-turn barracks butterfly (strong — geography plus the verifier's own cascade block, but
not isolated); that `02dfd7967` is behaviourally neutral at t145 (weak — reasoned from the
timeline, not measured); that n391 went through the ungated `run_scenario.ts` (strong — the only
path consistent with `git_dirty:true` and no `AWWV_PROVENANCE_OVERRIDE` key); the ~70 min
per-run cost (from `PROJECT_LEDGER.md:29357`, not timed here).

**NOT DONE:** no scenario run launched, no file in the repo modified.

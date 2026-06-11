# EH-3 — State-Integrity (brigade lifecycle) scope + build plan

**Status:** SCOPED 2026-06-11 (Formation/lifecycle + Historian investigators, convergent). Fix (a) = build now (low-risk); fix (b) = separate Central-Bosnia calibration lane. Engine-health pivot.

## Root cause (Formation/lifecycle investigator)

Two parallel formation state machines:
- `lifecycle_status`: `active|forming|disbanded|merged|destroyed|withdrawn|displaced` (`src/state/game_state.ts:1021`)
- `stranded_status`: `none|holding|reconnected|collapsed` (`src/state/game_state.ts:981`), driven by `src/sim/combat/stranded_brigade_lifecycle.ts`

**The leak:** when `stranded_status` reaches `collapsed`, the brigade is set `status='inactive'`, `lifecycle_status='destroyed'`, `personnel=0` (`stranded_brigade_lifecycle.ts:252-253`), but `stranded_status='collapsed'` is **never cleared** — Phase 2 (`:173-177`) just `continue`s. The record lingers as a ghost with a zombie `stranded_status` field through t188 (~5 ghosts measured at 188w, incl. canonical `hrhb_travnik_brigade`, collapsed t13).

**Why the record must NOT be tombstoned (Architect's cascade risk, confirmed):** reconstitution (`brigade_reconstitution.ts:286-287`) REQUIRES `status='inactive' && lifecycle_status='destroyed'` present in `formations[]` — it IS the re-entry path. `delete formations[fid]` would permanently break reconstitution. Only JNA phantoms are deleted (they have no reconstitution path).

**Blast radius:** all combat/op-pool/sector/supply/home-distance consumers already guard `status !== 'active'` → SAFE. Exposed-but-harmless iterators: `final_sector_truth_reconciliation.ts`, `compile_turn_summary.ts` (adds to `already_destroyed` set — correct). No combat-math consumer reads `stranded_status` on inactive formations.

## Historian (OOB/lifecycle lens)

- **Travnik HVO** = "Frankopan" + "Travnika" brigades (BB2 p.440-441): *routed not annihilated* by ARBiH 3rd Corps, 10 June 1993; survived **displaced** at the Vitez enclave perimeter. Engine destroying `hrhb_travnik_brigade` at **t1** is historically wrong (timing) and tombstone-wrong (should be **displaced**, not destroyed).
- **General principle:** routed brigades = displaced + degraded, retain identity. Tombstone only for the rare "essentially destroyed" case (Eugen Kvaternik/Bugojno → 55th Home Defense Regt, BB2 p.450). Manpower never vanishes.
- **Stranded:** most brigades were strongly **territorial** (Vitez brigade = "locally raised, territorial-based draftees", BB2 p.437) → **repatriating a normal brigade to its home sector is historically correct.** Exceptions that may legitimately sit far from home: displaced brigades (home occupied) + elite mobile reserves (17th Krajina, Vitezovi, 1st Bijeljina Panthers).
- **§6 HARD FLAG (applies to fix (b), repatriation):** enclave-trapped units must be SUPPRESSED from repatriation/export — 28th Div (Srebrenica), 81st Div (Goražde), 5th Corps (Bihać); and Drina encirclers (Zvornik garrison-pin, Bratunac/Milići, 2nd Romanija near Goražde). Lifecycle changes for any brigade inside a protected-enclave OSID must be suppressed.

## Fix (a) — zombie-field cleanup [BUILD NOW, low-risk, §6-inert]

Zero calibration impact: formations are already `inactive`/`personnel=0`; clearing metadata changes no combat math. Does NOT touch `formations[]` membership (reconstitution preserved). §6-inert: does not change which brigades die or move.

1. `src/sim/combat/stranded_brigade_lifecycle.ts` Phase 2 (`:173-177`): when `f.stranded_status === 'collapsed' && f.status === 'inactive'`, clear `f.stranded_status` + `f.stranded_since_turn` (one-turn write, then Phase-3 `status!=='active'` guard skips it forever).
2. `src/sim/combat/brigade_reconstitution.ts` (reactivation Paths A/B/C, ~`:405-421`, `:453-470`): on reactivation clear `stranded_status`, `stranded_since_turn`, `last_reachable_turn` — fixes the genuine latent bug where a reconstituted brigade re-enters the stranded lifecycle with stale `stranded_since_turn` and can mis-collapse.

**Validation:** tsc + vitest + 188w. Expect territory/control_delta byte-identical (territory-flat re-bless: only the stranded_status fields on inactive ghost records move the full-save hash). Determinism + §6 anchors intact.

**BUILD STATUS (2026-06-11):** Fix(a) BUILT — branch `worktree-agent-a9b8f67f11bfd8140` / `eh3/fix-a`, commit `bc5c9f164`. Diff = 2 files, +18/−2: stranded_brigade_lifecycle.ts Phase 2 zombie-clear (guarded on `status==='inactive'`) + 2 reconstitution reactivation paths clear `stranded_status`/`stranded_since_turn`/`last_reachable_turn`. tsc PASS, 36 vitest tests PASS.

**★ 188w VALIDATION — NOT TERRITORY-FLAT (2026-06-11). The "calibration-inert" prediction was WRONG.** Baseline (main) reproduced the documented floor hash `f08f40522afff835`. Fix → hash `7ec656fe581d4486` AND **control_delta MOVED**: HRHB 111→90 (−21), RS 313→330 (+17), RBiH 288→292 (+4); total_flips 188→183. `formation_delta` byte-identical (formation arc unchanged) → the mover is **combat-participation**: clearing `stranded_status` on reconstitution lets reconstituted brigades survive/fight where they previously carried stale stranded metadata and were excluded/re-collapsed. So the reconstitution-clear is a **calibration LEVER, not a free fix.** DO NOT ship as a re-bless.

**★★ FLOOR IMPACT (raw, 2026-06-11): FULL FIX = −39 REGRESSION (NO-GO as built).** `osid_pair_match.matched_osids`: BASE **658** (floor reproduced) → FULL FIX **619**. Per-faction correctly_placed: HRHB **98→77** (−21), RBiH 268→261 (−7), RS 292→281 (−11). New FIX mismatches cluster in western Krajina HRHB pockets flipping to RS: Jajce (barevo/bravnice/jajce_3/jezero already mismatched in base; base had Jajce HRHB→RS too), **Bosansko Grahovo** (bosansko_grahovo_2/crni_lug/malesevci/ugarci HRHB→RS, NEW), **Glamoč** (halapic/pribelja/stekerovci_2 HRHB→RS, NEW). 30/30 anchors PASS + all §6 (Srebrenica RS / Žepa RS / Goražde RBiH / Bihać RBiH / Teočak RBiH) INTACT in both runs — the regression is NON-anchor western-Krajina HRHB territory. **★★★ ATTRIBUTION (raw, 3-way, 2026-06-11): the −39 mover is the DEAD-GHOST cleanup, NOT the reconstitution-clear. Hypothesis above REFUTED.**
- BASE: matched_osids **658**, HRHB cp 98, hash `f08f40522afff835`
- GHOST-ONLY (reconstitution reverted, only stranded_brigade_lifecycle.ts zombie-clear): matched_osids **619**, HRHB cp 77, hash `1616ef0b49acb5b5`
- FULL FIX (both edits): matched_osids **619**, HRHB cp 77, hash `7ec656fe581d4486`

Ghost-only == full-fix territory (both 619). The reconstitution-clear moves only the HASH (`1616ef0b`→`7ec656fe`), territory-INERT. **So clearing `stranded_status='collapsed'` on an already-dead (inactive/personnel=0) western brigade RESURRECTS it** — the only plausible path is a downstream consumer (almost certainly reconstitution) that reads `stranded_status==='collapsed'` as a permanent-exclusion marker; clearing the field re-admits the dead brigade, which reconstitutes and overruns Glamoč / Bosansko Grahovo (historically HV/HVO-held at oct1995 after Op Maestral). **The lingering zombie `stranded_status='collapsed'` is LOAD-BEARING — it is the de-facto permanent-death marker for collapsed-stranded brigades. "Cleaning it up" is a −39 regression. fix(a) = NO-GO (both halves).** Reframes EH-3: this is not a harmless bookkeeping leak (task #15) — the field has semantics. Real fix must preserve the permanent-death guarantee while removing the *misleading* state (e.g. introduce an explicit `lifecycle_status='destroyed'`-is-terminal check at the resurrection site, OR a separate tombstone flag, rather than clearing stranded_status). Dispatching code-trace (find the consumer that reads `collapsed`) + historian (Glamoč/Bos.Grahovo oct1995 disposition).

## ★★★★ VERDICT: fix(a) = NO-GO (2026-06-11) — the zombie field is LOAD-BEARING

**Historian (BB1-sourced, unambiguous):** Glamoč + Bosansko Grahovo taken by HV/HVO in Op Ljeto '95 (28–29 Jul 1995); Jajce retaken in Op Maestral (13 Sep 1995). ALL THREE are HRHB-correct at oct1995 — "zero nuance." The HRHB→RS flip is a GENUINE historical fidelity loss, not a calibration artifact. (BB1 pp.401–403, 413, 416, 417–418.)

**Code-trace:** at stranded-collapse the brigade deposits 30% personnel into `strategic_reserves[faction]`; ~5 turns later `reconstituteBrigades` **Path C** (`brigade_reconstitution.ts:369–438`) draws that reserve and respawns the brigade at the first sorted same-corps friendly OSID — landing in contested western Bosnia. Reconstitution itself never reads `stranded_status` (4 read sites total: lifecycle file + GameStateAdapter UI). NOTE: the trace's "clearing is inert" sub-claim is EMPIRICALLY FALSE (ghost-only measured 619 ≠ baseline 658) — the field demonstrably gates the resurrection by a path the grep did not fully pin. Treat the exact mechanism as not-fully-understood.

**Decision (data-driven):** matched_osids 658→619 (−39), historian-confirmed fidelity loss → **NO-GO. Abandon `eh3/fix-a` (commit bc5c9f164, never merged). Do NOT clear `stranded_status='collapsed'`.** The field is the de-facto permanent-death marker for collapsed-stranded brigades; removing it resurrects ahistorical RS formations that overrun Glamoč/Bos.Grahovo. The speculative tombstone refactor (option ii) is NOT attempted — the resurrection mechanism is not fully pinned, so any "clean refactor" risks re-regressing.

**Reframes EH-3 + task #15:** the `hrhb_travnik` `stranded_status='collapsed'` lingering field is NOT a harmless bookkeeping bug — it has load-bearing calibration semantics. Reclassify #15 as KNOWN-INTENTIONAL (do-not-clean), not a fix. The only historically-correct EH-3 lever left is **fix(b)** — prevent the t1 stranding at the source (sector-geometry: `op:novi_travnik:rat_2` absent from `hvo_central_bosnia` territory_osids) and model routed brigades as **displaced** (Frankopan/Travnika survived at Vitez), not destroyed-at-t1. That is a Central-Bosnia calibration lane (panel + §6 + historian), lower priority than D2-readiness. **EH-3 state-integrity via lifecycle-cleanup = CLOSED as a dead-end; the real lane is fix(b), gated/parked.** A genuine secondary engine-health smell remains documented: Path C can respawn collapsed-stranded brigades far from home into contested territory — but it is currently load-bearing for the 658 floor, so it is POST-1.0 only.

## Fix (b) — sector-geometry / displacement [SEPARATE CALIBRATION LANE]

Real root cause of `hrhb_travnik` stranding at t1: `op:novi_travnik:rat_2` (its `home_osid`) is absent from all 14 `hvo_central_bosnia` sector `territory_osids` → BFS in `canReachCorpsSectorFront` can't reach → enters `holding`. Fix surface = sector-partition pipeline (`corps_front_sectors.ts`, `corps_sector_partition.ts`). **Calibration-impactful (Central Bosnia HRHB over-capture ceiling zone) — requires full 188w + scenario-tester + historian + §6 panel.** Also the historically-correct model is `displaced` (Frankopan/Travnika survived at Vitez), not destroyed-at-t1 — a deeper OOB+lifecycle redesign. Post-(a), owner/panel-gated.

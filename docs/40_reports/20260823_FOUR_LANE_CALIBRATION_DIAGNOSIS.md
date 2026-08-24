# Four-Lane Calibration Diagnosis — 2026-08-23

**Type:** Read-only diagnosis. No repo file was modified, no scenario was run, no baseline or pin was regenerated.

> ## ✅ CAVEAT RESOLVED 2026-08-23 23:18 — clean run reproduces the floor, lane assignments VALID
>
> A clean 188w was run at HEAD in a dedicated worktree (`F:\awwv-clean-188w`, detached
> `72062041c`, fresh `npm ci`, `git_dirty: false`). Result per the §8 rule: **R1**.
>
> | gate | result |
> |---|---|
> | `final_state_hash` | **`cc88344e922ac8b4`** — matches n273 |
> | matched / anchors | **637/712**, **31/31** (independently recomputed from raw state) |
> | `git_dirty` / digest | `false` / `be30f7c7…` matches n273 |
> | comparator positive control | passed — mutating a matched cell moved the count by exactly 1 |
> | engine-health gate | **pass**, all 6 hard checks + soft (K:W 3.702) |
> | combat validity | true — 764 attack orders, 556 battles, 0 invalid ops, 0 recovery-without-attempt |
>
> **It is not merely a hash match — it is n273 bit for bit.** All 15 artifacts byte-compare identical
> except `run_meta.json` (`git_commit`, `out_dir`). Full untruncated sha256 of `final_save.json` on
> both trees: `cc88344e922ac8b42b1f5ebc85029bdb04a6cd9f824adad192f32fc67698de5e`, so the 16-char
> truncation's collision risk is retired outright. **Free determinism result: everything merged
> between `99bc0cf62` (n273) and `72062041c` (HEAD) is provably simulation-inert.**
>
> **All four lanes' assigned mismatch sets are IDENTICAL between the clean and dirty artifacts**
> (A 6/6, B 6/6, C 7/7, D 6/6). Every per-OSID diagnosis below stands.
>
> **Non-injectivity demonstrated, not merely cited.** The two runs both score exactly 637 with exactly
> 75 mismatches **over different maps** — clean-only `op:brcko:skakava_donja`, `op:gradacac:pelagicevo`;
> dirty-only `op:bihac:trubar`, `op:mrkonjic_grad:bjelajce_2`. Two gains, two losses, netting to an
> identical score. Second recorded instance in this project (first: n220 vs the blessed tree at 629).
> Scenario-tester ruling: structurally **noise** — all four sit in the autumn-1995 terminal cascade
> (55 OSIDs flip at t≥170; **51 of 55 match painted**, the best-performing region of the run) — **but
> the two Posavina cells inside it are a real ahistorical-gain signal**, joined by `op:brcko:brka_2`.
> The VRS never lost the Posavina corridor historically. Do not conflate the churn with that signal.
>
> **Cite the 637 floor to this clean run, not to n273** — same evidence, better paperwork.
>
> ---
>
> ### Superseded caveat, retained as history
>
> The 188-week artifact originally used by all four lanes was **not verdict-grade**. From its own
> `run_meta.json`:
>
> | field | value |
> |---|---|
> | `final_state_hash` | **`930195c6879502c7`** — appears in **neither** `PROJECT_LEDGER.md` nor `CALIBRATION_MASTER.md` |
> | recorded n273 637 floor | **`cc88344e922ac8b4`** |
> | `git_dirty` | **`true`** |
> | `git_commit` | `8bdfec909c483d7075f52a14f23dad8c133219bc` |
> | `consumed_inputs.digest` | `be30f7c708f3e27a0df84507bc0566219f88fa5a5772ca961b3cce486625752b` — **identical to n273** |
> | matched / anchors | 637 / 712, 31/31 |
>
> Same inputs, same score, same anchor result, **different map**. The divergence is engine-side
> (uncommitted work in the `engine-truth-checkpoint` tree), not data-side.
>
> This repo has already been bitten by exactly this: the ledger records that "**n220 and the blessed
> tree both score 629 with different final-state hashes** — the same number over a different map, at a
> pair nobody had compared." `matched_osids` is a scalar over a 712-dimensional object and is
> **documented non-injective** here. 637 is not an identity.
>
> **What this does and does not invalidate:**
>
> - **UNAFFECTED — §1.1-§1.4, §2, §3, §4.** Every engine defect, the adjacency rule, the reference-data
>   defects, and every refutation were established by **source-read and static data at HEAD**, not from
>   this save. They stand independently.
> - **CONDITIONAL — the 75-mismatch list, its clustering, the ghost islands, the per-lane OSID
>   assignments, and every AAR-derived operation trace.** These come from this artifact. At an
>   identical score the mismatch *set* may differ, which would change which OSIDs each lane was
>   assigned in the first place.
>
> **Required before any delta is banked:** reproduce the mismatch set from a clean
> (`git_dirty: false`) run at a recorded commit and diff it against the 75 listed here. Until then,
> treat per-OSID targets as leads, not as a measured baseline.
>
> Credit: Lane B asked for the hash rather than assuming parity from the score.

**Evidence base:** the 188-week baseline regenerated 2026-08-23 in the `codex/engine-truth-checkpoint`
worktree (`_baseline_tmp/apr1992_188w/`) — see the caveat above.
Cross-checked against `data/source/calibration/painted_control_{jan1993,apr1994,apr1995,oct1995}.json`,
`operational_contact_graph.json`, `oob_brigades.json`, and `apr_1992_initial_save.json`, all read at HEAD.

**Method:** four parallel read-only lanes with exclusive municipality ownership, each required to
carry positive controls and to state candidate-set sizes. Every claim reproduced below was
re-verified independently by the orchestrator against source; claims that failed re-verification
are recorded as refuted rather than removed.

---

## 0. What the 637 is

712 OSIDs compared against painted oct1995; **75 mismatches**; 712 − 75 = 637. The gap is a
concrete, clustered list, not a diffuse error. Largest clusters: Jajce 8, Goražde 6, Ključ 5,
Kladanj 4, Trnovo 4, Čajniče 3, Konjic 3, then eleven pairs and twenty-four singletons.

---

## 1. Engine defects found (independent of calibration percentage)

These are the round's substantive output. None is a scoring question.

### 1.1 Combat prediction is terrain-blind at both decision gates — VERIFIED

| call site | terrain arg | result |
|---|---|---|
| `war_phases.ts:1834` (preparation) | `terrainData` passed | populated |
| `war_phases.ts:1858` (**launch gate**) | omitted | `{}` |
| `bot_brigade_ai_osid.ts:709` (**brigade orders**) | omitted | `{}` |
| `desktop_sim.ts:722/802` | `terrain` passed | populated |

`buildTerrainMultByOsid` (`combat_math.ts:1840`) returns `{}` on `if (!terrainData?.by_sid)`;
consumers read `terrainMultByOsid[osid] ?? 1.0`. So operation-launch decisions and brigade attack
orders both evaluate on a flat 1.0 terrain multiplier, while the preparation path one line earlier
is terrain-aware. The `65f7228ca` comment "must match `generateAllBotOrdersOsid` exactly" is
satisfied — both are equally blind.

### 1.2 Mandatory-spawn accrual cannot reach its own spawn threshold — VERIFIED

- `recruitment_turn.ts:280-282`: accrual tops a militia pool up to `MIN_MANDATORY_SPAWN = 100` and stops.
- `recruitment_engine.ts:859`: `required = b.initial_personnel ?? b.manpower_cost ?? 500`.
- `recruitment_engine.ts:472`: `if (!pool || pool.available < requiredPersonnel) return false;`

**Any mandatory brigade with `initial_personnel > 100` and a thin home pool is unreachable by the
accrual mechanism by construction.** It fills to 100, refuses the 101st man, and the gate needs
500. Only `ongoing_mobilization.ts` can close the gap, which is why `rs_trnovo_brigade` (required
500, pool `trnovo:RS.available` 39 at init) first appears at **t140** instead of its
`available_from: 6`.

Affects four RS brigades today (`rs_ilijas` af=3, `rs_ilidza` af=4, `rs_igman` af=5,
`rs_trnovo` af=6 — the only mandatory rows with `available_from > 0`), and is a silent trap for any
future one. `rs_igman_brigade` shows the same late-spawn/never-fought signature
(`PROJECT_LEDGER.md:26966`).

### 1.3 Dangling staging OSID — VERIFIED

`pre_planned_operations.ts:810` stages Operation Bosanski Novi on
`op:bosanski_novi:bosanski_novi_2`, **which does not exist in the 712-OSID universe**. The eight
real OSIDs are `blagaj_japra, dobrljin_2, krslje_2, matavazi_2, novi_grad_3, poljavnice, suhaca_4,
svodna_2`; the intended town is almost certainly `novi_grad_3`. The operation never ran.

### 1.4 Staging == the axis's own first objective — 4 of 39 axes

| Op / axis | staging (= `objectives[0]`) | result |
|---|---|---|
| Prijedor / `sanski_most` | `stari_majdan` | captured t1 — self-healed |
| Prijedor / `kljuc` | `kljuc_2` | never captured |
| Kotor Varoš / `kotor_varos_siege` | `kotor_varos_2` | op never ran |
| Cerska-Kamenica / `kamenica` | `osmace_2` | never captured |

The axis is told to assemble on the OSID it is about to attack. 3 of 4 failed. `buildAxesFromDef`
strips objectives the attacker already controls, so this condition can only exist while the staging
OSID is enemy-held — i.e. exactly when staging is impossible.

**Proposed lint** (assertions 1-2 are static, hash-neutral, no run required):
1. `staging_osid` exists in the OSID universe (catches 1.3).
2. `staging_osid ∉ axis.objectives` (catches all four above).
3. `staging_osid` is held by the op's faction at its trigger turn.

**Coverage caveat:** swept 39 axes across the two pre-planned/triggered catalogs. The three
opportunity catalogs hold **52 further `staging_osid` occurrences** not swept. True surface is 91.

### 1.5 Two corps get one scripted attempt and no second chance

Opportunity catalogs hold 15 entries: 10 RBiH, 5 HRHB, **zero RS**. Probes are not faction-gated,
but their distribution is lopsided: `vrs_1st_krajina` 131 probe-turns, `vrs_sarajevo_romanija` 7,
**`vrs_herzegovina` 0, `vrs_drina` 0**. Every operation touching the upper-Drina belt is
pre-planned or triggered, fires once, and on failure enters recovery with no successor.

Sharpened by the 2×2: Herzegovina Corps runs a **single-brigade** axis to 4 attacks at t0
(`visegrad_seizure`), then fails three single-brigade axes at t8 and t49. So neither "single-brigade
axes fail" nor "these corps are broken" holds. **Something changes for `vrs_herzegovina` at or just
before t8 and persists to t49.** Untraced. Suggestive but unbanked coincidence: JNA phantom
withdrawals at t5/t6/t8 remove ~45 tanks and ~35 artillery pieces from that corps' area.

### 1.6 Ghost islands — engine 6 RBiH components, history 4

Under engine-valid adjacency (see §2): engine t188 has 6 RBiH components (245/45/5/2/1/1),
painted oct1995 has 4 (219/53/12/5). Three engine-only islands:

- `{op:bratunac:pobudje_2, op:vlasenica:cerska_2}` — 2-OSID island in RS Birač, all 11 external neighbours RS, unattacked since w47.
- `{op:srebrenica:osmace_2}` — all six neighbours RS, holding at Dayton, southeast of a Srebrenica that fell at t162.
- `{op:cajnice:todorovici}` — its only same-faction link was an engine-rejected edge; all three valid edges lead to RS ground.

---

## 2. Adjacency: the correct rule

`computeFrontEdgesOsid` (`front_edges.ts:122-124`) drops edges where `min_dist > FRONT_EDGE_MAX_GAP
(0.0003)` **and** where `shared_segments === 0`. **2047 raw edges → 1998 engine-valid.**

Consequences established this round:
- A chain built on raw contact-graph edges can be silently unbuildable (e.g. `miljeno_2 ↔ todorovici`, min_dist 0.0114, seg 0).
- None of the 49 rejected edges is a graph cut in the **unfiltered** graph, **but** component structure on a **faction-filtered** subgraph does change — `todorovici` splits out because its sole same-faction link was rejected. "Not a cut" and "component-preserving" are different claims.
- `computeFrontEdgesOsid` additionally suppresses RBiH↔HRHB front edges before `rbih_hrhb_war_earliest_turn` or while allied. Costs no matched OSIDs but is required for any argument about *when* a Vareš OSID could flip.

### 2.1 The filter's effect on components must be recomputed PER MAP — and stranding is a post-run check

Measured across all three maps:

| map | RBiH raw → valid | RS raw → valid | HRHB raw → valid |
|---|---|---|---|
| init (turn 0) | 29 → 29 | **22 → 24** | **18 → 19** |
| painted oct1995 | 4 → 4 | 1 → 1 | 5 → 5 |
| engine t188 | **5 → 6** | — | — |

Painted is the one map where the filter is a component no-op — so generalising from it is unsound.
At init the filter splits off `{op:bugojno:brizina, op:bugojno:prijaci}` and
`{op:visoko:gornja_vratnica_2}` as RS pockets and breaks a 16-OSID HRHB component into 11 + 5.
(Relevant if `jan1993_start` / `apr1993_start` / `apr1994_start` are ever scored the same way;
`op:ilijas:podlugovi` — the SRK Ilijaš brigade's home OSID — sits on one of the severed pairs.)

**"Not a graph cut" ≠ "component-preserving."** The first is a property of the unfiltered graph; the
second is computed on a faction-filtered subgraph. An edge can be redundant in the first while being
the sole same-faction link in the second, because every detour runs through enemy ground.

**The stranding mechanism, and why it is a POST-run check.** `op:cajnice:todorovici` has a valid
same-faction edge at turn 0 (`op:rudo:gornja_strmica`, seg 9, RBiH at init). That neighbour flips RS
during the war. By t188 every *valid* neighbour is enemy-held and the only link to friendly ground is
the rejected `miljeno_2` edge — so the OSID is severed. This is time- and controller-dependent:
invisible from the graph, from init, and from painted; visible only on the map being scored.

⇒ **Any change that flips a neighbour of a thin holdout can strand that holdout as a side effect
that no pre-run adjacency check would reveal.** Component structure must be re-checked *after* each
run, not only before it. This applies directly to proposal E (Cerska/Pobuđe) and the Kalesija
proposal, both of which flip neighbours of thin holdouts.

---

## 3. Calibration-reference defects (the target, not the engine)

Three oct1995 cells appear to be wrong, all with the engine already holding the correct value:

| OSID | painted | demographics | corroboration |
|---|---|---|---|
| `op:kladanj:kladanj_3` | RS | 4784 B / 937 S; contains **Kladanj town** | BB2 printed 475 "the Muslim-held town of Kladanj"; repo OOB homes `arbih_243rd_muslimpodrinje_mountain` here |
| `op:kladanj:staric_2` | RS | 1244 B / 248 S, no Serb-majority settlement | ARBiH forward belt east of Kladanj; OOB homes `arbih_244th_mountain` here |
| `op:olovo:gurdici_2` | RS | 1525 B / 333 S | Olovo never fell; OOB homes `arbih_161st_slavna_olovo_mountain` here. Straddler — far-south tip is beyond the line |

Detection method with a positive control: sweep all 246 brigades for a `home_osid` painted to a
different faction → 42 hits, almost all legitimate (Srebrenica/Žepa July 1995, Drvar/Glamoč Aug-Sep
1995, etc). The pathological signature — *RS since jan1993 AND still RS at oct1995 AND hosts a
turn-0-to-8 mandatory ARBiH brigade* — has exactly five members, one of which is the already-known
`op:gorazde:kolovarice` merge defect. The test caught the known defect unprompted.

**Precedent:** commit `e3a28e25f` (2026-08-12, owner-directed) is the same operation in reverse —
a single-cell oct1995 repaint justified from BB, whose message states the resulting score change
"IS NOT A REGRESSION". Note that correction *penalised* the engine; these three *flatter* it, which
warrants more scrutiny, not less.

**Data hygiene, verified:** `oct1995` `meta.counts` is off by one (says RS 315, actual 316 — stale
since `e3a28e25f`); `jan1993` `meta.counts` is a whole vintage stale (says 407/251/86 summing to
744; actual 385/247/80 over 712 rows). `apr1994`/`apr1995` metas are correct. **Read counts from
`by_settlement_id`, never from `meta`.**

**Open:** `e3a28e25f` states the repaint moved 639 → 638. The current floor is **637**. The
remaining −1 is unreconciled and every delta is being banked against 637.

---

## 4. Refuted claims (recorded so they are not re-derived)

| Claim | Status | Killed by |
|---|---|---|
| RS mandatory mobilization is 81-way alphabetically contended | **REFUTED** — 77 of 81 have `available_from: 0` and never queue; only 4 contend. `rs_visegrad_brigade` ranks 80/81, worse than Trnovo's 79, and is present at t0 | measurement |
| The alphabetical sort delays `rs_trnovo_brigade` | **REFUTED** — `applyRsMandatoryMobilizationAccrual` only tops up pools; it has no spawn authority. Real gate is `canFormEmergentBrigade` (§1.2) | source-read |
| "RS in all four painted snapshots" corroborates a value three times | **REFUTED** — 561/712 (78.8%) are identical across all four; transitions 45/21/88. They are one base painting with three edit passes. An undetected error presents this way *by construction* | measurement |
| "post-strip broken chain" is a new engine bug family | **REFUTED** — 6 of 30 observable axes have the property; **5 of 6 capture every objective**. Only 1 of 6 zero-attack axes has it. Neither necessary nor sufficient | 30-axis sweep |
| Single-brigade axes fail / `vrs_herzegovina` + `vrs_drina` are broken | **REFUTED** — 4 single-brigade successes across 3 corps; Herzegovina works at t0 | 2×2 |
| Trnovo east axis is structurally broken (non-adjacent objectives) | **REFUTED** — prior panel read *painted* control as *live*; `kijevo_2` is RBiH in-engine, never strips, and is adjacent to staging | run artifact |
| Trnovo town-axis brigade drift causes the failure | **REFUTED** — brigade is at correct staging for 14 of the op's 19 turns and still never attacks | temporal log |
| `launch_blocker_detail` is broken/empty | **REFUTED** — env-gated (`AWWV_DEBUG_REASON_CODES`, topic `axis_reject`), off by default *because it persists into the save and would break the determinism proof* | source-read |
| Srebrenica fall event displaces Osmače's population | **REFUTED** — `applyEnclaveFormationDisplacement` is behind `AWWV_ENCLAVE_COLUMN_DISPLACEMENT`, set in no config/script/CI. Effect is inert; the `control_change` omission is the live path | source-read |

**Replacement heuristic that survived:** a flip appearing only at oct1995 **with no adjacent OSID
flipping alongside it** is suspect; a flip shared with a neighbour is the footprint of a real
operation. Demonstrated on `toljenak`/`krivajevici`.

---

## 5. Proposed changes, unbundled

Per the one-change-per-calibration-run rule. **188w only — 40w/43w are false greens for these classes.**

| # | Change | File | Expected | Risk |
|---|---|---|---|---|
| A | Repaint 3 oct1995 cells + fix `meta.counts` | `painted_control_oct1995.json` | +3, **no run** | LOW mechanically, **HIGH governance** — moves the floor's definition |
| B | Append `djulici` to Op Drina `zvornik_sweep` objectives | `pre_planned_operations.ts` | +1 | LOW — axis took 4/4 from same staging |
| C | Repoint Op Foča `foca_valley` objectives → `['op:foca:brusna_2']` | `pre_planned_operations.ts:582-586` | +1 | LOW — zero force cost; also drops an unreachable Goražde cascade vector |
| D | Append `'vares'` to `Siege Break.target_municipalities` | `bot_strategy.ts:543` | +1 † | MED — approach believed already in engine hands across a seg-13 edge |
| E | Add `pobudje_2` + a third brigade to `cerska_pocket` | `triggered_operations.ts` | +2, unlocks a dead event | MED — also starts firing `vrs_cerska_offensive_1993`; attribute separately |
| F | Add southern axis to Op Trnovo (TG Kalinovik) | `pre_planned_operations.ts` | — | MED — engine fields 2,700 vs ~10,000 historical (BB2 printed 391) |
| G | Re-home `rs_1st_romanija_infantry` trnovo → han_pijesak | `oob_brigades.json` | — | MED — **cross-lane**: moves 1,200 men of demand onto `hanpijesak:RS` |
| H | Re-home `rs_2nd_romanija_brigade` → `vucinici_2` | `oob_brigades.json:3047` | +1 † | MED — may trade against `olovci_2`, believed currently correct in-engine |

**† Engine-controller dependency — not yet demonstrated.** Every `+N` in this table is conditional on
the mismatch set (see the caveat at the top), but **D and H additionally assert engine-controller
facts as though established**, and those came from the `930195c6879502c7` artifact. Their *mechanisms*
are source-read at HEAD and survive; their *demonstrations* do not. Until R1 lands, D is **predicted,
not demonstrated**.

Four cells restore them, no re-derivation needed:

| proposal | required on the clean run | if it fails |
|---|---|---|
| D | `op:ilijas:krivajevici == RBiH` (approach in engine hands) **and** `op:vares:toljenak == RS` (genuinely a miss) | if `toljenak` is already RBiH on a clean engine, D's gain is **zero** — drop it, do not re-argue |
| H | `op:kladanj:vucinici_2 == RBiH` (genuinely over-taken) **and** `op:kladanj:olovci_2 == RBiH` (the thing H risks trading) | re-rank H |

**Proposal A is the only row with no engine-side dependency whatsoever** — its +3 rests entirely on
census demographics, BB, the repo's own OOB, and the painted files, and holds whatever R1 returns.
Credit: Lane B audited its own centerpiece into the weaker bucket rather than let it stand.

### Blocked on §6 panel
`op:srebrenica:osmace_2`. Both candidate edits move the OSID toward the enclave guard's stated
outcome (an ARBiH holdout falls; Srebrenica already falls at t162). The question is **which year,
and is it enclave-member**:
- **(a)** add to `srebrenica_falls_1995.control_change.osids` → asserts July 1995 + enclave member. Aligns with H1.8 event-ownership. But `apr1994` painted is already RS, so it dates the loss ~2 years late.
- **(b)** change axis `kamenica` `staging_osid` → `op:bratunac:zapolje_2` → asserts March 1993, ordinary combat. Matches all four snapshots; also fixes a §1.4 class member. `osmace_2` is currently the one OSID *excluded* from `ENCLAVE_DEFINITIONS`, on a comment (`enclave_resilience.ts:124`) the jan1993 snapshot **falsifies**.

Routing note for the panel: `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 line 207 specifies
gameplay-programmer + historian for "change to enclave mechanics", not the four-seat panel (which is
specified for new ruptures, condemnation flags, paramilitary surfaces, and reward-for-atrocity
effects). Whether this is a two-role or full-panel matter is the panel's to rule.

### Recorded as do-not-use
`jna_foca_paramilitaries` — free in force-economy terms and the most historically accurate agent for
the Foča belt, which is exactly why it must not be picked up as a cheap win. Foča is ICTY
*Kunarac*/*Krnojelac* ground; converting a named ethnic-cleansing formation into a territory-gaining
attack asset is a §6 question, not an implementer's call.

---

## 6. Next instrument: one env-gated run answers three open questions

`AWWV_DEBUG_REASON_CODES` with topics `axis_reject` and `formation_refusal`, plus the
`axis_readiness_debug` probe **extended with defender ids and defender power** (without which a
defender-side change is indistinguishable from a predictor-side one).

Capture set — 8 axes, 3 corps, 2 eras, one pass:

| window | axes | role |
|---|---|---|
| t0–t8 | Višegrad / `visegrad_seizure` | positive control — works, same corps |
| **t8–t15** | Foča / `foca_valley` + `kalinovik` | **paired, must-have** — same op, same turn, one fails one works |
| t49–t56 | Consolidation / `mostar_heights` + `konjic_south` | persistence check |
| t0–t6 / t8–t20 / t40–t50 | Prijedor `sanski_most`, Corridor `corridor_south`, Cerska `kamenica` | cross-corps single-brigade controls |
| t141–t160 | Trnovo / `trnovo_east` + `trnovo_town` | the regression |

A separate **~10-week** run with `formation_refusal` answers §1.2 directly — no 188w needed, since
the claim concerns t6–t10.

Decision rules were fixed in writing before any run and are held in the lane transcripts:
four outcomes for the axis-launch regression, four for the formation refusal, each mapping to
exactly one verdict.

**Top candidate for the `trnovo_town` regression** (executable at n206 on 2026-08-12, not executable
today): `65f7228ca` at `sector_offensive_launch_helpers.ts:721-746`, which pointed the launch gate
at the real combat model — newly live `ethnicComposition`, supply, population and officer inputs, all
defender-favouring, arriving at once. `9dcb751ed` eliminated (dead code — `6af5f48f1` deleted the
function body nine minutes later). `6af5f48f1` refuted (both live front edges present).
`50611e2ec` wrong direction (widens the adjacency set). If confirmed, the correct description is
*a gate that was too permissive became accurate* — not a regression.

---

## 7. Open lanes worth opening, none of them calibration

1. Terrain-blind combat prediction (§1.1).
2. Accrual/spawn threshold mismatch (§1.2) + the staging lint (§1.4).
3. ARBiH brigades that cannot be permanently destroyed — all six Lane A mismatches are held at
   Dayton by full-strength brigades at a uniform 1500-1800/cohesion ~62 floor, including units named
   for Cerska and Kamenica (destroyed March 1993). Two sit on an encircled 2-OSID pocket flagged
   supplied and part of the 2nd Corps front line. Same signature as the known RS
   brigade-destruction asymmetry.
4. `vrs_herzegovina`'s t8 cliff (§1.5).
5. The 639 → 638 → 637 lineage (§3).
6. Six of 24 catalog operations never ran at all: Zvezda 94, Jajce, Kotor Varoš, Bosanski Novi,
   Krivaja-95, Stupčanica-95. The last two are arguably by design (fall receipts are event-owned and
   `srebrenica_falls_1995` did fire); the other four are not obviously intentional.

---

## 8. Clean-baseline reproduction — decision rule fixed BEFORE the run

Launched 2026-08-23 ~23:10 in a dedicated clean worktree `F:\awwv-clean-188w`, detached at
**`72062041c5955a2ceda63571da66c3102ecb9060`** (HEAD), fresh `npm ci`, no other agent in the tree.
Command: `npm run sim:scenario:run:188w`.

Purpose: the round's per-OSID findings rest on a `git_dirty: true` artifact whose hash
(`930195c6879502c7`) is in no record. This run establishes a verdict-grade baseline and, separately,
tests Lane B's prediction that HEAD should still reproduce n273 because the only sim-source commit
after n273 (`72062041c`, `casualty_ledger.ts`) is inert under headless Node.

**Pre-committed rule — no post-hoc reading:**

- **R1 — `final_state_hash == cc88344e922ac8b4` and matched == 637.**
  HEAD reproduces the recorded n273 floor. Lane B's inertness prediction CONFIRMED. The dirty
  artifact's divergence is attributable wholly to uncommitted engine work in the
  `engine-truth-checkpoint` tree. **Then and only then** diff this run's 75-mismatch set against the
  one in §0/§1.6; where they agree, the lane assignments are validated and deltas may be banked
  against this run.
- **R2 — matched == 637 but `final_state_hash != cc88344e922ac8b4`.**
  Third distinct 637-scoring map. Lane B's prediction REFUTED and `matched_osids` non-injectivity
  demonstrated a second time in this repo. Nothing may be banked until the divergence between HEAD
  and n273 is explained. The mismatch-set diff becomes the primary instrument, not a confirmation.
- **R3 — matched != 637.**
  The floor has moved at HEAD without a recorded cause. This supersedes every calibration item in
  §5 and becomes the round's top finding. Do not proceed to any lane change.
- **R4 — anchors != 31/31.**
  Anchor regression at HEAD. Overrides R1-R3 regardless of matched count; stop and report.

In all branches the run's own `run_meta.json` must record `git_dirty: false` and a
`consumed_inputs.digest` of `be30f7c708f3e27a0df84507bc0566219f88fa5a5772ca961b3cce486625752b`
(identical to n273). **A digest mismatch invalidates the comparison regardless of score** — it would
mean the two runs did not read the same data, and no hash or count conclusion could be drawn.

Positive control on the comparator itself: a deliberately mutated matched cell must move the
mismatch count by exactly 1. Without it, "the sets agree" is unfalsifiable.

## 8a. Findings from the clean run that change how proposals should be aimed

All three verified independently by the orchestrator, not taken on report.

### The engine-health gate's `dead_ops` does not mean "dead operations"

`tools/engine_health_gate.cjs:260` — `dead_ops: cc.invalid_operation_count || 0`. It counts
**invalid** operations, not **inert** ones. Measured on the clean run: the gate reports `dead_ops: 0`
while **13 of 42 operations recorded zero attacks** and **21 of 42 captured zero objectives**.

Compounding it: the gate's `zero_eligible_ops` is **operation-scoped** while the `zero_eligible_axis`
blocker is **axis-scoped**, so an operation whose every axis is blocked still scores 0. The AARs carry
seven `zero_eligible_axis` blockers against a gate reading 0.

⇒ **A green engine-health gate is not evidence that operations are running.** This is the same
vacuous-guard class the napkin documents, sitting inside the project's primary acceptance instrument.

### ~70% of the residual was never fought over

Triage of all 75 mismatches:

| | count |
|---|---|
| not an objective of any authored operation | **52 / 75** |
| never changed hands at any point in 188 turns | **53 / 75** |
| attacked by an operation and held anyway | 17 |
| targeted by an operation that made zero attacks | 6 |
| last flip at t≥170 | 4 |

⇒ **The residual is mostly "the engine never fought there", not "the engine lost the fight there."**
A lane proposing combat-math or force-ratio changes is aiming at the smaller half. Clusters with no
operation touching them at all: Jajce 8, Ključ 5, Kladanj 4, Čajniče 3, Prozor 2, Ugljevik 2, Novi
Travnik 2, Pale 2.

### Run provenance does not pin the scoring reference — governance blocker for Proposal A

`consumed_inputs.files` holds **27 entries and none is `painted_control_oct1995.json`** (verified).
Two runs can share both `consumed_inputs.digest` and `final_state_hash` and still score differently
if the reference moves.

⇒ **If Proposal A lands, every prior run's recorded score silently refers to a different reference
than every subsequent run's, with no provenance field recording the change.** Whoever executes A must
raise this first — it is the concrete content of that row's "HIGH governance" risk, and it is an
argument for adding the reference to `consumed_inputs` in the same change.

### The two conditional proposals are now resolved on clean data

- **D — CONFIRMED.** `op:ilijas:krivajevici` = RBiH (approach in engine hands) and `op:vares:toljenak`
  = RS, never flipped (genuinely a miss). The +1 is demonstrated, no longer predicted.
- **H — trade risk CONFIRMED REAL.** `op:kladanj:vucinici_2` = RBiH (genuinely over-taken; flipped
  RS→RBiH at t20) **and** `op:kladanj:olovci_2` = RBiH, i.e. currently correct. H would put a real
  correct cell at risk. Re-rank accordingly.

### Force-structure asymmetry, measured on a clean tree

`destroyed_brigades`: 29 rows — **RS 25, HRHB 4, RBiH 0.** Zero ARBiH brigades permanently destroyed
in 188 weeks. `hollow_ratio` RBiH 0.992 / HRHB 0.784 / RS 0.414; `mean_morale` RBiH 94.8 / RS 41.4;
combat-effective RBiH 125 of 126 active vs RS 24 of 58. ARBiH issued 388 of 764 attack orders (51%)
as the least-equipped faction, which the run's own anomaly output flags as an emergent
decision-making failure. This is the known RS brigade-destruction asymmetry, now measured clean, and
it plausibly underwrites the Posavina ahistorical gains.

## 9. Process note

Five confident claims were killed by measurement during this round, three of them the
orchestrator's own. Every lane refuted itself at least once in writing. The recurring failure shape
was consistent enough to name: **a derived signal read as a primary one** — a sort verified without
checking the size of the set it sorts; a snapshot's stability read as corroboration; a code comment
asserting adjacency or control taken over the graph and the live state. The repo's own Operation
Trnovo comment already warns about the last of these, and it caught two lanes anyway.

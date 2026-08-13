# RC Collapse Panel — Frozen Artifact (2026-08-13)

> **WHAT THIS DOCUMENT IS.** The four seat reports of the Pyrrhic panel convened on workstream **RC**
> (the pressure → exhaustion → COLLAPSE pipeline), captured verbatim at the moment the seats finished
> reporting. Seats: **RC-Canon-S6** (Canon Compliance / §6), **RC-WarOrGame** (realism),
> **RC-Historian**, **RC-Systems** (engine/systems).
>
> **IT IS FROZEN, AND IT WAS NOT AMENDED AFTER THE SEATS REPORTED.** That is the point of it. The freeze
> is what let a single named reconciler adjudicate genuine disagreement instead of four reports being
> merged informally into a false consensus — the standing failure mode of parallel Pyrrhic panels in this
> project. The closing section, "TENSIONS THE RECONCILER MUST RESOLVE", lists five contradictions left
> **deliberately unsmoothed**.
>
> **THE PANEL RAN READ-ONLY. NO SCENARIO WAS FIRED** — no 188w, no 40w. Every seat was forbidden from
> running scenarios; the serial calibration lane is owned elsewhere. All figures here are derived from
> existing run artifacts, source reads, and reconstruction.
>
> **THIS DOCUMENT IS SUPERSEDED IN PART, AND KNOWINGLY SO.** After the freeze, the reconciler put narrow
> questions back to two seats. **RC-WarOrGame retracted two claims** — its RBiH Tier-0 trip-point failure
> mode, and its own recommended contiguity tripwire. Both retractions, and everything that replaced them,
> live in the companion document. **Do not quote this artifact without checking it:**
> [`20260813_RC_COLLAPSE_PANEL_RECONCILER_SYNTHESIS.md`](20260813_RC_COLLAPSE_PANEL_RECONCILER_SYNTHESIS.md).
>
> The artifact is preserved as **evidence of what each seat independently found**, not as current truth.
> Where it and the synthesis disagree, the synthesis governs.
>
> Related lane evidence: `20260610_COLLAPSE_PHASE4{A,B,D,E}_FIRST_FIRE.md`; roadmap row **RC** in
> `docs/plans/MASTER_ROADMAP.md`.

---

**Status: FROZEN. Four seats reported. No seat may amend this; the reconciler works from this text.**

Question put to the panel: the RC collapse pipeline is built through Phase IV-e, merged, gated OFF behind
`ENABLE_COLLAPSE`. The roadmap says the open decision is **eligibility breadth**. Four seats were dispatched
read-only, forbidden from running scenarios (the 188w is serial and owned elsewhere).

Baseline facts, orchestrator-verified independently of all seats:
- OSID universe = **712** (`operational_contact_graph.json` nodes).
- t188 control in `runs/apr1992_definitive_188w__9e902ad68783fbe7__w188_n220`: **RS 317 / RBiH 293 / HRHB 102**.
- `op:stolac:hatelji_2` = **RS at t0 and t188** in that run.
- `FATIGUE_MAX = 30` (`formation_constants.ts:85`), all writers `Math.min`-clamped.
- `op:gorazde:novakovici` and `op:gorazde:zorlaci` are **absent** from the 712 universe.

---

## SEAT 1 — RC-Canon-S6 (Canon Compliance / §6)

**VERDICT: COMPLIANT.** Breadth question may proceed to a measurement packet, under 9 blocking criteria.
Not a bright-line crossing; the eight-seat panel is not triggered.

### Load-bearing findings
1. **Citation defect:** `FORAWWV.md` has **no §6** (headings are roman numerals; relevant content at §IX.6,
   H1.8/H1.9/H2.1/H2.4). The operative "§6" is `SENSITIVE_HISTORY_DESIGN_GATE.md`. CLAUDE.md's instruction to
   read "FORAWWV §6" points at nothing.
2. **The field guard IS structural.** Two writers of `collapse_damage.by_entity` repo-wide: production
   (`phase3d_collapse_resolution.ts:186`, guarded at `:166` via `isPhase3DEnclaveGuarded` returning a detached
   zero object) and a CLI harness (`phase3abc_audit_harness.ts:1193`, unguarded — defect D1). `capacity_modifiers`
   and `will_not_recover` are guarded/derived. Predicate is a **pure static OSID-space** test — no runtime state,
   no turn gate — so widening breadth cannot breach it.
3. **The outcome invariant is CONTINGENT.** G2 as canon states it is about *fates*, not fields. Fates depend on
   surroundings; surroundings are unguarded. Three compounding facts:
   - The combat consumer **went live after the clearance** — `attack_resolution_osid.ts:867`,
     `defenderPower *= getCollapseDefenderMultiplier(...)`, floor 0.6, via PR #398 / `03eb82c4e`. The IV-b review
     and the guard's own header (`:153-159`) both said "if ever wired into defender-strength, this must be
     revisited." Condition met; comment never updated.
   - Guard is **own-OSID-only**. Enclave rim outside the osid_list is fully eligible → envelopment.
   - The implemented test asserts only **four capitals**; gate packet G2.6/G2.7 require the full footprint.
4. **The empirical §6 proof is ABSENT.** Zero `collapse_enabled.json` markers across all 102 188w run dirs, so
   G2-A/G2-B `skipIf` out. The only ON PASS on record (`20260610_COLLAPSE_PHASE4E_FIRST_FIRE.md`) was at
   **matched 649 / 30 anchors** on a run pair deleted afterward. Expired.
5. **H1.8: not a breach as scoped.** Phase 3D never writes `political_controllers`; collapse cannot flip control.
   Ring-3 #10 sanctions holding never-fell enclaves "through ordinary military means."
   **Bright line, stated:** any breadth change relaxing the guard for the six §6 enclaves **does not merge** —
   degrading Srebrenica's own defender could land the fall before the turn-160 rupture floor and erase the
   genocide from the verdict. That would need the eight-seat panel.
6. **Velika Kladuša carve-out:** inside the Bihać prefix set but Abdić/APZB territory, no §6 fate. Relaxing there
   is an ordinary panel call. Flagged because a lane reading "never touch the guard" will either over-block or
   quietly widen the whole predicate to reach it.

### G2.6/G2.7 TRAP (correction to the seat's own criterion)
As literally worded ("**every** Goražde OSID remains RBiH at war's end") these **already FAIL at HEAD**, before any
collapse change: 21 of 84 guarded OSIDs are not held by their enclave's faction (Srebrenica 11 + Žepa 1 correctly
fell; Goražde `glamoc`/`kamen`/`sopotnica`; Bihać `orasac_2`/`trubar`; Sarajevo `radava`/`recica`/`lukavica`/`faletici`).
**Criterion 4 must be ON-vs-OFF byte-identity, NEVER absolute RBiH-held.** An implementer coding it literally gets a
red test day one and the likely "fix" is reverting to the four capitals — the exact hole this closes.

### SET A — full `getEnclaveDefForOsid` key space: **84 of 712**
bihac_pocket 30 · srebrenica 11 · zepa 1 · teocak 1 · gorazde 16 · sarajevo 8 · kiseljak 6 · lasva_valley 8 · zepce 3.
(Full OSID list held by the seat; reproducible from `enclave_resilience.ts:112-252` + `enclave_integrity.ts:27-32` +
`operational_contact_graph.json`.)

**DEFECT D2 (orchestrator-VERIFIED):** `op:gorazde:novakovici`, `op:gorazde:zorlaci` in `ENCLAVE_DEFINITIONS` but not
in the 712 universe. List reads 18, only 16 resolve. Only dead keys across all 9 enclaves.

**"Expected but absent" class** (unguarded, same municipality, fully eligible): `op:gorazde:podkozara_donja_2` [RBiH],
`op:srebrenica:osmace_2` [RBiH], 7× `op:rogatica:*`, 5× `op:ugljevik:*`, 4× `op:busovaca:*`, 4× `op:novi_travnik:*`,
3× `op:kiseljak:*`, 2× `op:vitez:*`, `op:kresevo:mratinici`, `op:zepce:zeljezno_polje_2`.

**Over-coverage class:** prefix guards protect OSIDs the enclave does not hold — `op:novo_sarajevo:lukavica` (SRK HQ, RS),
`radava`, `recica`, `faletici`, `orasac_2`, `trubar`, 4× `op:velika_kladusa:*`. Calibration distortion, not §6.

### SET B — enclave rim (criterion 7): **43 cells, 17 RBiH-held**
1-ring over the contact graph, seeded from full SET-A membership of the four must-hold enclaves, excluding guarded.
Goražde 12 · Bihać 11 · Teočak 6 · Sarajevo 14.

**Highest-value cell: `op:zvornik:rastosnica_2`** — THE corridor attaching Teočak to 2nd Corps/Tuzla
(`enclave_resilience.ts:150-153`). RBiH-held, unguarded, eligible. If it falls Teočak is severed, becomes a real
isolated enclave, and "Teočak HOLDS" breaks **without a single guarded OSID acquiring `collapse_damage`.**

**1-ring is NOT sufficient — checked, not assumed.** The corridor chain is `rastosnica_2 → kalesija → tuzla`; at depth 2
`op:kalesija:{kalesija_grad_2,kalesija_selo,kikaci}`, `op:zvornik:sapna`, `op:tuzla:{gornja_tuzla,simin_han_2}` are all
RBiH, unguarded. The corridor can be cut at depth 2 while `rastosnica_2` stays RBiH → 1-ring sees nothing.
**Recommended bar:** 1-ring (43) BLOCKING + named-chain BFS-connectivity assertion (Teočak in same RBiH component as
Tuzla in ON as in OFF) + 2-ring (110 cells, 39 RBiH) DIAGNOSTIC only (blocking at depth 2 everywhere pulls in most of
central Bosnia → false positives → criterion gets waived rather than fixed).

### Seat's own caveat
Control figures came from `data/derived/latest_run_final_save.json` — a **proxy** used to shape sets; commit unknown,
relation to the 629 floor unverified. Set *membership* is fully static and safe; the RBiH-held filter is not.
**Implementing lane must read** the `final_save.json` of the collapse-OFF run from the criterion-2 ON/OFF pair.
If the pair doesn't exist, criteria 4 and 7 are **NO-GO, not skip.**

### The 9 blocking criteria (abridged)
1. `isPhase3DEnclaveGuarded` / `ENCLAVE_DEFINITIONS` UNCHANGED by the breadth diff (file-diff review, not assertion).
2. Marker-verified ON/OFF 188w pair at post-change HEAD, both retained, re-runnable by a non-implementer.
3. G2-A and G2-B **EXECUTED**, executed/skipped counts stated. A skipped §6 case is NO-GO.
4. G2.6/G2.7 for real: `political_controllers` byte-identical ON vs OFF across the full 84-key space. **Identity, not absolute.**
5. Rupture-timing identity: `srebrenica_genocide_1995.recorded_turn` identical ON vs OFF and ≥160; falls-event turn identity.
6. `tools/verify_collapse_section6.cjs --compare` exit 0.
7. Enclave-rim regression: no OFF-baseline RBiH-held rim cell newly lost in ON. **+ named Teočak corridor chain.**
8. Anchor + `matched_osids` diff vs the 629 / 31-of-31 floor, full `anchor_checks` diffed, not net.
9. Header comment `:153-159` updated (consumer is LIVE); D1 and D2 corrected.

---

## SEAT 2 — RC-WarOrGame (Realism)

**RECOMMENDATION: do NOT widen breadth against the current strain model.**

### Why one entry — traced, mechanism-first
Conjunction for a write: Tier-0 (exhaustion + persistence + coherence domain) → Tier-1 (local strain + same-faction
Tier-0 + persistence) → severity ≥ 0.25 → §6 guard.

- **Exhaustion term passes for all three factions** (see Systems for the refinement) — not binding.
- **authority domain DEAD:** all three read `authority = 50` at t188 against a `< 30` gate; only writers are early-war
  paths not on the war path.
- **cohesion domain MATHEMATICALLY UNREACHABLE:** gate tests `ops.fatigue > 30` against `FATIGUE_MAX = 30`, all writers
  clamped. 249 active formations at t188, max exactly 30, **zero above**. Orchestrator-verified.
- **spatial domain** is the only live gate. **THE BINDING CONSTRAINT IS THE TIER-0 FACTION-WIDE SPATIAL GATE:** IV-d's own
  numbers — 39 OSIDs reached strain ≥55, exactly **2** were domain-eligible. The faction gate is the 95% cut.
- Strain arithmetic: `strain(T) = 0.075 × Σ_t edges(X,t)`; floor 55 ⇒ **733 edge-turns**. HRHB holds 20 of 273 front
  OSIDs at t188, max 4 edges each ⇒ 183 of 188 turns on maximal frontage.

### P0 realism findings
- **P0-1. Strain measures FRONTAGE-DAYS, not pressure.** `M1_UNIFORM_EDGE_MAGNITUDE = 1.0` per front edge. A frozen
  post-Washington HVO boundary accrues at exactly the Sarajevo siege ring's rate. The sole collapse fired on an OSID with
  **zero incoming attacks in the entire war** (416/416 friendly location records, 0 appearances in `operation_aars.json`).
- **P0-2. The 0.5/0.5 edge split cannot tell besieger from besieged.** VRS Lukavica and ARBiH Dobrinja accrue identically.
- **P0-3. Two of three domains provably dead** → canon's "multi-causal" collapse is single-causal on a supply-BFS step.
- **P0-4. The §6 guard is controller-blind.** 21 of 84 guarded OSIDs are RS-held, incl. `op:novo_sarajevo:lukavica`
  (SRK HQ, 6 front edges, one of the two max-strain cells in June at 84.6). **The guard written to protect the besieged
  currently protects the besieger's corps HQ.** (Independently reached by Canon-S6 via key-space enumeration — exact agreement on 21.)
- **P1:** `computeSeverity` (`phase3d:222-246`) ignores its `persistence` argument — chronic and acute give identical severity.
  June's write was `supply_mult 0.8937` = −10.6% on one cell; absolute max −40%.
- **P2:** strain is monotonic with no recovery — a cell 40 km behind the line keeps its strain forever.
- **Design-level:** the spatial gate measures **isolated-pocket fraction, which FALLS as a faction expands.** RS at peak
  1992 over-extension had the lowest isolated fraction on the map. **The metric points at the opposite of the quantity
  the lane exists to model.** No breadth tuning fixes that.

### Consumer soundness
**The combat consumer is SOUND and would bite** — on the main resolution path, `defenderPower` → `powerRatio` →
`classifyOutcome`, 8/8 unit tests, correct keyspace. **But three of the four documented consumers are DEAD:**
`front_pressure.ts:150-151` and `formation_fatigue.ts:217,229` read **settlement** edge ids while 3D writes **OSID** keys
(wrong keyspace; `front_pressure` additionally has 0 entries), and `loss_of_control_trends.ts` fields have no behavioural
consumer anywhere in `src/`. The B4-D2 "OSID-write → settlement-read bridge" was never built; IV-e sidestepped it with an
OSID-native consumer. **Strike three of four from the panel's mental model.**

### CASCADE DOES NOT EXIST AT ANY BREADTH — structural
Every path enumerated by which X's collapse could affect neighbour Y:
1. `getEdgeCapacityMultiplier` = `min(a,b)` is the only neighbour-aware read; **the live consumer deliberately does not
   call it** (documented as keeping the §6 edge residual inert). Its only callers are the two dead settlement consumers.
2. `local_strain[Y]` is a function of Y's own edge count alone.
3. Tier-0 is faction-wide; X collapsing doesn't move the isolated fraction unless X flips.
4. If X flips: Y gains one edge ⇒ +0.075/turn ⇒ a Y at strain 40 needs **200 more turns** to reach 55. Latency exceeds
   the campaign by an order of magnitude.

**⇒ N independent collapses, by construction, at every breadth. Widening changes N; it cannot change the topology.**
Cascade requires strain or damage to be a function of neighbours' state. Cheapest routes: (i) Phase 3A′ `diffusePressure`
— **the cascade substrate is already built and gated OFF**; (ii) couple to `rear_pocket_consolidation.ts`, the one existing
topological cascade; (iii) make neighbour loss a strain STEP, not a slope change.
**§6 warning: all three are neighbour-coupling terms and G1 is own-OSID-only. Any cascade proposal reopens the §6 gate.**

### Failure mode if breadth widens
**RBiH sits on the Tier-0 spatial trip point.** Gate is `isolated ≥ 10% of controlled`; RBiH controls **293** ⇒ trips at ~30.
Permanently-isolated enclave OSIDs alone = Srebrenica 11 + Goražde 18 + Žepa 1 + Teočak 1 = **31**. Denominator falls as
RBiH loses ground. On trip, the entire RBiH front goes 0 → all strain-qualifying eligible **in one turn, permanently**
(strain and damage both monotonic). Signature: one-turn step in eligible count, burst 4 turns later, all RBiH, near-identical
severity, **SCATTERED across unrelated fronts rather than CONTIGUOUS** — that is how to tell a step function from a real
front breaking. Tripwires: entry count grows ≤5/turn; damaged set BFS-connected; 188w only.

### FOLLOW-UP: zero-at-HEAD is now VERIFIED, not inferred
Two independent validations first: **control replay EXACT** — initial + 189 `control_events` reproduces final at
**712/712, zero mismatches** (so per-turn control history is real, not a t188 projection); **front-edge model EXACT** —
rebuilt `computeFrontEdgesOsid` gives **300 edges vs the artifact's 300**, zero missing/extra, and measures that the engine
**suppresses all 115 RBiH-HRHB contact edges at t188** (allied).

| RBiH-HRHB edge assumption | strain ≥40 | ≥55 | **HRHB-held, unguarded, ≥55** |
|---|---|---|---|
| never live (lower bound) | 87 | 40 | **0** |
| live w54–w102 (evidence-grounded) | 88 | 40 | **0** |
| live w40→w188 (over-generous) | 114 | 49 | 4 |

**Zero under all three HRHB tests** (at t188, at moment of crossing, at any point during accrual).
**Closest near-miss: `op:stolac:stolac_2` at strain 53.70 — short by 1.30 (2.4%), 18 edge-turns out of 716.** It is the HVO
cell **directly adjacent to** June's `hatelji_2`. `hatelji_2` itself measures strain 13.20, RS from turn 0, zero turns HRHB.
Seat's own caution: **read this as "zero or one, nothing structurally different from June," not a stable zero.** The 4
candidates under the over-generous bound cross at turns 163/186/186/186 off an ARBiH-HVO front demonstrably switched off
since Washington — reported for honesty, not believed.

**THE CLIFF, MEASURED:** remove the Tier-0 faction gate, keep strain floor + §6 guard ⇒ **34 OSIDs collapse — RBiH 18,
RS 16, HRHB 0** (+6 suppressed by the guard). One boolean takes the pipeline from 0 to 34, across two factions that have
never collapsed, **as 34 independent entries with no propagation.**

---

## SEAT 3 — RC-Historian

### FRONTAGE-DAYS IS FALSIFIED BY THE HISTORICAL RECORD — stated as a finding
- **C-1. Teočak/Sapna/Majevica, all of 1994.** ARBiH 2nd Corps attacked on **five separate occasions** (11–20 May, 27 May,
  29 Jun–2 Jul, 21–24 Jul, 8–13 Sep, 9–13 Nov); 255th Teočak Bde held throughout. BB2 p.471–472: *"the confrontation lines
  advanced marginally if at all… for little visible gain."* 52 weeks maximal frontage, zero movement. Most collapse-eligible
  under a frontage-days metric; among the least historically.
- **C-2. THE DECISIVE CONTROL — Drvar vs Šipovo, 8–14 Sep 1995.** Same VRS 2nd Krajina Corps, same week. OG "North" cascaded
  Mliništa→Šipovo→Jajce; OG "South"/"West" stalled — 1st Drvar Bde *"quickly stymied the HV assault"* (BB1 p.418). Drvar held
  six days, abandoned 14 Sep only on three-direction attack **plus** 5th Corps threatening Bosanski Petrovac **in its rear**.
  Isolates the mechanism from every faction-scoped and time-integrated variable at once.
  **ACCEPTANCE TEST: any metric returning the same value for Šipovo and Drvar in Sept 1995 is falsified.**
- **C-3. The engine's output inverts the record's geography.** BB1 p.177: Herzegovina was the VRS's **seventh and last**
  1992 priority, purely defensive — the quietest sector in Bosnia. That is where the only collapse ever fired.
  A correctly-breadthed set should be **dominated by OSIDs under attack.**

### Preconditions, ranked (top of list)
1. **Absence of corps-level operational reserve to seal a breach** — BB1 p.430: *"its fatal flaw almost predictably proved
   to be the lack of adequate corps-level reserves to seal breaches in VRS lines… able to hold the HV for about a day."*
   Confirmed inversely: Oct 1994's cascade was stopped by **one scratch reserve** (Balac's cadet bn + two borrowed bns, 30 Oct).
2. **Shallow defensive depth** — single zone 5–10 km deep, nothing behind it (BB1 p.430; SVK pre-Oluja BB1 p.405).
3. **Enemy in the rear → panic flight** (the trigger; 1–2 are the condition). Captured VRS doc, BB2 p.446: *"if the enemy
   appears from the back of their own defense lines — instead of fighting, they flee in panic."*
4. **Adjacent-front failure / flank turned — CO-EQUAL, not a refinement.** Four instances: Grahovo→Knin; Maestral→Donji Vakuf
   (*"swing his right flank back… to avoid envelopment"*); Radić-ridge + Bosanska Krupa holding capped Grabež; Petrovac-in-rear→Drvar.
   **A model with zero neighbour coupling cannot represent the mechanism BB names most often.**
5. Pairwise moral ascendancy from chronic prior defeat (not generic exhaustion).
6. Manning/cadre attrition below establishment.
7. Civilian flight — leading indicator and accelerant, not cause.
8. Command dissolution — real but sector-scoped. **Counter-evidence decisive:** Deliberate Force destroyed most of 56 targets
   and the VRS *"still functioned as a coherent military force… able to move multiple brigade-sized formations clear across Bosnia."*
9. Fuel/strategic mobility (= item 1 from the logistics side).
10. **Supply severance / isolation — MUCH weaker than the scope doc and the engine assume. PRINCIPAL CORRECTION.**
    Isolation makes a pocket *reducible*, not *cascading*. Bihać isolated 3.5 years, never broke; Goražde, Tešanj, Maglaj,
    Orašje, Sarajevo, Žepa likewise. The 1993 Drina enclaves fell on the **attacker's committed weight** (BB2 p.393).
11. **Faction-wide exhaustion — not a predictor of WHERE, barely of WHEN.** Sept–Oct 1995: RS at maximum exhaustion, and in
    that same month the Ozren TG held Doboj against two corps with *"essentially the same [forces] as… 1992, 1993, 1994."*

### Cascade episodes the scope doc missed
Scope doc's Krajina/Storm/Sana is directionally right, materially incomplete. Fourteen catalogued; missed items 2–11:
1993 produced **four** separate cascades; **HRHB was the cascading faction in 1993** (Kakanj, Bugojno 7 days, Vareš overnight);
APZB/Velika Kladuša erased in **~2.5 weeks** Aug 1994; VRS 2nd Krajina Corps Grmeč Oct 1994 — **~250 km² in 6 days**,
*"complete disintegration of the VRS frontline brigades"* — BB's most explicit account of *why* a front cascades; and the
Nov–Dec 1994 counter-cascade that undid it. **Cascade visits all three factions.**

### Other controls that HELD under cascade-grade strain
Bihać/5th Corps Nov–Dec 1994 (25,000+ vs 15,000, ~20% of the Safe Area overrun, Serbs <2 km from city centre) — HELD.
Goražde Zvezda 94 (surrounded three sides, ~16% casualty rate, BB judges VRS *"could take Gorazde at almost any time"*) —
HELD, stopped by political cost not the line. Žepa May 1993 — HELD three days, Mladić called it off. Ozren Sep–Oct 1995 —
bent not broken, *"more like a creeping flood than a fast-moving hurricane."* Bosanska Krupa Oct–Nov 1994 — encircled
brigade held **and that single hold capped the entire October cascade.** Tešanj–Teslić 1994; Orašje Nov 1992.

### BREADTH TARGET
- **8–12 cascade episodes** per campaign.
- **~100–180 of 712 OSIDs** cumulative (14–25%); **40–80 concurrent** at the Sept–Oct 1995 peak.
- **~0 in 1992 — any 1992 firing is a false positive.** 1994 H1 is the trough (~0–5).
  Phases: 1993 early–mid 10–25 (RBiH) · 1993 mid–late 10–20 (HRHB) · 1994 H2 15–30 (APZB→RS→RBiH) · 1995 Jul 15–25 ·
  **1995 Sep–Oct 40–80 concurrent — the peak the engine must be able to reach.**
- **All three factions**; overwhelmingly **contested fronts**.
- **~two-thirds of eligible fronts should still HOLD.** A model where eligibility reliably produces collapse is as wrong
  as the current one, in the opposite direction.

### §6 AND BREADTH ARE NOT IN TENSION
Everything in (a)–(d) is satisfiable with **zero guarded OSIDs becoming eligible.** Western Bosnia, central Bosnia and the
Bihać periphery alone are more than sufficient.

### Could not establish
BB1 printed 226–400 absent locally (holds the Srebrenica/Žepa Jul-1995 narrative; ICTY is first-tier there anyway).
No per-OSID cascade membership, only per-municipality — Axis-2 figures are **orders of magnitude, not fit targets.**
1993 central-Bosnia magnitude less firmly bounded. Kupres "Cincar" Nov 1994 / "Zima 94" not characterised. The
two-or-three-to-one eligible-but-held ratio is **ordinal, not measured** — BB does not enumerate non-events.
Refugee-flight thresholds not quantifiable from BB.

**Defect:** `docs/10_canon/HISTORICAL_TIMELINE_MASTER.md` cites BB2 by **KB index, not printed folio — all BB2 citations off by 19.**

---

## SEAT 4 — RC-Systems (Engine/Systems)

### Headline
**The sole collapse OSID from every June report does not reproduce at HEAD.** `hatelji_2` RS at t0 and t188, never flips
(0 mentions in `control_delta.json` for n215 and n220). In June it was HRHB. Tier-1 gates on the *controlling faction's*
Tier-0, and IV-a measured **RS spatial = false**. Second candidate `op:glamoc:vidimlije_2` still HRHB but was below the
damage threshold in June (strain 42.0). **Breadth at HEAD plausibly 0, not 1** — independently corroborated and then
VERIFIED by RC-WarOrGame's reconstruction.

### Cross-checks — all three confirmed, one refined
1. **Exhaustion trajectory CONFIRMED, derived independently** (RS w53/w60, HRHB w80/w93, RBiH w87/w106; terminal
   97.75/82.87/87.78). Pre-fix comparison (`n39`, 2026-07-06): RS w33/w36, HRHB w46/w49, RBiH w51/w55, **all pinned at
   10000 from w51–w83**. **The staleness premise as briefed is HALF RIGHT:** constants were NOT invalidated (thresholds
   still clear), but the comment asserting them (`phase3c:476-478`) is now wrong on both halves.
   **Refinement vs RC-WarOrGame:** the term is not *zero* discrimination — it is a **timing** gate, and it shifted
   Tier-0-first-eligible from ~w60 to ~w84. Still not binding, because `hatelji_2` needed Tier-0 by ~w134.
   **Only this seat found:** `E_collapse = 100` (`phase3a:38`) is now **provably unreachable** — the asymptote means
   `war_exhaustion < 10000` strictly, so `/100 < 100` always. Pre-fix it hit exactly 100.
2. **Two dead domains CONFIRMED.** Fatigue: 249 active formations at t188, HRHB max 30, RBiH max 30, RS max 18,
   **count > 30 = zero**. Authority: 50 for all three; grep for `profile.authority =` returns only harness fixtures.
3. **`computeSeverity` ignoring `persistence` CONFIRMED** — parameter never referenced in the body.

### The 17 constants split THREE ways, not two
- **DEAD-BY-GATE:** C2/C3 (reachable but moot behind unreachable C6/C7); C15/C16 (multiply a permanently-zero damage track).
- **STRUCTURALLY INERT:** C1 — its input `front_pressure` has 0 keys at t188 **and** its output field is no longer read by Tier-0.
- **MISTUNED/OVER-TIGHT:** **C14 is the actual bottleneck** — effective floor `40 + 0.25×60 = 55` against ~0.3/turn accrual
  = **~185 weeks of continuous front contact.**
- **LIVE AND CORRECTLY SCALED: only C4, C8, C11, C17.**

### TRAP B — lineage correct, three discrepancies
638 (n215, `c657ad81f4d94cc0`) / 627 (n218) / 626 (n219) / **629 (n220, `96a084151e9cdf02`)**, all **31/31** read from the
full `anchor_checks` array, not the pass count. Controller counts reconcile exactly (317/293/102 = 712).
- **(a) `manifest.json` carries NO 188w entry at all** — only 52w/4w goldens. It cannot corroborate this lineage, and
  **the 188w floor has no golden-hash gate, only `matched_osids_min: 622`.**
- **(b) 629-is-HEAD is INFERENCE:** the one post-`cc3e288f2` src change with teeth (`sector_offensive_launch_helpers.ts:930`,
  explicit `approaching: false`) is a strict no-op — the field is optional and the sole caller tests `=== true` (`:1133`).
- **(c) The June OFF reference `ad190ed644972150` is on scenario hash `acb538b04d79af3c` with 30 anchors and a pre-repaint
  reference — UNREPRODUCIBLE at HEAD, must not be used as the OFF side of any pair.**

### (c) Gate airtightness
Verified by **field absence**, not fingerprint: all five collapse fields ABSENT from `n220/final_save.json → state.political`;
zero hits in run_summary/activity_summary; `validateGameState.ts` has no collapse assertions. Three ungated numeric consumers
are exact identities (`x * 1.0 === x`). **Two real holes:** the flags **never reset** (`resetEnablePhase3*` only in the audit
harness) so **an ON run contaminates any later run in the same process**; and the edge-min residual at
`getEdgeCapacityMultiplier` is still open, inert only because the IV-e consumer was written own-OSID-only.

### (d) Determinism
Clean; no napkin-0g violation. Every comparator uses exact inequality terminating in `strictCompare`.
**`Math.exp` at `phase3a:218,223`** is the only implementation-defined math in the pipeline, against the repo's own stated
bar (`exhaustion.ts:144-145`) — currently inert because 3A feeds only the dead 3B.
**Gate-integrity:** `collapse_phase1_g2_section6_invariant.test.ts:77` orders run dirs by **filesystem mtime**, and `runs/`
has ~25 unmarked 188w dirs and **zero marked** ones ⇒ **G2-A and G2-B skip today**; a green suite is a **false green** for §6
unless the pair is newest-marked + newest-unmarked.

### (e) Measurement packet
**R0 needs NO run** (reuse n220, verified marker-free). **R1 is one 188w with `ENABLE_COLLAPSE=true`, and it may settle the
breadth question on its own** given the hatelji_2 finding.
Guard footprint for the decision: **84 of 712 (11.8%)** — any widening is confined to the other **628**.

---

## TENSIONS THE RECONCILER MUST RESOLVE (not smoothed here)

1. **Is the guard "structural" (Canon-S6) or "mis-targeted" (WarOrGame P0-4)?** Both seats are internally consistent and
   agree on the fact base (exact agreement on 21 RS-held guarded OSIDs, both singling out Lukavica). They differ on what
   follows. Canon-S6 also names the inverse — the guard **over-covers**, making RS Lukavica and APZB permanently
   collapse-immune, which it calls a calibration distortion rather than a §6 issue.
2. **Exhaustion term: "zero discrimination" (WarOrGame) vs "a timing gate that shifted first-eligibility ~w60→~w84"
   (Systems).** Systems explicitly flags this as a disagreement. Both agree it is not binding.
3. **Breadth number.** Historian's target is 8–12 episodes / ~100–180 cumulative OSIDs / 40–80 concurrent peak. WarOrGame's
   measured cliff from removing one boolean is **34 independent entries, RBiH 18 / RS 16 / HRHB 0**. These are not the same
   shape: 34 is below the cumulative target, wrong on faction mix (Historian: HRHB must cascade in 1993; RS must dominate
   1994–95), and **has no propagation at all**. Does the cliff get anywhere useful, or is it the wrong 34?
4. **Scope.** Three seats independently conclude the strain metric measures the wrong quantity and that cascade needs a
   neighbour-coupling term that does not exist. Historian ranks adjacent-front failure **co-equal with the top three**.
   Is RC still "tune breadth + re-floor," or is it a pressure-model redesign? **This is an owner scope call, flagged as such —
   the reconciler should frame it, not decide it.**
5. **Sequencing against the enclave guard.** Historian says §6 and breadth are **not in tension** (achievable with zero
   guarded OSIDs eligible). WarOrGame says every cascade route is a neighbour-coupling term and **any cascade proposal
   reopens the §6 gate**. Both can be true — breadth is §6-safe, cascade is not. The reconciler should say so explicitly
   if it agrees, because the roadmap currently treats them as one lane.

## ORCHESTRATOR-VERIFIED INDEPENDENTLY (do not re-derive)
712 universe · RS 317 / RBiH 293 / HRHB 102 · `hatelji_2` RS at t0 and t188 · `FATIGUE_MAX = 30` with clamped writers ·
`novakovici` and `zorlaci` absent from the universe.

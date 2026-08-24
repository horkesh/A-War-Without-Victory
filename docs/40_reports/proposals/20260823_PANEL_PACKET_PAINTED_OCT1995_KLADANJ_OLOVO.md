# PANEL PACKET (FINAL) — Correct the painted-control reference for Kladanj

**Status:** **FINAL — panel ruled 2026-08-23. Split verdict, therefore ESCALATED TO OWNER for sign-off.**
**Not implemented. No data file has been modified.**

**Recommendation: +2 matched OSIDs at 188w (637 → 639).** Two cells, scoped per-cell, six conditions.
**`op:olovo:gurdici_2` is dropped** — the panel rejected it, and this packet no longer proposes it.

**Panel:** Historian · Scenario-tester/Calibration · Engine/Systems · Red Team. Each polled independently.
**Implementer ≠ reviewer:** packet assembled by the orchestrator, finding originated by Lane B. Neither voted.

---

## 1. VERDICT

| cell | Historian | Calibration | Engine | Red Team | outcome |
|---|---|---|---|---|---|
| `op:kladanj:kladanj_3` | GO | GO | GO | GO | **GO — 4/4** |
| `op:kladanj:staric_2` | GO *(later snapshots only)* | GO | GO | REFINED | **GO — no dissent** |
| `op:olovo:gurdici_2` | **NO-GO** | **NO-GO** | HOLD | **NO-GO** | **REJECTED** |

Unanimous GO is the signature. `gurdici_2` was rejected; the other two carry no NO-GO but the packet
as originally written was found defective (§4), so this escalates rather than self-signs.

**All four seats concur this is not a §6 matter** — no enclave outcome, no atrocity or condemnation
pathway, no scoring mechanism, no paramilitary surface.

---

## 2. THE PROPOSED CHANGE, EXACTLY

The fix is **per-cell, not uniform** — this is the panel's most consequential correction. `kladanj_3`
is RBiH for the whole war; `staric_2` only from the May 1994 offensive onward.

| file | `op:kladanj:kladanj_3` | `op:kladanj:staric_2` | resulting counts |
|---|---|---|---|
| `painted_control_jan1993.json` | RS → **RBiH** | *unchanged (RS)* | RS 384 / RBiH 248 / HRHB 80 |
| `painted_control_jan1993_improved.json` | RS → **RBiH** | *unchanged (RS)* | RS 404 / RBiH 254 / HRHB 86 |
| `painted_control_apr1994.json` | RS → **RBiH** | *unchanged (RS)* | RS 410 / RBiH 235 / HRHB 67 |
| `painted_control_apr1995.json` | RS → **RBiH** | RS → **RBiH** | RS 390 / RBiH 243 / HRHB 79 |
| `painted_control_oct1995.json` | RS → **RBiH** | RS → **RBiH** | RS 314 / RBiH 291 / HRHB 107 |

`oct1995` lines 359 and 361. **Line 487 (`op:olovo:gurdici_2`) is NOT touched.**

**`meta.counts` must be corrected in every file touched — three are already stale today:**

| file | `meta.counts` declares | actual content |
|---|---|---|
| `oct1995` | RS 315 / RBiH 290 / HRHB 107 | RS **316** / RBiH **289** / HRHB 107 |
| `jan1993` | RS 407 / RBiH 251 / HRHB 86 | RS **385** / RBiH **247** / HRHB **80** |
| `jan1993_improved` | RS 407 / RBiH 251 / HRHB 86 | RS **405** / RBiH **253** / HRHB 86 |
| `apr1994`, `apr1995` | — | correct |

⚠ **`jan1993` and `jan1993_improved` are two live files with the same declared counts and different
content** (385/247/80 vs 405/253/86). Flagged; not resolved here.

### Measured effect

- **188w: 637 → 639** (+2). Independently recomputed by two seats against the clean baseline
  `cc88344e922ac8b4`; exactly those cells move, no offsetting loss.
- **40w: +1** — only `kladanj_3` changes in `jan1993`, the ≤56-week reference. Hard floor
  `matched_osids_min: 655`; margin widens. **Must be measured, not assumed** — the seat's 40w figure
  came from a pre-provenance run and is indicative of direction only.
- **`final_state_hash` cannot change at any horizon.** The painted read is in the reporting path
  (`runAnomalyDetection` at `scenario_runner.ts:3098`, after the turn loop, state read-only).
  The engine's trajectory is invariant under any painted edit.

---

## 3. EVIDENCE

All BB citations verified against the PDFs directly (BB1 offset +37, BB2 +19, both uniform across
every page cited), **not** the BB1 knowledge-base index, which is known misaligned.

### 3.1 `op:kladanj:kladanj_3` — RBiH in all four snapshots

The OSID contains **Kladanj town** (census S125644, 3,655 B / 870 S); OSID totals 4,784 B / 937 S.
No other OSID contains it.

**BB affirmatively describes the town as held — it does not merely omit its fall.** That distinction
is what carries this cell:

- **BB2 pdf 494 / printed 475** (1994): *"The **Muslim-held town of Kladanj** was only about 7 km from the confrontation line at its closest point, but was shielded from the Bosnian Serbs by a series of high ridges and peaks."*
- **BB1 pdf 378 / printed 341** (12 July 1995, Srebrenica): *"The evacuation to **Muslim-held Kladanj** was to start that very day at 1300."*
- **BB1 pdf 396 / printed 359** (26 July 1995, Žepa): civilians *"transported to **Muslim-held Kladanj** in Serb buses with UN peacekeepers aboard."*
- **BB1 pdf 514 / printed 477** (1995 ARBiH OOB): *"243rd Muslim-Podrinje Mountain Brigade, HQ Kladanj / 244th Mountain Brigade, HQ Kladanj."*
- **BB2 pdf 496 / printed 477**, Chart 1: *"3rd Operational Group, HQ Kladanj"*; 121st Mountain Bde, HQ Kladanj (later 243rd).
- BB records **no VRS attempt on the town**. Operation "Kladanj 93" targeted the Sapna–Teočak salient, not Kladanj (**BB1 printed 229**, verified).

**Repo self-contradiction (this cell only):** `oob_brigades.json` homes `arbih_243rd_muslimpodrinje_mountain`
at `home_osid: op:kladanj:kladanj_3` with `home_settlement: "Kladanj"` — **the only one of the three
brigade-home arguments that is internally field-consistent** (see §4.3).

### 3.2 `op:kladanj:staric_2` — RBiH from mid-1994 onward only

1,244 B / 248 S across Prijevor, Ravne, Starić, Klještani, Turalići. Not one Serb-majority settlement.
5.3–9.7 km east/ESE/SE of Kladanj town.

- **BB1 pdf 378 / printed 341** (July 1995): Srebrenica deportees were *"dropped off some 10 km outside Kladanj and left to make the rest of the way themselves… crossing Serb-Muslim lines."*

> ### ⚠ WITHDRAWN 2026-08-24 — the line inference this cell rested on does not hold
>
> This packet previously read the passage above as fixing the confrontation line at **~10 km east of
> Kladanj town**, and concluded that **every** `staric_2` settlement lay inside it. **The Historian
> seat has withdrawn that inference and so does this packet.** It treated the DROP-OFF POINT as the
> LINE, which does not follow.
>
> ICTY trial judgements supply the number BB lacks: the walk from drop-off to free territory was
> itself *"several kilometres"* (Krstić — *"forced to continue on foot for several kilometres through
> the 'no-man's land' between the Bosnian Serb and Bosnian Muslim lines to Kladanj"*), ~5 km in
> Popović, 5–7 km in Tolimir's footnote citing an adjudicated fact. **The ABiH line therefore sat
> SHORT of the drop-off.** The drop-off is itself named inconsistently — Tišća (≈15.9 km) in one
> judgement, Luke (*"about 5 kilometres southwest of Tišća"*, ≈12.0 km) in another.
>
> | drop-off reading | minus 5–7 km walk | line east of town | `staric_2` (spans 5.3–9.7 km) |
> |---|---|---|---|
> | Tišća ≈15.9 km | | ≈9–11 km | all five settlements inside |
> | Luke ≈12.0 km | | ≈5–7 km | **only Starić inside; Prijevor, Ravne, Klještani, Turalići outside** |
>
> **ICTY straddles the disputed range and does not reach this cell.** It neither confirms nor refutes
> it, and the Luke reading is contrary evidence. The Historian's assessment: had this been before the
> panel, its GO would have been **hedged rather than clean** — not NO-GO. Red team's REFINED on this
> cell is better justified by this evidence than the GO was.
>
> **The cell is NOT reverted.** It remains the better single value on the grounds below. But it is
> **supported, not well-supported**, and must not be cited as resting on a fixed line position.
- **BB2 printed 476**: the May 1994 ARBiH offensive *"pushed the Serb lines back in a bulge east of Kladanj,"* reaching within 10 km west of Vlasenica (≈18.81 E; easternmost `staric_2` settlement, Turalići, is 18.791 E). BB then records the front *"largely quiet"* with no subsequent VRS gain in the sector in either volume.

**Why the two earlier snapshots are excluded:** at `apr1994` the May 1994 offensive had not happened,
and BB2 printed 475's ~7 km line leaves Prijevor, Ravne, Klještani and Turalići on or beyond it. For
`jan1993` BB gives nothing. The Historian **declines to certify those two**, and this packet does not
propose them. *A blanket four-snapshot edit would have asserted ARBiH control here in early 1993 with
no evidence — the per-cell scoping exists to prevent that.*

**This cell's brigade-home argument is void** (§4.3). It stands on demographics and line-geography.

### 3.3 `op:olovo:gurdici_2` — REJECTED, retained as record

Olovo town and Olovske Luke are in **`op:olovo:olovo_2`**, which is **already painted RBiH in all four
snapshots**. The original packet's evidence for this cell — "Olovo town never fell", "161st still HQ
Olovo" — was evidence about that already-correct cell and does not transfer. Stripped of it,
`gurdici_2` has no affirmative BB evidence of its own, and has one piece **against** it:

> **BB1 pdf 290 / printed 253**, endnote 37: *"the Muslim troops were able to halt the Serb attack and retake Prgosevo, **although the VRS held on to Krusevo**."*

Kruševo (S170437) is a `gurdici_2` constituent; BB records no recapture. **The original packet cited
that page and omitted this.** The painted map may simply be placing the Olovo front correctly — town
RBiH, eastern rural ring RS.

---

## 4. DEFECTS FOUND IN THE ORIGINAL PACKET — ALL UPHELD

Recorded because the reasoning must not be reused, and because a future proposal will cite this one.

### 4.1 The detection method is discarded — it has no working positive control

The original §4 claimed a five-member "pathological signature" and that `op:gorazde:kolovarice` was
surfaced by it unprompted, proving it detects reference defects. **Both claims are false.**

- Two seats independently re-ran the stated filter: it returns **four** members, and `kolovarice` is
  **not among them** — its brigade `arbih_807th_muslim_liberation` has `available_from: 165`, failing
  the 0–8 conjunct outright.
- Two of the three conjuncts are inert (dropping `mandatory`, or raising the cap to 12, changes
  nothing). Only the `jan1993` conjunct does work — and it is precisely the one that excludes the
  advertised control.
- Worse: the owner repainted `kolovarice` RBiH→RS **on evidence** eleven days earlier, so the filter's
  direction of inference has already been adjudicated **against** once.

⇒ **The method must not be cited as precedent.** The two surviving cells rest on history alone.

### 4.2 The "decisive structural fact" (original §2) carries no weight — measured

The argument was: initial control says RBiH, the engine never flipped it, therefore the reference is
wrong. Measured against the clean baseline, **55 of 712 OSIDs share that exact property**, 28 of them
in the RBiH→RS direction. The class includes `op:vlasenica:cerska_2`, `op:srebrenica:osmace_2`,
`op:trnovo:trnovo`, `op:pale:praca`, `op:gorazde:ustipraca_2` and `op:gorazde:kolovarice` — places
that **really did fall to the VRS**, where the reference is right and the *engine* failed to produce
the capture. Three of those are documented engine failures in this same day's four-lane diagnosis.

Applied as a rule it would hand the engine **+55**. ⇒ It is a **screening heuristic, not evidence**,
and selecting favourable cells out of a 55-member class by an unvalidated filter is selection bias.
**Demoted to "how these were found."**

### 4.3 The brigade-home argument fails for two of three cells

| brigade | `home_settlement` | `home_osid` | OSID's actual name | consistent? |
|---|---|---|---|---|
| 243rd Muslim-Podrinje | Kladanj | `op:kladanj:kladanj_3` | Kladanj (+5) | **yes** |
| 244th Mountain | Kladanj | `op:kladanj:staric_2` | Starić (+4) | **no** |
| 161st Slavna Olovo | Olovo | `op:olovo:gurdici_2` | Gurdići (+9) | **no** |

Only §3.1's survives. **Two refuted sub-claims, recorded so they are not repeated:** the enricher
`tools/formation/enrich_oob_settlements.ts:186-199` writes **only** `home_settlement` and never
resolves `home_osid`, so `HQ_MAPPINGS` is not the source; and re-homing a mandatory 400-man t0 brigade
is **not** score-neutral — `home_osid` drives initial placement at
`oob_early_war_entry.ts:309/316/320/346`, hence sector assignment, hence potentially 188 weeks of
combat. That fix needs its own run and 188w validation.

### 4.4 Other upheld defects

- **Undisclosed contrary evidence** (§3.3 above) — the most serious single omission.
- **§6.4 was labelled NEW; it is a rediscovery.** `run_provenance.ts` already documents the painted maps as read-and-unstamped, *"deliberately deferred, not overlooked,"* pinned by a live test calling it *"the one entry here that is a real gap."* True, worth acting on, not discovered here.
- **The `brgule` exclusion was framed as a generous concession.** `brgule` is Serb-plurality (180 B / 547 S); painted RS is simply correct. Excluding it costs nothing. *(One clause in an earlier draft — that Majdan is not a `brgule` constituent — was itself wrong and has been struck; per the composition-of-record it is.)*
- **The straddle figure was misassigned, not merely understated** — the excluded set dropped Čude, the *northernmost* settlement, while keeping Kolakovići, which sits on the line.

---

## 5. CONDITIONS ON IMPLEMENTATION

Attached by the seats; all six stand.

**R1 — Stamp the reference file itself.** Add `meta.revision` plus a `changelog` array of
`{date, osid, from, to, commit, rationale}`, seeded retroactively with the `e3a28e25f` `kolovarice`
entry, then these. *Rationale: every other record is a document ABOUT the file; this is the only one
that travels WITH the thing that moved, and it makes `meta.counts` staleness self-evident.*

**R2 — Close the `consumed_inputs` provenance gap, and land it FIRST, as its own commit.** Not bundled
with the repaint: if both land together, the instrument's first observation is already post-repaint and
this re-basing goes unrecorded exactly like the last one. Stamp **conditionally and per-run** — the
refKey is a function of `scenario.weeks`, so a fixed `oct1995` row would hash a file a 40w run never
reads, rebuilding the very defect `run_provenance.ts` exists to prevent. Four forced edit points:
`run_provenance_stamp.test.ts` (the `27` literal, the length cross-check, and the `seedFullTree()`
fixture, which must seed a painted file or the new row returns `null`), plus the `run_provenance.ts`
header and the input-surface-scan comment. **Do not bump `RUN_PROVENANCE_SCHEMA_VERSION`** — leaving
it at 2 makes the comparison name the exact file rather than emitting a generic block.

**R3 — Record the manifest consequence.** `run_summary.json` is byte-pinned and contains the score, so
its hash breaks while `final_save.json` stays identical. **That signature — scored artifact changed,
engine artifact unchanged — is a reference re-base, not an engine regression.** Affects
`apr1992_188w` **and `apr1992_52w`** (the jan1993 edit). Either re-pin from fresh runs or record the
red knowingly. `apr1994`/`apr1995` have no pinned baseline.

**R4 — No gate bless.** Do not run `engine_health_gate.cjs --update`. `matched_osids_min` stays **622**.
Ratcheting it against a re-based reference would encode a yardstick move as an engine floor; the
threshold file already carries a written scar from this exact mistake.

**R5 — Edit through `writePaintedTarget`/`normalizePaintedFile`, not by hand.** Verified: the diff is
then exactly the control cells plus the count lines, with no key churn. Hand-editing is how
`meta.counts` went stale in the first place.

**R6 — The gain buys ZERO engine headroom and must not be spendable.** A later −2 is a real −2, not
"back to where we were." Given the 55-cell class in §4.2, this is the guardrail that stops the
reference becoming an adjustable budget.

**Sequencing: A before Proposal H.** The current reference would **pay H for capturing a town that
never fell** — an over-run of Kladanj scores **+2** today and **−2** after. Run H first and its
measured delta is uninterpretable across the re-base.

---

## 6. SPUN OFF — separate items, not part of this change

1. **282 settlements have conflicting OSID membership between two live derived files.**
   `canonical_to_operational_map.json` (5,797 entries) vs `operational_settlements.geojson`
   constituent lists (5,823): **281 map to a different OSID, 1 is absent.** Example: Majdan (S165000)
   → `op:sekovici:kastijelj_2` in one, `op:kladanj:brgule` in the other. Both files are live —
   the geojson is read by `scenario_runner.ts` and `run_provenance.ts`, the map by `game_state.ts`,
   `formation_spawn.ts`, `recruitment_engine.ts` and `scenario_runner.ts`. **This is larger than the
   repaint and belongs to the data-pipeline owner.** It is also why two seats reported different
   constituent counts for the same OSID.
2. **`jan1993` vs `jan1993_improved`** — two live files, identical declared counts, different content.
3. **OOB `home_settlement` / `home_osid` inconsistency** for the 244th and 161st (§4.3). Not
   score-neutral to fix; needs its own packet and run.
4. **The reference timeline carries known debt.** `gurdici_2` and others remain RS across all four
   snapshots on evidence nobody has tested. Not asserted correct — untested.

---

## 7. WHAT WAS NOT DONE

**No ICTY or Court of BiH judgment was consulted.** Under the project's own source hierarchy those
outrank BB. The July 1995 Srebrenica and Žepa transfers to ARBiH-held territory at Tišća near Kladanj
are findings of fact in **Krstić (IT-98-33)**, **Popović (IT-05-88)** and **Tolimir (IT-05-88/2)**, and
would corroborate both surviving cells from a source above BB. The Historian cited BB because BB is
what it opened, and flagged this explicitly. **One lookup away; available if the owner wants the
strongest possible record before signing a split verdict.**

Also unexamined: Bosnian/Serbian-language operational sources, ARBiH 2nd/6th Corps war diaries,
UNPROFOR sector reporting. BB's silence on post-March-1994 Olovo fighting is silence in BB, not in the
record — it downgrades confidence on `gurdici_2`; it does not establish that the line never moved.

---

## 8. OWNER DECISION REQUIRED

1. **Approve or decline** the two-cell, per-cell-scoped correction (+2 at 188w, +1 at 40w).
2. **Confirm the conditions**, in particular R2's sequencing and R6's non-spendability.
3. **Optionally** direct the ICTY/Court-of-BiH lookup first (§7).

The packet no longer proposes `gurdici_2`. Everything above is verified; where a claim could not be
verified it is marked as such.

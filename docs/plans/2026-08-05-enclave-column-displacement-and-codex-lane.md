# Enclave-fall formation displacement + the "March of the Column" Codex event — spec & draft (PROPOSAL)

**Date:** 2026-08-05
**Status:** BUILT & VALIDATED (2026-08-05, option b — displacement + essay, NO player choice). Shipped flag-gated `AWWV_ENCLAVE_COLUMN_DISPLACEMENT` default-OFF (188w byte-identical to the 630 floor); flag-ON territory-flat (matched 630, anchors 31/31, all 5 Srebrenica pocket brigades displaced to Živinice at reduced strength, Žepa deported, §6 intact). The §2.0 player choice below is REJECTED-design provenance (see §6 PANEL VERDICT); do not implement. Original proposal/§6-review record retained below. **No engine code or live Codex/essay wiring ships from this doc without a §6 panel GO** (Historian + narrative-designer + game-designer + Engine/systems + Red-team), per the presidential-enclave-decision precedent and the canon rule "§6 sensitive-history features must fit a Ring or not be built."
**Origin:** owner direction after the RS brigade-attrition fix shipped (commit `8c636cff2`): "Srebrenica/Žepa do not fall through simulation, they fall through event, if the player chooses that option. So it makes sense that those brigades still present do get displaced, but with heavy casualties." Plus: model the 28th Division breakout ("March of Death") and consider a Codex event.
**Historian consult:** in-session; KB facts below are BB-cited, ICTY-flagged facts are pending the extractor (`bb-extractor-srebrenica95`, running → `docs/40_reports/research/20260805_SREBRENICA_ZEPA_1995_COLUMN_KB_EXTRACTION.md`).

---

## §6 PANEL VERDICT (2026-08-05) — SPLIT; escalates to owner per SENSITIVE_HISTORY_DESIGN_GATE §6

Five-seat panel reviewed this doc. Consolidated:

- **Lane (a) — enclave displacement + heavy casualties (WITHOUT the §2.0 choice): GO-WITH-CONDITIONS.** §6-neutral victim-side consequence; matches the owner's original "brigades displaced with heavy casualties." Engine conditions 1–7 (below). BUILDABLE.
- **Lane (b) — "The Column" essay: GO-WITH-CONDITIONS.** Prose is §6-sound (Historian + narrative-designer cleared it). Fixes: attach to the EXISTING `srebrenica_column_breakout_1995` event (do not mint a new event row); pin the genocide para (Krstić 599 / Appeals) and Žepa (Tolimir) paras; cite or generalize the route place-names (Kamenica/Baljkovica/Nezuk/"100 km" are in Popović/Blagojević, not the §1 Krstić set); trim para-3/4 redundancy; cite fixes already applied (fall = para 36; "Bosnian Muslim soldiers").
- **§2.0 — the RS attack-vs-let-go CHOICE, AS SPECIFIED: BLOCK (game-designer BLOCK, red-team BLOCK).** It **rewards the atrocity**, violating bright-line #1 / the gate's "atrocity is never a lever." Two independent findings:
  - **The military lever.** §2.2 has Option B annihilate the 28th Division below the reconstitution floor while Option A reconstitutes it near-full. Destroying an enemy division so it cannot reform is a concrete OOB/military benefit → Option B is NOT strictly dominated; it *dominates* A militarily. Bot-default B → annihilates ARBiH 2nd Corps OOB → moves RS territory/anchors in RS's favour (atrocity moving the calibration floor).
  - **Verified reward paths (red-team, in code):** column deaths in B can feed RS `military_casualties_inflicted`→`military_credibility` (weight 0.25); denying A's reconstituted division preserves RS `territorial_legitimacy` (0.25) and grade; `negotiating_leverage` rises off both. The one hard consequence — `genocide_condemnation` — fires on the FALL regardless of the choice (`rupture_consequences.ts`), so it is a SUNK cost identical for A and B and provides ZERO marginal deterrent. Reward sits on RS's highest-weighted axes; the deterrent on its lowest.
- **The §2.0 choice is §6-SALVAGEABLE — and the fix is also the historically-correct one.** Per Krstić para 68/88 the breakthrough force reached Tuzla and reformed *regardless* of the massacre; the killing targeted the captured/surrendered — it did **not** prevent reconstitution. So the §6-correct design (military outcome IDENTICAL A-vs-B; only the human toll + condemnation differ) is also what history says. Required to lift the BLOCK:
  - **C1/G2:** decouple ARBiH reconstituted MILITARY strength from the choice — the surviving/reconstituted 2nd-Corps formation must be identical (B ≤ A) on every military axis; **remove §2.2's "annihilated below the reconstitution floor for Option B."** Prove RS territory %/matched_osids EQUAL A-vs-B at 188w.
  - **G1:** column deaths must not feed RS `military_casualties_inflicted`/casRatio (byte-identical mil_cred A-vs-B).
  - **G4:** because condemnation is choice-invariant, add a **B-only judgment aggravator** that caps RS grade to minimum, so B is strictly ≤ A on grade by construction (this does NOT make A "clean" — A stays failure+genocide_condemnation).
  - **C2:** reframe Option B as a military PURSUIT/attack ORDER whose atrocity is EMERGENT (matching the ratified presidential-enclave OVERRUN precedent), not a menu "commit massacre" button (Ring-3 #1).
  - **C3/G5/G6:** condemnation-flag provenance — the choice must not toggle `genocide_condemnation` from the menu; a distinct "column massacre" rupture would be a rupture-EXPANSION requiring the full four-criteria test + separate §6 panel; pin a test that Option A still carries genocide_condemnation.
  - **G7:** a runtime non-inversion contract + test: "Option B never yields higher RS pyrrhic_score, grade, territory %, or military_credibility than Option A under identical prior state." Until it passes, the choice stays BLOCKED.
- **CANON COLLISION (blocking, independent of the above):** the shipped `srebrenica_column_breakout_1995` source_note (test-pinned) declares the column record-only — "must not be re-authored as a player choice … or an alternate-outcome path." Building §2.0 in ANY form requires the owner to amend/retire that gate via the §6 panel first.

**Engine conditions on lane (a) (panel6-engine):** (1) 4 write channels — `event_types.ts`/union, `apply_effects.ts` EFFECT_KIND_ORDER **+ a `case` in `applySingleEffect` (missing case = SILENT no-op)**, `event_vocabulary.ts`; unit-test the effect actually mutates. (2) Loader deep-validates the payload (finite `casualty_fraction`∈[0,1], non-empty osids, `reconstitute_as`∈{reduced,none}) + non-finite guards. (3) Read `source_osids` from payload, not "formations now in enemy territory" (order-independence). (4) **Calibration landmine:** returning 28th-Division survivors to 2nd Corps risks re-injecting the ARBiH combat power the 630 floor depends on staying dead (EH-3 `stranded_status='collapsed'` is load-bearing) — env-flag default-OFF, prove flag-off byte-identical, 188w flag-on diff vs floor. (5) **corps_id trap:** verify the enclave OOB formations' `corps_id`; `reconstituteBrigades` Path B gates on own-corps territory — must reassign to `arbih_2nd_corps` or pick a destination the formation's corps owns, else it spawns via Path C on the wrong OSID. (6) mechanism = bounded teleport-with-penalties (`findEmergencyRetreatOsid` step 7) and/or T5 reconstitution — NOT a `stance:'column'` march (no friendly path out of a besieged enclave; it would never route). (7) casualty ledger has no event tag (totals only); pass an explicit KIA/WIA/MIA split skewed to killed+missing (executions ≠ the battle-calibrated 0.22/0.74/0.04).

**OWNER DECISION (2026-08-05): option (b).** Build **lane (a) displacement + lane (b) essay ONLY. The §2.0 player choice is DROPPED.** The shipped `srebrenica_column_breakout_1995` record-only canon gate is KEPT (not amended) — the column stays a record, not a player choice, so the canon collision is resolved by not building the choice. §2.0 below is retained as rejected-design provenance only; do not implement it. Remaining work: build lane (a) under the 7 engine conditions (flag-default-OFF, 188w-gated) + wire lane (b) essay to the existing event with the cite fixes.

## 0. The gap this closes

Srebrenica and Žepa fall via **event** (`srebrenica_falls_1995`, `zepa_falls_1995` in `data/scenarios/events/war_1995.json`), not simulated combat. Those events currently apply: `humanitarian_impact` (war_crimes_delta +5 / +1), `negotiation_capital international_credibility` (−30 / −10), `patron_pressure` (+20), `morale_change RBiH` (−15 / −5), `control_change` (enclave OSIDs → RS), and a `narrative`. **They do NOTHING to the ARBiH formations physically located in the enclave.** Those formations (the 28th Division at Srebrenica; the Žepa garrison) are left in place as their OSIDs flip to RS — becoming stranded/ghost formations handled incidentally by the stranded/dissolution machinery, rather than modeling what actually happened: a breakout column, catastrophic losses, and a reduced-strength reconstitution in 2nd Corps territory.

The §6 framing is already correct and must be preserved: **atrocity is a COST to the perpetrator, never a reward** (RS eats war_crimes + international_credibility + patron_pressure). This lane adds the *victim-side consequence* (the column's dead and the survivors' displacement) without altering that.

## 1. ICTY-sourced facts (Krstić IT-98-33-T; Balkan Battlegrounds disregarded per owner directive)

**OWNER DIRECTIVE (2026-08-05): ground this lane on ICTY ONLY. Balkan Battlegrounds is DISREGARDED as too unreliable for this material.** All facts below are cited to the ICTY *Krstić* Trial Judgement (IT-98-33-T, 2 Aug 2001) by paragraph, verified against the judgement text (`https://www.icty.org/x/cases/krstic/tjug/en/krs-tj010802e-1.htm`). The earlier BB-sourced facts — including the "2,700 reconstituted / 3,200 unaccounted" split and the "28th Independent Division / Živinice / 24th-Division merger" detail — have been **REMOVED**; they were BB-only and are not in the Krstić judgement. The BB extraction report is retained solely as evidence that BB lacks this narrative, not as a source.

- **Directive 7 (March 1995):** Karadžić issued it; it ordered the VRS to "complete the physical separation of Srebrenica from Žepa" and to "create an unbearable situation of total insecurity with no hope of further survival or life for the inhabitants of Srebrenica," and to restrict aid convoys. Strategic precondition, not the launch trigger. **[Krstić TJ para 31]**
- **Immediate trigger:** on **26 June 1995** Bosnian Muslim forces raided the Serb village of **Višnjica** (a response to the VRS capture of OP Echo on 31 May) — "relatively low intensity," but it preceded and was used around the launch. **[para 33]** *(Correction: earlier "28 June" was wrong — ICTY says 26 June.)*
- **Operation "Krivaja 95":** Gen. Milenko **Živanović signed the orders on 2 July 1995**; the offensive **began in earnest 6 July**; **Srebrenica town fell on the evening of 11 July 1995**. **[paras 33–34, 36]** (para 33 = order signed; 34 = offensive began; 36 = town fell)
- **28th Division:** "not well organised or well equipped," lacked a firm command structure, but "the number of men in the 28th Division outnumbered those in the Drina Corps." **No precise headcount is given in this part of the judgement** — do NOT assert a specific strength number without an ICTY paragraph cite. **[para 24]**
- **The column:** formed ~2200 hrs **11 July** on a decision by the division command + municipal authorities **[para 63]**; gathered near **Jaglići and Šušnjari**; estimated **10,000–15,000 men**; **around one third were Bosnian Muslim soldiers** (ICTY wording; not all armed). **[para 64]**
- **Breakthrough:** the head of the column **broke through to Bosnian-held territory on 16 July 1995**, with ABiH forces attacking from Tuzla piercing a line ~1.5 km **[para 68]**; on **15–16 July Col. Pandurević (Zvornik Brigade) decided to let a portion of the armed head of the column through to Tuzla** **[para 88]**. *(The judgement excerpt gives no exact survivor count.)*
- **Killed:** the Chamber was satisfied that Bosnian Serb forces **executed 7,000–8,000 Bosnian Muslim men** following the take-over **[para 87]**; executions from 13 July, large-scale **14–17 July** in the **Zvornik Brigade zone of responsibility** **[para 70]**; sites include **Cerska Valley, Kravica Warehouse, Orahovac, Branjevo Farm, Petkovci Dam, Kozluk** **[para 80]**.
- **Genocide finding:** the killing was found to constitute **genocide** — "the intent to kill all the Bosnian Muslim men of military age in Srebrenica constitutes an intent to destroy in part the Bosnian Muslim group within the meaning of Article 4 and therefore must be qualified as a genocide" **[Krstić TJ para 598; foundational reasoning para 594]**; affirmed by the *Krstić* Appeals Judgement (19 Apr 2004). The ICTY's first genocide conviction.
- **Column loss magnitude (ICTY-citable):** "as many as **8,000 to 10,000 men from the Muslim column of 10,000 to 15,000 men were eventually reported as missing**" **[Krstić TJ para 546]**; 7,000–8,000 executed **[paras 487, 546]**. Only a portion reached government-held territory (para 546 attributes the breakthrough to VRS manpower shortage; cf. Pandurević, para 88).
- **The fork is historically real:** the corridor genuinely was opened and a portion passed (para 88), while the executions were a separate, deliberate act (paras 70/80/87/546) — this is why §2.0's "let the column pass" is a grounded divergence, not an invention.
- **Žepa (ICTY *Tolimir* IT-05-88/2):** Žepa's population was **forcibly removed/deported WITHOUT the mass killings seen in Srebrenica**; three Bosniak leaders were killed — municipal president Mehmed Hajrić, **Žepa Brigade commander Avdo Palić**, and Civil Protection commander Amir Imamović. The Trial Chamber's Žepa **genocide** characterization was **REVERSED on appeal** (insufficient evidence of the killings' consequences on the population); Tolimir's genocide conviction stands for **Srebrenica**, not Žepa. → the engine must model Žepa as **forcible deportation / evacuation with LOW combat casualties and NO reconstitution** (survivors leave the theatre), distinct from the Srebrenica column.
- **Engine casualty basis (ICTY, Krstić para 546):** the column was 10,000–15,000, with 8,000–10,000 reported missing → a **column-wide loss on the order of ~60–70%**. The column was ~one-third 28th Division soldiers **[para 64]**, so applying the column-wide fraction to the *formations* specifically is a modeling choice the panel must set (the soldiers were embedded in the column that took these losses). Option B's `casualty_fraction` is therefore **panel-set within the ICTY para-546 band (~0.5–0.7)**, justified against the cite — not a hardcoded number.

---

## 2. Lane (a) — engine spec: event-driven enclave-formation displacement + reconstitution

**Principle:** on an enclave-fall event, the enclave's ARBiH formations are **displaced toward the nearest friendly territory**, then reduced/reconstituted — never combat-dissolved in place, never simply stranded. **The casualty severity is a PLAYER (RS) CHOICE** (§2.0).

### 2.0 The player choice (RS): hunt the column, or let it pass — THE most §6-sensitive decision in the game

> **⛔ CANON COLLISION — BLOCKING, OWNER DECISION REQUIRED (found by the §6 panel, 2026-08-05).** An already-shipped, test-pinned §6 gate directly forbids this. The event `srebrenica_column_breakout_1995` (`data/scenarios/events/war_1995.json`) is a Ring-3 record-only row whose `source_note` states: *"This sensitive genocide subject is canon-gated: it is a record only and must not be re-authored as a player choice, a prevent-or-save mechanic, or an alternate-outcome path,"* and it is pinned by `tests/codex_sensitive_history_source_notes.test.ts` (SOURCE_NOTE_EVENT_IDS). **The owner's directive to make the column an RS attack-vs-let-go choice conflicts with this shipped commitment.** This cannot be built until the owner decides, via the §6 panel, either to (a) amend/retire that canon gate (re-author the source_note + test + panel sign-off), or (b) keep the record-only gate and NOT build the column choice, or (c) reframe the choice so it does not re-author the *column's* fate as an alternate-outcome path. The essay prose (record-only) does NOT collide; only the §2.0 mechanic does. Design below is retained as the proposal pending that decision.

This is a player-authored moral choice in the exact mould of the ratified **presidential-enclave-decision (OVERRUN vs CONTAIN)** — but heavier, because attacking the column is the decision that historically became the Srebrenica genocide. It must be authored and reviewed by the **§6 panel** (Historian + narrative-designer + game-designer + Engine/systems + Red-team); it is **not** a mechanic to be tuned casually. Historically legitimate as a fork because the corridor genuinely was opened (Pandurević, 16 July) while the executions were a separate, deliberate act (§1.1).

A decision fires after `srebrenica_falls_1995` (turn ≥ the fall), presented to the RS player:

- **Option A — "Let the column pass" (open the corridor).** The fleeing 28th Division column reaches ARBiH lines with **minor losses** (~10–20%, incidental combat/exhaustion — the corridor-opening / mercy path). The 28th Division reconstitutes at **near-full reduced strength** in 2nd Corps (Tuzla) territory. RS incurs **no additional column-massacre war-crimes cost** beyond the base fall event. This is the ahistorical merciful divergence, grounded in Pandurević's actual corridor.
- **Option B — "Hunt the column down" (historical).** Heavy losses to the column (a **panel-set, ICTY-bounded** fraction — see §1: a 10,000–15,000 column, ~one-third soldiers, 7,000–8,000 killed overall); the massacre is committed. RS incurs **SEVERE additional §6 costs**: a `war_crimes_delta` spike, `international_credibility` collapse, `patron_pressure` spike, and a **condemnation flag** that can CAP or TAINT the ending per `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`. **The massacre confers NO territorial or negotiating benefit — nothing but condemnation.** Survivors are annihilated below the reconstitution floor except a remnant that still breaks through to Tuzla (para 88).

**Bot / historical default:** Option B (the VRS historically chose revenge). Per bots-default-historical, the headless/bot path selects Option B so the calibration baseline reproduces history; the **human RS player** may diverge to Option A (mercy). This makes the choice the player's authorship of — or refusal of — the tragedy, consistent with the Free-War thesis and "the least bad version of a tragedy" scoring.

**§6 bright lines (binding, for the panel):**
1. **Atrocity is never rewarded.** Option B must be strictly dominated on every reward axis by its costs; it must never out-score or out-hold Option A. Red-team must verify no configuration makes the massacre instrumentally worth it.
2. **Not "genocide vs clean hands."** Srebrenica's genocide encompassed *both* Potočari (the fall event) and the column. Option A reduces the *column's* dead; it does **not** absolve the fall. The narrative-designer must frame the choice as the column's fate within the atrocity's shadow, never as "commit vs. avoid genocide."
3. **Powerlessness/complicity, not power fantasy.** The framing confronts the player with moral weight; it must not present the massacre as a satisfying capability.
4. Player choosing Option B is **allowed** (ahistorical-atrocity-allowed), but it is a war crime with maximal condemnation and zero benefit — same discipline as the presidential-enclave OVERRUN order.

Only the **casualty_fraction / reconstitution / cost** parameters below differ between A and B; the displacement mechanic (§2.1–2.2) is shared.

### 2.05 BUILD-READY design (option b — displacement only, NO choice) + corps_id pre-build finding (2026-08-05)

Owner chose (b): build lanes (a)+(b), drop the §2.0 choice. Pre-build `corps_id` investigation (engine condition 5) — resolved from `initial_save.json`:
- The enclave ARBiH formations are exactly TWO, both already `corps_id: arbih_2nd_corps` and tagged `enclave`:
  - `arbih_280th_east_bosnian_light` @ `op:srebrenica:srebrenica_2` (Srebrenica).
  - `arbih_285th_light` @ `op:rogatica:zepa_2` (Žepa).
- => The corps_id trap does NOT apply (already 2nd Corps); reconstitution Path B into a Tuzla/2nd-Corps `destination_osid` is clean with no reassignment. The change is **bounded to 2 formations**, which caps the calibration blast radius.
- Source-formation selection for the effect = faction RBiH + `enclave` tag + `location_osid ∈ source_osids` (do NOT scan "formations in enemy territory").
- **Srebrenica** (`arbih_280th`): Option-A-equivalent ONLY (no choice) — displace to a 2nd-Corps Tuzla OSID with heavy casualties (ICTY para 546 band, panel-set) + reduced-strength reconstitution. **Žepa** (`arbih_285th`): per Tolimir (deportation, no mass killing) — LOW casualties, `reconstitute_as: none` (survivors leave theatre).
- Flag-gated default-OFF; prove flag-off byte-identical; 188w flag-on diff vs the 630 floor (matched_osids + per-corps ARBiH destruction, esp. arbih_2nd_corps) + confirm Srebrenica/Žepa still fall and Goražde/Bihać still hold. One change per run.

### 2.1 New effect kind (proposed): `enclave_formation_displacement`
Add to the event effect vocabulary (`src/sim/events/apply_effects.ts` `EFFECT_KIND_ORDER` + `event_vocabulary.ts` + the `EffectKind` union; note the two-write-channel lesson — a dead-write is silent, so wire loader validation). Shape:
```json
{
  "kind": "enclave_formation_displacement",
  "faction": "RBiH",
  "source_osids": ["op:srebrenica:*"],        // enclave OSIDs (reuse the event's control_change list)
  "destination_osid": "op:tuzla:...",          // nearest friendly 2nd-Corps OSID (corridor exit toward Nezuk/Tuzla)
  "casualty_fraction": 0.5,                     // ILLUSTRATIVE ONLY — panel-set, ICTY-bounded (§1); NOT a hardcoded historical figure
  "reconstitute_as": "reduced",                // survivors reform at reduced strength via existing machinery
  "min_survivor_fraction": 0.0                  // some formations may be effectively annihilated (column reality)
}
```

### 2.2 Behavior (deterministic; sorted iteration, no RNG)
For each `faction` formation whose `location_osid` ∈ `source_osids` (sorted by formation id via `strictCompare`):
1. **Casualties:** `personnel *= (1 - casualty_fraction)`; record to `casualty_ledger` attributed to the event (NOT to a combat battle) so K:W and per-corps stats stay honest.
2. **Displace:** set `location_osid`/assignment toward `destination_osid` (reuse the T5 lifecycle/column-movement path, not a teleport; see `attack_retreat_displacement.ts` + the `stance:'column'` movement lesson). If the corridor is cut, fall to the standard retreat-destination chain (`home_osid → fallback_osid → corps HQ → any friendly OSID`).
3. **Reconstitute:** mark survivors so `brigade_reconstitution.ts` reforms them at reduced strength in the destination's corps AOR (the machinery already exists — `RECONSTITUTION_PERSONNEL_FRACTION` etc.). For Srebrenica, the reconstitution target is the **2nd Corps (Tuzla)** area, where survivors reached Bosnian-held territory (para 68/88). Formations reduced below the absolute floor are destroyed (annihilated in the column) but remain reconstitution-eligible per existing rules. *(Note: any pre-existing code comment citing Balkan Battlegrounds for the 28th-Division reconstitution should be re-grounded on the ICTY record or removed per the owner directive.)*

### 2.3 Žepa (softer, separate parameters)
Žepa's 1995 fate differed materially (negotiated evacuation; many fighters interned in Serbia rather than reaching ARBiH lines). Model with a **lower `casualty_fraction`** and **`reconstitute_as: "none"`** (survivors leave the theater / are interned, not returned to ARBiH combat strength). **Gate the Žepa numbers on the extractor/ICTY sourcing** — the KB only has 1993 Žepa.

### 2.4 What this must NOT do (§6 + calibration)
- Must not give RS any benefit beyond the already-modeled control_change; the perpetrator's costs (war_crimes/international_credibility/patron_pressure) are unchanged.
- Must not resurrect the RS brigade-attrition asymmetry: the displaced ARBiH survivors reappear in 2nd Corps at *reduced* strength — validate that this does not inflate ARBiH late-war combat power or move `matched_osids`/§6 anchors. Run 188w, diff per-corps destruction + `matched_osids` vs the current floor (630 / `e050cb0a11944bad`), confirm Srebrenica/Žepa still fall and Goražde/Bihać still hold.
- Determinism sacred: no RNG, no timestamps; sorted iteration.

### 2.5 Files touched (when built, post-panel)
`src/sim/events/apply_effects.ts`, `event_vocabulary.ts`, `event_types.ts`/`EffectKind`, `event_loader.ts` (validation), the fall events in `data/scenarios/events/war_1995.json` (add the effect), possibly `brigade_reconstitution.ts` (destination-corps targeting). Tests: a new effect-application test + a 188w calibration check + a §6 invariant check.

---

## 3. Lane (b) — Codex essay DRAFT: "The March of the Column"

**Status: DRAFT for narrative-designer + Historian + §6 panel. Do NOT copy into `data/scenarios/essays/` or `essay_index.json` until (1) the panel signs off and (2) the extractor supplies ICTY citations for the route/numbers.** Follows the `srebrenica_falls_1995.json` pattern (title/event_id/year/category/sources[]/generated/content) and the §6 `source_note` boundary discipline (provenance-only; no casualty figures / equipment quantities / alternate-outcome-prevention framing in the source_note itself). Pairs as a sequel to `srebrenica_falls_1995`.

```json
{
  "id": "essay_srebrenica_column_1995",
  "event_id": "srebrenica_column_1995",
  "title": "The Column: The Breakout from Srebrenica",
  "year": 1995,
  "category": "humanitarian",
  "sources": [
    "ICTY Krstic Trial Judgment (IT-98-33-T), the column and the executions along its route",
    "ICTY Popovic et al. Trial Judgment (IT-05-88-T)",
    "ICTY Mladic Trial Judgment (IT-09-92-T), Srebrenica",
    "ICJ Bosnia v. Serbia (2007), genocide finding",
    "ICTY Blagojevic & Jokic Trial Judgment (IT-02-60-T)"
  ],
  "generated": true,
  "content": "When Srebrenica fell on 11 July 1995, thousands of Bosniak men — soldiers of the ARBiH 28th Division and military-age civilians who feared capture — did not go to the United Nations compound at Potočari. Instead they gathered in the villages of Šušnjari and Jaglići on the enclave's northwestern edge and, through the night of 11–12 July, set out in a single vast column to walk to Bosnian-government territory near Tuzla, more than a hundred kilometers to the northwest across Serb-held ground. The Tribunal estimated the column at ten to fifteen thousand men, roughly a third of them soldiers of the 28th Division, and not all of them armed.\n\nThe column moved through forest and over ridgelines under near-constant attack. Bosnian Serb forces shelled its length, ambushed it at defiles such as Kamenica, and at points induced or compelled large groups to surrender with promises of safety that were not kept; many who surrendered along the route were executed and buried in mass graves, findings later established in detail before the International Criminal Tribunal. Only a portion of those who set out reached safety: after days of fighting, a breakthrough near Baljkovica opened a corridor to Nezuk, where survivors crossed into territory held by the ARBiH 2nd Corps.\n\nThe human toll of the fall of Srebrenica — at Potočari and along the column together — was the subject of the Tribunal's genocide findings in Prosecutor v. Krstić and the judgments that followed. Of the column of ten to fifteen thousand, the Tribunal found that between eight and ten thousand men were eventually reported as missing. The old formations of the enclave, in effect, ceased to exist as coherent units; only a portion of those who set out reached Bosnian-held territory, a remnant gathered around the survivors of the march, which was in time reformed under the same divisional name.\n\nThe breakout became one of the defining images of the war's final summer: not a battle in any conventional sense, but a forced passage through hostile country in which a community's fighting men were killed in their thousands and a fraction emerged to fight on under the same divisional name. It is remembered in Bosnia as the Marš smrti — the March of Death."
}
```

**§6 notes for the panel:** atrocity is narrated as tragedy and legal fact (ICTY-adjudicated), conferring **no** territorial or negotiating benefit on the perpetrator — the RS costs live entirely on the fall event. Every figure in the prose is cited to a *Krstić* paragraph (§1) or is an explicit bracketed gap awaiting an ICTY citation; no Balkan Battlegrounds material is used. Any survivor/reconstitution number must come from a cited ICTY paragraph before wiring. A matching event `source_note` (provenance-only, boundary phrases per `tests/codex_sensitive_history_source_notes.test.ts`) is required if a discrete `srebrenica_column_1995` event row is added; alternatively the essay can attach to the existing `srebrenica_falls_1995` event as a second-tier Codex entry (simpler; avoids a new event row).

---

## 4. Lane (c) — extraction (running)

The BB extraction (`docs/40_reports/research/20260805_SREBRENICA_ZEPA_1995_COLUMN_KB_EXTRACTION.md`) completed, but per the **owner directive (2026-08-05) it is DISREGARDED as a source** — Balkan Battlegrounds is too unreliable for this material. Its only remaining value is negative evidence: it confirmed BB does not even contain the fall narrative (the massacre scale, the genocide finding, and the column route are absent from the KB). **All sourcing for this lane is ICTY primary documents** (§1, verified against the *Krstić* judgement text). The remaining open citation work is a paragraph-level pass against ICTY judgements for: the genocide finding (*Krstić* Part III / Appeals Judgment), any survivor/reconstitution figure, and Žepa's July-1995 fate (*Tolimir* IT-05-88/2). No BB citation may appear in the shipped essay or in re-grounded code comments.

## 5. Governance / sequencing

1. Extractor completes → citations land.
2. **§6 Pyrrhic panel** reviews this whole doc (spec + essay draft): Historian (facts/citations), narrative-designer (prose), game-designer (mechanic intent), Engine/systems (effect wiring + determinism + calibration), Red-team (§6 bright lines). Unanimous GO = signature.
3. On GO: build lane (a) behind an env flag, 188w-validate against the 630 floor + §6 anchors, panel sign-off; wire lane (b) essay with filled citations. One change per run.
4. Until then: **nothing here is shipped.** This is a proposal.

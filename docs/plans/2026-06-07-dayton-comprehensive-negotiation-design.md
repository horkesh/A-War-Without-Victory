# Dayton Endgame — Comprehensive Negotiation Package (Design)

**Status:** DESIGN PROPOSAL, owner-requested 2026-06-07. Read-only research + design; no code yet.
**Owner direction:** the Dayton endgame should negotiate not only the **map** but the **detailed state structure** — entity autonomy, jurisdictions/competencies, constitutional architecture, return/justice.
**Convening:** Pyrrhic Historian + Game-Designer + Tech-Architect. **Recommendation: Option 2.**

---

## Part I — Historical research (ICTY/primary-first)

### 1. The instrument
The **General Framework Agreement for Peace in BiH (GFAP / "Dayton")** was initialled at Wright-Patterson AFB on **21 Nov 1995**, signed in **Paris 14 Dec 1995** by RBiH (Izetbegović), Croatia (Tuđman), and the FRY (Milošević — **signing for the Bosnian Serbs**, who were deliberately sidelined). It has **11 Annexes**. The negotiation's deliverables map to the game's dimensions:

| Annex | Subject | Game lever |
|---|---|---|
| 1-A / 1-B | Military / IFOR + arms-control | background |
| **2** | **IEBL + Brčko arbitration** | **territorial** |
| 3 | Elections (OSCE) | background |
| **4** | **Constitution of BiH** | **constitutional architecture** |
| 6 / **7** | Human Rights / **Refugee return** | **return & justice** |
| **10** | **OHR (High Representative)** | **the "supervised peace" Pyrrhic hook** |
| **11** | **IPTF** | police/justice |

### 2. Constitutional architecture (Annex 4 — verified primary text)
- **Art III(1) — state-level competencies (the ONLY enumerated central powers):** foreign policy; foreign trade; customs; monetary; institutional finances/international obligations; immigration/refugee/asylum; international & inter-Entity criminal-law enforcement; common/international communications; inter-Entity transport; air-traffic control.
- **Art III(3)(a) — residual clause (the decentralization keystone):** *"All governmental functions and powers not expressly assigned … to the institutions of Bosnia and Herzegovina shall be those of the Entities."* → **Dayton is a residual-powers-to-the-Entities constitution.** Defense (until 2003–06 reforms), police, education, health, judiciary, taxation defaulted to the two Entities (Republika Srpska + Federation of BiH). **Art III(5)** allows upward transfer by agreement (the reform escape hatch).
- **Art IV — Parliamentary Assembly (gridlock by design):** House of Peoples 15 (5 Croat + 5 Bosniak + 5 Serb); House of Representatives 42 (2/3 Federation, 1/3 RS); **vital-national-interest veto** (IV(3)(e)) + **entity voting** (2/3 of either Entity's delegates blocks).
- **Art V — tripartite rotating Presidency** (one Bosniak + one Croat from the Federation, one Serb from RS); **vital-interest objection** (V(2)(d)) → entity-legislature 2/3 block (entity veto over the head of state).
- **Art VI — Constitutional Court (9):** 4 Federation, 2 RS, **3 international judges** (appointed by the President of the ECtHR) — constitutionalized international tutelage.
- **Annex 10 (OHR):** High Representative as final civilian-implementation authority; **Bonn Powers (1997)** to impose laws / remove officials — the "supervised, not sovereign" signature.
- **Brčko (Annex 2):** unresolved at Dayton; **deferred to international arbitration** (Milošević's last-moment proposal); 1999 → **Brčko District** condominium of both Entities.

### 3. The territorial negotiation
- **51:49 split** descends from the **Contact Group plan (5 Jul 1994)**; Federation accepted, RS Assembly rejected (3 Aug 1994); the 1995 Federation/Croatia offensives physically produced ~51:49, which Dayton ratified.
- **Washington Agreement (Mar 1994)** created the **Federation of BiH** (Bosniak-Croat, 10 cantons) — HRHB autonomy lives in the **cantons**, not a third entity.
- **Holbrooke shuttle (Aug–Oct 1995):** dealt only with Milošević, forcing the Bosnian Serbs to surrender their negotiating rights. **If the player is RS, agency is structurally mediated through Belgrade — exactly the patron_confidence/override mechanism the engine already models.**
- **Sticking points:** Sarajevo (RS traded the besieged suburbs for the Federation reunifying the city); the **Goražde "Clark Corridor"** land bridge; the **Posavina/Brčko** RS east-west lifeline (the hardest knot).

### 4. The Pyrrhic thesis (what the game must capture)
Dayton **stopped the killing and entrenched the partition** — the textbook negative-sum endgame: it rewarded ethnic territorial control with constitutional status, built gridlock-by-design, and created OHR dependency. The 2009 ECtHR **Sejdić–Finci** judgment found the constituent-peoples electoral structure discriminatory — the peace's founding compromise is itself a recognized injustice. **The dysfunction the player authors is real, lasting, and measurable.**

---

## Part II — The existing engine (what's built; where to extend)

- **Capital model (the deterministic spine — already what we spend at Dayton):** `compute_capital.ts` accrues raw war data; `strategic_dimensions.ts` derives six 0–100 dimensions (military_credibility, territorial_legitimacy, international_standing, patron_confidence, internal_cohesion, negotiating_leverage), faction-weighted (`DIMENSION_WEIGHTS`) into composite capital. **The budget is earned by playing the war, not entered at the table** — the anti-power-fantasy guardrail.
- **The table (`dayton_negotiation.ts`):** fires week 188 (or all patrons force it ≥95). `initiateDaytonNegotiation` builds `pending_dayton`; UI reads, never computes. Player submits `{territorial_demands[], territorial_concessions[], institutional_choices{}}`; `resolveDaytonNegotiation` runs bot responses (`bot_negotiation.ts`) + patron-override (≥75) → `DaytonResult` + frozen endgame snapshot.
- **Territorial packages (`territorial_packages.ts`):** 8 — already the historical sticking points (gorazde_corridor, brcko_district, posavina_pocket, sarajevo_suburbs, western_bosnia, mostar, central_bosnia, srebrenica_area).
- **Institutional packages (`institutional_packages.ts`):** 6 binary centralized|decentralized dims (military, presidency, police, judiciary, economy, education) — the foundation the "state-structure" ask extends. Asymmetric costs (centralized costs RS; decentralized costs RBiH; HRHB pays half as the swing).
- **Counter-offer engine (`counter_offer_generator.ts` + `historical_envelopes.ts`):** a cited, envelope-bounded, chain-depth-2 dialogue system — wired for interim peace plans, **not yet for the Dayton table. A ready-made extension point.**
- **Verdict/ledger (`scoring.ts` + `cost_ledger.ts` + `endgame_snapshot.ts`):** per-faction grade capped by war_cost_index (emergent-gated atrocity bright line), tainted by locked condemnation flags (`negotiated_escape` already canon for Dayton-equivalent compromise = Grade B). **CRITICAL GAP:** `institutional_choices` are stored in `DaytonResult` but **nothing scores them.** "How dysfunctional a peace did you author?" is produced but never graded — the highest-value wiring opportunity.

---

## Part III — Design proposal

### A. Five negotiation dimensions (the state-structure ask, made concrete)
Promote the constitutional negotiation from 6 flat toggles to a structured 5-dimension package, each grounded in the verified Annex-4 text, each feeding a new `peace_dysfunction_index`:

1. **Territorial (built; keep + relabel).** 8 packages + a derived IEBL %-split readout vs 51:49 + a **Brčko** tri-state (`federation | rs | arbitration-district`, Annex 2).
2. **Entity autonomy level (NEW; master dial).** `confederation | dayton-historical | federalized | unitary` — "how much sovereignty does RS retain." One field that sets cost multipliers and pre-seeds Dimension 3 defaults.
3. **Jurisdiction / competency allocation (NEW; replaces the 6 flat toggles).** Each competency `state | entity` (a few support `shared/arbitrated`), with the **historical Dayton default pre-selected and labelled**: foreign policy/trade/customs/monetary/citizenship = **state** (Art III(1)); **defense / police / judiciary / education / taxation = entity** (the residual clause). Flipping reveals what you move away from.
4. **Constitutional architecture (NEW; the gridlock authorship).** Presidency (`tripartite-rotating | single-elected | collective-non-ethnic`); veto regime (`vital-interest+entity-voting | simple-majority | weighted`); constituent-peoples (`three-peoples | civic-citizens` — the Sejdić–Finci fault line); Constitutional Court (`international-judges | domestic-only`); OHR authority (`bonn-powers | monitoring-only | none`).
5. **Return & justice (NEW; Annex 7 + condemnation flags).** Refugee return (`full-right-of-return | voluntary-only | frozen-lines`); ICTY cooperation (`full | conditional | non-cooperation`). **Hard rule (already canon):** Ring-2 condemnation flags (genocide/atrocity) are **NOT tradeable** here; return/justice choices mitigate verdict *tone* but never erase a locked rupture.

### B. The mechanic (deterministic, anti-power-fantasy)
Reuse the existing capital→cost→bot/patron→verdict spine. Three extensions:
1. **Cost model:** `competency_costs.ts` + `constitutional_costs.ts` (mirror `institutional_packages.ts` asymmetric costs), multiplied by the `entity_autonomy` dial. **You cannot draft a unitary state from a losing military position** — the constitution you can author is bounded by the war you fought (exactly as Holbrooke's leverage was bounded by the 1995 battlefield).
2. **Bot + patron resolution reuse:** each structural choice resolves through `evaluateBotResponse` / patron-override. **Milošević-speaks-for-Pale is modelled exactly** (Belgrade override forces RS concessions). For depth, wire the cited `counter_offer_generator` envelopes into the Dayton table → bounded counter-offers (chain-depth 2) instead of single accept/reject.
3. **Verdict feed (the keystone):** `compute_peace_dysfunction.ts` → a pure deterministic `peace_dysfunction_index` (0–1) + structural flags (`frozen_partition`, `gridlock_by_design`, `ohr_dependency`, `ratified_cleansing`, `sejdic_finci_fault`), folded into `computeFullVerdict` as a grade modifier + OutcomeClass discriminator. A high-territory RBiH peace that is also maximally gridlocked/dependent reads as `hollow_victory`, not `strategic_success`. Emergent-gated → historical baselines byte-identical.

**Not a power fantasy:** choices bounded by earned capital; bots/patrons push back; **every choice costs in the verdict; there is no "win" stop** — both extremes (over-centralize / frozen partition) feed dysfunction. The optimum is *the least-bad version of a tragedy*.

### C. Options
- **Option 1 — "Surface the structure you already shaped"** (single-round; structured 5-dim view pre-filled from war state; add `peace_dysfunction_index`). Low effort; emphasizes constraint over agency.
- **Option 2 — "Issue-by-issue across all 5 dimensions" (RECOMMENDED).** Option 1 + multi-round cited-envelope counter-offer dialogue (2–3 rounds); full verdict feed + narration. Medium effort, maximal reuse, strongest Pyrrhic fit. Ring-1, no §6, emergent-gated → baseline byte-identical.
- **Option 3 — "Full constitutional design surface"** (Option 2 + live House-of-Peoples seat math / vital-interest veto simulation / post-war governability projection + epilogue). High effort; dilution risk; a clean **follow-on lane**, not core.

**Recommendation: Option 2** — delivers "detailed state-structure, not just the map" in full, reuses every built subsystem, lands the `peace_dysfunction_index` payload, stays no-§6/emergent-gated.

### D. Build lanes (each a self-contained PR; emergent-gated; baseline byte-identical each step)
1. **D1 — data + types (additive):** new `competency_packages.ts`, `constitutional_packages.ts`, `compute_peace_dysfunction.ts`; extend `DaytonProposal` (+ competency_allocation, constitutional_choices, return_justice, entity_autonomy, brcko_status) and `DaytonResult` (+ peace_dysfunction_index, structural_flags) — all optional, backward-compatible. *Historian sign-off on every Annex-4 default.*
2. **D2 — resolution + verdict wiring:** `dayton_negotiation.ts` (resolve new dims via existing bot/patron path), `bot_negotiation.ts` (cost them), `scoring.ts` (fold dysfunction into grade cap + classifyOutcome, emergent-gated). `endgame_snapshot.ts` auto-freezes.
3. **D3 — counter-offer envelopes for Dayton (Option 2 depth):** add cited Dayton-table envelopes to `counter_offer_generator.ts` + `historical_envelopes.ts` (chain-depth 2). *Historian sign-off mandatory — each bot position cites a real 1994–95 negotiating position.*
4. **D4 — UI:** `DaytonNegotiationModal.tsx` → 5-dim structured layout (autonomy dial → competency grid → constitutional choices → return/justice → live IEBL/dysfunction readout) + multi-round panel. *narrative-designer: the verdict must narrate the authored dysfunction in player-legible prose.*
5. **D5 — canon propagation:** `VICTORY_AND_PYRRHIC_SCORING.md` (dysfunction term), Systems Manual (Dayton mechanic), `WAR_TERMINATION_SPEC.md`. **Never auto-edit FORAWWV.md** — flag for manual review.

### E. Owner sign-off required before build
1. Pick Option 1/2/3 (recommend 2).
2. Approve `entity_autonomy` as the master dial + `peace_dysfunction_index` feeding the verdict (changes how endgames *grade* — design-defining, though baseline-safe).
3. Confirm the anti-power-fantasy stance (costs bind; no "win" stop; condemnation flags non-tradeable).
4. Historian review gate on every cited bot/patron position (D3) and every Annex-4 default (D1) — ICTY-first / cross-check per the 2026-06-04 directive.

### Determinism/canon
All Ring-1, no §6 (no atrocity/OOB/controller mutation), no RNG/timestamps, sorted via `strictCompare`. Emergent-gated → historical 52w/40w/188w byte-identical by construction (same guard the atrocity term in `scoring.ts` uses).

### Key files
Engine: `src/sim/negotiation/{dayton_negotiation,bot_negotiation,territorial_packages,institutional_packages,counter_offer_generator,compute_capital,scoring}.ts`; types `src/state/negotiation_types.ts`; dims `src/sim/events/strategic_dimensions.ts`; freeze `src/sim/endgame/{endgame_snapshot,cost_ledger}.ts`; UI `src/ui/map/components/{DaytonNegotiationModal,VerdictScreen}.tsx`; canon `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`.

### Primary sources
ICTY / U. Minnesota Human Rights Library — GFAP framework + **Annex 4 (Constitution of BiH)** full text (Art III/IV/V/VI verified verbatim): hrlibrary.umn.edu/icty/dayton/. OHR — Annex 4 & Annex 10: ohr.int/dayton-peace-agreement/. U.S. State Dept — "Bosnia: Road to the Dayton Peace Agreement." Contact Group 51:49 (5 Jul 1994); Washington Agreement (Mar 1994). Cross-checked vs primary Annex text per the BB-not-ultimate directive.

# Event Family Worksheet — X7: UN Safe-Areas System

**Date:** 2026-05-27
**Family ID:** X7
**Faction scope:** cross-faction (composite — engine-driven, not a player decision row at the family level)
**Source tier:** `icty_icj_un` (UN Security Council Resolutions 819 / 824 / 836 / 844; Krstić IT-98-33; Mladić IT-09-92-T; Karadžić IT-95-5/18-T)
**Sensitive-history ring:** Ring 1 (safe-area regime is the legal substrate for the Srebrenica genocide rupture; family itself is a diplomatic-process composite, but its downstream coupling is sensitive)
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

Between April and June 1993 the UN Security Council constructed a "safe-areas" regime over six enclaves inside Bosnia-Herzegovina through four resolutions adopted in rapid succession:

- **UNSCR 819 (16 April 1993)** — declared **Srebrenica and its surroundings** a "safe area which should be free from any armed attack or any other hostile act," demanded VRS withdrawal, and authorized UNPROFOR augmentation to monitor the humanitarian situation. Adopted in the days after the Drina valley collapse (Cerska, Konjević Polje) and Morillon's symbolic stand at Srebrenica. (UN S/RES/819 (1993); Krstić IT-98-33 Trial Judgment §§17-29.)
- **UNSCR 824 (6 May 1993)** — extended safe-area status to **Sarajevo, Tuzla, Žepa, Goražde, and Bihać**, plus their surroundings, on the same legal framing as 819. (UN S/RES/824 (1993).)
- **UNSCR 836 (4 June 1993)** — authorized UNPROFOR to **"use force, including the use of air power"** in reply to bombardments against safe areas, to deter attacks, and to support the freedom of movement of UNPROFOR. This is the legal basis for subsequent NATO air operations, though the dual-key UN/NATO arrangement meant authorization existed largely on paper through 1993-mid-1995. (UN S/RES/836 (1993); Mladić IT-09-92-T Trial Judgment vol. III §§3104-3145 on the dual-key gap.)
- **UNSCR 844 (18 June 1993)** — authorized a 7,600-troop UNPROFOR reinforcement for safe-area implementation; only ~3,000 of those troops were ever fielded. (UN S/RES/844 (1993).)

The regime's structural pathology was the **gap between mandate and means**: protection promised, enforcement deferred. The Bosnian Serb leadership read this gap correctly. Mladić's "Krivaja-95" operation (6-11 July 1995) was the terminal stress test: VRS forces overran Srebrenica's UNPROFOR DUTCHBAT lines without losing a single Bosnian Serb soldier to UN return fire, separated military-age males from women and children, and executed ~8,000 Bosniak men and boys between 11-22 July 1995. The Žepa enclave fell 25 July 1995. (Krstić IT-98-33 Trial Judgment §§37-84 on the fall and the killings; Mladić IT-09-92-T Trial Judgment vol. III §§3198-3650 on the genocide as Joint Criminal Enterprise; Karadžić IT-95-5/18-T Trial Judgment vol. III §§5631-5852 on the safe-area regime collapse.)

Goražde survived the war as a Bosniak enclave under siege; Sarajevo, Tuzla, and Bihać survived under partial siege. The regime "worked" for four of the six enclaves only because they were larger, better-armed, or better-supplied via corridor — not because the safe-area legal framework delivered protection. (Krstić §§17-29 framing; Mladić vol. III §§3104-3145.)

X7 is therefore properly modeled in this packet not as a player-decision row but as an **engine-driven composite gate** that:
1. Triggers when UNSCR 819 / 824 / 836 / 844 fire in sequence (existing event rows `un_resolution_819_srebrenica_1993`, `un_safe_areas_declared_1993`, `un_resolution_836_force_1993`, plus a pending 844 row).
2. Conditions downstream enclave-resilience dynamics (B5 Srebrenica demilitarization compliance, B9 NATO ultimatum, R10 follow-on, R13 Deliberate Force compliance, B7 Sarajevo siege).
3. Establishes the rupture-predicate substrate for `srebrenica_falls_1995` / `srebrenica_genocide_1995` (Ring 3 rupture; binds emergently on game-state condition per SENSITIVE_HISTORY_DESIGN_GATE §2 criterion-3, not by player choice at the X7 level).

## 2. Defensible Historical/Default Option (Composite Framing)

X7 is **not a player-decision row**. Per packet §4 X7: "composite — engine-driven" with historical/default candidate marked `n/a`. The historical "outcome" is the documented safe-area regime sequence:

- **819 → 824 → 836 → 844 fired in historical order, April-June 1993.**
- **Enforcement gap persisted** through 1993-mid-1995, leading to:
  - Srebrenica genocide July 1995 (rupture, emergent).
  - Žepa fall July 1995 (engine-driven outcome).
  - Goražde, Sarajevo, Tuzla, Bihać survival (engine-driven, conditional on other factors).

- **Citation:** UN S/RES/819, 824, 836, 844 (1993); Krstić IT-98-33 Trial Judgment §§17-84; Mladić IT-09-92-T Trial Judgment vol. III §§3104-3650; Karadžić IT-95-5/18-T Trial Judgment vol. III §§5631-5852.

There is no per-faction `historical_default_response_id` for X7 itself; the per-faction decision rows that interact with the X7 substrate are:

- **R10 (UN safe-area enforcement)**: packet §4 marks "follow-on consequences only — not a player decision row for RS in the current design."
- **R12 (RS hostage crisis response, May 1995)**: discrete decision row, gates on `un_resolution_836_force_1993` having fired.
- **R13 (Deliberate Force compliance, Sep 1995)**: discrete decision row, gates on the 836 use-of-force authorization being activated by NATO.
- **B5 (Srebrenica demilitarization 1993)**: discrete decision row, gates on `un_resolution_819_srebrenica_1993`.
- **B7 (Sarajevo siege response)**: packet §4 marks "follow-on — currently engine-driven."
- **B9 (NATO ultimatum compliance, Sarajevo HWEZ Feb 1994)**: discrete decision row, gates on UNSCR 836 use-of-force authorization.

X7 is the analytical row that names the diplomatic-process substrate these per-faction decisions sit on. It does not author a fourth options set.

## 3. Proposed Counterfactual Options (Composite Branch Flow — Engine-Driven Only)

X7 does not author response options. Per packet §4 X7 "counterfactual options" column: `n/a`. The composite branch state is **engine-derived** by reading the per-faction flags from R10, R12, R13, B5, B7, B9 together with the resolution-firing log.

### Composite outcome states (engine-derived, not player-authored)

| 819 fired | 824 fired | 836 fired | 844 fired | Enforcement state | Composite tag |
|---|---|---|---|---|---|
| ✓ | ✓ | ✓ | ✓ | Mandate-without-means (historical) | `safe_areas_promised_unenforced` |
| ✓ | ✓ | ✓ | ✓ | Mandate-with-means (counterfactual — 844 troops fielded in full + 836 dual-key resolved) | `safe_areas_enforced` |
| ✓ | ✓ | ✓ | ✗ | Mandate-without-troop-uplift (counterfactual — historical 844 troop fielding actually was ~3,000/7,600) | `safe_areas_promised_no_troops` |
| ✓ | ✗ | ✗ | ✗ | Srebrenica-only carve-out (counterfactual — UNSC stalls at 819) | `safe_areas_srebrenica_only` |

- **Historical state**: `safe_areas_promised_unenforced`. This is the substrate every downstream Ring-1 row gates on.
- **Counterfactual `safe_areas_enforced`**: opens by aggregate of B5 `comply_fully`, R12 `release_gradually`, R13 `withdraw_heavy_weapons`, plus UNSCR 844 troop-uplift counterfactual (no current row authors this — would require a new "UN reinforces UNPROFOR" event proposal; defer).
- **Sensitive-history check:**
  - All composite outcome states are sensitive-content-neutral at the X7 level — they describe the regime's enforcement state, not authored atrocity.
  - **The Ring 3 rupture coupling lives in the downstream-event-row layer, not at X7.** Specifically: `srebrenica_falls_1995` / `srebrenica_genocide_1995` rupture predicates bind on emergent game-state (RS controls `op:srebrenica:srebrenica_2` AND enclave_formed_flag AND turn ≥140) per SENSITIVE_HISTORY_DESIGN_GATE §2 criterion-3. X7 substrate determines *whether the enclave is formed and resilient* through B5 / R10 / R13 effects, but X7 itself does not authorize the rupture; the rupture binds emergently when the game-state condition is satisfied. Ring 3 #1 (no commit-genocide decision tree) and Ring 3 #10 (no gamified prevent-genocide mechanic) constrain how the counterfactual `safe_areas_enforced` outcome is presented in any future modal: it must not be framed as a player "save Srebrenica" lever; it must describe regime enforcement as a multi-actor diplomatic-process outcome that *changes the substrate* under the rupture predicate.

## 4. Material Effects (per packet §3.3)

X7 itself authors no `effects[]`, no `dimension_shifts[]`, no `sets_flags`. The composite tag is **read** at downstream trigger evaluation. The material effects flow through the constituent resolution rows (already authored) and the per-faction decision rows that interact with the substrate.

### Constituent resolution-row effects (already authored — referenced here for composite coherence)

- **`un_resolution_819_srebrenica_1993`** (already authored, war_1993.json):
  - `sets_flags`: `srebrenica_safe_area_declared: true`
  - Downstream coupling: enables B5 Srebrenica demilitarization decision.
- **`un_safe_areas_declared_1993`** (already authored, war_1993.json):
  - `sets_flags`: implicit through `requires_events` on 836, B7, B9, etc.
  - Downstream coupling: gates UNSCR 836 row.
- **`un_resolution_836_force_1993`** (already authored, war_1993.json):
  - Downstream coupling: legal basis for NATO air ops; gates B9 (Feb 1994 Sarajevo HWEZ ultimatum) and R13 (Sep 1995 Deliberate Force compliance).
- **UNSCR 844 row** (pending — recommend authoring as `un_resolution_844_unprofor_uplift_1993`):
  - Authoring proposal: Phase D author this row with source UN S/RES/844 (1993). `sets_flags: un_protective_troop_uplift_authorized: true`. Effect: dimension_shift `international_standing: +1` for RBiH (paper-only, no material flip). Note the historical ~3,000/7,600 actual deployment as a `historical_source` annotation.

### Composite tag derivation (engine read-only)

Engine derives `x7_safe_areas_regime` flag at trigger-time by reading:
```
if (819 fired AND 824 fired AND 836 fired):
  if (B9 = comply AND R13 = withdraw AND B5 = comply_fully AND 844 troop uplift fielded):
    x7_safe_areas_regime = 'safe_areas_enforced'
  else if (819 fired AND 824 not fired):
    x7_safe_areas_regime = 'safe_areas_srebrenica_only'
  else:
    x7_safe_areas_regime = 'safe_areas_promised_unenforced'   // historical
```

This is a meta-evaluator computation, not a stored authoritative flag. Open question §7.1 below asks Technical Architect to confirm whether engine derives it on-read or whether a Phase B writer materializes it on resolution-row fire.

## 5. Downstream Opens/Closes

X7 does not directly call `enables_events_runtime` / `closes_events_runtime` (no response options exist on this composite row). Downstream events gate on the **composite tag** through the constituent resolution rows' own runtime arrays.

- **Opens (eligibility) — via constituent resolution rows:**
  - `srebrenica_demilitarization_1993` (B5 — pending)
  - `nato_sarajevo_hwez_ultimatum_1994` (B9 — pending)
  - `deliberate_force_1995` / RS R13 `withdraw_heavy_weapons` decision row (pending)
  - `un_hostage_crisis_1995` (R12 — already authored)
  - **Substrate for** `srebrenica_falls_1995` / `srebrenica_genocide_1995` rupture predicate (rupture is emergent; X7 substrate determines enclave-resilience inputs, not the rupture itself)
- **Closes (eligibility):** none in Phase A. The safe-areas regime persists through the war.
- **Branch-tag:** `diplomacy_un_safe_areas` (proposed new vocabulary slot under `diplomacy_*` per packet §2.2). Sub-tags: `safe_areas_promised_unenforced` (historical), `safe_areas_enforced` (counterfactual), `safe_areas_promised_no_troops`, `safe_areas_srebrenica_only`. Phase A worksheet locks this into the branch-tag vocabulary file.

## 6. Modal Source Notes

X7 is engine-driven; no player modal is rendered for X7 itself. Per-faction rows (R12, R13, B5, B9) carry their own modal copy. The composite substrate may surface in the Codex / Chronicle / Cost Ledger as a diplomatic-process annotation:

> "The UN safe-areas regime (UNSC 819 / 824 / 836 / 844, April-June 1993) declared six enclaves protected without committing the troops or rules-of-engagement to enforce protection. The mandate-without-means gap persisted through July 1995 (Krstić IT-98-33; Mladić IT-09-92-T vol. III §§3104-3650; Karadžić IT-95-5/18-T vol. III §§5631-5852)." (≤2 sentences after compression.)

## 7. Open Questions

1. **Composite tag derivation: engine on-read vs. writer-on-fire.** X7 substrate state is the AND of multiple per-faction flag reads. Phase B Technical Architect must decide whether the meta-evaluator computes `x7_safe_areas_regime` on each downstream trigger-condition evaluation (cheaper, no migration), or whether a writer materializes the flag on every constituent-row fire (deterministic-write substrate, requires migration). Recommend on-read derivation in a shared `getX7CompositeState()` helper to avoid migration bloat. Defer to Technical Architect.
2. **UNSCR 844 row authoring.** Packet §4 X7 implicitly references 819 / 824 / 836 but not 844; the actual safe-areas legal architecture includes 844 as the troop-uplift authorization. Recommend Phase D author `un_resolution_844_unprofor_uplift_1993` as a low-effort companion row with no `requires_player_response`; flags-only effect. Defer to Game Designer.
3. **Rupture-substrate coupling transparency.** The X7 composite substrate determines enclave-resilience inputs that feed the Srebrenica rupture predicate. Ring 3 #10 (no gamified prevent-genocide mechanic) constrains how the counterfactual `safe_areas_enforced` state is surfaced to the player. Phase D narrative authoring of any Codex / Chronicle entry that describes the X7 substrate must avoid framing as a "save Srebrenica" lever; describe as multi-actor regime enforcement that changes the substrate. Defer to Narrative Designer + Sensitive-History Gate §6 sign-off.
4. **R10 placement: is R10 in X7's family scope or independent?** Packet §4 R10 marks "follow-on consequences only — not a player decision row." If R10 is a player-decision row in any future revision (e.g., RS chooses to mass artillery at Srebrenica vs. encircle), the X7 substrate must gate it. Recommend leaving R10 engine-driven per current packet posture; X7 substrate flows into R10 as conditions, not as a player surface.
5. **844 troop-fielding counterfactual.** The `safe_areas_enforced` composite-outcome state requires both per-faction compliance (B5/R12/R13) and an out-of-band UNPROFOR troop fielding to ~7,600. There is no current Bosnian-party row authoring the troop-uplift counterfactual; this would be an international-action row outside the three-faction decision frame. Phase D may need a stub `csq_*` consequences-family row representing the international-side counterfactual. Defer to Game Designer + Product Manager.

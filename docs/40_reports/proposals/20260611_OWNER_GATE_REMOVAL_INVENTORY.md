# Owner-Gate Removal Inventory — 2026-06-11

**Status:** EXECUTED 2026-06-11 on branch `docs/remove-owner-gate` (see Execution Log at end)  
**Directive:** Owner standing directive 2026-06-11 — remove the owner gate from docs, including FORAWWV.md and all canon docs. Replace with **Pyrrhic-panel sign-off** (unanimous = signature; BLOCK/split = surface to owner).  
**Scope:** `CLAUDE.md`, `docs/10_canon/`, `docs/20_engineering/`, `docs/plans/`, `docs/40_reports/` (live governance surfaces only — not archived reports).  
**Author:** Documentation Specialist (scoping pass — NO edits made here)

---

## Key Finding Upfront

**`docs/10_canon/FORAWWV.md` itself contains ZERO gating-process language.** It is pure canon substance. No edits are needed to FORAWWV.md's content. The ban on editing it lives entirely in *other* files (CLAUDE.md, CANON.md, PYRRHIC_PROCESS_RULES.md, EVENT_SYSTEM_AUTHORING_GUIDE.md, and scattered plan/proposal docs). Lifting the owner gate means updating those pointer files, not the target file.

**`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6** contains a live sign-off table that says "user approval required; not delegable" for "any change that could produce a reward for atrocity effect." This is the most consequential class-(A) hit in the canon tier. The proposed replacement routes through the Pyrrhic panel with a BLOCK-escalates-to-owner clause.

---

## Classification Key

- **(A) PROCESS-GATE-TO-REMOVE** — live gating language requiring owner sign-off; replace with Pyrrhic-panel sign-off per new delegation.
- **(B) HISTORICAL-RECORD** — past-tense log of a specific owner decision that already happened; leave as-is.
- **(C) AMBIGUOUS** — flag for orchestrator judgment before editing.

**Pyrrhic-panel sign-off standard (for all class-A replacements):**  
> "Pyrrhic-panel sign-off required (unanimous = signature; BLOCK or split verdict = surface to owner)."  
For §6 / "reward for atrocity" rows specifically:  
> "Pyrrhic §6-panel sign-off required: `/historian` + `/narrative-designer` + `/game-designer` + `/war-or-game`, unanimous = signature; BLOCK or split = surface to owner."

---

## FILE-BY-FILE INVENTORY

---

### 1. `CLAUDE.md`

#### Hit 1 — line 37 (Sacred Rules section)
**Current text:**
```
- **Never auto-edit** `docs/10_canon/FORAWWV.md` — flag for manual review.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
- `docs/10_canon/FORAWWV.md` is an editable canon doc. Direct edits require Pyrrhic-panel sign-off (unanimous = signature; BLOCK or split = surface to owner).
```

#### Hit 2 — line 68 (Ledger Protocol section)
**Current text:**
```
- Never auto-edit `docs/10_canon/FORAWWV.md`.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
- Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off.
```

---

### 2. `docs/10_canon/CANON.md`

#### Hit 3 — line 58 (Systemic Design Insights Rule)
**Current text:**
```
Systemic design insights discovered during implementation must be flagged for `docs/10_canon/FORAWWV.md` addendum. **Do not auto-edit FORAWWV.md.** Flag with note:
```
and the inline code block:
```
**docs/10_canon/FORAWWV.md may require an addendum** about [insight].
Do NOT edit FORAWWV automatically.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement (prose):**
```
Systemic design insights discovered during implementation should be incorporated into `docs/10_canon/FORAWWV.md` as an addendum. Addendum edits require Pyrrhic-panel sign-off (unanimous = signature; BLOCK or split = surface to owner). Flag with note:
```
and code block:
```
**docs/10_canon/FORAWWV.md may require an addendum** about [insight].
Apply addendum only after Pyrrhic-panel sign-off.
```

---

### 3. `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`

#### Hit 4 — line 198 (§6 Sign-Off table, "New rupture added" row)
**Current text:**
```
| New rupture added | `/historian` + `/war-or-game` + `/game-designer` + user approval |
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
| New rupture added | Pyrrhic §6-panel: `/historian` + `/war-or-game` + `/game-designer` + `/narrative-designer`, unanimous = signature; BLOCK or split = surface to owner |
```

#### Hit 5 — line 202 (§6 Sign-Off table, "New condemnation flag" row)
**Current text:**
```
| New condemnation flag | `/historian` + `/game-designer` + user approval |
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
| New condemnation flag | `/historian` + `/game-designer`, unanimous Pyrrhic sign-off; BLOCK or split = surface to owner |
```

#### Hit 6 — line 203 (§6 Sign-Off table, "Change to paramilitary policy surface" row)
**Current text:**
```
| Change to paramilitary policy surface | `/game-designer` + `/ui-ux-developer` + user review before implementation |
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
| Change to paramilitary policy surface | `/game-designer` + `/ui-ux-developer`, Pyrrhic panel sign-off before implementation; BLOCK or split = surface to owner |
```

#### Hit 7 — line 207 (§6 Sign-Off table, "reward for atrocity" row)
**Current text:**
```
| Any change that could produce a "reward for atrocity" effect | User approval required; not delegable |
```
**Class: (C) AMBIGUOUS** — The "reward for atrocity" non-delegability is the most sensitive row in the entire codebase. The owner has said "you are authorized to go §6 — just always assemble the team before making a decision," which implies panel-with-escalation is sufficient. However, the language "not delegable" was also cited in `EVENT_SYSTEM_AUTHORING_GUIDE.md:164` as a canonical anchor for §6 packet authoring. Recommend orchestrator confirm: should this become "Pyrrhic §6-panel, unanimous; BLOCK = surface to owner" (full delegation) or "Pyrrhic §6-panel, unanimous; BLOCK or any doubt = surface to owner" (softer delegation retaining an explicit escalation trigger)?

**Proposed replacement (pending orchestrator confirmation):**
```
| Any change that could produce a "reward for atrocity" effect | Pyrrhic §6-panel sign-off required: `/historian` + `/narrative-designer` + `/game-designer` + `/war-or-game`, unanimous = signature; BLOCK, split, or reasonable doubt = surface to owner |
```

#### Hit 8 — line 218 (§6 Escalation clause)
**Current text:**
```
Any sign-off dispute escalates to the user. Do not resolve sensitive-history disputes inside role review without explicit user authorization. When in doubt, the answer is "no, not yet, bring it to the user."
```
**Class: (A) PROCESS-GATE-TO-REMOVE** — the word "user" here means owner; this is an active gating instruction.  
**Proposed replacement:**
```
Any sign-off dispute escalates to the Pyrrhic panel for a formal vote. A BLOCK verdict or any split escalates to the owner. Do not resolve sensitive-history disputes inside role review without panel sign-off. When in doubt, the answer is "no, not yet, bring it to the panel."
```

---

### 4. `docs/20_engineering/PYRRHIC_PROCESS_RULES.md`

#### Hit 9 — line 106 (Sacred Rules mirror)
**Current text:**
```
- **Never auto-edit FORAWWV.md**: Flag for manual review.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
- **FORAWWV.md is editable**: Direct edits require Pyrrhic-panel sign-off (unanimous = signature; BLOCK or split = surface to owner).
```

---

### 5. `docs/20_engineering/EVENT_SYSTEM_AUTHORING_GUIDE.md`

#### Hit 10 — line 164 (§6 packet precedent note)
**Current text:**
```
Per canon §6.3, user approval is non-delegable on any change that could produce a "reward for atrocity" effect. Packets 40, 41, 42 all required user sign-off because every one of them touched that risk.
```
**Class: (C) AMBIGUOUS** — The sentence "Packets 40, 41, 42 all required user sign-off" is both a live process instruction AND a historical record of what those packets required. The first sentence is a live gate reference; the second is historical. Recommend splitting: update the first sentence to Pyrrhic-panel language; keep the historical sentence intact (reclassify as descriptive record).

**Proposed replacement (first sentence only):**
```
Per canon §6.3, Pyrrhic §6-panel sign-off is required on any change that could produce a "reward for atrocity" effect (unanimous = signature; BLOCK or split = surface to owner). Packets 40, 41, 42 all required this review because every one of them touched that risk.
```

#### Hit 11 — line 379 (Don'ts list)
**Current text:**
```
- Do NOT auto-edit `docs/10_canon/FORAWWV.md` per CLAUDE.md. Flag for manual review.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
- Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off per CLAUDE.md.
```

#### Hit 12 — line 449 (diagram label "non-delegable")
**Current text** (within an ASCII flow-diagram box):
```
       | non-delegable      | + cost-floor  | +------+------+
```
**Class: (C) AMBIGUOUS** — This is inside an ASCII art diagram. The label "non-delegable" refers to the §6 user-approval box in the decision flow. It would need the diagram redrawn or the label changed to "panel sign-off" to be accurate. Low impact; diagram is illustrative. Recommend orchestrator decision: update diagram label to "panel sign-off" or leave as illustrative shorthand.

---

### 6. `docs/20_engineering/ADR/ADR-0007-standing-og-defensive-model.md`

#### Hit 13 — line 9 (Governance note, Phase-A default-flip gate)
**Current text:**
```
Any future Phase-A default-flip stays gated on **Guardrail-1 (war-cost conservation)** and the health invariant, per owner sign-off.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
Any future Phase-A default-flip stays gated on **Guardrail-1 (war-cost conservation)** and the health invariant, per Pyrrhic-panel sign-off (unanimous = signature; BLOCK or split = surface to owner).
```

#### Hit 14 — line 82 (Priority table, Stop Gate column)
**Current text:**
```
No default-flip / re-floor without owner sign-off; Guardrail-1 war-cost gate must pass
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
No default-flip / re-floor without Pyrrhic-panel sign-off; Guardrail-1 war-cost gate must pass
```

---

### 7. `docs/10_canon/_backups_pre_v09_20260505/CANON.md`

#### Hit 15 — line 48 (mirror of CANON.md hit 3)
**Current text:**
```
Systemic design insights discovered during implementation must be flagged for `docs/10_canon/FORAWWV.md` addendum. **Do not auto-edit FORAWWV.md.** Flag with note:
```
**Class: (C) AMBIGUOUS** — This is in an archived backup directory. It is a historical snapshot, not a live governance surface. Recommend leaving backups untouched; they are point-in-time records. If the orchestrator agrees, classify as (B) HISTORICAL-RECORD and skip.

---

### 8. `docs/40_reports/governance/20260610_SECTION6_ART_SIGNOFF.md`

#### Hit 16 — line 6
**Current text:**
```
Owner approval remains **non-delegable** for the enclave-overrun decision branch (8.7/8.9/8.10) — those are **NOT** in scope here and stay HELD.
```
**Class: (B) HISTORICAL-RECORD** — This sentence records the scope boundary of a specific completed sign-off event (2026-06-10). It describes what was HELD at that moment; it is a record of a decision made, not a live process gate directing future agents. Leave as-is.

#### Hit 17 — line 54
**Current text:**
```
| `decision_header_enclave_overrun` (8.7) | Enclave-decision art; feature build pending owner + §6 sign-off; owner approval non-delegable |
```
**Class: (C) AMBIGUOUS** — This is in a completed sign-off document recording the hold state as of 2026-06-10. The enclave-overrun decision build is still HELD (no feature yet). If the hold is now lifted by the new delegation, update to "Pyrrhic §6-panel sign-off required"; if the build-hold itself is unchanged (just the sign-off mechanism changed), update only the sign-off description. Recommend orchestrator confirms whether enclave-overrun build-hold is also lifted by the directive.

---

### 9. `docs/40_reports/proposals/20260609_ART_PROMPT_PACK_NON_SECTION6.md`

#### Hit 18 — line 472 (section header)
**Current text:**
```
# §6 DEFERRED — OWNER SIGN-OFF REQUIRED
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
# §6 DEFERRED — PYRRHIC PANEL SIGN-OFF REQUIRED
```

#### Hit 19 — line 474
**Current text:**
```
The following assets are §6 (owner-gated, sensitive camp/atrocity/enclave-fall/decision-header content). **No generation prompts are authored for these.** They are listed ONLY to confirm they exist in the art surface and are deferred to owner §6 sign-off:
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
The following assets are §6 (panel-gated, sensitive camp/atrocity/enclave-fall/decision-header content). **No generation prompts are authored for these.** They are listed ONLY to confirm they exist in the art surface and are deferred to Pyrrhic §6-panel sign-off:
```

---

### 10. `docs/40_reports/proposals/20260609_ART_PROMPT_PACK_SECTION6.md`

#### Hit 20 — line 10
**Current text:**
```
> - **HELD (3):** 8.7 / 8.9 / 8.10 enclave-decision art (feature build pending owner + §6 sign-off; owner approval non-delegable).
```
**Class: (C) AMBIGUOUS** — Same as hit 17: whether the enclave-overrun build-hold is lifted by the new delegation affects this edit. If the hold is unchanged but sign-off mechanism changes, update "owner approval non-delegable" → "Pyrrhic §6-panel sign-off." Await orchestrator direction on the build-hold question.

#### Hit 21 — line 64–66 (final sign-off instruction)
**Current text:**
```
**HELD. These prompts must NOT be pasted into any generator until the owner and the §6 sign-off chain (`/historian` + `/narrative-designer` + `/game-designer`, per Design Gate §6, with owner approval non-delegable for the enclave-overrun decision) explicitly clear them.**
```
**Class: (A) PROCESS-GATE-TO-REMOVE** (subject to enclave-overrun build-hold resolution)  
**Proposed replacement:**
```
**HELD. These prompts must NOT be pasted into any generator until the Pyrrhic §6-panel (`/historian` + `/narrative-designer` + `/game-designer` + `/war-or-game`, per Design Gate §6) explicitly signs off. Unanimous = cleared; BLOCK or split = surface to owner.**
```

---

### 11. `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md`

#### Hit 22 — line 7
**Current text:**
```
**§6-SENSITIVE.** Collapse fires per-settlement and can reach the eastern genocide-rupture enclaves. The §6 guard (§4) is non-delegable owner + historian sign-off. This document FLAGS; it does not DECIDE.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**§6-SENSITIVE.** Collapse fires per-settlement and can reach the eastern genocide-rupture enclaves. The §6 guard (§4) requires Pyrrhic §6-panel sign-off (`/historian` + `/gameplay-programmer` + `/game-designer`; unanimous = signature; BLOCK or split = surface to owner). This document FLAGS; it does not DECIDE.
```

#### Hit 23 — line 72 (§4 section header)
**Current text:**
```
## 4. The §6 guard (CRITICAL — owner + historian sign-off, NON-DELEGABLE)
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
## 4. The §6 guard (CRITICAL — Pyrrhic §6-panel sign-off: `/historian` + `/gameplay-programmer` + `/game-designer`)
```

#### Hit 24 — line 213
**Current text:**
```
  └─ Owner + /historian + /gameplay-programmer ratify the §4 §6 guard design (G1/G2/G3). NON-DELEGABLE.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
  └─ Pyrrhic §6-panel (`/historian` + `/gameplay-programmer` + `/game-designer`) ratify the §4 §6 guard design (G1/G2/G3). Unanimous = signature; BLOCK or split = surface to owner.
```

#### Hit 25 — line 235
**Current text:**
```
**Owner gates (hard stops):** GATE 0 §6 ratification before any 3D guard code merges to main; the §6 G2 invariant must be GREEN before AND on every run after `setEnablePhase3D(true)` reaches a non-harness path; the final re-floor OSID count is owner-signed (not auto-accepted as "must equal 649").
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Panel gates (hard stops):** GATE 0 §6-panel ratification before any 3D guard code merges to main; the §6 G2 invariant must be GREEN before AND on every run after `setEnablePhase3D(true)` reaches a non-harness path; the final re-floor OSID count requires Pyrrhic-panel sign-off (not auto-accepted as "must equal 649").
```

---

### 12. `docs/40_reports/proposals/20260609_COLLAPSE_S6_HISTORIAN_GATE_PACKET.md`

#### Hit 26 — line 4
**Current text:**
```
**Purpose:** Supports **G3** (historian acknowledgment) of the three-part §6 guard for the pressure→exhaustion→political-collapse pipeline. G1 (enclave-OSID exclusion at the Phase-3D `collapse_damage` write root) and G2 (188-week invariant test) are engineering work, gated separately; this packet is the evidence the OWNER (non-delegable) and a historian sign off on.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Purpose:** Supports **G3** (historian acknowledgment) of the three-part §6 guard for the pressure→exhaustion→political-collapse pipeline. G1 (enclave-OSID exclusion at the Phase-3D `collapse_damage` write root) and G2 (188-week invariant test) are engineering work, gated separately; this packet is the evidence the Pyrrhic §6-panel (`/historian` + `/game-designer` + `/gameplay-programmer`) signs off on (unanimous = signature; BLOCK or split = surface to owner).
```

#### Hit 27 — line 180
**Current text:**
```
**Owner sign-off (non-delegable — "reward for atrocity" + enclave-mechanics rows, Gate §6):**
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Pyrrhic §6-panel sign-off ("reward for atrocity" + enclave-mechanics rows, Gate §6 — unanimous = signature; BLOCK or split = surface to owner):**
```

---

### 13. `docs/40_reports/proposals/20260609_CASUALTY_REALISM_TARGETS.md`

#### Hit 28 — line 4 (status block)
**Current text:**
```
**No code, constants, levers, scenario data, or baselines changed.** PROPOSED locked numbers below require **owner ratification** before any Lane-3 run scores against them.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**No code, constants, levers, scenario data, or baselines changed.** PROPOSED locked numbers below require **Pyrrhic-panel sign-off** before any Lane-3 run scores against them.
```

#### Hit 29 — line 108 (Part C header)
**Current text:**
```
# PART C — PROPOSED LOCKED TARGETS (for owner ratification)
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
# PART C — PROPOSED LOCKED TARGETS (for Pyrrhic-panel sign-off)
```

#### Hit 30 — line 153
**Current text:**
```
- **These numbers are PROPOSED — owner ratifies before any scoring run.** This is calibration-owned; do not close from the docs/tracking lane.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
- **These numbers are PROPOSED — Pyrrhic panel signs off before any scoring run.** This is calibration-owned; do not close from the docs/tracking lane.
```

---

### 14. `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md`

#### Hit 31 — line 4 (status block)
**Current text:**
```
**Status:** DRAFT for owner ratification. The build is BLOCKED on the §6 owner+historian re-verification gate (§B) and the floor-impact acknowledgment (§C) — both NON-DELEGABLE.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Status:** DRAFT for Pyrrhic-panel ratification. The build is BLOCKED on the §6 panel+historian re-verification gate (§B) and the floor-impact acknowledgment (§C) — both require unanimous panel sign-off; BLOCK or split = surface to owner.
```

#### Hit 32 — line 75 (§B section header)
**Current text:**
```
## B. §6 RISK SURFACE (NON-DELEGABLE owner + /historian gate)
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
## B. §6 RISK SURFACE (Pyrrhic §6-panel gate: `/historian` + `/gameplay-programmer` + `/game-designer`)
```

#### Hit 33 — line 120
**Current text:**
```
**HARD §6 GATE:** `tests/collapse_phase1_g2_section6_invariant.test.ts` (G2) must be GREEN before AND on every run after the substrate re-route reaches a non-harness path. NON-DELEGABLE owner+/historian sign-off on §B before any of D2+ merges.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**HARD §6 GATE:** `tests/collapse_phase1_g2_section6_invariant.test.ts` (G2) must be GREEN before AND on every run after the substrate re-route reaches a non-harness path. Pyrrhic §6-panel sign-off (`/historian` + `/gameplay-programmer` + `/game-designer`) on §B before any of D2+ merges; BLOCK or split = surface to owner.
```

#### Hit 34 — line 124 (D0 gate row)
**Current text:**
```
| **D0** | Owner ratifies §A recommendation … §B §6 re-verification … §C floor-move acknowledgment. NO CODE. | 0 | Owner sign-off recorded. **STOP if owner picks Option 3** …
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:** Replace "Owner ratifies" → "Pyrrhic panel ratifies"; "Owner sign-off recorded" → "Panel sign-off recorded."

---

### 15. `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4C_STRAIN_GEOMETRY_SCOPE.md`

#### Hit 35 — line 4 (status block)
**Current text:**
```
**Status:** DRAFT for owner + §6-panel ratification. The build is BLOCKED on (i) the owner re-floor acknowledgment (§D — this IS the first floor-moving collapse change) and (ii) the §6 G2 HARD gate staying GREEN on the first territory-moving run (§C). Both NON-DELEGABLE.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Status:** DRAFT for Pyrrhic §6-panel ratification. The build is BLOCKED on (i) the panel re-floor acknowledgment (§D — this IS the first floor-moving collapse change) and (ii) the §6 G2 HARD gate staying GREEN on the first territory-moving run (§C). Both require unanimous panel sign-off; BLOCK or split = surface to owner.
```

#### Hit 36 — line 168 (C0 gate row)
**Current text:**
```
| **C0** | Owner + §6-panel ratify: … NO CODE. | 0 | Owner sign-off recorded. STOP if owner prefers Lever 2 …
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:** "Owner + §6-panel ratify" → "Pyrrhic §6-panel ratifies"; "Owner sign-off recorded" → "Panel sign-off recorded."

---

### 16. `docs/40_reports/proposals/20260610_ENCLAVE_DECISION_BUILD_SPEC.md`

#### Hit 37 — line 4 (status block)
**Current text:**
```
**Status:** ⚠️ **DRAFT — HELD for owner + §6 ratification.** Authorizes NO code. This is a §6-sensitive combat feature in the highest tier of the canon hierarchy (Sensitive History gate, Tier 2). Engine work is BLOCKED on the §10 sign-off of the ratified DESIGN and on this spec.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Status:** ⚠️ **DRAFT — HELD for Pyrrhic §6-panel ratification.** Authorizes NO code. This is a §6-sensitive combat feature in the highest tier of the canon hierarchy (Sensitive History gate, Tier 2). Engine work is BLOCKED on the §10 sign-off of the ratified DESIGN and on this spec.
```

#### Hit 38 — line 187–189 (build phasing D0 gates)
**Current text:**
```
  ├─ Owner ratifies this spec + the DESIGN §10 sign-off table.
  ├─ Owner ratifies the §1.2 new state field (or directs derive-from-receipts, O-1/§11).
  └─ §6 sign-off (NON-DELEGABLE for the eastern case):
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
  ├─ Pyrrhic panel ratifies this spec + the DESIGN §10 sign-off table.
  ├─ Pyrrhic panel ratifies the §1.2 new state field (or directs derive-from-receipts, O-1/§11).
  └─ §6 sign-off (Pyrrhic §6-panel, unanimous; BLOCK or split = surface to owner — for the eastern case):
```

#### Hit 39 — line 207
**Current text:**
```
  ├─ §6 invariant tests (esp. T-2..T-7) GREEN; FULL §6 gate + NON-DELEGABLE user approval.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
  ├─ §6 invariant tests (esp. T-2..T-7) GREEN; FULL §6 gate — Pyrrhic §6-panel sign-off, unanimous; BLOCK or split = surface to owner.
```

#### Hit 40 — line 214
**Current text:**
```
**Owner gates (hard stops):** GATE 0 §6 ratification before ANY code merges to main; … the re-floor OSID count is owner-signed (NOT auto-accepted as "must equal the current floor" — 649 is a guard, not a target).
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Panel gates (hard stops):** GATE 0 §6-panel ratification before ANY code merges to main; … the re-floor OSID count requires Pyrrhic-panel sign-off (NOT auto-accepted as "must equal the current floor" — 649 is a guard, not a target).
```

---

### 17. `docs/40_reports/proposals/20260610_COLLAPSE_REPURPOSE_EXHAUSTION_SCOPE.md`

#### Hit 41 — line 61
**Current text:**
```
**RECOMMENDATION: ship C-feel-only FIRST (calibration-inert, no re-floor, immediate "soul" payoff), then C-drag as a SEPARATE owner-gated, re-floored step** if the panel wants mechanical teeth.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**RECOMMENDATION: ship C-feel-only FIRST (calibration-inert, no re-floor, immediate "soul" payoff), then C-drag as a SEPARATE panel-gated, re-floored step** if the panel wants mechanical teeth.
```

---

### 18. `docs/40_reports/proposals/20260610_1.0_READINESS_REASSESSMENT.md`

#### Hit 42 — line 85–86 (§6 section header + note)
**Current text:**
```
## 6. DoD / MASTER_ROADMAP amendment flags (OWNER — do not auto-edit)
```
and line 86:
```
**Process note:** per the 2026-06-10 standing delegation, the Design-B re-floor (if adopted) is a scenario-tester + calibration-panel GO with §6 intact = owner signature assumed; §6 symmetry-sentence + enclave-decision remain owner/§6-gated.
```
**Class: (A) PROCESS-GATE-TO-REMOVE** (header); **(B) HISTORICAL-RECORD** (line 86 — this records the state of a specific 2026-06-10 delegation, which is itself now superseded by the 2026-06-11 directive).  
**Proposed replacement (header only):**
```
## 6. DoD / MASTER_ROADMAP amendment flags (apply via Pyrrhic-panel sign-off)
```
Line 86: update to reflect that the 2026-06-11 directive supersedes the partial delegation — replace "owner signature assumed; §6 symmetry-sentence + enclave-decision remain owner/§6-gated" with "Pyrrhic §6-panel sign-off for §6-touching items."

---

### 19. `docs/40_reports/proposals/20260609_ORPHANED_WIRING_AUDIT_MASTER.md`

#### Hit 43 — line 42
**Current text:**
```
## §6-GATED — owner sign-off required (do NOT auto-build)
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
## §6-GATED — Pyrrhic §6-panel sign-off required (do NOT auto-build)
```

---

### 20. `docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md`

#### Hit 44 — line 101
**Current text:**
```
(Manual edit; ADR does not auto-edit canon.)
```
**Class: (C) AMBIGUOUS** — This is a parenthetical clarification about ADR scope (the ADR itself doesn't edit canon; that's a human/agent task), not an owner-gate instruction. It is more a statement of ADR methodology than a process gate. Recommend leaving as-is — it accurately describes the ADR's scope regardless of who edits canon.

---

## FILES EXAMINED BUT CONTAINING ONLY HISTORICAL-RECORD OR OUT-OF-SCOPE HITS

The following files contain "owner" language that is entirely class-(B) historical records of decisions already made, or contextual UI language, or archived material:

| File | Lines | Classification | Reason |
|---|---|---|---|
| `docs/40_reports/implemented/20260507_DOC_CONSOLIDATION_AND_FORAWWV_UPDATE.md` | 36 | (B) | Records a specific one-turn exception already exercised |
| `docs/40_reports/implemented/20260405_V082_PHASE1–V083_PHASE5 (8 files)` | various | (B) | All "No auto-edit of FORAWWV.md — PASS — Not touched" checklist rows |
| `docs/40_reports/implemented/20260528_PHASE_D_CLOSEOUT.md` | 161, 190 | (B) | "never auto-edited" = completed checklist pass; "user non-delegable" = historical record of what those packets required |
| `docs/40_reports/SESSION_HANDOFF_2026-05-23.md` | 175 | (B) | Completed session checklist |
| `docs/40_reports/working/SESSION_CHECKPOINT_20260608b.md` | multiple | (B) mostly | Most hits are historical decision logs ("owner ratified", "HELD for owner" in context of already-logged decisions). Hits 113, 126, 415, 419 describe current HOLDS that are live work items — see below |
| `docs/plans/2026-05-30-tg-full-implementation-plan.md` | 25, 65, 96, 111–125 | (C) | Owner-gated calibration runs described in a plan that is partially executed. The "owner-gated" calibration-run discipline is a workflow pattern, not a FORAWWV ban. Recommend updating "owner-gated" → "panel-approved" in the stop-gate column only |
| `docs/plans/2026-06-07-dayton-comprehensive-negotiation-design.md` | 95 | (A) | "Never auto-edit FORAWWV.md" — same pattern as other plans |
| `docs/plans/2026-06-07-owner-decision-backlog.md` | 99, 101 | (A) | "Requires non-delegable user approval" for §6-gated enclave-overrun |
| `docs/plans/2026-06-08-calibration-prerequisites-sequence.md` | 27, 46, 50 | (A) | "owner-gated" calibration lanes |
| `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md` | 48, 57, 65 | (A) | "non-delegable user sign-off / non-delegable user approval" |
| Multiple `docs/plans/2026-05-17-*.md` | various | (A) | All "Do not auto-edit FORAWWV.md — flag for manual review" |
| `docs/knowledge/AWWV/raw/*.md` | multiple | (B) | Archived ChatGPT session transcripts — historical, not live governance |
| `docs/30_planning/_legacy/V0_4_CANON_ALIGNMENT.md` | 75 | (B) | Legacy/archived planning doc |

---

## PLANS DIRECTORY — BULK CLASS-A HITS (FORAWWV ban)

The following plan files contain the identical pattern "Do NOT auto-edit `docs/10_canon/FORAWWV.md`" / "Never auto-edit FORAWWV.md" / "flag for manual review" in their deliverables or stop-gates. Each is a class-(A) hit with the same proposed replacement ("Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off."):

| File | Line(s) |
|---|---|
| `docs/plans/2026-05-17-brigade-dissolution-threshold-plan.md` | 157 |
| `docs/plans/2026-05-17-fatigue-recovery-rebalance-plan.md` | 162 |
| `docs/plans/2026-05-17-logistics-priority-wire-or-remove-plan.md` | 172 |
| `docs/plans/2026-05-17-paramilitary-flavor-and-consequences-plan.md` | 145 |
| `docs/plans/2026-05-17-player-turn-guide-plan.md` | 29, 181 |
| `docs/plans/2026-05-17-rbih-supply-constraint-arms-embargo-plan.md` | 178 |
| `docs/plans/2026-05-17-sarajevo-special-casing-canon-plan.md` | 216 |
| `docs/plans/2026-05-17-save-migration-hardening-plan.md` | 202 |
| `docs/plans/2026-05-17-supply-design-completion-plan.md` | 30, 54, 140, 169, 189 |
| `docs/plans/2026-05-17-war-termination-minimal-spec-plan.md` | 28, 61, 340 |
| `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md` | 119 |
| `docs/plans/2026-05-29-b7-sarajevo-siege-continuous-condition-plan.md` | 202, 249 |
| `docs/plans/2026-05-29-officer-oob-source-attribution-plan.md` | 17 |
| `docs/plans/2026-05-29-ring3-sensitive-event-authoring-plan.md` | 16 |
| `docs/plans/2026-05-29-supply-logistics-comprehension-plan.md` | 10 |
| `docs/plans/2026-06-07-dayton-comprehensive-negotiation-design.md` | 95 |

**Bulk replacement rule for all plan-file FORAWWV bans:**  
`"Do not auto-edit docs/10_canon/FORAWWV.md"` / `"Never auto-edit FORAWWV.md"` → `"Edits to docs/10_canon/FORAWWV.md require Pyrrhic-panel sign-off."`  
`"flag for manual review"` (where it means flag-for-owner) → `"route through Pyrrhic-panel sign-off"`

---

## PLANS DIRECTORY — §6 NON-DELEGABLE HITS

| File | Line | Current text (excerpt) | Class | Proposed replacement |
|---|---|---|---|---|
| `docs/plans/2026-06-07-owner-decision-backlog.md` | 99 | "Requires non-delegable user approval" | (A) | "Requires Pyrrhic §6-panel sign-off (unanimous; BLOCK = surface to owner)" |
| `docs/plans/2026-06-07-owner-decision-backlog.md` | 101 | "§6 YES (non-delegable user approval)" | (A) | "§6 YES (Pyrrhic §6-panel sign-off)" |
| `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md` | 48 | "non-delegable user sign-off" | (A) | "Pyrrhic §6-panel sign-off (unanimous; BLOCK = surface to owner)" |
| `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md` | 57 | "non-delegable user 'no reward for atrocity' approval" | (A) | "Pyrrhic §6-panel 'no reward for atrocity' sign-off (unanimous; BLOCK = surface to owner)" |
| `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md` | 65 | "non-delegable user approval" | (A) | "Pyrrhic §6-panel sign-off" |
| `docs/plans/2026-06-08-calibration-prerequisites-sequence.md` | 27 | "owner + manual FORAWWV addendum" | (A) | "Pyrrhic-panel sign-off + FORAWWV addendum via panel" |
| `docs/plans/2026-06-08-calibration-prerequisites-sequence.md` | 46 | "owner-gated" (PDP activations) | (A) | "panel-approved" |
| `docs/plans/2026-06-08-calibration-prerequisites-sequence.md` | 50 | "owner-gated" (same-axis concentration) | (A) | "panel-approved" |
| `docs/plans/2026-05-30-tg-full-implementation-plan.md` | 65, 96, 111, 120, 122 | "owner-gated" calibration runs | (A) | "panel-approved calibration runs" |
| `docs/plans/2026-05-30-tg-full-implementation-plan.md` | 125 | "owner-gated single-change run" | (A) | "panel-approved single-change run" |
| `docs/plans/2026-05-30-tg-full-implementation-plan.md` | 186–188 | "What needs user/owner sign-off" section | (A) | "What needs Pyrrhic-panel sign-off" |

---

## CALIBRATION_MASTER.md HIT

#### Hit 45 — `docs/40_reports/CALIBRATION_MASTER.md` line 40
**Current text:**
```
The one OWNER-gated free-war follow-up that *would* touch calibration (systematic-Drina reward neutralization) is held precisely because it moves the baseline — do not pick it up under the autonomous calibration lane without owner sign-off.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
The one panel-gated free-war follow-up that *would* touch calibration (systematic-Drina reward neutralization) is held precisely because it moves the baseline — do not pick it up under the autonomous calibration lane without Pyrrhic-panel sign-off.
```

---

## SUMMARY COUNT

| Metric | Count |
|---|---|
| Total class-(A) edits (process gate to remove) | **~55** (44 fully detailed above + ~11 from the bulk plan-file list) |
| Total class-(B) historical records (leave as-is) | ~22 |
| Total class-(C) ambiguous (need orchestrator judgment) | **6** |
| Files with class-(A) edits | **~25** |
| Files that are canon tier (`docs/10_canon/`) | **2** — `CANON.md` (1 hit), `SENSITIVE_HISTORY_DESIGN_GATE.md` (5 hits) |
| Does `FORAWWV.md` itself need edits? | **NO** — pure canon substance, zero gating-process language |
| Does `CLAUDE.md` need edits? | **YES** — 2 hits (lines 37 and 68) |
| Highest-priority canon edit | `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 sign-off table (5 rows + escalation clause) |

---

## CLASS-(C) AMBIGUITIES — ORCHESTRATOR DECISION REQUIRED

1. **SENSITIVE_HISTORY_DESIGN_GATE.md line 207** — "reward for atrocity" row: confirm full delegation to Pyrrhic §6-panel (unanimous; BLOCK = owner) vs retain a softer "any reasonable doubt = surface to owner" trigger.
2. **EVENT_SYSTEM_AUTHORING_GUIDE.md line 449** — ASCII diagram "non-delegable" label: update to "panel sign-off" or leave as illustrative shorthand.
3. **docs/40_reports/governance/20260610_SECTION6_ART_SIGNOFF.md line 54** — enclave-overrun art hold: is the build-hold itself lifted by the 2026-06-11 directive, or only the sign-off mechanism?
4. **docs/40_reports/proposals/20260609_ART_PROMPT_PACK_SECTION6.md line 10** — same enclave-overrun build-hold question.
5. **docs/10_canon/_backups_pre_v09_20260505/CANON.md line 48** — archived backup: treat as (B) historical-record (leave untouched) or update for consistency?
6. **docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md line 101** — "(Manual edit; ADR does not auto-edit canon)" — methodological note about ADR scope, not an owner gate; recommend leave as-is.

---

## EXECUTION NOTES FOR ORCHESTRATOR

- **Execute in tier order**: CLAUDE.md → CANON.md → SENSITIVE_HISTORY_DESIGN_GATE.md → PYRRHIC_PROCESS_RULES.md → EVENT_SYSTEM_AUTHORING_GUIDE.md → ADRs → plans/proposals bulk pass.
- **Do NOT touch `docs/10_canon/FORAWWV.md`** — it needs no process edits; substance edits are a separate post-D2 doc-sync task (per the owner directive "after D2, full sync of all the docs to match the reality").
- **The `_backups_pre_v09_20260505/` subtree** — recommend leaving entirely unchanged (historical snapshots; not live governance surfaces).
- **`docs/knowledge/AWWV/raw/` transcripts** — leave entirely unchanged (archived ChatGPT session logs; not live governance).
- **Canon-compliance review** before applying edits to `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 sign-off table — this is Tier-2 canon; changes to its PROCESS rows (not substance) go through the same Pyrrhic-panel sign-off the new process describes.
- **Post-D2 doc-sync** (separate task): the "full sync of all docs to match reality" is a larger pass updating stale calibration hashes, superseded roadmap text, and substance gaps — NOT covered by this inventory, which is scoped to process-gate language only.

---

---

## SUPPLEMENT — `.claude/` SKILL FILES (live governance surfaces)

The `.claude/worktrees/` subtree contains stale branch snapshots — treat identically to `_backups_pre_v09_20260505/`: historical, leave untouched. The following are **live skill files** in the main `.claude/skills/` tree and `AGENT_TEAM_ROSTER.md`:

### `.claude/skills/canon-compliance-reviewer/SKILL.md` — line 18
**Current text:**
```
**NEVER auto-edit `docs/10_canon/FORAWWV.md`** — flag it for manual owner review instead.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off (unanimous = signature; BLOCK or split = surface to owner).
```

### `.claude/skills/propagate-to-canon/SKILL.md` — line 46
**Current text:**
```
Never auto-edit `docs/10_canon/FORAWWV.md` — flag for manual review
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off.
```

### `.claude/skills/session-closeout/SKILL.md` — line 62
**Current text:**
```
**Fix**: Either update the canon doc directly OR flag it with `propagate-to-canon` skill. NEVER auto-edit `FORAWWV.md`.
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
**Fix**: Either update the canon doc directly (with Pyrrhic-panel sign-off for `FORAWWV.md`) OR flag it with `propagate-to-canon` skill.
```

### `.claude/AGENT_TEAM_ROSTER.md` — line 65
**Current text:**
```
| Documentation Specialist | documentation-specialist | Docs updates, release notes; respect docs-only-ledger-handling and no auto-edit of FORAWWV. |
```
**Class: (A) PROCESS-GATE-TO-REMOVE**  
**Proposed replacement:**
```
| Documentation Specialist | documentation-specialist | Docs updates, release notes; respect docs-only-ledger-handling; edits to FORAWWV.md require Pyrrhic-panel sign-off. |
```

### `.claude/worktrees/` (all subdirectories)
**Class: (C) AMBIGUOUS** — These are stale worktree snapshots of branches (a2-dayton-close, a3-baseline, a3-codex-coverage, agent-a05a0d53bfa8ada7b, etc.). They contain mirrored copies of the same hits in CLAUDE.md, CANON.md, ADRs, etc. Recommend: leave all `.claude/worktrees/` files untouched — they are branch-state snapshots, not live governance surfaces read by running agents.

**One worktree source-code hit** (not a governance doc):  
`.claude/worktrees/a3-codex-coverage/src/sim/codex/dynamic_section_builder.ts:755` contains an inline code comment `// sensitive-history gate + /historian + ICTY sourcing + owner sign-off. Do NOT`. This is a stale worktree source file — **leave as-is**. The live counterpart in `main` branch source code should be checked separately if a source-code pass is desired (out of scope for this inventory, which covers docs only).

---

## REVISED SUMMARY COUNT (including `.claude/` live skills)

| Metric | Count |
|---|---|
| Total class-(A) edits (process gate to remove) | **~59** (48 fully detailed + ~11 from bulk plan-file list) |
| Total class-(B) historical records (leave as-is) | ~22 |
| Total class-(C) ambiguous (need orchestrator judgment) | **7** (added worktree question) |
| Files with class-(A) edits | **~29** (4 additional `.claude/skills/` files + `AGENT_TEAM_ROSTER.md`) |
| Files that are canon tier (`docs/10_canon/`) | **2** — `CANON.md` (1 hit), `SENSITIVE_HISTORY_DESIGN_GATE.md` (5 hits) |
| Files that are live skill/agent surfaces (`.claude/`) | **4** skills + `AGENT_TEAM_ROSTER.md` |
| Does `FORAWWV.md` itself need process edits? | **NO** — pure canon substance |
| Does `CLAUDE.md` need edits? | **YES** — 2 hits (lines 37 and 68) — highest priority |
| Highest-priority canon edit | `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 sign-off table (5 rows + escalation clause) |

---

---

## EXECUTION LOG (2026-06-11)

Executed on branch `docs/remove-owner-gate` (isolated git worktree at `.claude/worktrees/owner-gate-wt` to avoid colliding with a concurrent agent in the main checkout). Owner rulings on the 6 class-(C) items applied as directed:

- **C1 (SHDG:207 atrocity-reward row)** — panelized to §6 Pyrrhic panel, **preserved the values bright line**: "the atrocity-is-never-rewarded principle, if ever in question, surfaces to the owner."
- **C2 (EVENT_GUIDE:449 ASCII label)** — "non-delegable" → "panel-gated."
- **C3 & C4 (enclave-overrun art HOLD)** — HOLD preserved; sign-off reworded to §6 Pyrrhic panel (Historian + scenario-tester/calibration + Engine/systems + Red-team, unanimous).
- **C5 (`_backups_pre_v09_20260505/`)** — LEFT AS-IS (historical snapshot).
- **C6 (`.claude/worktrees/`)** — LEFT AS-IS (stale branch snapshots).
- **Class-(B) historical records** — LEFT AS-IS (V082/V083 checklist PASS rows, ENGINE_SYNTHESIS:313 ✅ row, completed-closeout "never auto-edited" rows, prior-dated owner-action logs, SESSION_CHECKPOINT entries).

### Standard replacement applied
> "Pyrrhic-panel sign-off — convene the appropriate panel (for §6: Historian + scenario-tester/calibration + Engine/systems + Red-team); unanimous GO = signature; BLOCK or split surfaces to the owner; implementer ≠ reviewer."

### DEVIATIONS FROM INVENTORY (flagged for canon reviewer)

1. **Generic "Architect flags decisions for user review" boilerplate (~40 plan files) — NOT touched.** A grep surfaced this standard planning-role convention across ~40 dated plan files. It is a different, broader pattern than the FORAWWV/§6 owner-gate this directive targets, and was not in the accepted inventory. Left untouched to avoid scope creep; flag if the reviewer wants it included.
2. **Additional live class-A gates found beyond the inventory — INCLUDED (added):** `docs/plans/MASTER_ROADMAP.md` (canon-status header + FORAWWV row → PANEL-GATED), `docs/plans/COMMAND_BOARD.md` (P3 lane gate + 3 "owner-gated" refs), `docs/plans/2026-06-08-v1.0-definition-of-done.md` (B2 §6 dispositions), `docs/plans/2026-06-09-d1-finalization-sequence-DRAFT.md` (Krivaja §6 rows), `docs/plans/2026-06-09-presidential-enclave-decision-DESIGN.md` (canon-tier + Lane-1 §6 rows), `docs/40_reports/proposals/20260529_ENGINE_SIMPLIFICATION_AUDIT.md` (CLAUDE.md banned-patterns description refreshed). These are live governance surfaces (MASTER_ROADMAP is the roadmap source of truth) carrying the same class-A language; converting them was within directive intent.
3. **Descriptive "owner" references in 4B/4C collapse scope docs — NOT touched.** Phrases like "data artifact for the owner", "owner-confirmed REJECTION", "Recommended framing for the owner", "STOP if owner picks Option 3" are descriptive (naming the ultimate steering authority / recording a past adjudication), not gating PROCESS. Left as-is — consistent with the owner retaining escalation authority over §6 bright lines and steering decisions.
4. **`docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md:313`** ("Never auto-edit FORAWWV.md | ✅ | ...") — classified (B) completed-checklist PASS row, LEFT AS-IS (matches the V082/V083 implemented-checklist treatment).

### Commits (branch `docs/remove-owner-gate`)
1. `5ab5fa4bc` — CLAUDE.md + canon tier (CANON.md, SENSITIVE_HISTORY_DESIGN_GATE.md)
2. `66a06518e` — add this inventory doc
3. `6093936d5` — engineering docs (PYRRHIC_PROCESS_RULES, EVENT_SYSTEM_AUTHORING_GUIDE, ADR-0007) + 4 `.claude` skill/roster surfaces
4. `8759324f7` — plans directory (FORAWWV-ban bulk + §6 non-delegable + calibration gating)
5. `d52a5ba99` — proposals/governance/CALIBRATION_MASTER
6. `a48dc681b` — supplemental live governance (MASTER_ROADMAP, COMMAND_BOARD, DoD, D1, enclave DESIGN)
7. (+ this execution-log commit)

### Verification
- Core live governance files (CLAUDE.md, CANON.md, SHDG, PYRRHIC_PROCESS_RULES, EVENT_SYSTEM_AUTHORING_GUIDE, AGENT_TEAM_ROSTER, 3 skills): **zero** remaining "auto-edit ban" strings.
- `docs/plans/` + `docs/40_reports/proposals/`: zero remaining class-A `owner-gated`/`non-delegable`/`auto-edit` (excluding class-B historical records and this inventory's quoted examples).
- `npx tsc --noEmit`: docs-only change, unaffected (see PR notes).

---

*Report path: `docs/40_reports/proposals/20260611_OWNER_GATE_REMOVAL_INVENTORY.md`*  
*Produced: 2026-06-11 — Documentation Specialist. Inventory + execution. FORAWWV.md substance untouched (process-gate only).*

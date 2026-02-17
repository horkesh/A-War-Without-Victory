# Paradox Convene: RS JNA Exception, Paramilitary Units, and Per-Army Flavor

**Convened by:** Orchestrator  
**Date:** 2026-02-18  
**Goal:** (1) Confirm and hand off implementation of the RS JNA composition exception (user-approved). (2) Discuss with the Paradox team adding paramilitary-style units and per-army flavor, with Balkan Battlegrounds (BB) for historical grounding. User: “RS can have JNA exception as it correctly models history. How about also adding units such as paramilitary? They can be useful in cleaning up the rear undefended settlements. Each army can have its own flavor; use Balkan Battlegrounds for historical grounding.”

**References:** [INITIAL_BRIGADE_PLACEMENTS_STRENGTHS_JNA_REEVALUATION_2026_02_18.md](INITIAL_BRIGADE_PLACEMENTS_STRENGTHS_JNA_REEVALUATION_2026_02_18.md), [PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md](../../data/derived/knowledge_base/balkan_battlegrounds/extractions/PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md), CONSOLIDATED_BACKLOG §3 (Brigade/military/militia design).

---

## 1. RS JNA exception — User approval and handoff

**User direction:** “Yes, RS can have JNA exception as it correctly models history.”

**Decision:** Implement the faction+equipment-class override so that RS OOB brigades with `default_equipment_class` **mechanized** or **motorized** receive the RS JNA-heavy composition (800 infantry, 40 tanks, 30 artillery, 5 aa_systems) instead of the generic EQUIPMENT_CLASS_TEMPLATES (mechanized 12/6, motorized 4/4).

**Handoff:** Gameplay Programmer (or Formation-expert in coordination) to implement per INITIAL_BRIGADE_PLACEMENTS_STRENGTHS_JNA_REEVALUATION_2026_02_18 §5 recommendation 1. Options: (a) extend `buildBrigadeComposition` / `buildRecruitedFormation` to accept faction and apply RS override for mechanized/motorized; or (b) set `formation.composition` for RS mechanized/motorized after creation in the mandatory branch of runBotRecruitment. Deterministic; no new RNG. Run 4w/16w checkpoint after change; ledger entry required.

**Canon:** Phase II Spec §12 and Systems Manual §3 already describe RS default (JNA inheritance); implementation-note to state that initial composition for RS mechanized/motorized in the recruitment path now uses this override.

---

## 2. Balkan Battlegrounds — Historical grounding

**Source:** BB-derived content (PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY, BB page JSONs), balkan-battlegrounds-historical-extractor skill.

**Relevant patterns:**

- **Takeover → consolidation → “cleanup”:** Political/administrative takeover was often accompanied by military operations (“cleanup,” formations); displacement/exodus followed (e.g. Prijedor). BB citation: BB1 narrative; Appendix G (BB1 pp. 496–501) VRS brigade locations. Implied: rear-area security and consolidation were historically part of the campaign.
- **Rear areas:** BB2 (e.g. p.555): “terrorizing Serb infantry units with surprise raids, and often creating mayhem in **VRS rear areas**. The ARBiH demonstrated … effective use of **elite recon-sabotage units**.” BB2 (e.g. p.551): “safeguarding the SVK and VRS **rear**” so released forces could reorient to other fronts. So rear security and light/elite units that operate in rear areas are historically attested.
- **JNA/VRS:** RS had heavy, organized brigades from the start (JNA-origin); 12 May 1992 formal conversion. RS flavor = JNA inheritance (heavy equipment). ARBiH = embargo, light; effective use of elite recon-sabotage and tactical raids. HRHB/HVO = distinct structure (Croat chain, later tensions with RBiH).
- **Per-army flavor:** BB supports asymmetric representation: RS = heavy brigades + rear consolidation; ARBiH = light, elite/sabotage capability, raids; Croat/HVO = separate command and territorial focus. “Paramilitary” or rear-clearing forces fit the consolidation/cleanup narrative without inventing units BB does not name; we can model them as a formation kind or equipment class (e.g. light, rear-focused) if design chooses to add them.

**Traceability:** Any new unit type or formation kind must be citation-backed or explicitly marked as design abstraction (with ledger note). Paramilitary/rear-cleanup as a **role** (cleaning undefended rear settlements) is supported by BB “cleanup” and “rear”; specific named paramilitary organizations (e.g. Arkan, White Eagles) can be researched via further BB sweep if we want named OOB entries later.

---

## 3. Paradox team — Paramilitary and per-army flavor (synthesized)

**Game Designer**  
- Canon is silent on paramilitary as a distinct formation kind. We already have equipment classes: garrison (static defense), police (light arms), special (guards, elite). Adding a “paramilitary” or “rear security” **role** (e.g. units that can be assigned to undefended rear settlements for cleanup) is a design extension; it should align with Rulebook and Systems Manual. Per-army flavor: RS (JNA heavy — approved; optionally rear-clearing units), RBiH (light, embargo; elite/sabotage already in BB narrative), HRHB (Croat structure). Don’t invent mechanics; define one clear role (e.g. “can attack only undefended or low-garrison settlements in rear”) and document in canon before implementation.

**Formation-expert**  
- Formation kinds today: militia, territorial_defense, brigade, operational_group, corps_asset, corps, og, army_hq. Equipment classes include police, garrison, special. Paramilitary could be: (1) a new formation kind (e.g. `paramilitary` or `rear_security`), or (2) a tag/flag on existing brigades (e.g. `rear_cleanup_eligible`), or (3) a new equipment class used only for certain OOB entries. Option (2) or (3) avoids new kind and reuses AoR/assignment; option (1) allows distinct rules (e.g. no front-line assignment, only rear). OOB: we could add a small set of RS (or all-faction) “rear” units in oob_brigades.json with a new class or tag; they would spawn like other mandatory/elective and get assignment rules so bot (or player) can use them for rear settlements. Pool and recruitment costs should be tuned so they don’t dominate.

**Scenario-creator-runner-tester**  
- Rear undefended settlements today: control can flip under pressure or remain contested; there is no dedicated “cleanup” unit. If we add paramilitary/rear-cleanup, scenarios could assign them to rear-only AoR or to a “cleanup” order type. Historical plausibility: BB supports consolidation and cleanup; having a unit type that excels at flipping undefended/low-garrison settlements in friendly-adjacent or rear areas would match that. Run outputs: we’d want run_summary or diagnostics to distinguish “cleanup” flips from main-front flips for calibration.

**Technical Architect**  
- No new entrypoint required for RS JNA override (recruitment_engine + equipment_effects only). Paramilitary/rear-cleanup: if implemented as (a) new formation kind, we need state schema and serialization (FormationKind, possibly new keys); (b) tag or equipment class only, we extend existing formation state and bot logic. PIPELINE_ENTRYPOINTS and Phase II Spec should document any new step (e.g. “rear-cleanup resolution” or assignment rule). Prefer minimal schema change (tag or class) unless Game Designer and Formation-expert agree a new kind is needed.

**Product Manager**  
- Single priority for **this** convene: (1) Implement RS JNA exception (handoff above). (2) Paramilitary/per-army flavor: treat as **backlog** with design-first. Add to CONSOLIDATED_BACKLOG §3: “Paramilitary / rear-cleanup units (design): role for cleaning undefended rear settlements; per-army flavor (RS JNA done; RS/RBiH/HRHB distinct unit roles); BB-grounded. Owner: Game Designer for role/canon; Formation-expert for OOB/formation design.” No implementation until design and canon note are agreed.

**Systems Programmer**  
- RS JNA override: deterministic (same faction + equipClass → same composition). Paramilitary: any new formation kind or assignment rule must use sorted iteration and no randomness; rear-cleanup eligibility (e.g. “settlement undefended and in rear”) must be deterministic.

**QA Engineer**  
- RS JNA: add or extend test that RS mechanized/motorized formations created via runBotRecruitment have composition 40/30 (or equivalent from DEFAULT_COMPOSITION.RS). Paramilitary: when implemented, tests for assignment rules and cleanup behavior; determinism regression test.

---

## 4. Recommendations

1. **RS JNA exception:** Implement as handed off in §1. Update Phase II Spec §12 and Systems Manual §3 implementation-note; ledger entry; 4w/16w checkpoint.
2. **Paramilitary / rear-cleanup:** Add to backlog as **design item**. Game Designer to define: (a) role (e.g. “may only attack undefended or low-garrison settlements in rear”), (b) whether it is a new formation kind or tag/equipment class, (c) per-army flavor (RS vs RBiH vs HRHB). Formation-expert to propose OOB and assignment rules once design is stable. Use BB “cleanup” and “rear” as historical grounding; no invention of named units without BB or explicit design override (ledger).
3. **Per-army flavor:** RS = JNA heavy (approved). RBiH = light, embargo (existing); elite/sabotage is BB-attested and can be reflected in existing or future unit stats. HRHB = distinct structure (existing). Further flavor (e.g. paramilitary only for RS, or different cleanup rules per faction) is part of the paramilitary design item.
4. **Canon/spec:** When paramilitary design is agreed, add implementation-note to Phase II Spec and Systems Manual; cite BB where relevant.

---

## 5. Single agreed priority and handoffs

| Priority | Owner | Action |
|----------|--------|--------|
| **1. RS JNA exception** | Gameplay Programmer (with Formation-expert as needed) | Implement composition override in recruitment path for RS mechanized/motorized; tests; 4w/16w checkpoint; ledger + canon implementation-note. |
| **2. Paramilitary / per-army flavor** | Game Designer → Formation-expert | Design: role, kind/tag/class, per-army flavor; add to CONSOLIDATED_BACKLOG §3. No implementation until design and canon note agreed. |

**Orchestrator:** Close this convene with the above two priorities. PM to track (1) as immediate handoff and (2) as backlog design item.

---

## 6. References

- INITIAL_BRIGADE_PLACEMENTS_STRENGTHS_JNA_REEVALUATION_2026_02_18.md
- data/derived/knowledge_base/balkan_battlegrounds/extractions/PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md
- BB2 pages (e.g. rear areas, elite recon-sabotage) in balkan_battlegrounds/pages/
- CONSOLIDATED_BACKLOG §3 (Brigade / military / militia design)
- Phase II Spec §12, Systems Manual §3
- recruitment_types.ts (EQUIPMENT_CLASS_TEMPLATES), equipment_effects.ts (DEFAULT_COMPOSITION), recruitment_engine.ts (buildRecruitedFormation)

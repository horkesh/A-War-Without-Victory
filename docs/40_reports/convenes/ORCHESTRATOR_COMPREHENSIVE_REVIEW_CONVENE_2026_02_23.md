# Orchestrator Convene: Comprehensive Design Review (2026-02-23)

**Convened:** Technical Architect, Product Manager (via Orchestrator)  
**Input:** `docs/50_research/20260222_awwv_comprehensive_review.md` (A War Without Victory — Comprehensive Design Review & Gap Analysis, 2026-02-22)  
**Constraints:** No canon or FORAWWV edits; napkin and user rules (canon precedence, determinism, ledger discipline) respected.

---

## 1. Thoughts — Where the Review Is Right, Wrong, or Partial

### Right
- **Phase 0→I hand-off:** Phase 0 §7 Hand-Off Data and §8 Output Contract do not list **JNA_status** (transition_begun, withdrawal_progress, asset_transfer_RS). Phase I §3 explicitly expects it. This is a real data-contract gap.
- **Ceasefire/Washington in Phase II:** Correct. `phase-i-ceasefire-check` and `phase-i-washington-check` exist only in `phaseIPhases` in `turn_pipeline.ts`. When `meta.phase === 'phase_ii'`, those steps are never run. If preconditions are first met during Phase II, the milestones would not fire — a pipeline gap.
- **AoR/OSID/front triple identity:** Accurate. Canon and code reference AoR, OSID (location_osid, ZoC, attack resolution), and front segments (assignable_front_segments, brigade_front_assignment) in overlapping ways; reconciliation is needed.
- **Supply:** Supply is referenced in combat, exhaustion, authority, corridor, enclave integrity — but there is no supply specification at the level of the attack resolution formula. Correct.
- **War termination / no Phase III / no victory / no scoring / no Dayton analogue:** Canon and Rulebook are largely silent; the review correctly flags this as the largest design gap.
- **Player action guide:** Rulebook is systems-first; a clear "Player Actions per Phase" or "Player's Turn Guide" is missing.

### Partial
- **Capital deadline (unspent at referendum):** The review is right that the consequence of unspent pre-war capital at Phase 0→I is underspecified. Whether it is "wasted" or carries over (e.g. morale/organizational reserve) is a design choice, not yet in canon.
- **Non-war terminal outcome:** CANON.md and Phase 0 mention it; the review is right that there is no end-screen/scoring/narrative spec. "Presumably very rare" is fair; documenting it is still valuable.
- **Stuck in Phase I:** Time-based fallback and player-facing explanation are good ideas; Phase I terminal (faction elimination/surrender) is already partly in scope elsewhere (e.g. exhaustion/authority). The review overstates uniqueness of the problem — it is one of several transition edge cases.
- **Recruitment:** Implementation and reports cover a lot; canon is thinner. "Half-specified" is fair; the review could have noted that Systems Manual §2 and Phase II spec do touch recruitment and that the main gap is **player** recruitment rules and costs.

### Wrong or Overstated
- **"Brigade spawn timing" as uniquely vague:** OOB and Phase II entry are documented (e.g. Phase II Spec, Systems Manual brigade activation at Phase I entry and ongoing turns; OSID remap doc). The exact "Phase II entry formation batch" could be clearer, but it is not absent.
- **Entrenchment init:** The review is right that entrenchment_turns start at 0 at transition. Calling for a "backfill" from Phase I control duration is a design option; "accept weak defenses for first few turns" is also valid and simpler. Not a spec bug — a design choice to document.

---

## 2. Ideas — What to Adopt, Adapt, or Explore

### Adopt (align with team and canon)
- **Player action guide per phase:** Add a "Player's Turn Guide" / "Player Actions per Phase" (Rulebook or equivalent). Experience-first complement to systems-first docs; critical for playtesting.
- **Phase II ceasefire/Washington:** Add pipeline steps (or shared milestone evaluation) that run when `meta.phase === 'phase_ii'` so ceasefire and Washington Agreement can fire if preconditions are first met in Phase II. Document in Phase II Spec and PIPELINE_ENTRYPOINTS.
- **Phase 0 hand-off:** Extend Phase 0 §7/§8 to include JNA_status in Hand-Off Data and Output Contract so Phase I §3 is satisfied by contract. (Implementation may already populate it; contract should match.)
- **Supply specification:** Produce a supply spec (sources, tracing over OSID graph, corridors, enclave supply) at a level comparable to attack resolution. Prioritize after war-termination and player-action guide.

### Adapt
- **AoR/OSID reconciliation:** Not a single "OSID Migration Canon Amendment" only — also document transitional state (what still uses AoR until OSID is fully wired) and which pipeline steps are removed vs translated. Architect to own the reconciliation plan; PM to sequence.
- **War termination:** Specify a minimal end-game: when negotiation windows open (thresholds from exhaustion/fragmentation/IVP), how the game ends (e.g. treaty, timeout, surrender), and a minimal scoring/evaluation (e.g. territory, population preserved, exhaustion). Dayton analogue can be a patron-driven "force to table" trigger with clear conditions.
- **Stuck-in-Phase-I:** Prefer a time-based fallback plus player-facing explanation first; Phase I terminal (surrender/elimination) as a separate design thread to avoid scope creep.

### Explore (no commitment)
- **Fog of competence:** Orders failing or degrading for low-experience formations — strong flavor and historically plausible. Must be deterministic (e.g. experience + cohesion → downgrade). Game Designer to assess vs current capability progression (System 10).
- **Consequence Ledger:** Displacement narration per turn. Fits educational mission and IVP/patron linkage. Sensitive; treat as optional enrichment and scope after core loops.
- **Operation Storm / late-war intervention:** Patron-triggered event with conditions (Washington active, RS threat, exhaustion, IVP). Spec it as a design doc; implementation follows canon update.
- **Srebrenica-type enclave collapse:** Named event at integrity threshold with IVP/patron consequences and optional NATO intervention unlock. High educational value; scope as optional/nice-to-have.
- **JNA neutrality negotiation:** Phase 0 RBiH action to influence JNA garrisons. Asymmetric and historically grounded; explore in design only.
- **Federation stress test:** Washington doesn’t hold if RS collapses and HRHB defects. Late-game "what if"; explore as optional branch.

---

## 3. Recommendations — Concrete Next Steps

### Canon (no edits to FORAWWV; add implementation-notes or extend existing specs where appropriate)
- **Phase 0:** Add JNA_status to §7 Hand-Off Data and §8 Output Contract (transition_begun, withdrawal_progress, asset_transfer_RS). Ensure Phase 0→I implementation passes it.
- **Phase I/II:** Document that ceasefire and Washington precondition checks must run in Phase II when applicable (either Phase II pipeline steps or shared step invoked from both phases). Add to Phase II Spec and PIPELINE_ENTRYPOINTS.
- **Rulebook:** Add a "Player's Turn Guide" or "Player Actions per Phase" section (Phase 0: allocate capital, …; Phase I: …; Phase II: review reports, postures, attack orders, corps operations, end turn).
- **War termination:** Add a minimal Phase II→End or "War termination" subsection (in Phase II Spec or Systems Manual): when negotiation opens, how game ends, minimal evaluation criteria. Defer full Dayton analogue to a follow-up spec.

### Roadmap (PM to sequence)
1. **Critical path:** (1) War termination / end-game minimal spec + (2) Player action guide + (3) AoR/OSID reconciliation plan + (4) Supply spec. Order to be set by PM; (1) and (2) unblock playtesting soonest.
2. **Important:** Phase I→II edge cases (stuck-in-Phase-I, entrenchment init policy), Phase II ceasefire/Washington pipeline fix, late-war intervention (Operation Storm) spec, scoring/evaluation.
3. **Nice-to-have:** Consequence Ledger, enclave collapse events, JNA neutrality, Federation stress — backlog; no commitment.

### Ledger
- **Ledger entry:** Document that the comprehensive review (20260222) was convened (Orchestrator + Architect + PM), synthesis captured, and that next steps are canon/roadmap/ledger as above. No behavior change in this convene; ledger note is for traceability.

---

## 4. Pushbacks — Overstates, Conflicts with Canon, Scope/Process

### Overstates
- **"Triple identity crisis will cause endless bugs":** The situation is real and should be fixed, but "endless bugs" overstates. Current code paths are known; the risk is confusion and future bugs if left unreconciled. Treat as high priority, not apocalyptic.
- **"Supply is handwaved":** Systems Manual §14 and pipeline steps exist; the gap is a **formal specification** (sources, graph tracing, corridors). So: "supply is referenced but not fully specified" is accurate; "handwaved" is strong.
- **"Recruitment is half-specified":** Canon does cover Phase 0 potential, Phase I emergence, Phase II recruitment in broad terms; the missing piece is **player** recruitment rules and costs. Frame as "player recruitment underspecified" to avoid implying nothing exists.

### Conflicts with canon
- **No change to canon from this review:** All recommendations are additive (implementation-notes, new sections, hand-off contract completion) or new design work. Nothing here contradicts Engine Invariants, Phase Specs, or Rulebook. If any future change (e.g. Fog of Competence) introduces new mechanics, it must go through normal canon process (Game Designer, FORAWWV addendum if needed).
- **Determinism:** All suggested mechanics (Fog of Competence, Consequence Ledger, events) must remain deterministic and stable-ordered; no randomness, no timestamps in derived outputs.

### Scope/process
- **Single "OSID Migration Canon Amendment":** Prefer a **reconciliation plan** (owned by Architect) that includes migration path and transitional state, not one big amendment. PM sequences work so that playtesting can continue during transition.
- **War termination:** Define minimal "game has an ending" first (thresholds, end state, minimal scoring). Full Dayton analogue and full negotiation system can be phased; avoid one giant war-termination epic.
- **Nice-to-have ideas:** Consequence Ledger, Srebrenica-type events, JNA negotiation, Federation stress are explicitly **not** committed. They go to backlog/exploration; no scope creep without explicit PM/Orchestrator decision.

---

## 5. Suggestions — Gaps the Review Missed or Alternatives

### Gaps the review missed
- **Phase 0 output contract completeness:** Beyond JNA_status, confirm whether `transition.phase_0_end_turn`, `phase_1_start_turn`, and `escalation_reason` are implemented and persisted; if not, add to contract and implementation.
- **Phase II run in headless vs desktop:** Some front/corps state is desktop-only (e.g. corps_front_edges). Headless runs may not exercise the same pipeline surface; regression and acceptance criteria should cover both.
- **Determinism and ordering:** Any new system (supply, war termination, scoring) must specify stable ordering and no timestamps; call out in spec and Engine Invariants.
- **Reports propagation:** When new canon or behavior is added, update CONSOLIDATED_IMPLEMENTED, IMPLEMENTED_WORK_CONSOLIDATED, and 40_reports README per reports-custodian practice.

### Alternative ways to address review points
- **Entrenchment at Phase II start:** Instead of backfilling from Phase I control duration, consider a **scenario parameter** (e.g. `phase_ii_entrenchment_init_turns`) so scenarios can set 0 or a default (e.g. 4) without new derivation logic. Simpler and deterministic.
- **Stuck in Phase I:** Besides time-based fallback, consider **player-triggered "Force Phase II"** (with clear UI warning) for sandbox/testing, rather than only automatic transition. Optional; document as dev/sandbox-only if adopted.
- **Player action guide:** Could live as a **separate doc** (e.g. "Player's Turn Guide") linked from Rulebook, instead of a large Rulebook rewrite. Keeps Rulebook systems-first while serving playtesters.

---

## Summary Table

| Review priority       | Verdict        | Next step                                      |
|-----------------------|----------------|------------------------------------------------|
| War termination       | Agree          | Minimal spec (when/how game ends, scoring)     |
| Supply spec           | Agree          | Formal spec after critical path                |
| Player action guide   | Agree          | Add to Rulebook or linked doc                  |
| AoR/OSID reconciliation | Agree        | Architect reconciliation plan; PM sequence     |
| Phase I→II edge cases | Agree          | Stuck-in-Phase-I + entrenchment policy         |
| Ceasefire/WA in Phase II | Agree       | Add steps or shared milestone in Phase II       |
| Late-war (Storm)      | Agree          | Spec as design; implement after canon          |
| Scoring               | Agree          | Minimal evaluation with war termination        |
| Consequence Ledger    | Nice-to-have   | Backlog                                        |
| Enclave events        | Nice-to-have   | Backlog                                        |
| JNA negotiation       | Explore        | Design exploration                             |
| Federation stress     | Explore        | Design exploration                             |

---

*Orchestrator convened Technical Architect and Product Manager perspectives; this document is the synthesized response. No canon or FORAWWV edits were made. Ledger entry recommended for traceability.*

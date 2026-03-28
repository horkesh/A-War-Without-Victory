# Working On (2026-03-28)

## Current State
- n1150: **92.2% area-weighted (ATH), 22/22 anchors, 6/6 benchmarks**
- All fixes implemented and verified via 40w run

---

## COMPLETED THIS SESSION

1. **validateOpAtInjection engine gate** — `operation_validation.ts`, 5 checks (A-E), wired at 3 injection points, output in run_summary.json
2. **Ghost sector sanitizer** — `sanitize-ghost-sector-power` pipeline step in war_phases.ts (step 148)
3. **Check #12 false positive fix** — consolidation-only success exclusion in anomaly_detector.ts
4. **Check C validation logic** — definition order instead of sorted order (5 false positives eliminated)
5. **Op Teočak vitinica_recovery removed** — dead axis targeting own faction (sapna = RBiH)
6. **3 staging fixes** — Koridor/brcko (crnjelovo_donje), Drina/bratunac (slapasnica), Prsten/northern (podlugovi)
7. **Investigation report** — `docs/40_reports/20260328_OPS_VALIDATION_INVESTIGATION.md`

---

## DEFERRED (next session)

### P1: Empty sector edge-count triage
- 5 empty contested sectors (same every run, deterministic)
- Root cause: `ensureMinimumSectorCoverage` requires 2+ brigade donors
- Fix: allow borrowing from 1-brigade sectors when empty sector has more front edges
- Egregious: SRK sector:1 (14 edges, 0 brigades)
- File: `src/sim/combat/brigade_assignment.ts`

### P2: Operation-aware pre-flight recruitment
- Brigade spawn timing mismatch: ops inject before recruitment in pipeline
- rs_2nd_herzegovina (available_from=0, created t14), arbih_254th (available_from=4, created t31)
- Fix: force-recruit operation-critical brigades at injection time
- Requires threading OOB catalog to `buildAxesFromDef`
- File: `src/sim/combat/pre_planned_operations.ts`, `src/sim/recruitment_engine.ts`

### P3: Corps exhaustion cooldown + counter-attack broadening
- 77 brigades (33%) never fight — target 20-25%
- 50 are on front lines but never ordered into combat
- Fix: reduce cooldown (8→5), rotate idle brigades, broaden counter-attacks
- Files: `src/sim/combat/sector_offensive.ts`, `src/sim/combat/bot_corps_directives.ts`

### P4: RBiH overmobilized at 161k (War-or-Game #43)
- Historical ARBiH 100-130k by Jan 1993. Sim produces 161k (mid-1994 number)
- Needs investigation: mobilization rate too high? Pool accounting leak?
- Files: `src/sim/recruitment_engine.ts`, `ongoing_mobilization.ts`

### P5: Inverted casualty ratio 0.43 att:def (War-or-Game #44)
- Defenders take ~2x attacker casualties across all battles
- Historical: attackers lose more (1.5-3:1)
- Root cause: cube-root scaling at extreme power ratios (5-28:1) annihilates defenders
- May need attacker casualty floor at high PR
- Files: `src/sim/combat/combat_math.ts`, `attack_resolution_osid.ts`

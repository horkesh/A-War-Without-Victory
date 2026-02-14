# Phase 0 Full Progression — Orchestrator Report

**Convened by:** Orchestrator  
**Date:** 2026-02-08  
**Purpose:** Ensure phase0_full_progression scenario runs multiple times, militia/brigades spawn, AoR assigned, and human-readable reports include army strengths and control/muni flips.

---

## Big-picture summary

- **Where we are:** Phase 0 scenario support exists. Scenarios can start at Turn 0, transition Phase 0 → Phase I → Phase II. Formation spawn required a directive; AoR is Phase II–only.
- **Where we're going:** Scenario runs several times for determinism; militia/brigades spawn via directive; bots/harness assign formations when needed; human-readable reports include army strengths.

---

## Single agreed priority (completed)

**Priority:** Enable militia/brigade spawn, multiple runs, and richer human-readable reports for phase0_full_progression.

**Owner:** Gameplay Programmer (via implementation).

---

## Team coordination decisions

| Role | Decision / Handoff |
|------|--------------------|
| **Orchestrator** | Set priority; documented in this report. |
| **Gameplay Programmer** | Implement formation_spawn_directive in scenario, army strengths in end report, repeat-run script. |
| **Scenario Harness** | Formation assignment to edges already occurs when phase_ii and postureAllPushAndApplyBreaches. AoR derived by phase-e-aor-derivation in pipeline. |

## New subagents (2026-02-08)

Two Cursor skills were added for ongoing work:

1. **formation-expert** (`.cursor/skills/formation-expert/`)  
   - Owns militia spawning, brigade formation, militia pools, formation_spawn_directive, pool population, and constants (POOL_SCALE_FACTOR, batchSize).  
   - Use when explaining why formations did or did not spawn, or when changing formation/pool logic.

2. **scenario-creator-runner-tester** (`.cursor/skills/scenario-creator-runner-tester/`)  
   - Knows BiH war history; creates historical scenario starting points; runs and tests scenarios; flags ahistorical or unintended results.  
   - Proposes **conceptual** fixes (design, data, scenario config), not code. Hands off implementation to harness, gameplay-programmer, or formation-expert.

---

## Implemented changes

### 1. Scenario `formation_spawn_directive`

- Added optional `formation_spawn_directive` to scenario JSON.
- When set, harness applies it at init so Phase I spawn step runs (FORAWWV H2.4).
- `phase0_full_progression_20w.json` and `phase0_full_progression_52w.json` now include `"formation_spawn_directive": { "kind": "both" }`.

### 2. Run scenario multiple times

- New script: `tools/scenario_runner/run_phase0_repeat.ts`
- Runs `phase0_full_progression_52w` three times into separate dirs, compares `final_state_hash` for determinism.
- npm script: `npm run sim:scenario:phase0-repeat`

### 3. Militia / brigades / AoR

- **Militia spawn:** Runs when `formation_spawn_directive` is active and militia pools have available manpower (batchSize 1000).
- **Brigades:** Same spawn logic; kind controlled by directive.
- **AoR:** Phase I forbids AoR. Phase II runs `phase-e-aor-derivation`. Harness assigns unassigned formations to front edges when `phase_ii` and `postureAllPushAndApplyBreaches`.

### 4. Human-readable reports

- **Army strengths (end state):** Formations by faction (militia / brigade / other), militia pools by faction, AoR settlement counts.
- Added `computeArmyStrengthsSummary` and "Army strengths (end state)" section to `end_report.md`.

### 5. Serializer

- Added `formation_spawn_directive` to `GAMESTATE_TOP_LEVEL_KEYS` so state with directive serializes correctly.

---

## Usage

```bash
# Single run (20 weeks)
npx tsx tools/scenario_runner/run_scenario.ts --scenario data/scenarios/phase0_full_progression_20w.json --posture-all-push

# Single run (52 weeks)
npx tsx tools/scenario_runner/run_scenario.ts --scenario data/scenarios/phase0_full_progression_52w.json --posture-all-push

# Run 3 times and verify determinism
npm run sim:scenario:phase0-repeat
```

---

## Notes

- Phase II requires JNA transition (withdrawal ≥ 0.95, asset transfer ≥ 0.90); 52 weeks may reach Phase II.
- `run_phase0_repeat` can take several minutes (52 weeks × 3 runs).
- End report paths: `end_report.md`, `control_delta.json`, `formation_delta.json`, `weekly_report.jsonl`.

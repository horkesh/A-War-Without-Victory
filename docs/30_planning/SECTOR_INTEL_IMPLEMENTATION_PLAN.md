# Sector-Native Recon: Implementation Plan

**Date:** 2026-03-05
**Orchestrator:** Paradox Orchestrator
**Lead implementer:** Gameplay Programmer
**Reviewers:** Technical Architect, Determinism Auditor, QA Engineer

---

## 0. Required Reading

| Document | Why |
|---|---|
| docs/10_canon/Engine_Invariants_v0_6_0.md | Determinism rules |
| docs/10_canon/Systems_Manual_v0_6_0.md | Corps sector system |
| docs/20_engineering/PIPELINE_ENTRYPOINTS.md | Step ordering contract |
| docs/20_engineering/REPO_MAP.md | Change X to Go Here |
| src/sim/combat/corps_front_sectors.ts | Sector data structures |
| src/sim/combat/bot_corps_ai.ts | How offensive_targets is built |
| src/sim/combat/attack_resolution_osid.ts | Combat hook for recon-by-force |
| src/state/game_state.ts | GameState schema |
| src/state/serializeGameState.ts | GAMESTATE_TOP_LEVEL_KEYS whitelist |
| src/sim/combat/recon_intelligence.ts | What is being deleted |
| src/ui/map/data/types.ts | ReconIntelligenceView |
| src/ui/map/data/GameStateAdapter.ts | reconIntelligence extraction |
| src/ui/map/map/builders/buildFogOfWarGeoJSON.ts | Fog of war builder |
| This plan (in full) | Sequencing dependencies |

## 1. Problem Statement

recon_intelligence.ts runs a BFS over the canonical SID graph each turn.
Output is SID-keyed. The entire Phase II engine runs in OSID space.
Bots never read it. GUI uses only confirmed_empty to partially drive fog of war.
The operationalToCanonical indirection in war_phases.ts is the smell of a
legacy system fighting the current architecture.

---

## 2. Design Summary

Replace with sector-facing intelligence: for each friendly corps sector, track
what is known about the enemy sector(s) it faces across the front.

Two outputs per sector pair:
1. Sector intel record: strength category, posture, offensive signs
2. Visible enemy brigades: which brigade IDs are revealed at current confidence

Fog of war is the default. Recon lifts fog progressively as confidence builds.
Recon by force: any combat engagement immediately sets confidence to 1.0.

Faction recon profiles (faction-level constants, no unit tags):

| Faction | Passive buildup | Decay | Range | Probe gain | Probe casualty factor |
|---|---|---|---|---|---|
| RBiH | 0.30/turn | 0.10/turn | 2 | 0.50 | 0.15 |
| RS | 0.20/turn | 0.25/turn | 1 | 0.35 | 0.25 |
| HRHB | 0.20/turn | 0.25/turn | 1 | 0.35 | 0.25 |

ARBiH advantage: slower decay (embedded civilian networks), range 2
(second-echelon sectors visible), cheaper probes (guerrilla heritage).

Confidence thresholds:

| Confidence | Strength | Posture | Visible brigades |
|---|---|---|---|
| < 0.2 | unknown | unknown | none |
| 0.2-0.5 | rough (thin/moderate/dense) | unknown | none |
| 0.3-0.6 | rough | unknown | front-adjacent OSIDs only |
| 0.5-0.8 | accurate | defensive/entrenched | all in sector |
| > 0.8 + range 2 | accurate | + offensive_prep | second-echelon too |

---

## 3. New Types (game_state.ts)

Add:

    export type SectorStrengthCategory = "unknown" | "thin" | "moderate" | "dense" | "fortress";
    export type SectorPostureObserved = "unknown" | "defensive" | "entrenched" | "offensive_prep";

    export interface SectorIntelRecord {
        enemy_sector_id: string;
        enemy_faction: string;
        enemy_corps_id: string;
        front_edge_count: number;         // always known
        strength_category: SectorStrengthCategory;
        posture_observed: SectorPostureObserved;
        offensive_signs: boolean;
        confidence: number;               // [0.0, 1.0]
        turns_in_contact: number;
        visible_brigade_ids: string[];    // sorted, enemy brigade IDs revealed
        last_updated_turn: number;
    }

    // On GameState (replaces recon_intelligence):
    // sector_intel?: Record<string, SectorIntelRecord[]>;
    // key = friendly_sector_id -> array (one per facing enemy sector)

Remove from game_state.ts:
- ReconStrengthCategory, DetectedBrigadeInfo, ReconIntelligence types
- recon_intelligence?: Record<FactionId, ReconIntelligence>

---

## 4. New Files

### 4a. src/sim/combat/sector_intel_constants.ts

    export interface FactionReconProfile {
        passive_buildup_per_turn: number;
        confidence_decay_per_turn: number;
        range: number;
        probe_confidence_gain: number;
        probe_casualty_factor: number;
    }

    export const FACTION_RECON_PROFILES: Record<string, FactionReconProfile> = {
        RBiH: { passive_buildup_per_turn: 0.30, confidence_decay_per_turn: 0.10,
                range: 2, probe_confidence_gain: 0.50, probe_casualty_factor: 0.15 },
        RS:   { passive_buildup_per_turn: 0.20, confidence_decay_per_turn: 0.25,
                range: 1, probe_confidence_gain: 0.35, probe_casualty_factor: 0.25 },
        HRHB: { passive_buildup_per_turn: 0.20, confidence_decay_per_turn: 0.25,
                range: 1, probe_confidence_gain: 0.35, probe_casualty_factor: 0.25 },
    };

    export const CONFIDENCE_ROUGH_STRENGTH = 0.2;   // thin/moderate/dense visible
    export const CONFIDENCE_FRONT_BRIGADES = 0.3;   // front-adjacent brigades visible
    export const CONFIDENCE_FULL_STRENGTH  = 0.5;   // accurate strength + posture
    export const CONFIDENCE_DEEP_INTEL     = 0.8;   // offensive_signs + range-2

    export const DENSITY_THIN_RATIO     = 0.5;      // < 0.5x corps avg = thin
    export const DENSITY_DENSE_RATIO    = 1.5;      // > 1.5x corps avg = dense
    export const DENSITY_FORTRESS_RATIO = 2.5;      // > 2.5x corps avg = fortress

### 4b. src/sim/combat/sector_intel.ts

Exports:

    deriveSectorIntel(state: GameState, edges: EdgeRecord[]): void
      Full per-turn computation. Called by pipeline step derive-sector-intel.

    updateSectorIntelFromCombat(state: GameState, attackerOsid: string, defenderOsid: string): void
      Called after each engagement. Sets confidence to 1.0 for the sector pair.

Algorithm for deriveSectorIntel:

    For each faction (sorted via strictCompare):
      profile = FACTION_RECON_PROFILES[faction] ?? RS defaults
      Friendly sectors = sectors in corps_front_sectors where faction matches, sorted

      For each friendly sector S (sorted by sector_id):
        Find enemy sectors sharing front edges with S:
          For each edge_id in S.edge_ids, find side NOT belonging to faction
          Scan corps_front_sectors to find which sector contains that enemy OSID
          Deduplicate; sort by enemy_sector_id

        For each enemy sector E (sorted):
          Look up prior record from current state.sector_intel[S.sector_id]
          If S and E share >= 1 front edge:
            turns_in_contact = (prior.turns_in_contact ?? 0) + 1
            confidence = min(1.0, prior_confidence + profile.passive_buildup_per_turn)
          Else:
            turns_in_contact unchanged
            confidence = max(0.0, prior_confidence - profile.confidence_decay_per_turn)

          corps_avg_density = total_corps_brigades / max(1, total_corps_edges)
          enemy_density = E.assigned_brigade_ids.length / max(1, E.length_edges)

          strength_category (gated by CONFIDENCE_ROUGH_STRENGTH):
            confidence < 0.2: unknown
            enemy_density < avg * DENSITY_THIN_RATIO: thin
            enemy_density < avg * DENSITY_DENSE_RATIO: moderate
            enemy_density < avg * DENSITY_FORTRESS_RATIO: dense
            else: fortress

          posture_observed (gated by CONFIDENCE_FULL_STRENGTH):
            confidence < 0.5: unknown
            majority E brigades have posture dig_in: entrenched
            E.corps has active sector_attack op AND confidence >= 0.8: offensive_prep
            else: defensive

          offensive_signs:
            confidence >= 0.8 AND enemy_density > avg * DENSITY_FORTRESS_RATIO * 0.7

          visible_brigade_ids:
            confidence >= 0.3: add brigades at E OSIDs touching front edges with S
            confidence >= 0.5: add all E.assigned_brigade_ids
            confidence >= 0.8 AND profile.range >= 2:
              find neighboring enemy sectors (share edges with E)
              add their assigned_brigade_ids
            deduplicate; sort via strictCompare

          Write SectorIntelRecord for (S.sector_id, E.sector_id)

    Replace state.sector_intel entirely each turn (no stale accumulation)
    Records per friendly_sector_id sorted by enemy_sector_id

updateSectorIntelFromCombat:
    1. Find friendly sector containing attackerOsid
    2. Find enemy sector containing defenderOsid
    3. Set confidence = 1.0 on matching SectorIntelRecord
    4. Recompute strength_category, posture_observed, visible_brigade_ids accurately
    5. Set last_updated_turn = state.meta.turn
    6. If no record exists yet, create one with turns_in_contact = 1

---

## 5. Modified Files

### 5a. src/state/game_state.ts
- Remove: ReconStrengthCategory, DetectedBrigadeInfo, ReconIntelligence
- Remove: recon_intelligence field
- Add: SectorStrengthCategory, SectorPostureObserved, SectorIntelRecord
- Add: sector_intel?: Record<string, SectorIntelRecord[]>

### 5b. src/state/serializeGameState.ts
- Remove: recon_intelligence from GAMESTATE_TOP_LEVEL_KEYS
- Add: sector_intel near corps_front_sectors

### 5c. src/sim/turn_phases/war_phases.ts
- Remove import of updateReconIntelligence from recon_intelligence.js
- Add import of deriveSectorIntel from sector_intel.js
- Replace step phase-ii-recon-intelligence with derive-sector-intel:

    { name: "derive-sector-intel",
      run: async (context) => {
        if (context.state.meta.phase \!== "war") return;
        const { edges } = await getGraphAndEdges(context);
        if (\!edges?.length) return;
        deriveSectorIntel(context.state, edges);
    }},

Position: after partition-corps-front-sectors, before generate-bot-corps-orders.

### 5d. src/sim/combat/attack_resolution_osid.ts
After recordAttackerEngagements / recordDefenderEngagement per engagement:

    updateSectorIntelFromCombat(state, attackerOsid, defenderOsid);

### 5e. src/sim/combat/bot_corps_ai.ts
After offensiveTargets is finalized (after avoided_osids filter),
apply sector intel score weighting:

    const sectorIntel = state.sector_intel ?? {};
    const targetScore: Record<string, number> = {};
    for (const osid of offensiveTargets) {
        targetScore[osid] = 0;
        const enemySector = findSectorContainingOsid(state, osid);
        if (\!enemySector) continue;
        for (const sid of corpsSectors.map(s => s.sector_id)) {
            const record = (sectorIntel[sid] ?? [])
                .find(r => r.enemy_sector_id === enemySector.sector_id);
            if (\!record) continue;
            if (record.strength_category === "thin")    targetScore[osid] += 2;
            if (record.strength_category === "unknown") targetScore[osid] += 1;
            if (record.strength_category === "dense")   targetScore[osid] -= 1;
            if (record.strength_category === "fortress") targetScore[osid] -= 2;
            if (record.offensive_signs && \!reinforceSectorIds.includes(sid))
                reinforceSectorIds.push(sid);
        }
    }
    // Stable sort: higher score first; ties broken by strictCompare
    offensiveTargets.sort((a, b) =>
        (targetScore[b] ?? 0) - (targetScore[a] ?? 0) || strictCompare(a, b));

Helper findSectorContainingOsid(state, osid): scan state.corps_front_sectors
for a sector whose sub_segments contain the osid. Use sorted iteration.

### 5f-5h. GUI files — GUI AGENT SCOPE

5f. src/ui/map/data/types.ts
  - Replace ReconIntelligenceView with SectorIntelRecordView
  - Add to LoadedGameState: sectorIntel, visibleEnemyBrigadeIds
  - Remove: reconIntelligence

5g. src/ui/map/data/GameStateAdapter.ts
  - Replace reconIntelligence extraction with sectorIntel extraction
  - Compute visibleEnemyBrigadeIds as sorted union of visible_brigade_ids
    from all SectorIntelRecord[] for player faction sectors

5h. src/ui/map/map/builders/buildFogOfWarGeoJSON.ts
  - New signature: accepts visibleEnemyBrigadeIds: Set<string> instead of reconIntelligence
  - Enemy OSID fogged unless visible enemy brigade has location_osid === osid
  - Enemy territory with no brigade always fogged

---

## 6. Deleted Files

src/sim/combat/recon_intelligence.ts - deleted in Phase 4.

Verify with grep before commit:

    grep -r recon_intelligence src/ --include=*.ts | grep -v _archived
    grep -r ReconIntelligence src/ --include=*.ts | grep -v _archived

Both must return zero matches.

---

## 7. Tests (tests/sector_intel.test.ts)

| # | Test | Assertion |
|---|---|---|
| T1 | Two sectors share front edges 5 turns | confidence = 1.0 |
| T2 | Contact breaks after 4 turns | confidence decays to 0 |
| T3 | RBiH decay slower than RS | 4 turns no contact: RBiH > RS |
| T4 | updateSectorIntelFromCombat | confidence = 1.0 immediately |
| T5 | Confidence 0.1 | strength=unknown, no visible brigades |
| T6 | Confidence 0.4 | rough strength, no brigades, no posture |
| T7 | Confidence 0.65 | all sector brigades visible, posture observed |
| T8 | RBiH confidence 0.85 + range 2 | second-echelon visible, offensive_signs |
| T9 | RS confidence 0.85 + range 1 | second-echelon NOT visible |
| T10 | visible_brigade_ids output | always sorted by strictCompare |
| T11 | SectorIntelRecord[] output | sorted by enemy_sector_id |
| T12 | Fortress facing sector | bot_corps_ai deprioritizes |
| T13 | Thin facing sector | bot_corps_ai promotes |

---

## 8. Execution Phases

### Phase 1 - Constants + Types (no behavioral change)
Owner: Gameplay Programmer | Checkpoint: npm run typecheck passes

1. Create sector_intel_constants.ts
2. Add new types to game_state.ts (keep old types for now)
3. Add sector_intel to GAMESTATE_TOP_LEVEL_KEYS

### Phase 2 - New Engine Module
Owner: Gameplay Programmer | Checkpoint: T1-T11 pass, hash stable across 2 runs

1. Create sector_intel.ts (deriveSectorIntel + updateSectorIntelFromCombat)
2. Write tests/sector_intel.test.ts (T1-T11)
3. Wire derive-sector-intel step alongside existing step (both run temporarily)
4. Wire updateSectorIntelFromCombat in attack_resolution_osid.ts
5. Run 40w scenario - verify sector_intel populated in output JSON
6. Two 40w runs - confirm identical state hash

### Phase 3 - Bot Integration
Owner: Gameplay Programmer | Checkpoint: 40w within +/-1pp of n22 (83.3%)

1. Modify bot_corps_ai.ts (sector intel target weighting + offensive_signs reinforce)
2. Run 40w scenario - record area-weighted match rate
3. If regression > 0.5pp: revert, investigate, do not proceed
4. Write T12 + T13

### Phase 4 - Old System Removal
Owner: Gameplay Programmer | Checkpoint: Zero old-type refs, all tests green

1. Remove phase-ii-recon-intelligence step + import from war_phases.ts
2. Delete src/sim/combat/recon_intelligence.ts
3. Remove old types + field from game_state.ts
4. Remove recon_intelligence from GAMESTATE_TOP_LEVEL_KEYS
5. Run grep verification (section 6)
6. npm run test:vitest - all green

### Phase 5 - GUI (can parallel Phase 3)
Owner: GUI Agent | Checkpoint: npm run desktop:map:build passes

1. Replace ReconIntelligenceView in types.ts
2. Replace reconIntelligence in GameStateAdapter.ts
3. Update buildFogOfWarGeoJSON to use visibleEnemyBrigadeIds
4. Visual check: below threshold fogged, above visible

---

## 9. Determinism Checklist

| Check | Location |
|---|---|
| Object.keys(corps_front_sectors) sorted via strictCompare | sector_intel.ts |
| visible_brigade_ids always .sort(strictCompare) | sector_intel.ts |
| SectorIntelRecord[] sorted by enemy_sector_id | sector_intel.ts |
| No Math.random(), no Date.now() | all new files |
| updateSectorIntelFromCombat uses state.meta.turn | sector_intel.ts |
| Bot target reorder: tied scores sorted by strictCompare(osid) | bot_corps_ai.ts |
| T10 and T11 enforce sorted output | tests/sector_intel.test.ts |

---

## 10. Canon Compliance

Purely structural + intelligence-layer. Does not affect:
- Attack resolution outcomes
- Formation or political control state
- Supply, morale, or casualty calculations

No canon spec changes required.

---

## 11. Orchestrator Delegation

| Phase | Owner | Review |
|---|---|---|
| 1 - Constants + Types | Gameplay Programmer | Technical Architect |
| 2 - Engine Module | Gameplay Programmer | Determinism Auditor |
| 3 - Bot Integration | Gameplay Programmer | QA (40w calibration) |
| 4 - Old System Removal | Gameplay Programmer | QA (full test suite) |
| 5 - GUI | GUI Agent | UI/UX Developer |
| Post-impl | Orchestrator | /create-report, ledger, docs propagation |

Process QA after Phase 4 (engine complete) and after Phase 5 (full system).

---

## 12. Probe Posture Note

BrigadePosture does not currently include probe. Defer probe to follow-up.
Passive contact + recon-by-force already delivers meaningful sector intelligence.
Probe requires a new posture value, modified attack resolution, and calibration
validation - separate scope.

---

## 13. Acceptance Criteria

- [ ] recon_intelligence.ts deleted; zero references to old types (excl. _archived/)
- [ ] sector_intel populated each turn in scenario output JSON
- [ ] T1-T13 tests pass
- [ ] npm run test:vitest all green
- [ ] npm run typecheck passes
- [ ] 40w area-weighted match within +/-1pp of n22 (83.3%)
- [ ] State hash stable across two identical 40w runs
- [ ] GUI: enemy brigades hidden below threshold, visible above
- [ ] PIPELINE_ENTRYPOINTS.md updated (derive-sector-intel step)
- [ ] REPO_MAP.md updated (sector intel Change X to Go Here entry)
- [ ] PROJECT_LEDGER.md entry appended
- [ ] Implementation report in docs/40_reports/implemented/

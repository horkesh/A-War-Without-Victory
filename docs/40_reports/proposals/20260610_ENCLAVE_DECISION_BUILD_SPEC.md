# BUILD SPEC — Presidential Enclave Decision (OVERRUN vs CONTAIN)

**Type:** READ-ONLY build specification. No engine/sim/state/UI/data/test code written in producing this. No canon edited. No `FORAWWV.md` touched. This document QUOTES existing canon + code (file:line) and FLAGS decisions; it DECIDES nothing.
**Status:** ⚠️ **DRAFT — HELD for Pyrrhic §6-panel ratification.** Authorizes NO code. This is a §6-sensitive combat feature in the highest tier of the canon hierarchy (Sensitive History gate, Tier 2). Engine work is BLOCKED on the §10 sign-off of the ratified DESIGN and on this spec.
**Predecessors (read first):**
- Ratified design: `docs/plans/2026-06-09-presidential-enclave-decision-DESIGN.md` (owner intent; this spec is its buildable form).
- §6 gate: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (§1 rings, §2 rupture rule, §3 player-authorized war-crime surface + Ring-3 refusals, §4 wording, §5 ghost entries, §6 sign-off).
- Engine Invariants v0.9.0 §6 (one flip per attack resolution), §8 (exhaustion monotonic), §9.6 (authorized control change / no passive pressure flip).
- Collapse §6 packet (the concurrent edit): `docs/40_reports/proposals/20260609_COLLAPSE_S6_HISTORIAN_GATE_PACKET.md` (protected-enclave set + the G1 root-write guard pattern this spec reuses).
- Collapse build spec (the serializer-collision source): `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md` (§4 guard, §3 constants, the `state.political` damage/modifier write root).

**Why spec-first (not build-now):** this is a §6-weight combat feature AND collapse-phase1 is concurrently editing the serializer (`save_migration`) + the combat/pressure path. We spec now and build right after collapse clears, to avoid a serializer/combat collision (§1.4). This mirrors how collapse itself was spec'd then built.

**Strategy posture (CALIBRATION-LAST):** this is a soul-system (authored moral choice), NOT a calibration lever. The 188w floor (`5f57d17287b87dfb`, anchors 30/30 — `CALIBRATION_MASTER.md` / MEMORY) is a regression GUARD. The bot-side `contain` lanes (V #339 / A #341) were shelved precisely because they were calibration-inert; this feature replaces them with a player-authored decision, not a match-% lever.

---

## 0. TL;DR for the owner

- **What it is:** when the player's faction besieges an isolated enemy enclave, the President may author **OVERRUN** (assault to capture — bloody, displacing, condemned) or **CONTAIN** (siege/squeeze — the historical strangle). OVERRUN is an **ATTACK ORDER routed through normal combat** — it lifts the besieger's restraint and lets the corps generate the assault axis; the assault **can be repulsed**; the fall (if it happens) is a normal control-flip. It is NEVER an auto-fall.
- **The single load-bearing §6 fact (verified in code):** the directive cannot create a flip, a reward, or a casualty by itself. OVERRUN only *removes restraint*; the fall flows through the EXISTING `resolveAttackOrdersOsid` path (`attack_resolution_osid.ts:461`, one flip per attack, `:1230–1231`), against the EXISTING resilience defence (`getEnclaveDefenseBonus` / `getEnclaveGarrisonPower`). For the eastern case the fall satisfies the EXISTING, UNCHANGED `srebrenica_genocide_1995` rupture predicate (`rupture_consequences.ts:37–72`). Atrocity is a **consequence, never a lever** (gate §0).
- **Serializer-collision flag (§1.4):** the new idempotency field would live at `state.political.enclave_decisions`, in the SAME `PoliticalState` (`game_state.ts:2826`) and the SAME `save_migration` registry collapse-phase1 is editing for `collapse_damage` / `capacity_modifiers` (`game_state.ts:2837–2838`). Both add a new `state.political.*` Record + a new migration version + an empty-Record-changes-the-hash effect (the v34/v36 lesson). **Sequence after collapse so the migration version is allocated without a collide-renumber.**
- **Default-OFF + byte-identical-while-disabled gate:** the whole feature is behind a default-OFF flag; with it OFF, 40w must stay `be76e56dd9d288c2` and 188w `5f57d17287b87dfb` byte-identical. Bots never see the card → headless/calibration runs are inert by construction.
- **§6 guard:** (a) the Srebrenica/Žepa rupture + its timing are UNTOUCHED; (b) atrocity is NEVER net-positive (score does not invert, gate §3 #4); (c) with the feature default-OFF all protected outcomes are byte-identical; (d) OVERRUN cannot record a rupture *before* turn 140 (it routes through the same predicate, which floors at 140).
- **Build order:** spec → Pyrrhic-panel ratify → build default-OFF (ARBiH-HVO lighter §6 first, then VRS-eastern full §6) → §6 invariant test green → enable + calibrate.

---

## 1. State additions

### 1.1 New decision / order surface (no new combat order type)

OVERRUN/CONTAIN is a **presidential directive**, NOT a new brigade/combat order primitive. It reuses the existing directive contract:

- **Directive lever (build-time choice, §9.6):** add `'overrun_enclave'` and `'contain_enclave'` to the `PresidentialDecisionRoomDirective.lever` union (`src/ui/map/data/presidentialDecisionRoom.ts:40–50`). The `payload` carries `{ enclaveId, coreOsid, faction }` (the enemy enclave + its core OSID + the enclave faction — all read from `ENCLAVE_DEFINITIONS`). `cost` is read from the existing `commandAuthority` constants (a new `OVERRUN_ENCLAVE_COST` / `CONTAIN_ENCLAVE_COST` in `commandAuthority.ts`, or reuse `FORCE_LAUNCH_COST` — build-time call).
- **Card category:** a new `'conscience'` value on `PresidentialDecisionRoomCategory` (`presidentialDecisionRoom.ts:63–72`) — the §6-protected "Conscience & Atrocity" category, deliberately walled off from War Direction (Presidential Command Surface §9; design §1, §4d).
- **Alternative (build-time, §9.6):** a dedicated decision-surface in `decisionSurfaceRegistry` instead of a directive lever. UI-architecture call for `/ui-ux-developer` at build time. The directive-lever path is cheaper and reuses the proven DirectiveCard act-flow (objection → confirm).

**No new combat order type.** OVERRUN does not introduce a `brigade_attack_orders` variant; it flips a per-enclave restraint state (§1.2) that the existing target generator already reads (§2.1).

### 1.2 New state field — the per-enclave authorship marker (idempotency + ledger read)

Add to `PoliticalState` (`src/state/game_state.ts:2826`, alongside `collapse_damage?` / `capacity_modifiers?` at `:2837–2838`):

```ts
/**
 * Per-enclave presidential OVERRUN/CONTAIN authorship (Conscience & Atrocity).
 * Record of WHAT THE PLAYER AUTHORED — NOT a condemnation surface, NOT tradeable
 * at Dayton (gate §3 #3). Idempotent: one authorship per enclave per run.
 * Deterministic: sorted iteration on write/read; no wall-clock.
 */
enclave_decisions?: Record<string /* enclaveId */, EnclaveDecisionRecord>;
```

```ts
export interface EnclaveDecisionRecord {
  authored_turn: number;
  choice: 'overrun' | 'contain';
  player_faction: FactionId;
}
```

**OPEN (O-1 / §11):** the DESIGN (§6, §11 Q1) flags whether this field is acceptable at all, or whether authorship can be DERIVED from existing `consequenceReceipts` + rupture records without a new field. Spec recommends the explicit field for deterministic idempotency (the predicate in §1.3 needs a cheap "already authored?" read every turn, and `consequenceReceipts` is not keyed by enclaveId), but this is the owner's call — it is a new condemnation-adjacent field per gate §6 ("new condemnation flag → user approval").

### 1.3 Trigger predicate (pure, reads only existing data — no new fields beyond §1.2)

A `(playerFaction, enclave)` pair is **decidable** when ALL hold (design §1):
1. `state.meta.player_faction` holds the besieging corps AND `enclave.faction !== player_faction`. (Bot-vs-bot enclaves never surface a card.)
2. `isEnclaveContainable(state, enclave.capital, playerFaction, supplyReach)` is true (`enclave_resilience.ts:596`) — OSID belongs to an enemy enclave (a), BFS-isolated (b), past `resilience_start_turn` (c).
3. No prior `state.political.enclave_decisions[enclave.id]` (idempotent, §1.2).
4. A live besieging corps exists — at least one player front sector adjacent to the enclave ring (reuse the sector-adjacency the shelved stance computed via `evaluateSectorStances`).

**Default if never decided:** the enclave stays in its current emergent state (CONTAIN-by-default = the historical strangle). The bot/engine does NOT auto-overrun the player's enclave. Authoring CONTAIN and never-deciding are the same mechanical path; the difference is whether the card was *seen* (matters for the Authored-Choices ledger + the §6 awareness requirement, design §2c).

### 1.4 ⚠️ SERIALIZER COLLISION WITH COLLAPSE-PHASE1 (the reason this is spec-first)

The new `enclave_decisions` field collides with collapse-phase1 on three axes — all in `state.political` + `save_migration`:

| Axis | Collapse-phase1 | This feature | Collision |
|---|---|---|---|
| `PoliticalState` shape | adds/uses `collapse_damage`, `capacity_modifiers`, `local_strain` (`game_state.ts:2836–2838`) | adds `enclave_decisions` (same interface, ~10 lines away) | Two concurrent edits to the SAME interface block → merge conflict if built in parallel. |
| `save_migration` version | needs a new migration for its persisted Records (current head `CURRENT_SCHEMA_VERSION = 36`, `save_migration.ts:42`) | needs a new migration for `enclave_decisions` empty-Record default | Two features each claim "the next version." If built in parallel both grab v37 → a collide-renumber (the v34 lesson: "V34 IS FROZEN: do not collide-renumber it"). |
| Serialized hash | `serializeState` does NOT strip empty Records (v34/v36 migration notes), so a new empty Record CHANGES the migrated-save hash | same — `enclave_decisions` empty Record changes the hash too | If both land in one window, the byte-identical-disabled proof (§4) becomes ambiguous about which feature moved the hash. |

**Mitigation (the build-order rule):** build this feature AFTER collapse's serializer work has merged and re-floored. Then `enclave_decisions` claims the NEXT free migration version (collapse will have taken v37; this takes v38 or later), and the byte-identical-disabled proof is run against the post-collapse floor — attributing any hash move unambiguously to this feature's empty Record (which must be calibration-FLAT: control_delta byte-identical, only the migrated-save hash moves, per the v36 precedent). **Do NOT build the `enclave_decisions` migration on a branch that does not yet contain collapse's migration** — that is how the collide-renumber happens.

**Determinism contract (Sacred Rules):** no `Math.random()`, no `Date.now()`. Sorted iteration on `enclave_decisions` keys (`strictCompare` / `localeCompare`) anywhere it is iterated. Round-trip through `save_migration` like other political state (additive, forward-only, empty-Record default for old saves).

---

## 2. Combat wiring

### 2.1 How OVERRUN becomes an attack order through attack resolution

OVERRUN does NOT flip control and does NOT inject a casualty. It **lifts the besieger's restraint** so the existing corps targeting generates the assault axis into the enclave core, which then flows through the already-tested combat path:

1. **Confirm OVERRUN** → write `state.political.enclave_decisions[enclaveId] = { choice: 'overrun', authored_turn, player_faction }` (§1.2). This is the ONLY state the directive writes.
2. **Restraint lift:** the contain-suppression that would otherwise keep the player's corps off the enclave core is the *default* for a player enclave (CONTAIN-by-default, §1.3). OVERRUN removes that suppression for this enclave id. Mechanically this is the **shelved bot `contain` stance applied (inverted) as a player directive**: with CONTAIN, `buildOffensiveTargets` (`commander/emit.ts`) / `evaluateSectorStances` (`bot_corps_directives.ts`) suppress target generation into the enclave core OSID; with OVERRUN authored, that suppression is lifted for this enclave and the corps generates the assault axis as it would for any contested objective.
3. **Normal target → attack order:** the generated assault axis becomes a normal `brigade_attack_orders` entry through the existing commander emit path — NO new order type (§1.1).
4. **Normal resolution:** `resolveAttackOrdersOsid` (`attack_resolution_osid.ts:461`) resolves it — at most ONE OSID control flip per attack (Engine Invariants §6; `:1230–1231` writes `political_controllers[targetOsid] = attackerFaction`). The resilience defence bonus (`getEnclaveDefenseBonus`) + garrison power (`getEnclaveGarrisonPower`) apply UNCHANGED.

> **Bright line (design §2, §4c):** "the mechanic only ever removes/adds an attack the bot would generate; the fall flows through the existing combat path." The directive removes restraint; it cannot create a flip, a reward, or a casualty by itself.

### 2.2 How repulse works

Because OVERRUN is a normal attack against a resilience-hardened, garrisoned, dug-in pocket, the assault can **fail to flip control**:
- `resolveAttackOrdersOsid` computes attacker vs defender combat power; the defender's `getEnclaveDefenseBonus` + `getEnclaveGarrisonPower` + terrain/entrenchment can push the outcome below the flip threshold → **NO control flip** (`:1256–1258` restores the prior controller on a failed/contested resolution).
- The player still eats the casualties the attack produced (the §2a military cost — emergent from the combat model, not a flat number). A repulsed OVERRUN is the worst-of-both: blood spent, pocket still standing.
- The authorship record (§1.2) persists regardless of outcome — the player authored the assault; whether it succeeded is the engine's, not the card's. (Idempotency means the card does not re-surface; a player who wants to keep assaulting does so through ordinary corps ops, which the lifted restraint now permits.)

### 2.3 How cost + condemnation are applied (all through EXISTING channels — no new math)

| Cost component | Mechanism (existing) | File |
|---|---|---|
| **2a. Military casualties (own troops)** | Emergent from the existing combat model (resilience defence + garrison + ADR-0007 Path A attrition). Card shows a PROJECTION (a casualty band) drawn from the SAME predictor the officer pushback uses — `checkLaunchFeasibility` / force-eval — framed as the Chief of Staff's warning. NO new casualty math. | `combat_predictor.ts`, force-eval |
| **2b. Civilian displacement / death** | The fall through assault produces displacement via the EXISTING Ring-1 machinery: `displaced_out` / `lost_population` on capture, `seedDisplacementTimerOnFlip`; where paramilitaries are present, `paramilitary_sweep.ts` increments `war_crimes_events`. Card shows the projected civilian stake as an **integer count, never a %** (gate §4). NO new civilian-casualty model; NO target selection (gate §3 #1, #5). | `src/state/displacement.ts`, `src/sim/combat/paramilitary_sweep.ts` |
| **2c. Player awareness** | Card text in the §4-compliant prosecutorial register (third-person, ICTY-cited, integer counts, no euphemism/humour) states plainly what an assault on THIS pocket means. The player cannot OVERRUN unknowingly — the confirm step is the moment of authorship, recorded. | card content (`/narrative-designer` + `/historian`) |
| **2d. Condemnation + standing/patron hit, NEVER a reward** | Authorship recorded as an authored choice (seeds `consequenceReceipts`, surfaces in the Authored-Choices ledger). Carries a patron-confidence + international-standing hit through the EXISTING dimension channels (the same `paramilitary_policy always_allow` + atrocity events use). Negative-or-neutral only. | `data/consequenceReceipts.ts`, dimension channels |
| **Eastern (Srebrenica) condemnation** | The fall flows to the EXISTING `srebrenica_genocide_1995` rupture (`rupture_consequences.ts:37–72` — RS controls `op:srebrenica:srebrenica_2` + `srebrenica_enclave_formed` + turn ≥140). OVERRUN does NOT bypass/duplicate/pre-empt the rupture; it makes the player the PROXIMATE AUTHOR of satisfying its existing mechanical condition. NEVER softened by "chose via a card." | `rupture_consequences.ts` (UNTOUCHED) |

### 2.4 CONTAIN path (the strangle)

CONTAIN authors the historical restraint: the besieging corps holds the ring + lets supply-isolation starve the pocket; suppress assault-axis target generation into the core (the shelved bot stance, applied as a player directive). NO new pressure mechanic.
- Lower immediate military cost (corps not throwing itself at a hardened pocket). **SCOPE-RISK (measure at build time, do not assume):** freed ring brigades must not silently redeploy and tip the western cascade (the contain design §3 note).
- Emergent release later, per faction-pair (§3): RS-eastern → the 1995-pivot release (`event_flags.srebrenica_fell` OR `CONTAIN_RELEASE_TURN_BACKSTOP = 160`, `enclave_resilience.ts:636`) so Srebrenica STILL FALLS + records; RBiH-HVO → `washington_signed` ceasefire freeze (pocket stays HVO-held).
- **Reward for CONTAIN = the ABSENCE of a condemnation flag, never a badge** (gate §3 #10). CONTAIN is the less-condemned siege, not "the good ending."

---

## 3. §6 guard + invariant-test checklist

### 3.1 The §6 guard (what the build MUST enforce)

The DESIGN's §4 bright lines, made mechanically enforceable. The over-arching guard is the **default-OFF flag** (§4 below) — with it OFF, every protected outcome is byte-identical. With it ON, these hold:

**GE-1 — The rupture predicate is UNTOUCHED.** `rupture_consequences.ts` is not edited. OVERRUN-eastern routes the fall through the normal control-flip; the rupture fires on its existing condition (RS controls `op:srebrenica:srebrenica_2` + enclave-formed + turn ≥140), idempotent + permanent. **No new rupture, no new condemnation flag** (adding either is a capital-R Decision, gate §2; default is "do not add one").

**GE-2 — OVERRUN cannot record a rupture before turn 140.** Because OVERRUN routes through the SAME predicate (which floors at `SREBRENICA_MIN_TURN = 140`, `rupture_consequences.ts:20,62`), an early ahistorical assault that flips `srebrenica_2` before t140 correctly does NOT record the rupture — the genocide finding is NOT calendar-substituted (gate §1.5 #11; §2 criterion-3). The counterfactual is recorded by the EXISTING `enclave_defended` ghost-entry register (gate §5), NOT rewarded.

> Note the asymmetry vs collapse: the collapse §6 packet's worst failure is "RS takes the OSID before t140 → rupture fails to record." For OVERRUN the same arithmetic holds — but here the player is the *proximate author* of an ahistorical early fall, and the §6-correct outcome is the SAME: no calendar substitution, the divergence is ghost-recorded, the Ring-2 historical record stays canonical. The card text must NOT frame an early-fall-without-rupture as "avoided the genocide."

**GE-3 — CONTAIN-eastern does NOT permanently prevent the historical fall.** The 1995-pivot release (`isEnclaveContainmentReleased` / `CONTAIN_RELEASE_TURN_BACKSTOP = 160`, `enclave_resilience.ts:636–658`) MUST fire on the historical path so Srebrenica still falls + records. CONTAIN delays the assault; it is NOT an "avoid the genocide and win" button (design §5 constraint 2).

**GE-4 — Atrocity is never net-positive.** The Pyrrhic score does NOT invert under any input (gate §3 #4; scoring §6 monotonicity). Condemnation flags are checked before territorial grades (scoring §2 classification order) — a `genocide_condemnation` forces `failure` regardless of territory. CONTAIN produces no positive flag, no score bonus, no achievement string. The two paths are asymmetric only in that OVERRUN can ADD a taint; neither path can EARN a reward.

**GE-5 — No target selection / no brutality slider.** OVERRUN authorizes an assault on a MILITARY objective (the enclave core OSID, an existing combat target). The player never selects civilians/populations/atrocity targets, no "level of brutality," no paramilitary-doctrine submenu (gate §3 #1, #5, #8; §3 "what it must never become"). Displacement/casualty is the CONSEQUENCE the existing systems produce, framed as cost — never as a tunable trade.

**GE-6 — §4-compliant wording.** Card + ledger text in the historical/prosecutorial register (third-person, ICTY citations, integer civilian counts, no euphemism/humour/achievement language). `/narrative-designer` + `/historian` sign-off (gate §6).

### 3.2 §6 invariant-test checklist (the build MUST encode this in CI)

Derived strictly from §3.1 + the DESIGN §4. "Disabled baseline" = the current floor with the feature OFF.

- [ ] **T-1 — Default-OFF byte-identical (the load-bearing inertness proof).** With the feature flag OFF, 40w manifest hash == `be76e56dd9d288c2` AND 188w == `5f57d17287b87dfb`, control_delta byte-identical at both horizons. (Bots never see the card; headless runs never author a decision.) See §4.
- [ ] **T-2 — Rupture still records (feature ON, historical path, player=RS authored CONTAIN).** 188w: `rupture_consequences` contains `srebrenica_genocide_1995`. (This is the shelved Lane-V mandatory test, design §4a.)
- [ ] **T-3 — Rupture not premature.** Its `recorded_turn >= 140`. OVERRUN-before-t140 does NOT record (GE-2).
- [ ] **T-4 — Rupture timing unchanged vs disabled baseline.** `recorded_turn` + the three trigger inputs identical to the feature-OFF baseline (CONTAIN-eastern delays the *assault*, not the historical fall window).
- [ ] **T-5 — Srebrenica falls on canon timing, Žepa falls.** `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'` in the 160–185 window; `op:rogatica:zepa_2` → RS on the 160–190 window — unchanged vs baseline (GE-3).
- [ ] **T-6 — Goražde / Bihać held.** Every Goražde + Bihać-prefix OSID remains RBiH at war's end (the protected-set, collapse §6 packet §1.1). Player-as-RS may OVERRUN Goražde (an ahistorical assault — see O-2/§5); assert it routes through normal combat (repulse possible) and records NO rupture (Goražde has no `*_falls_1995` event / no rupture), and the score does not invert.
- [ ] **T-7 — Score never inverts.** A run with OVERRUN-eastern + `genocide_condemnation` classifies `failure` regardless of territory; CONTAIN adds no positive flag (GE-4; scoring §6).
- [ ] **T-8 — No new rupture / no new condemnation flag.** Static assertion: `rupture_consequences.ts` rupture roster unchanged; no new `condemnation_flag` value introduced (GE-1).
- [ ] **T-9 — Idempotency + determinism.** One authorship per enclave per run; two identical runs (same authored choices) → byte-identical `enclave_decisions` + control maps (sorted iteration, no wall-clock).
- [ ] **T-10 — No target selection surface.** Static/structural assertion that the card payload carries only `{ enclaveId, coreOsid, faction }` — no population/target/brutality field (GE-5).

**Pass relationship:** T-1 (default-OFF) is the inertness proof; T-2–T-8 are the feature-ON §6 guarantees; they are the regression sentinel against any future change that lets OVERRUN bypass the rupture predicate or invert the score.

---

## 4. Default-OFF flag + byte-identical-while-disabled gate

- **Flag:** a single default-OFF feature flag (e.g. `ENABLE_PRESIDENTIAL_ENCLAVE_DECISION`, scenario-meta or umbrella-flag style, matching the TG/collapse pattern). With it OFF: the trigger predicate (§1.3) never surfaces a card, OVERRUN/CONTAIN are never authored, the restraint-lift never fires, and `enclave_decisions` stays an empty Record. The bot retains its CURRENT behaviour (it already assaults/contains via existing ops + the shelved-predicate-as-diagnostic, which is calibration-flat).
- **Byte-identical-while-disabled gate (MERGE BLOCKER):** a regression test runs 40w + 188w with the flag OFF and asserts:
  - 40w manifest hash == `be76e56dd9d288c2`
  - 188w hash == `5f57d17287b87dfb`
  - control_delta byte-identical at both horizons.
- **The one allowed non-byte-identical move:** the `save_migration` empty-Record default for `enclave_decisions` changes the *migrated-save* hash (the v34/v36 lesson) — but the *calibration CONTROL map* (scenario_runner builds at `CURRENT_SCHEMA_VERSION`) stays byte-identical. Verify control_delta byte-identical at 40w + 188w, exactly as v36 did. This move must be attributable to THIS feature's Record ALONE — hence the §1.4 build-after-collapse rule.
- **CI:** the existing `structural_fingerprint_40w` gate (alpha-band) stays untouched until the deliberate enable+re-floor. Per `feedback_188w_validate_combat_changes_before_merge`, the 188w run is synchronous in the pre-merge gate (40w + CI alone is a false-green for combat-behavior changes).

---

## 5. Phase plan

Build in the contain-design discipline (one change per run, §6-eastern LAST). Each enable lane is a calibration run (40w + 188w dual-horizon).

```
GATE 0 — RATIFICATION (no code)
  ├─ Pyrrhic panel ratifies this spec + the DESIGN §10 sign-off table.
  ├─ Pyrrhic panel ratifies the §1.2 new state field (or directs derive-from-receipts, O-1/§11).
  └─ §6 sign-off (§6 Pyrrhic panel sign-off (Historian + scenario-tester/calibration + Engine/systems + Red-team, unanimous); the atrocity-is-never-rewarded bright line surfaces to the owner — for the eastern case):
        /historian + /war-or-game + /game-designer + USER approval (design §10).
        ▼  [HARD STOP — no code merges to main before this]
PHASE I — Build default-OFF (calibration-flat, flag OFF)
  ├─ Add `enclave_decisions` to PoliticalState + the new save_migration version
  │     (AFTER collapse's migration has merged — §1.4 — claim the NEXT free version).
  ├─ Add the directive levers + Conscience category + trigger predicate, all gated OFF.
  ├─ Wire the restraint-lift (OVERRUN) / restraint-default (CONTAIN) into the
  │     existing buildOffensiveTargets / evaluateSectorStances suppression — gated OFF.
  └─ Byte-identical-disabled proof (§4) GREEN (40w be76e56dd9d288c2 + 188w 5f57d17287b87dfb).
        ▼  [GATE: tsc + vitest + desktop:map:build + dual-horizon byte-identical]
PHASE II — Lane 0: ARBiH-HVO path (LIGHTER §6) — enable for RBiH-vs-HVO only
  ├─ Surface the card + directives for the RBiH-vs-HVO case; Washington-freeze release.
  ├─ §6 invariant tests T-1..T-10 GREEN (the HVO subset has no rupture coupling).
  └─ 40w + 188w calibration run; anchors 30/30; OSID floor recorded (may differ; panel-signed).
        ▼  [GATE: light §6 + 30/30 anchors + panel-signed floor]
PHASE III — Lane 1: VRS-eastern path (FULL §6) — enable for RS-vs-eastern-enclave
  ├─ Add the eastern card with rupture-coupling + the 1995-pivot mandatory release.
  ├─ §6 invariant tests (esp. T-2..T-7) GREEN; FULL §6 gate + Pyrrhic §6-panel sign-off (bright line surfaces to owner).
  └─ 40w + 188w calibration run; 30/30 anchors; §6 invariant GREEN on EVERY run.
        ▼  [GATE: full §6 + 30/30 + §6 invariant GREEN + panel-signed floor]
PHASE IV — Re-floor + finalize
  └─ New baseline of record; update CALIBRATION_MASTER + MEMORY + ledger.
```

**Panel gates (hard stops):** GATE 0 §6-panel ratification before ANY code merges to main; the §6 invariant tests GREEN before AND on every territory-moving run; the re-floor OSID count requires Pyrrhic-panel sign-off (NOT auto-accepted as "must equal the current floor" — 649 is a guard, not a target).

**Sequencing vs collapse (§1.4):** PHASE I's migration is built ONLY after collapse's serializer work has merged + re-floored, so the migration version is allocated without a collide-renumber and the byte-identical proof is unambiguous.

---

## 6. Open questions for the owner

(These extend the DESIGN §11; resolve at GATE 0.)

1. **O-1 — New state field vs derived.** Add `state.political.enclave_decisions` (idempotency + ledger read), or derive authorship from existing `consequenceReceipts` + rupture records to avoid a new condemnation-adjacent field? (Spec recommends the explicit field for deterministic per-enclave idempotency; gate §6 treats it as user-approval-required.) (DESIGN §11 Q1)
2. **O-2 — Offer OVERRUN for never-fell enclaves?** The predicate is faction-agnostic over all enclaves. Should OVERRUN be OFFERED for Goražde/Bihać (history never saw them fall, no rupture couples)? Offering it invites an ahistorical atrocity the record has no rupture for (ghost-recorded, score still non-positive) — is that the intended "ahistorical atrocity ALLOWED" surface, or restrict the card to documented-fall pockets? (DESIGN §11 Q4 — owner direction in MEMORY `presidential_enclave_decision` says ahistorical atrocity is ALLOWED, including OVERRUN of a never-fell enclave as an ATTACK ORDER that can be repulsed; confirm it extends to offering the card for Goražde/Bihać.)
3. **O-3 — CONTAIN-eastern release semantics.** Confirm "CONTAIN delays but the 1995-pivot release still forces the historical fall" is the intended experience — i.e. player-as-RS CANNOT permanently save Srebrenica via CONTAIN, only via a genuinely divergent military hold that never satisfies the rupture condition. (DESIGN §11 Q3; §5 constraint 2)
4. **O-4 — Directive lever vs dedicated decision-surface.** UI architecture (build-time, §1.1). Directive-lever is cheaper + reuses DirectiveCard; dedicated surface is cleaner separation. `/ui-ux-developer` call.
5. **O-5 — Cost constants.** New `OVERRUN_ENCLAVE_COST` / `CONTAIN_ENCLAVE_COST` Command-Authority constants, or reuse `FORCE_LAUNCH_COST`? (Scarcity already makes this a non-casual click; design §4d.)
6. **O-6 — Bot default after shelving Lanes V/A.** Confirm AI factions keep the CURRENT assault behaviour (calibration-flat at the floor) and the floor stays `5f57d172` byte-identical for headless/bot runs. (DESIGN §11 Q2)
7. **O-7 — Defender-enclave inverse card?** Confirmed NO by the predicate (`enclave.faction !== player_faction`) — but explicit owner confirmation the player never gets an "abandon my own enclave" card here. (DESIGN §11 Q5)
8. **O-8 — Sequencing vs collapse.** Confirm this builds AFTER collapse's serializer + re-floor (§1.4), to avoid the migration collide-renumber + the ambiguous-hash-move.

---

## 7. Sign-off routing (gate §6 / DESIGN §10)

| Aspect | Required sign-off |
|---|---|
| New player-facing atrocity-authorization surface | **User approval — NOT delegable** (gate §6: "any change that could produce a reward-for-atrocity effect") |
| Eastern (Srebrenica) rupture-coupling + release | `/historian` + `/war-or-game` + `/game-designer` + **user approval** |
| Enclave-mechanics change (Srebrenica/Žepa specifically) | `/gameplay-programmer` + `/historian` |
| Decision-surface UI + Conscience category | `/game-designer` + `/ui-ux-developer` + user review before implementation |
| Verdict / no-invert guarantee | `/game-designer` (verify no Ring-3 surface created by accident) |
| Card / ledger wording | `/narrative-designer` + `/historian` (§4 register) |
| New `enclave_decisions` state field (if added) | `/historian` + `/game-designer` + user approval (condemnation-adjacent) |

**Escalation (gate §6):** any dispute escalates to the user. When in doubt, "no, not yet, bring it to the user." This doc authorizes NO code.

---

## 8. Provenance

Ratified design: `docs/plans/2026-06-09-presidential-enclave-decision-DESIGN.md` (owner direction 2026-06-09 — shelve bot Lanes V #339 / A #341; build presidential decision). Canon: `SENSITIVE_HISTORY_DESIGN_GATE.md` (§1 rings, §2 rupture rule, §3 refusals, §4 wording, §5 ghost entries, §6 sign-off), `VICTORY_AND_PYRRHIC_SCORING.md` (§2 classification order, §6 monotonicity), `Engine_Invariants_v0_9_0.md` (§6 one-flip, §8 exhaustion, §9.6 authorized control change). Concurrent edit / collision source: `docs/40_reports/proposals/20260609_COLLAPSE_S6_HISTORIAN_GATE_PACKET.md` + `20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md`. Code verified: `enclave_resilience.ts:559,596,636` · `rupture_consequences.ts:17,20,37–72` · `attack_resolution_osid.ts:461,1230–1231,1256–1258` · `presidentialDecisionRoom.ts:39–61,63–72` · `game_state.ts:42,2826,2837–2838` · `save_migration.ts:36 (CURRENT_SCHEMA_VERSION),792–821`. Memory: `presidential_enclave_decision`, `player_experience_consequence_loop`, `player_command_model`, `feedback_188w_validate_combat_changes_before_merge`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

# Tactical Sandbox 3D Map — Game Designer Assessment

**Document:** Review of `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md`  
**Sections reviewed:** §4 (Game Mechanics & UI/GUI Decisions), §6.2 (Porting Sandbox Mechanics to Canon)  
**Role:** Game Designer (canon intent, mechanic consistency, balance/narrative)  
**Date:** 2026-02-20

---

## 1. Mechanics to canon: what is specified vs missing

| Mechanic | In plan | Specified for canon | Missing / underspecified for canon |
|----------|---------|---------------------|------------------------------------|
| **AoR reshaping** | §4.2 (deploy AoR expansion), §4.8 table, §6.2 | Settlement reshape orders and validation (Systems Manual §6.2): same faction, donor adjacent to target AoR, donor retains ≥1 settlement; costs −3/−2 cohesion, disrupted. Plan correctly notes canon AoR reshaping via `brigade_aor_orders` and `aor_reshaping.ts`. | Plan does not restate validation rules or cohesion/disruption costs for canon; port is “reshape + front teeth.” **Missing:** Explicit canon sentence that “deploy-completion AoR expansion” (HQ + adjacent friendly, personnel-capped) is either (a) the same as settlement reshape orders, or (b) a distinct, new canon action. Currently canon has **settlement transfer between brigades**, not “expand this brigade’s AoR from HQ.” |
| **Deploying / undeploying brigades** | §4.2 (states table, DEPLOY/UNDEPLOY buttons), §6.2 mapping | Canon has **BrigadeMovementStatus**: `deployed` \| `packing` \| `in_transit` \| `unpacking` (game_state.ts). Movement state applies when an order is in progress; otherwise brigade is `deployed`. | Plan §6.2 maps sandbox `undeployed`→“canon packed” but **canon has no `packed`**; resting state is `deployed`. Sandbox “deployed/undeployed” is a **deployment posture** (column vs spread) that changes movement rate; canon only has **movement-in-progress** states. **Missing:** Whether canon should add a distinct “column”/“contracted” posture (affecting movement rate) or treat deploy/undeploy as UI-only presentation of pack/unpack cycle. |
| **Movement** | §4.3 (flow, radius, multi-click, validation, pre-claim, post-turn sync) | Municipality movement orders (`brigade_mun_orders`), settlement-level movement via `brigade_movement_orders` and `processBrigadeMovement()` (pack → in_transit → unpack). Systems Manual §6.2: “Municipality movement orders replace a brigade’s municipality assignment for the turn.” | **Movement rate:** Canon does not define different rates for “column” vs “spread” AoR. Plan uses 6 vs 3 settlements/turn; engine uses a fixed rate (e.g. 3). **Missing:** Canon movement rate(s), and whether rate varies by AoR size or deployment posture. **Pre-claim:** Plan’s “claim uncontrolled along path” is sandbox-only; canon BFS is faction-controlled only. Canon does not specify claiming neutral territory during move. |
| **GUI: “seeing how far you can move”** | §4.3 (movement radius visualization, BFS depth = movement rate) | Not in Game Bible, Rulebook, or Systems Manual. | **Missing:** Canon has no requirement for “reachable set” or movement-radius UI. Porting `computeReachableSettlements` to main UI is a **GUI/UX decision**; recommend adding a single implementation-note or TACTICAL_MAP_SYSTEM bullet that “reachable settlements for movement orders may be shown (BFS from current AoR, depth = movement rate, friendly/uncontrolled only)” so it is traceable and consistent. |

**Summary:** AoR reshaping is already canon (settlement transfer); the plan’s “expand AoR on deploy completion” needs either alignment with that or a new canon clause. Deploy/undeploy and movement rate (6 vs 3) are **not** in canon and need a design decision. Movement-radius GUI is underspecified in canon; a short implementation-note is enough for consistency.

---

## 2. Pushback: conflicts, balance/narrative, redundancy

### 2.1 Game Bible / Rulebook alignment

- **Game Bible §7 (Fronts):** “Fronts emerge dynamically from the interaction of opposing formations **deployed** across space.” The word “deployed” here means “assigned to space,” not the sandbox’s “deployed vs undeployed” state. No conflict if we keep player-facing language distinct (see §3 below).
- **Systems Manual §6.2:** “Direct settlement targeting is forbidden. Territorial change occurs through sustained pressure exchange and cumulative failure within AoRs.” The plan’s **multi-click destination selection** (choose 1–4 contiguous settlements) is movement to **settlements**, not direct “targeting” for control flip; movement updates AoR and then pressure/attack resolve. **No conflict** if movement orders are clearly “reposition brigade” not “flip control.”
- **Balance/narrative:** Introducing **6 vs 3 settlements/turn** by posture (column vs spread) makes “stay undeployed to dash, then deploy to fight” a dominant pattern unless costs (e.g. cohesion, disruption, time to deploy) are explicit. Canon already has cohesion costs for **settlement reshape** (−3/−2, disrupted). If “undeploy → move → deploy” is canonized, recommend a **cost or delay** (e.g. undeploying/deploying each cost 1 turn and optionally cohesion) so that rapid redeployment is not free. Plan already has 1-turn deploying/undeploying; that is good; canon should state it explicitly if we adopt it.

### 2.2 Redundancy and confusion: deployed/undeployed vs packed/unpacked

- **Redundancy:** Sandbox has **four** deployment states (undeployed, deploying, deployed, undeploying). Canon has **four** movement states (deployed, packing, in_transit, unpacking). They describe different things:
  - **Sandbox:** “Am I in column (fast) or spread (slow) posture?” plus transitions.
  - **Canon:** “Am I currently in a move order (packing / in transit / unpacking) or not (deployed)?”
- **Risk:** Using “deployed” in both creates confusion: “deployed” in canon = “not currently moving”; “deployed” in sandbox = “spread in combat posture.” A brigade can be “canon deployed” (no move in progress) and either “sandbox deployed” (spread) or “sandbox undeployed” (column).
- **Recommendation:** Do **not** unify the two into one abstraction. Keep both with a **clear mapping**:
  - **Canon (engine)**: `BrigadeMovementStatus` = `deployed` | `packing` | `in_transit` | `unpacking` (unchanged).
  - **Sandbox / player-facing “deployment posture”**: Column (contracted AoR, higher movement rate) vs Combat posture (expanded AoR, lower rate), plus **Deploying** / **Undeploying** as 1-turn transitions.
  - **Mapping:** When no movement order is in progress: column posture ⇔ AoR size 1 (HQ only); combat posture ⇔ AoR size > 1. When a movement order is in progress, canon states (packing / in_transit / unpacking) take precedence in engine; UI can still show “Column” or “Combat” as the intended posture at destination. This avoids overloading “deployed” and keeps engine semantics stable.

### 2.3 Proposed simplification

- **Naming:** Prefer **Column** vs **Combat** (or **Spread**) for player-facing posture instead of “undeployed” vs “deployed” to avoid collision with canon “deployed.” Tooltip or help can say: “Column = single-settlement AoR, faster movement; Combat = multi-settlement AoR, slower movement, full pressure.”
- **Single source of movement rate:** If canon adopts variable rate, define it once (e.g. “movement_rate = column_rate when AoR size === 1 else spread_rate; column_rate > spread_rate”) and reference it from both engine and UI, so sandbox and main game never diverge.

---

## 3. Sandbox deployment states vs canon BrigadeMovementStatus

- **Canon (current):** `BrigadeMovementStatus` = `deployed` | `packing` | `in_transit` | `unpacking`. No “packed.” Resting state is `deployed`; the other three are movement-in-progress.
- **Sandbox:** undeployed / deploying / deployed / undeploying (deployment posture + 1-turn transitions).
- **Recommendation:** **Keep both**, with a **clear mapping** and **player-facing language** that does not overload “deployed”:
  - **Engine (canon):** Retain `BrigadeMovementStatus` as-is. Do not add “packed” or rename “deployed” to “packed.”
  - **UI / player-facing:** Use **Column** and **Combat** (or **Spread**) for the two postures. Use **Deploying** / **Undeploying** only for the 1-turn transitions. Avoid “Undeployed”/“Deployed” in labels if it would confuse with “deployed = not moving” in engine.
  - **Mapping:** Column = brigade with AoR size 1 (and optionally a canonical flag like `deployment_posture: 'column'` if we canonize it). Combat = AoR size > 1. When status is packing/in_transit/unpacking, UI shows “Moving” (or “Packing” / “In transit” / “Unpacking”) and can show destination posture separately.
  - **Plan §6.2 correction:** Replace “undeployed → canon packed” with “Column (1-settlement AoR) ↔ canon `deployed` with minimal AoR; no separate ‘packed’ status.” Deploying/undeploying → 1-turn transitions that end in AoR expansion/contraction; canon can represent these as immediate AoR change plus optional cohesion/turn cost, or as a future `deployment_posture` state.

---

## 4. Endorsements, clarifications, and one lock

**Endorse for canon (with minor wording):**

- **Settlement-level AoR reshaping** — Already canon (Systems Manual §6.2, `brigade_aor_orders`). Plan’s port of front line teeth and reshape UI is consistent. Endorse.
- **Movement orders and pack → in_transit → unpack** — Already in engine and state; multi-click destination (1–4 contiguous settlements) and contiguity validation are consistent with “reposition brigade” and no direct settlement targeting. Endorse port of `MoveSelectionState` and contiguity rules.
- **Movement radius (reachable set) as GUI** — Showing “how far you can move” via BFS from current AoR, depth = movement rate, friendly/uncontrolled only, is good UX. Endorse as implementation-note or TACTICAL_MAP_SYSTEM bullet; no new game mechanic, just visibility of existing rule.
- **Terrain scalars for battles** — Plan uses same `settlements_terrain_scalars.json` and combat modifiers as canon. Endorse.

**Need clarification before canonizing:**

- **Deploy-completion AoR expansion:** Is “on deploy complete, expand AoR from HQ to HQ + adjacent friendly (personnel-capped)” the same as applying one or more settlement reshape orders, or a new canonical action? If new, it needs a sentence in Systems Manual §6.2 and validation/costs.
- **Movement rate(s):** Should canon define one rate, or two (column vs combat)? If two, what are the exact values and the rule (e.g. “rate = 6 when AoR size === 1 else 3”)? This affects balance and must be in Phase II / Systems Manual.
- **Pre-claim of uncontrolled settlements along path:** Canon currently traverses only faction-controlled territory. Should “movement through uncontrolled” be allowed (and under what conditions), or remain sandbox-only? If allowed, canon must say how control is assigned (e.g. “moving brigade claims path settlements for its faction at move start or completion”).

**One design decision to lock before implementation:**

- **Lock:** **Player-facing labels for brigade posture:** Use **Column** and **Combat** (or **Spread**) for the two postures that affect movement rate and AoR size; reserve **Deployed** in UI for “not currently in a move order” (aligned with canon `deployed`) or avoid “Deployed” in the same panel as Column/Combat to prevent confusion. Lock this so that all UI strings and tooltips (tactical map, sandbox, desktop) use the same terms and the mapping to `BrigadeMovementStatus` is documented in one place (e.g. TACTICAL_MAP_SYSTEM or Phase II implementation-note).

---

## 5. Summary (2–3 paragraphs)

**Endorsements:** I endorse for canon the mechanics that already align with Game Bible and Systems Manual: settlement-level AoR reshaping (transfer between brigades, validation and cohesion costs as in §6.2), movement orders with the existing pack → in_transit → unpack cycle and multi-click contiguous destination selection, and use of terrain scalars in battle resolution. Showing “how far you can move” (BFS reachable set) should be endorsed as a GUI implementation-note only—no new rule, just visibility of the existing movement rule.

**Clarifications needed:** Deploy-completion AoR expansion (HQ + adjacent friendly, personnel-capped) must be decided: either it is realized via existing settlement reshape orders or it is a new canonical action with explicit validation and costs. Movement rate(s)—one fixed rate vs two (column vs combat)—are not in canon; the plan’s 6 vs 3 settlements/turn is a design choice that should be written into Phase II / Systems Manual and balanced (e.g. with deploy/undeploy cost or delay). Pre-claim of uncontrolled settlements along the movement path is sandbox-only today; if we allow it in canon, we need a clear rule for when and how control is assigned.

**One lock before implementation:** Standardize player-facing language so that “deployed” is not overloaded. Use **Column** and **Combat** (or **Spread**) for the two postures that affect movement rate and AoR size, and keep canon’s **BrigadeMovementStatus** (`deployed` | `packing` | `in_transit` | `unpacking`) unchanged in the engine. Document the mapping (column ⇔ 1-settlement AoR, combat ⇔ multi-settlement AoR; deploy/undeploy as 1-turn transitions) in one place (e.g. TACTICAL_MAP_SYSTEM or Phase II) and use the same terms in sandbox, tactical map, and desktop UI. Lock this before porting sandbox mechanics to the main game.

---

*Assessment complete. Canon references: Game_Bible_v0_5_0.md §5–§7; Systems_Manual_v0_5_0.md §2.1, §6.2; Phase_II_Specification_v0_5_0.md §4.3, §7.1; src/state/game_state.ts BrigadeMovementStatus.*

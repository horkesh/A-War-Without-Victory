# Orchestrator Convene: Three Workstreams — 3D Icons, AoR Display, Brigade AoR 1–4

**Date:** 2026-02-20  
**Subject:** Corps/brigade icon size (3D), AoR display in 3D, brigade AoR 1–4 settlements (canon, engine, GUI)  
**Goal:** Align priority and ownership; produce clear handoffs so implementation can proceed without the Orchestrator implementing code or editing canon.

---

## 1. State of the Game

| Workstream | Current state | Gap / ask |
|------------|---------------|-----------|
| **1. Corps/brigade icons (3D)** | Operational 3D map (`map_operational_3d.ts`) uses formation sprites with base scale 0.9/0.52 (corps) and 0.8/0.45 (brigade); LOD scale factor applied by camera distance. | Icons still too large; need smaller base size and/or view-dependent scale factors so icons are not oversized. |
| **2. AoR display in 3D** | 3D shows **selected-formation AoR only**: fill + stroke by faction (`buildSelectedAoRTexture`). Corps-to-brigade **link lines** exist (`selectionLinkGroup`). | AoR not matching spec: no **crosshatch**, no **pulsed fill/glow**, no **contact-edge** (red glowing stroke on shared boundary between friendly AoR and opposing settlement). Which formations show AoR = selected only (matches 2D); settlement highlight and link lines partially present. |
| **3. Brigade AoR 1–4** | **Engine:** `getPersonnelBasedAoRCap(personnel)` → min(4, max(1, floor(personnel/400))). Init and rebalance use this; cap is **personnel-derived**, not player/bot choice. **Canon:** Systems Manual §2.1 and Phase II §7.1 describe AoR assignment; no explicit "1–4 max, player/bot decides." **GUI:** Tactical map has AoR transfer (stage-brigade-aor-order); no UI to set "desired 1–4 settlements per brigade." | If design is "player or bot decides how many (1–4) per brigade," canon and engine must be updated (expose choice; enforce as cap). If design stays personnel-based 1–4, canon should state that clearly. GUI may need a control to set desired coverage (1–4) per brigade. |

---

## 2. Authoritative Documents

| Topic | Document | Section / note |
|-------|----------|----------------|
| **3D map behaviour (AoR, formations)** | `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md` | §2.5 AoR overlay (crosshatch, contact-edge red glow); §2.6 Formation counters (corps aggregation, stem lines). |
| **Main-game 3D chrome and 2D parity** | `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Pass 6: Brigade AoR highlight — selected formation only; pulsed fill 0.08–0.22; crosshatch; boundary glow. §10 Front lines (contact-edge concept aligns with plan §4.5). |
| **Product decisions and phasing** | `docs/40_reports/convenes/PARADOX_TACTICAL_SANDBOX_3D_MAP_CONVENE_2026_02_20.md` | Authority for 3D vs 2D, phases 6A/6B/6C, contact-edge visual (red glow, no front teeth). |
| **Brigade AoR 1–4 (engine)** | `src/state/formation_constants.ts` | `MAX_AOR_SETTLEMENTS`, `MIN_AOR_SETTLEMENTS`, `PERSONNEL_PER_AOR_SETTLEMENT`, `getPersonnelBasedAoRCap`. |
| **Brigade AoR (canon)** | `docs/10_canon/Systems_Manual_v0_5_0.md` | §2.1 AoR assignment. Phase II spec §7.1. |
| **Napkin (Phase A)** | `.agent/napkin.md` | "Brigade AoR Redesign Phase A: … personnel-based cap (1–4 settlements)". |

The **exact document** that specifies how AoRs should appear in the 3D map is **`docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md`** (§2.5 AoR overlay, §4.5 contact-edge). For parity with the 2D tactical map, **`docs/20_engineering/TACTICAL_MAP_SYSTEM.md`** Pass 6 is the reference (selected formation only; pulsed fill; crosshatch; boundary glow). Contact-edge (red glowing boundary at friendly AoR vs opposing settlement) is specified in the plan §4.5 and the Paradox convene (front teeth removed; contact-edge replaces them).

---

## 3. Single Priority Order and Parallel Tracks

**Agreed priority:**

1. **Track A (visual, can proceed in parallel):**  
   - **A1.** Corps/brigade icon size and LOD (3D) — Graphics Programmer (or UI/UX if 3D owned there).  
   - **A2.** AoR display in 3D to match spec — Formation Expert or Gameplay Programmer, with Graphics/UI as needed.

2. **Track B (design and data flow, should be sequenced):**  
   - **B1.** Canon and design: 1–4 brigade AoR — Game Designer (+ Canon Compliance). Confirm whether canon is "personnel-based 1–4 only" or "1–4 max, player/bot decides"; update canon accordingly.  
   - **B2.** Engine: enforce and expose 1–4 cap; allow player/bot to choose coverage within range if design says so — Gameplay Programmer, Formation Expert.  
   - **B3.** GUI: tactical map (2D and/or 3D) control to set desired 1–4 settlements per brigade — UI/UX Developer, Gameplay Programmer.

**Dependency:** B2 and B3 should follow B1 (design/canon clarity). A1 and A2 can proceed immediately.

---

## 4. Handoffs (Who Does What Next)

### Workstream 1: Corps and brigade icons (3D map)

| Role | Action |
|------|--------|
| **Graphics Programmer** (or **UI/UX Developer** if 3D map is owned there) | Reduce base size and/or scale factors for corps/brigade icons in `map_operational_3d.ts` so they are smaller overall; ensure icons scale with view (LOD). Current: `buildFormationSprite` scale 0.9/0.52 (corps), 0.8/0.45 (brigade); LOD in `updateFormationVisibility`. Deliverable: smaller base and/or LOD factors so icons are not oversized. |
| **Product Manager** | Sequence this with A2 and Track B in backlog/sprint if needed. |

### Workstream 2: AoR display in 3D

| Role | Action |
|------|--------|
| **Formation Expert** or **Gameplay Programmer** (with **Graphics Programmer** / **UI/UX** as needed) | Implement 3D AoR to match spec. **Authority:** `TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md` §2.5, §4.5; `TACTICAL_MAP_SYSTEM.md` Pass 6. **Gaps to close:** (1) **Crosshatch** per faction on AoR overlay (plan §2.5). (2) **Pulsed fill** (alpha 0.08–0.22) and **boundary glow** (shadowBlur 2–6px) for selected AoR (TACTICAL_MAP_SYSTEM Pass 6). (3) **Contact-edge:** draw shared boundary between friendly AoR settlement and opposing settlement with **red glowing stroke** (#ff4444 or similar, 2–4px glow, alpha ~0.9); no front teeth (plan §4.5, convene). Which formations show AoR = selected formation only (and corps selection shows all subordinate brigade AoRs) — already implemented. Link lines (corps–brigade) exist; keep. Settlement highlight = current AoR fill + stroke; add crosshatch and pulse/glow. |
| **Product Manager** | Ensure 3D AoR spec is unambiguous; refer to this convene and plan §2.5/§4.5. |

### Workstream 3: Brigade AoR 1–4 settlements (canon, engine, GUI)

| Role | Action |
|------|--------|
| **Game Designer** (+ **Canon Compliance Reviewer**) | (1) Confirm whether canon is "personnel-based 1–4 only" or "1–4 max, player/bot decides how many." (2) If canon does not already state the chosen rule, update canon (e.g. Systems Manual §2.1, Phase II §7.1). (3) If "player/bot decides," define how that choice is represented (e.g. desired_max_settlements per brigade) and that engine/GUI must respect it. |
| **Gameplay Programmer** + **Formation Expert** | (1) Ensure simulation **enforces** 1–4 settlement cap per brigade (already enforced via `getPersonnelBasedAoRCap` and init/rebalance). (2) If design is "player/bot decides," **expose** a way to set desired coverage (1–4) per brigade in state and use it as cap in engine; bot and player logic must be able to choose coverage within 1–4. (3) No engine change if design stays personnel-based only; only canon clarification. |
| **UI/UX Developer** + **Gameplay Programmer** | Provide tactical map (2D and/or 3D) control for player to **set desired 1–4 settlements per brigade** (e.g. in brigade panel or AoR section), only if design is "player/bot decides." Wire to same state/IPC as engine. |

---

## 5. Summary Table

| # | Workstream | Owner | Deliverable |
|---|------------|--------|-------------|
| 1 | Corps/brigade icon size (3D) | Graphics Programmer (or UI/UX) | Smaller base size and/or LOD scale factors; icons scale with view. |
| 2 | AoR display in 3D | Formation Expert or Gameplay (+ Graphics/UI) | 3D AoR matches plan §2.5/§4.5 and TACTICAL_MAP_SYSTEM Pass 6: crosshatch, pulsed fill/glow, contact-edge red stroke. |
| 3a | Brigade 1–4 canon | Game Designer (+ Canon Compliance) | Canon states 1–4 rule (personnel-based and/or player/bot choice); update if needed. |
| 3b | Brigade 1–4 engine | Gameplay + Formation Expert | Enforce and expose 1–4 cap; support player/bot choice if canonized. |
| 3c | Brigade 1–4 GUI | UI/UX + Gameplay | Tactical map control to set desired 1–4 per brigade, if design says so. |

---

## 6. Continuity and Links

- **This convene:** `docs/40_reports/convenes/ORCHESTRATOR_THREE_WORKSTREAMS_3D_ICONS_AOR_BRIGADE_CAP_2026_02_20.md`
- **Plan (3D):** `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md`
- **2D/3D parity:** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- **3D product authority:** `docs/40_reports/convenes/PARADOX_TACTICAL_SANDBOX_3D_MAP_CONVENE_2026_02_20.md`

Link this convene from PROJECT_LEDGER_KNOWLEDGE (and optionally PROJECT_LEDGER) so the next session has continuity. Implementation is delegated; no code or canon edits by the Orchestrator.

---

## 7. Implementation (2026-02-20)

Implemented by Cursor per handoffs above:

- **A1 (icons):** Smaller base scales and LOD factors in `map_operational_3d.ts` (corps 0.44/0.26, brigade 0.38/0.22; LOD cap 1.0, selected 1.08×).
- **A2 (AoR display):** `buildSelectedAoRTexture` now takes `edges`, draws per-faction **crosshatch** (RS 45°, RBiH -45°, HRHB horizontal), **pulsed fill** (alpha 0.15), **boundary glow** (shadowBlur 4), and **contact-edge** red stroke (#ff4444, 2–4px glow) on shared boundaries between selected AoR and enemy settlements.
- **B2 (engine):** `GameState.brigade_desired_aor_cap`, `getEffectiveAoRCap(personnel, desiredCap)` in `formation_constants.ts`; `initializeBrigadeAoRSettlementLevel` uses effective cap; serialized and parsed in adapter/loaded state.
- **B3 (GUI):** Brigade panel shows "Desired AoR settlements" and (desktop only) a dropdown "Max settlements (1–4)" with Auto / 1 / 2 / 3 / 4; IPC `set-brigade-desired-aor-cap` updates state and broadcasts.

**Canon clarification recommended (Game Designer):** In Systems Manual §2.1 and/or Phase II §7.1, state explicitly: *Brigade AoR settlement cap is 1–4. Player or bot may set a desired cap per brigade (`brigade_desired_aor_cap`); when set, it overrides the personnel-based cap. Engine uses `getEffectiveAoRCap(personnel, desiredCap)`.*

---

*Orchestrator convene 2026-02-20. Roles convened per skills-catalog; handoffs documented for Cursor or follow-up agent execution. Implementation §7 added 2026-02-20.*

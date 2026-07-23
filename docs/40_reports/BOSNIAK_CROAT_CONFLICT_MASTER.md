# Bosniak-Croat Conflict Master

> The second war within the war. Tracks the implementation, calibration, and realism of the HRHB-RBiH conflict system — from alliance degradation through open warfare to the Washington Agreement.

**Created:** 2026-03-19
**Status:** Phase 1 complete (transition mechanics). Phase 2 needed (active warfare, enclaves, Abdic).

---

## Historical Context

The Bosniak-Croat conflict (October 1992 – March 1994) was a war-within-a-war that opened a devastating second front for the Bosnian government. Key phases:

1. **Buildup (Oct 1992 – Jan 1993):** Sporadic HVO-ARBiH clashes at Prozor, Gornji Vakuf, Busovaca. Driven by Vance-Owen provincial map and Croatian political pressure on HVO to secure Herceg-Bosna territory.

2. **Open war (April 1993 – March 1994):** Full-scale fighting across central Bosnia and Herzegovina. Ahmici massacre (April 16). East Mostar siege. Kiseljak and Vitez pockets form as ARBiH severs HVO connections. Operation Neretva '93.

3. **Washington Agreement (March 1994):** US-brokered ceasefire creates the Federation of Bosnia and Herzegovina. HVO and ARBiH merge into joint federation command.

**Key operational zones:**
- **Kiseljak pocket** — isolated 4-OSID HRHB enclave, ~5,000 HVO troops
- **Vitez/Busovaca pocket** — larger enclave, HVO holds Vitez/Busovaca/Novi Travnik corridor
- **Mostar** — divided city, HVO west bank vs ARBiH east bank
- **Herzegovina** — HVO-controlled, ARBiH 4th Corps pushes from Jablanica/Konjic

**Key commanders:**
- **Tihomir Blaskic** — OZ Central Bosnia (convicted of war crimes at ICTY, later partially acquitted)
- **Sefer Halilovic / Rasim Delic** — ARBiH army-level command
- **Fikret Abdic** — breakaway Bosniak faction (Bihac, w77)

---

## Current Implementation Status

### Working (Phase 1 — Transition System)

| Feature | Status | Evidence |
|---------|--------|----------|
| Alliance value decay | Complete | Organic decay through 5 drivers (patron, refugee, incident, appeasement, ceasefire) |
| Mobilization phase (4-turn) | Complete | Front edges appear, sectors form, combat suppressed |
| Condition-driven events | Complete | 6 events fire on thresholds, not dates |
| Player decisions | Complete | Gornji Vakuf: escalate (-0.20) or negotiate (-0.05) |
| Bot defensive posture | Complete | Both factions adopt defensive during mobilization |
| hvo_central_bosnia activation | Complete | Corps formation created in war phase, gets 6 sectors |
| Blaskic commanding CB | Complete | Stale officer IDs fixed |
| Combat suppression gates | Complete | 4 files gated on `isRbihHrhbCombatEnabled()` |
| 56w transition test | Complete | Full timeline verified w31→w43 |

### Not Yet Implemented (Phase 2 — Active Warfare)

| Feature | Priority | Description |
|---------|----------|-------------|
| CB brigade redistribution | **FIXED** | 3 mandatory brigades failing to spawn (mun1990_id cross-boundary bug). 7→10 brigades. |
| CB operations | **FIXED** | Added Lašva Valley Offensive priority (w40-100). Gates correctly prevent ops before war starts. |
| Kiseljak/Vitez pocket separation | **FIXED** | Added 3 HRHB enclaves (Kiseljak, Lašva Valley, Žepče). Pockets already geographically separate. |
| ARBiH offensive response | P2 | 3rd/4th Corps need offensive doctrine against HRHB post-war-start. |
| East Mostar siege mechanics | P2 | Event fires but no mechanical siege (supply cut, enclave state). |
| Abdic APWB (w77) | P3 | Formation spawn, 5th Corps split, Bihac internal front. |
| Washington Agreement (w102) | P3 | Alliance lock works. Joint ops/supply not implemented. |
| 52w scenario coverage | P3 | War starts ~w40, 52w scenario ends at w52. Sufficient for buildup only. |

---

## Alliance System

**File:** `src/sim/early_war/alliance_update.ts`

**Value range:** [-1.0, +1.0]

**Phases:**
| Phase | Value Range | Front Edges | Combat | Stance |
|-------|------------|-------------|--------|--------|
| Strong alliance | >0.50 | No | No | Normal |
| Fragile alliance | 0.20–0.50 | No | No | Normal |
| **Mobilizing** | 0.00–0.20 | **Yes** | **Suppressed 4 turns** | **Defensive** |
| Strained/Open war | -0.50–0.00 | Yes | **Yes** | Normal |
| Full war | <-0.50 | Yes | Yes | Normal |

**Drivers (per-turn):**
- Appeasement: +0.003 (0.3x if incidents)
- Patron pressure: -0.018 x HRHB patron_commitment
- Incident penalty: -0.04 per bilateral control flip
- Ceasefire: +0.015 when active
- Refugee pressure: up to -0.028 (7 municipalities x 0.004 each)

**Floor:** Alliance cannot drop below 0.40 until `rbih_hrhb_war_earliest_turn` (default 40 in active definitive April 1992 scenarios). Runtime fallbacks and every control-changing path use the same value; rear-pocket consolidation cannot bypass it.

---

## Event Timeline (Condition-Triggered)

| Event | Condition | Turn Window | Player Decision |
|-------|-----------|-------------|-----------------|
| HVO-ARBiH Tensions | None (fixed) | w29 | No |
| Gornji Vakuf Clashes | `alliance_below 0.45` | w35-60 | Escalate/Negotiate |
| Vance-Owen Plan | None (fixed) | w39 | Accept/Reject |
| Croat-Bosniak War | `alliance_below 0.10` | w40-80 | No |
| Ahmici Massacre | Requires war + HRHB controls Vitez | w40-70 | No |
| East Mostar Siege | Requires war | w45-80 | No |
| Central Bosnia Fighting | Requires war | w46-80 | No |
| Operation Neretva '93 | Requires war | w60-95 | No |
| Abdic APWB | None (fixed) | w77 | No |
| Washington Agreement | None (fixed) | w102 | No |

---

## Key Code Paths

- **Alliance engine:** `src/sim/early_war/alliance_update.ts`
- **Front edge gating:** `src/map/front_edges.ts` (line 51-58)
- **Combat suppression:** `bot_brigade_eval_attack.ts`, `bot_corps_directives.ts`, `attack_resolution_osid.ts`, `battle_resolution.ts`
- **Bot mobilization stance:** `bot_corps_stance.ts`
- **Corps activation:** `src/sim/early_war/activate_corps.ts` + war-phase step in `war_phases.ts`
- **Sector consolidation:** `sector_territory.ts` (brigade-presence protection in `consolidateCrossCorpsFronts`)
- **Events:** `data/scenarios/events/war_1993.json`

---

## Calibration Impact

| Metric | Before | After P1 | After P1 Backlog |
|--------|--------|----------|------------------|
| 40w area-weighted | 91.2% | 91.4% (+0.2pp) | **91.0% (-0.4pp)** |
| HVO Central Bosnia sectors | 0 | 6 | **6** |
| CB brigades | 7 | 7 | **10 (+3 spawn fix)** |
| HRHB enclaves | 0 | 0 | **3 (Kiseljak, Lašva, Žepče)** |
| HRHB brigade readiness | 0/29 active | 29/29 active | **29/29 active** |
| Blaskic commanding | Nothing | OZ Central Bosnia | **OZ Central Bosnia** |
| HRHB-RBiH battles (56w) | 0 | 3 | **3 (40w too short for war)** |
| CB offensive doctrine | None | None | **Lašva Valley Offensive (w40-100)** |

---

## Lessons Learned

See `docs/life_lessons.md` for entries tagged 2026-03-19.

1. **Phantom corps:** A corps_id on a brigade means nothing if the corps doesn't exist as a formation. Always verify both ends of the reference.
2. **Readiness oscillation:** `deriveReadinessState` running every turn can undo one-time activation decisions. State machines need irreversible transitions.
3. **Sector consolidation cascade:** Per-edge protection isn't enough when components span multiple pockets. Component-level protection needed for enclave corps.
4. **Peace-phase assumptions:** Pipeline steps that only run in peace phase create gaps when scenarios start in war phase. Either run in both phases or ensure scenario init covers the gap.
5. **Test the transition, not just the endpoints:** The 40w and 52w scenarios both missed the HRHB-RBiH war entirely. The 56w scenario was needed to test the actual transition.

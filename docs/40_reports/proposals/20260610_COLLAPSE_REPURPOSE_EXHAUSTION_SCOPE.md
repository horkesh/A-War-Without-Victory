# Collapse Repurpose — Exhaustion / Political-Collapse FEEL (READ-ONLY SCOPE)

**Type:** READ-ONLY scoping / design document. No engine code, no flag flips, no canon edits produced in writing this. Claims are file:line-cited against the working tree (`main` @ `b7d7d58fd`).
**Status:** DRAFT for a fast panel / owner ratify.
**Owner decision (2026-06-10) that motivates this doc:** collapse-as-territory is redundant — the sim already reproduces the one historical collapse (western Bosnia 1995) via operations, and collapse moves **0 territory** (IV-a: 649→649, 0 OSIDs differ ON vs OFF). Repurpose the (already-built, §6-safe, default-off) collapse pipeline to represent **war-weariness / will-to-fight breaking** — the game's stated identity (CLAUDE.md): *"exhaustion, political collapse, constrained agency — not conquest."*

**Predecessors (do not re-derive — superseded framing where noted):**
- `20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md` — Phase I spec, constants + G1 guard (MERGED #375).
- `20260610_COLLAPSE_PHASE4A_FIRST_FIRE.md` — Tier-0 fires after unit reconcile; Phase 3D writes nothing (empty settlement substrate). HELD.
- `20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md` — the territory-path re-route (OSID front model). **This doc is an ALTERNATIVE to IV-b, not a continuation:** IV-b makes collapse move territory; this repurpose makes it a degradation/feel layer and questions whether IV-b is needed for 1.0 at all.

---

## 0. The one finding that reframes everything

`local_strain` is a **cumulative front-edge integral** (`phase3c…ts:291–304`: `strain = clamp(strain + exposure·STRAIN_FRACTION, 0, MAX)`, monotonic, never decays). Over a campaign that integral is **largest where the front sat static and contested longest** — i.e. it measures **siege DURATION**, which is *highest at the central/eastern fronts that historically HELD* (Sarajevo, Goražde, Tuzla salient). It is therefore **anti-correlated with the real collapse**, which happened in the west (1995) where fronts *moved fast* and where, per BB / Milovanović, the driver was **political/cohesion** — crisis-staff evacuations, will-to-fight breaking, command paralysis — **not** territory loss per se and **not** accumulated siege pressure.

So the substrate the pipeline was built to integrate (front-edge pressure → strain) is pointed at the wrong phenomenon for "collapse." But the pipeline's *downstream half* (eligibility state-machine → 3D damage tracks → capacity modifiers → consumers) is generic and reusable. **The repurpose swaps the SIGNAL, keeps the MACHINE, and re-aims the CONSEQUENCE away from territory.**

---

## 1. WHAT collapse should represent as a FEEL

Three framings were on the table:

| | Framing | What moves | Truest-to-soul? |
|---|---|---|---|
| (a) | **Faction-level war-exhaustion drag** — the whole faction gets less effective as the war grinds on; a negative-sum tax that hits everyone, hardest late | faction-wide effectiveness multipliers (combat tempo, recruitment, op willingness) | **YES — this is the negative-sum texture** |
| (b) | **Localized cohesion/authority breaks** — the *dead* Tier-0 gates (authority pinned 50, fatigue capped 30) actually move and fire consequences at specific OSIDs | per-OSID authority/cohesion damage | history-true but the signal fields are structurally dead (IV-a §3); requires animating two pinned fields first |
| (c) | **Player-facing exhaustion SURFACE** — the war visibly grinds people down (UI / consequence layer) without necessarily moving territory | nothing mechanical; a read-model/Chronicle surface | true to "authorship of the tragedy", but alone it's narration without teeth |

**RECOMMENDATION: (a) as the mechanical spine, with (c) as its mandatory surface, and (b) explicitly deferred.**

Rationale: the game's identity is *negative-sum — everyone loses*. The truest expression is a **drag that compounds and is never escaped**, applied to the *whole faction*, felt *most in the late war when every faction was historically spent*. (b) is the most historically specific (it would localize the western 1995 cohesion break) but it is blocked: `profile.authority` never drops below the gate and formation `fatigue` is capped at the gate (IV-a §3) — animating both is its own multi-change program and would re-open calibration on two live fields. (c) alone is theater. **(a)+(c) gives a real mechanical negative-sum drag that the player can SEE and is powerless to fully stop — which is exactly the intended emotion.**

---

## 2. WHAT SIGNAL should drive it

| Candidate signal | Live? | Behavior | Verdict |
|---|---|---|---|
| `local_strain` (front-edge integral) | only if IV-b substrate built | measures **siege duration** → anti-correlated with collapse (§0) | **REJECT as the collapse driver** |
| `state.political.war_exhaustion[fid]` | **LIVE, per-faction** | rescaled 0..10000 (cap), climbs through early-war, **crosses 65 in early-mid 1993, saturates ~100 (i.e. /100) by ~w80** (IV-a §1; `exhaustion.ts:113–124`). Already drives WASH/CEASEFIRE/combat-tempo gates and is **already surfaced in the warroom UI** (`war_data_extractor.ts`, `warroom.ts`) | **RECOMMEND — the live war-weariness accumulator** |
| `profile.authority` / formation `fatigue` | live but **pinned** (50 / capped 30) | never cross their gates → structurally dead | defer (framing (b)); animate later or re-anchor |
| time / turn count | live | monotonic but factionless, no differentiation | use only as a secondary multiplier, not the primary |

**RECOMMENDATION: drive the repurposed collapse off `war_exhaustion[fid] / 100`** — the exact field IV-a already reconciled Tier-0 onto. It is the engine's open-ended will-to-fight accumulator, it differentiates by faction, it saturates late (the "everyone is spent by 1995" texture falls out for free), and it is already the warroom's exhaustion read so the UI surface (framing (c)) is **already wired to the same number** — the feel layer and the mechanical layer share one source of truth with no new persisted state.

This makes Tier-0 (faction war-weariness gate) the **primary** mechanism and demotes Tier-1/`local_strain` from "the collapse driver" to, at most, an optional *flavor* discriminator for which OSIDs get a narrative call-out. The territory-moving Tier-1 → 3D-damage → control path (IV-b) becomes **optional / post-1.0**.

---

## 3. WHAT CONSEQUENCE

Re-aim away from territory. The existing 3D output (`collapse_damage` → `capacity_modifiers` → `getSidCapacityModifiers`/`getEdgeCapacityMultiplier`) is **per-SID** and was designed to soften defenders (a territory lever). For framing (a) the natural output is **faction-level effectiveness drag**, not per-SID supply softening. Two consequence shapes:

- **C-feel-only (calibration-INERT):** war-exhaustion is computed into a **faction-level exhaustion/collapse READ-MODEL** (a derived report + UI surface + Chronicle/consequence-log events: "the crisis staff in X has dissolved", "reservists are not reporting", "the will to fight is breaking"). **Touches no combat input, moves no territory, perturbs no hash.** This is framing (c), and it is the cheapest, safest first ship. The 3C eligibility state-machine already produces exactly the booleans a surface needs (`eligible_*`, persistence counters) — read them, don't add them.

- **C-drag (FLOOR-MOVING):** the same war-exhaustion gate, when sustained, applies a **bounded faction-wide multiplier** to soft levers — recruitment/replacement rate, op-launch willingness (commander posture), and combat tempo — *not* defender supply at contested OSIDs. This is the negative-sum tax with teeth. It moves the hash and therefore **requires a re-floor**, but because it degrades *the exhausted faction's own offensive capacity* (it makes a spent faction launch fewer/weaker ops) rather than handing the enemy territory, it is far less likely to perturb the sacred anchors than the IV-b defender-softening path. The territory effect is *emergent and indirect* (a faction too exhausted to launch Op X simply doesn't), never a scripted control flip.

**RECOMMENDATION: ship C-feel-only FIRST (calibration-inert, no re-floor, immediate "soul" payoff), then C-drag as a SEPARATE owner-gated, re-floored step** if the panel wants mechanical teeth. Do **not** reuse the per-SID `capacity_modifiers`/`getEdgeCapacityMultiplier` consumer path for framing (a) — it is the wrong granularity (per-edge supply, a territory lever) and it carries the inert edge-min §6 residual (3D §EDGE-MULTIPLIER RESIDUAL); a faction-level multiplier is cleaner and §6-trivial (faction-scalar, never per-enclave-OSID).

**Does it move territory?** Primary answer: **no** (owner's directive). C-feel-only: never. C-drag: only *emergently/indirectly* via the exhausted faction's own reduced agency, never by a scripted flip.

---

## 4. Does it reproduce anything HISTORICAL?

Yes, and this is the strongest argument for framing (a). **By 1995 all three factions were exhausted** — ARBiH manpower-tapped and politically fraying, VRS over-extended and desertion-ridden after Krajina, HVO spent and patron-constrained. A faction-wide war-weariness drag that bites *late* reproduces the real texture: the 1995 war was fought by armies running on empty, which is *why* it ended at Dayton rather than in a decisive conquest. `war_exhaustion` already encodes this (saturates ~w80+), so framing (a) is history-grounded **by reusing a field that was already validated against that history** (it gates WASH/ceasefire timing today). Framing (b)'s western-1995 cohesion break is *more specific* history but is blocked behind the two dead fields. Framing (a) reproduces the *general* late-war exhaustion that genuinely happened to everyone — the negative-sum truth — without inventing anything.

---

## 5. §6 + calibration

- **Default-off byte-identical until activated:** unchanged. The 3C/3D flags stay `false` by default; only `ENABLE_COLLAPSE=true` (env, IV-a) flips them. C-feel-only adds a read-model gated behind the same flag → byte-identical when off (precedent: the observer-flag re-floors in MEMORY are calibration-inert read-model writes).
- **G1 enclave guard:** **intact and untouched.** It keys on `getEnclaveDefForOsid(osid)` (`phase3d…ts:90–97`), a per-OSID predicate at the `collapse_damage`/`capacity_modifiers` write sites. Framing (a) is **faction-scalar** and does not write per-OSID damage at all, so G1 has nothing to guard *for framing (a)* — and if Tier-1/3D is left disabled, G1 remains exactly as merged. **No §6 surface is opened by the repurpose.** (The IV-b OSID-substrate re-route, which WOULD exercise G1, is explicitly out of scope here.)
- **Calibration-inert vs floor-moving:**
  - **C-feel-only = calibration-INERT** (pure read-model + UI/Chronicle; no combat input, no territory; **no re-floor**).
  - **C-drag = FLOOR-MOVING** (faction-wide soft-lever multiplier perturbs hash → one owner-signed re-floor; sacred anchors + §6 re-verified; lower anchor-risk than IV-b because it degrades the *exhausted faction's own* offense, not the enemy's defense).
- The G2 rupture floor (`srebrenica_genocide_1995` ≥160) is event-driven and **independent of this signal** — unaffected either way.

---

## 6. Build delta from current state (REUSE vs REPLACE)

| Pipeline component | Status under the repurpose |
|---|---|
| 3A pressure eligibility / exposure | **NOT USED** by framing (a). Left in place, disabled. (Only IV-b/Tier-1 needs it.) |
| 3B exhaustion accrual | not the driver; `war_exhaustion` (a separate, already-live accumulator) is. Left in place. |
| 3C **Tier-0** state-machine (per-faction eligibility, persistence counters, coherence gates, suppression/immunity hooks) | **REUSED AS-IS.** Already reads `war_exhaustion/100` (IV-a). Already produces the per-faction booleans a feel-surface needs. **~0 LOC.** |
| 3C **Tier-1** (`local_strain` integral, per-OSID exposure) | **REPLACED / SHELVED** as the collapse driver (§0 — measures siege duration). Kept dormant for an optional future flavor discriminator. |
| 3D resolution (`collapse_damage`, severity) | **NOT USED** by framing (a) (per-OSID, territory-shaped). Left in place, disabled. |
| `capacity_modifiers` + `getSidCapacityModifiers`/`getEdgeCapacityMultiplier` consumers (front_pressure, formation_fatigue, loss_of_control) | **NOT REUSED** for framing (a) (wrong granularity; carries the inert edge-min residual). Untouched. |
| G1 §6 guard | **UNTOUCHED, intact.** |
| **NEW for C-feel-only** | a faction-level exhaustion/collapse **read-model** off `war_exhaustion/100` + 3C Tier-0 booleans → a report + UI/Chronicle surface. **~60–120 LOC, no new persisted state, no migration, no re-floor.** |
| **NEW for C-drag (optional, separate step)** | a bounded faction-wide multiplier from the same gate, wired into recruitment/op-willingness/tempo at existing hook points. **~80–150 LOC + one owner-signed re-floor.** |

**Estimate:** the repurpose **reuses the entire 3C Tier-0 state-machine and the `war_exhaustion` signal verbatim** (the load-bearing half) and **shelves the 3A/Tier-1/3D/capacity-modifier territory half**. Net new code for the recommended first ship (C-feel-only) is a **read-model + surface, ~60–120 LOC, zero re-floor, zero §6 surface.** That is dramatically cheaper than IV-b (OSID substrate re-route + 3D activation + defender-softening re-floor + §6 re-verification).

---

## 7. Three concrete repurpose designs (for the panel)

- **Design A — "War-Weariness Surface" (C-feel-only, framing a+c). RECOMMENDED FIRST.** Signal `war_exhaustion/100` + 3C Tier-0 booleans → faction-level exhaustion read-model + UI/Chronicle events. No territory, no combat input. **Calibration-INERT, no re-floor, no §6 surface, ~60–120 LOC.** Ships the negative-sum *feel* immediately and safely.
- **Design B — "Exhaustion Drag" (C-drag, framing a).** Design A's surface **plus** a bounded faction-wide multiplier on recruitment / op-willingness / combat tempo. Territory effect emergent-and-indirect (a spent faction launches fewer ops), never scripted. **FLOOR-MOVING — one owner-signed re-floor; lower anchor-risk than IV-b.** Build on top of A.
- **Design C — "Localized Cohesion Break" (framing b).** The original territory ambition: animate `profile.authority` + formation `fatigue` past their dead gates (or re-anchor the gates), then run Tier-1/3D over the OSID substrate (IV-b). **Most history-specific (western-1995 break) but most expensive and most §6-exposed** (exercises G1, defender-softening re-floor, two newly-animated live fields). **DEFER to post-1.0.**

**Sequence: A now (free, safe, ships the soul). B if the panel wants teeth (cheap re-floor). C post-1.0.**

---

## FINAL RECOMMENDATION (for ratify)

Repurpose collapse into a **faction-level war-weariness layer**: it represents *will-to-fight breaking / late-war exhaustion* (the negative-sum "everyone is spent by 1995" texture); driven by the **already-live `war_exhaustion[fid] / 100`** signal (NOT the siege-duration-biased `local_strain` integral); consumed FIRST as a **player-facing exhaustion read-model + Chronicle surface** (**feel-only, moves no territory**), with an optional second step that adds a bounded faction-wide effectiveness **drag** on the exhausted faction's own recruitment/op-willingness/tempo (emergent territory only, never scripted).

**Pipeline reuse:** the entire **3C Tier-0 state-machine + `war_exhaustion` signal are reused verbatim** (the load-bearing half, already reconciled in IV-a); the **3A / Tier-1 `local_strain` / 3D-damage / per-SID capacity-modifier territory half is shelved**. G1 §6 guard untouched and intact.

**Calibration:** the recommended first ship (Design A, the read-model surface) is **calibration-INERT — no re-floor, no §6 surface, byte-identical when the flag is off** (~60–120 LOC). The optional drag step (Design B) is **floor-moving — one owner-signed re-floor**, lower anchor-risk than the IV-b territory path.

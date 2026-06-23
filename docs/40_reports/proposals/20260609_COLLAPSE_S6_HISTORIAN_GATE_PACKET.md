# §6 HISTORIAN-GATE REVIEW PACKET — Collapse Pipeline (G3 prep)

> **Superseded correction (2026-06-18):** this dated packet predates the event-owned Srebrenica/Zepa receipt correction. Current canon: Srebrenica/Zepa fall receipts are sensitive-history event `control_change` effects, and `srebrenica_genocide_1995` observes the resulting RS control at turn >=160. Treat older turn-140 rupture-floor language below as historical draft context only.

**Type:** READ-ONLY assembly. No engine/sim/scenario/state/test code touched. No §6 content authored, reinterpreted, softened, or altered. No rupture timing changed. This packet QUOTES existing canon verbatim and CITES exact file+section; it does not decide anything.
**Purpose:** Supports **G3** (historian acknowledgment) of the three-part §6 guard for the pressure→exhaustion→political-collapse pipeline. G1 (enclave-OSID exclusion at the Phase-3D `collapse_damage` write root) and G2 (188-week invariant test) are engineering work, gated separately; this packet is the evidence the §6 Pyrrhic panel (Historian + scenario-tester/calibration + Engine/systems + Red-team) signs off on; the atrocity-is-never-rewarded bright line surfaces to the owner.
**Predecessors (read first):**
- `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md` (§4 = the §6 guard design)
- `docs/40_reports/proposals/20260609_SCOPE_collapse_pipeline.md` (§3 = the §6 surface)
**Sign-off routing (per `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6):** "Change to enclave mechanics → `/gameplay-programmer` + `/historian` (for Srebrenica/Žepa specifically)"; plus "Any change that could produce a 'reward for atrocity' effect → User approval required; not delegable."

---

## 0. The single load-bearing mechanical fact (verified in code; corrected per Codex review on PR #368 P1)

> **Correction (Codex #368 P1):** an earlier draft of this packet stated 3D writes *only* `capacity_modifiers`. That is **false**. Verified in `src/sim/collapse/phase3d_collapse_resolution.ts`: 3D writes `state.political.collapse_damage.by_entity[entityId]` at the damage-write root (`getOrInitCollapseDamage`, `:103`); `updateCapacityModifiers` (`:169–188`) and `recomputePhase3DCapacityModifiersFromDamage` (`:197`) **derive** `capacity_modifiers` *from* that damage; and `src/state/loss_of_control_trends.ts:132` reads the damage entry directly to set `will_not_recover`. The corrected statement is below. The safety-critical point — **it never flips `political_controllers`** — is unchanged and is what carries the §6 guarantee.

Phase 3D (`src/sim/collapse/phase3d_collapse_resolution.ts`) writes `state.political.collapse_damage.by_entity[entityId]` (monotonic damage tracks) **and derives** `state.political.capacity_modifiers.by_sid[osid]` from it — four multipliers in `[0,1]` (`authority_mult`, `cohesion_mult`, `supply_mult`, `pressure_cap_mult`). The damage entry is also read directly by `loss_of_control_trends.ts:132` to set the `will_not_recover` diagnostic. It **never** writes `political_controllers`. The downstream consumers (`front_pressure.ts`, `formation_fatigue.ts`, `loss_of_control_trends.ts`) only scale pressure generation / formation supply / diagnostic flags.

**Consequence for §6:** collapse can only *indirectly soften a defender* (degrade RBiH's own pressure/supply at a settlement); combat then resolves control through the existing authorized mechanisms. Collapse therefore:
- **CAN** accelerate a defender's fall (by weakening the defender);
- **CANNOT** flip control directly, throttle an attacker (collapse degrades the defender RBiH, not the attacker RS), save an enclave, or alter a rupture trigger/timing.

This is corroborated by canon: control changes **only** via the authorized mechanisms (attack resolution / corps-frontline ops / authority collapse / negotiated transfer) and there is **"no passive pressure flip"** — see §2 below. The collapse guard exploits this asymmetry: it only has to prevent *acceleration* on §6 OSIDs, not suppression.

---

## 1. The protected set (exact OSID keys, FALLS vs HOLDS)

Source of truth for OSID membership and faction: `src/sim/combat/enclave_resilience.ts` (`ENCLAVE_DEFINITIONS`, lines 82–202). All six RBiH enclaves below are read by `getEnclaveDefForOsid(osid)` (`enclave_resilience.ts:559`), which the proposed **G1** guard keys off.

### 1.1 §6-CRITICAL — eastern enclaves named in the Sensitive History Gate (Srebrenica / Žepa specifically)

| Enclave | Faction | Canon outcome | OSID keys (verbatim from `enclave_resilience.ts`) |
|---|---|---|---|
| **Srebrenica** | RBiH | **FALLS** on canon timing (genocide rupture) | `op:srebrenica:bostahovine_2`, `op:srebrenica:brezovice_2`, `op:srebrenica:donji_potocari_2`, `op:srebrenica:mala_daljegosta_2`, `op:srebrenica:ljeskovik_2`, `op:srebrenica:luka_2`, `op:srebrenica:milacevici`, `op:srebrenica:radovcici`, `op:srebrenica:srebrenica_2`, `op:srebrenica:suceska`, `op:srebrenica:sulice_2` |
| **Žepa** | RBiH | **FALLS** on canon timing | `op:rogatica:zepa_2` |
| **Goražde** | RBiH | **HOLDS** to war's end | `op:gorazde:bacci`, `op:gorazde:citluk_2`, `op:gorazde:faocici_2`, `op:gorazde:glamoc`, `op:gorazde:gorazde_2`, `op:gorazde:hrancici`, `op:gorazde:kamen`, `op:gorazde:kola`, `op:gorazde:kolovarice`, `op:gorazde:mravinjac_2`, `op:gorazde:novakovici`, `op:gorazde:osjecani_2`, `op:gorazde:semihova_2`, `op:gorazde:slatina_2`, `op:gorazde:sopotnica`, `op:gorazde:ustipraca_2`, `op:gorazde:zorlaci`, `op:gorazde:zorovici` |
| **Bihać** | RBiH | **HOLDS** to war's end | Defined by **prefix**, not an explicit list (see §1.4): `op:bihac:*`, `op:cazin:*`, `op:velika_kladusa:*`, `op:bosanska_krupa:*` |

**Canonical rupture key (verbatim, `src/sim/negotiation/rupture_consequences.ts`):** the Srebrenica genocide rupture (`srebrenica_genocide_1995`) records **iff all three hold**:
- `state.military.event_flags.srebrenica_enclave_formed === true` (`:54`)
- `state.political.political_controllers['op:srebrenica:srebrenica_2'] === 'RS'` — constant `SREBRENICA_OSID = 'op:srebrenica:srebrenica_2'` (`:17`, `:58`)
- `state.meta.turn >= 160` — constant `SREBRENICA_MIN_TURN = 160` (`:20`, `:62`)

It is **idempotent / locked / permanent** (`:46–50`, and SENSITIVE_HISTORY_DESIGN_GATE.md §1.5 #36). The proposed G1 guard must keep the *control flip at `op:srebrenica:srebrenica_2`* on its existing combat/event path so this predicate fires unchanged.

### 1.2 The other RBiH enclaves the broad G1 exclusion also covers

The build spec's G1 (BUILD_SPEC §4.3) deliberately excludes **all RBiH enclaves**, not only the eastern four — "ship the broad exclusion; relax later." These are also in scope of the guard:

| Enclave | Faction | Canon outcome | OSID keys / definition |
|---|---|---|---|
| **Sarajevo** | RBiH | HOLDS (siege; calibration anchor) | Prefix-based: `op:<munId>:*` for each `munId` in `SARAJEVO_CITY_CORE_MUN_IDS` (`enclave_resilience.ts:153`); capital `op:centar_sarajevo:centar_sarajevo` |
| **Teočak** | RBiH | HOLDS (lone Bosniak holdout, BB1 p.509) | `op:ugljevik:teocak_krstac_2` |

### 1.3 HRHB enclaves — IN G1 scope mechanically, but NOT §6 sensitive-history protected

`getEnclaveDefForOsid` also matches three HRHB pockets — `kiseljak`, `lasva_valley`, `zepce` (`enclave_resilience.ts:162–202`). They are **not** §6 sensitive-history enclaves (no rupture, no genocide arc). The build spec's G1 as written excludes *RBiH* enclaves specifically (BUILD_SPEC §4.3: "the enclave faction is RBiH"). **Open question O-1 (§5):** confirm with owner whether G1 also excludes HRHB enclaves, or only RBiH. This packet does not decide it; the §6 acknowledgment in §4 covers RBiH outcomes only.

### 1.4 Caveat on prefix-defined enclaves (Bihać, Sarajevo)

Bihać and Sarajevo are defined by OSID **prefix sets**, not explicit OSID lists (`enclave_resilience.ts:86`, `:153`). `getEnclaveDefForOsid` resolves membership via `osidBelongsToEnclave` (prefix match), so G1 covers every OSID under those prefixes without an enumeration. I did **not** expand the full Sarajevo prefix set here because `SARAJEVO_CITY_CORE_MUN_IDS` lives in `src/state/enclave_integrity.ts`; the membership test, not a static list, is authoritative.

### 1.5 Žepa OSID — note for the historian

The authoritative Žepa OSID is **`op:rogatica:zepa_2`** — confirmed by `ENCLAVE_DEFINITIONS` (`enclave_resilience.ts:111,113`), the `zepa_falls_1995` event `control_change` (`data/scenarios/events/war_1995.json:513`), the held-enclave observer flag, and the historical anchors (`src/scenario/historical_anchors.ts:79,147,184,248`). A **doc-comment** in `src/sim/codex/dynamic_section_builder.ts:252` writes the Žepa OSID as `op:zepa:zepa_2`, which does **not** match any OSID in the data; the live predicate gates on a flag, not that string, so it is a cosmetic comment inaccuracy, not a behavioral one. Flagged here so the historian/owner is not misled by that comment. **This packet does not edit it.**

---

## 2. The existing invariants, quoted verbatim

> All quotes below are reproduced exactly. Source files are NOT edited. `docs/10_canon/FORAWWV.md` was not edited and is not quoted (not required).

### 2.1 Sensitive History Design Gate — Ring 1 enclaves + the one rupture

`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 (Ring 1 — Modeled mechanically):

> - **Enclaves** (`src/sim/combat/enclave_resilience.ts`) — Sarajevo, Bihać, Srebrenica, Žepa, Goražde, and HRHB pockets have explicit OSIDs, resilience caps, supply-linked decay/growth, and garrison mechanics. Enclaves fall through the accepted event-owned control receipt path or other Section 6-approved modeled-war path; Krivaja/Stupcanica operation delivery is not the Srebrenica/Zepa receipt owner.

> - **Rupture consequence** — exactly one: `srebrenica_genocide_1995`, fired when the Srebrenica OSID falls to RS in the 1995 timeframe with enclave formed flag set. Propagates `genocide_condemnation` flag. Locked, idempotent, permanent.

`SENSITIVE_HISTORY_DESIGN_GATE.md` §2 (Rupture Expansion Rule), criterion 3 (the binding criterion):

> 3. **Specific trigger condition** — the rupture fires on a discrete, deterministic game-state condition (control of a specific OSID, presence of a flag, turn range), not a cumulative threshold. **This is the BINDING criterion: ruptures fire only on emergent satisfaction of the discrete game-state condition. No calendar-window heuristic substitution is permitted — the historical calendar alone cannot stand in for the OSID/flag/turn predicate.**

`SENSITIVE_HISTORY_DESIGN_GATE.md` §2, current rupture roster row:

> | `srebrenica_genocide_1995` | Fall of Srebrenica safe area, July 1995 | 8,000+ killed ✓; Krstić genocide conviction, Karadžić, Mladić, ICJ 2007 ✓; RS controls `op:srebrenica:srebrenica_2` + enclave formed + turn ≥140 ✓; locked ✓ |

`SENSITIVE_HISTORY_DESIGN_GATE.md` §3 (Ring 3 — Refused), #10:

> 10. **No gamified "prevent genocide" mechanic.** The player cannot earn points for preventing Srebrenica; they can only keep the enclave intact through ordinary military means. The reward is the absence of a `genocide_condemnation` flag, not a badge.

`SENSITIVE_HISTORY_DESIGN_GATE.md` §6 (Sign-Off Structure), the two binding rows:

> | Change to enclave mechanics | `/gameplay-programmer` + `/historian` (for Srebrenica/Žepa specifically) |
> | Any change that could produce a "reward for atrocity" effect | User approval required; not delegable |

### 2.2 Engine Invariants v0.9.0 §8 — Exhaustion (the input side of collapse)

`docs/10_canon/Engine_Invariants_v0_9_0.md` §8 (Exhaustion Invariants), verbatim:

> - Exhaustion values are monotonic and irreversible
> - Exhaustion must increase under brittle or cut corridors, static fronts, coercive control, or sustained supply strain
> - Exhaustion compounds across military, political, and societal dimensions
> - Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system

### 2.3 Engine Invariants v0.9.0 §9.6 — Authorized Control Change (why collapse can't flip an enclave)

`docs/10_canon/Engine_Invariants_v0_9_0.md` §9.6 (Authorized Control Change Mechanisms), verbatim:

> Political control may change **only** via:
> - **Attack resolution** (War phase): an attack order is resolved -> push-back and control flip at the target OSID
> - **Corps or frontline operations** as defined in War Specification / Systems Manual
> - Internal authority collapse or fragmentation
> - Negotiated transfer through end-state or interim agreements
>
> **No passive pressure flip:** Control does not change from "sustained opposing military pressure" alone; it changes only when an attack (or corps/frontline op) is resolved.

### 2.4 Systems Manual v0.9.0 §7.2–7.3 — collapse is delayed/contingent, not a flip

`docs/10_canon/Systems_Manual_v0_9_0.md` §7.2 (Phase 3B), verbatim:

> When pressure persists under static, constrained, or degraded conditions, it gradually converts into irreversible exhaustion. This coupling enforces the negative-sum nature of the conflict by narrowing future options rather than producing immediate collapse or territorial change.

`docs/10_canon/Systems_Manual_v0_9_0.md` §7.3 (Phase 3C), verbatim:

> When accumulated exhaustion persists and coincides with institutional or spatial degradation, it may unlock eligibility for collapse in specific domains such as authority, command cohesion, or spatial integrity.
>
> Eligibility does not imply immediate failure. Collapse remains delayed, contingent, and multi-causal.

`docs/10_canon/Systems_Manual_v0_9_0.md` §7.4 area (War-phase combat / pressure metrics), verbatim:

> In War phase, **combat** is resolved by **attack resolution** (see §7.4): discrete attacks per target OSID with combat power formulas, outcome thresholds, casualties, push-back, and control flip. There is no passive pressure flip; control changes only via attack resolution or corps/frontline operations. Pressure-derived metrics (e.g. for exhaustion coupling in Phase 3A/3B/3C) may still be computed from formation state and adjacency but do not cause control change.

### 2.5 The two existing enclave-fall events (timing/triggers that must NOT move) — quoted from data

These are the canonical fall mechanisms whose timing collapse must leave **unchanged**. Source: `data/scenarios/events/war_1995.json`.

`srebrenica_falls_1995` trigger (`war_1995.json:368–387`):

> `"turn_min": 160, "turn_max": 185, "phase": "war"`, condition = `and(flag srebrenica_enclave_formed == true, flag srebrenica_demilitarized == true)`; `"once": true`; sets `srebrenica_fell: true`; `control_change` to RS over the ten Srebrenica OSIDs.

`zepa_falls_1995` trigger (`war_1995.json:473–515`):

> `"turn_min": 160, "turn_max": 190, "phase": "war"`, `requires_events: ["srebrenica_falls_1995"]`, condition = `flag srebrenica_enclave_formed == true`; `"once": true`; `control_change` to RS over `["op:rogatica:zepa_2"]`.

(Note: the **rupture** floor is now turn ≥ 160 in `rupture_consequences.ts`, matching the event-owned fall-receipt window. The **fall event** windows are 160–185 / 160–190. The rupture records only after the event-driven control flip at `op:srebrenica:srebrenica_2` to RS.)

---

## 3. What G2 (the 188-week invariant test) must assert

Derived **strictly** from §1–§2 above. This is the checklist G2 must encode; this packet does **not** write the test. "Disabled baseline" = the current calibration floor with collapse OFF (per BUILD_SPEC §5.3, 40w manifest hash `be76e56dd9d288c2`).

- [ ] **G2.1 — Rupture still records.** With collapse ON in 188w, `state.military.negotiation.rupture_consequences` contains an entry with `id === 'srebrenica_genocide_1995'`.
- [ ] **G2.2 — Rupture not premature.** Its `recorded_turn >= 160` (`SREBRENICA_MIN_TURN`). The rupture must never record before turn 160 — the worst §6 failure (RS takes the OSID before the floor → rupture fails to record).
- [ ] **G2.3 — Rupture timing unchanged vs disabled baseline.** `recorded_turn` and the three trigger inputs (`srebrenica_enclave_formed`, `political_controllers['op:srebrenica:srebrenica_2']`, the turn it first reads `=== 'RS'`) are **identical** to the collapse-OFF baseline run (i.e. collapse does not move when Srebrenica falls).
- [ ] **G2.4 — Srebrenica falls on canon timing.** `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'` by Dayton, and the flip occurs within the `srebrenica_falls_1995` window (turn 160–185), unchanged vs baseline.
- [ ] **G2.5 — Žepa still falls.** `political_controllers['op:rogatica:zepa_2'] === 'RS'` by Dayton, on the `zepa_falls_1995` window (160–190), unchanged vs baseline.
- [ ] **G2.6 — Goražde still HELD.** Every Goražde OSID in §1.1 remains `RBiH` at war's end (anchors: `historical_anchors.ts` Goražde rows), unchanged vs baseline.
- [ ] **G2.7 — Bihać still HELD.** Every OSID under the Bihać prefix set remains `RBiH` at war's end, unchanged vs baseline.
- [ ] **G2.8 — No collapse_damage entry AND no capacity_modifier written for any §6 enclave OSID (G1 proof; strengthened per Codex review on PR #368 P1).** For every OSID where `getEnclaveDefForOsid(osid)` returns an RBiH enclave, on every turn of the 188w run, even when that OSID is Tier-1 collapse-eligible: (i) **`state.political.collapse_damage.by_entity[osid]` is absent** (no entry created) — this is the *true* proof of inertness, because the modifier and the `will_not_recover` flag are both derived from this entry; AND (ii) `capacity_modifiers.by_sid[osid]` is **absent / untouched** (default 1.0); AND (iii) `loss_of_control_trends` does not set `will_not_recover` for the OSID. (Asserting only (ii), as an earlier draft did, would miss the case where collapse_damage accumulates but the modifier write is skipped — which would still feed the recompute-from-damage path and mark `will_not_recover`. The G1 root-write guard makes all three hold; (i) is the load-bearing assertion. G2.1–G2.7 are the downstream guarantees it buys.)
- [ ] **G2.9 — Sarajevo + Teočak unchanged.** Sarajevo siege-ring OSIDs and `op:ugljevik:teocak_krstac_2` hold as in baseline (these are also RBiH enclaves excluded by G1).
- [ ] **G2.10 — Determinism.** Two identical 188w runs with collapse ON produce byte-identical rupture records and enclave control maps (Engine Invariants §4 / §9.9).

**Pass relationship:** if G1 (§6 OSID exclusion at the **3D collapse_damage write root** — see §4 / BUILD_SPEC §4.3) holds, G2.1–G2.9 pass *trivially* because collapse never creates a `collapse_damage` entry for an enclave OSID, so it never touches that OSID's derived modifiers, pressure/supply, or `will_not_recover` flag. G2 is therefore the **proof that G1 is sufficient** and the regression sentinel against any future change that lets collapse reach an enclave OSID.

---

## 4. The acknowledgment for owner/historian sign-off

> **Statement under review:**
> With the collapse pipeline (Phase 3A→3D) enabled, the §6 enclave outcomes and the Srebrenica genocide-rupture timing are provably unchanged from the collapse-disabled baseline, because:
> **(a)** Phase 3D writes `collapse_damage` and *derives* `capacity_modifiers` from it (and that damage entry also drives the `will_not_recover` diagnostic), but it **never** writes `political_controllers` — so collapse can only soften a defender, never flip control, throttle an attacker, save an enclave, or alter a rupture trigger (verified in code; consistent with Engine Invariants §9.6 "no passive pressure flip");
> **(b)** Guard **G1** excludes **every RBiH enclave OSID** (Srebrenica, Žepa, Goražde, Bihać, Sarajevo, Teočak — via `getEnclaveDefForOsid`) at the Phase-3D **`collapse_damage` write root** — not merely the modifier write — so no collapse_damage entry is created for those OSIDs, which transitively blocks the derived modifier, the recompute-from-damage path, AND the `will_not_recover` marking. Collapse is therefore provably inert on those OSIDs — it can neither accelerate Srebrenica/Žepa's fall nor weaken Goražde/Bihać's hold;
> **(c)** Guard **G2** asserts the §3 invariant checklist in CI on the 188-week horizon (rupture still records at turn ≥ 160 and on unchanged timing; Žepa falls; Goražde + Bihać held; for every enclave OSID, no collapse_damage entry AND no capacity_modifier), and must be GREEN before and on every collapse-enabled run.
>
> The Srebrenica genocide rupture remains a **consequence, not a lever** (SENSITIVE_HISTORY_DESIGN_GATE.md §0, §3 #10): collapse cannot be used to prevent it, accelerate it, or trade it away. The rupture continues to fire **only** on emergent satisfaction of the discrete OSID/flag/turn predicate (Gate §2 criterion 3), never on a calendar heuristic.

**Pyrrhic §6-panel sign-off ("reward for atrocity" + enclave-mechanics rows, Gate §6 — unanimous GO; the atrocity-is-never-rewarded bright line surfaces to the owner):**

```
Owner acknowledgment: ____________________________   Date: __________

Historian acknowledgment (Srebrenica/Žepa specifically, ICTY/ICJ/UN-grounded per Gate §6):
____________________________   Date: __________
```

*(Left unsigned by the assembling agent, as required.)*

---

## 5. Open questions for the owner

- **O-1 — HRHB enclaves in G1 scope?** `getEnclaveDefForOsid` also matches the three HRHB pockets (`kiseljak`, `lasva_valley`, `zepce`). BUILD_SPEC §4.3's G1 as written excludes only **RBiH** enclaves. These HRHB pockets are not §6 sensitive-history surfaces (no rupture), so leaving them collapse-eligible is not a §6 risk — but it is a guard-scope decision. **Decide:** does G1 exclude all enclaves, or RBiH only? (No §6 impact either way; calibration-scope only.)
- **O-2 — Žepa doc-comment string (§1.5).** `dynamic_section_builder.ts:252` comments the Žepa OSID as `op:zepa:zepa_2`, which matches no data OSID (authoritative key is `op:rogatica:zepa_2`). It is a cosmetic comment, not behavioral. **Decide:** fix the comment in a separate non-§6 doc-comment cleanup, or leave it. This packet did not touch it.
- **O-3 — Rupture floor aligned to fall-event window (160–185).** The genocide rupture now records on turn ≥ 160 (`rupture_consequences.ts`), after the `srebrenica_falls_1995` *control flip* can fire in the 160–185 window. G2.2/G2.3 assert the ≥160 floor AND timing-unchanged-vs-baseline. **Confirm** the historian is comfortable asserting the invariant against the *baseline-observed* rupture turn rather than a hardcoded historical week.
- **O-4 — Sarajevo broad-exclusion confirmation.** BUILD_SPEC §4.3 ships the broad G1 (Sarajevo + Bihać excluded too) and flags Sarajevo as "a calibration anchor … too sensitive for a first collapse build." This is a calibration/design call, not strictly §6, but it interacts with the siege model. **Confirm** the owner wants the broad exclusion for the first collapse build.
- **O-5 — `enclave_held_through_turn` observer flag is §6-gated and OFF.** The held-enclave observer flag (Srebrenica AND Žepa AND Goražde) is deliberately not written (`observer_threshold_flags.ts:18–21`; `war_phases.ts:1005`), deferred for separate §6 historian handling. It is **independent** of the collapse guard, but the historian may want to note it is a separate pending §6 item, not covered by this packet.

---

## Appendix — citation map (file:line, all READ-ONLY)

- Rupture trigger keys: `src/sim/negotiation/rupture_consequences.ts:17,20,54,58,62` (`op:srebrenica:srebrenica_2`, turn ≥ 160, enclave_formed, idempotent `:46–50`)
- Enclave definitions + factions: `src/sim/combat/enclave_resilience.ts:82–202`; resolver `getEnclaveDefForOsid` `:559`, `getEnclaveIdForOsid` `:547`
- Srebrenica fall event: `data/scenarios/events/war_1995.json:362–466` (window 160–185, control_change to RS)
- Žepa fall event: `data/scenarios/events/war_1995.json:467–521` (window 160–190, requires `srebrenica_falls_1995`, control_change `op:rogatica:zepa_2`)
- Žepa anchors: `src/scenario/historical_anchors.ts:79,147,184,248`
- Held-enclave observer flag (§6-gated OFF): `src/sim/codex/observer_threshold_flags.ts:18–21,51`; `src/sim/turn_phases/war_phases.ts:1005`; predicate `src/sim/codex/dynamic_section_builder.ts:257–258` (comment OSID inaccuracy `:252`)
- Canon — Sensitive History Gate: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §0, §1 (Ring 1), §2 (rupture rule + roster), §3 #10 (Ring 3), §6 (sign-off)
- Canon — Exhaustion: `docs/10_canon/Engine_Invariants_v0_9_0.md` §8
- Canon — Authorized control change / no passive pressure flip: `docs/10_canon/Engine_Invariants_v0_9_0.md` §9.6
- Canon — Collapse delayed/contingent: `docs/10_canon/Systems_Manual_v0_9_0.md` §7.2, §7.3, §7.4 area
- Guard design under review: `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md` §4 (G1/G2/G3); 3D damage-write root `src/sim/collapse/phase3d_collapse_resolution.ts:103` (`getOrInitCollapseDamage`); modifier derivation `:169–188` (`updateCapacityModifiers`), `:197` (`recomputePhase3DCapacityModifiersFromDamage`), `:350–384`; `will_not_recover` from damage `src/state/loss_of_control_trends.ts:132`
- Build/scope predecessors: `docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md`, `docs/40_reports/proposals/20260609_SCOPE_collapse_pipeline.md`

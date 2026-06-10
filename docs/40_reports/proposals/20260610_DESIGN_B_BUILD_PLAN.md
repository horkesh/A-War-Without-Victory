# Design B — "Exhaustion Drag" BUILD PLAN (faction-level offensive-capacity drag)

**Type:** READ-ONLY build spec. No engine code, no flag flips, no canon edits produced in writing this. Every claim is file:line-cited against the working tree (`main` @ `b7d7d58fd`).
**Status:** BUILD-READY. A coder can execute §7 directly.
**Predecessor:** `20260610_COLLAPSE_REPURPOSE_EXHAUSTION_SCOPE.md` (Design B = its §7 "C-drag" row, framing (a)). Design A (war-weariness read-model + Chronicle, PR #402) is the surface this hangs teeth on.
**Owner choice:** Design B — give the exhaustion *feel* mechanical teeth so late-war territory shifts EMERGE from war-weariness (negative-sum) rather than being scripted.
**Signal:** `state.political.war_exhaustion[fid]` (per-faction, 0..10000 raw; `/100` → 0..100 recovered; crosses 65 mid-1993, saturates ~w80). Reuse Design A's band thresholds (`war_weariness_bands.ts`).

---

## 0. The reframing finding (read this first)

**The drag Design B describes ALREADY EXISTS — twice — and both instances are load-bearing-but-degenerate.** The repurpose is therefore NOT "add a new lever"; it is "fix and own the war-exhaustion offensive-drag lever that is already wired, mis-scaled, and baked into the 649 floor." This changes the build from "new system" to "one constant-and-scale correction behind a flag." That is *cheaper and lower-risk* than the scope doc assumed (it estimated 80–150 LOC of new wiring; the real build is ~40–70 LOC because the wiring exists).

Two live war_exhaustion → own-offense drags on disk today:

| # | Site | What it drags | Scale bug | Floor | Status in 649 |
|---|---|---|---|---|---|
| **L1** | `combat_math.ts:1772` `getWarExhaustionTempoMult`, consumed at `attack_resolution_osid.ts:829` | **attacker combat POWER** in offensive OSID resolution (`attackerPower *= … * tempoMult`, line 830) | none — correctly on raw scale, thresholds 3000/8000 (= recovered 30/80) | **0.85** | BAKED IN (live, attacker-only) |
| **L2** | `plan.ts:279` `factionExhaustionDrag`, consumed in `stage_operation` / `launch_opportunity` intent scoring (`plan.ts:452,476`) | **op-launch WILLINGNESS** (commander intent score) | **YES — `/600` on the raw 0..10000 scale** (`plan.ts:281`). Saturates the 0.3 floor at recovered level 6 (≈ week 5). It is a near-constant 0.3, NOT a late-war ramp. | 0.3 | BAKED IN (live, degenerate) |

Both are **faction-scoped, attacker/own-offense-only, never touch the defender, never write `political_controllers`** — i.e. they already satisfy the Design B safety contract. L1 is well-formed; L2 is the broken one that *should* carry the "late-war ramp" Design B wants but doesn't because of the `/600` scale bug.

**Consequence for the build:** Design B's cleanest, most faithful, lowest-risk shape is to **(re)scale L2 to a real late-war ramp keyed off the same recovered-0..100 signal Design A uses, behind a default-off flag**, leaving L1 untouched (it is already correct and already in the floor). This is ONE lever at ONE site. See §1.

---

## 1. WHERE the drag attaches (the load-bearing decision)

### Candidates investigated

| Candidate | File:line | Controls | Faction-scoped? | Offense-only? | Verdict |
|---|---|---|---|---|---|
| **A. Op-launch willingness (commander intent score)** | `plan.ts:279` `factionExhaustionDrag` → `plan.ts:283` `exhaustionPenalty` → `plan.ts:452,476` (`e = 0.15 * exhaustionPenalty` in `stage_operation` + `launch_opportunity`) | Whether a corps CO *chooses* to stage/launch an offensive op this turn. A spent faction's COs propose fewer ops. | **YES** (`briefing.faction_war_exhaustion`, per-faction, `briefing.ts:713`) | **YES** — the `e` term only appears in the two offensive intents; defensive/reinforce intents have no exhaustion term | **PRIMARY — RECOMMEND.** Cleanest: emergent "fewer ops" with zero combat-power touch → cannot perturb the resolution of an op that *does* launch (so it can't soften a defender or alter a §6 rupture op's math). Already wired; fix the scale. |
| **B. Attacker combat power in offensive resolution** | `combat_math.ts:1772` `getWarExhaustionTempoMult` → `attack_resolution_osid.ts:829–830,836` | Power of an offensive that *does* launch → "weaker offensives" | YES | YES (attacker only, lines 1769/1781 comment + applied to `attackerPower` only) | **SECONDARY — DO NOT touch.** Already live + correctly scaled + in the 649 floor. Re-tuning its floor/thresholds is a *separate* calibration lane, not Design B. Listed for completeness; Design B leaves it byte-identical. |
| C. Op-eligibility hard gate | `sector_offensive.ts:1427` `isFactionOffensiveOpsSuppressed` (E-A5) | Binary refuse-to-launch at planning→execution | YES (event-array driven) | YES | **REJECT as the drag site.** It is a binary CAP wired to a specific 1995 event, not a continuous exhaustion ramp; bending it would entangle Design B with E-A5's calibration. Leave alone. |
| D. Recruitment / manpower | `army_reserve_system` / formation spawn | Replacement rate | YES | NO — recruitment feeds defense too; dragging it would weaken the exhausted faction's *defense*, which can hand the enemy territory (violates "never aids the enemy") | **REJECT.** Off-contract (not offense-only). |
| E. Combat tempo cadence (op interval) | no single faction-scalar surface; cadence is per-corps fatigue/supply | — | partial | — | **REJECT.** No clean single faction-scalar site; diffuse. |

### RECOMMENDATION — primary attach point

**`src/sim/combat/commander/plan.ts:279` (`factionExhaustionDrag`), re-scaled off `recoveredExhaustionLevel(war_exhaustion[fid])` behind a default-off flag.**

Why this site:
1. **Single lever, single site.** One multiplier already feeds exactly two offensive intents (`plan.ts:452,476`) and nothing else. No new consumer wiring.
2. **Most faithful to the design intent** ("a spent faction launches *fewer* offensives"). It throttles the *decision to attack*, which is precisely the negative-sum texture — armies running on empty stop *starting* things — and it does so without ever altering the combat that does happen.
3. **Lowest §6 risk.** It never enters `attack_resolution_osid.ts`. It cannot soften a defender. It cannot change the *math* of a triggered §6 rupture op (those don't go through commander intent scoring at all — see §4). The only way it touches territory is by suppressing *bot-authored opportunistic offensives*, which is the emergent effect we want.
4. **Already in the codebase, already baked into 649** as a degenerate constant — so fixing it is a *known-surface* change, and turning the flag OFF restores byte-identical current behavior (the existing degenerate `/600` form).

---

## 2. THE DRAG FUNCTION

### Current (degenerate, on disk)
```
factionExhaustionDrag = max(0.3, 1.0 - faction_war_exhaustion / 600)   // plan.ts:279-282
```
`faction_war_exhaustion` is raw 0..10000. `/600` saturates the 0.3 floor at raw 600 = recovered level 6 ≈ week 5. So in every real run it is the constant `0.3` from early-war on — a flat tax, not a ramp. This flat value is in the 649 floor.

### Design B (recommended) — late-war ramp on the recovered scale
Reuse Design A's band geometry (`war_weariness_bands.ts`): nothing happens until **cracking** (recovered 65), full drag by **collapsing** (recovered 85+).

```
// inputs: level = recoveredExhaustionLevel(war_exhaustion[fid])   // 0..100, from war_weariness_bands.ts
// constants:
const DRAG_FLOOR        = 0.55;   // a spent faction is hampered, not paralyzed
const DRAG_RAMP_START   = 65;     // = WAR_WEARINESS_BAND_THRESHOLDS.cracking (early-war unaffected)
const DRAG_RAMP_FULL    = 85;     // = WAR_WEARINESS_BAND_THRESHOLDS.collapsing

factionExhaustionDrag =
  level <= 65 ? 1.0
: level >= 85 ? 0.55
: 1.0 - ((level - 65) / (85 - 65)) * (1.0 - 0.55)   // linear 1.0 → 0.55
```

**Floor choice = 0.55** (not collapse's 0.6, not L1's 0.85). Rationale: this multiplier hits only the `e = 0.15 * exhaustionPenalty` *term* of the intent score (one of six weighted terms, `plan.ts:448-455`), and `exhaustionPenalty` is itself `corpsExhaustionCapacity * factionExhaustionDrag` (`plan.ts:283`). So a 0.55 faction-drag does NOT cut launch-willingness by 45%; it cuts ~45% of the 15%-weighted exhaustion term *after* corps-exhaustion has already had its say — a bounded nudge that reorders intent competition at the margin without hard-blocking (hard blocks remain the separate `corps_exhaustion`/`fatigue`/`campaign_role` guards, `plan.ts:306-311`). 0.55 gives the late-war "fewer ops" texture room to bite while keeping a spent faction *able* to defend itself and to launch when conditions are strong. **Tune in the re-floor run if 0.55 over/under-shoots; it is the single calibration knob.**

**Ramp start = 65 (cracking)** so early-war (1992 → mid-1993) is **completely unaffected** — `level <= 65 → 1.0`, exactly matching "early-war is unaffected" and avoiding any 1992/1993 anchor perturbation. This is a *strict improvement in faithfulness* over the current degenerate form (which taxes from week 5).

**Symmetric across factions: YES — recommend.** Universal exhaustion is the historical truth (§4); all three were spent by 1995. Drive it off each faction's own `war_exhaustion[fid]` with identical constants. Asymmetry would require a design justification this signal doesn't carry (the faction differentiation is already *in* the signal — RBiH/RS/HRHB reach the bands at different weeks because their exhaustion accrues differently, `exhaustion.ts:83-124`). One function, three factions, same constants.

**Deterministic:** pure function of a persisted numeric (`war_exhaustion[fid]`) via `recoveredExhaustionLevel` (already pure, `war_weariness_bands.ts:55`). No RNG, no clock.

---

## 3. ONE-CHANGE-PER-RUN

**Confirmed: single clean lever, one multiplier, one site.** The change is: replace the body of the `factionExhaustionDrag` computation at `plan.ts:279-282` with the §2 ramp, gated by a new default-off flag. No other site changes. L1 (`getWarExhaustionTempoMult`) untouched. Recruitment untouched. E-A5 untouched.

**Default-off gate.** Add a module-level flag in `plan.ts` mirroring the Phase 3C pattern (`phase3c…ts:18-31`):
```
let _enableExhaustionDragOverride: boolean | null = null;
export function getEnableExhaustionDrag(): boolean {
  return _enableExhaustionDragOverride !== null ? _enableExhaustionDragOverride : false;
}
export function setEnableExhaustionDrag(enable: boolean): void { _enableExhaustionDragOverride = enable; }
export function resetEnableExhaustionDrag(): void { _enableExhaustionDragOverride = null; }
```
When the flag is **OFF**, `factionExhaustionDrag` must compute the **EXACT current expression** (`max(0.3, 1.0 - briefing.faction_war_exhaustion / 600)`) so the build is **byte-identical** to current behavior until activated. The new ramp is the ON branch only:
```
const level = recoveredExhaustionLevel(briefing.faction_war_exhaustion);
const factionExhaustionDrag = getEnableExhaustionDrag()
  ? /* §2 ramp */
  : Math.max(0.3, 1.0 - briefing.faction_war_exhaustion / 600);  // UNCHANGED legacy path
```
This is the same default-off precedent as the observer-flag/collapse re-floors in MEMORY: dormant + byte-identical until an env/test flips it.

---

## 4. §6 verdict

**Faction-scalar, offense-only, intent-layer-only → no per-OSID damage, G1 untouched, enclaves unaffected.** The drag never reaches a per-OSID write, never enters `attack_resolution_osid.ts`, never writes `political_controllers`, never touches a defender. G1 (`phase3d…ts:90-97`, `getEnclaveDefForOsid`) guards the collapse-damage write path, which Design B does not exercise at all. G2 (`srebrenica_genocide_1995 ≥160`) is event-driven and reads nothing this lever writes.

**The mandatory rupture-op-suppression check (the one real §6 risk):** *Could dragging op-willingness suppress the Srebrenica/Žepa-taking ops below their launch threshold?*

**Verdict: NO — the §6 rupture ops are STRUCTURALLY EXEMPT from this lever, by construction.** Evidence:
- The enclave-taking ops are **triggered operations** in `triggered_operations.ts` (Krivaja-95 / Stupčanica-95: `triggered_operations.ts:135 TRIGGERED_OPS_RAW`, Srebrenica axis at `:443-457`, staging `:279-310`). They are injected by `checkTriggeredOperations` (`:977`) on a turn/condition gate — they are **NOT proposed by commander intent competition** (`plan.ts selectWinningIntent`). The `factionExhaustionDrag`/`exhaustionPenalty` term only weights the `stage_operation` and `launch_opportunity` *intent scores* (`plan.ts:452,476`). A triggered op never competes for an intent slot, so the drag multiplier is **never in its code path**. Dragging RS's op-willingness to its 0.55 floor cannot stop Krivaja-95 from firing.
- Even the L1 combat-power tempoMult (which Design B does NOT change) only *scales* an op's attacker power once it resolves; it never gates launch. So neither lever can prevent a rupture op from launching.

**Therefore the drag does NOT need to exempt the rupture ops** — they live on a different rail (triggered, not bot-intent). This is a stronger guarantee than "bounded so they still fire": they are *categorically* outside the lever's reach. **Recorded as a hard verification step in §6/§7** (the re-floor MUST confirm Srebrenica/Žepa still fall, as a regression backstop, even though the mechanism makes it structurally safe).

**Net §6 verdict: SAFE. No §6 invariant surface is opened. G1 untouched, G2 independent, rupture ops structurally exempt.**

---

## 5. EXPECTED TERRITORY DIRECTION + re-floor

**Floor-moving. Re-floor required (one owner-signed run).**

**Who gets dragged most, late-war:** By the recovered scale, all three saturate ~w80 (`exhaustion.ts` comment, scope §2). Mid-late-war ordering from the 649-baseline diagnostics (CALIBRATION_MASTER:399, "War exhaustion at w40: RS=400, HRHB=400, RBiH=271" on the OLD /100-pre-rescale read; on the rescaled raw scale RS/HRHB lead RBiH into the bands earlier). So the drag bites **RS and HRHB offensives first and hardest**, RBiH slightly later. Because the ramp only opens at recovered 65 (≈ mid-1993+), **all of 1992 and most of early-1993 are byte-untouched** — the drag is a *late-war* phenomenon by construction.

**Direction on the floor:**
- **Intended/likely:** reduces **late-war RS and HRHB opportunistic over-advances** (the bot-authored `launch_opportunity` ops that currently push past history). That nudges late-war territory *toward* history (RS/HVO running on empty stop launching marginal grabs) — the negative-sum correction the owner wants. This is **plausibly floor-NEUTRAL-to-POSITIVE** because the over-captures Design A/IV-a diagnostics flag (e.g. central-Bosnia HRHB ceiling, western VRS over-hold) are partly *late-war opportunistic offensives* that this lever would thin.
- **Risk to won anchors:** the sacred anchors are **operation-driven captures we WANT** (Zvornik, Sana, Storm/Mistral western recoveries, the srebrenica/žepa rupture). The two real risk channels:
  1. **Pre-planned + triggered ops are SAFE** — they don't route through intent scoring (§4), so the won anchors that come from scripted/triggered ops (Zvornik garrison-pin, the rupture ops, the Storm/Mistral western ops if pre-planned) are unperturbed.
  2. **Bot-`launch_opportunity` anchors are AT RISK** — any anchor that the calibration won via a late-war *opportunistic bot offensive* (not a pre-planned/triggered op) could regress if the corps was exhausted enough to drop below the intent threshold at that turn. The Sana follow-on / Ključ micro-lane (MEMORY: "Op Sana FOLLOW-ON launches too late") is the most exposed — it is already marginal on launch timing, and an added late-war willingness drag could push it later/never. **This is the primary regression to watch in the 188w ON/OFF diff.**

**Qualitative risk:** MODERATE and *bounded*. The 0.55 floor + 65-band-start + 15%-weight-of-one-term means the lever is a margin-reorderer, not a hard block — it should thin marginal late-war grabs without killing strong/early ops. The Sana-follow-on/Ključ cluster is the named anchor-regression watch item; if it regresses, raise `DRAG_FLOOR` toward 0.7 or `DRAG_RAMP_START` toward 75 (the two tuning knobs) and re-run — one change per run.

---

## 6. MEASUREMENT + GATE protocol

1. **Smoke triad first (flag ON, in a test):** `npx tsc --noEmit` + `npm run test:vitest` + `npm run desktop:map:build`. (No UI surface is added by Design B — it reuses Design A's surface — but run `desktop:map:build` regardless because `plan.ts` and `war_weariness_bands.ts` are touched/imported; `war_weariness_bands.ts` is already browser-safe by construction, so the build must stay green.)
2. **Byte-identical OFF proof:** 40w + 188w with flag OFF must reproduce the current floor hashes (40w `be76e56dd9d288c2`, 188w `5f57d17287b87dfb` / 649 territory — CURRENT FLOOR per MEMORY 2026-06-09). This is the default-off gate (§3). If OFF is not byte-identical, STOP — the legacy branch was altered.
3. **188w ON/OFF pair (the re-floor candidate):** run 188w flag-ON, diff territory + control_delta vs the OFF baseline. The territory delta IS the re-floor candidate.
4. **§6 G2 hard gate:** confirm `srebrenica_genocide_1995` rupture floor intact (≥160) and **Srebrenica + Žepa still fall** in the ON run (regression backstop per §4). HARD GATE — any rupture regression = NO-GO/revert.
5. **Sacred-anchor check:** scenario-tester + calibration panel verify the 30/30 anchors; specifically inspect the **Sana-follow-on / Ključ** cluster (§5 named watch item) and any other late-war `launch_opportunity`-won anchor.
6. **Re-floor:** if anchors hold and territory moves toward history (or holds), scenario-tester + calibration panel sign off the new floor hash. One owner-signed re-floor. If an anchor regresses, revert clean (flag back to default-off = byte-identical) and re-tune one knob.

---

## 7. BUILD STEPS (ordered, one change, with verification at each)

**Step 0 — pre-flight.** Confirm Design A (`war_weariness_bands.ts`, PR #402) is merged to `main` (the band module is the dependency). If still in the worktree, rebase Design B on top. Branch from `main` (do not work on `main`).

**Step 1 — add the default-off flag to `plan.ts`** (mirror `phase3c…ts:18-31`). New `_enableExhaustionDragOverride` + `getEnableExhaustionDrag`/`setEnableExhaustionDrag`/`resetEnableExhaustionDrag`. **Verify:** `tsc --noEmit` clean.

**Step 2 — add the drag constants + import the band helper** in `plan.ts`: `import { recoveredExhaustionLevel, WAR_WEARINESS_BAND_THRESHOLDS } from '../../../state/war_weariness_bands.js';` (path confirmed: `plan.ts` already imports `game_state`/`validateGameState` via `'../../../state/…'` at `plan.ts:37-38`, so `../../../state/war_weariness_bands.js` is correct). Define `DRAG_FLOOR = 0.55`, `DRAG_RAMP_START = WAR_WEARINESS_BAND_THRESHOLDS.cracking` (65), `DRAG_RAMP_FULL = WAR_WEARINESS_BAND_THRESHOLDS.collapsing` (85). **Verify:** `tsc --noEmit` clean.

**Step 3 — replace the `factionExhaustionDrag` body** (`plan.ts:279-282`) with the flag-gated branch from §3: ON = §2 ramp on `recoveredExhaustionLevel(briefing.faction_war_exhaustion)`; OFF = the EXACT legacy `max(0.3, 1.0 - briefing.faction_war_exhaustion / 600)`. Do not touch `exhaustionPenalty` (line 283) or the intent-score wiring (lines 452/476). **Verify:** `tsc --noEmit` + the existing `tests/commander/*` and `tests/combat_exhaustion.test.ts` pass with flag OFF (default).

**Step 4 — add a unit test** (`tests/commander/exhaustion_drag.test.ts`): (a) flag OFF → `factionExhaustionDrag` equals the legacy expression for several raw values (byte-identity proof at the unit level); (b) flag ON → 1.0 below recovered 65, linear ramp, 0.55 floor at/above 85; (c) determinism (same input → same output). **Verify:** `npm run test:vitest` green.

**Step 5 — smoke triad.** `tsc --noEmit` + `vitest run` + `desktop:map:build`. **Verify:** all green.

**Step 6 — byte-identical OFF baselines.** Run 40w + 188w with flag OFF; confirm hashes match the current floor (`be76e56dd9d288c2` / `5f57d17287b87dfb`, 649). **Verify:** byte-identical. If not, STOP and fix the legacy branch.

**Step 7 — 188w ON run + diff.** Flip the flag ON via env/test harness (same mechanism as `setEnablePhase3C`); run 188w; diff territory + control_delta vs Step-6 OFF. Record the territory delta. **Verify:** §6 G2 gate (Srebrenica/Žepa fall), 30/30 anchors, Sana-follow-on/Ključ watch.

**Step 8 — wire the activation flag** (only after Step 7 looks good): add the env/scenario flag that flips `setEnableExhaustionDrag(true)` for the activated calibration build (mirror how `ENABLE_COLLAPSE`/Phase 3C are flipped). Keep default OFF.

**Step 9 — re-floor + ledger.** scenario-tester + calibration panel sign off; owner-signed re-floor of 40w/188w. Append behavioral change to `docs/PROJECT_LEDGER.md`; update `CALIBRATION_MASTER.md` floor + MEMORY floor entry. Propagate the constant to COMBAT_MASTER (P11/exhaustion row).

---

## FINAL

- **Recommended attach point (one line):** `src/sim/combat/commander/plan.ts:279` — re-scale the existing degenerate `factionExhaustionDrag` (op-launch willingness, faction-scoped, offense-only) onto the recovered-0..100 `war_exhaustion` scale behind a default-off flag.
- **Drag function (one line):** `level = war_exhaustion[fid]/100; drag = level≤65 ? 1.0 : level≥85 ? 0.55 : 1.0 − ((level−65)/20)·0.45` (floor 0.55, ramp cracking→collapsing, symmetric across factions, deterministic).
- **§6 verdict (incl rupture-op-suppression check):** SAFE. Faction-scalar, intent-layer only, never enters `attack_resolution_osid.ts`, no per-OSID write → G1 untouched, G2 independent. Rupture-op check: **the Srebrenica/Žepa ops are triggered operations (`triggered_operations.ts`), NOT bot-intent ops — they never route through the dragged `stage_operation`/`launch_opportunity` intent scoring, so the drag CANNOT suppress them.** They are structurally exempt; the re-floor still verifies they fall as a regression backstop.
- **Expected floor direction:** floor-MOVING, late-war only (≥ mid-1993). Likely thins late-war RS/HRHB opportunistic over-advances *toward* history (floor-neutral-to-positive); primary regression watch = the marginal Sana-follow-on/Ključ `launch_opportunity` cluster.
- **Est LOC:** ~40–70 (flag scaffold ~12 + constants/import ~5 + gated drag body ~10 + unit test ~30). Net new combat/wiring code beyond the test is ~25 LOC — the consumer wiring already exists at `plan.ts:283,452,476`.

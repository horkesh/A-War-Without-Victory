# Teočak Salient Remodel — Scoping Doc (READ-ONLY)

**Date:** 2026-06-10
**Status:** Proposal / scope only. NOT implemented. Owner/panel-gated calibration lane.
**Companion change:** the comment/citation correction in `src/sim/combat/enclave_resilience.ts`
(the Teočak definition comment + the `ENCLAVE_CONFIG.teocak` inline comment) — that change is
**comment-only and calibration-inert** and lands now. THIS doc scopes the deferred, calibration-coupled
mechanic remodel.

---

## 1. Finding

`op:ugljevik:teocak_krstac_2` (Teočak) is currently modeled in
`src/sim/combat/enclave_resilience.ts` as a singleton **isolated enclave** (`id: 'teocak'`,
ENCLAVE_DEFINITIONS entry at L116; `ENCLAVE_CONFIG.teocak` at L235) with a comment that called it
"small, isolated, surrounded by VRS… Mechanically analogous to Žepa" and cited "(BB1 p.509)".

Two investigators (2026-06-10) established this is **topologically and historically wrong**:

- **Topology (in-game):** Teočak is the **tip of the ARBiH-held Sapna salient**, CONNECTED to the
  ~81-OSID RBiH (2nd Corps / Tuzla) component. The in-game BFS reaches it via
  `op:zvornik:rastosnica_2 → op:kalesija:… → op:tuzla:…`. The bridge OSID `op:zvornik:rastosnica_2`
  is painted **RBiH by the scenario `osid_control_overrides`** — verified in
  `data/scenarios/apr1992_definitive_188w.json:26` (and the 40w/52w/104w/156w/dayton_close variants).
  It is a deliberate corridor bridge, not an island.
- **History:** the 255th Slavna ("Hajrudin Mesić") Mountain Brigade was a **brigade of the 25th Division
  (HQ Tuzla)**, reinforced overland from the divisional pool — **BB1 p.439 fn.141**. It was a reinforced
  salient tip, not a surrounded Drina enclave like Žepa.
- **Miscitation:** the prior "(BB1 p.509)" is an OOB table that says nothing about isolation. The narrative
  is p.439. The Žepa analogy does not hold.

## 2. Why the enclave entry exists anyway (load-bearing pin)

The entry was added as a **calibration pin**, not on its merits. Per
`tests/teocak_enclave_singleton.test.ts` (file header): after the headless `player_faction` default change
(commit `04c750e3`), Teočak regressed from RBiH-held to RS-captured at 188w. The singleton enclave entry
was introduced to re-pin the Teočak 30/30 anchor by granting the lone defender resilience, a defense bonus,
and capital-OSID garrison concentration.

So **naively deleting the entry would likely drop the anchor.** That is exactly why the companion change is
comment-only and the mechanic remodel is deferred to this gated lane.

## 3. What the enclave bonuses actually grant Teočak (read-only audit, file:line)

The `id:'teocak'` entry + `ENCLAVE_CONFIG.teocak` ({ max_resilience: 20, growth_mult: 0.30,
max_personnel: 400 }) feed five consumer channels:

| # | Mechanic | Source (enclave_resilience.ts) | Consumer | Effect on Teočak | Load-bearing? |
|---|----------|-------------------------------|----------|------------------|----------------|
| 1 | **Defense multiplier** `1.0 + resilience×0.02` (hardening ×1.x) | `getEnclaveDefenseBonus` L420–432 | `combat_math.ts:1486` (`enclaveMult`) | Multiplies the defender's combat power at the Teočak OSID. At resilience 20 ≈ **1.40×**. | **LIKELY PRIMARY** — directly raises the contested-OSID defense in the assault that regressed it. |
| 2 | **Garrison raw power** (pop × mobilization × effectiveness × resilienceMult × **capitalMult 2.0**) | `getEnclaveGarrisonPower` L474–495; `CAPITAL_GARRISON_MULT = 2.0` L67 | `attack_resolution_osid.ts:762`, `combat_predictor.ts:460` | Adds raw garrison defense power; Teočak IS its own capital, so it gets the **2.0×** capital concentration. | **LIKELY SECONDARY** — adds a flat defender floor; capital-mult doubles it. |
| 3 | **Capital retreat magnet** | `getEnclaveCapitalOsid` L502–509 | `attack_retreat_displacement.ts:173` | Retreating enclave brigades prefer the capital OSID. Singleton → self; near-inert (no other OSID to fall back from). | **NO** (singleton). |
| 4 | **Max-personnel cap 400** | `getEnclaveMaxPersonnel` L559+ | `formation_spawn.ts:443` | Caps spawned enclave-formation personnel at 400 (vs default `ENCLAVE_MAX_PERSONNEL`). This is a CAP, i.e. it limits Teočak, not a buff. | **NO** (a ceiling, not a prop). |
| 5 | **Faction-wide exhaustion reduction** | `getMaxEnclaveResilienceForFaction` L771–782 | `exhaustion.ts:110` (`enclaveReduction = resilience × RESILIENCE_EFFECT_SCALE`) | Returns the **MAX** resilience across ALL RBiH enclaves. Sarajevo (max 45) and Bihać (40) dominate; Teočak's 20 never wins the max. | **NO** — Teočak contributes nothing here while Sarajevo/Bihać exist. |

**Conclusion of audit:** the load-bearing channels are the **local combat ones — (1) defense multiplier and
(2) capital garrison power (with the 2.0 capital mult).** Channels (3)/(4)/(5) are inert, a ceiling, or
dominated. The remodel only has to reproduce (1)+(2)'s defensive effect through *ordinary* mechanics over
corridor supply.

## 4. Does corridor-supply already feed Teočak today?

**Yes, structurally.** Supply reachability is a generic BFS over **faction-controlled OSIDs** on the contact
graph — `src/state/supply_reachability_osid.ts` (header L1–17: "BFS from faction supply sources over OSID
graph (faction-controlled OSIDs only)") calling `runSupplyBfs` in `src/state/supply_reachability.ts`. There
is **no Teočak/rastosnica hardcoding** (grep of the supply files returns nothing). Because `rastosnica_2`
is painted RBiH, Teočak is in the same controlled component as Tuzla and is therefore **supply-reachable**
as long as the corridor OSIDs stay RBiH-controlled. The collapse/isolation BFS likewise already sees it as
connected — which is why §6 (enclave-guard) is **unaffected** by removing the enclave entry: the BFS never
considered Teočak isolated.

So Teočak does NOT need enclave-resilience to be *supplied*. What the enclave entry is currently buying is
**extra defensive combat power at the OSID** (channels 1+2), which today happens to come from the
isolation-bonus machinery rather than from ordinary garrison/terrain/defense.

## 5. Proper fix (the remodel to validate)

Replace the Žepa-class enclave-resilience treatment with **ordinary hold-over-corridor mechanics**:

1. **Remove (or neutralize) the `id:'teocak'` enclave entry + `ENCLAVE_CONFIG.teocak`.**
2. Hold Teočak via **corridor supply** (already works, §4) + **ordinary garrison/defense** — i.e. a normal
   defended salient tip, with whatever standard defender power/terrain the OSID has, NOT enclave isolation
   bonuses.
3. If that under-defends the OSID (anchor regresses), the deficit is the *honest* one: the salient's
   ordinary defense is too thin, or the corridor-supply benefit is not actually translating into holding
   power. That points the fix at the **garrison/defense or corridor-supply mechanic itself**, not at a
   fake-isolation pin.

## 6. Calibration experiment (one-change-per-run)

Per the sacred "one change per calibration run" rule:

1. Baseline: confirm current 188w floor (anchors 30/30, Teočak = RBiH) against the current floor hash of
   record (see `docs/40_reports/CALIBRATION_MASTER.md` — currently 188w 649/`5f57d17287b87dfb`).
2. **Single change:** remove/replace the Teočak enclave entry (step 5.1–5.2).
3. Run **188w** (the un-gated horizon where this anchor lives — 40w + CI green is a known false-green for
   late-war corridor behavior).
4. **Pass criteria:** Teočak still resolves **RBiH** via corridor supply + ordinary garrison; anchors hold
   30/30; control_delta unchanged elsewhere; scenario-tester GO; §6 unaffected (BFS already sees it
   connected, so no enclave-guard surface moves).
5. **Risk / fallback:** if Teočak regresses to RS, the corridor-supply → holding-power translation is the
   real gap. Then sequence a **prior** sub-lane that strengthens ordinary corridor-fed garrison/defense
   (e.g. a corridor-supply defense contribution, or 255th/25th-Division garrison weighting at the salient
   tip) BEFORE retrying the enclave-entry removal. Do not re-pin via fake isolation.

This lane **can move the anchor**, so it is owner/panel-gated and must run serially against a clean floor.

## 7. Follow-up SWEEP — are the OTHER enclave entries topologically correct?

The Teočak finding suggests an audit of every `ENCLAVE_DEFINITIONS` entry: is each one *genuinely isolated*
(no RBiH/HRHB-painted corridor bridging it to the main landmass), or is it — like Teočak — a connected
salient mis-modeled as an island? Flag (do NOT deep-investigate here):

| Entry | Prior expectation | Check needed |
|-------|-------------------|--------------|
| `srebrenica` | Genuine island (surrounded Drina enclave, fell 1995) | Likely correct — verify no painted corridor bridge. |
| `zepa` | Genuine island (surrounded, fell 1995) | Likely correct — verify. |
| `gorazde` | Genuine island most of the war (besieged) | Mostly correct; verify the glamoc/kamen/sopotnica "approach" OSIDs don't quietly bridge it. |
| `bihac_pocket` | Genuine island (cut off, Bihać pocket) | Likely correct — verify no painted bridge through Velika Kladuša/RS lines. |
| `sarajevo` | Besieged but tunnel-supplied | Special-cased (SENSITIVE_HISTORY gate); engine geometry, not author-tunable — leave to that gate. |
| `kiseljak` | HVO pocket (Fojnica corridor severed) | **CHECK** — was it bridged to the Lašva/HVO landmass at any horizon? |
| `lasva_valley` | HVO command hub | **CHECK** — Vitez/Busovača connectivity to Kiseljak / wider HVO. |
| `zepce` | "isolated northern HVO pocket" | **CHECK** — northern Žepče connectivity (it had intermittent overland links). |

Highest suspicion for the same "connected salient as island" error: **zepce, kiseljak, lasva_valley**
(the HVO pockets, whose connectivity shifted with the corridor). Srebrenica/Žepa/Bihać/Goražde are the
strongest genuine-island candidates. This is a flag for a future read-only sweep, not part of this lane.

## 8. Conclusion / recommendation

- **Part A (comment/citation correction):** lands now — comment-only, calibration-inert, anchor untouched,
  test green. It removes a false "isolated like Žepa / BB1 p.509" framing and records the truth
  (connected Sapna salient, corridor bridge `rastosnica_2`, 255th Slavna of 25th Div, BB1 p.439 fn.141) plus
  an explicit CALIBRATION-PIN caveat.
- **Part B (this remodel):** an **owner/panel-gated calibration lane** — it can move the Teočak 188w anchor.

**Recommendation:** land Part A now; schedule Part B as a single-change 188w lane (remove enclave entry →
hold via corridor supply + ordinary garrison), with the corridor-supply/garrison-strength fallback queued
first if the anchor regresses.

# Unheld encircled pockets: owner playtest diagnosis (2026-11-14)

**Status:** diagnosis only. No engine or data change. Owner-diagnosis slot, assigned by the orchestrator.
**Trigger:** owner playtest, RBiH, desktop app, 21 Nov 1994 (turn ~137): *"What are those surrounded
OSIDs in western BiH? From what I can see, they are surrounded by RS and have no units holding them."*

## 1. Short answer

- **What they are.** Small RBiH and HVO islands from the April 1992 start map. They sit around Jajce,
  Donji Vakuf and Travnik/Vlašić, plus one at Arapuša (Bosanska Krupa) just east of Cazin. No brigade
  was ever placed in them. Historically they were all gone by late 1992.
- **Why they survive.** After week 20 the engine has exactly one way to take such a pocket: a named
  operation that lists it as an objective. In headless main those operations (Greben, Jajce, Donji
  Vakuf, Obruč, Sjever, Stjena, Topola) fire on schedule and clear every one by turn 37. In the
  owner's live game at least one of them evidently did not, and nothing else ever looks at the
  pocket again:
  - paramilitary rear-pocket cleanup stops at week 20;
  - passive rear-pocket consolidation was deliberately removed on 2026-09-02 (operations-only control rule);
  - probes may win battles there but cannot capture;
  - no bot corps logic targets enemy pockets after week 20.
- **Fix (proposed, not built).** An emergent, generic **pocket-reduction CorpsOperation**. When a
  corps has an undefended enemy pocket of at most 6 cells inside its own ground, and has a brigade
  adjacent to it, the bot may raise an ordinary operation against it. The pocket is then taken by the
  normal battle resolver. No ownership writes, no scripted captures, no init-control overrides.
- **Cost.** Headless calibration effect is expected to be neutral to slightly positive (+0 to +3,
  Oct95), because the authored 1992 operations already clear these pockets on time. The real gain
  is robustness of live play.

## 2. Reproduction (headless, current main)

- Run: `npm run sim:scenario:run:188w` on `e07847268` (#600). Final hash `53ffe8e9545686ad`.
- `node tools/verify_checkpoints.cjs <run> --base jan=712,apr94=709,apr95=710,oct=705` gives
  **712 / 709 / 710 / 705, NET +0**, and the enclave guard holds. This is the current main reference.
- Census method (scratch script; not committed):
  - replay `political.control_events` over `initial_political_controllers` for every turn;
  - per faction, take connected components on `operational_contact_graph.json`; every component
    other than the faction's largest is a pocket;
  - check `brigade_temporal_log.jsonl` for any active formation of the pocket's own faction inside it.

| Turn | Pockets | Unheld pockets | Unheld OSIDs |
|---|---|---|---|
| 1 | 56 | 35 | 56 |
| 10 | 34 | 18 | 32 |
| 26 | 20 | 9 | 15 |
| 39 | 14 | 4 | 9 |
| 104 | 9 | 0 | 0 |
| 135 (≈ owner's date) | 9 | **0** | 0 |
| 156 | 9 | 0 | 0 |
| 188 | 9 | 2 | 3 |

At turn 135, headless main has **no** unheld pocket anywhere. Its 9 pockets all hold their own
brigades: Bihać, Sarajevo core, Goražde, Srebrenica, Žepa, Vitez–Busovača, Kiseljak–Kreševo,
Orašje and Žepče. **The owner's map is a live-play divergence, not the headless baseline.**

### 2.1 Locating the owner's pockets

No owner save is reachable from this machine (the repo `saves/` and app-data directories hold
nothing after 6 Nov). The screenshot was therefore georeferenced instead:

- an affine fit from 7 labelled towns (Bihać, Cazin, Velika Kladuša, Prijedor, Sanski Most, Banja
  Luka, Bosanska Gradiška) to OSID centroids, with residuals of about 20 px;
- each blob's centre was then matched to the nearest cells.

| Blob in screenshot | Nearest cells (distance px) | Start controller |
|---|---|---|
| upper grey (dashed) | `jajce:divicani_2` (14), `jajce:lupnica`, `jajce:barevo_2` | HRHB |
| lower grey (dashed) | `travnik:gornje_krcevine` (19), `jajce:grdovo` (36) | RBiH / RS |
| lower green (dashed) | `donji_vakuf:torlakovac_2` (13), `jajce:vinac_2` (34) | RBiH |
| green east of Cazin | `bosanska_krupa:arapusa_2` (14) | RBiH |

So the pockets are **not** at Kotor Varoš. In every run, Kotor Varoš falls at turn 13 to the
triggered Operation Kotor Varoš. The owner's islands are the Jajce / Donji Vakuf / Vlašić cluster
and Arapuša, all of them April 1992 initial-control remnants.

### 2.2 How each of these falls in headless main

| Cell | Start | Unheld pocket | Falls | Operation |
|---|---|---|---|---|
| bosanska_krupa:arapusa_2 | RBiH | t0–t19 | t20 → RS | Operacija Greben (2KK). Probes won at t8 and t14 but cannot capture. |
| jajce:divicani_2 | HRHB | t0–t23 | t24 → RS | Operation Jajce (1KK) |
| jajce:kruscica / jajce_3 / vinac_2 / barevo_2 | RBiH / HRHB | t0–t25 | t23–t26 | Operation Jajce |
| sipovo:volari_2 | RBiH | t0–t26 | t27 | Operacija Obruč |
| donji_vakuf:torlakovac_2 | RBiH | t0–t28 | t29 | Operation Donji Vakuf |
| skender_vakuf:donji_koricani | HRHB | t0–t28 | t29 | Operation Donji Vakuf |
| travnik:gornje_krcevine | RBiH | t0–t30 | t31 | Operation Donji Vakuf, Vlašić axis |
| jajce:jezero_2 / jajce:lupnica | RBiH / HRHB | t0–t32 | t33 | Operacija Sjever / Stjena |
| mrkonjic_grad:baljvine_2 | HRHB | t0–t36 | t37 | Operacija Topola |

**Whole map:**
- Every OSID that sat in an unheld pocket after week 20 left that state through a named operation:
  **39 of 39**, and **0** by any other mechanism.
- The only pockets still unheld at turn 188 are three RS cells left behind by the 1995 offensives:
  `donji_vakuf:korenici`, `donji_vakuf:jemanlici` and `travnik:varosluk`. All three are surrounded
  by RBiH, painted RBiH, and therefore **3 of today's 7 Oct95 misses**.

## 3. Why a pocket can survive forever (writers and readers, checked)

`node tools/hooks/whowrites.mjs control_events` lists the writers. The per-turn ones are:

- attack resolution and sector offensive (battle and operation results);
- JNA phantom brigades;
- event effects;
- the paramilitary sweep;
- early-war control flips.

`rear_pocket_consolidation.ts` still writes control, but nothing calls it: its only callers are tests.

| Path that could clear an unheld pocket | Status today | Evidence |
|---|---|---|
| Paramilitary rear-pocket sweep | Weeks 0–20 only (`PARAMILITARY_FADE_WEEK`). It needs a pocket surrounded by **one** faction, no adjacent organized defender, and sufficient penetration. Mixed RS/HRHB/RBiH rings (all of the Jajce cluster) are never flagged: `engine_flag` = 0 turns for the Jajce pockets. | `paramilitary_sweep.ts:471-502`; `osid_graph_analysis.ts:462-536` |
| `graphAnalysis.enemy_pockets` | Consumed **only** by the paramilitary sweep. No bot or corps reader exists. | `grep "\.enemy_pockets" src/sim` → `paramilitary_sweep.ts:471` alone |
| Passive rear-pocket consolidation / "abandoned" | **Removed from the pipeline on 2026-09-02** (commit `80d87aac1`, "require operations for strategic control"). The War Spec rule is that control changes only through attacks or operations. The Systems Manual says: *"After week 20 there is no passive rear-pocket control transfer."* The trigger was the Brčko city auto-flip. | `war_phases.ts` diff in `80d87aac1`; ledger entry of 2026-09-02 |
| Probes | Win battles but cannot capture (owner rule). | Arapuša t8 and t14 probe wins with no flip |
| Enclave collapse / surrender | Applies only to the 9 named enclaves (H1.8; event-owned). | `enclave_resilience.ts` |
| Displacement guard | Concerns brigade retreat on a flip, not control. | memory `displacement_guard` |
| Consolidation sweep | Default OFF; a declared railroad per the §6 panel. Not a candidate. | `20260825_CONSOLIDATION_SWEEP_MECHANISM.md` |
| Named operations | The **only** live path after week 20. | §2.2 |

So the pocket's survival is not a hidden holdout mechanic. These are pre-1992 initial-control cells
that only a scheduled authored operation will ever touch. If the authored chain slips in live play
(a cancelled or failed Jajce or Donji Vakuf operation, a diverted brigade, a different event
choice), the cell stays on the map for the rest of the war, with no troops and no front activity.
Live-versus-headless differences come from player choices (memory `live_parity_pause_before_combat`:
parity was proven through w104 only under the `bot_equivalent` event policy).

<!-- EXPERT SECTIONS BELOW -->

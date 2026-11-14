# Unheld encircled pockets: owner playtest diagnosis (2026-11-14)

**Status:** diagnosis only. No engine or data change. Owner-diagnosis slot, assigned by the orchestrator.
**Trigger:** owner playtest, RBiH, desktop app, 21 Nov 1994 (turn ~137): *"What are those surrounded
OSIDs in western BiH? From what I can see, they are surrounded by RS and have no units holding them."*

## 1. Short answer

- **What they are.** Small RBiH and HVO islands from the April 1992 start map. They sit around Jajce,
  Donji Vakuf and Travnik/Vlašić, plus one at Arapuša (Bosanska Krupa) just east of Cazin. No brigade
  was ever placed in them. Historically they were all gone by late 1992.
- **Why they survive.** After week 20 the only way to take such a pocket is an operation. That can
  be an authored one (Jajce, Donji Vakuf) or a narrowly gated bot commander operation (named Greben,
  Obruč, Sjever, Stjena, Topola; see §3.1). In headless main these fire and clear every pocket by
  turn 37. In the owner's live game they evidently did not, and nothing else ever looks at the
  pocket again:
  - paramilitary rear-pocket cleanup stops at week 20;
  - passive rear-pocket consolidation was deliberately removed on 2026-09-02 (operations-only control rule);
  - probes may win battles there but cannot capture;
  - the only bot path, commander local occupation, needs a surplus brigade already adjacent and
    good intel, rejects rings containing a third-party cell, and is switched off for every faction
    at autonomy level 1.
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

### 3.1 Correction from the operations seat: the bot path exists, but it is narrow

Of the operation names in §2.2, only **Operation Jajce** and **Operation Donji Vakuf** are authored
(`pre_planned_operations.ts:1048-1203`). **Greben, Obruč, Sjever, Stjena and Topola** are names from
the bot name pool (`operation_names.ts:69-121`, assigned via `pickOperationName`). They are
commander operations the RS bot generated itself, so after week 20 there **is** an emergent path:
commander *local occupation* (`commander/emit.ts:754-1200`, turn > 20) and opportunity plans with
purpose `reduce_isolated_position` (`commander/plan.ts:1680`). That path is narrow and easily missed:

- It runs only if no other operation was emitted that turn, the surplus pool is not empty, initiative
  is above 0.3 and a slot is free (`emit.ts:2853-2859`).
- It needs a **surplus brigade already adjacent** to the target (`emit.ts:835-841, 897-910`).
  Rear pockets usually have none nearby.
- Low intel rejects the candidate (`emit.ts:885-895`) and the bot falls back to a generic probe,
  **which cannot capture**. This matches the Arapuša pattern of probe wins with no flip.
- `isBoundedIsolatedEnemyPosition` (`plan.ts:1581-1655`) refuses three kinds of pocket:
  - pockets larger than 6 cells;
  - pockets touching a patron border;
  - **pockets with any third-party cell in the ring.** The mixed RS/HRHB/RBiH rings around Jajce
    and Vlašić fail here whenever RBiH and HRHB are not allied. The ring-share test counts the
    whole faction, not the corps.
- **Autonomy level 1** holds *every* corps commander plan at "ready", bots included (no faction check
  at `commander_loop.ts:276-299`), and turns local occupation off for all factions (`emit.ts:777`).
  New live games default to level 2 (`desktop_sim.ts:412`). **If the owner plays at autonomy 1,
  the RS bot never generates these mop-up operations, which alone would explain the divergence.**
  Logged as an out-of-scope finding (§8).
- Authored chain behaviour (`corps_operation_helpers.ts:270-272`; `pre_planned_operations.ts:2127-2138, 3089-3108`):
  - The queue advances on *any* ending, so Donji Vakuf fires even if Jajce fails.
  - A resolved operation is never retried, so a Divičani objective that failed is never re-attempted.
  - An operation that falls below its viable-participant floor stays at the queue head and blocks
    everything behind it. The Vlašić axis also needs both of its brigades to move up
    (`minimum_forward_brigades: 2`).

So "39 of 39 by operation" (§2.2) splits into authored operations plus bot-generated commander
operations. In headless main the bot path happens to fire. In live play (a stronger human defence
of Jajce, a lost shared brigade, a different autonomy level, a ring with an HRHB cell) it can miss
every turn, and then nothing else ever looks at the pocket.

### 3.2 Sector seat: the pocket is a real front, and two anomaly checks hide it

- The pocket's ring is a real front. Every shared boundary becomes a front edge
  (`src/map/front_edges.ts:120-127`), and the surrounding corps gets a separate ring sector that is
  not merged back (`corps_front_sectors.ts:3438-3449`). It is folded into a staffed sibling
  (`:1486-1519`) or gets a minimum-cover brigade (`brigade_assignment.ts:1559`). **Empty pockets
  therefore lengthen the surrounding corps' front and lower its density.** Structurally certain;
  not yet measured.
- The pocket's controller gets a brigade-less sector flagged `unstaffed_front = true`
  (`corps_front_sectors.ts:1293, 1435`). Under #577 it must never be shown as an OG.
- **Anomaly checks #8 and #19 skip `unstaffed_front` sectors** (`src/scenario/anomaly_detector.ts:545, 1283`).
  So the harness never reports a brigade-less pocket.
- Clearing an undefended pocket of at most 6 cells through an ordinary CorpsOperation breaks no
  sector invariant. It fills a hole, and the next partition prunes the ring sector
  (`corps_front_sectors.ts:3991-3993`). Watch for cached `sector_id`s on the operation.
- RBiH–HRHB pockets have **no front at all** while the two are allied (`front_edges.ts:128-134`).
- `createPocketContainmentSectors` (`sector_rearrangement.ts:213`) and `evaluateCorpsOffensiveLaunch`
  (imported at `bot_corps_directives.ts:54`) are dead code. Both are logged in §8.

## 4. Painted checkpoints: matched in headless, missed in the owner's game

`cells` replay of the reference run against the current painted files:

| Cell | Start | Jan93 | Apr94 | Apr95 | Oct95 | If it stays at its start controller |
|---|---|---|---|---|---|---|
| bosanska_krupa:arapusa_2 | RBiH | RS ok | RS ok | RS ok | RBiH ok | miss Jan93, Apr94, Apr95 |
| donji_vakuf:torlakovac_2 | RBiH | RS ok | RS ok | RS ok | RBiH ok | miss Jan93, Apr94, Apr95 |
| jajce:divicani_2 | HRHB | RS ok | RS ok | RS ok | RS ok | miss at all four |
| travnik:gornje_krcevine | RBiH | RS ok | RS ok | RBiH ok | RBiH ok | miss Jan93, Apr94 |
| skender_vakuf:donji_koricani | HRHB | RS ok | RS ok | RS ok | RS ok | miss at all four |
| kotor_varos:kotor_varos_2 | HRHB | RS ok | RS ok | RS ok | RS ok | miss at all four |
| donji_vakuf:korenici | RBiH | RS ok | RS ok | RS ok | **RS MISS** (ref RBiH) | unheld RS pocket from t187 |
| donji_vakuf:jemanlici | RS | RS ok | RS ok | RS ok | **RS MISS** (ref RBiH) | unheld RS pocket from t187 |
| travnik:varosluk | RS | RS ok | RS ok | RS ok | **RS MISS** (ref RBiH) | unheld RS pocket from t181 |

- **Headless.** The 1992 pocket cells are all matched, and honestly so: real combat inside
  operations, not ownership writes.
- **Matched only by timing?** Yes. The match depends on one authored or bot operation firing in its
  window. There is no backstop if it doesn't, so the match is fragile, though not "bought by a defect".
- **Owner's game.** Each surviving pocket costs 2 to 4 checkpoint cells.
- **Oct95.** The three unheld RS pockets are a measured defect today: 3 of the 7 Oct95 misses.

## 5. Historian (BB first; ICTY where available in the repo)

The knowledge base has no village-level entry for Divičani, Grdovo, Torlakovac, Arapuša, Korenići,
Jemanlići or Varošluk, so these findings are at municipality and enclave level.

- **Jajce.** The joint HVO/TO salient was reduced in stages. VRS troops entered the town on
  **29 Oct 1992** and about 40,000 people fled to Travnik (BB1 p.147-148). Nothing held on afterwards.
- **Donji Vakuf.** Serb-held from 1992 until **13 Sept 1995** (BB1 p.381-382). The ARBiH front lay
  south, around Prusac and Bugojno (BB2 p.468).
- **Bosanska Krupa.** Serbs took most of the town on 21-23 Apr 1992. Muslim forces kept only the
  hills within about 1 km, attached to the Bihać pocket (BB1 p.149). That supports a cell attached
  to the pocket, not an island.
- **Kotor Varoš / Večići.** Held out as an armed pocket until early **Nov 1992**, then left in a
  negotiated or break-out column (ICTY *Brđanin* TJ, Kotor Varoš section; paragraph number not
  verified). The owner's date is right.
- **By Nov 1994** no RBiH or HVO island existed in the 1st/2nd Krajina Corps rear. The 1994 orders
  of battle show continuous fronts (BB1 p.419-420; BB2 p.468, 493).
- **How islands ended:**
  - by assault (Jajce);
  - by evacuation under fire (Krupa, armed holdouts lasting "several more days");
  - by a negotiated exit (Večići).
  - Islands without troops lasted **days to weeks**. Only defended, UN-protected enclaves persisted.
- **Sept 1995.** The VRS gave up Donji Vakuf and pulled back "to avoid envelopment", with the
  population leaving alongside (BB1 p.382). Isolated Serb cells such as Korenići, Jemanlići and
  Varošluk should be absorbed within days.
- **Would a historically literate player notice?** **Yes.** An empty RBiH or HVO island near Jajce
  in late 1994 contradicts the best-known 1992 outcome.

This clears RF entry test 4b(b) (a fidelity gap the historian says a literate player would notice)
and 4b(c) (measured premise: the census, plus 3 Oct95 misses).

## 6. Proposed fix (not built; for the orchestrator's ruling)

**Extend commander local occupation with a `pocket_reduction` candidate class. Do not add a new
operation type and do not touch ownership.**

1. **Seed** candidates from `graphAnalysis.enemy_pockets` (`osid_graph_analysis.ts:462-535`). Those
   cells are already undefended, surrounded and size-capped (≤ 6). Thread the list into
   `CommanderBriefing`.
2. **Staging.** Allow a surplus *or* stationary sector brigade within N friendly hops to stage on an
   adjacent friendly cell. The group path already projects staging (`emit.ts:1035-1100`).
3. **No probe** for a cell that is in `enemy_pockets` and also passes
   `defender_has_no_reachable_brigade` (`emit.ts:973`): there is nothing to find.
4. **Mixed rings.** Let the ring test count co-belligerent neighbours, and exclude pockets that touch
   an *active* bilateral front, so RBiH↔HRHB territory stays operation-earned
   (`isRbihHrhbCombatBlocked`).
5. **Guards:**
   - explicit enclave and safe-area exclusion (`enclave_resilience.ts` registry; reuse
     `shouldProtectRearPocketClusterFromEnclave`);
   - defended pockets (Orašje, Žepče, Vitez, Kiseljak) are excluded by the organized-defence check;
   - control changes only in battle resolution, via `buildCommanderOperation` → CorpsOperation.
6. **Instrumentation (no calibration effect, can ship first).** Stop skipping `unstaffed_front`
   pocket sectors in anomaly checks #8 and #19. Add a "brigade-less pocket older than N turns"
   anomaly, so the harness reports this class of defect.

**Not proposed:**
- re-enabling `consolidateRearPockets` (canon operations-only rule, Brčko precedent);
- the consolidation sweep (declared railroad);
- any event `control_change`;
- any init-control edit.

**Estimated calibration effect (headless):**
- Jan93 / Apr94 / Apr95: about **±0**. The 1992 pockets are already cleared by turn 37 through the
  same kind of operation; the risk is that an earlier flip changes brigade allocation elsewhere.
- Oct95: **+0 to +3**, if the Korenići, Jemanlići and Varošluk pockets are reduced in t181-188.
- The tail is a knife-edge (memory `serial_axis_tail_knife_edge`), so needs a 188w validation and the
  Žepa↔Teočak and Western-Bosnia cascade checks (`verify_checkpoints.cjs`).
- **Live:** removes the whole class of permanent empty islands the owner reported.

**Lane.** Calibration-moving. It meets RF entry (a) (the post-week-20 pocket path effectively never
fires for mixed rings or rear pockets), (b) and (c). It belongs with **RF-AI2** (corps AI gating,
`bot_corps_stance` / commander) as a follow-on, or as its own RF slot after AI2 merges, because both
touch commander eligibility. Calibration WIP is full (3/3), so it is queued, not started. The
instrumentation item (6) is non-calibration and can go to an N-lane now.

## 7. UI clarity: what the owner is looking at

- **Pink areas are ordinary RS-held ground the player can currently see.**
  - The RS control wash `rgba(151,57,54,0.34)` (`awwv_map_style.json:236-254`) reads pink on paper.
  - Dark brown is the same RS ground under the fog layer, `rgba(40,30,20,0.38)`
    (`MapContainer.tsx:2750-2767`, `buildFogOfWarGeoJSON.ts:22-33`).
  - So pink means "enemy, observed"; brown means "enemy, not observed".
  - In political mode a second red "pressure" band (`buildContestedBandsGeoJSON.ts:123-145`) can
    add to the pink.
- **"EN" chips are enemy contacts.** They are unidentified enemy formations seen through fog, with
  identity stripped.
  - The text is the first two letters of the marker kind `enemy_contact`, taken from a generic
    fallback (`formationIcons.ts:62-68`, `buildFormationsGeoJSON.ts:118,138-139`). There is no i18n
    key, so BCS players also see "EN".
  - Tooltip: "Enemy contact".
- **The dashed green outline around Bihać** is the enclave layer (`MapContainer.tsx:2769-2804`).
  Dashed rings around small pockets are the front-line stripe (`awwv_map_style.json:683-716`).
  Grey fill is the HRHB faction wash. No cell in the reference run is uncontrolled at t0 or t188.
- **No legend entry** explains fog, pressure bands, enclave outlines or the "EN" chip
  (`MapModeLegend.tsx:58-106`).
- **The owner read the map correctly:** the pockets really are empty and RS-surrounded. But the
  "EN" chip and pink-versus-brown are unexplained.
- **UI finding (non-calibration, small):**
  - give `enemy_contact` a real icon or a translated short label;
  - add legend rows for "Enemy, observed", "Enemy, not observed (fog)", "Enemy contact" and
    "Enclave".
  - Owner: the UI lane that owns the map legend (not the event-modal lane).

## 8. Out-of-scope findings (for the register)

1. **Autonomy level 1 freezes bot commanders.** `commander_loop.ts:276-299` has no faction check,
   and `emit.ts:777` disables local occupation for all factions. A player autonomy setting changes
   bot behaviour. Correctness defect; candidate RF; needs a measured run at autonomy 1 versus 2.
2. **Anomaly checks #8 and #19 skip `unstaffed_front`** (`anomaly_detector.ts:545, 1283`), so
   brigade-less pockets are invisible to the harness. Tag `now` (instrumentation).
3. **Dead code:**
   - `consolidateRearPockets` (tests only);
   - `createPocketContainmentSectors` (`sector_rearrangement.ts:213`);
   - `evaluateCorpsOffensiveLaunch` (`bot_corps_directives.ts:54`, imported, never called).
   - Tag `post-1.0` cleanup. Delete only with the cleanup-packet discipline.
4. **"EN" chip is an untranslated generic fallback**, and the legend lacks fog/contact/enclave rows
   (§7). Tag `now` (UI).
5. **Authored operations never retry a failed objective,** and a queue head below its viable floor
   blocks the corps chain indefinitely (`pre_planned_operations.ts:2127-2138, 3089-3108`). This is
   fragile in live play. Tag `post-1.0` unless measured in live play.
6. **Owner's save wanted.** To confirm which path failed (Jajce failure caps, the Donji Vakuf viable
   floor, autonomy level, mixed-ring gate), run `desktop_calibration_compare` on the owner's save
   with the `local_occupation_candidate` reason-code topic on (`emit.ts:735-751`).

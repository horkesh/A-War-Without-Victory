## 2026-11-25 — A9 (SD13) enclave stack: B2 reachability, B3 trapped pockets and the one Sarajevo crossing, P0-B, P0-A pocket fall, P1 negotiated evacuation (hash-moving, measured, re-pinned)

Owner: Srebrenica is a top-priority must-fix. A held, supplied pocket is never emptied by a rule, and an enclave's population follows the sourced history through the 1993 evacuations and the 1995 falls. §6 owner-delegated broader bright-line panel (lane B s15): eight independent seats, no war-or-game seat, operations-expert as the 8th; unanimous GO 8/8 in round 3 (rulings D1-D13). The orchestrator accepted it on 2026-11-25 with bindings: the 0.35 → 0.19 unification is part of P0-A's pair; P1's bounds are named constants with sources; the killed and left-the-pocket aggregates feed no score or sim reader. P1 rulings 1-6 cover (c) opening the episode only and (d) counting the pocket's own Ring 1 cells. The Farz P-A ruling (2026-11-25) accepts an attributed hist-only knife-edge. Records: SENSITIVE_HISTORY_DESIGN_GATE.md §6, rows "Siege leavers trapped in a separate pocket (B3)", "Pocket fall (P0-A)" and "Negotiated evacuation (P1)".

**Change.** Each step is its own commit and was measured as its own 188w pair; only the tip merges.
- **B2** (`processDisplacementTakeover`): the capture pass-through goes only to supplied ground in a body linked to the source (A5b reachability). 0 cross-line rows.
- **B3 + D10b** (`updateDisplacement`): a separate, unsupplied pocket's siege leavers are TRAPPED, a record only that feeds Ledger line 2. One sourced crossing, `POCKET_CROSSINGS.sarajevo_airport_crossing` (Galić TJ 411-413); no tunnel exit.
- **P0-B**: a side holding zero ground in a municipality accepts same-body destinations without the supply requirement, within capacity. Hash-neutral on the hands-off run.
- **P0-A** (new war step `pocket-fall`, `src/state/pocket_fall.ts`, after `update-displacement`; step-count pin 191 → 192, owner-approved):
  - An enclave fall moves the fallen side's stock out in the same turn.
  - Killed = `ASSAULTED_POCKET_FALL_KILL_RATIO` 0.19 × the stock (Krstić TJ 84 over the party figure in paras 592-593). Žepa's authored flag `zepa_negotiated_evacuation` records "not recorded", never 0.
  - Write-only `displacement.pocket_fall_records`; the Ledger column "Left the enclave" and the enclave card, EN and BCS.
  - The takeover writer's 0.35 is unified onto 0.19. That reaches the RBiH takeover rows in Srebrenica and Goražde municipalities: killed −2,407 over the war.
- **P1** (inside `update-displacement`): a negotiated-evacuation convoy runs from a besieged separate pocket when (a)-(d) and the besieger's intent hold.
  - Bounds: `NEGOTIATED_EVACUATION_EPISODE_CAP` 9,000 and `NEGOTIATED_EVACUATION_CONVOY_MAX` 3,000 (SG A/54/549 39-40; Krstić TJ 16).
  - Write-only `negotiated_evacuation_records`; no score effect on the besieger.
  - The refusal hook `recordNegotiatedEvacuationRefusal` exists. The refusal card UI is the named next PR.
- New optional GameState fields (old saves load): `pocket_fall_records`, `pocket_fall_originals_booked_by_side`, `negotiated_evacuation_records`, `negotiated_evacuation_by_side`. Strict-null inventory 620 → 624.
- Canon: SHDG §1 enclave bullet, the DC A6 follow-up 1 text and three §6 records; DISPLACEMENT_MASTER §3.3, §3.5, §3.6, §10.1, §10.3, §10.6, §10.8; Systems Manual A4 and A5; VICTORY_AND_PYRRHIC_SCORING §3.2. FORAWWV unchanged.

**Measured** (tip 07d8515da, main ddfd711f3 merged; receipts in coordination `evidence/laneb_s18_20261125/`):
- **Hashes:** 188w hist 430b2701a145372d → **43dafaed9603e12a**, emer **5d364b11f8d34be8**. Three independent runs agree, and a re-check on the re-merged tree equals them. Manifest and structural fingerprint re-pinned.
- **Gates:** jan93 692/692; consistency 0; health --strict PASS; idle 33/28; stranded 2/2; 0 cross-line rows.
- **Live parity RBiH a2:** control identical on all 188 turns.
- **Enclaves:**
  - Srebrenica wk170 is 42,305 (one basis, band 36-46k); Goražde 56,359.
  - Srebrenica falls t171: 34,268 forced out, 8,037 killed (recorded as is). Žepa falls t173: 6,191 evacuated, killed not recorded.
  - Convoys t56-58 (26 Apr - 17 May 1993), 9,000 people.
  - Ledger line 2 is live mid-war.
- **Farz P-A hist:** an attributed knife-edge under the orchestrator ruling of 2026-11-25. oct95 650 against 656 before P1 is a recorded score, not a bar.

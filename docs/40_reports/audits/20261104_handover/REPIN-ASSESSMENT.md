# Re-pin assessment: scenario-tester seat, 2026-11-04

Candidate: run `__w188_n3` (dfbab5f43), pins `92ff10609b13c5bd` plus 8 manifest hashes. Read-only review.

## 1. Checkpoints (out of 712)
- Candidate: **702 / 704 / 701 / 691**. matched_osids is 691, against a minimum of 644.
- Against the floors (694 / 674 / 668 / 641, `engine_health_thresholds.json`, unchanged): margins are +8 / +30 / +33 / +50. **No floor is breached.**
- Against origin/main's e607508bc pins (702 / 678 / 672 / 667): 0 / +26 / +29 / +24.
- **The pins being replaced are not e607508bc.** HEAD's manifest is the Codex-lineage re-pin `81a65d76f` (Oct 24), which is not on origin/main. That baseline scored **707 / 707 / 706 / 706**, had Farz P-A passing 4/4, and its cascade was 49/49. Against it the candidate is −5 / −3 / −5 / −15. Part of the April gaps may come from a one-cell repaint: the Brka paint was rebased in apr1994 and apr1995 in snapshot 90156c1e0.
- Run ladder: snapshot 709/701/701/686 → +W1 709/708/710/694 → +W3 702/704/701/689 → +slot gate 702/704/701/691.

## 2. Anchors
- **31 of 31 pass** (contract v1, epoch oct1995). I re-checked every OSID anchor against the save's `political.political_controllers`: 0 mismatches.
- The Brčko band holds: RS corridor 5 of 6, southern shoulder 7 of 7.
- The controllers are identical to snapshot n0.
- **No anchor's controller differs from what the contract expects.**
- Caveat: the local anchor and health tests skipped 13 of their 17 tests. The proof rests on the run's own evaluation, which I cross-checked.

## 3. Enclaves, eastern provenance, Farz
- **Enclave guard 9/9.** Seven enclaves hold; Teočak is contested in 1 battle and holds. Srebrenica and Žepa fall on schedule.
- **Eastern provenance CLEAN.** `kalesija:seher_2` is still RBiH, the same as in the Oct 24 pin.
- **Farz P1 (Ozren): 4/4 taken.**
- **Farz P-A FAILS: 0 authored AARs.** This is **not** the carve-out in the e607508bc body:
  - That carve-out was the *old* P-A check: was the Briješnica cell captured by the 2nd Corps? It failed because `arbih_327th` took it at t168.
  - The owner ruling of 2026-09-29 and scorer commit 24452b5fa replaced that check with the present one: operation-owned receipts for all four authored objectives.
  - The Oct 24 pin **passed** the present check (captures at t163–t168).
- What the candidate's run actually records:
  - `ahq:RBiH:3:farz_95` *is* formed at t178 and completes; its recovery starts at t185.
  - Its 3rd Corps AAR (t178–187) and the 2nd Corps "Uragan 95" AAR (t179–181) both lack `army_hq_telemetry`, so the gate's `^ahq:RBiH:\d+:farz_95$` match finds nothing.
  - Vozuća is now logged by Uragan, not by Farz. In n0, Farz's own AAR logged all four objectives.
- The failure was already present in snapshot n0. That points to the uncommitted Codex April work, which moved the Farz trigger from turn 160 to 178. It was not introduced by W1, W3 or the slot gate.
- It is not a §6 breach (CALIBRATION_MASTER, Farz ruling). But it **is a new breach relative to both documented pins**, and no carve-out is recorded for it.

## 4. Strict health
All hard checks pass:
- stranded 0 (the Oct 24 pin had 10)
- ghost-destroyed 0
- zero-eligible ops 0
- invalid op-weeks 0
- consistency failures 0
- K/W ratio 3.655, inside the band [3.221, 4.358]

Advisory only:
- dead ops 11 of 71 operations, 12 of 101 axes
- probes that never executed 252 of 253
- RS hollow ratio 0.46 (26 of 56 combat-effective)

## 5. Fingerprint
- **Determinism is clean.** n3 (dfbab5f43) and the re-pin run n5 (HEAD) are byte-identical on all 8 pinned artifacts (final_state_hash `26b801179949ce79`). There are no src/data/scenario diffs between those commits.
- The fresh 40-week run n4 gives 86 / 250 / 376 (HRHB / RBiH / RS), which equals week 40 of n3 and n5.
- The week-40 change is explained by the run ladder:
  - n0 = n1 = 254 / 372 at week 40 (W1 changes nothing that early);
  - n2 = n3 = 250 / 376 (W3 costs 4 RBiH OSIDs; the late-war slot gate does nothing by week 40).
- The cells that move are the ones the historian named: Hotonj, Tošići, Kamen, Donje Žešće, Miljeno and Todorovići.
- The old fingerprint (`87c7a9b1`, from Sep 20, 256 / 370) was already stale against the snapshot, so the diff also carries unattributed Codex-lineage drift. I see no nondeterminism.

## Verdict: **NO-GO** for committing these pins

**The one reason that decides it:** the scorer reports `GUARD BREACHED — Do not merge` (result line read; exit status not re-run), and the cause is not the carve-out e607508bc relied on. It is the *current* Farz P-A receipt check: the pins being replaced passed it 4/4, and the candidate fails it 0/4 with no carve-out on record. Committing these pins would quietly lock that in as the accepted baseline.

What would turn this into a GO (conceptual; operations-expert or gameplay-programmer):
- either restore the Army HQ telemetry linkage on the Farz/Uragan AARs (and keep Vozuća a Farz-owned capture), then re-measure;
- or have the panel record an explicit new carve-out in the same change.

Everything else (floors, 31 anchors, enclaves 9/9, eastern provenance, strict health, determinism) supports GO.

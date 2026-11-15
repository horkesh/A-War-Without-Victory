# Authority design and army-clash gate: ratification (2026-11-15)

**Verdict: RATIFIED by both seats, after changes they asked for were applied in the same PR (L7, #670).**

The owner delegates design choices to the Pyrrhic team. The orchestrator convened two independent seats to ratify the design from Fable consult 1 (`C:/Pyrrhic/AWWV-coordination/fable_consults/1_authority_economy.md`, main verdict and follow-up). The L7 implementer did not vote.

## What was ratified
1. **Appendix A, as built:** a clash on any compliance short of full, with the category kept as severity. This replaced "partial or refused, never modified".
2. **Authority is the price of overruling the army.** Prices and income stay unchanged.
3. **The gestures are the routine spend,** to become renewable on a cooldown (front visit 26 weeks, address 52, decoration 52, posture review 26) in a later data PR (appendix D).
4. **The proposal's 25% at-cap target moves to the engaged President** in a three-President test (hands-off, engaged, meddler) with Fable's pass criteria.
5. **Held tuning order:** gestures 10 → 20, then remove the 15-point reserve, then lower base income. None is applied before the test.

## Seats
| Seat | First verdict | Final verdict |
| --- | --- | --- |
| game-designer | Ratify with changes | **Ratify** |
| canon-compliance-reviewer | Ratify with changes | **Ratify** |

**The blocker both seats found independently.** Accept on a withheld plan or a declined opportunity restaged an approval for free. Withholding is free too, so withhold-then-Accept backed an offensive for nothing, against owner decision 1.
- Fixed in `src/desktop/army_clash_ipc.cjs`: Accept now debits `proposalBackingCost` (10 or 20) and is refused when the balance cannot cover it.
- The card shows that price and disables Accept when it is unaffordable.
- Tests were added for both cases.

**Wording changes applied:**
- Accept's price is now stated in Engine Invariants §14.10d, Rulebook line 13 and §5.5, Systems Manual §6.5, and the answers table of proposal §2A.
- Rulebook §5.5 says "would carry out the order exactly as given". The army commander now "changes only through the war's own course (the historical schedule or his death)".
- Systems Manual §6.4 lists every price (author and proactive force included). The gestures are described in future tense, with today's caps.
- Proposal §5D: the gestures bullet is in future tense. The pass line says "an act turned down for lack of Authority". A line was added: record each army chief's stubbornness, rerun after the roster fix (appendix B), and judge the clash line on that second run.

**Non-blocking nit, applied:** the card's Accept price now comes from the same source as the IPC debit (the restaged review's `proposalBackingCost`).

**Not touched:** FORAWWV and sensitive history. No §6 seat was needed.

## Held step 1 (2026-11-15): taken on the measured trigger (B min 65.5)
The ratified held tuning order fixed both the first step and its trigger: the engaged President never falls below 25. In the first three-President run (RBiH, 104 weeks, main plus appendix D, every act through the desktop's own contracts), B's balance never went below 65.5. So step 1, gestures 10 → 20, was taken without a new seat, as the design provides. The other results of that run:
- A at cap 100%.
- B at cap 9% (7/78).
- C at cap 0%, refused for lack of Authority 4 and 9 times a year.
- No clashes. That was a test-design gap: a Request-op cannot cross RBiH's plan. The test now adds a Stop-op on the main effort.

Changed: the four gesture price constants (`autonomy_ipc_contract.cjs` and `commandAuthority.ts`), Systems Manual §6.4, proposal §5D. The next step, removing the 15-point reserve, is held until the rerun.

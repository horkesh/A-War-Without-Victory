# Operations Expert — W3 verdict

**Vote: 1 KEEP. Confidence: medium.**

**Load-bearing reason:** W3 did not take away anything Farz needed. Farz was never injected in C, because a fragile Army HQ launch gate missed by one turn. The teleport was not holding up Ozren. The fix belongs in that gate.

## Measured facts
1. **B:** `Operation Farz 95` (`ahq:RBiH:3:farz_95`, 3rd Corps) is injected at t178 and runs t178–187 with 351st, 328th, 327th, 7th Vitezka and the Guards. It logs captures of all 4 Ozren cells. Uragan 95 (2nd Corps, t179–181) takes only Vozuća, in both runs.
2. **C:** no Farz AAR. `army_hq_operations`, `army_hq_last_op_turn` and `triggered_operations_accepted` are empty, with no decline and no warning. At t178 the 3rd Corps still holds `probe_arbih_3rd_corps_t177` in recovery. In B the last probe was t176 and had cleared. The probe cadence flipped parity early (B even turns, C odd: t20 vs t19 … t176 vs t177).
3. `injectArmyHqOperations` (`triggered_operations.ts:1513`) blocks on `hasActiveOperation`, which counts ANY op, a recovering probe included. The ordinary triggered path (`:1288`) uses `hasAvailableSlot`, and its comment says a probe "must not suppress them". In C, Donji Vakuf 95 and Jajce Recovery enter the 3rd Corps that same turn. DV95 is still open at t188, so Farz stays blocked for good. The block leaves no watched-ops trace.
4. At t178 in C, the seed brigades 351st, 328th and 327th are active, uncommitted and near Maglaj/Zavidovići/Tešanj. The force was available; only the corps gate stopped it.

## Inference
- The Ozren loss is a **timing divergence on a fragile gate**, not a dependency on instantly staffed sectors or relocated brigades. W3 is only the remote trigger (staffing → probe timing). Any one-turn shift could break Farz the same way.
- **jan1993 709→702 is a genuine W3 effect.** B misses 3 cells, C misses 10: Čajniče miljeno_2/todorovici, Foča donje_zesce, Goražde kamen, Trnovo tosici, Visoko gornja_vratnica_2, Vogošća hotonj, Jajce lupnica (Konjić ljuta improves). The regenerated startup already places the Goražde brigades differently at t1 (851st semihova_2 vs citluk_2). B's t9–t25 captures by the 102nd/851st/831st/146th don't happen in C, and the 1st Corps spends Lavina/Odluka (t171–177) retaking two of them. Part of B's score was bought by the teleport.

## Smallest legal follow-up (one change, one 188w run on W3)
In `injectArmyHqOperations`, replace `hasActiveOperation(primaryCmd)` with the triggered path's `hasAvailableSlot(primaryCmd, activeCorpsBrigadeCount(state, def.primary_corps))`, and record an `active_primary_corps` trace when blocked. A smaller fallback: let only probes and recovery-phase ops through. It stays a normal CorpsOperation with the date trigger unchanged: no ownership writes, no railroad.
- **Risk:** the same gate governs Krivaja-95 (RS), so recheck the Srebrenica/Žepa guard.
- **Expected:** Farz at t178, Ozren back to 4/4. Not yet measured.
- The eastern startup placement behind jan1993 belongs to the T1/T2/T3 relief lane, not to operations.

## Why not PARK
PARK keeps an Engine Invariants §14.9 violation open to protect a Farz result that rests on a one-turn coincidence, plus a score partly bought by the teleport. Owner rule: never buy score with a broken mechanic.

Confidence is medium because the 188w regression is real (jan −7, apr95 −9) and the gate fix is unmeasured.

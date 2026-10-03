# n12 retained-evidence correction (2026-09-29)

The valid, single authorized n12 prefix is `runs/apr1992_definitive_188w__2cb8853e73fa74b8__w156_n12` (exit 0, 156 rows, final hash `34ee9fcb3a1aee24`). It fails April acceptance: 703/712 and 39/40 protected anchors. This note corrects factual and causal errors in `opencode_n12_retained_diagnosis.md`; it adds no run or candidate change.

## Provenance and early-war cause

- `Operation Jajce` is preplanned: `src/sim/combat/pre_planned_operations.ts` defines it at line 1003, queues it after Corridor at line 2363, and `injectQueuedOperation` builds queued operations with `is_pre_planned=true` near line 2502. The initial save already contains that queue. Therefore the authorization gate legitimately admits it. The earlier report's classification of Jajce as an emergent unauthorized bot operation, and the code comment in `osid_column_movement.ts` that repeats it, are wrong.
- n9 and n12 both start Jajce at t19. n9 ends at t29; n12 ends at t28. n12's earlier Jajce movement begins with the 11th Mrkonji brigade at t20, while n9's corresponding transit begins at t23. n11 and n12 weekly state are identical through t148, so the added authorization gate did not change this cascade.
- The queued `Operation Donji Vakuf` starts at t29 in n9, with the authored 16th Krajina Motorized Brigade among six participants. It starts at t28 in n12 with five participants; the 16th is still in transit to `op:sipovo:pribeljci_2` at t28 and arrives at t29. At t30 a generic `Operacija Bedem` claims it. The existing authored reinforcement admission only handles a preplanned operation in planning and a formation already at the exact staging OSID. These facts make the one-turn roster miss the concrete next issue to test. A fix has not been implemented or measured.

## Checkpoint accounting

Compared with n9, n12 loses the three Donji Vakuf RS positions (`donji_vakuf_2`, `korenici`, `oborci_2`) and gains Paklarevo and Gornje Krčevine as RBiH. Varošluk is RS in both n9 and n12; it is not a new mismatch relative to n9. Thus April fit is `704 - 3 + 2 = 703`. Relative to n11, n12 gains Gornje Krčevine and loses Varošluk, changing fit from 701 to 703 because both switches correct painted-reference mismatches. Paklarevo was captured by ordinary combat in n12, contrary to the earlier report's “not fought” phrase.

The protected `donji_vakuf_2` seat remains wrong in n12. Donja Mahala HRHB, Doljani RBiH, Ljubunci/Lug/Paroš HRHB, and Gornja Presjenica RS are retained. No second campaign, retry, merge, baseline adoption, painted change, or October work follows from this note.

## 2026-11-26 — The "refugees received" basis line says who is not counted (E-dest register items 2-4)

Authority: the orchestrator's 2026-11-26 ruling (freeze inventory §10, E-dest register items 2-4: one small hash-neutral PR). Item 2 copy: narrative §4 panel (historian + narrative designer, polled separately, no war-or-game seat), unanimous in round 3 on the historian's round-1 text, which the narrative seat signed in round 2.

**Change.**
- Item 2 (disclosure): the verdict basis line for "refugees received" (`verdict.basis.refugeesReceived`, `src/ui/map/i18n/messages.en.ts` and `messages.bcs.ts`) now says the figure counts people who reached the side's territory from their own homes, and that people driven out when an enclave fell (the pocket fall, D1-D7) and those evacuated by convoy (D9) are not counted.
  - EN: "Displaced people who reached this side's territory from their own homes, this campaign; people driven out when an enclave fell and those evacuated by convoy are not counted here"
  - BCS (partial at 1.0): "Raseljeni koji su iz svojih domova stigli na teritoriju ove strane, ova kampanja; protjerani pri padu enklave i evakuirani konvojima ovdje nisu uračunati"
  - Why "driven out": the record is forcible transfer (ICTY Krstić; Tolimir), and it covers the negotiated fall at Žepa too. "Fled" and "had to leave" were rejected as understating it; a bare "evacuations" was rejected because siege leavers, who are counted, also left under siege.
  - Still true after E-fall: E-fall moves enclave formations only and changes no civilian count.
- Item 3: DISPLACEMENT_MASTER §2.3 note: a besieged side's `refugees_received` includes its own siege leavers, and it is not a score input (display only).
- Item 4, accepted as final (same note): "The siege arrival row assumes the holder still has settlements in the municipality, which is always true when it has leavers; no arrival row is written without its departure row."

**Measured.** Hash-neutral (copy and docs only). The PR body lists the 188w pair (equal to main).

## 2026-11-25 — A9 P1 refusal card: the RBiH president may refuse further negotiated-evacuation convoys from a besieged pocket (EN, BCS draft)

Authority: 8-seat §6 ruling D9 (refusal) and the orchestrator's P1 ruling 5 (a named PR before the freeze; silence = allow). Copy sitting (lane B s19): historian and narrative copy seats unanimous in round 2; ui-ux consultation GO with amendments. Record: SENSITIVE_HISTORY_DESIGN_GATE.md §6, "Negotiated evacuation refusal card".

**Change.**
- `src/ui/map/components/EnclaveDashboard.tsx`: each open episode of an own RBiH pocket on the enclave card. It shows the people evacuated so far, the Srebrenica-only history note, the cost line and "Refuse further convoys" with an inline confirm. A refused episode shows the stopped line. There is no decision at the cap.
- `src/ui/map/data/GameStateAdapter.ts` + `types.ts`: `readNegotiatedEvacuations` / `NegotiatedEvacuationView` (display only).
- `src/desktop/electron-main.cjs`, `preload.cjs`, `src/ui/map/desktop/useIPC.ts`, `src/desktop/desktop_sim.ts`: the IPC channel `refuse-negotiated-evacuation`, the only caller of the engine hook `recordNegotiatedEvacuationRefusal`.
- `src/desktop/player_visible_state.cjs`: the player's own episodes and convoy records only.
- i18n: `enclave.evacuation.*` (10 keys, EN and BCS draft). The r1 Ledger note `humanitarianLedger.note.evacuation` is retired, because the convoys are not in the Ledger tables.
- Canon: SHDG §6 record row (and the P1 row's pointer); DISPLACEMENT_MASTER §3.6 refusal. FORAWWV unchanged. No GameState field added. No engine path changed.

**Measured.** Headless is unchanged by construction. The PR body lists the CI 188w hash against main, live parity and the screenshots.

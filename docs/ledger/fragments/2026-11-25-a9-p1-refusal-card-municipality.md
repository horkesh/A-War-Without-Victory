## 2026-11-25 — A9 P1 refusal card: each section names the municipality whose convoys it stops (EN, BCS)

Authority: Codex #868 r4699080430 (P2), orchestrator intake 2026-11-25: MUST-FIX, display only. Copy seats (historian, narrative designer, independent, lane C s12): unanimous SIGN in round 1. Record: SENSITIVE_HISTORY_DESIGN_GATE.md §6, "Negotiated evacuation refusal card" (dated amendment).

**Change.**
- `src/ui/map/components/EnclaveDashboard.tsx`: when one enclave (the Bihać pocket, Sarajevo) has open episodes in several municipalities, every section rendered the same heading and confirm, so the player could not tell which pocket a refusal stops. The heading and the confirm now carry the municipality's existing display name (`getPlayerSafeMunicipalityName`).
- i18n: `enclave.evacuation.title` and `enclave.evacuation.confirm` gain `{place}` (EN and BCS).
- Test: `tests/ui/negotiated_evacuation_refusal_card.test.ts` gains a two-municipality card (each section names its own municipality; a refusal stops only that one; EN and BCS); the group-name pin now names Srebrenica.
- Canon: the SHDG §6 refusal card record's dated amendment. FORAWWV unchanged. No GameState field added. No engine path changed.

**Measured.** Headless is unchanged by construction (UI only). The PR body lists the CI result and the screenshots.

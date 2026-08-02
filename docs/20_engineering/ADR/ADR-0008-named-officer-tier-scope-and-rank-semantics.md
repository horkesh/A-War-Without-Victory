# ADR-0008: Named-officer tier scope and rank semantics

## Status

**Accepted 2026-08-02.** Owner/orchestrator acceptance was given for the R7 Phase 2 repair after the 63-row source roster demonstrated typed brigade, enclave, operational-zone, staff, and political-military roles.

## Context

`docs/10_canon/Systems_Manual_v0_9_0.md` section 4 describes Tier 1 as 63 historical named officers "corps and above." The original 63-row implementation and the restored 63-row source roster also contain historically important operational-zone, enclave, independent-brigade, and political command personalities. Examples include Izet Nanić (505th Brigade), Naser Orić (Srebrenica forces), Avdo Palić (Žepa), Mario Čerkez (Vitez Brigade), Dario Kordić (political authority with de facto military authority), and Mladen Naletilić (Convicts Battalion).

The runtime schema has only three `rank` tokens: `army_commander`, `deputy`, and `corps_commander`. It uses those tokens for assignment eligibility and succession. The UI currently converts `corps_commander` into a general-officer abbreviation and star count. Consequently, treating every token as a literal historical rank would contradict the row-local command evidence, while deleting every non-corps personality would contradict the binding 63-row census and the established command-pool design.

R7 Phase 2 restores the 63-row contract and cites each historical identity and command assignment exactly. It does not silently claim that the source assignment was a corps command.

## Decision

Tier 1 means the **63-person named strategic/operational command pool**, not a literal list restricted to people who historically commanded a corps or army.

- `rank` remains a deterministic gameplay appointment-class token for save compatibility; it is not a historical rank.
- `historical_role` is the typed, sourced office/command used for player-facing labels and provenance review.
- Provenance must name and source the person's actual historical office or command; `corps_commander` must never be used as evidence that the person historically held corps rank or command.
- The pool may include army/corps commanders and deputies, operational-zone commanders, enclave commanders, commanders of strategically significant independent formations, and political actors for whom a reliable source establishes military command authority.
- Inclusion still requires exact row-local identity and command-authority evidence. Fame, name similarity, proximity in an appendix, or a generic formation citation is insufficient.
- UI surfaces must render the sourced `historical_role` or a neutral command-pool fallback. Appointment classes may be shown only as gameplay eligibility and must not generate general-officer abbreviations or star insignia.

## Determinism Impact

The schema/read-model addition is static and deterministic. It adds no random source, iteration-order change, clock field, serialization clock, or new entry point. Stable officer IDs and succession ordering are unchanged; legacy save rows without `historical_role` project as `unspecified_command_role`.

## Consequences

- The Systems Manual's numeric 63-officer contract remains enforced.
- Historically important non-corps command personalities are not deleted merely to make an imprecise label true.
- Provenance stays exact about historical assignments and cannot infer a corps command from the gameplay enum.
- The UI no longer converts appointment classes into invented historical general ranks or stars.
- The numeric 63-person contract is reconciled without pretending every roster member historically held corps or army command.

## Canon References

- `docs/10_canon/Systems_Manual_v0_9_0.md` section 4, Tier 1 named officers.
- `docs/10_canon/Engine_Invariants_v0_5_0.md` determinism and stable-state requirements.
- `docs/40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md` original 63-person implementation contract.
- `docs/40_reports/implemented/20260802_R7_PHASE2_OFFICER_OOB_ATTRIBUTION.md` source and chronology repair evidence.

## Ledger Entry

See the 2026-08-02 R7 Phase 2 committee-repair entry in `docs/PROJECT_LEDGER.md`.

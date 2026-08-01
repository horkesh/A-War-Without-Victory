# R4 Phase 1 Priority and Receipt Convergence

**Date:** 2026-08-01
**Roadmap workstream:** R4 -- Command, Event, and Dynamic Codex convergence
**Status:** Implemented and verified
**Release impact:** None

## Outcome

Phase 1 now has one deterministic presidential priority contract and closes the only receipt defect proven by Phase 0. Desk, Inbox, Warroom toolbar, and Decision Room agree on blocker status, agenda band, within-band urgency, source id, deadline, and recommended destination. Deadline-bearing operation opportunities order identically on all four surfaces. Threat/cost severity remains visible presentation evidence but no longer owns presidential agenda order.

No duplicate action renderer was found: the executable ownership diagnostic still resolves exactly one action surface for every decision family. Therefore this phase removed no renderer and deleted no receipt.

## Priority and navigation contract

- `PresidentialPriorityReadModel` owns `blocker`, `priorityBand`, deterministic `urgency`, `source.id`, `deadlineTurn`, and `recommendedDestination`.
- The nine-family player-decision manifest records each family's canonical source path, recommended workspace, and durable receipt path.
- Inbox and Decision Room materialize the same model before sorting. Desk pre-advance rows retain that model, and the Warroom toolbar consumes the same Decision Room ordering.
- Required rows come only from existing Advance blocker ownership. Nonblocking threat severity cannot promote itself into a presidential obligation.
- Player-faction filtering now excludes foreign operation-opportunity dossiers before priority materialization. Existing fog-safe, player-facing copy paths remain unchanged.
- The existing field-plan return contract stores the originating dossier card id and reopens that exact dossier after map inspection; Phase 1 preserves it.

## Receipt closure

Resolved ordinary autonomy proposals previously survived only through their resolution turn. The turn phase now archives them idempotently in optional `meta.proposal_decision_history`, excluding historical-operation and operation-opportunity carriers that already own durable receipts elsewhere. One shared identity, `proposal id :: resolved turn`, owns writer deduplication, validation, and Records ledger ids. The history is deterministically ordered, survives save/load, and is projected by the Electron player-visible boundary for the player faction only. Older saves omit the optional field and read as an empty history.

Records projects those dispositions as localized, player-safe `Staff proposal accepted/declined` rows. Structured stance-change receipts localize the safe formation name and both stance values; raw proposal descriptions, action strings, internal corps ids, stance enums, and debug tokens are not rendered. Authored event consequence receipts carry stable source and receipt record ids including decision turn. Confirmation additionally requires the causality entry turn to equal the source decision turn, so even same-event, same-response recurrences retain separate receipts, expansion state, and exact focus backlinks.

## Committee correction

Independent review blocked the first implementation on four concrete gaps. The correction adds an exported `advanceTurn` end-to-end save/load/Electron projection regression; replaces event-id indexing with event/response/decision-turn source identity and requires the matching causality entry to share that turn; renders BCS proposal receipts from structured localized fields; and rejects invalid domains, malformed optional fields, and duplicate durable proposal identities. The receipt recurrence finding was reproduced with two same-event, same-response decisions where only one has a matching turn-scoped causal edge. Each runtime defect was reproduced by a failing test before correction.

## Executable evidence

The machine report is `docs/40_reports/audits/20260801_R4_PHASE1_PRESIDENTIAL_COMMAND_CONVERGENCE.json`:

- bytes: `14,488`
- SHA-256: `43c0df567cbfb4592450cdfe6864967c239e8b6f63080efe463351ae29c31506`
- player-decision families: `9`
- reachable action families: `9`
- durable receipt families: `9`
- conditional receipt families: `0`
- source-verified families: `9`
- unresolved findings: `0`

## Verification

- Committee-corrected Phase 1 matrix: `18` files / `297` tests passed.
- Player journeys: `44` files / `770` tests passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run canon:check`: determinism scan and baseline regression passed; all scenarios match.
- `git diff --check`: passed.

## Canon and scope review

This phase changes presentation ordering and durable recording of decisions the game already produced. It adds no decision family, lever, historical event, source claim, scenario content, simulation formula, RNG input, or hidden-information projection. The optional history records actual resolved proposal state and is not used to influence simulation. No deterministic baseline changed.

The Technical Architect review found no new entrypoint, phase reorder, or ownership boundary: Decision Room remains the action owner, Army HQ Records remains the receipt owner, and the Warroom toolbar remains a summary projection, matching `PRODUCT_SHELL_HIERARCHY.md`. The proposal history is a lazy nested receipt bus: absence is legitimate until a decision is resolved, so `SAVE_SCHEMA_EVOLUTION.md` requires validate-when-present plus full desktop `advanceTurn`, save/load, and Electron projection proof rather than a schema-version migration. The Modern Wargame review found no UI-truthfulness breach: agenda priority is kept separate from threat/cost severity, deadlines come from existing source state, foreign-faction opportunities and receipt history are filtered, and deterministic source/id tie-breaks prevent unstable cross-surface ordering.

No package, version, tag, installer, signing, publication, or release state changed. `docs/10_canon/FORAWWV.md` is unchanged.

## Next step

Phase 2 is the next unchecked phase in the owning plan: source-backed cadence and explicit positive holds. It must continue to use existing levers and emit a positive hold when no sourced initiative exists.

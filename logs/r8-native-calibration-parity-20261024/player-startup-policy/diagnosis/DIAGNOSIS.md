# Startup consequence root-cause diagnosis

Status: **ROOT CAUSE ESTABLISHED; IMPLEMENTATION BLOCKED PENDING RENEWED REVIEW.** This is a read-only diagnosis against `b371adc3e0935825649e5eda4e6bbd45a44a359d`. It does not authorize or implement source, test, event-data, baseline, campaign, package, or documentation changes.

## Root cause

The baked April 1992 startup state contains `military.negotiation`, but its `capital` and `patron_relationships` maps are empty and `strategic_dimensions` is absent. Both normal startup adapters load that same artifact:

- Electron: `startNewCampaign()` loads the baked snapshot, returns observer parity unchanged at lines 323-325, and otherwise overlays player metadata and queues the selected faction's foundational decision at lines 327-357.
- Browser fallback: `startCampaignFromSidePicker()` fetches the baked snapshot, overlays the same player metadata, and queues the selected faction's foundational decision at lines 283-320.
- Headless: `buildScenarioStartupState()` creates the same partial object through the versioned save migration; n94, n95, and the baked snapshot have the same SHA-256 and the same empty maps/no dimension store.

The event resolver is therefore called before the state required by its consequence writers exists. `resolveEventDecisionCore()` applies option effects, flags, and dimension shifts at `src/sim/events/resolve_decision_core.ts:75-89`. `applyDefinitionDimensionShifts()` returns when `strategic_dimensions` is absent (`src/sim/events/evaluate_events.ts:149-157`). Every foundational event for RBiH, RS, and HRHB has authored option dimension shifts, so all three normal-player opening responses currently drop those shifts. The failed policy candidate exposed the same no-op for `rbih_paramilitary_policy_1992`.

On first Advance, `paramilitary-detect` and `paramilitary-advance` run at phase indices 43 and 44, while `compute-negotiation-capital` runs at index 184. `recordWarCrime()` returns when `negotiation.capital[faction]` is absent (`src/sim/combat/paramilitary_sweep.ts:841-850`). The retained allow fixture therefore captured Obadi and Bukvik Gornji 2 and persisted 200 civilian deaths, but recorded zero instead of two war-crime events. The later capital computation creates a zeroed capital record; it cannot reconstruct the missed increments because the humanitarian computation reads `war_crimes_events` from that same record.

## Existing initialization ownership

`computeNegotiationBreakdown()` already contains the correct factories and missing-entry rules: `createEmptyCapital()`, `createDefaultPatronRelationship()`, and `initializeStrategicDimensions()` for the canonical faction order RBiH, RS, HRHB. Its private `initializeNegotiationState()` is not reusable, and calling the whole computation at campaign birth is unsafe because it recalculates territory, military, humanitarian, credibility, and enclave fields.

`preseedScenarioState()` is also unsuitable. It does not create strategic dimensions and overwrites patron support/override values from scenario baselines. Save migration only guarantees empty negotiation containers. A new mirrored initializer in each adapter would create divergent ownership.

The narrow repair is to extract the existing fill-only initialization into one browser-safe shared helper. It must add only missing containers, missing canonical faction capital entries, missing canonical patron entries, and a missing complete strategic-dimension store. It must never recompute a breakdown, overwrite any existing field or faction entry, reset counters, merge defaults into an existing capital object, or mutate event/phase state.

## Headless finding and boundary

n94 and n95 initial saves are byte-identical to the baked snapshot (`413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`) and also lack capital entries and dimensions. Their retained week-1 report records four paramilitary control changes before capital initialization. Those captures necessarily traverse the same guarded writer and lose their initial war-crime increments. This is a latent current headless-baseline defect.

That defect is **not** part of this repair. Initializing the shared scenario factory would change the frozen n94/n95 trajectory, event consequences, scoring substrate, startup snapshot bytes, and current default headless behavior. The proposed helper is called only after the `observerParity` early return in ordinary Electron startup and only in the browser fallback's explicit player branch. The unchanged no-player/headless startup bytes are a binding acceptance criterion unless the owner separately authorizes a baseline repair.

## Scope consequence

The six prior reviews approved a queue-only transition and explicitly prohibited initialization, phase, and writer changes. Although this proposal changes no phase or writer, it adds an initialization prerequisite and restores previously dropped opening consequences for all three playable factions. The previous integration decision therefore cannot authorize implementation. Renewed Game Design, UI/UX, Historian, scenario-tester/calibration, Engine/systems, and Red-team review is required before code changes.

## Facts, inference, unresolved risk

- **Fact:** the three frozen startup files have empty capital/patron maps and no dimensions.
- **Fact:** all three foundational events have authored option dimension shifts; both normal startup adapters resolve them against the partial state.
- **Fact:** first-turn paramilitary capture precedes negotiation capital initialization by 140 phase positions.
- **Fact:** the failed real fixture preserved branch behavior, browser/Electron resolution equality, two RBiH captures, and 200 civilian deaths, but failed all expected dimension deltas and the `+2` war-crime assertion.
- **Inference:** a fill-only shared initializer before foundational decision queueing is sufficient for the missing option shifts and early capture accounting because it satisfies the existing writers' only missing preconditions.
- **Unresolved until RED/GREEN:** exact ordinary-start byte equality between Electron and browser after the shared helper, preservation of arbitrary pre-existing capital/patron/dimension values, and the complete revised queue candidate's save/reload and duplicate-delivery behavior.


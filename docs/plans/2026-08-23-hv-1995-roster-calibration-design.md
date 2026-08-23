# HV 1995 roster calibration design

## Objective

Explain why each turn-174 HV expeditionary formation does or does not reach combat, then make only the smallest roster correction supported by *Balkan Battlegrounds*. The movement/timing engine repair already merged atomically and remains unchanged.

## Considered approaches

1. Add all five idle formations to the late-war operations. This would maximize use of the wave, but it would turn an observed absence into an unsourced force-allocation decision and bundle several calibration changes.
2. Tune combat or operation thresholds until the formations are selected. This would change global mechanics without evidence that thresholds are the boundary.
3. Extend the permanent lifecycle diagnostic to report authored catalog coverage and date-window overlap, then add one specifically documented formation to one operation and measure a clean 188-week run.

Approach 3 is selected. It separates engine observability from historical content, supplies a positive control for every absence classification, and respects the one-change-per-calibration-run rule.

## Diagnostic contract

The harness will traverse the production western-Bosnia opportunity catalog, including default and variant axes, and report for every HV 1995 formation:

- authored opportunity and axis references;
- the turns on which each opportunity's date-window predicate is green;
- whether any green turn exists at or after the formation's authored spawn turn;
- whether the assignment is on the default route or a named redirect variant;
- one of `AUTHORED_POST_SPAWN_WINDOW`, `AUTHORED_WINDOW_PRE_SPAWN_ONLY`, `NO_AUTHORED_CATALOG_ASSIGNMENT`, or `NOT_ESTABLISHED`.

These statuses describe catalog authorship and date-window overlap only; they do not claim runtime eligibility, staging access, selection, or battle participation. Zero-reference and no-overlap conclusions are valid only when the traversal detects the known default-route `hv_112th_infantry_1995` Mistral 2 assignment, a formation-specific spawn turn, and a live post-spawn date window. The run analyzer binds current catalog content to the run commit by Git blob identity and returns `NOT_ESTABLISHED` rather than reinterpreting an older artifact through a changed checkout. The diagnostic remains deterministic: sorted catalog traversal, sorted axes and variants, bounded integer turn sweep, no time or randomness.

## First content hypothesis

BB Volume I, printed p.390 (digital p.427), explicitly places the 1st HGZ among Southern Move's main shock forces. The current single modeled Southern Move axis is the main Mrkonjić assault, so adding `hv_1st_hgz_1995` there matches formation, operation, and role. The same page places the 126th Home Defense Regiment in a diversion 15-20 km west; adding it to the main axis would be a role error, while authoring a new diversion axis needs separate map evidence. BB Volume I, printed p.380 (digital p.417), supports unnamed groups of five Home Defense regiments and three reserve brigades in Maestral but does not identify the 7th/134th/141st individually; those remain open rather than inferred.

## Verification

The diagnostic change receives focused unit tests and no calibration run because it cannot alter simulation state. The roster change begins with a failing catalog test, changes one formation reference, then receives exactly one clean 188-week run. The run must preserve the tracked latest-save file after measurement and must not modify the baseline manifest. Promotion requires focused tests, typecheck, engine-health gates, historical review, and implementer-external review.

# Life Lessons — Events
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [Events] MAX_EVENTS_PER_TURN=3 creates fragile event chains — pipeline changes cascade into missing events (2026-03-24) — NEW
- **Context**: v0.6.5 added `offensive-paramilitary-detect` pipeline step. This changed early-war state enough that at w5, `jna_withdrawal_1992` got crowded out by 4+ eligible events (barracks events + others). The `jna_withdrawn` flag never fires, breaking the intended cascade to `drina_cleansing`, `operation_corridor`, and `srebrenica_enclave` flag gates.
- **Wrong approach**: Adding a pipeline step and only checking calibration % — not diffing the event firing list. The event dropout was caught by the event_timing test, not by manual review.
- **Right approach**: Before adding any pipeline step that runs in weeks 0-12, run a 40w scenario and diff the event firing list against baseline. If an event drops out, investigate whether its flag is consumed downstream.
- **Do instead**: After any sim-affecting change, run `node -e "... baseline.events_fired.map(e => e.id).sort()"` and compare to the new run. Missing events = broken flag cascade.

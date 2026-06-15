# Calibration Framework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automated calibration regression suite. Freeze baseline, detect regressions, assert event timing windows. `npm run calibrate:40w` produces pass/fail report.

**Architecture:** Convenience scripts wrapping existing scenario runner + comparison tool. Baseline snapshot stored as JSON. Event timing assertions as a separate test file. No simulation changes.

**Tech Stack:** Node.js scripts (.cjs), Vitest for assertions, npm scripts.

---

### Task 1: Freeze calibration baseline
**Role:** Systems Programmer

**Files:**
- Create: `data/calibration/baseline_40w.json`
- Create: `tools/freeze_baseline.cjs`

**Step 1: Write the baseline freeze script**

```javascript
// tools/freeze_baseline.cjs
// Runs 40w scenario, captures key metrics, saves as baseline JSON
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const runDir = execSync('npm run sim:scenario:run:40w 2>&1', { encoding: 'utf8' });
// Parse the run directory from output, read the summary
// Extract: territory_pct per faction, total_casualties per faction, benchmarks pass/fail, event_fire_order
// Save to data/calibration/baseline_40w.json
```

**Step 2: Run it to create the baseline**

Run: `node tools/freeze_baseline.cjs`
Expected: `data/calibration/baseline_40w.json` created with current metrics

**Step 3: Commit**

```bash
git commit -m "chore(calibration): freeze 40w baseline for regression detection"
```

---

→ /simplify → commit

---

### Task 2: Regression comparison script
**Role:** Systems Programmer

**Files:**
- Create: `tools/calibrate_40w.cjs`
- Modify: `package.json` — add `calibrate:40w` script

**Step 1: Write the comparison script**

```javascript
// tools/calibrate_40w.cjs
// 1. Run 40w scenario
// 2. Load baseline from data/calibration/baseline_40w.json
// 3. Compare key metrics: territory within 2pp, benchmarks all pass, events fire in correct order
// 4. Print PASS/FAIL report with diffs
```

**Step 2: Add npm script**

```json
"calibrate:40w": "node tools/calibrate_40w.cjs"
```

**Step 3: Run it**

Run: `npm run calibrate:40w`
Expected: PASS (no changes since baseline)

**Step 4: Commit**

```bash
git commit -m "feat(calibration): npm run calibrate:40w — automated regression detection"
```

---

→ /simplify → commit

---

### Task 3: Event timing assertions
**Role:** Systems Programmer

**Files:**
- Create: `tests/event_timing.test.ts`

**Step 1: Write timing assertion tests**

```typescript
// tests/event_timing.test.ts
// Run a 40w scenario programmatically and assert event fire windows
import { describe, it, expect } from 'vitest';

describe('event timing windows (40w)', () => {
    // Load a pre-run summary or run inline
    // Assert: rs_strategic_goals fires w1-3
    // Assert: graz_accords fires w4-6
    // Assert: arms_embargo fires w3-8
    // Assert: sarajevo_siege fires w5-15
    // etc.
});
```

Note: This may need to read from a saved run rather than executing inline (40w takes ~10s). Consider reading from the baseline JSON.

**Step 2: Verify**

Run: `npx vitest run tests/event_timing.test.ts`

**Step 3: Commit**

```bash
git commit -m "test(calibration): event timing window assertions"
```

---

## Done Gate

- [ ] `data/calibration/baseline_40w.json` exists with frozen metrics
- [ ] `npm run calibrate:40w` runs and produces PASS/FAIL report
- [ ] Event timing tests assert key events fire within expected windows
- [ ] tsc clean, vitest passes

---

## Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions flagged for user review
- [ ] Napkin read at start, updated during work
- [ ] Ledger entry appended on completion
- [ ] Life lessons scanned, relevant ones flagged
- [ ] tsc + vitest after every phase
- [ ] /simplify between each phase
- [ ] Version bump + tag on milestone completion

## Completion Checklist

- [ ] Implementation report in `docs/40_reports/implemented/`
- [ ] Canon docs updated (if applicable)
- [ ] Master files updated (if applicable)
- [ ] VERSIONING.md milestone marked complete
- [ ] PROJECT_LEDGER.md entry appended
- [ ] Napkin updated

# Handoff Template Smoke Test — Implementation Report

**Date:** 2026-04-03
**Status:** IMPLEMENTED
**Scope:** Polish pass — template run resilience

---

## Problem

Running `TEMPLATE.md` directly produced a vague conversational response ("what do you want me to do?") because Claude had no unfilled-template instructions. The inbox artifact's summary field contained that confusion, making smoke-test runs indistinguishable from broken real runs.

## What Was Changed

### 1. `handoffs/TEMPLATE.md` — smoke test instruction block

Added an HTML comment at the top (invisible to normal use, read by Claude) that instructs: if the template is unfilled, return a structured `TEMPLATE_SMOKE_TEST` result and stop. No tool calls, no file reads, no questions.

Result from a template run is now exactly:
```
## Handoff pipeline smoke test — OK
- Model: claude-haiku-4-5-20251001
- Timestamp: 2026-04-03T...
- Status: TEMPLATE_SMOKE_TEST

The handoff pipeline is functional. No work was requested.
```

### 2. `tools/architect/run_handoff.ps1` — `is_smoke_test` tag in meta.json

Detects when the prompt filename is `TEMPLATE` (case-insensitive) and sets `is_smoke_test: true` in `meta.json`. Downstream tooling (list_handoffs, show_handoff, future automation) can filter or label these runs without ambiguity.

## Verification

Run:
```powershell
powershell -ExecutionPolicy Bypass -File tools/architect/run_handoff.ps1 `
    -PromptFile handoffs/TEMPLATE.md -Name template-smoke -Model haiku -MaxBudget 0.50
```

Result:
- `response.md`: structured smoke test result, not conversational
- `meta.json`: `is_smoke_test: true`
- `architect_review.json`: `status: needs_review`, summary populated
- Inbox artifact written
- Governance: OK

## Completion Block

```
Canonical owner:      handoffs/TEMPLATE.md + run_handoff.ps1
Demoted path:         Vague "what do you want me to do?" response on template runs
Player-visible truth: (workflow tooling)
Canonical UI surface: handoffs/inbox/ — smoke test runs now clearly labeled
Done means:           Template run returns TEMPLATE_SMOKE_TEST result; is_smoke_test
                      tagged in meta.json; inbox artifact is unambiguous
```

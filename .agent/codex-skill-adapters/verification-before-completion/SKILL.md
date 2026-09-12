---
name: verification-before-completion
description: Use before claiming work is complete, fixed, passing, or ready for integration.
---

# Verification Before Completion

Re-read the request and final diff, identify each claim that needs proof, and run the smallest fresh checks that directly establish those claims and every triggered project gate. Read the commands' own exits and failure counts. Reuse unaffected evidence explicitly; report inherited failures, omitted gates, and residuals accurately. Never let a focused check waive a separately required production gate.

## AWWV project source

In an AWWV checkout, read `.claude/skills/verification-before-completion/SKILL.md` there as the maintained project workflow, plus repository `AGENTS.md` and relevant Codex runtime instructions. Preserve required full-suite, 188-week, package/runtime, provenance, save-preservation, canon, and independent-review gates when their trigger applies; documentation-only work uses focused checks.

Outside AWWV, use the generic evidence rule above and the current project's required checks.

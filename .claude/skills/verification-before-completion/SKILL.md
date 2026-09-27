---
name: verification-before-completion
description: Use before claiming work is complete, fixed, passing, or ready for integration.
---

# Verification Before Completion

Base completion claims on fresh, relevant evidence.

1. Re-read the request, plan, and final diff; list the claims that require proof.
2. Select the smallest commands or observations that directly prove those claims and every triggered repository gate.
3. Run them on the final changed state, read their own exit status and failure counts, and retain evidence paths.
4. Report the actual result, including inherited or unresolved failures and gates not run.

Fresh means after the last change that could affect the evidence. Reuse unaffected evidence explicitly; do not rerun an unchanged expensive suite or campaign for reassurance. A focused check cannot waive a separately required full-suite, 188-week, package, runtime, provenance, save-preservation, or canon gate.

For documentation/process-only work, focused reference, link, Markdown/whitespace, and applicable governance checks are sufficient unless the changed document has a specific validator.

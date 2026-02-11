Perform a refactor pass focused on simplicity after recent changes.

## Scope

Review all files modified or created in the most recent work session (use `git diff --name-only` and `git diff --cached --name-only` to identify them).

## Checklist

For each file, check and fix:

1. **Dead code**: Remove unused imports, interfaces, types, functions, and variables. If something is only referenced by other dead code, remove the entire chain.

2. **Duplication**: If two or more blocks share near-identical logic, extract a shared helper. Name it clearly and co-locate it with the callers.

3. **Over-engineered stubs**: Remove functions that only wrap a single constant or trivially delegate. Inline the constant or call directly.

4. **Unnecessary complexity**: Simplify conditionals, flatten nested ifs, remove redundant guards. Prefer early returns.

5. **Backward-compat shims**: If old names were kept just for compatibility but nothing imports them, delete them entirely. No `_unused` variables or `// removed` comments.

## Verification

After all changes:

1. Run `npx tsc --noEmit` -- must pass clean
2. Run `npx vitest run` -- all tests must pass
3. If any test fails, investigate whether the refactor caused it or it was pre-existing

## Output

Summarize what was removed, extracted, or simplified in a brief report. Include before/after line counts if significant.

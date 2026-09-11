/**
 * Types for verify_quotes.mjs, so a TypeScript test can import it directly.
 *
 * The repo's other executor tools are `.cjs` and are loaded through `createRequire`. This one is
 * ESM, which TypeScript will not accept untyped — the pre-commit `tsc` refused the commit with
 * TS7016 rather than letting an implicit `any` through, which is the hook doing its job.
 */

/** Drop JSON escaping and markdown emphasis, collapse whitespace. */
export function normaliseForQuote(text: string): string;

/** Is `quote` present in `source`, allowing for escaping, wrapping and dropped emphasis? */
export function quoteIsReal(source: string | null, quote: string): boolean;

/** Every {quote, source} pair for `field`, walking the answer at any depth. */
export function collectQuotes(
  node: unknown,
  field: string,
  sourceField?: string | null,
  inherited?: string | null,
): Array<{ quote: string; source: string | null }>;

/**
 * Comment stripping for source-string assertions.
 *
 * WHY THIS EXISTS. A "must NOT appear" assertion over raw source reads PROSE AS IF IT WERE CODE,
 * and the prose most likely to mention a banned construct is the comment explaining why it is
 * banned. This bit twice on 2026-09-11, both times on a test's own explanation:
 *
 *   - `expect(css).not.toMatch(/--font-command:[^;]*Caveat/)` matched the CSS comment saying the
 *     marker font must not be routed through `--font-command`. `[^;]*` matches newlines, so it ran
 *     from mid-sentence into the declaration below.
 *   - `expect(source).not.toMatch(/Math\.random\(/)` matched the doc comment saying a
 *     `Math.random()` here would break determinism.
 *
 * Both assertions were correct about the code and wrong about the file. Strip the commentary and
 * they are correct about both.
 *
 * THE TRAP IN THE OTHER DIRECTION. Stripping `//` line comments naively also eats `https://` and
 * everything after it on the line — which would silently gut an assertion like "no remote font
 * URL appears in this file" and leave it passing against a file full of them. A negative test that
 * cannot fail is worse than no test. `withoutLineComments` therefore refuses to treat `//` as a
 * comment when it is preceded by `:`, and `withoutBlockComments` is the conservative default for
 * CSS, where `//` is not a comment at all.
 *
 * Use the narrowest one that covers the file: `withoutBlockComments` for CSS, `withoutComments`
 * for TS/TSX.
 */

/** Source with `/* ... *​/` comments removed. Safe for CSS, TS, TSX. */
export function withoutBlockComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Source with `//` line comments removed.
 *
 * A `//` immediately preceded by `:` is left alone, because that is a URL scheme separator and not
 * a comment. This is a heuristic, and deliberately the cautious one: it can leave a comment
 * standing, which makes a negative assertion fail loudly, rather than remove a URL, which would
 * make it pass silently.
 */
export function withoutLineComments(source: string): string {
  return source.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Source with both comment forms removed. For TS and TSX. */
export function withoutComments(source: string): string {
  return withoutLineComments(withoutBlockComments(source));
}

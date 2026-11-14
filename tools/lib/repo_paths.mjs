// Checkout-location-independent paths for repo tooling.
//
// The repo root comes from this file's own location, never from a hard-coded drive letter, so a
// tool keeps working when the checkout moves (e.g. F:\A-War-Without-Victory -> C:\Pyrrhic\...).
//
// Folders that live OUTSIDE the repo sit beside the MAIN checkout by default and can be moved with
// an environment variable:
//   AWWV_COORDINATION_ROOT  default <main checkout>/../AWWV-coordination  (render-proof evidence)
//   AWWV_WORKTREES_ROOT     default <main checkout>/../AWWV-worktrees     (disposable worktrees)
// "Main checkout" is resolved through `git rev-parse --git-common-dir`, so a tool run from a linked
// worktree (itself inside AWWV-worktrees) still resolves the same sibling folders as the main
// checkout. Without git, the default falls back to this checkout's parent folder.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of this checkout's root (tools/lib -> repo). */
export const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

let mainCheckoutRoot;

/** Root of the main checkout that owns this repository (equals REPO_ROOT outside a linked worktree). */
export function mainCheckout() {
  if (mainCheckoutRoot !== undefined) return mainCheckoutRoot;
  mainCheckoutRoot = REPO_ROOT;
  try {
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const resolved = path.resolve(REPO_ROOT, commonDir);
    if (path.basename(resolved) === '.git') mainCheckoutRoot = path.dirname(resolved);
  } catch {
    // Not a git checkout (or git unavailable): keep this checkout as the anchor.
  }
  return mainCheckoutRoot;
}

/** An out-of-repo folder: the env var when set, else `<main checkout>/../<folderName>`. */
export function externalRoot(envName, folderName) {
  const configured = String(process.env[envName] ?? '').trim();
  if (configured) return path.resolve(configured);
  return path.join(path.dirname(mainCheckout()), folderName);
}

/** Shared coordination evidence root (render proofs, surface steps). */
export function coordinationRoot() {
  return externalRoot('AWWV_COORDINATION_ROOT', 'AWWV-coordination');
}

/** Root folder for disposable linked worktrees. */
export function worktreesRoot() {
  return externalRoot('AWWV_WORKTREES_ROOT', 'AWWV-worktrees');
}

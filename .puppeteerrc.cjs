// AWWV — skip puppeteer's browser download on `npm install` (puppeteer v24 reads
// this via cosmiconfig: getConfiguration() → configuration.skipDownload).
//
// WHY: puppeteer (^24) is used ONLY by manual UI screenshot / browser-smoke tools
// (tools/ui/*.cjs, visual_validation captures) — NEVER by scenario / build /
// calibration / engine agents. Its postinstall browser fetch was FAILING in fresh
// git worktrees and SILENTLY KILLING isolated agents (cost hours of lost
// calibration / engine-health work, 2026-06-11). Skipping the download makes
// `npm install` in a fresh worktree reliable.
//
// The UI smoke tools still work: the main checkout already has a cached browser
// (~/.cache/puppeteer from the original install), and puppeteer resolves a
// system / on-demand browser when actually launched. Set PUPPETEER_SKIP_DOWNLOAD=0
// or PUPPETEER_EXECUTABLE_PATH if you ever need a fresh browser fetch.
//
// EH-1 tooling hardening (engine-health pivot).
module.exports = {
  skipDownload: true,
};

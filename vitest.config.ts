import { defineConfig } from 'vitest/config';
import { discoverTests, toRepoRelative } from './tools/test/discover_test_files.mjs';

const rootDir = process.cwd();
const discovered = discoverTests(rootDir);
const include = toRepoRelative(rootDir, discovered.vitestFiles);
const environmentMatchGlobs = discovered.jsdomVitestFiles.map((file) => [
  toRepoRelative(rootDir, [file])[0],
  'jsdom',
]);

export default defineConfig({
  test: {
    include,
    globals: false,
    environment: 'node',
    environmentMatchGlobs,
  }
});

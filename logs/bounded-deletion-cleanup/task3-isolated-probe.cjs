// Validation-only adapter: run the unchanged repository probe with an isolated Electron profile.
const cp = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const root = path.resolve(__dirname, '../..');
const profile = process.env.TASK3_PROBE_PROFILE || path.join(__dirname, 'task3-fresh-runtime-user-data');
fs.mkdirSync(profile, { recursive: true });
const originalSpawn = cp.spawn;
cp.spawn = function (file, args, options) {
  if (path.basename(file) === 'A War Without Victory.exe') {
    args = [...args, `--user-data-dir=${profile}`];
    console.log(JSON.stringify({ executable: file, args, profile }));
  }
  return originalSpawn.call(this, file, args, options);
};
syncBuiltinESMExports();
import(require('node:url').pathToFileURL(path.join(root, 'tools/desktop_packaged_runtime_probe.mjs')).href)
  .catch(error => { console.error(error); process.exitCode = 1; });

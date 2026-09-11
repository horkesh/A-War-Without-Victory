import fs from 'node:fs';
import { spawn } from 'node:child_process';
const [receipt, cwd, command, ...args] = process.argv.slice(2);
if (!receipt || !cwd || !command) throw new Error('Usage: receipt cwd command ...args');
const fd = fs.openSync(receipt, 'wx');
const write = (value) => fs.writeSync(fd, value);
const env = { ...process.env, PATH: `C:\\Users\\User\\AppData\\Local\\Volta\\tools\\image\\node\\22.23.2;C:\\Program Files\\Git\\bin;${process.env.PATH}` };
write(`COMMAND=${JSON.stringify({ cwd, command, args })}\nNODE_PATH=C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2\n`);
write(`RUN_ENV=${JSON.stringify({ AWWV_S6_GRADE_RUN: env.AWWV_S6_GRADE_RUN ?? null, provenanceOverridePresent: Boolean(env.AWWV_PROVENANCE_OVERRIDE) })}\n`);
const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', write);
child.stderr.on('data', write);
child.on('error', (err) => write(`LAUNCH_ERROR=${err.stack}\n`));
child.on('close', (code, signal) => {
  write(`\nEXIT_CODE=${code}\nSIGNAL=${signal}\n`);
  fs.closeSync(fd);
  console.log(JSON.stringify({ receipt, exitCode: code, signal }));
  process.exitCode = code ?? 1;
});

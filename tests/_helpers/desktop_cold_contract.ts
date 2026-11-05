/** Fresh-process execution proof; explicit canonical input and owned output only. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serialize} from 'node:v8';
import {advanceTurn,loadStateFromPath} from '../../src/desktop/desktop_sim.js';

async function main():Promise<void>{
const [root,input,output]=process.argv.slice(2);
if(!root||!input||!output)throw new Error('Expected explicit root, canonical save and output path');
const state=(await loadStateFromPath(input,root)).state;
const result=await advanceTurn(state,root);
if(result.error)throw new Error(result.error);
await writeFile(output,serialize({childPid:process.pid,canonicalSha256:createHash('sha256').update(await readFile(input)).digest('hex'),result}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

/** Fresh-process supported save loader for constructor-boundary regressions. */
import {writeFile} from 'node:fs/promises';
import {serialize} from 'node:v8';
import {loadStateFromPath} from '../../src/desktop/desktop_sim.js';
async function main():Promise<void>{
 const [root,input,output]=process.argv.slice(2);if(!root||!input||!output)throw Error('Expected root, canonical input and explicit output');
 const {state}=await loadStateFromPath(input,root);await writeFile(output,serialize({pid:process.pid,formations:state.military.formations}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

const fs=require('fs');
const A=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).frames;
const B=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).frames;
console.log('frames A='+A.length+' B='+B.length);
const N=Math.min(A.length,B.length);
let same=0,diff=[];
for(let i=0;i<N;i++){ if(JSON.stringify(A[i])===JSON.stringify(B[i])) same++; else diff.push(A[i].turn); }
console.log('turns 1..'+N+': identical='+same+' differing='+diff.length+(diff.length?' at '+diff.slice(0,10).join(','):''));
console.log('turn39 A:', JSON.stringify(A[38]));
console.log('turn39 B:', JSON.stringify(B[38]));

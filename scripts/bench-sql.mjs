import { performance } from 'node:perf_hooks';
import { gradeSouthOrderQuery } from '../lib/sql-sandbox.mjs';
const query="SELECT id, amount FROM orders WHERE region = 'south' AND amount >= 180 ORDER BY amount DESC";
for(let i=0;i<100;i++)gradeSouthOrderQuery(query);
const samples=[];for(let i=0;i<30;i++){const start=performance.now();for(let j=0;j<100;j++)gradeSouthOrderQuery(query);samples.push((performance.now()-start)/100)}samples.sort((a,b)=>a-b);console.log(JSON.stringify({workload:'SQL SELECT grade, 100 calls/batch, 30 warm batches',p50ms:samples[15],p95ms:samples[28],node:process.version}));

import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { ingestText } from '../lib/source-ingest.ts';
import { documentFromText } from '../lib/source-document.ts';
import { normalizeSourceText } from '../lib/source-course.ts';
import { gradeSouthOrderQuery, gradeTierRevenueQuery } from '../lib/sql-sandbox.mjs';
const paragraph='Dữ liệu huấn luyện dùng để học tham số. Validation chọn cấu hình, còn test giữ độc lập. Vector biểu diễn đặc trưng; emoji 🧠 không được tách sai.\n\n';
const long=paragraph.replace(/\n/g,' ').repeat(Math.ceil(118000/paragraph.length)+1).slice(0,118000);
const markdown=Array.from({length:60},(_,i)=>`# Mục ${i+1}\n\n${paragraph.repeat(8)}`).join('\n');
const workloads=[
 ['normalize-118k',()=>normalizeSourceText(long)],
 ['ingest-118k',()=>ingestText(long)],
 ['coverage-118k',()=>documentFromText('bench','Nguồn tổng hợp',long)],
 ['coverage-60-headings',()=>documentFromText('bench','Nguồn tổng hợp',markdown)],
 ['grade-select',()=>gradeSouthOrderQuery("SELECT id, amount FROM orders WHERE region = 'south' AND amount >= 180 ORDER BY amount DESC")],
 ['grade-join-aggregate',()=>gradeTierRevenueQuery("SELECT customers.tier, COUNT(*) AS order_count, SUM(orders.amount) AS revenue FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.status = 'paid' GROUP BY customers.tier ORDER BY revenue DESC")]
];
const results=[];
for(const [name,run] of workloads){for(let i=0;i<10;i++)run();const samples=[];for(let i=0;i<30;i++){const start=performance.now();const value=run();samples.push(performance.now()-start);assert.ok(value);}samples.sort((a,b)=>a-b);results.push({name,p50ms:samples[14],p95ms:samples[28],maxms:samples[29]});}
console.log(JSON.stringify({node:process.version,samples:30,warmup:10,scope:'Synthetic CPU only, not browser INP, PDF decoding, network or Android; no performance claim from one run.',results},null,2));

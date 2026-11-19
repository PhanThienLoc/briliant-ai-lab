import test from "node:test";
import assert from "node:assert/strict";
import {importArticle,validateArticleUrl,extractArticleHtml} from "../lib/article-import.ts";
const prose="A training dataset is used to fit a model. Validation data selects a configuration. Test data is kept separate. ".repeat(6);
test("article importer rejects non-public and unsupported origins before any fetch",async()=>{
 for(const url of ["http://medium.com/post","https://127.0.0.1/x","https://[::1]/x","https://localhost/x","https://user:pass@medium.com/x","https://medium.com.evil.example/x","https://medium.com:8443/x","file:///etc/passwd"]){
  await assert.rejects(()=>importArticle(url,()=>{throw Error("must not fetch")}));
 }
 assert.equal(validateArticleUrl("https://medium.com/post#part").href,"https://medium.com/post");
});
test("redirects are checked individually and unsupported final URLs never get fetched",async()=>{
 const calls=[];await assert.rejects(()=>importArticle("https://medium.com/post",async url=>{calls.push(url);return new Response("",{status:302,headers:{location:"https://127.0.0.1/secret"}})}));
 assert.equal(calls.length,1);
});
test("public plain text imports without scripts or credentials and reports truncation",async()=>{
 const r=await importArticle("https://docs.python.org/test",async(url,init)=>{assert.equal(init.credentials,"omit");assert.equal(init.redirect,"manual");assert.equal(init.headers.Authorization,undefined);return new Response("x".repeat(120050),{headers:{"content-type":"text/plain"}})});
 assert.equal(r.text.length,120000);assert.equal(r.truncated,true);
});
test("paywalls, PDFs, oversized pages, absent text and internal errors fail safely",async()=>{
 for(const response of [
 new Response("",{status:403}),new Response("pdf",{headers:{"content-type":"application/pdf"}}),
 new Response("",{headers:{"content-type":"text/plain","content-length":"2000000"}}),
 new Response("short",{headers:{"content-type":"text/plain"}})
 ]) await assert.rejects(()=>importArticle("https://medium.com/post",async()=>response));
 await assert.rejects(()=>importArticle("https://medium.com/post",async()=>{throw Error("internal secret ref=123")}),e=>!e.message.includes("secret"));
});
test("native Worker HTML extraction keeps article prose and drops navigation and scripts",async()=>{
 const {Miniflare}=await import("miniflare");
 const clean=(text)=>text.replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/[ \t]*\n[ \t]*/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
 const mf=new Miniflare({modules:true,compatibilityDate:"2026-05-15",script:`const clean=${clean.toString()}; const extractArticleHtml=${extractArticleHtml.toString()}; export default {async fetch(request){return Response.json(await extractArticleHtml(await request.text()));}}`});
 try{const r=await mf.dispatchFetch("https://local.test",{method:"POST",body:`<html><head><title>Training</title></head><body><nav>NEVER SEND</nav><article><p>${prose}</p>AFTER PARAGRAPH<h2>Heading</h2>AFTER HEADING<br>AFTER BREAK<script>STEAL KEY</script></article></body></html>`});const v=await r.json();assert.equal(v.title,"Training");assert.match(v.text,/training dataset/);assert.doesNotMatch(v.text,/NEVER SEND|STEAL KEY/);assert.match(v.text,/\.\n\nAFTER PARAGRAPH\n\nHeading\n\nAFTER HEADING\n\nAFTER BREAK/);}
 finally{await mf.dispose();}
});

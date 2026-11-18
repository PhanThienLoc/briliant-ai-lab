import assert from 'node:assert/strict';
import test from 'node:test';
import { requestTeachingText, validateAiConfig, readBoundedText } from '../lib/ai-provider.ts';
import { POST } from '../app/api/ai-course/route.ts';
const config={provider:'openrouter',apiKey:'test-secret-key',model:'openrouter/free',geminiFreeTier:false};
const openResult = (overrides={}) => new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"title":"Example"}'}}],...overrides}));

test('OpenRouter request is free-only, bounded and single attempt',async()=>{
 let calls=0;
 const text=await requestTeachingText(config,'source approved',async(url,init)=>{
  calls++;
  assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');
  assert.ok(!url.includes(config.apiKey));
  assert.equal(init.redirect,'error');
  assert.equal(init.headers.Authorization,'Bearer test-secret-key');
  const body=JSON.parse(init.body);
  assert.deepEqual(body.provider,{max_price:{prompt:0,completion:0,request:0},allow_fallbacks:false});
  assert.equal(body.model,'openrouter/free');assert.equal(body.max_tokens,6000);
  assert.equal(body.tools,undefined);assert.equal(body.plugins,undefined);assert.equal(body.models,undefined);
  return openResult();
 });
 assert.equal(text,'{"title":"Example"}');assert.equal(calls,1);
});
test('reject paid models, unknown endpoints/providers and oversized prompt without calling fetch',async()=>{
 for(const next of [{...config,model:'paid/model'},{...config,provider:'other'},{...config,endpoint:'https://bad.example'}, {...config,apiKey:'x\ny'}, {...config,apiKey:'x'.repeat(513)}]){
  assert.throws(()=>validateAiConfig(next));
  await assert.rejects(requestTeachingText(next,'hello',()=>{throw new Error('must not call');}));
 }
 await assert.rejects(requestTeachingText(config,'x'.repeat(22001),()=>{throw new Error('must not call');}));
});
test('Gemini needs a free-tier declaration and sends key in header only',async()=>{
 const gemini={...config,provider:'gemini',model:'gemini-2.5-flash-lite',geminiFreeTier:true};
 assert.throws(()=>validateAiConfig({...gemini,geminiFreeTier:false}),/Free Tier/);
 const text=await requestTeachingText(gemini,'source approved',async(url,init)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent');
  assert.ok(!url.includes(gemini.apiKey));assert.equal(init.headers['x-goog-api-key'],gemini.apiKey);
  assert.equal(JSON.parse(init.body).tools,undefined);
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'{}'}]}}]}));
 });
 assert.equal(text,'{}');
});
test('quota, payment, transport and truncation fail without retries or secret reflection',async()=>{
 for(const status of [401,402,429,500]){
  let count=0;
  await assert.rejects(requestTeachingText(config,'hello',async()=>{count++;return new Response(config.apiKey,{status});}),error=>!error.message.includes(config.apiKey));
  assert.equal(count,1);
 }
 await assert.rejects(requestTeachingText(config,'hello',async()=>{throw new Error('API key test-secret-key');}),error=>!error.message.includes(config.apiKey));
 for(const data of [
  {choices:[{finish_reason:'length',message:{content:'partial'}}]},
  {choices:[{finish_reason:'stop',message:{content:'text',refusal:'no'}}]},
  {error:{message:config.apiKey}},
 ]) await assert.rejects(requestTeachingText(config,'hello',async()=>new Response(JSON.stringify(data))),error=>!error.message.includes(config.apiKey));
 await assert.rejects(readBoundedText(new Response('x'.repeat(101)),100),/giới hạn/);
});
test('Gemini refuses blocked, partial or nontext output',async()=>{
 const g={...config,provider:'gemini',model:'gemini-2.5-flash-lite',geminiFreeTier:true};
 for(const data of [{promptFeedback:{blockReason:'SAFETY'}},{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]},{candidates:[{finishReason:'STOP',content:{parts:[{functionCall:{name:'x'}}]}}]}]) await assert.rejects(requestTeachingText(g,'hello',async()=>new Response(JSON.stringify(data))));
});
test('route rejects cross-origin, missing origin, wrong media, invalid config and oversized body before generation',async()=>{
 const req=(body,headers={})=>new Request('https://app.example/api/ai-course',{method:'POST',headers:{origin:'https://app.example','content-type':'application/json',...headers},body});
 for(const origin of ['https://evil.example','null','']) assert.equal((await POST(req('{}',{origin}))).status,403);
 assert.equal((await POST(req('{}',{'content-type':'text/plain'}))).status,415);
 const invalid=await POST(req(JSON.stringify({config:{...config,model:'paid/model'},prompt:'hello'})));
 assert.equal(invalid.status,400);assert.ok(!(await invalid.text()).includes(config.apiKey));
 assert.equal((await POST(req('x'.repeat(35001)))).status,400);
 const response=await POST(req('{}'));
 assert.equal(response.headers.get('cache-control'),'no-store');
});

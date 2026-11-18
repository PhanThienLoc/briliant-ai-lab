import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSourceDocument, documentFromText, validateEvidence, formatLocator} from '../lib/source-document.ts';
const block=(ordinal,text)=>({ordinal,text,locator:{kind:'section',path:['Nguồn'],ordinal}});

test('all twelve sections remain deterministic with distinct repeated headings',()=>{
 const text=Array.from({length:12},(_,i)=>`## Mục lặp\nNội dung ${i}.`).join('\n\n');
 const doc=documentFromText('id','Tên nguồn',text);
 assert.equal(doc.sections.length,12);
 assert.equal(new Set(doc.sections.map(s=>s.id)).size,12);
 assert.deepEqual(documentFromText('id','Tên nguồn',text),doc);
 assert.deepEqual(doc.sections.map(s=>s.locator.ordinal),Array.from({length:12},(_,i)=>i+1));
 assert.equal(doc.sections.map(s=>s.text).join(''),text);
});
test('long source blocks split without losing any text or splitting surrogate pairs',()=>{
 const text=('Câu có nghĩa tiếng Việt. Toán học x ≠ 0. 😀\n').repeat(250);
 const doc=buildSourceDocument({id:'math',name:'Toán',blocks:[block(3,text)]});
 assert.ok(doc.sections.length>1);
 assert.ok(doc.sections.every(s=>s.text.length<=4000));
 assert.equal(doc.sections.map(s=>s.text).join(''),text);
 assert.ok(doc.sections.every(s=>s.locator.ordinal===3));
 const token='😀'.repeat(3000);const d=buildSourceDocument({id:'emoji',name:'Emoji',blocks:[block(1,token)]});
 assert.equal(d.sections.map(s=>s.text).join(''),token);
 assert.ok(d.sections.every(s=>!/[\uD800-\uDBFF]$/.test(s.text)));
});
test('exact references preserve Vietnamese, negation, numeric values and mathematical operators',()=>{
 const doc=buildSourceDocument({id:'exact',name:'Trích dẫn',blocks:[block(1,'Xác suất không vượt 0.25 khi x ≠ 0.\nGiá trị là 25%.')]});
 const sectionId=doc.sections[0].id;
 for(const quote of ['Xác suất không vượt 0.25 khi x ≠ 0.','0.25 khi x ≠ 0. Giá trị là 25%.']) assert.equal(validateEvidence(doc,{sectionId,quote}),true);
 for(const quote of ['Xác suất vượt 0.25','0.35','x = 0','', 'giá trị là 25%.']) assert.equal(validateEvidence(doc,{sectionId,quote}),false);
 assert.equal(validateEvidence(doc,{sectionId:'missing',quote:'25%'}),false);
});
test('limits reject excess sections or characters rather than silently sampling',()=>{
 assert.throws(()=>buildSourceDocument({id:'large',name:'Large',blocks:Array.from({length:201},(_,i)=>block(i+1,'Text'))}),/200 mục/);
 assert.throws(()=>buildSourceDocument({id:'large',name:'Large',blocks:[block(1,'x'.repeat(120001))]}),/120.000/);
 assert.throws(()=>documentFromText('large','Large','x'.repeat(120001)),/120.000/);
 assert.throws(()=>buildSourceDocument({id:'dup',name:'Dup',blocks:[block(1,'one'),block(1,'two')]}),/vị trí/);
});
test('physical pages retain gaps and exact page labels in displayed locators',()=>{
 const doc=documentFromText('pdf','PDF','Trang 1\nFirst page.\n\nTrang 3\nThird page.');
 assert.deepEqual(doc.sections.map(s=>s.locator),[{kind:'page',first:1,last:1},{kind:'page',first:3,last:3}]);
 assert.equal(formatLocator(doc.sections[1].locator),'Trang vật lý 3');
});
test('overlapping SRT and VTT cues retain separate exact time references',()=>{
 for(const text of ['1\r\n00:00:01,000 --> 00:00:04,000\r\nĐoạn trùng.\r\n\r\n2\r\n00:00:03,000 --> 00:00:05,250\r\nĐoạn trùng.','WEBVTT\n\n00:01.000 --> 00:04.000\nĐoạn trùng.\n\n00:03.000 --> 00:05.250 align:start\nĐoạn trùng.']){
  const doc=documentFromText('video','Video',text);
  assert.equal(doc.sections.length,2);assert.notEqual(doc.sections[0].id,doc.sections[1].id);
  assert.deepEqual(doc.sections.map(s=>s.locator),[{kind:'time',startMs:1000,endMs:4000},{kind:'time',startMs:3000,endMs:5250}]);
  assert.equal(doc.sections[1].text,'Đoạn trùng.');
  assert.equal(formatLocator(doc.sections[1].locator),'00:00:03.000–00:00:05.250');
 }
});
test('plain paragraphs and heading hierarchy preserve source words and stable locators',()=>{
 const text='Mở đầu.\n\n# Đại số\nMệnh đề.\n\n### Vector\nVector ≠ scalar.\n\n## Ma trận\nNội dung.';
 const doc=documentFromText('tree','Tree',text);
 assert.equal(doc.sections.map(s=>s.text).join(''),text);
 assert.deepEqual(doc.sections.map(s=>s.locator.path),[['Mở đầu'],['Đại số'],['Đại số','Vector'],['Đại số','Ma trận']]);
 assert.match(formatLocator(doc.sections[2].locator),/Đại số › Vector/);
 const prose='Một.\n\nHai.\n\nBa.';assert.equal(documentFromText('p','P',prose).sections.map(s=>s.text).join(''),prose);
});
test('invalid timestamps and locator inputs fail rather than producing misleading references',()=>{
 assert.throws(()=>documentFromText('t','T','00:00:05,000 --> 00:00:04,000\nBad'),/kết thúc/);
 assert.throws(()=>buildSourceDocument({id:'p',name:'P',blocks:[{ordinal:1,text:'Text',locator:{kind:'page',first:0,last:0}}]}),/vị trí/);
});


test('zero-duration cue rejects and trailing separators never become empty sections',()=>{
 assert.throws(()=>documentFromText('t','T','00:00:05,000 --> 00:00:05,000\nBad'),/kết thúc/);
 assert.throws(()=>buildSourceDocument({id:'t',name:'T',blocks:[{ordinal:1,text:'Text',locator:{kind:'time',startMs:1,endMs:1}}]}),/vị trí/);
 const text='a'.repeat(3990)+'. '+ ' '.repeat(30);
 const doc=buildSourceDocument({id:'space',name:'Space',blocks:[block(1,text)]});
 assert.equal(doc.sections.map(s=>s.text).join(''),text);
 assert.ok(doc.sections.every(s=>s.text.trim() && s.text.length<=4000));
});

test("same-level headings without a level-one parent stay siblings", () => {
  const doc = documentFromText("siblings", "Source", "## First\nOne.\n## Second\nTwo.");
  assert.deepEqual(doc.sections.map(s => s.locator.path), [["First"], ["Second"]]);
});

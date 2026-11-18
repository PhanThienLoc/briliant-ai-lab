import assert from 'node:assert/strict';
import test from 'node:test';
import { readSourceFile, ingestText, ingestToText } from '../lib/source-ingest.ts';
const file = () => new File(['fixture'], 'fixture.pdf');
const range = {first:'1',last:''};
function fixture(pages, failure) {
 let destroyed=0;
 return {loader:async()=>({numPages:pages.length,getPage:async n=>{if(failure)throw Error('page failed');return {getTextContent:async()=>({items:[{str:pages[n-1]}]})}},destroy:async()=>{destroyed++}}), destroyed:()=>destroyed};
}
test('physical page locators and empty pages remain distinct',async()=>{
 const pdf=fixture(['first','','third']);const r=await readSourceFile(file(),range,pdf.loader);
 assert.deepEqual(r.blocks.map(b=>b.locator),[{kind:'page',first:1,last:1},{kind:'page',first:3,last:3}]);
 assert.deepEqual(r.emptyUnits,[2]);assert.equal(r.selectedUnits,3);assert.equal(r.processedUnits,3);assert.equal(r.truncated,false);assert.equal(pdf.destroyed(),1);
 assert.match(ingestToText(r),/Trang 3\nthird/);
});
test('character cap explicitly reports partial last page and unread pages',async()=>{
 const pdf=fixture(['x'.repeat(120001),'unread']);const r=await readSourceFile(file(),range,pdf.loader);
 assert.equal(ingestToText(r).length,120000);assert.equal(r.truncated,true);assert.equal(r.processedUnits,1);assert.equal(r.lastProcessedUnit,1);assert.equal(pdf.destroyed(),1);
});
test('document cleanup runs on invalid range, page failure, and scanned document',async()=>{
 for(const [pdf,r,pattern] of [[fixture(['a']),{first:'2',last:''},/trang/],[fixture(['a'],true),range,/page failed/],[fixture(['','']),range,/OCR/]]){
  await assert.rejects(readSourceFile(file(),r,pdf.loader),pattern);assert.equal(pdf.destroyed(),1);
 }
});
test('oversize and unsupported input fail before loading',async()=>{
 let calls=0;const loader=async()=>{calls++;throw Error('not called')};
 await assert.rejects(readSourceFile({name:'a.pdf',size:31*1024*1024},range,loader),/30 MB/);
 await assert.rejects(readSourceFile(new File(['a'],'a.exe'),range,loader),/Hỗ trợ/);assert.equal(calls,0);
});
test('encrypted/corrupt loader failures receive actionable guidance',async()=>{
 for(const [name,pattern] of [['PasswordException',/mật khẩu/],['InvalidPDFException',/hỏng/]]) await assert.rejects(readSourceFile(file(),range,async()=>{throw {name}}),pattern);
});
test('paste and text file paths expose truncation and source ordinals',async()=>{
 const r=ingestText('one\n\nthree');assert.equal(r.blocks[1].ordinal,2);assert.equal(r.selectedUnits,2);
 const t=await readSourceFile(new File(['a'.repeat(120001)],'a.txt'),range);assert.equal(t.truncated,true);assert.equal(t.blocks[0].text.length,120000);
});

// Self-contained PDF with a real xref table: page 2 is intentionally empty.
function tinyPdf() {
 const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>',
  ...[6,7,8].map(stream=>`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 9 0 R >> >> /Contents ${stream} 0 R >>`),
  ...['BT /F1 12 Tf 20 100 Td (First page) Tj ET','','BT /F1 12 Tf 20 100 Td (Third page) Tj ET'].map(s=>`<< /Length ${s.length} >>\nstream\n${s}\nendstream`),
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
 ];
 let pdf='%PDF-1.4\n',offsets=[0];
 objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
 const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
 offsets.slice(1).forEach(o=>{pdf+=`${String(o).padStart(10,'0')} 00000 n \n`});
 pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new File([pdf],'real-fixture.pdf');
}
test('actual PDF.js extracts generated three-page fixture preserving physical gaps',async()=>{
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const actualLoader=async data=>getDocument({data,useSystemFonts:true}).promise;
 const result=await readSourceFile(tinyPdf(),range,actualLoader);
 assert.equal(result.selectedUnits,3);assert.equal(result.processedUnits,3);
 assert.deepEqual(result.emptyUnits,[2]);assert.deepEqual(result.blocks.map(b=>b.locator.first),[1,3]);
 assert.equal(result.blocks[0].text,'First page');assert.equal(result.blocks[1].text,'Third page');
});

test('text projection preserves SRT, headings, whitespace and CRLF exactly',()=>{
 const source='WEBVTT\r\n\r\n00:00:00.000 --> 00:00:03.000\r\ntext\r\n\r\n# Repeated heading\n\ntext';
 assert.equal(ingestToText(ingestText(source)),source);
});

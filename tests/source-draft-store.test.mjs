import assert from 'node:assert/strict';
import test from 'node:test';
import { SOURCE_COURSES_KEY } from '../lib/source-course.ts';
import { SOURCE_DRAFTS_KEY, parseCoverageDrafts, readCoverageDrafts, saveCoverageDraft, deleteCoverageDraft } from '../lib/source-draft-store.ts';

function fixture(id = 'draft-one') {
  return {
    version: 2, id, title: 'Nguồn cần học', kind: 'article',
    document: { id: 'document-one', name: 'Tài liệu', sections: Array.from({length: 12}, (_, i) => ({
      id: `section-${i + 1}`, text: `Đây là phần ${i + 1} với số liệu riêng và nhận định cần kiểm chứng.`,
      locator: { kind: 'section', path: ['Chương 1', 'Mục lặp'], ordinal: i + 1 },
    })) },
    selectedSectionIds: ['section-1', 'section-12'],
    coverage: { selectedUnits: 12, processedUnits: 12, emptyUnits: [], truncated: false, lastProcessedUnit: 12 },
    updatedAt: '2026-11-19T00:00:00Z',
  };
}
function memory() {
  const values = new Map([[SOURCE_COURSES_KEY, 'original course/evidence bytes']]);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key) };
}
test('coverage draft round-trip retains all twelve sections, selection and v1 bytes', () => {
  const store = memory(); const draft = fixture();
  assert.deepEqual(readCoverageDrafts(() => store), { drafts: [], error: null });
  saveCoverageDraft(store, draft);
  assert.deepEqual(readCoverageDrafts(() => store), { drafts: [draft], error: null });
  assert.equal(store.getItem(SOURCE_COURSES_KEY), 'original course/evidence bytes');
  draft.title = ''; draft.selectedSectionIds = [];
  saveCoverageDraft(store, draft);
  assert.deepEqual(parseCoverageDrafts(store.getItem(SOURCE_DRAFTS_KEY)), [draft]);
});
test('updates replace only matching draft and delete leaves unrelated drafts and old course bytes intact', () => {
  const store = memory(); saveCoverageDraft(store, fixture('a')); saveCoverageDraft(store, fixture('b'));
  const changed = fixture('a'); changed.title = 'Revised'; saveCoverageDraft(store, changed);
  const all = parseCoverageDrafts(store.getItem(SOURCE_DRAFTS_KEY));
  assert.equal(all.length, 2); assert.equal(all.find(d => d.id === 'a').title, 'Revised');
  deleteCoverageDraft(store, 'a');
  assert.deepEqual(parseCoverageDrafts(store.getItem(SOURCE_DRAFTS_KEY)).map(d => d.id), ['b']);
  assert.equal(store.getItem(SOURCE_COURSES_KEY), 'original course/evidence bytes');
});
test('invalid nested shapes reject before writing and preserve the previous saved bytes', () => {
  const mutations = [
    d => d.version = 1, d => d.id = '', d => d.kind = 'audio', d => d.updatedAt = 'not-a-date',
    d => d.sourceUrl = 'javascript:alert(1)', d => d.title = 'a'.repeat(101),
    d => d.document.id = '', d => d.document.name = ' ', d => d.document.sections = [],
    d => d.document.sections.push(d.document.sections[0]), d => d.document.sections[0].text = ' ',
    d => d.document.sections[0].text = 'a'.repeat(4001),
    d => d.document.sections[0].locator = {kind:'section', path:[], ordinal:1},
    d => d.document.sections[0].locator = {kind:'page',first:3,last:2},
    d => d.document.sections[0].locator = {kind:'time',startMs:1,endMs:0},
    d => d.document.sections[0].locator = {kind:'section',path:['a'],ordinal:0},
    d => d.selectedSectionIds.push('missing'), d => d.selectedSectionIds.push('section-1'),
    d => d.coverage.processedUnits = 13, d => d.coverage.emptyUnits = [1,1],
    d => d.coverage.emptyUnits = [13], d => d.coverage.truncated = 'false',
    d => d.coverage.lastProcessedUnit = -1,
  ];
  for (const mutate of mutations) {
    const store = memory(); saveCoverageDraft(store, fixture()); const before = store.getItem(SOURCE_DRAFTS_KEY);
    const broken = fixture(); mutate(broken);
    assert.throws(() => saveCoverageDraft(store, broken));
    assert.equal(store.getItem(SOURCE_DRAFTS_KEY), before);
  }
});
test('document section, text and draft limits reject oversized records', () => {
  const tooMany = fixture(); tooMany.document.sections = Array.from({length:201},(_,i)=>({...tooMany.document.sections[0],id:`s${i}`})); tooMany.selectedSectionIds=[];
  assert.throws(()=>parseCoverageDrafts(JSON.stringify([tooMany])));
  const tooLong = fixture(); tooLong.document.sections = Array.from({length:31},(_,i)=>({...tooLong.document.sections[0],id:`s${i}`,text:'x'.repeat(4000)})); tooLong.selectedSectionIds=[];
  assert.throws(()=>parseCoverageDrafts(JSON.stringify([tooLong])));
  const store = memory(); for(let i=0;i<10;i++) saveCoverageDraft(store, fixture(`draft-${i}`));
  const before = store.getItem(SOURCE_DRAFTS_KEY);
  assert.throws(()=>saveCoverageDraft(store,fixture('eleven')));
  assert.equal(store.getItem(SOURCE_DRAFTS_KEY),before);
  assert.throws(()=>parseCoverageDrafts(JSON.stringify([fixture(),fixture()])));
});
test('corrupt data, denied reads and storage quota errors fail closed without overwriting bytes', () => {
  for (const raw of ['{','null','{}','x'.repeat(2_000_001)]) {
    const store = memory(); store.setItem(SOURCE_DRAFTS_KEY, raw);
    assert.equal(readCoverageDrafts(()=>store).drafts,null); assert.ok(readCoverageDrafts(()=>store).error);
    assert.throws(()=>saveCoverageDraft(store,fixture())); assert.throws(()=>deleteCoverageDraft(store,'draft-one'));
    assert.equal(store.getItem(SOURCE_DRAFTS_KEY),raw);
  }
  assert.ok(readCoverageDrafts(()=>{throw Error('denied')}).error);
  const store = memory(); saveCoverageDraft(store,fixture()); const before=store.getItem(SOURCE_DRAFTS_KEY);
  const full = {getItem:store.getItem,setItem(){throw Error('quota')}};
  assert.throws(()=>saveCoverageDraft(full,fixture('new')),/bộ nhớ/);
  assert.throws(()=>deleteCoverageDraft(full,'draft-one'),/bộ nhớ/);
  assert.equal(store.getItem(SOURCE_DRAFTS_KEY),before);
});
test('PDF physical page ranges and overlapping transcript times are valid independent locators',()=>{
  const d=fixture(); d.document.sections[0].locator={kind:'page',first:5,last:6};
  d.document.sections[1].locator={kind:'time',startMs:500,endMs:2000};
  d.document.sections[2].locator={kind:'time',startMs:1000,endMs:2500};
  d.coverage={selectedUnits:3,processedUnits:3,emptyUnits:[6],truncated:false,lastProcessedUnit:7};
  assert.deepEqual(parseCoverageDrafts(JSON.stringify([d])),[d]);
});

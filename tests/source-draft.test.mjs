import assert from 'node:assert/strict';
import test from 'node:test';
import * as studio from '../lib/source-course.ts';
const text = ['gradient', 'validation', 'features', 'loss', 'bias', 'weights', 'scaling'].map((topic, i) => `Section ${i}: Understanding ${topic} requires examining a concrete input and tracing the resulting output carefully. The example about ${topic} shows why a measured change must be compared with an independent baseline. Another observation about ${topic} can then be checked without confusing the training evidence with an unseen evaluation.`).join('\n\n');
const draft = () => studio.buildSourceCourse({title:'Draft',kind:'article',text,sourceName:'Source A'});
test('draft selection preserves source order, stable identities and evidence while editing learning goals', () => {
 assert.equal(typeof studio.finalizeSourceDraft, 'function');
 const source = draft(); const before = JSON.stringify(source);
 const ids = [source.lessons[2].id,source.lessons[0].id];
 const result = studio.finalizeSourceDraft(source, ids, {[ids[0]]:{title:'Compare validation outcomes',objective:'Explain why an unseen sample is necessary.'}});
 assert.deepEqual(result.lessons.map(x=>x.id), [source.lessons[0].id,source.lessons[2].id]);
 assert.equal(result.lessons[1].title,'Compare validation outcomes');
 assert.equal(result.lessons[1].excerpt,source.lessons[2].excerpt);
 assert.deepEqual(result.lessons[1].options,source.lessons[2].options);
 assert.equal(JSON.stringify(source),before);
 assert.equal(studio.parseSourceCourses(JSON.stringify([result])).length,1);
});
test('draft cannot publish fewer than two lessons, unknown selections, empty goals or unsupported answers', () => {
 assert.equal(typeof studio.finalizeSourceDraft, 'function');
 const source = draft(); const ids = source.lessons.map(x=>x.id);
 assert.throws(()=>studio.finalizeSourceDraft(source,[ids[0]],{}),/ít nhất 2/);
 assert.throws(()=>studio.finalizeSourceDraft(source,[ids[0],'unknown'],{}),/không tồn tại/);
 assert.throws(()=>studio.finalizeSourceDraft(source,ids,{[ids[0]]:{title:' ',objective:'Valid goal'}}),/tên bài/);
 const broken = structuredClone(source); broken.lessons[0].options[broken.lessons[0].answer]='A claim absent from this source.';
 assert.throws(()=>studio.finalizeSourceDraft(broken,ids,{}),/dẫn chứng/);
});

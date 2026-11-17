import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryLearningRepository } from '../lib/learning-repository.ts';
import { projectConceptEvidence } from '../lib/concept-evidence.ts';
import { evaluateAdaptiveMastery } from '../lib/adaptive-mastery.ts';
import { buildTodayQueue } from '../lib/today-queue.ts';
import { initialLessonProgress } from '../lib/mastery-engine.ts';
import { emptyExpansionProgress, completeExpansionLab } from '../lib/expansion-progress.ts';
const now = new Date('2026-09-05T00:00:00Z');
const completed = ['frame-predict','frame-mechanism','frame-explain','frame-code','frame-transfer'];
async function project(lesson, expansion = emptyExpansionProgress, clock = now) {
 const repo = createMemoryLearningRepository({ lessons: {'problem-frame':lesson}, expansion, repairs:[], history:[], diagnostic:null, warnings:[], adaptive:{schemaVersion:1,sessionMinutes:30,lastGeneratedAt:null,lastQueueIds:[]} });
 return projectConceptEvidence(await repo.readSnapshot(clock),clock).map(c=>evaluateAdaptiveMastery(c,clock));
}
test('legacy completed lesson without explicit review reaches due queue through repository',async()=>{
 const concepts = await project({...initialLessonProgress,completed,practicedAt:'2026-09-01T00:00:00Z'});
 assert.equal(concepts[0].state,'review_due');
 assert.ok(buildTodayQueue({now,budgetMinutes:30,concepts,repairs:[]}).items.some(i=>i.type==='review' && i.target.id==='problem-frame'));
});
test('hinted standard practice and delayed pass cannot establish mastery',async()=>{
 const concepts = await project({...initialLessonProgress,completed,hintLevels:{'frame-predict':1},practicedAt:'2026-09-01T00:00:00Z',review:{dueAt:'2026-09-04T00:00:00Z',completedAt:'2026-09-04T00:00:00Z',correct:true,attempts:1}});
 assert.equal(concepts[0].state,'learning');
});
test('expansion independent retry retains hint history and requires a fresh delay',async()=>{
 let p=completeExpansionLab(emptyExpansionProgress,'logic-truth-table',Date.parse('2026-09-01T00:00:00Z'),1);
 p={...p,reviews:{'logic-truth-table':{dueAt:'2026-09-04T00:00:00Z',passedAt:'2026-09-04T00:00:00Z',attempts:1}}};
 assert.notEqual((await project(initialLessonProgress,p)).find(c=>c.id==='logic-truth-table').state,'mastered');
 p=completeExpansionLab(p,'logic-truth-table',now.getTime(),0);
 assert.ok(p.hintedLabIds.includes('logic-truth-table'));
 assert.equal(p.reviews['logic-truth-table'].passedAt,undefined);
 assert.equal(p.reviews['logic-truth-table'].dueAt,'2026-09-08T00:00:00.000Z');
 assert.equal((await project(initialLessonProgress,p)).find(c=>c.id==='logic-truth-table').evidence.practice.status,'met');
});

test('R0 independent retry retains canonical history and invalidates earlier retrieval',async()=>{
 const {recordLessonAttempt}=await import('../lib/mastery-engine.ts');
 const p={...initialLessonProgress,completed,attempts:{'frame-predict':2},hintLevels:{'frame-predict':1},activityEvidence:{'frame-predict':{completedAt:'2026-09-01T00:00:00Z',attempts:2,hintsUsed:1}},practicedAt:'2026-09-01T00:00:00Z',review:{dueAt:'2026-09-04T00:00:00Z',completedAt:'2026-09-04T00:00:00Z',correct:true,attempts:1}};
 const failed=recordLessonAttempt(p,'frame-predict',false,5,0,now);
 assert.equal(failed.activityEvidence['frame-predict'].independentAt,undefined);
 const next=recordLessonAttempt(failed,'frame-predict',true,5,0,now);
 assert.equal(next.activityEvidence['frame-predict'].hintsUsed,1);
 assert.equal(next.hintLevels['frame-predict'],1);
 assert.equal(next.attempts['frame-predict'],4);
 assert.equal(next.activityEvidence['frame-predict'].completedAt,p.activityEvidence['frame-predict'].completedAt);
 assert.equal(next.activityEvidence['frame-predict'].independentAt,now.toISOString());
 assert.equal(next.review.correct,false);
 assert.equal(next.review.attempts,1);
 assert.equal((await project(next))[0].state,'practiced');
});

test('storage denial and quota failure preserve the graded session and return backup warning',async()=>{
 const {persistLessonProgress,recordLessonAttempt}=await import('../lib/mastery-engine.ts');
 for(const name of ['SecurityError','QuotaExceededError']) {
  const progress=recordLessonAttempt(initialLessonProgress,'frame-predict',true,5,0,now);
  const warning=persistLessonProgress(()=>({setItem(){throw new DOMException('blocked',name)}}),'key',progress);
  assert.match(warning,/backup/i);
  assert.deepEqual(progress.completed,['frame-predict']);
 }
 assert.match(persistLessonProgress(()=>{throw new DOMException('blocked','SecurityError')},'key',initialLessonProgress),/backup/i);
});

test('a clean bridge receives no misconception bonus against a repair',async()=>{
 const concepts=await project(initialLessonProgress,completeExpansionLab(emptyExpansionProgress,'logic-truth-table',now.getTime()));
 const queue=buildTodayQueue({now,budgetMinutes:60,concepts:[concepts.find(c=>c.id==='logic-truth-table')],repairs:[{id:'repair',lessonId:'problem-frame',activityId:'frame-explain',lessonTitle:'Frame',title:'Repair',prompt:'Explain',attempts:1,hintLevel:0,disputed:false,updatedAt:now.toISOString()}]});
 const bridge=buildTodayQueue({now,budgetMinutes:30,concepts:[concepts.find(c=>c.id==='logic-truth-table')],repairs:[]}).items.find(i=>i.type==='bridge');
 assert.equal(bridge.score,5);
 assert.equal(queue.items[0].type,'repair');
});

test('mastery kernel rejects hinted practice even when its status is met',async()=>{
 const concepts=await project({...initialLessonProgress,completed,practicedAt:'2026-09-01T00:00:00Z',review:{dueAt:'2026-09-04T00:00:00Z',completedAt:'2026-09-04T00:00:00Z',correct:true,attempts:1}});
 const c=concepts[0];
 assert.equal(evaluateAdaptiveMastery({...c,evidence:{...c.evidence,practice:{...c.evidence.practice,hintsUsed:1}}},now).state,'learning');
});

test('expansion mastery display also requires independent standard practice',async()=>{
 const {masteredExpansionLabs}=await import('../lib/expansion-progress.ts');
 let p=completeExpansionLab(emptyExpansionProgress,'logic-truth-table',Date.parse('2026-09-01T00:00:00Z'),1);
 p={...p,reviews:{'logic-truth-table':{dueAt:'2026-09-04T00:00:00Z',passedAt:'2026-09-04T00:00:00Z',attempts:1}}};
 assert.deepEqual(masteredExpansionLabs(p),[]);
});

test('Today action accessible name includes duration and required evidence',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../components/learning/today-session.tsx',import.meta.url),'utf8');
 assert.match(source,/aria-label=\{`[^`]*item\.minutes[^`]*item\.evidenceNeeded/);
});

test('lesson action uses tested persistence and retry transitions without deleting evidence',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../app/learning-dashboard.tsx',import.meta.url),'utf8');
 assert.match(source,/setProgress\(\(current\) => recordLessonAttempt\(current, stage.id, correct/);
 assert.match(source,/persistLessonProgress\(\(\) => window.localStorage, storageKey, progress\)/);
 assert.match(source,/storageWarning \? <p role="status">\{storageWarning\}/);
 assert.match(source,/onClick=\{\(\) => retryIndependently\(index\)\}/);
 assert.doesNotMatch(source,/delete activityEvidence/);
});

test('independent retry before lesson completion does not start the review clock',async()=>{
 const {recordLessonAttempt}=await import('../lib/mastery-engine.ts');
 const p=recordLessonAttempt(initialLessonProgress,'frame-predict',true,5,1,now);
 const next=recordLessonAttempt(p,'frame-predict',true,5,0,now);
 assert.equal(next.practicedAt,null);
 assert.equal(next.review,null);
});

test('independent expansion retry can reach mastery only after the fresh 72 hour retrieval',async()=>{
 const {submitExpansionReview}=await import('../lib/expansion-progress.ts');
 const {getExpansionLab}=await import('../lib/expansion-catalog.ts');
 const id='logic-truth-table';
 let p=completeExpansionLab(emptyExpansionProgress,id,now.getTime(),1);
 p=completeExpansionLab(p,id,now.getTime(),0);
 const answer=getExpansionLab(id).review.answerIndex;
 assert.equal(submitExpansionReview(p,id,answer,now.getTime()).passed,false);
 const later=new Date('2026-09-08T00:00:00Z');
 p=submitExpansionReview(p,id,answer,later.getTime()).progress;
 const c=(await project(initialLessonProgress,p,later)).find(c=>c.id===id);
 assert.equal(c.state,'mastered');
 assert.ok(c.risks.includes('hint_dependent'));
 assert.equal(c.totalHints,1);
});

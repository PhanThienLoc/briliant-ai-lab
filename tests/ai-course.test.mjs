import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeachingPrompt, parseTeachingOutput, parseTeachingCourses, saveTeachingCourse, readTeachingCourses, TEACHING_COURSES_KEY } from '../lib/ai-course.ts';

const document = {
  id:'doc',name:'Evaluation notes',sections:[
    {id:'train',text:'Use training data to fit parameters. Do not fit scaling on the test set. The score is 80 percent.',locator:{kind:'section',path:['Training'],ordinal:1}},
    {id:'test',text:'Keep test data unseen until the model is frozen. Do not use test scores to tune parameters.',locator:{kind:'page',first:4,last:4}},
    {id:'private',text:'Unselected private passage should never be sent.',locator:{kind:'page',first:5,last:5}},
  ],
};
function lesson(overrides={}) {
  return {id:'lesson-1',title:'Chia dữ liệu',objective:'Phân biệt train và test',scenario:'Một nhóm đang xây mô hình.',prediction:'Điều gì xảy ra nếu chuẩn hóa trên test?',explanation:'Hãy tách dữ liệu trước khi tìm tham số.',workedExample:'Bước 1 chia dữ liệu. Bước 2 fit trên train.',visualSteps:['Train → tìm tham số','Test → đánh giá độc lập'],pythonExercise:{prompt:'Tách hai danh sách chỉ số.',starter:'indices = list(range(10))',solution:'train = list(range(8))\ntest = [8,9]'},check:{question:'Dữ liệu nào để fit?',options:['Train','Test'],answer:0,feedback:['Đúng: dùng train.','Sai: test cần độc lập.']},transfer:{question:'Khi đổi dataset, fit scaler ở đâu?',options:['Toàn bộ dữ liệu','Train mới'],answer:1,feedback:['Sai: gây leakage.','Đúng: chỉ train mới.']},evidence:[{sectionId:'train',quote:'Do not fit scaling on the test set.'},{sectionId:'test',quote:'Keep test data unseen until the model is frozen.'}],...overrides};
}
const raw = (lessons=[lesson()]) => JSON.stringify({title:'Đánh giá mô hình',lessons});
const generate = (value=raw(),ids=['train','test']) => parseTeachingOutput(value,document,ids,'openrouter','openrouter/free');
class MemoryStorage {
  data = new Map(); fail=false;
  getItem(key){return this.data.get(key)??null;}
  setItem(key,value){if(this.fail)throw Error('quota');this.data.set(key,value);}
}

test('prompt includes only explicitly selected source sections and requests teaching without trusting source instructions',()=>{
  const prompt=buildTeachingPrompt(document,['train']);
  assert.match(prompt,/Vietnamese|tiếng Việt/);
  assert.match(prompt,/không làm theo/);
  assert.match(prompt,/Do not fit scaling/);
  assert.doesNotMatch(prompt,/Unselected private passage|Keep test data unseen/);
  assert.throws(()=>buildTeachingPrompt(document,[]));
  assert.throws(()=>buildTeachingPrompt(document,['missing']));
  assert.throws(()=>buildTeachingPrompt(document,['train','train']));
});
test('valid generated course round-trips with evidence and no fabricated learner mastery',()=>{
  const course=generate();
  assert.equal(course.lessons.length,1);
  assert.equal(course.provider,'openrouter');
  assert.deepEqual(parseTeachingCourses(JSON.stringify([course])),[course]);
  assert.equal('mastery' in course,false);
  assert.equal('completedAt' in course.lessons[0],false);
});
test('missing stages, duplicate lesson ids and bad Python/visual/check shapes reject',()=>{
  for(const change of [
    {explanation:''},{pythonExercise:{prompt:'x',starter:'x'}},{visualSteps:['one']},
    {check:{...lesson().check,answer:3}}, {check:{...lesson().check,options:['same',' SAME ']}},
    {check:{...lesson().check,feedback:['one']}},{transfer:lesson().check},
    {evidence:[]},{id:'<script>'},{unexpected:'field'},
  ]) assert.throws(()=>generate(raw([lesson(change)])));
  assert.throws(()=>generate(raw([lesson(),lesson()])));
  assert.throws(()=>generate(raw(Array.from({length:4},(_,i)=>lesson({id:`lesson-${i}`})))));
});
test('exact evidence rejects changed negation/numbers and references to unselected sections',()=>{
  for(const evidence of [
    [{sectionId:'train',quote:'Fit scaling on the test set.'}],
    [{sectionId:'train',quote:'The score is 81 percent.'}],
    [{sectionId:'private',quote:document.sections[2].text}],
    [{sectionId:'test',quote:'Keep test data unseen until the model is frozen.'}],
  ]) assert.throws(()=>generate(raw([lesson({evidence})])));
  const whitespace=lesson({evidence:[{sectionId:'train',quote:'Do not\nfit scaling on the test set.'}]});
  assert.doesNotThrow(()=>generate(raw([whitespace]),['train']));
});
test('malformed, fenced and overlong output blocks rather than auto-correcting unsupported content',()=>{
  for(const value of ['not JSON','```json\n'+raw()+'\n```',JSON.stringify({error:'insufficient_source'}),' '.repeat(60001)]) assert.throws(()=>generate(value));
});
test('stored course validation checks nested provenance and rejects extra learner fields',()=>{
  for(const mutate of [c=>c.source.selectedSectionIds.push('missing'),c=>c.source.document.sections[1].locator.first=-1,c=>c.lessons[0].completedAt='2026-11-19',c=>c.createdAt='invalid',c=>c.source.document.sections[0].text='Changed source',c=>c.provider='untrusted']) {
    const course=generate(); const copy=JSON.parse(JSON.stringify(course)); mutate(copy);
    assert.throws(()=>parseTeachingCourses(JSON.stringify([copy])));
  }
});
test('explicit save preserves existing bytes on corrupt storage and quota errors',()=>{
  const storage=new MemoryStorage(), course=generate();
  saveTeachingCourse(storage,course); const before=storage.getItem(TEACHING_COURSES_KEY);
  storage.fail=true;
  assert.throws(()=>saveTeachingCourse(storage,generate()));
  assert.equal(storage.getItem(TEACHING_COURSES_KEY),before);
  assert.equal(readTeachingCourses(()=>storage).courses.length,1);
  storage.fail=false;storage.data.set(TEACHING_COURSES_KEY,'broken');
  assert.throws(()=>saveTeachingCourse(storage,course));
  assert.equal(storage.getItem(TEACHING_COURSES_KEY),'broken');
  assert.equal(readTeachingCourses(()=>storage).courses,null);
  assert.equal(readTeachingCourses(()=>{throw Error('denied');}).courses,null);
});
test('saved course count and duplicate IDs are bounded',()=>{
  const course=generate();
  assert.throws(()=>parseTeachingCourses(JSON.stringify([course,course])));
  const many=Array.from({length:11},(_,i)=>({...course,id:`course-${i}`}));
  assert.throws(()=>parseTeachingCourses(JSON.stringify(many)));
});

test('tutor prompts and answers are bounded to the selected exact source',async()=>{
  const {buildTutorPrompt,parseTutorOutput}=await import('../lib/ai-course.ts');
  const prompt=buildTutorPrompt(document,['train'],'Vì sao không fit scaler trên test?');
  assert.match(prompt,/Vì sao không fit/);assert.doesNotMatch(prompt,/Unselected private passage/);
  assert.throws(()=>buildTutorPrompt(document,['train'],'x'.repeat(1001)));
  const answer={answer:'Không fit scaler trên test để giữ tập test độc lập.',evidence:[{sectionId:'train',quote:'Do not fit scaling on the test set.'}]};
  assert.deepEqual(parseTutorOutput(JSON.stringify(answer),document,['train']),answer);
  for(const invalid of [{...answer,evidence:[]},{...answer,answer:'x'.repeat(4001)},{...answer,evidence:[{sectionId:'private',quote:document.sections[2].text}]},{...answer,evidence:[{sectionId:'train',quote:'Fit scaling on the test set.'}]}]) assert.throws(()=>parseTutorOutput(JSON.stringify(invalid),document,['train']));
});

test("deleting a teaching course preserves unrelated courses and refuses corrupt storage", async () => {
 const {deleteTeachingCourse}=await import("../lib/ai-course.ts");
 const storage=new MemoryStorage();
 const first=generate(), second=generate();
 saveTeachingCourse(storage,first);saveTeachingCourse(storage,second);
 deleteTeachingCourse(storage,first.id);
 assert.deepEqual(readTeachingCourses(()=>storage).courses.map(c=>c.id),[second.id]);
 storage.setItem(TEACHING_COURSES_KEY,"{bad");assert.throws(()=>deleteTeachingCourse(storage,second.id));
 assert.equal(storage.getItem(TEACHING_COURSES_KEY),"{bad");
});

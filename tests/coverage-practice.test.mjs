import test from "node:test";
import assert from "node:assert/strict";
import { toPracticeCourse } from "../lib/coverage-practice.ts";
import { parseSourceCourses, buildSourceCourse } from "../lib/source-course.ts";

const passages = [
  "Training data is used to estimate model parameters before any evaluation on unseen samples. A measured accuracy of 80 percent does not guarantee success on future data.",
  "Validation data is reserved for comparing candidate model configurations under equal conditions. The validation score must not be treated as a final independent test result.",
  "Test data is kept separate until the model configuration has been chosen and frozen. An estimate based on 50 samples carries more uncertainty than an estimate based on 500 samples.",
];
function draft(overrides = {}) {
  return {
    version:2, id:"coverage-demo", title:"Model evaluation", kind:"article",
    document:{id:"doc",name:"Training notes",sections:passages.map((text,index)=>({
      id:`section-${index+1}`,text,locator:{kind:"section",path:["Model evaluation"],ordinal:index+1},
    }))},
    selectedSectionIds:["section-3","section-1"],
    coverage:{selectedUnits:3,processedUnits:3,emptyUnits:[],truncated:false,lastProcessedUnit:3},
    updatedAt:"2026-11-19T00:00:00.000Z",
    ...overrides,
  };
}
test("selected coverage sections become exactly one lesson each in source order",()=>{
  const input=draft();
  const course=toPracticeCourse(input);
  assert.deepEqual(course.lessons.map(x=>x.id),["section-1","section-3"]);
  assert.equal(course.lessons.length,2);
  assert.equal(course.lessons[0].excerpt,passages[0]);
  assert.equal(course.lessons[1].excerpt,passages[2]);
  assert.notEqual(course.lessons[0].sourceLocation,course.lessons[1].sourceLocation);
  assert.deepEqual(parseSourceCourses(JSON.stringify([course])),JSON.parse(JSON.stringify([course])));
  assert.equal(course.lessons.some(x=>x.completedAt||x.reviewDueAt||x.reviewedAt),false);
});
test("reject missing, duplicate, too few and too many selections without mutating draft",()=>{
  for(const ids of [["section-1"],["section-1","missing"],["section-1","section-1"],Array.from({length:7},(_,i)=>`section-${i+1}`)]){
    const input=draft({selectedSectionIds:ids});const before=JSON.stringify(input);
    assert.throws(()=>toPracticeCourse(input));
    assert.equal(JSON.stringify(input),before);
  }
});
test("numbers and negation remain literal supported answer evidence",()=>{
  const course=toPracticeCourse(draft());
  assert.match(course.lessons[0].reviewOptions[course.lessons[0].reviewAnswer],/80 percent does not guarantee/);
  assert.match(course.lessons[1].reviewOptions[course.lessons[1].reviewAnswer],/50 samples.*500 samples/);
  for(const lesson of course.lessons){
    assert.ok(lesson.excerpt.includes(lesson.options[lesson.answer]));
    assert.ok(lesson.excerpt.includes(lesson.reviewOptions[lesson.reviewAnswer]));
  }
});
test("weak, duplicate and book code-only sections cannot create recognition courses",()=>{
  for(const texts of [
    ["Too short.","Still too short."],
    [passages[0],passages[0]],
    ["def calculate_metrics(data): return data; ".repeat(10),"import training_data; return calculate_metrics(training_data); ".repeat(10)],
  ]){
    const d=draft({kind:"book",selectedSectionIds:["section-1","section-2"]});
    d.document.sections=d.document.sections.slice(0,2).map((s,i)=>({...s,text:texts[i]}));
    assert.throws(()=>toPracticeCourse(d));
  }
});
test("coverage retains full section while v1 lesson excerpt stays literal and bounded",()=>{
  const d=draft();
  d.document.sections[0].text=passages[0]+" Extra contextual prose is deliberately retained in the coverage document.".repeat(45);
  const before=d.document.sections[0].text;
  const result=toPracticeCourse(d);
  assert.equal(result.lessons[0].excerpt,before.slice(0,2200));
  assert.equal(d.document.sections[0].text,before);
});
test("legacy builder preserves its sampled course behavior",()=>{
  const course=buildSourceCourse({title:"Old flow",kind:"article",sourceName:"Legacy",text:passages.join("\n\n")},new Date("2026-11-19"));
  assert.equal(course.lessons.length,3);
  assert.deepEqual(course.lessons.map(x=>x.id),["lesson-1","lesson-2","lesson-3"]);
  assert.equal(parseSourceCourses(JSON.stringify([course]))[0].title,"Old flow");
});

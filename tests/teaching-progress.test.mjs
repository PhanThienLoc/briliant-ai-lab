import test from "node:test";
import assert from "node:assert/strict";
import {recordTeachingCheck,parseTeachingProgress,teachingReviewDue,TEACHING_PROGRESS_KEY,REVIEW_DELAY_MS} from "../lib/teaching-progress.ts";
const store=()=>{let raw=null;return {getItem:()=>raw,setItem:(k,v)=>{assert.equal(k,TEACHING_PROGRESS_KEY);raw=v;}}};
test("independent checks retain first completion and gate exact72h review",()=>{
 const s=store(),now=new Date("2026-11-19T00:00:00Z"),key="course:lesson";
 const p=recordTeachingCheck(s,key,false,now);
 recordTeachingCheck(s,key,false,new Date(now.getTime()+1000));
 assert.equal(JSON.parse(s.getItem())[key].completedAt,now.toISOString());
 assert.equal(teachingReviewDue(p,key,now.getTime()+REVIEW_DELAY_MS-1),false);
 const before=s.getItem();
 assert.throws(()=>recordTeachingCheck(s,key,true,new Date(now.getTime()+REVIEW_DELAY_MS-1)));
 assert.equal(s.getItem(),before);
 const done=recordTeachingCheck(s,key,true,new Date(now.getTime()+REVIEW_DELAY_MS));
 assert.equal(teachingReviewDue(done,key,now.getTime()+REVIEW_DELAY_MS),false);
});

test("corrupt or quota-failing progress never overwrites prior bytes",()=>{
 assert.throws(()=>parseTeachingProgress('{"x":{"completedAt":"no"}}'));
 assert.throws(()=>parseTeachingProgress('{"x":{"completedAt":"2026-11-19","reviewedAt":"2026-11-20"}}'));
 let writes=0;assert.throws(()=>recordTeachingCheck({getItem:()=>"{bad",setItem:()=>writes++},"c:l",false));assert.equal(writes,0);
 assert.throws(()=>recordTeachingCheck({getItem:()=>"{}",setItem:()=>{throw Error("quota")}},"c:l",false));
});
test("Passport includes teaching progress and rejects invalid early review evidence",async()=>{
 const {createLearningBackup,parseLearningBackupText}=await import("../lib/learning-backup.ts");
 const rows=new Map([[TEACHING_PROGRESS_KEY,JSON.stringify({"course:lesson":{completedAt:"2026-11-19T00:00:00Z"}})],["briliantai.ai-key",'"never-export"']]);
 const storage={getItem:k=>rows.get(k)??null,get length(){return rows.size},key:i=>[...rows.keys()][i]};
 const backup=createLearningBackup(storage);
 assert.ok(backup.data[TEACHING_PROGRESS_KEY]);assert.ok(!backup.data["briliantai.ai-key"]);
 backup.data[TEACHING_PROGRESS_KEY]=JSON.stringify({"course:lesson":{completedAt:"2026-11-19T00:00:00Z",reviewedAt:"2026-11-19T01:00:00Z"}});
 assert.throws(()=>parseLearningBackupText(JSON.stringify(backup)));
});

test("repeated initial completion does not rewrite storage or fail when writes are blocked", () => {
  const completedAt = "2026-11-19T00:00:00Z";
  let writes = 0;
  const storage = { getItem: () => JSON.stringify({"course:lesson": {completedAt}}), setItem: () => { writes++; throw Error("quota"); } };
  const progress = recordTeachingCheck(storage, "course:lesson", false, new Date("2026-11-20T00:00:00Z"));
  assert.equal(writes, 0);
  assert.equal(progress["course:lesson"].completedAt, completedAt);
});

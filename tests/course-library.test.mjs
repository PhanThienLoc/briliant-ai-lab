import assert from 'node:assert/strict';
import test from 'node:test';

import * as library from '../lib/course-library.ts';
const courses = [
 {id:'one',title:'Đồ thị dữ liệu',kind:'book',sourceName:'Nguyễn Đăng',lessons:[{id:'a',completedAt:'2026-11-01'},{id:'b'},{id:'c'}]},
 {id:'two',title:'Attention',kind:'video',sourceName:'Đại học Mở',lessons:[{id:'a'},{id:'b'}]},
 {id:'three',title:'Học máy',kind:'paper',sourceName:'Research Notes',lessons:[]},
];
test('source search ignores case, accents and Đ in titles and provenance',()=>{
 assert.equal(typeof library.filterSourceCourses,'function');
 assert.deepEqual(library.filterSourceCourses(courses,' DO THI ','all'),[courses[0]]);
 assert.deepEqual(library.filterSourceCourses(courses,'nguyen dang','all'),[courses[0]]);
 assert.deepEqual(library.filterSourceCourses(courses,'đại HỌC','all'),[courses[1]]);
});
test('source search intersects kind, preserves order and handles empty and absent matches',()=>{
 assert.equal(typeof library.filterSourceCourses,'function');
 assert.deepEqual(library.filterSourceCourses(courses,'','all'),courses);
 assert.deepEqual(library.filterSourceCourses(courses,'','book'),[courses[0]]);
 assert.deepEqual(library.filterSourceCourses(courses,'attention','book'),[]);
 assert.deepEqual(library.filterSourceCourses(courses,'unknown','all'),[]);
 assert.deepEqual(library.filterSourceCourses([],'','all'),[]);
});
test('source progress reports actual completed lessons with zero and partial counts',()=>{
 assert.equal(typeof library.sourceCourseProgress,'function');
 assert.deepEqual(library.sourceCourseProgress(courses[0]),{completed:1,total:3,percent:33});
 assert.deepEqual(library.sourceCourseProgress(courses[1]),{completed:0,total:2,percent:0});
 assert.deepEqual(library.sourceCourseProgress(courses[2]),{completed:0,total:0,percent:0});
 assert.deepEqual(library.sourceCourseProgress({...courses[1],lessons:[{completedAt:'2026-11-01'}]}),{completed:1,total:1,percent:100});
});
test('library helpers leave source records and lesson evidence untouched',()=>{
 assert.equal(typeof library.filterSourceCourses,'function');
 assert.equal(typeof library.sourceCourseProgress,'function');
 const before=structuredClone(courses);
 const result=library.filterSourceCourses(courses,'','all');
 result.pop();
 library.sourceCourseProgress(courses[0]);
 assert.deepEqual(courses,before);
});

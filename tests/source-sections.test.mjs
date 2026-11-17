import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSourceCourse, finalizeSourceDraft } from '../lib/source-course.ts';
const paragraph = (topic) => `${topic} changes the output when the corresponding input is adjusted during an experiment. A separate example about ${topic} demonstrates why the result needs an independent comparison before it can be trusted.`;
test('markdown sections retain heading locations and never merge different topics', () => {
 const text = ['Gradient direction','Validation sample','Feature scaling'].map(x=>`## ${x}\n${paragraph(x)}`).join('\n\n');
 const c = buildSourceCourse({title:'Guide',kind:'article',sourceName:'Notes',text});
 assert.equal(c.lessons.length,3);
 assert.match(c.lessons[0].sourceLocation,/Mục: Gradient direction/);
 assert.equal(c.lessons[0].title,'Gradient direction');
 assert.ok(!c.lessons[0].excerpt.includes('Validation sample'));
 assert.ok(c.lessons.every(l=>l.options.filter(o=>l.excerpt.includes(o)).length===1));
 assert.doesNotThrow(()=>finalizeSourceDraft(c,c.lessons.map(x=>x.id)));
});
test('SRT cues become contiguous passages with timestamp locators, without cue numbers in answers', () => {
 const text = Array.from({length:8},(_,i)=>`${i+1}\n00:0${i}:00,000 --> 00:0${i}:40,000\n${paragraph('Topic '+i)}`).join('\n\n');
 const c=buildSourceCourse({title:'Video',kind:'video',sourceName:'Transcript',text});
 assert.ok(c.lessons.length>=2);
 assert.match(c.lessons[0].sourceLocation,/00:00:00/);
 assert.match(c.lessons.at(-1).sourceLocation,/00:07:40/);
 assert.ok(c.lessons.every(l=>!l.excerpt.includes('-->') && !l.options.some(o=>/^\d+\s/.test(o))));
 assert.doesNotThrow(()=>finalizeSourceDraft(c,c.lessons.map(x=>x.id)));
});
test('source questions reject passages whose competing answers are also supported by the same excerpt', () => {
 const shared='This common conclusion is repeated in every part of the source and cannot distinguish the topics.';
 const text=['First concept','Second concept','Third concept'].map(x=>`${paragraph(x)} ${shared}${x==='First concept' ? ' '+paragraph('Third concept') : ''}`).join('\n\n');
 const c=buildSourceCourse({title:'Guide',kind:'article',sourceName:'Notes',text});
 for(const l of c.lessons) {
  assert.equal(l.options.filter(o=>l.excerpt.includes(o)).length,1);
  assert.equal(l.reviewOptions.filter(o=>l.excerpt.includes(o)).length,1);
 }
});

test('two ordinary prose paragraphs produce two traceable lessons without headings', () => {
 const text = [paragraph('Gradient descent'), paragraph('Validation samples')].join('\n\n');
 assert.ok(text.length >= 400 && text.length < 1100);
 const c = buildSourceCourse({title:'Short guide',kind:'article',sourceName:'Guide',text});
 assert.equal(c.lessons.length,2);
 assert.match(c.lessons[1].sourceLocation,/Đoạn 2/);
 assert.ok(c.lessons.every(l=>l.excerpt.includes(l.options[l.answer])));
});

for (const format of ['srt','vtt']) test(`${format} short punctuation-free speech cues form bounded evidenced passages`, () => {
 const topics = ['gradient direction controls the next update of model weights', 'validation samples estimate performance on observations excluded from training', 'feature scaling makes coordinate magnitudes comparable before optimization'];
 const text = (format==='vtt'?'WEBVTT\n\n':'') + Array.from({length:72},(_,i)=> {
  const words = `${topics[Math.floor(i/24)]} and we trace the concrete example step ${i} before checking the result`;
  const time = n=>`00:${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}${format==='srt'?',':'.'}000`;
  return `${i+1}\n${time(i*3)} --> ${time(i*3+3)}\n${words}`;
 }).join('\n\n');
 const c = buildSourceCourse({title:'Lecture',kind:'video',sourceName:`Lecture.${format}`,text});
 assert.ok(c.lessons.length>=2);
 assert.match(c.lessons[0].sourceLocation,/00:00:00/);
 assert.match(c.lessons.at(-1).sourceLocation,/00:03:36/);
 assert.ok(c.lessons.every(l=>l.excerpt.length<=2200 && !l.excerpt.includes('-->') && l.excerpt.includes(l.options[l.answer]) && l.excerpt.includes(l.reviewOptions[l.reviewAnswer])));
 assert.doesNotThrow(()=>finalizeSourceDraft(c,c.lessons.map(l=>l.id)));
});

const bookNoise = [
 'Copyright 2026 Example Press. All rights reserved. No part of this publication may be reproduced without written permission from the publisher. The publisher makes no warranty about the accuracy of this material.',
 'MEAP early access edition. Thank you for purchasing this book before publication. Subscribe to liveBook to receive updates and exclusive offers as chapters are released. Send feedback to the publisher to help shape the final manuscript.',
 'Table of contents\nChapter 1 Getting started ........ 1\nChapter 2 Working with arrays ........ 29\nChapter 3 Testing programs ........ 53\nAppendix Reference tables ........ 98',
 'const value = data.map(item => item.score);\nconsole.log(value.length);\nfunction update(input) { return input.value; }\nSELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id;\nName | Count | Score\nAlpha | 100 | 2.34\nBeta | 200 | 3.45',
];
test('book containing only copyright marketing contents and code fails with prose guidance', () => {
 const text=bookNoise.map((p,i)=>`Trang ${i+1}\n${p}`).join('\n\n');
 assert.throws(()=>buildSourceCourse({title:'Book',kind:'book',sourceName:'Book.pdf',text}),/văn xuôi|nội dung.*chương/i);
});
test('book skips nonlearning pages even when chapter has no Chapter-number heading', () => {
 const text=[...bookNoise,paragraph('Independent evaluation'),paragraph('Gradient updates')].map((p,i)=>`Trang ${i+1}\n${p}`).join('\n\n');
 const c=buildSourceCourse({title:'Book',kind:'book',sourceName:'Book.pdf',text});
 assert.equal(c.lessons.length,2);
 assert.match(c.lessons[0].sourceLocation,/Trang 5/);
 assert.match(c.lessons[1].sourceLocation,/Trang 6/);
 assert.ok(c.lessons.every(l=>!bookNoise.some(p=>l.excerpt.includes(p))));
});

test('collapsed PDF boilerplate and numeric/code fragments are not assessable prose', () => {
 const fragments = [
  'Build a Language Model. Version 8. MEAP Edition Manning Early Access Program Copyright 2024 Example Publications. For more information on this and other titles go to the publisher website. Licensed to the purchaser for personal use only.',
  'Chapter 8. Summary ................................ 267 Built-in data types ................................ 267 Implementing stacks ................................ 271 Future exploration ................................ 274 About the author ................................ 276 Colophon ................................ 277',
  'N worst case of largest() worst case of max() best case of largest() best case of max() 4,096 0.20 0.05 0.14 0.05 8,192 0.40 0.11 0.29 0.10 16,384 0.80 0.21 0.57 0.19 32,768 1.60 0.41 1.14 0.39',
  '>>> import sys >>> sys.getsizeof(range(100)) 48 >>> sys.getsizeof(list(range(100))) 1008 >>> sys.getsizeof(list(range(1000))) 9112 >>> sys.getsizeof(list(range(10000))) 90112',
 ];
 const text=fragments.map((p,i)=>`Trang ${i+1}\n${p}`).join('\n\n');
 assert.throws(()=>buildSourceCourse({title:'Book',kind:'book',sourceName:'Extracted.pdf',text}),/văn xuôi|nội dung.*chương/i);
});
test('code examples are excluded while useful prose on the same book page is preserved', () => {
 const text=['Input storage','Output comparison'].map((topic,i)=>`Trang ${i+1}\n>>> import sys\n>>> sys.getsizeof(list(range(100)))\n1008\n\n${paragraph(topic)}`).join('\n\n');
 const c=buildSourceCourse({title:'Programming',kind:'book',sourceName:'Guide.pdf',text});
 assert.equal(c.lessons.length,2);
 assert.ok(c.lessons.every(l=>!l.excerpt.includes('>>>') && !l.options.some(o=>o.includes('sys.getsizeof'))));
});

test('pasted punctuation-free ASR without timestamps also yields evidenced sections', () => {
 const text=['gradient updates','validation observations','feature scales'].map((topic,i)=>Array.from({length:5},(_,n)=>`${topic} are traced using concrete example ${i*5+n} while the learner compares each measured result with an independent baseline`).join(' ')).join('\n\n');
 const c=buildSourceCourse({title:'Speech',kind:'video',sourceName:'ASR',text});
 assert.equal(c.lessons.length,3);
 assert.ok(c.lessons.every(l=>l.excerpt.includes(l.options[l.answer]) && l.excerpt.includes(l.reviewOptions[l.reviewAnswer])));
});
test('collapsed PDF code and tables do not discard useful prose on the same page', () => {
 const text=['Storage complexity','Search complexity'].map((topic,i)=>`Trang ${i+1}\n>>> import sys >>> sys.getsizeof(range(100)) 48 >>> sys.getsizeof(list(range(1000))) 9112. N worst case 4,096 0.20 0.05 0.14 0.05 8,192 0.40 0.11 0.29 0.10. ${paragraph(topic)} def example(A): value = A[0]; return value;`).join('\n\n');
 const c=buildSourceCourse({title:'Algorithms',kind:'book',sourceName:'Text.pdf',text});
 assert.equal(c.lessons.length,2);
 assert.ok(c.lessons.every(l=>!l.options[l.answer].includes('>>>') && !l.options[l.answer].includes('worst case') && !l.reviewOptions[l.reviewAnswer].includes('def example')));
});

test('PDFjs spaced contents leaders and code/table prefixes never become answers', () => {
 const contents='Chapter 8. Summary . . . . . . . 267 Built-in Python data structures . . . . . . . 267 Implementing stacks with Python . . . . . . . 271';
 const table='N worst case of largest() worst case of max() best case of largest() best case of max() 4,096 0.20 0.05 0.14 0.05 8,192 0.40 0.11 0.29 0.10';
 const code='>>> import sys >>> sys.getsizeof(range(100)) 48 >>> sys.getsizeof(list(range(1000))) 9112';
 const text=`Trang 4\n${contents}\n\nTrang 24\n${table} ${paragraph('Input memory')}\n\nTrang 53\n${code} ${paragraph('Binary search')}`;
 const c=buildSourceCourse({title:'Algorithms',kind:'book',sourceName:'Algorithms.pdf',text});
 assert.equal(c.lessons.length,2);
 for(const l of c.lessons) {
  assert.ok(!l.sourceLocation.includes('Trang 4'));
  for(const answer of [l.options[l.answer],l.reviewOptions[l.reviewAnswer]]) assert.ok(!/worst case|getsizeof|267|^\d/.test(answer),answer);
 }
});

test('short final subtitle tail stays attached to its passage and retains final locator', () => {
 const text=Array.from({length:35},(_,i)=>`${i+1}\n00:00:${String(i).padStart(2,'0')},000 --> 00:00:${String(i+1).padStart(2,'0')},000\nwe trace example ${String(i).padStart(2,'0')} and compare the result`).join('\n\n');
 const c=buildSourceCourse({title:'Short cues',kind:'video',sourceName:'Speech.srt',text});
 assert.match(c.lessons.at(-1).sourceLocation,/00:00:35/);
 assert.ok(c.lessons.at(-1).excerpt.includes('example 34'));
});

for (const structure of ['headings','paragraphs','pages']) test(`ordinary sentence-based video ${structure} retain two supported evidence items`, () => {
 const topics=['Gradient direction','Validation sample'];
 const text=topics.map((topic,i)=>`${structure==='headings'?`## ${topic}\n`:structure==='pages'?`Trang ${i+1}\n`:''}${paragraph(topic)}`).join('\n\n');
 const c=buildSourceCourse({title:'Lecture notes',kind:'video',sourceName:'Transcript',text});
 assert.equal(c.lessons.length,2);
 c.lessons.forEach((l,i)=> {
  assert.equal(l.options[l.answer],`${topics[i]} changes the output when the corresponding input is adjusted during an experiment.`);
  assert.ok(l.reviewOptions[l.reviewAnswer].startsWith('A separate example'));
  assert.ok(l.excerpt.includes(l.options[l.answer]) && l.excerpt.includes(l.reviewOptions[l.reviewAnswer]));
 });
 assert.doesNotThrow(()=>finalizeSourceDraft(c,c.lessons.map(l=>l.id)));
});

test('collapsed useful PDF pages retain prose and locators after bounded copyright footer removal', () => {
 const text=['Gradient direction','Validation sample'].map((topic,i)=>`Trang ${i+1}\n${paragraph(topic)} Copyright 2026 Example Press.`).join('\n\n');
 const c=buildSourceCourse({title:'Chapter',kind:'book',sourceName:'Chapter.pdf',text});
 assert.equal(c.lessons.length,2);
 c.lessons.forEach((l,i)=> {
  assert.match(l.sourceLocation,new RegExp(`Trang ${i+1}`));
  assert.ok(l.excerpt.includes(paragraph(['Gradient direction','Validation sample'][i])));
  assert.ok(!/copyright/i.test(l.excerpt));
  assert.ok(l.excerpt.includes(l.options[l.answer]) && l.excerpt.includes(l.reviewOptions[l.reviewAnswer]));
 });
});

test('ordinary book prose containing return and import retains exact evidence and page locators', () => {
 const pages = [
  ['Pure functions return the same output whenever they receive the same input, so callers can reason about results without tracking hidden state.', 'A program can import a module once and reuse its public functions across separate components to avoid repeating implementation details.'],
  ['Database queries return only the rows that satisfy their filters, allowing applications to reduce the data transferred between services.', 'Test suites import the module under evaluation and compare actual outputs with expected results for representative inputs.'],
 ];
 const text=pages.map((claims,i)=>`Trang ${i+1}\n${claims.join(' ')}`).join('\n\n');
 assert.equal(text.length,555);
 const c=buildSourceCourse({title:'Programming concepts',kind:'book',sourceName:'Programming.pdf',text});
 assert.equal(c.lessons.length,2);
 c.lessons.forEach((l,i)=> {
  assert.equal(l.sourceLocation,`Trang ${i+1} · Programming.pdf`);
  assert.equal(l.excerpt,pages[i].join(' '));
  assert.equal(l.options[l.answer],pages[i][0]);
  assert.equal(l.reviewOptions[l.reviewAnswer],pages[i][1]);
 });
 assert.doesNotThrow(()=>finalizeSourceDraft(c,c.lessons.map(l=>l.id)));
});

test('line-leading Return and Import instructions remain assessable book prose', () => {
 const pages = [
  ['Return the completed report to the caller after all measurements have been checked against the original observations.', 'Import only the public module interface when explaining how separate components share their common implementation details.'],
  ['Import a small example dataset before comparing the experimental results with a separately recorded baseline measurement.', 'Return to the validation examples whenever the observed behavior differs from the expected results for representative inputs.'],
 ];
 const text=pages.map((claims,i)=>`Trang ${i+1}\n${claims.join('\n')}`).join('\n\n');
 const c=buildSourceCourse({title:'Programming instructions',kind:'book',sourceName:'Instructions.pdf',text});
 assert.equal(c.lessons.length,2);
 c.lessons.forEach((l,i)=> {
  assert.equal(l.sourceLocation,`Trang ${i+1} · Instructions.pdf`);
  assert.equal(l.options[l.answer],pages[i][0]);
  assert.equal(l.reviewOptions[l.reviewAnswer],pages[i][1]);
  assert.ok(pages[i].every(claim=>l.excerpt.includes(claim)));
 });
});

test('structured import return and function statements stay excluded from book evidence', () => {
 const code = [
  'import cached_results_from_previous_iterations',
  'import cached_previous_iteration_results, current_iteration_results',
  'return cached_result_from_the_previous_iteration',
  'return calculate_the_previous_iteration_result(input)',
  'return previous_iteration_result + current_iteration_result',
  'return previous_iteration_results[current_index]',
  'return "cached result from the previous iteration"',
  'def calculate_the_previous_iteration_result(input):',
 ].join('\n');
 const text=['Function results','Module boundaries'].map((topic,i)=>`Trang ${i+1}\n${code}\n\n${paragraph(topic)}`).join('\n\n');
 const c=buildSourceCourse({title:'Programming examples',kind:'book',sourceName:'Examples.pdf',text});
 assert.equal(c.lessons.length,2);
 c.lessons.forEach((l,i)=> {
  assert.equal(l.excerpt,paragraph(['Function results','Module boundaries'][i]));
 });
});

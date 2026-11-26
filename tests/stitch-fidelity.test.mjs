import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Render the real presentation components; do not substitute copies of their markup.
async function moduleUrl(path, dependencies = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  let { outputText } = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  }});
  for (const [name, url] of Object.entries({ 'react/jsx-runtime': import.meta.resolve('react/jsx-runtime'), ...dependencies })) {
    outputText = outputText.replaceAll(JSON.stringify(name), JSON.stringify(url));
  }
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
}
const studyUrl = await moduleUrl('../components/learning/subject-study.tsx');
const { SubjectStudy } = await import(studyUrl);
const { TodaySession } = await import(await moduleUrl('../components/learning/today-session.tsx', { './subject-study': studyUrl }));
const render = (props) => renderToStaticMarkup(createElement(TodaySession, { onOpen() {}, onDiagnostic() {}, ...props }));
const item = { id: 'review:sql', type: 'review', title: 'Ôn SQL SELECT pipeline', trackId: 'r2', minutes: 5,
  reason: 'Bài đã đến hạn ôn.', evidenceNeeded: 'Tự giải biến thể mới.', target: { kind: 'expansion', id: 'sql-select', mode: 'review' } };

test('the Stitch resume composition keeps real due-review context and a conceptual subject visual', () => {
  const html = render({ queue: { items: [item], totalMinutes: 5, budgetMinutes: 30 } });
  assert.match(html, /Ôn SQL SELECT pipeline/);
  assert.match(html, /5 \/ 30 phút dự kiến/);
  assert.match(html, /Ôn ngay/);
  assert.match(html, /study-sql/);
  assert.match(html, /Sơ đồ khái niệm · không phải đáp án bài học/);
  assert.match(html, /Tự giải biến thể mới/);
  assert.match(html, /aria-current="step"/);
  assert.doesNotMatch(html, /65%|72%|16\.1%/);
});

test('a reflection remains informational rather than becoming a false interactive card', () => {
  const html = render({ queue: { items: [{ ...item, id: 'reflection', type: 'reflection', title: 'Tự phản tư cuối phiên', target: null }], totalMinutes: 3, budgetMinutes: 30 } });
  assert.match(html, /Tự phản tư cuối phiên/);
  assert.doesNotMatch(html, /<button|aria-current="step"|today-continue/);
});

test('an empty queue offers the diagnostic without an invented lesson or study diagram', () => {
  const html = render({ queue: { items: [], totalMinutes: 0, budgetMinutes: 30 } });
  assert.match(html, /Chưa có hành động phù hợp/);
  assert.match(html, /Tìm điểm bắt đầu/);
  assert.doesNotMatch(html, /subject-study|today-continue/);
});

test('subject drawings render as decorative vector studies with no unlabelled controls', () => {
  for (const topic of ['r1', 'sql-select', 'r3', 'r4']) {
    const html = renderToStaticMarkup(createElement(SubjectStudy, { topic }));
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /viewBox="0 0 360 218"/);
    assert.doesNotMatch(html, /<button|<input|<img|https:/);
  }
});

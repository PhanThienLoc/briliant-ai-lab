import assert from "node:assert/strict";
import test from "node:test";

test("renders the Vietnamese learning dashboard", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();

  assert.match(html, /<html[^>]*lang=["']vi["']/i);
  assert.match(html, /<title>BriliantAI Lab<\/title>/i);
  assert.match(html, /<h1>Hôm nay, học sâu hơn một chút\.<\/h1>/);
  assert.match(html, /Tiếp tục bài học đang mở/);
  for (const label of ["Hôm nay", "Thư viện", "Tạo khóa học", "Ôn tập", "Công cụ học tập"]) assert.ok(html.includes(label));
  assert.match(html, /Đang đọc tiến độ trên thiết bị này/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /Tiến độ trên thiết bị/);
  assert.doesNotMatch(html, /Chưa có hành động phù hợp|Không có mắt xích nào đang nợ|Deep Learner|Level: Analyzing/);
  assert.doesNotMatch(html, /Starter Project/i);
});

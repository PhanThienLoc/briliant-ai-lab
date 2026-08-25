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
  assert.match(html, /Vector và dot product/i);
  assert.match(html, /Việc đáng làm hôm nay/i);
  assert.match(html, /Bằng chứng còn thiếu/i);
  assert.match(html, /Feature contributions/i);
  assert.doesNotMatch(html, /Starter Project/i);
});

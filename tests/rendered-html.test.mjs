import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
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
}

test("server-renders the Samwon digital product passport", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Digital Product Passport/);
  assert.match(html, /From fibre to finished piece/);
  assert.match(html, /710954571003/);
  assert.match(html, /SW-PTG-SP27-31-002-0615/);
  assert.match(html, /Brighann Cotton Marketing/);
  assert.match(html, /Chain of custody/);
  assert.match(html, />Farm</);
  assert.match(html, />Ginner</);
  assert.match(html, />Cotton trader</);
  assert.match(html, />Spinner</);
  assert.match(html, /Knitter \/ weaver/);
  assert.match(html, /Garment manufacturer \/ finished goods/);
  assert.doesNotMatch(html, /Retailer/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

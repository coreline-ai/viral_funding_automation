import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { BoundedConversationQueue } from "../src/grok-oauth-proxy.mjs";
import { FakeGrokTextRunner } from "../src/grok-oauth-proxy.mjs";
import { hashPublishFields } from "../src/drafts.mjs";
import { createAppServer, DEFAULT_HOST } from "../src/server.mjs";
import {
  COMPOSE_EXAMPLE,
  COMPOSE_CACHE_MAX_ENTRIES,
  COMPOSE_CACHE_TTL_MS,
  normalizeV1Error,
} from "../src/api/v1/contract.mjs";

const yaml = await readFile(new URL("../openapi/viral-api.v1.yaml", import.meta.url), "utf8");

async function withServer(options, callback) {
  const webRoot = await mkdtemp(join(tmpdir(), "viral-openapi-"));
  await Promise.all([
    writeFile(join(webRoot, "index.html"), "<!doctype html><title>Coreline Launch</title>"),
    writeFile(join(webRoot, "favicon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
    writeFile(join(webRoot, "styles.css"), ":root{}"),
    writeFile(join(webRoot, "app.js"), "export {};"),
  ]);
  const server = createAppServer({ webRoot, ...options });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await callback(origin);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(webRoot, { recursive: true, force: true });
  }
}

const english = {
  englishSummary: { oneSentence: "AI Systems Atlas", shortIntro: "x", features: [], demoBoundary: "read-only" },
  publishFields: { body: "AI Systems Atlas https://ai-systems-atlas.vercel.app/" },
};

test("OpenAPI 3.1에 v1 경로·상태·오류 코드가 있다", () => {
  assert.match(yaml, /^openapi: 3\.1\.0/m);
  for (const path of [
    "/api/v1/capabilities",
    "/api/v1/providers/readiness",
    "/api/v1/drafts/compose",
    "/api/v1/drafts/review",
    "/api/v1/drafts/validate",
  ]) {
    assert.match(yaml, new RegExp(path.replaceAll("/", "\\/")));
  }
  for (const code of ["SOURCE_STALE", "QUEUE_FULL", "REQUEST_CANCELLED", "PROVIDER_TIMEOUT", "PROVIDER_RATE_LIMIT", "UNKNOWN_FIELD"]) {
    assert.match(yaml, new RegExp(code));
  }
  assert.match(yaml, /const: 127\.0\.0\.1/);
  assert.match(yaml, /cors:\n {10}type: string\n {10}const: disabled/);
  assert.match(yaml, /viral-compose-request\/v1/);
  assert.match(yaml, /req_example_compose/);
});

test("기본 bind는 loopback이고 CORS 헤더를 열지 않는다", async () => {
  assert.equal(DEFAULT_HOST, "127.0.0.1");
  await withServer({
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
  }, async (origin) => {
    const response = await fetch(`${origin}/api/v1/capabilities`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    const payload = await response.json();
    assert.equal(payload.schemaVersion, "viral-capabilities/v1");
    assert.equal(payload.bind.host, "127.0.0.1");
    assert.equal(payload.bind.loopbackOnly, true);
    assert.equal(payload.cors, "disabled");
    assert.equal(payload.followUp.tls, false);
    assert.equal(payload.followUp.pairing, false);
    assert.ok(payload.channels.includes("x1"));
    assert.ok(payload.channels.includes("showHn"));
  });
});

test("OpenAPI compose 예제는 실제 route를 통과하고 비밀을 응답하지 않는다", async () => {
  let calls = 0;
  await withServer({
    grokRunner: new FakeGrokTextRunner(async () => {
      calls += 1;
      return english;
    }),
    codexRunner: new FakeGrokTextRunner(async () => english),
  }, async (origin) => {
    const fields = COMPOSE_EXAMPLE.publishFields;
    const body = {
      ...COMPOSE_EXAMPLE,
      sourceHash: hashPublishFields(fields),
      idempotencyKey: "idem-live",
    };
    const first = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(first.status, 200);
    const payload = await first.json();
    assert.equal(payload.schemaVersion, "viral-compose-response/v1");
    assert.equal(payload.requestId, "req_example_compose");
    assert.equal(payload.channel, "x1");
    const snapshot = JSON.stringify(payload);
    assert.doesNotMatch(snapshot, /sk-|Bearer |XAI_API_KEY|OPENAI_API_KEY|\/Users\/|prompt\.txt|auth\.json|resolvedBin/);

    const retry = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(retry.status, 200);
    assert.equal(calls, 1);

    const stale = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, sourceHash: "deadbeef", idempotencyKey: "idem-stale" }),
    });
    assert.equal(stale.status, 409);
    const stalePayload = await stale.json();
    assert.equal(stalePayload.schemaVersion, "viral-error/v1");
    assert.equal(stalePayload.error.code, "SOURCE_STALE");
  });
});

test("알 수 없는 필드·잘못된 enum·과대 body·잘못된 content type을 거부한다", async () => {
  await withServer({
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
  }, async (origin) => {
    const unknown = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...COMPOSE_EXAMPLE, readme: "# inject" }),
    });
    assert.equal(unknown.status, 400);
    assert.equal((await unknown.json()).error.code, "UNKNOWN_FIELD");

    const provider = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...COMPOSE_EXAMPLE, provider: "openai" }),
    });
    assert.equal(provider.status, 400);
    assert.equal((await provider.json()).error.code, "INVALID_PROVIDER");

    const type = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    assert.equal(type.status, 415);
    assert.equal((await type.json()).error.code, "UNSUPPORTED_CONTENT_TYPE");

    const large = await fetch(`${origin}/api/v1/drafts/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "x1", padding: "x".repeat(70_000) }),
    });
    assert.equal(large.status, 413);
  });
});

test("queue full은 분기 가능한 오류 코드로 반환된다", async () => {
  const queue = new BoundedConversationQueue(1, 1);
  const blocker = queue.run(() => new Promise(() => {}));
  queue.run(() => new Promise(() => {}));
  await withServer({
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
    translateQueue: queue,
  }, async (origin) => {
    const response = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...COMPOSE_EXAMPLE,
        sourceHash: hashPublishFields(COMPOSE_EXAMPLE.publishFields),
        idempotencyKey: "idem-queue",
      }),
    });
    assert.equal(response.status, 429);
    assert.equal((await response.json()).error.code, "QUEUE_FULL");
  });
  void blocker;
});

test("readiness는 상태만 반환하고 CLI 경로를 빼다", async () => {
  await withServer({
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
  }, async (origin) => {
    const response = await fetch(`${origin}/api/v1/providers/readiness`);
    const payload = await response.json();
    assert.equal(payload.schemaVersion, "viral-readiness/v1");
    assert.equal(payload.grok.id, "grok");
    assert.equal(payload.grok.status, "ready");
    assert.equal(payload.grok.resolvedBin, undefined);
    assert.equal(payload.codex.resolvedBin, undefined);
    assert.doesNotMatch(JSON.stringify(payload), /\/Users\/|auth\.json|XAI_API_KEY/);
  });
});

test("cancel·timeout 오류 코드는 모바일에서 분기 가능하다", () => {
  assert.equal(normalizeV1Error({ code: "GROK_TIMEOUT", status: 499, message: "번역 요청이 취소되었습니다." }).code, "REQUEST_CANCELLED");
  assert.equal(normalizeV1Error({ code: "GROK_TIMEOUT", status: 504, message: "시간이 초과되었습니다." }).code, "PROVIDER_TIMEOUT");
  assert.equal(normalizeV1Error({ code: "GROK_RATE_LIMITED", status: 429, message: "한도" }).code, "PROVIDER_RATE_LIMIT");
  assert.equal(COMPOSE_CACHE_TTL_MS, 10 * 60 * 1000);
  assert.equal(COMPOSE_CACHE_MAX_ENTRIES, 64);
});

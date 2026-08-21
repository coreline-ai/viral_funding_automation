import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CodexOAuthProxyRunner,
  loadCodexOAuthProxyConfig,
} from "../src/providers/codex-oauth-proxy.mjs";

async function withCredential(run) {
  const root = await mkdtemp(join(tmpdir(), "viral-codex-proxy-test-"));
  const file = join(root, "caller.secret");
  const secret = "v".repeat(32);
  await writeFile(file, secret, { mode: 0o600 });
  await chmod(file, 0o600);
  try {
    return await run({ root, file, secret });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("Codex OAuth Proxy 설정은 loopback·전용 caller credential만 허용한다", async () => {
  await withCredential(async ({ file }) => {
    const config = loadCodexOAuthProxyConfig({
      VIRAL_CODEX_PROXY_BASE_URL: "http://127.0.0.1:4348",
      VIRAL_CODEX_PROXY_SECRET_FILE: file,
      VIRAL_CODEX_PROXY_CALLER_ID: "viral",
    });
    assert.equal(config.enabled, true);
    assert.equal(config.securityStatus, "restricted");
    assert.equal(loadCodexOAuthProxyConfig({}).enabled, false);
    assert.throws(() => loadCodexOAuthProxyConfig({
      VIRAL_CODEX_PROXY_BASE_URL: "https://proxy.example.com",
      VIRAL_CODEX_PROXY_SECRET_FILE: file,
    }), /loopback/);
    assert.throws(() => loadCodexOAuthProxyConfig({
      VIRAL_CODEX_PROXY_BASE_URL: "http://127.0.0.1:4348",
      VIRAL_CODEX_PROXY_SECRET_FILE: "relative.secret",
    }), /절대 경로/);
  });
});

test("Codex OAuth Proxy runner는 JSON 계약으로 한 턴을 호출하고 비밀을 응답에 남기지 않는다", async () => {
  await withCredential(async ({ file, secret }) => {
    const seen = [];
    const runner = new CodexOAuthProxyRunner(loadCodexOAuthProxyConfig({
      VIRAL_CODEX_PROXY_BASE_URL: "http://127.0.0.1:4348",
      VIRAL_CODEX_PROXY_SECRET_FILE: file,
    }), {
      fetchImpl: async (url, init = {}) => {
        seen.push({ url, init });
        if (String(url).endsWith("/ready")) {
          return new Response(JSON.stringify({ ready: true, version: "codex-cli test" }), { status: 200 });
        }
        return new Response(JSON.stringify({
          requestId: "one-turn",
          text: JSON.stringify({
            englishSummary: { oneSentence: "Atlas", shortIntro: "Graph", features: ["Three.js"], demoBoundary: "Read-only demo" },
            publishFields: { body: "AI Systems Atlas https://example.test" },
          }),
        }), { status: 200 });
      },
    });
    const readiness = await runner.readiness();
    assert.equal(readiness.securityStatus, "restricted");
    const result = await runner.run({
      requestId: "one-turn",
      prompt: "Return JSON only.",
      schema: { type: "object", additionalProperties: false },
    });
    assert.equal(result.requestId, "one-turn");
    assert.equal(result.payload.publishFields.body, "AI Systems Atlas https://example.test");
    const call = seen.at(-1);
    assert.equal(call.init.headers.authorization, `Bearer ${secret}`);
    assert.equal(call.init.headers["x-heybot-service-id"], "viral");
    assert.match(JSON.parse(call.init.body).input.messages[0].content, /OUTPUT_SCHEMA=/);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
  });
});

test("Codex OAuth Proxy runner는 caller 인증 오류를 비밀 없이 변환한다", async () => {
  await withCredential(async ({ file }) => {
    const runner = new CodexOAuthProxyRunner(loadCodexOAuthProxyConfig({
      VIRAL_CODEX_PROXY_BASE_URL: "http://127.0.0.1:4348",
      VIRAL_CODEX_PROXY_SECRET_FILE: file,
    }), {
      fetchImpl: async () => new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), { status: 401 }),
    });
    await assert.rejects(
      () => runner.run({ requestId: "unauthorized", prompt: "x", schema: {} }),
      (error) => error?.code === "CODEX_PROXY_UNAUTHORIZED" && !/Bearer|secret/i.test(error.message),
    );
  });
});

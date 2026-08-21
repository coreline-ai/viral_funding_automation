import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { BoundedConversationQueue } from "../src/grok-oauth-proxy.mjs";
import { FakeGrokTextRunner } from "../src/grok-oauth-proxy.mjs";
import { hashPublishFields } from "../src/drafts.mjs";
import { assertLoopbackHost, createAppServer, DEFAULT_HOST } from "../src/server.mjs";
import {
  COMPOSE_EXAMPLE,
  COMPOSE_CACHE_MAX_ENTRIES,
  COMPOSE_CACHE_TTL_MS,
  normalizeV1Error,
} from "../src/api/v1/contract.mjs";

const yaml = await readFile(new URL("../openapi/viral-api.v1.yaml", import.meta.url), "utf8");
const parsedOpenApi = (() => {
  const result = spawnSync("python3", ["-c", "import json, sys, yaml; print(json.dumps(yaml.safe_load(sys.stdin.read())))"], {
    input: yaml,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`OpenAPI YAML parser failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
})();

function assertOpenApiSchema(name, payload) {
  const result = spawnSync("python3", ["scripts/validate-openapi-schema.py", name], {
    cwd: process.cwd(),
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

async function withServer(options, callback) {
  const webRoot = await mkdtemp(join(tmpdir(), "viral-openapi-"));
  await Promise.all([
    writeFile(join(webRoot, "index.html"), "<!doctype html><title>Coreline Launch</title>"),
    writeFile(join(webRoot, "favicon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
    writeFile(join(webRoot, "styles.css"), ":root{}"),
    writeFile(join(webRoot, "app.js"), "export {};"),
  ]);
  const server = createAppServer({ webRoot, requestGuards: false, ...options });
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

test("OpenAPI 3.1 문서는 parser로 읽히며 v1 경로·상태·오류 코드를 모델링한다", () => {
  assert.equal(parsedOpenApi.openapi, "3.1.0");
  for (const path of [
    "/api/v1/capabilities",
    "/api/v1/providers/readiness",
    "/api/v1/providers/probe",
    "/api/v1/drafts/compose",
    "/api/v1/drafts/review",
    "/api/v1/drafts/validate",
    "/api/v1/approval-revisions",
    "/api/v1/publish-intents",
    "/api/v1/dry-runs",
  ]) {
    assert.ok(parsedOpenApi.paths[path]);
  }
  for (const code of ["SOURCE_STALE", "QUEUE_FULL", "REQUEST_CANCELLED", "PROVIDER_TIMEOUT", "PROVIDER_RATE_LIMIT", "UNKNOWN_FIELD", "SENSITIVE_PROVIDER_OUTPUT", "PROVIDER_SECURITY_DISABLED", "DUPLICATE_PUBLISH_INTENT", "SENSITIVE_APPROVAL_INPUT", "STALE_ACCOUNT", "POLICY_REVERIFY_REQUIRED", "DRY_RUN_UNSUPPORTED_CHANNEL", "CREDENTIAL_HANDLE_REQUIRED", "DRY_RUN_KILL_SWITCH_REQUIRED", "SENSITIVE_DRY_RUN_EVIDENCE"]) {
    assert.ok(parsedOpenApi.components.schemas.ErrorCode.enum.includes(code));
  }
  assert.deepEqual(parsedOpenApi.components.schemas.ProviderReadiness.properties.securityStatus.enum, ["restricted", "experimental", "disabled"]);
  assert.deepEqual(parsedOpenApi.components.schemas.Capabilities.properties.bind.properties.host.enum, ["127.0.0.1", "localhost", "::1"]);
  assert.equal(parsedOpenApi.components.schemas.Capabilities.properties.cors.const, "disabled");
  assert.equal(parsedOpenApi.components.schemas.ComposeRequestBase.properties.schemaVersion.const, "viral-compose-request/v1");
  assert.deepEqual(parsedOpenApi.components.schemas.ComposeRequestBase.properties.targetLocale.enum, ["ko-KR", "en-US", "ja-JP", "zh-CN", "es-ES"]);
  assert.match(parsedOpenApi.components.schemas.ComposeRequest.allOf[1].$ref, /channel-publish-fields\.v1\.json#\/ComposeRequestChannel$/);
  assert.equal(parsedOpenApi.paths["/api/v1/drafts/compose"].post.requestBody.content["application/json"].example.requestId, "req_example_compose");
  assert.ok(parsedOpenApi.paths["/api/v1/drafts/compose"].post.parameters.some((item) => item.$ref.endsWith("LoopbackNonce")));
  assert.equal(parsedOpenApi.components.schemas.ApprovalRevisionRequest.properties.schemaVersion.const, "viral-approval-revision-request/v1");
  assert.deepEqual(parsedOpenApi.components.schemas.PublishIntent.properties.status.enum, ["draft", "ready_for_dry_run", "blocked", "expired"]);
  assert.equal(parsedOpenApi.components.schemas.DryRunRequest.properties.schemaVersion.const, "viral-dry-run-request/v1");
  assert.equal(parsedOpenApi.components.schemas.DryRunReceipt.properties.networkWriteCount.const, 0);
  assert.equal(parsedOpenApi.components.schemas.DryRunSafety.properties.userKillSwitch.const, "live_write_locked");
  const socialAutomation = parsedOpenApi.components.schemas.Capabilities.properties.socialAutomation;
  assert.ok(parsedOpenApi.components.schemas.Capabilities.required.includes("socialAutomation"));
  assert.equal(socialAutomation.properties.decision.const, "NO_GO_PENDING_EXTERNAL_INPUTS");
  assert.equal(socialAutomation.properties.actualPublishCapability.const, false);
  assert.equal(socialAutomation.properties.actualUploadCapability.const, false);
  assert.equal(socialAutomation.properties.actualScheduleCapability.const, false);
  assert.equal(socialAutomation.properties.nextScope.properties.platform.const, "threads");
  assert.equal(socialAutomation.properties.nextScope.properties.maxPostsPerApproval.const, 1);
});

test("기본 bind는 loopback이고 CORS 헤더를 열지 않는다", async () => {
  assert.equal(DEFAULT_HOST, "127.0.0.1");
  assert.throws(() => assertLoopbackHost("0.0.0.0"), (error) => error?.code === "LOOPBACK_ONLY");
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
    assert.equal(payload.publishIntents.scope, "process_local");
    assert.equal(payload.publishIntents.actualNetworkWrite, false);
    assert.deepEqual(payload.dryRunConnectors.platforms, ["threads", "x", "linkedin"]);
    assert.equal(payload.dryRunConnectors.actualNetworkWrite, false);
    assert.equal(payload.dryRunConnectors.userKillSwitch, "live_write_locked");
    assert.equal(payload.socialAutomation.decision, "NO_GO_PENDING_EXTERNAL_INPUTS");
    assert.equal(payload.socialAutomation.externalInputsStatus, "deferred");
    assert.equal(payload.socialAutomation.actualPublishCapability, false);
    assert.equal(payload.socialAutomation.actualUploadCapability, false);
    assert.equal(payload.socialAutomation.actualScheduleCapability, false);
    assert.equal(payload.socialAutomation.nextScope.platform, "threads");
    assert.equal(payload.socialAutomation.nextScope.maxPostsPerApproval, 1);
    assert.ok(payload.channels.includes("x1"));
    assert.ok(payload.channels.includes("showHn"));
  });
});

test("Threads dry-run API는 승인 snapshot과 readiness를 대조해 local payload/receipt만 만들며 중복을 차단한다", async () => {
  let externalFetches = 0;
  await withServer({
    fetchImpl: async () => { externalFetches += 1; throw new Error("external fetch is forbidden"); },
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
  }, async (origin) => {
    const approvalRequest = {
      schemaVersion: "viral-approval-revision-request/v1",
      requestId: "req-threads-approval",
      channel: "threads",
      targetLocale: "en-US",
      publishFields: { posts: ["README grows quickly.", "This is a source-backed graph.", "Would this help your doc review?"] },
      sourcePublishFields: { posts: ["README가 늘어납니다.", "근거 그래프입니다.", "문서 검토에 도움이 될까요?"] },
      facts: { name: "AI Systems Atlas", repositoryUrl: "https://github.com/coreline-ai/memory_node_graph", demoUrl: "https://ai-systems-atlas.vercel.app/", license: "MIT", technologies: ["TypeScript"] },
      authorInputs: {},
      operationInputs: { firstImage: true },
      campaignBrief: { publisherRole: "curator", accountVoice: "personal", goal: "feedback", audience: "developers", targetLocale: "en-US" },
      accountTarget: { platform: "threads", accountId: "threads-123", targetId: "threads-123", targetType: "profile", handle: "coreline" },
      approvedBy: "Coreline reviewer",
      localeReviewed: true,
    };
    const approvalResponse = await fetch(`${origin}/api/v1/approval-revisions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(approvalRequest),
    });
    assert.equal(approvalResponse.status, 200);
    const approval = (await approvalResponse.json()).approvalRevision;
    const dryRunRequest = {
      schemaVersion: "viral-dry-run-request/v1",
      requestId: "req-threads-dry-run",
      approvalRevision: approval,
      readiness: {
        schemaVersion: "viral-platform-readiness/v1",
        platform: "threads",
        account: { accountType: "threads_profile", profileId: "threads-123", targetId: "threads-123", targetType: "profile", handle: "coreline", profileUrl: "https://www.threads.net/@coreline", owner: "Coreline AI", timezone: "Asia/Seoul", targetLocale: "en-US" },
        developerApp: { configured: true, appId: "meta-app-123", approvedScopes: ["threads_basic", "threads_content_publish"], redirectUri: "http://127.0.0.1:4310/oauth/callback", credentialVaultConfirmed: true, credentialVaultStatus: "external_vault_required" },
        policy: { url: "https://developers.facebook.com/docs/threads", verifiedAt: "2026-08-21" },
        asset: null,
      },
      operationInputs: { firstImage: true },
      credentialHandle: "vault-ref-threads-001",
      safety: { schemaVersion: "viral-dry-run-safety/v1", execution: "dry_run", userKillSwitch: "live_write_locked", liveWriteLocked: true },
    };
    assertOpenApiSchema("DryRunRequest", dryRunRequest);
    const dryRunResponse = await fetch(`${origin}/api/v1/dry-runs`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dryRunRequest),
    });
    assert.equal(dryRunResponse.status, 200);
    const result = await dryRunResponse.json();
    assert.equal(result.schemaVersion, "viral-dry-run-response/v1");
    assert.equal(result.publishIntent.status, "ready_for_dry_run");
    assert.deepEqual(result.dryRun.payload.payloads.map((entry) => entry.text), approval.publishFields.posts);
    assert.equal(result.dryRun.receipt.networkWriteCount, 0);
    assert.equal(result.dryRun.receipt.credential.handleProvided, true);
    assert.equal(result.dryRun.receipt.safety.liveWriteLocked, true);
    assert.equal(result.evidenceManifest.networkWriteCount, 0);
    assert.equal(result.evidenceManifest.credentialHandlePresent, true);
    assert.doesNotMatch(JSON.stringify(result.dryRun.receipt), /vault-ref|README grows|token|secret|password|authorization/i);
    assertOpenApiSchema("DryRunResponse", result);

    const duplicate = await fetch(`${origin}/api/v1/dry-runs`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...dryRunRequest, requestId: "req-threads-dry-run-2" }),
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).error.code, "DUPLICATE_PUBLISH_INTENT");
  });
  assert.equal(externalFetches, 0);
});

test("dry-run API는 credential reference 누락과 해제된 kill switch를 구체적인 코드로 거부한다", async () => {
  await withServer({
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
  }, async (origin) => {
    const base = {
      schemaVersion: "viral-dry-run-request/v1",
      requestId: "req-missing-control",
      approvalRevision: {},
      readiness: {},
    };
    const missingHandle = await fetch(`${origin}/api/v1/dry-runs`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(base),
    });
    assert.equal(missingHandle.status, 400);
    assert.equal((await missingHandle.json()).error.code, "CREDENTIAL_HANDLE_REQUIRED");

    const missingKillSwitch = await fetch(`${origin}/api/v1/dry-runs`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...base, credentialHandle: "vault-ref-threads-001" }),
    });
    assert.equal(missingKillSwitch.status, 409);
    assert.equal((await missingKillSwitch.json()).error.code, "DRY_RUN_KILL_SWITCH_REQUIRED");

    const unlocked = await fetch(`${origin}/api/v1/dry-runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...base, credentialHandle: "vault-ref-threads-001", safety: { schemaVersion: "viral-dry-run-safety/v1", execution: "dry_run", userKillSwitch: "live_write_locked", liveWriteLocked: false } }),
    });
    assert.equal(unlocked.status, 409);
    assert.equal((await unlocked.json()).error.code, "DRY_RUN_KILL_SWITCH_REQUIRED");
  });
});

test("approval snapshot과 process-local publish intent API는 copy 무결성과 중복 차단만 제공한다", async () => {
  await withServer({
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
  }, async (origin) => {
    const approvalRequest = {
      schemaVersion: "viral-approval-revision-request/v1",
      requestId: "req-approval-1",
      channel: "x1",
      targetLocale: "en-US",
      publishFields: { body: "AI Systems Atlas https://ai-systems-atlas.vercel.app/" },
      sourcePublishFields: { body: "AI Systems Atlas 소개 https://ai-systems-atlas.vercel.app/" },
      facts: { name: "AI Systems Atlas", repositoryUrl: "https://github.com/coreline-ai/memory_node_graph", demoUrl: "https://ai-systems-atlas.vercel.app/", license: "MIT", technologies: ["TypeScript"] },
      authorInputs: {},
      operationInputs: {},
      campaignBrief: { publisherRole: "curator", accountVoice: "personal", goal: "feedback", audience: "developers", targetLocale: "en-US" },
      approvedBy: "Coreline reviewer",
      localeReviewed: true,
    };
    assertOpenApiSchema("ApprovalRevisionRequest", approvalRequest);
    const approvalResponse = await fetch(`${origin}/api/v1/approval-revisions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(approvalRequest),
    });
    assert.equal(approvalResponse.status, 200);
    const approvalPayload = await approvalResponse.json();
    assert.equal(approvalPayload.approvalRevision.copyText, approvalRequest.publishFields.body);
    assertOpenApiSchema("ApprovalRevisionResponse", approvalPayload);
    assert.doesNotMatch(JSON.stringify(approvalPayload), /token|secret|password|authorization/i);

    const intentRequest = {
      schemaVersion: "viral-publish-intent-request/v1",
      requestId: "req-intent-1",
      approvalRevision: approvalPayload.approvalRevision,
    };
    assertOpenApiSchema("PublishIntentRequest", intentRequest);
    const intentResponse = await fetch(`${origin}/api/v1/publish-intents`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(intentRequest),
    });
    assert.equal(intentResponse.status, 200);
    const intentPayload = await intentResponse.json();
    assert.equal(intentPayload.publishIntent.status, "draft");
    assertOpenApiSchema("PublishIntentResponse", intentPayload);
    assert.equal("publish" in intentPayload.publishIntent, false);

    const duplicate = await fetch(`${origin}/api/v1/publish-intents`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...intentRequest, requestId: "req-intent-2" }),
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).error.code, "DUPLICATE_PUBLISH_INTENT");
  });
});

test("운영 v1 POST는 loopback Host·동일 Origin·launch nonce 없이는 실행하지 않는다", async () => {
  const webRoot = await mkdtemp(join(tmpdir(), "viral-openapi-guard-"));
  await Promise.all([
    writeFile(join(webRoot, "index.html"), "<!doctype html>"),
    writeFile(join(webRoot, "favicon.svg"), "<svg/>"),
    writeFile(join(webRoot, "styles.css"), ""),
    writeFile(join(webRoot, "app.js"), ""),
  ]);
  const server = createAppServer({
    webRoot,
    launchNonce: "test-launch-nonce",
    grokRunner: new FakeGrokTextRunner(async () => english),
    codexRunner: new FakeGrokTextRunner(async () => english),
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const body = JSON.stringify({ ...COMPOSE_EXAMPLE, sourceHash: hashPublishFields(COMPOSE_EXAMPLE.publishFields) });
  try {
    const missing = await fetch(`${origin}/api/v1/drafts/compose`, { method: "POST", headers: { "content-type": "application/json" }, body });
    assert.equal(missing.status, 403);
    assert.equal((await missing.json()).error.code, "INVALID_ORIGIN");
    const dryRunMissing = await fetch(`${origin}/api/v1/dry-runs`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(dryRunMissing.status, 403);
    assert.equal((await dryRunMissing.json()).error.code, "INVALID_ORIGIN");
    const wrongOrigin = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://evil.example", "x-viral-nonce": "test-launch-nonce" },
      body,
    });
    assert.equal(wrongOrigin.status, 403);
    const allowed = await fetch(`${origin}/api/v1/drafts/compose`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-viral-nonce": "test-launch-nonce" },
      body,
    });
    assert.equal(allowed.status, 200);
    assert.ok(allowed.headers.get("x-request-id"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(webRoot, { recursive: true, force: true });
  }
});

test("readiness GET은 query가 있어도 probe를 실행하지 않고 보호된 POST만 probe한다", async () => {
  let probes = 0;
  const runner = {
    async readiness({ probeAuth = false } = {}) {
      if (probeAuth) probes += 1;
      return { status: "ready", ready: true, version: "fake", securityStatus: "restricted" };
    },
    async run() { return { payload: english }; },
  };
  const webRoot = await mkdtemp(join(tmpdir(), "viral-openapi-probe-"));
  await Promise.all([
    writeFile(join(webRoot, "index.html"), "<!doctype html>"), writeFile(join(webRoot, "favicon.svg"), "<svg/>"),
    writeFile(join(webRoot, "styles.css"), ""), writeFile(join(webRoot, "app.js"), ""),
  ]);
  const server = createAppServer({ webRoot, launchNonce: "probe-nonce", grokRunner: runner, codexRunner: runner });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const get = await fetch(`${origin}/api/v1/providers/readiness?probe=1`);
    assert.equal(get.status, 200);
    assert.equal(probes, 0);
    const post = await fetch(`${origin}/api/v1/providers/probe`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-viral-nonce": "probe-nonce" },
      body: "{}",
    });
    assert.equal(post.status, 200);
    assert.equal(probes, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(webRoot, { recursive: true, force: true });
  }
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
    assert.equal(payload.supportMode, "compose");
    assert.equal(payload.contentStatus, "candidate");
    assert.equal(payload.operationsStatus, "ready");
    assert.equal(payload.approvalStatus, "unreviewed");
    assert.equal(payload.publishReady, false);
    assertOpenApiSchema("ComposeRequest", body);
    assertOpenApiSchema("ComposeResponse", payload);
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
    assertOpenApiSchema("ErrorEnvelope", stalePayload);
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

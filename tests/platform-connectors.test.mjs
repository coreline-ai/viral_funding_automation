import assert from "node:assert/strict";
import test from "node:test";

import {
  CREDENTIAL_RESOLUTION_STATUS,
  classifyDryRunError,
  resolveDryRunCredential,
  validateDryRunIntent,
} from "../src/platforms/connector.mjs";
import { DRY_RUN_CONNECTORS, buildConnectorDryRun, dryRunConnectorForChannel } from "../src/platforms/registry.mjs";
import { createApprovalRevision, createPublishIntent } from "../src/publish-intent.mjs";

const facts = Object.freeze({
  name: "AI Systems Atlas",
  repositoryUrl: "https://github.com/coreline-ai/memory_node_graph",
  demoUrl: "https://ai-systems-atlas.vercel.app/",
  license: "MIT",
  technologies: ["TypeScript"],
});

function base(channel, publishFields, operationInputs = {}) {
  return {
    channel,
    targetLocale: "en-US",
    publishFields,
    sourcePublishFields: publishFields,
    facts,
    authorInputs: {},
    operationInputs,
    campaignBrief: {
      publisherRole: "curator",
      accountVoice: "personal",
      goal: "feedback",
      audience: "developers",
      targetLocale: "en-US",
    },
    approvedBy: "Coreline reviewer",
    localeReviewed: true,
  };
}

function readiness(platform, overrides = {}) {
  const shared = {
    x: {
      accountType: "personal", profileId: "x-123", targetId: "x-123", targetType: "profile", handle: "coreline",
      profileUrl: "https://x.com/coreline", owner: "Coreline AI", timezone: "Asia/Seoul", targetLocale: "en-US",
      appId: "x-app-123", scopes: ["tweet.write"], policy: "https://docs.x.com/x-api/posts/create-post",
    },
    threads: {
      accountType: "threads_profile", profileId: "threads-123", targetId: "threads-123", targetType: "profile", handle: "coreline",
      profileUrl: "https://www.threads.net/@coreline", owner: "Coreline AI", timezone: "Asia/Seoul", targetLocale: "en-US",
      appId: "meta-app-123", scopes: ["threads_basic", "threads_content_publish"], policy: "https://developers.facebook.com/docs/threads",
    },
    linkedin: {
      accountType: "person", profileId: "linkedin-123", targetId: "linkedin-123", targetType: "profile", handle: "coreline",
      profileUrl: "https://www.linkedin.com/in/coreline", owner: "Coreline AI", timezone: "Asia/Seoul", targetLocale: "en-US",
      appId: "linkedin-app-123", scopes: ["w_member_social"], policy: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api",
    },
  }[platform];
  return {
    schemaVersion: "viral-platform-readiness/v1",
    platform,
    account: {
      accountType: shared.accountType,
      profileId: shared.profileId,
      targetId: shared.targetId,
      targetType: shared.targetType,
      handle: shared.handle,
      profileUrl: shared.profileUrl,
      owner: shared.owner,
      timezone: shared.timezone,
      targetLocale: shared.targetLocale,
    },
    developerApp: {
      configured: true,
      appId: shared.appId,
      approvedScopes: shared.scopes,
      redirectUri: "http://127.0.0.1:4310/oauth/callback",
      credentialVaultConfirmed: true,
      credentialVaultStatus: "external_vault_required",
    },
    policy: { url: shared.policy, verifiedAt: "2026-08-21" },
    asset: null,
    ...overrides,
  };
}

function approved({ channel, publishFields, platform, operationInputs = {} }) {
  const currentReadiness = readiness(platform);
  return createApprovalRevision({
    ...base(channel, publishFields, operationInputs),
    accountTarget: {
      platform,
      accountId: currentReadiness.account.profileId,
      targetId: currentReadiness.account.targetId,
      targetType: currentReadiness.account.targetType,
      handle: currentReadiness.account.handle,
    },
  }, { approvedAt: "2026-08-21T10:00:00.000Z" });
}

function intentFor(revision, currentReadiness) {
  return createPublishIntent({ approvalRevision: revision, readiness: currentReadiness, operationInputs: revision.operationInputs, createdAt: "2026-08-21T10:01:00.000Z" });
}

const safety = Object.freeze({
  schemaVersion: "viral-dry-run-safety/v1",
  execution: "dry_run",
  userKillSwitch: "live_write_locked",
  liveWriteLocked: true,
});

test("Threads connector는 승인 snapshot과 동일한 텍스트만 local dry-run payload로 만들고 receipt에는 원고 전문을 남기지 않는다", () => {
  const revision = approved({
    channel: "threads",
    platform: "threads",
    publishFields: { posts: ["README grows quickly.", "This is a source-backed graph.", "Would this help your doc review?"] },
    operationInputs: { firstImage: true },
  });
  const currentReadiness = readiness("threads");
  const intent = intentFor(revision, currentReadiness);
  assert.equal(intent.status, "ready_for_dry_run");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("social network requests are forbidden"); };
  try {
    const result = buildConnectorDryRun({ approvalRevision: revision, readiness: currentReadiness, operationInputs: revision.operationInputs, publishIntent: intent, credentialHandle: "vault-ref-threads-001", safety, requestedAt: "2026-08-21T10:02:00.000Z" });
    assert.equal(result.connector, "threads-text-dry-run");
    assert.deepEqual(result.payload.payloads.map((entry) => entry.text), revision.publishFields.posts);
    assert.equal(result.receipt.networkWriteCount, 0);
    assert.equal(result.receipt.execution, "dry_run");
    assert.equal(result.receipt.credential.status, CREDENTIAL_RESOLUTION_STATUS);
    assert.equal(result.receipt.credential.handleProvided, true);
    assert.equal(result.receipt.safety.liveWriteLocked, true);
    assert.match(result.receipt.account.accountId, /^••••-123$/);
    assert.doesNotMatch(JSON.stringify(result.receipt), /README grows|source-backed|vault-ref|token|secret|password|authorization/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("X와 LinkedIn은 endpoint 호출 없이 각자의 텍스트 payload schema만 계산한다", () => {
  const xRevision = approved({ channel: "x1", platform: "x", publishFields: { body: "AI Systems Atlas https://ai-systems-atlas.vercel.app/" } });
  const xReadiness = readiness("x");
  const xResult = buildConnectorDryRun({ approvalRevision: xRevision, readiness: xReadiness, publishIntent: intentFor(xRevision, xReadiness), credentialHandle: "vault-ref-x-001", safety });
  assert.equal(xResult.payload.endpointClass, "x_text_post");
  assert.equal(xResult.payload.payloads[0].text, xRevision.publishFields.body);

  const linkedinRevision = approved({ channel: "linkedin", platform: "linkedin", publishFields: { body: "AI Systems Atlas is a read-only Markdown graph demo." } });
  const linkedinReadiness = readiness("linkedin");
  const linkedinResult = buildConnectorDryRun({ approvalRevision: linkedinRevision, readiness: linkedinReadiness, publishIntent: intentFor(linkedinRevision, linkedinReadiness), credentialHandle: "vault-ref-linkedin-001", safety });
  assert.equal(linkedinResult.payload.endpointClass, "linkedin_text_post");
  assert.deepEqual(linkedinResult.payload.requiredVersionHeaders, ["Linkedin-Version: YYYYMM", "X-Restli-Protocol-Version: 2.0.0"]);
  assert.equal(linkedinResult.payload.payloads[0].author, "urn:li:person:linkedin-123");
});

test("계정·자산·정책 사전조건이 바뀌면 adapter payload 전에 hard block하며 unsupported channel에는 connector가 없다", () => {
  const revision = approved({
    channel: "threads",
    platform: "threads",
    publishFields: { posts: ["One.", "Two.", "Three?"] },
    operationInputs: { firstImage: true },
  });
  const changedAccount = readiness("threads", { account: { ...readiness("threads").account, profileId: "threads-999", targetId: "threads-999" } });
  const stale = validateDryRunIntent({ approvalRevision: revision, readiness: changedAccount, operationInputs: revision.operationInputs });
  assert.equal(stale.ok, false);
  assert.ok(stale.issues.some((entry) => entry.code === "STALE_ACCOUNT"));
  assert.throws(
    () => buildConnectorDryRun({ approvalRevision: revision, readiness: changedAccount, operationInputs: revision.operationInputs, publishIntent: intentFor(revision, readiness("threads")), credentialHandle: "vault-ref-threads-001", safety }),
    (error) => error?.code === "STALE_ACCOUNT",
  );

  const expired = readiness("threads", { policy: { url: "https://developers.facebook.com/docs/threads", verifiedAt: "2026-06-01" } });
  assert.ok(validateDryRunIntent({ approvalRevision: revision, readiness: expired, operationInputs: revision.operationInputs }).issues.some((entry) => entry.code === "POLICY_REVERIFY_REQUIRED"));
  assert.equal(dryRunConnectorForChannel("reddit"), null);
  assert.deepEqual(Object.keys(DRY_RUN_CONNECTORS).sort(), ["linkedin", "threads", "x"]);
});

test("credential reference 누락과 user kill switch 해제는 payload build 전에 fail-closed한다", () => {
  const revision = approved({ channel: "x1", platform: "x", publishFields: { body: "AI Systems Atlas https://ai-systems-atlas.vercel.app/" } });
  const currentReadiness = readiness("x");
  const publishIntent = intentFor(revision, currentReadiness);
  assert.throws(
    () => buildConnectorDryRun({ approvalRevision: revision, readiness: currentReadiness, publishIntent, safety }),
    (error) => error?.code === "CREDENTIAL_HANDLE_REQUIRED",
  );
  assert.throws(
    () => buildConnectorDryRun({ approvalRevision: revision, readiness: currentReadiness, publishIntent, credentialHandle: "vault-ref-x-001", safety: { ...safety, liveWriteLocked: false } }),
    (error) => error?.code === "DRY_RUN_KILL_SWITCH_REQUIRED",
  );
});

test("credential resolver는 opaque handle 상태만 노출하고 401·403·409·429와 stale/duplicate을 재시도 금지로 분류한다", () => {
  const resolution = resolveDryRunCredential({ credentialHandle: "vault-ref-x-001" });
  assert.deepEqual(resolution, { status: "not_configured", handleProvided: true, liveWriteBlocked: true });
  assert.equal(resolveDryRunCredential({ credentialHandle: "actual token value" }).handleProvided, false);
  for (const error of [{ status: 401 }, { status: 403 }, { status: 409 }, { status: 429 }, { code: "DUPLICATE_PUBLISH_INTENT" }, { code: "STALE_APPROVAL" }, { code: "POLICY_REVERIFY_REQUIRED" }]) {
    assert.equal(classifyDryRunError(error).retryable, false);
  }
});

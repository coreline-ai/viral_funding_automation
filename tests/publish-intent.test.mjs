import assert from "node:assert/strict";
import test from "node:test";

import { serializePublish } from "../src/drafts.mjs";
import {
  APPROVAL_REVISION_SCHEMA_VERSION,
  PUBLISH_INTENT_SCHEMA_VERSION,
  PUBLISH_INTENT_STATUSES,
  PublishIntentError,
  approvalInvalidationReasons,
  assessApprovalRevision,
  createApprovalRevision,
  createPublishIntent,
  createPublishIntentStore,
  publishIntentDuplicateKey,
} from "../src/publish-intent.mjs";

const base = Object.freeze({
  channel: "x1",
  targetLocale: "en-US",
  publishFields: { body: "AI Systems Atlas https://atlas.example" },
  sourcePublishFields: { body: "AI Systems Atlas를 소개합니다. https://atlas.example" },
  facts: {
    name: "AI Systems Atlas",
    repositoryUrl: "https://github.com/coreline-ai/memory_node_graph",
    demoUrl: "https://atlas.example",
    license: "MIT",
    technologies: ["TypeScript"],
  },
  authorInputs: {},
  operationInputs: {},
  campaignBrief: { publisherRole: "curator", accountVoice: "personal", goal: "feedback", audience: "developers", targetLocale: "en-US" },
  approvedBy: "Coreline reviewer",
  localeReviewed: true,
});

function revision(overrides = {}) {
  return createApprovalRevision({ ...base, ...overrides }, { approvedAt: "2026-08-21T10:00:00.000Z" });
}

test("승인 revision은 승인된 게시 필드와 모든 approval 입력을 불변 snapshot으로 보관한다", () => {
  const approved = revision();
  assert.equal(approved.schemaVersion, APPROVAL_REVISION_SCHEMA_VERSION);
  assert.equal(approved.status, "approved");
  assert.equal(approved.targetLocale, "en-US");
  assert.equal(approved.copyText, serializePublish("x1", base.publishFields));
  assert.match(approved.contentHash, /^[a-f0-9]{64}$/);
  assert.match(approved.sourceFingerprint, /^[a-f0-9]{64}$/);
  assert.match(approved.factsFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(approved.assetHash, null);
  assert.equal(approved.accountTarget, null);
  assert.ok(Object.isFrozen(approved));
  assert.ok(Object.isFrozen(approved.publishFields));
  assert.equal(assessApprovalRevision(approved, base).status, "approved");
});

test("원고·원문·사실·언어·작성자/운영 입력·자산·계정 변경은 승인 snapshot을 무효화한다", () => {
  const approved = revision({
    assetHash: "a".repeat(64),
    accountTarget: { platform: "x", accountId: "acct_1", targetId: "self", targetType: "profile", handle: "coreline" },
  });
  const cases = [
    ["PUBLISH_FIELDS_CHANGED", { publishFields: { body: "changed https://atlas.example" } }],
    ["SOURCE_CHANGED", { sourcePublishFields: { body: "원문 변경 https://atlas.example" } }],
    ["FACTS_CHANGED", { facts: { ...base.facts, name: "Changed Atlas" } }],
    ["LOCALE_CHANGED", { targetLocale: "ja-JP" }],
    ["AUTHOR_INPUTS_CHANGED", { authorInputs: { note: "real author note" } }],
    ["OPERATION_INPUTS_CHANGED", { operationInputs: { firstImage: true } }],
    ["ASSET_CHANGED", { assetHash: "b".repeat(64) }],
    ["ACCOUNT_TARGET_CHANGED", { accountTarget: { platform: "x", accountId: "acct_2", targetId: "self", targetType: "profile" } }],
  ];
  for (const [reason, override] of cases) {
    const current = { ...base, assetHash: approved.assetHash, accountTarget: approved.accountTarget, ...override, localeReviewed: true };
    assert.ok(approvalInvalidationReasons(approved, current).includes(reason), reason);
    assert.equal(assessApprovalRevision(approved, current).status, "invalidated", reason);
  }
});

test("manual/reference-only 채널과 credential처럼 보이는 값은 snapshot 전에 차단한다", () => {
  assert.throws(() => revision({ channel: "reddit" }), (error) => error instanceof PublishIntentError && error.code === "MANUAL_ONLY_PLATFORM");
  assert.throws(() => revision({ localeReviewed: false }), (error) => error instanceof PublishIntentError && error.code === "LOCALE_REVIEW_REQUIRED");
  assert.throws(() => revision({ authorInputs: { accessToken: "sk-this-should-never-be-stored" } }), (error) => error instanceof PublishIntentError && error.code === "SENSITIVE_APPROVAL_INPUT");
  assert.throws(() => revision({ approvedBy: "x" }), (error) => error instanceof PublishIntentError && error.code === "INVALID_APPROVAL_INPUT");
});

test("publish intent는 허용 상태 집합만 쓰며 중복 키로 같은 snapshot을 한 번만 기록한다", () => {
  const approved = revision({
    assetHash: "a".repeat(64),
    accountTarget: { platform: "x", accountId: "acct_1", targetId: "self", targetType: "profile" },
  });
  const intent = createPublishIntent({ approvalRevision: approved, createdAt: "2026-08-21T10:01:00.000Z" });
  assert.equal(intent.schemaVersion, PUBLISH_INTENT_SCHEMA_VERSION);
  assert.ok(PUBLISH_INTENT_STATUSES.includes(intent.status));
  assert.equal(intent.status, "blocked");
  assert.ok(intent.blockedReasons.includes("PHASE_1_CONNECTOR_DISABLED"));
  assert.equal(intent.duplicateKey, publishIntentDuplicateKey(approved));
  assert.equal("publish" in intent, false);
  assert.equal("accessToken" in intent, false);

  const store = createPublishIntentStore();
  const first = store.create({ approvalRevision: approved, createdAt: "2026-08-21T10:01:00.000Z" });
  assert.equal(store.size, 1);
  assert.equal(first.duplicateKey, intent.duplicateKey);
  assert.throws(
    () => store.create({ approvalRevision: approved, createdAt: "2026-08-21T10:02:00.000Z" }),
    (error) => error instanceof PublishIntentError && error.code === "DUPLICATE_PUBLISH_INTENT" && error.status === 409,
  );
});

test("계정 target 전 snapshot은 draft이고 실제 플랫폼 요청을 만들지 않는다", () => {
  const intent = createPublishIntent({ approvalRevision: revision(), createdAt: "2026-08-21T10:01:00.000Z" });
  assert.equal(intent.status, "draft");
  assert.ok(intent.blockedReasons.includes("ACCOUNT_TARGET_REQUIRED"));
  assert.doesNotMatch(JSON.stringify(intent), /token|secret|password|authorization|https?:\/\//i);
});

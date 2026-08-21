import assert from "node:assert/strict";
import test from "node:test";

import { THREADS_PREVIEW_SCHEMA_VERSION, createThreadsPreviewModel } from "../src/threads-preview.mjs";

test("Threads preview model은 1~3개 원고의 줄바꿈과 순서를 변경하지 않는다", () => {
  const posts = ["첫 글\nhttps://example.test/one", "둘째 글", "셋째 글\n🙂"];
  const model = createThreadsPreviewModel({
    posts,
    locale: "en-US",
    approvalStatus: "approved",
    publicHandle: "coreline_ai",
  });

  assert.equal(model.schemaVersion, THREADS_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline_ai");
  assert.deepEqual(model.cards.map((card) => card.text), posts);
  assert.deepEqual(model.cards.map((card) => card.sequenceLabel), ["연속 게시 계획 · 1/3", "연속 게시 계획 · 2/3", "연속 게시 계획 · 3/3"]);
  assert.equal(model.externalWriteCount, 0);
  assert.match(model.notice, /비공식 Threads 스타일 미리보기/);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.cards), true);
  assert.equal(Object.isFrozen(model.cards[0]), true);
});

test("대상 언어가 없으면 원문 fallback 없이 empty state를 반환한다", () => {
  const model = createThreadsPreviewModel({
    posts: ["원문을 대신 보여주면 안 됩니다."],
    locale: "ja-JP",
    localeAvailable: false,
    approvalStatus: "unreviewed",
  });

  assert.equal(model.status.key, "empty");
  assert.equal(model.cards.length, 0);
  assert.match(model.emptyMessage, /원문으로 대체하지 않습니다/);
});

test("stale 또는 invalidated 원고는 승인 snapshot과 다름을 분명히 표시한다", () => {
  const staleLocale = createThreadsPreviewModel({ posts: ["수정본"], localeStale: true, approvalStatus: "approved" });
  const invalidatedApproval = createThreadsPreviewModel({ posts: ["수정본"], approvalStatus: "invalidated" });

  assert.equal(staleLocale.status.key, "stale");
  assert.equal(invalidatedApproval.status.key, "stale");
  assert.match(staleLocale.status.description, /승인 snapshot/);
});

test("preview model은 안전한 공개 handle만 노출하고 잘못된 값은 placeholder로 바꾼다", () => {
  const model = createThreadsPreviewModel({
    posts: ["안전한 원고"],
    publicHandle: "Bearer definitely-not-a-token-123456789",
    developerApp: { appId: "do-not-copy" },
    credentialHandle: "vault-ref-should-not-appear",
  });

  assert.equal(model.identity.handle, "@preview_account");
  assert.equal(model.identity.known, false);
  assert.doesNotMatch(JSON.stringify(model), /vault-ref|do-not-copy|Bearer/);
});

test("preview model은 빈 원고와 4개 이상 원고를 카드로 렌더하지 않는다", () => {
  assert.equal(createThreadsPreviewModel({ posts: [] }).cards.length, 0);
  assert.match(createThreadsPreviewModel({ posts: [] }).emptyMessage, /1~3개/);
  assert.equal(createThreadsPreviewModel({ posts: ["1", "2", "3", "4"] }).cards.length, 0);
  assert.equal(createThreadsPreviewModel({ posts: ["ok", ""] }).cards.length, 0);
});

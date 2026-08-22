import assert from "node:assert/strict";
import test from "node:test";

import { countXWeightedCharacters } from "../src/x-text.mjs";
import { X_PREVIEW_SCHEMA_VERSION, createXPreviewModel } from "../src/x-preview.mjs";

test("X 단일 원고 model은 줄바꿈·URL·가중 문자와 안전한 handle을 그대로 점검한다", () => {
  const body = "첫 줄\nhttps://example.test/a-very-long-url\n한글🙂";
  const model = createXPreviewModel({
    channel: "x1",
    publishFields: { body },
    locale: "ko-KR",
    approvalStatus: "approved",
    publicHandle: "coreline_ai",
  });

  assert.equal(model.schemaVersion, X_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.kind, "single");
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline_ai");
  assert.equal(model.identity.initials, "CO");
  assert.equal(model.cards.length, 1);
  assert.equal(model.cards[0].text, body);
  assert.equal(model.cards[0].draftLabel, "원고 초안 · 게시 전");
  assert.equal(model.cards[0].weightedLength, countXWeightedCharacters(body));
  assert.equal(model.cards[0].urlCount, 1);
  assert.equal(model.cards[0].limit, 280);
  assert.equal(model.cards[0].remaining, 280 - countXWeightedCharacters(body));
  assert.equal(model.externalWriteCount, 0);
  assert.match(model.notice, /실제 X 화면·X 게시물·게시 예약 기능이 아닙니다/);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.cards), true);
  assert.equal(Object.isFrozen(model.cards[0]), true);
});

test("X 스레드 model은 현재 순서·줄바꿈을 보존하고 1~2개 구간은 경고한다", () => {
  const segments = ["첫 원고\n둘째 줄", "둘째 원고🙂"];
  const model = createXPreviewModel({
    channel: "xThread",
    publishFields: { segments },
    locale: "en-US",
  });

  assert.equal(model.kind, "thread");
  assert.deepEqual(model.cards.map((card) => card.text), segments);
  assert.deepEqual(model.cards.map((card) => card.sequenceLabel), ["스레드 원고 계획 · 1/2", "스레드 원고 계획 · 2/2"]);
  assert.deepEqual(model.cards.map((card) => card.draftLabel), ["연속 원고 · 1/2", "연속 원고 · 2/2"]);
  assert.equal(model.content.valid, false);
  assert.ok(model.content.issues.some((issue) => issue.code === "ARRAY_LENGTH"));
});

test("280/281 가중자 초과와 빈 본문은 숨기지 않고 content issue로 표시한다", () => {
  const within = createXPreviewModel({ channel: "x2", publishFields: { body: "a".repeat(280) } });
  const exceeded = createXPreviewModel({ channel: "x3", publishFields: { body: "a".repeat(281) } });
  const blank = createXPreviewModel({ channel: "x1", publishFields: { body: "" } });

  assert.equal(within.cards[0].overLimit, false);
  assert.equal(within.content.valid, true);
  assert.equal(exceeded.cards[0].overLimit, true);
  assert.equal(exceeded.cards[0].remaining, -1);
  assert.ok(exceeded.content.issues.some((issue) => issue.code === "X_LIMIT"));
  assert.equal(blank.cards.length, 1);
  assert.ok(blank.content.issues.some((issue) => issue.code === "EMPTY_FIELD"));
});

test("대상 언어가 없거나 stale이면 원문 fallback 없이 상태를 분리한다", () => {
  const empty = createXPreviewModel({
    channel: "x1",
    publishFields: { body: "원문을 대신 보여주면 안 됩니다." },
    locale: "ja-JP",
    localeAvailable: false,
  });
  const stale = createXPreviewModel({
    channel: "x1",
    publishFields: { body: "수정본" },
    localeStale: true,
    approvalStatus: "approved",
  });

  assert.equal(empty.status.key, "empty");
  assert.equal(empty.cards.length, 0);
  assert.equal(empty.content.issues.length, 0);
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(stale.status.key, "stale");
  assert.match(stale.status.description, /승인 snapshot/);
});

test("X review model은 안전하지 않은 handle과 비밀 성격 입력을 출력에 포함하지 않는다", () => {
  const model = createXPreviewModel({
    channel: "x1",
    publishFields: { body: "안전한 원고" },
    publicHandle: "Bearer definitely-not-a-token-123456",
    developerApp: { appId: "not-an-input" },
    credentialHandle: "vault-ref-should-not-appear",
  });

  assert.equal(model.identity.handle, "@preview_account");
  assert.equal(model.identity.known, false);
  assert.equal(model.identity.initials, "@");
  assert.doesNotMatch(JSON.stringify(model), /vault-ref|not-an-input|Bearer/);
});

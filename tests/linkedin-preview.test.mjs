import assert from "node:assert/strict";
import test from "node:test";

import {
  LINKEDIN_POST_CHARACTER_LIMIT,
  LINKEDIN_PREVIEW_SCHEMA_VERSION,
  createLinkedInPreviewModel,
} from "../src/linkedin-preview.mjs";

test("LinkedIn preview model은 현재 원고·줄바꿈·안전한 account handle과 승인 상태를 보존한다", () => {
  const body = "문서가 쌓일수록 연결은 더 찾기 어려워집니다.\n\n출처 근거를 함께 확인합니다.";
  const model = createLinkedInPreviewModel({
    publishFields: { body },
    locale: "ko-KR",
    approvalStatus: "approved",
    publicHandle: "coreline.ai",
  });

  assert.equal(model.schemaVersion, LINKEDIN_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.locale, "ko-KR");
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline.ai");
  assert.equal(model.identity.initials, "CO");
  assert.equal(model.content.body, body);
  assert.equal(model.content.characterCount, Array.from(body).length);
  assert.equal(model.content.remaining, LINKEDIN_POST_CHARACTER_LIMIT - Array.from(body).length);
  assert.equal(model.content.valid, true);
  assert.equal(model.externalWriteCount, 0);
  assert.match(model.notice, /실제 LinkedIn 화면·게시물·게시 예약 기능이 아닙니다/);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.content), true);
});

test("LinkedIn preview model은 3,000자 경계와 빈 본문을 숨기지 않는다", () => {
  const within = createLinkedInPreviewModel({ publishFields: { body: "a".repeat(3000) } });
  const exceeded = createLinkedInPreviewModel({ publishFields: { body: "a".repeat(3001) } });
  const blank = createLinkedInPreviewModel({ publishFields: { body: "" } });

  assert.equal(within.content.valid, true);
  assert.equal(within.content.remaining, 0);
  assert.equal(exceeded.content.overLimit, true);
  assert.equal(exceeded.content.remaining, -1);
  assert.ok(exceeded.content.issues.some((issue) => issue.code === "LINKEDIN_LIMIT"));
  assert.ok(blank.content.issues.some((issue) => issue.code === "EMPTY_FIELD"));
});

test("대상 언어 없음과 stale은 원문 fallback 없이 분리하며 비밀성 입력을 모델에 포함하지 않는다", () => {
  const empty = createLinkedInPreviewModel({
    publishFields: { body: "원문으로 대체하면 안 됩니다." },
    locale: "ja-JP",
    localeAvailable: false,
  });
  const stale = createLinkedInPreviewModel({
    publishFields: { body: "수정본" },
    localeStale: true,
    approvalStatus: "approved",
    publicHandle: "Bearer definitely-not-a-token-123456789",
    credentialHandle: "vault-ref-should-not-appear",
    developerApp: { appId: "do-not-copy" },
  });

  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(stale.status.key, "stale");
  assert.equal(stale.identity.handle, "@preview_account");
  assert.doesNotMatch(JSON.stringify(stale), /vault-ref|do-not-copy|Bearer/);
});

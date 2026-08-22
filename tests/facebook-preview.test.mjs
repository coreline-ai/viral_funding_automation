import assert from "node:assert/strict";
import test from "node:test";

import { FACEBOOK_PREVIEW_SCHEMA_VERSION, createFacebookPreviewModel } from "../src/facebook-preview.mjs";

const operationInputs = {
  groupName: "Korean Indie Makers",
  groupLocale: "en-US",
  ruleUrl: "https://example.test/groups/rules",
  rulesCheckedAt: "2026-08-22",
  originalContentConfirmed: true,
};

test("Facebook preview model은 Reels 캡션과 그룹 본문·준비 상태를 분리한다", () => {
  const model = createFacebookPreviewModel({
    publishFields: { reelsCaption: "세로 영상용 캡션", groupBody: "그룹에 맞춘 본문" },
    locale: "ko-KR",
    approvalStatus: "approved",
    publicHandle: "coreline.ai",
    operationInputs,
    asset: { hash: "a".repeat(64), mimeType: "video/mp4", width: 1080, height: 1920 },
  });

  assert.equal(model.schemaVersion, FACEBOOK_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline.ai");
  assert.equal(model.content.reelsCaption, "세로 영상용 캡션");
  assert.equal(model.content.groupBody, "그룹에 맞춘 본문");
  assert.equal(model.content.valid, true);
  assert.equal(model.reels.key, "ready");
  assert.equal(model.group.key, "ready");
  assert.equal(model.group.groupName, "Korean Indie Makers");
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
});

test("Facebook preview model은 원본·asset·group context 누락과 같은 원고를 숨기지 않는다", () => {
  const missing = createFacebookPreviewModel({
    publishFields: { reelsCaption: "같은 원고", groupBody: "같은 원고" },
    operationInputs: {},
  });
  const horizontal = createFacebookPreviewModel({
    publishFields: { reelsCaption: "Reels", groupBody: "Group" },
    operationInputs: { ...operationInputs, originalContentConfirmed: true },
    asset: { hash: "a".repeat(64), mimeType: "video/mp4", width: 1920, height: 1080 },
  });

  assert.ok(missing.content.issues.some((issue) => issue.code === "FIELD_COLLAPSE"));
  assert.ok(missing.reels.issues.some((issue) => issue.code === "FIELD_COLLAPSE"));
  assert.ok(missing.group.issues.some((issue) => issue.code === "FIELD_COLLAPSE"));
  assert.equal(missing.reels.key, "needs_original_confirmation");
  assert.equal(missing.group.key, "needs_group_context");
  assert.equal(horizontal.reels.key, "needs_vertical_asset");
});

test("Facebook preview model은 target locale 없음·stale·안전하지 않은 handle을 분리한다", () => {
  const empty = createFacebookPreviewModel({
    publishFields: { reelsCaption: "원문", groupBody: "원문과 다른 그룹 글" },
    locale: "ja-JP",
    localeAvailable: false,
  });
  const stale = createFacebookPreviewModel({
    publishFields: { reelsCaption: "수정", groupBody: "수정된 그룹 글" },
    localeStale: true,
    approvalStatus: "approved",
    publicHandle: "Bearer token-value-123456",
    credentialHandle: "vault-ref-should-not-appear",
  });

  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(stale.status.key, "stale");
  assert.equal(stale.identity.handle, "@preview_account");
  assert.doesNotMatch(JSON.stringify(stale), /vault-ref|Bearer/);
});

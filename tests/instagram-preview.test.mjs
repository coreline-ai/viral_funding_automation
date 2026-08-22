import assert from "node:assert/strict";
import test from "node:test";

import {
  INSTAGRAM_COVER_CHARACTER_LIMIT,
  INSTAGRAM_PREVIEW_SCHEMA_VERSION,
  createInstagramPreviewModel,
} from "../src/instagram-preview.mjs";

const operationInputs = {
  originalVideo: true,
  coverSafeArea: true,
  profileLink: true,
};

test("Instagram preview model은 표지·캡션과 안전한 readiness를 local-only로 분리한다", () => {
  const model = createInstagramPreviewModel({
    publishFields: { cover: "Markdown 연결을 한눈에", caption: "README와 dev-plan 사이의 관계를 탐색합니다." },
    locale: "ko-KR",
    approvalStatus: "approved",
    publicHandle: "coreline.ai",
    operationInputs,
    asset: { hash: "a".repeat(64), mimeType: "video/mp4", width: 1080, height: 1920, localPath: "/private/secret.mov" },
  });

  assert.equal(model.schemaVersion, INSTAGRAM_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline.ai");
  assert.equal(model.content.cover, "Markdown 연결을 한눈에");
  assert.equal(model.content.caption, "README와 dev-plan 사이의 관계를 탐색합니다.");
  assert.equal(model.media.key, "ready");
  assert.equal(model.coverReadiness.key, "ready");
  assert.equal(model.profile.key, "ready");
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
  assert.doesNotMatch(JSON.stringify(model), /secret\.mov|localPath|hash|mimeType/);
});

test("Instagram preview model은 asset·safe area·profile link와 세로 규격 미확인을 명확히 표시한다", () => {
  const missing = createInstagramPreviewModel({ publishFields: { cover: "표지", caption: "캡션" }, operationInputs: {} });
  const landscape = createInstagramPreviewModel({
    publishFields: { cover: "표지", caption: "캡션" },
    operationInputs: { ...operationInputs, coverSafeArea: false, profileLink: false },
    asset: { hash: "a".repeat(64), mimeType: "video/mp4", width: 1920, height: 1080 },
  });

  assert.equal(missing.media.key, "needs_original_confirmation");
  assert.equal(missing.coverReadiness.key, "needs_safe_area");
  assert.equal(missing.profile.key, "needs_profile_link");
  assert.equal(landscape.media.key, "needs_vertical_asset");
  assert.equal(landscape.coverReadiness.key, "needs_safe_area");
  assert.equal(landscape.profile.key, "needs_profile_link");
});

test("Instagram preview model은 empty·stale·cover validation과 안전하지 않은 handle을 분리한다", () => {
  const empty = createInstagramPreviewModel({
    publishFields: { cover: "원문", caption: "원문과 다른 캡션" },
    locale: "ja-JP",
    localeAvailable: false,
  });
  const stale = createInstagramPreviewModel({
    publishFields: { cover: "x".repeat(INSTAGRAM_COVER_CHARACTER_LIMIT + 1), caption: "x".repeat(INSTAGRAM_COVER_CHARACTER_LIMIT + 1) },
    localeStale: true,
    approvalStatus: "approved",
    publicHandle: "Bearer token-value-123456",
    credentialHandle: "vault-ref-should-not-appear",
  });

  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(stale.status.key, "stale");
  assert.equal(stale.identity.handle, "@preview_account");
  assert.ok(stale.content.issues.some((issue) => issue.code === "FIELD_COLLAPSE"));
  assert.ok(stale.content.issues.some((issue) => issue.code === "IG_COVER"));
  assert.doesNotMatch(JSON.stringify(stale), /vault-ref|Bearer/);
});

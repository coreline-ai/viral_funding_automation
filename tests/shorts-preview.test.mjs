import assert from "node:assert/strict";
import test from "node:test";

import {
  SHORTS_PREVIEW_SCHEMA_VERSION,
  YOUTUBE_DESCRIPTION_CHARACTER_LIMIT,
  YOUTUBE_TITLE_CHARACTER_LIMIT,
  createShortsPreviewModel,
} from "../src/shorts-preview.mjs";

test("Shorts preview model은 title·description·shots와 세로 자산 readiness를 local-only로 분리한다", () => {
  const model = createShortsPreviewModel({
    publishFields: {
      title: "Markdown 관계를 20초로 설명하는 방법",
      description: "README와 개발 계획 사이의 연결을 보여주는 짧은 제품 데모입니다.",
      shots: ["문서가 쌓이면 연결은 안 보입니다", "Markdown → 관계 그래프", "출처 근거와 함께 탐색"],
    },
    locale: "ko-KR",
    approvalStatus: "approved",
    publicHandle: "coreline.ai",
    operationInputs: { verticalVideo: true },
    asset: { hash: "a".repeat(64), mimeType: "video/mp4", width: 1080, height: 1920, rightsConfirmed: true, localPath: "/private/secret.mp4" },
  });

  assert.equal(model.schemaVersion, SHORTS_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline.ai");
  assert.equal(model.content.shots.length, 3);
  assert.equal(model.content.shots[1].index, 2);
  assert.equal(model.media.key, "ready");
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
  assert.doesNotMatch(JSON.stringify(model), /secret\.mp4|localPath|hash|mimeType/);
});

test("Shorts preview model은 title·description 경계와 0·1·blank shots를 숨기지 않는다", () => {
  const withinLimit = createShortsPreviewModel({
    publishFields: { title: "t".repeat(YOUTUBE_TITLE_CHARACTER_LIMIT), description: "d".repeat(YOUTUBE_DESCRIPTION_CHARACTER_LIMIT), shots: ["1", "2", "3"] },
  });
  const overLimit = createShortsPreviewModel({
    publishFields: { title: "t".repeat(YOUTUBE_TITLE_CHARACTER_LIMIT + 1), description: "d".repeat(YOUTUBE_DESCRIPTION_CHARACTER_LIMIT + 1), shots: ["one", "", "three"] },
  });
  const noShots = createShortsPreviewModel({ publishFields: { title: "제목", description: "설명", shots: [] } });
  const oneShot = createShortsPreviewModel({ publishFields: { title: "제목", description: "설명", shots: ["첫 샷"] } });

  assert.equal(withinLimit.content.issues.length, 0);
  assert.ok(overLimit.content.issues.some((issue) => issue.code === "YT_TITLE_LIMIT"));
  assert.ok(overLimit.content.issues.some((issue) => issue.code === "YT_DESCRIPTION_LIMIT"));
  assert.ok(overLimit.content.issues.some((issue) => issue.code === "EMPTY_SHOT"));
  assert.ok(noShots.content.issues.some((issue) => issue.code === "EMPTY_SHOTS"));
  assert.ok(oneShot.content.issues.some((issue) => issue.code === "SHOT_COUNT"));
});

test("Shorts preview model은 asset·locale·stale·안전하지 않은 handle을 분리한다", () => {
  const missing = createShortsPreviewModel({ publishFields: { title: "제목", description: "설명", shots: ["1", "2", "3"] }, operationInputs: {} });
  const horizontal = createShortsPreviewModel({
    publishFields: { title: "제목", description: "설명", shots: ["1", "2", "3"] },
    operationInputs: { verticalVideo: true },
    asset: { hash: "a".repeat(64), mimeType: "video/mp4", width: 1920, height: 1080, rightsConfirmed: true },
  });
  const empty = createShortsPreviewModel({
    publishFields: { title: "원문", description: "원문 설명", shots: ["1", "2", "3"] },
    locale: "ja-JP",
    localeAvailable: false,
  });
  const stale = createShortsPreviewModel({
    publishFields: { title: "수정", description: "수정 설명", shots: ["1", "2", "3"] },
    localeStale: true,
    approvalStatus: "approved",
    publicHandle: "Bearer token-value-123456",
    credentialHandle: "vault-ref-should-not-appear",
  });

  assert.equal(missing.media.key, "needs_vertical_confirmation");
  assert.equal(horizontal.media.key, "needs_vertical_asset");
  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(stale.status.key, "stale");
  assert.equal(stale.identity.handle, "@preview_channel");
  assert.doesNotMatch(JSON.stringify(stale), /vault-ref|Bearer/);
});

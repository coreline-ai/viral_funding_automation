import assert from "node:assert/strict";
import test from "node:test";

import {
  TIKTOK_PREVIEW_SCHEMA_VERSION,
  TIKTOK_VISIBILITY_OPTIONS,
  createTikTokPreviewModel,
} from "../src/tiktok-preview.mjs";

test("TikTok preview model은 생성 원고가 아닌 session-only manual brief를 local-only로 투영한다", () => {
  const model = createTikTokPreviewModel({
    brief: {
      caption: "Markdown 문서를 3D 관계 그래프로 읽는 20초 데모입니다. #opensource",
      cover: "문서 관계를 한눈에",
      visibility: "public_candidate",
      assetReviewed: true,
      watermarkReviewed: true,
    },
  });

  assert.equal(model.schemaVersion, TIKTOK_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "manual_candidate");
  assert.equal(model.content.caption, "Markdown 문서를 3D 관계 그래프로 읽는 20초 데모입니다. #opensource");
  assert.equal(model.content.cover, "문서 관계를 한눈에");
  assert.equal(model.visibility.key, "public_candidate");
  assert.equal(model.media.key, "reviewed");
  assert.equal(model.content.issues.length, 0);
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(TIKTOK_VISIBILITY_OPTIONS.length, 4);
});

test("TikTok preview model은 빈 manual brief와 공개 범위·영상 확인 누락을 숨기지 않는다", () => {
  const empty = createTikTokPreviewModel();
  const incomplete = createTikTokPreviewModel({
    brief: { caption: "직접 입력한 캡션", cover: "첫 화면", visibility: "unconfirmed", assetReviewed: false, watermarkReviewed: false },
  });

  assert.equal(empty.status.key, "empty");
  assert.ok(empty.content.issues.some((issue) => issue.code === "EMPTY_CAPTION"));
  assert.ok(empty.content.issues.some((issue) => issue.code === "EMPTY_COVER"));
  assert.ok(incomplete.content.issues.some((issue) => issue.code === "VISIBILITY_UNCONFIRMED"));
  assert.ok(incomplete.content.issues.some((issue) => issue.code === "NEEDS_ASSET_REVIEW"));
  assert.equal(incomplete.media.key, "needs_asset_review");
});

test("TikTok preview model은 credential·개인 경로처럼 보이는 수동 입력을 결과에 포함하지 않는다", () => {
  const model = createTikTokPreviewModel({
    brief: {
      caption: "Bearer abcdefghijklmnopqrstuvwxyz0123456789",
      cover: "/Volumes/private/video.mov",
      visibility: "private_candidate",
      assetReviewed: true,
      watermarkReviewed: true,
    },
  });

  assert.equal(model.content.caption, "");
  assert.equal(model.content.cover, "");
  assert.ok(model.content.issues.some((issue) => issue.code === "UNSAFE_CAPTION"));
  assert.ok(model.content.issues.some((issue) => issue.code === "UNSAFE_COVER"));
  assert.doesNotMatch(JSON.stringify(model), /Bearer|\/Volumes\/private|abcdefghijklmnopqrstuvwxyz0123456789/);
});

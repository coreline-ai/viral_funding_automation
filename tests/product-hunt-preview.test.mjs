import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_HUNT_DESCRIPTION_CHARACTER_LIMIT,
  PRODUCT_HUNT_PREVIEW_SCHEMA_VERSION,
  PRODUCT_HUNT_TAGLINE_CHARACTER_LIMIT,
  createProductHuntPreviewModel,
} from "../src/product-hunt-preview.mjs";

test("Product Hunt preview model은 publish fields와 수동 launch readiness를 local-only로 분리한다", () => {
  const model = createProductHuntPreviewModel({
    publishFields: {
      name: "AI Systems Atlas",
      tagline: "Explore source-backed relationships in Markdown",
      description: "A read-only demo for exploring Markdown documents and their source-backed relationships in three views.",
      firstComment: "I would value feedback on whether the source evidence is clear in the first minute.",
    },
    locale: "en-US",
    approvalStatus: "approved",
    publicHandle: "coreline_ai",
    authorInputs: { pricing: "Free", topic: "Developer Tools" },
    operationInputs: { makerAccountConfirmed: true, launchReady: true, galleryAssetId: "gallery-20260822" },
    productUrlCandidate: "https://ai-systems-atlas.vercel.app/",
  });

  assert.equal(model.schemaVersion, PRODUCT_HUNT_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline_ai");
  assert.equal(model.content.issues.length, 0);
  assert.equal(model.launch.ready, true);
  assert.equal(model.launch.items.find((item) => item.key === "gallery_reference_recorded")?.label, "Gallery 자산 참조 기록됨");
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
  assert.doesNotMatch(JSON.stringify(model), /gallery-20260822/);
});

test("Product Hunt preview model은 60/260 경계와 준비 항목 누락·투표 요청을 숨기지 않는다", () => {
  const withinLimit = createProductHuntPreviewModel({
    publishFields: { name: "Name", tagline: "t".repeat(PRODUCT_HUNT_TAGLINE_CHARACTER_LIMIT), description: "d".repeat(PRODUCT_HUNT_DESCRIPTION_CHARACTER_LIMIT), firstComment: "Comment" },
  });
  const incomplete = createProductHuntPreviewModel({
    publishFields: {
      name: "",
      tagline: "t".repeat(PRODUCT_HUNT_TAGLINE_CHARACTER_LIMIT + 1),
      description: "d".repeat(PRODUCT_HUNT_DESCRIPTION_CHARACTER_LIMIT + 1),
      firstComment: "Please vote for us",
    },
  });

  assert.equal(withinLimit.content.issues.length, 0);
  assert.ok(incomplete.issues.some((issue) => issue.code === "EMPTY_NAME"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "PH_TAGLINE_LIMIT"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "PH_DESCRIPTION_LIMIT"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "VOTE_REQUEST"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "LAUNCH_INPUTS_REQUIRED"));
  assert.equal(incomplete.launch.ready, false);
});

test("Product Hunt preview model은 locale·stale·unsafe input과 공개 URL 후보를 안전하게 분리한다", () => {
  const empty = createProductHuntPreviewModel({
    publishFields: { name: "원문", tagline: "원문", description: "원문", firstComment: "원문" },
    locale: "ko-KR",
    localeAvailable: false,
  });
  const unsafe = createProductHuntPreviewModel({
    publishFields: { name: "Name", tagline: "Bearer abcdefghijklmnopqrstuvwxyz0123456789", description: "desc", firstComment: "/Volumes/private/comment" },
    localeStale: true,
    approvalStatus: "approved",
    publicHandle: "Bearer token-value-123456",
    authorInputs: { pricing: "client_secret=do-not-show", topic: "Tools" },
    operationInputs: { galleryAssetId: "/Users/private/gallery.png" },
    productUrlCandidate: "http://not-secure.example",
  });

  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(unsafe.status.key, "stale");
  assert.equal(unsafe.identity.handle, "@maker_to_confirm");
  assert.equal(unsafe.content.tagline, "");
  assert.equal(unsafe.content.firstComment, "");
  assert.equal(unsafe.launch.productUrl, "");
  assert.doesNotMatch(JSON.stringify(unsafe), /Bearer|client_secret|\/Volumes\/private|\/Users\/private/);
});

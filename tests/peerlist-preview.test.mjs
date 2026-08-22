import assert from "node:assert/strict";
import test from "node:test";

import { PEERLIST_PREVIEW_SCHEMA_VERSION, createPeerlistPreviewModel } from "../src/peerlist-preview.mjs";

test("Peerlist preview model은 launch 원고와 개인 Launchpad readiness를 local-only로 분리한다", () => {
  const model = createPeerlistPreviewModel({
    publishFields: {
      name: "AI Systems Atlas",
      tagline: "Explore source-backed relationships in Markdown",
      comment: "I would value feedback on whether the source evidence is clear in the first minute.",
    },
    locale: "en-US",
    approvalStatus: "approved",
    publicHandle: "coreline_ai",
    operationInputs: {
      individualProfileConfirmed: true,
      profileVerified: true,
      projectCompleteConfirmed: true,
      coverAssetId: "cover-20260822",
      demoUrl: "https://ai-systems-atlas.vercel.app/",
      launchMonday: true,
    },
  });

  assert.equal(model.schemaVersion, PEERLIST_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "approved");
  assert.equal(model.identity.handle, "@coreline_ai");
  assert.equal(model.content.issues.length, 0);
  assert.equal(model.launch.ready, true);
  assert.equal(model.launch.items.find((item) => item.key === "cover_reference_recorded")?.label, "Cover 자산 참조 기록됨");
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
  assert.doesNotMatch(JSON.stringify(model), /cover-20260822/);
});

test("Peerlist preview model은 필수 launch 준비와 upvote 요청을 숨기지 않는다", () => {
  const incomplete = createPeerlistPreviewModel({
    publishFields: { name: "", tagline: "Please recommend us", comment: "Please upvote this project" },
    operationInputs: {},
  });

  assert.ok(incomplete.issues.some((issue) => issue.code === "EMPTY_NAME"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "UPVOTE_REQUEST"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "LAUNCH_REQUIREMENTS_PENDING"));
  assert.equal(incomplete.launch.ready, false);
  assert.ok(incomplete.launch.items.some((item) => item.key === "profile_verification_required"));
  assert.ok(incomplete.launch.items.some((item) => item.key === "project_complete_required"));
});

test("Peerlist preview model은 locale·stale·unsafe input과 공개 demo URL을 안전하게 분리한다", () => {
  const empty = createPeerlistPreviewModel({
    publishFields: { name: "원문", tagline: "원문", comment: "원문" },
    locale: "ko-KR",
    localeAvailable: false,
  });
  const unsafe = createPeerlistPreviewModel({
    publishFields: { name: "Name", tagline: "Bearer abcdefghijklmnopqrstuvwxyz0123456789", comment: "/Volumes/private/comment" },
    localeStale: true,
    approvalStatus: "approved",
    publicHandle: "Bearer token-value-123456",
    operationInputs: { coverAssetId: "/Users/private/cover.png", demoUrl: "http://not-secure.example" },
  });

  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(unsafe.status.key, "stale");
  assert.equal(unsafe.identity.handle, "@maker_to_confirm");
  assert.equal(unsafe.content.tagline, "");
  assert.equal(unsafe.content.comment, "");
  assert.equal(unsafe.launch.demoUrl, "");
  assert.doesNotMatch(JSON.stringify(unsafe), /Bearer|\/Volumes\/private|\/Users\/private/);
});

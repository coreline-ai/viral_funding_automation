import assert from "node:assert/strict";
import test from "node:test";

import { createMastodonPreviewModel } from "../src/mastodon-preview.mjs";

test("Mastodon preview는 수동 status·인스턴스 입력 상한·공개 범위·content warning을 local-only로 분리한다", () => {
  const body = "Markdown 문서의 근거 관계를 확인하는 데모입니다. https://example.com ✨";
  const model = createMastodonPreviewModel({
    brief: {
      instanceAlias: "team-social (로컬 표시)",
      characterLimit: "500",
      urlReservedCharacters: "23",
      visibility: "unlisted",
      contentWarning: "초기 데모 공유",
      body,
      rulesReviewed: true,
      contentWarningReviewed: true,
    },
  });
  assert.equal(model.status.key, "manual_candidate");
  assert.equal(model.content.body, body);
  assert.equal(model.content.links.length, 1);
  assert.equal(model.content.characterLimit, 500);
  assert.equal(model.content.urlReservedCharacters, 23);
  assert.equal(model.visibility.value, "unlisted");
  assert.equal(model.externalWriteCount, 0);
  assert.throws(() => { model.content.body = "changed"; }, TypeError);
});

test("Mastodon preview는 빈·한도/URL 설정 누락·초과·unsafe 입력과 content warning 확인 누락을 숨기지 않는다", () => {
  const empty = createMastodonPreviewModel();
  assert.equal(empty.status.key, "empty");
  assert.ok(empty.content.issues.some((issue) => issue.code === "LIMIT_REQUIRED"));

  const invalid = createMastodonPreviewModel({
    brief: {
      instanceAlias: "bearer secret_value_123456",
      characterLimit: "10",
      urlReservedCharacters: "",
      visibility: "public",
      contentWarning: "검토 필요",
      body: "https://example.com bearer secret_value_123456",
      rulesReviewed: false,
      contentWarningReviewed: false,
    },
  });
  assert.equal(invalid.status.key, "needs_input");
  assert.equal(invalid.content.body, "");
  assert.ok(invalid.content.issues.some((issue) => issue.code === "UNSAFE_BODY"));
  assert.ok(invalid.content.issues.some((issue) => issue.code === "URL_RESERVE_REQUIRED"));
  assert.ok(invalid.content.issues.some((issue) => issue.code === "CONTENT_WARNING_REVIEW_REQUIRED"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { BLUESKY_MAX_GRAPHEMES, createBlueskyPreviewModel } from "../src/bluesky-preview.mjs";

test("Bluesky preview는 수동 short post와 locale·URL/@handle 후보를 local-only로 분리한다", () => {
  const body = "문서 관계를 source-backed graph로 검토하는 초기 데모입니다. https://example.com @atlas.bsky.social ✨";
  const model = createBlueskyPreviewModel({ brief: { body, locale: "ko-KR", facetsReviewed: true } });
  assert.equal(model.status.key, "manual_candidate");
  assert.equal(model.content.body, body);
  assert.equal(model.locale.value, "ko-KR");
  assert.equal(model.facets.candidates.length, 2);
  assert.equal(model.facets.candidates[0].kind, "link");
  assert.equal(model.facets.candidates[1].kind, "mention");
  assert.equal(model.externalWriteCount, 0);
  assert.throws(() => { model.content.body = "changed"; }, TypeError);
});

test("Bluesky preview는 empty·unconfirmed locale·grapheme 초과·unsafe text·미확인 facet을 숨기지 않는다", () => {
  const empty = createBlueskyPreviewModel();
  assert.equal(empty.status.key, "empty");
  assert.ok(empty.content.issues.some((issue) => issue.code === "LOCALE_REQUIRED"));

  const invalid = createBlueskyPreviewModel({
    brief: {
      body: `${"a".repeat(BLUESKY_MAX_GRAPHEMES + 1)} https://example.com @person.bsky.social bearer secret_value_123456`,
      locale: "unconfirmed",
      facetsReviewed: false,
    },
  });
  assert.equal(invalid.status.key, "needs_input");
  assert.equal(invalid.content.body, "");
  assert.ok(invalid.content.issues.some((issue) => issue.code === "UNSAFE_BODY"));
  assert.ok(invalid.content.issues.some((issue) => issue.code === "FACET_REVIEW_REQUIRED"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { CHANNEL_KEYS } from "../src/drafts.mjs";
import {
  COMPLETION_STATUSES,
  allCompletionProfiles,
  mapCompletionStatus,
  preferredProvider,
  resolveComposeProvider,
  sanitizeProviderResult,
  sanitizeReviewResult,
  validateComposeRequest,
} from "../src/completion.mjs";

test("18개 채널이 하나의 완성 profile을 가진다", () => {
  const profiles = allCompletionProfiles();
  assert.deepEqual(Object.keys(profiles).sort(), [...CHANNEL_KEYS].sort());
  assert.equal(preferredProvider("x1"), "grok");
  assert.equal(preferredProvider("linkedin"), "codex");
  assert.equal(preferredProvider("showHn"), null);
});

test("기존 정책은 완성 상태로 약화 없이 매핑된다", () => {
  assert.equal(mapCompletionStatus("showHn"), "manual_only");
  assert.equal(mapCompletionStatus("reddit"), "needs_input");
  assert.equal(mapCompletionStatus("dev"), "needs_input");
  assert.equal(mapCompletionStatus("indieHackers"), "needs_input");
  assert.equal(mapCompletionStatus("productHunt"), "needs_input");
  assert.equal(mapCompletionStatus("productHunt", {
    authorInputs: { pricing: "Free", assets: "gallery ready" },
    validationOk: true,
  }), "needs_review");
  assert.equal(mapCompletionStatus("x1", { validationOk: true }), "ready");
  assert.ok(COMPLETION_STATUSES.includes("needs_review"));
});

test("compose 요청은 알 수 없는 상태·작성자 입력·Show HN을 거절한다", () => {
  assert.throws(() => validateComposeRequest({ channel: "x1", status: "published" }), /알 수 없는 완성 상태/);
  assert.throws(() => validateComposeRequest({ channel: "reddit", authorInputs: { vibe: "x" } }), /알 수 없는 작성자 입력/);
  assert.throws(() => validateComposeRequest({ channel: "showHn", provider: "auto" }), /영문 재구성/);
  const request = validateComposeRequest({
    channel: "linkedin",
    provider: "auto",
    sourceDraft: { publishFields: { body: "Atlas" } },
  });
  assert.equal(request.provider, "codex");
  assert.equal(resolveComposeProvider("xThread", "grok"), "grok");
});

test("provider가 반환한 status는 서버 게이트에서 버린다", () => {
  assert.throws(() => sanitizeProviderResult("x1", {
    status: "ready",
    publishFields: { body: "Atlas" },
  }), /정책 상태/);
  const clean = sanitizeProviderResult("x1", { publishFields: { body: "Atlas" } });
  assert.equal(clean.publishFields.body, "Atlas");
  assert.throws(() => sanitizeReviewResult({ publishFields: { body: "nope" } }), /검토 결과/);
  assert.deepEqual(sanitizeReviewResult({ issues: ["길이"], suggestions: ["질문을 구체화"] }).issues, ["길이"]);
});

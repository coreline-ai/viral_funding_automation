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

test("18개 채널 profile은 Locale·지원 모드를 함께 제공한다", () => {
  const profiles = allCompletionProfiles();
  assert.deepEqual(Object.keys(profiles).sort(), [...CHANNEL_KEYS].sort());
  assert.equal(preferredProvider("x1"), "grok");
  assert.equal(preferredProvider("linkedin"), "codex");
  assert.equal(preferredProvider("showHn"), null);
  assert.equal(profiles.geeknews.defaultLocale, "ko-KR");
  assert.equal(profiles.okky.defaultLocale, "ko-KR");
  assert.equal(profiles.disquiet.defaultLocale, "ko-KR");
  assert.equal(profiles.reddit.supportMode, "reference_only");
  assert.equal(profiles.dev.supportMode, "reference_only");
  assert.equal(profiles.showHn.supportMode, "manual_only");
  assert.deepEqual(profiles.linkedin.supportedLocales, ["en-US", "ko-KR", "ja-JP", "zh-CN", "es-ES"]);
  assert.deepEqual(profiles.geeknews.supportedLocales, ["ko-KR", "en-US"]);
});

test("3축 상태는 reference/manual과 콘텐츠 후보를 구분한다", () => {
  assert.equal(mapCompletionStatus("showHn", { validationOk: true }), "manual_only");
  assert.equal(mapCompletionStatus("reddit", { validationOk: true }), "reference_ready");
  assert.equal(mapCompletionStatus("dev", { validationOk: true }), "reference_ready");
  assert.equal(mapCompletionStatus("indieHackers", { validationOk: true }), "needs_input");
  assert.equal(mapCompletionStatus("productHunt", {
    authorInputs: { pricing: "Free", topic: "Developer Tools" },
    validationOk: true,
  }), "candidate");
  assert.equal(mapCompletionStatus("x1", { validationOk: true }), "candidate");
  assert.ok(COMPLETION_STATUSES.includes("reference_ready"));
});

test("compose 요청은 알 수 없는 입력·채널별 미지원 Locale·Show HN을 거절한다", () => {
  assert.throws(() => validateComposeRequest({ channel: "reddit", authorInputs: { vibe: "x" } }), /알 수 없는 입력/);
  assert.throws(() => validateComposeRequest({ channel: "geeknews", targetLocale: "ja-JP" }), /지원하지 않는 게시 언어/);
  assert.throws(() => validateComposeRequest({ channel: "showHn", provider: "auto" }), /영문 재구성/);
  const request = validateComposeRequest({
    channel: "linkedin",
    provider: "auto",
    sourceDraft: { publishFields: { body: "Atlas" } },
    campaignBrief: { publisherRole: "curator", accountVoice: "personal", goal: "feedback", audience: "developers" },
  });
  assert.equal(request.provider, "codex");
  assert.equal(request.targetLocale, "en-US");
  assert.equal(validateComposeRequest({ channel: "linkedin", targetLocale: "ja-JP" }).targetLocale, "ja-JP");
  assert.equal(resolveComposeProvider("xThread", "grok"), "grok");
});

test("provider가 반환한 상태는 서버 게이트에서 버린다", () => {
  assert.throws(() => sanitizeProviderResult("x1", {
    contentStatus: "candidate",
    publishFields: { body: "Atlas" },
  }), /정책 상태/);
  const clean = sanitizeProviderResult("x1", { publishFields: { body: "Atlas" } });
  assert.equal(clean.publishFields.body, "Atlas");
  assert.throws(() => sanitizeReviewResult({ publishFields: { body: "nope" } }), /검토 결과/);
  assert.deepEqual(sanitizeReviewResult({ issues: ["길이"], suggestions: ["질문을 구체화"] }).issues, ["길이"]);
});

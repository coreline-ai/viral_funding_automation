import assert from "node:assert/strict";
import test from "node:test";

import {
  DISCORD_EMBED_TEXT_MAX_LENGTH,
  DISCORD_MESSAGE_MAX_LENGTH,
  createDiscordPreviewModel,
} from "../src/discord-preview.mjs";

test("Discord preview는 session-only 메시지·추가 정보·알림 후보를 local-only로 분리한다", () => {
  const brief = {
    targetAlias: "launch-feedback",
    message: "새로운 문서 그래프 탐색 프로토타입의 초기 피드백을 받고 싶습니다. @here",
    embedTitle: "AI Systems Atlas",
    embedDescription: "Markdown 문서의 출처 근거 관계를 탐색하는 초기 프로토타입입니다.",
    embedUrl: "https://example.com/demo",
    mentionReviewed: true,
  };
  const model = createDiscordPreviewModel({ brief });
  assert.equal(model.status.key, "manual_candidate");
  assert.equal(model.content.targetAlias, "launch-feedback");
  assert.equal(model.content.message, brief.message);
  assert.deepEqual(model.mentionSafety.candidates, ["@here"]);
  assert.equal(model.mentionSafety.mode, "none");
  assert.equal(model.extra.url, "https://example.com/demo");
  assert.equal(model.externalWriteCount, 0);
  assert.throws(() => { model.content.message = "changed"; }, TypeError);
});

test("Discord preview는 빈·긴·unsafe·미확인 알림 후보를 전송 후보처럼 보이지 않는다", () => {
  const empty = createDiscordPreviewModel();
  assert.equal(empty.status.key, "empty");
  assert.ok(empty.content.issues.some((issue) => issue.code === "TARGET_ALIAS_REQUIRED"));

  const invalid = createDiscordPreviewModel({
    brief: {
      targetAlias: "/Users/demo/private",
      message: `${"a".repeat(DISCORD_MESSAGE_MAX_LENGTH + 1)} @everyone bearer top_secret_value_123456`,
      embedTitle: "x".repeat(DISCORD_EMBED_TEXT_MAX_LENGTH + 1),
      embedUrl: "http://example.com",
      mentionReviewed: false,
    },
  });
  assert.equal(invalid.status.key, "needs_input");
  assert.equal(invalid.content.message, "");
  assert.equal(invalid.content.targetAlias, "");
  assert.equal(invalid.extra.url, "");
  assert.ok(invalid.content.issues.some((issue) => issue.code === "UNSAFE_MESSAGE"));
  assert.ok(invalid.content.issues.some((issue) => issue.code === "INVALID_EMBED_URL"));
  assert.ok(invalid.content.issues.some((issue) => issue.code === "MENTION_REVIEW_REQUIRED"));
});

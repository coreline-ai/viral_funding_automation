import assert from "node:assert/strict";
import test from "node:test";

import { REDDIT_PREVIEW_SCHEMA_VERSION, createRedditPreviewModel } from "../src/reddit-preview.mjs";

test("Reddit preview model은 reference facts와 사람 직접 작성 초안을 local-only로 분리한다", () => {
  const model = createRedditPreviewModel({
    publishFields: { facts: "공개 데모는 읽기 전용 정적 snapshot이며 Markdown import는 로컬 앱에서 사용합니다." },
    locale: "en-US",
    authorInputs: { subreddit: "r/sideproject", rules: "자기홍보 허용 빈도와 제목 규칙을 직접 확인했습니다.", flair: "Showcase" },
    operationInputs: { subreddit: true, selfPromoRules: true, ruleUrl: "https://www.reddit.com/r/sideproject/about/rules", rulesCheckedAt: "2026-08-22" },
    brief: { title: "I built a source-backed Markdown graph viewer", body: "I am looking for feedback on whether the evidence stays clear.", postType: "text", nsfw: false, spoiler: false },
  });

  assert.equal(model.schemaVersion, REDDIT_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "reference");
  assert.equal(model.facts.facts.includes("정적 snapshot"), true);
  assert.equal(model.manualDraft.title, "I built a source-backed Markdown graph viewer");
  assert.equal(model.community.community, "r/sideproject");
  assert.equal(model.community.items.every((item) => !item.key.endsWith("required")), true);
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
});

test("Reddit preview model은 facts로 제목·본문을 만들지 않고 community 입력 누락을 표시한다", () => {
  const model = createRedditPreviewModel({
    publishFields: { facts: "사실 자료" },
    authorInputs: { subreddit: "sideproject", rules: "", flair: "" },
    operationInputs: {},
    brief: {},
  });

  assert.equal(model.manualDraft.title, "");
  assert.equal(model.manualDraft.body, "");
  assert.ok(model.issues.some((issue) => issue.code === "TITLE_REQUIRED"));
  assert.ok(model.issues.some((issue) => issue.code === "BODY_REQUIRED"));
  assert.ok(model.issues.some((issue) => issue.code === "POST_TYPE_REQUIRED"));
  assert.ok(model.issues.some((issue) => issue.code === "COMMUNITY_CONTEXT_REQUIRED"));
  assert.ok(model.community.items.some((item) => item.key === "community_required"));
});

test("Reddit preview model은 기존 facts object를 참고용 텍스트로만 안전하게 투영한다", () => {
  const model = createRedditPreviewModel({
    publishFields: {
      facts: {
        name: "AI Systems Atlas",
        description: "Markdown 문서를 source-backed graph로 탐색합니다.",
        demoUrl: "https://example.test/demo",
        repositoryUrl: "https://example.test/source",
        license: "MIT",
        features: ["Three.js views", "Remark AST"],
      },
    },
  });

  assert.match(model.facts.facts, /AI Systems Atlas/);
  assert.match(model.facts.facts, /Three\.js views/);
  assert.equal(model.manualDraft.title, "");
  assert.equal(model.manualDraft.body, "");
});

test("Reddit preview model은 locale·stale·unsafe input을 안전하게 분리한다", () => {
  const empty = createRedditPreviewModel({
    publishFields: { facts: "원문 사실" },
    locale: "ko-KR",
    localeAvailable: false,
  });
  const unsafe = createRedditPreviewModel({
    publishFields: { facts: "Bearer abcdefghijklmnopqrstuvwxyz0123456789" },
    localeStale: true,
    approvalStatus: "approved",
    authorInputs: { subreddit: "r/private", rules: "/Volumes/private/rules", flair: "Bearer abcdefghijklmnopqrstuvwxyz0123456789" },
    operationInputs: { ruleUrl: "http://not-secure.example" },
    brief: { title: "client_secret=do-not-show", body: "/Users/private/body", postType: "link" },
  });

  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(unsafe.status.key, "stale");
  assert.equal(unsafe.facts.facts, "");
  assert.equal(unsafe.manualDraft.title, "");
  assert.equal(unsafe.manualDraft.body, "");
  assert.equal(unsafe.community.ruleUrl, "");
  assert.doesNotMatch(JSON.stringify(unsafe), /Bearer|client_secret|\/Volumes\/private|\/Users\/private/);
});

import assert from "node:assert/strict";
import test from "node:test";

import { INDIE_HACKERS_PREVIEW_SCHEMA_VERSION, createIndieHackersPreviewModel } from "../src/indie-hackers-preview.mjs";

const authorInputs = {
  motivation: "문서 사이의 근거 관계를 한 화면에서 이해하고 싶었습니다.",
  hardDecision: "출처 관계와 화면 배치용 연결을 별도 데이터로 유지했습니다.",
  failedApproach: "단순 검색 결과 목록만으로는 관계의 이유를 설명하기 어려웠습니다.",
};

test("Indie Hackers preview model은 현재 원고와 작성자 경험을 local discussion sheet로 분리한다", () => {
  const model = createIndieHackersPreviewModel({
    publishFields: { title: "How do you keep source evidence visible in a knowledge graph?", body: "I built a Markdown graph viewer after documents became hard to navigate. Would you prioritize onboarding or repo import next?" },
    locale: "en-US",
    authorInputs,
    campaignBrief: { publisherRole: "owner", ownershipConfirmed: true },
  });

  assert.equal(model.schemaVersion, INDIE_HACKERS_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "candidate");
  assert.equal(model.content.question, true);
  assert.equal(model.experience.firstPerson, true);
  assert.equal(model.experience.ownerLike, true);
  assert.equal(model.experience.items.every((item) => !item.key.endsWith("required")), true);
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
});

test("Indie Hackers preview model은 경험·질문·귀속 근거 부족을 숨기지 않는다", () => {
  const model = createIndieHackersPreviewModel({
    publishFields: { title: "A graph viewer", body: "I built this for documentation." },
    authorInputs: {},
    campaignBrief: { publisherRole: "curator", ownershipConfirmed: false },
  });

  assert.ok(model.issues.some((issue) => issue.code === "QUESTION_RECOMMENDED"));
  assert.ok(model.issues.some((issue) => issue.code === "MOTIVATION_REQUIRED"));
  assert.ok(model.issues.some((issue) => issue.code === "OWNERSHIP_UNCONFIRMED"));
  assert.ok(model.experience.items.some((item) => item.key === "ownership_required"));
});

test("Indie Hackers preview model은 locale·stale·민감 값을 안전하게 분리한다", () => {
  const empty = createIndieHackersPreviewModel({ locale: "ja-JP", localeAvailable: false, publishFields: { title: "원문", body: "원문" } });
  const unsafe = createIndieHackersPreviewModel({
    localeStale: true,
    publishFields: { title: "client_secret=do-not-show", body: "/Volumes/private/post" },
    authorInputs: { motivation: "Bearer abcdefghijklmnopqrstuvwxyz0123456789" },
  });

  assert.equal(empty.status.key, "empty");
  assert.equal(empty.content.title, "");
  assert.equal(unsafe.status.key, "stale");
  assert.equal(unsafe.content.title, "");
  assert.equal(unsafe.content.body, "");
  assert.doesNotMatch(JSON.stringify(unsafe), /client_secret|\/Volumes\/private|Bearer/);
});

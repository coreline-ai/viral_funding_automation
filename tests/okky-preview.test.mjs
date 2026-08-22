import assert from "node:assert/strict";
import test from "node:test";
import { createOkkyPreviewModel } from "../src/okky-preview.mjs";

test("OKKY preview는 기존 원고와 local 게시 문맥·규칙 확인을 분리한다", () => {
  const model = createOkkyPreviewModel({
    publishFields: { title: "Markdown 문서 관계를 그래프로 탐색한 경험", body: "문서 연결을 어떻게 확인하는지 의견을 듣고 싶습니다." },
    locale: "ko-KR",
    brief: { context: "project_share" },
    operationInputs: { boardRules: true },
  });
  assert.equal(model.content.title, "Markdown 문서 관계를 그래프로 탐색한 경험");
  assert.equal(model.context.label, "프로젝트 소개·피드백 요청");
  assert.equal(model.context.ready, true);
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
});

test("OKKY preview는 빈·unsafe 원고와 미확인 게시 문맥을 ready로 숨기지 않는다", () => {
  const model = createOkkyPreviewModel({ publishFields: { title: "client_secret=no", body: "/Volumes/private" } });
  assert.equal(model.content.title, "");
  assert.equal(model.context.ready, false);
  assert.ok(model.issues.length >= 3);
  assert.doesNotMatch(JSON.stringify(model), /client_secret|\/Volumes\/private/);
});

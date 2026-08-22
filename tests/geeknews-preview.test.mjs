import assert from "node:assert/strict";
import test from "node:test";
import { createGeekNewsPreviewModel } from "../src/geeknews-preview.mjs";

test("GeekNews preview는 Show 고정 intent와 공개 source/demo·운영 확인을 분리한다", () => {
  const model = createGeekNewsPreviewModel({
    publishFields: { title: "Markdown 관계를 3D로 탐색하는 도구", body: "README와 개발 계획의 연결을 근거와 함께 확인합니다." },
    locale: "ko-KR",
    sourceUrl: "https://github.com/coreline-ai/memory_node_graph",
    demoUrl: "https://memory.example",
    operationInputs: { accountAge: true, showCategory: true },
    preflight: { rulesReviewed: true, finalCopyReviewed: true },
  });
  assert.equal(model.readiness.submissionType, "show");
  assert.equal(model.readiness.newsSubmissionEnabled, false);
  assert.equal(model.readiness.ready, true);
  assert.equal(model.content.title, "Markdown 관계를 3D로 탐색하는 도구");
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
});

test("GeekNews preview는 unsafe·홍보 표현과 누락된 Show 조건을 ready로 숨기지 않는다", () => {
  const model = createGeekNewsPreviewModel({
    publishFields: { title: "최고의 도구 client_secret=no", body: "/Volumes/private 지금 바로 클릭" },
    sourceUrl: "http://not-public.example",
    demoUrl: "https://demo.example",
  });
  assert.equal(model.content.title, "");
  assert.equal(model.readiness.ready, false);
  assert.ok(model.issues.length >= 3);
  assert.doesNotMatch(JSON.stringify(model), /client_secret|\/Volumes\/private/);
});

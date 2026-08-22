import assert from "node:assert/strict";
import test from "node:test";
import { createShowHnPreviewModel } from "../src/show-hn-preview.mjs";

test("Show HN preview는 작성자가 직접 입력한 세션 원고만 local review sheet로 만든다", () => {
  const model = createShowHnPreviewModel({
    brief: {
      title: "Show HN: A source-backed graph explorer for Markdown docs",
      body: "I built this to make the relationships between README and planning documents easier to inspect. It separates source-backed edges from display connections and I will be around to discuss the trade-offs.",
      sourceUrl: "https://github.com/coreline-ai/memory_node_graph",
      demoUrl: "https://memory.example",
      handwrittenConfirmed: true,
      ownershipConfirmed: true,
    },
  });
  assert.equal(model.status.key, "manual_candidate");
  assert.equal(model.content.title.startsWith("Show HN:"), true);
  assert.equal(model.author.ready, true);
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
});

test("Show HN preview는 자동 문구·빈 원고·unsafe 값·작성자 확인 누락을 제출 후보로 숨기지 않는다", () => {
  const model = createShowHnPreviewModel({
    brief: { title: "Launch my best tool client_secret=no", body: "/Volumes/private", sourceUrl: "http://invalid.example", demoUrl: "" },
  });
  assert.equal(model.status.key, "needs_input");
  assert.equal(model.author.ready, false);
  assert.ok(model.issues.length >= 5);
  assert.doesNotMatch(JSON.stringify(model), /client_secret|\/Volumes\/private/);
});

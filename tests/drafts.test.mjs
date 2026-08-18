import assert from "node:assert/strict";
import test from "node:test";

import {
  CHANNEL_KEYS,
  CHANNEL_REGISTRY,
  coerceStoredPublishFields,
  copyBlockReason,
  createDraftDocument,
  displayCompletionStatus,
  hashPublishFields,
  matchesFieldContract,
  parsePublish,
  publishFieldType,
  publishFieldsJsonSchema,
  serializePublish,
  validatePublish,
} from "../src/drafts.mjs";
import { applyVerifiedCopy, loadVerifiedPublishFields, shouldApplyVerifiedCopy } from "../src/verified-copy.mjs";

test("18개 채널 초안이 publishFields와 internal을 가진다", () => {
  for (const channel of CHANNEL_KEYS) {
    const document = createDraftDocument(channel);
    assert.equal(document.schemaVersion, "viral-draft/v1");
    assert.equal(typeof document.publishFields, "object");
    assert.equal(typeof document.internal, "object");
  }
  assert.deepEqual(createDraftDocument("showHn").publishFields, {});
});

test("게시 필드 직렬화는 체크리스트와 HOLD를 포함하지 않는다", () => {
  const text = serializePublish("productHunt", {
    name: "Atlas",
    tagline: "Explore notes",
    description: "A graph explorer",
    firstComment: "Hello",
  });
  assert.match(text, /Maker 첫 댓글/);
  assert.doesNotMatch(text, /HOLD|게시 전 확인|\[게시 전/);
});

test("직렬화와 파싱이 왕복한다", () => {
  const fields = { title: "제목", body: "본문입니다." };
  assert.deepEqual(parsePublish("okky", serializePublish("okky", fields)), fields);
  const hunt = {
    name: "Atlas",
    tagline: "Explore notes",
    description: "A graph explorer",
    firstComment: "Hello",
  };
  assert.deepEqual(parsePublish("productHunt", serializePublish("productHunt", hunt)), hunt);
  const geeknews = { title: "쇼 제목", body: "쇼 본문입니다." };
  assert.deepEqual(parsePublish("geeknews", serializePublish("geeknews", geeknews)), geeknews);
});

test("검증 팩은 해당 저장소 데모에서만 게시 필드를 보존한다", () => {
  const overlay = loadVerifiedPublishFields();
  assert.match(overlay.x1.body, /README와 dev-plan이 쌓일수록/);
  assert.match(overlay.geeknews.title, /AI Systems Atlas/);
  assert.match(overlay.productHunt.tagline, /evidence-linked knowledge graph/);
  assert.equal(shouldApplyVerifiedCopy({ repository: "coreline-ai/memory_node_graph", demoUrl: "https://memory.example" }), false);
  assert.equal(shouldApplyVerifiedCopy({
    repository: "coreline-ai/memory_node_graph",
    demoUrl: "https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation",
  }), true);
  const items = applyVerifiedCopy({
    repository: "coreline-ai/memory_node_graph",
    demoUrl: "https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation",
  }, { x1: createDraftDocument("x1", { publishFields: { body: "축약본" } }) });
  assert.match(items.x1.publishFields.body, /README와 dev-plan이 쌓일수록/);
  assert.equal(serializePublish("x1", parsePublish("x1", serializePublish("x1", overlay.x1))), serializePublish("x1", overlay.x1));
});

test("X와 Product Hunt 길이 검증 경계값을 처리한다", () => {
  assert.equal(validatePublish("x1", { body: "hello https://example.com" }).ok, true);
  assert.equal(validatePublish("x1", { body: "한".repeat(141) }).ok, false);
  assert.equal(validatePublish("xThread", { segments: ["ok", "한".repeat(141)] }).ok, false);
  assert.equal(validatePublish("productHunt", {
    name: "Atlas",
    tagline: "a".repeat(60),
    description: "b".repeat(260),
    firstComment: "hi",
  }).ok, true);
  assert.equal(validatePublish("productHunt", {
    name: "Atlas",
    tagline: "a".repeat(61),
    description: "b".repeat(261),
    firstComment: "hi",
  }).ok, false);
});

test("채널 레지스트리가 필드 타입·스키마·입력 복구의 정본이다", () => {
  for (const channel of CHANNEL_KEYS) {
    const spec = CHANNEL_REGISTRY[channel];
    assert.deepEqual(Object.keys(spec.fieldTypes), spec.fields);
    const schema = publishFieldsJsonSchema(channel);
    assert.deepEqual(schema.required, spec.fields);
    assert.equal(schema.additionalProperties, false);
    for (const field of spec.fields) {
      const kind = publishFieldType(channel, field);
      assert.equal(kind, spec.fieldTypes[field]);
      if (kind === "string[]") {
        assert.equal(schema.properties[field].type, "array");
        assert.ok(!schema.properties.body || field === "body");
      }
    }
  }
  assert.deepEqual(publishFieldsJsonSchema("xThread").required, ["segments"]);
  assert.ok(!publishFieldsJsonSchema("xThread").properties.body);
  assert.deepEqual(publishFieldsJsonSchema("threads").required, ["posts"]);
  assert.equal(publishFieldsJsonSchema("shorts").properties.shots.type, "array");
  assert.equal(matchesFieldContract("xThread", { body: "1\n---\n2" }), false);
  assert.equal(matchesFieldContract("threads", { body: "a\n---\nb" }), false);
  assert.deepEqual(
    coerceStoredPublishFields("xThread", { body: "1/3 Atlas\n\n---\n\n2/3 https://memory.example" }),
    { segments: ["1/3 Atlas", "2/3 https://memory.example"] },
  );
  assert.deepEqual(
    coerceStoredPublishFields("threads", { body: "문제\n\n---\n\n해결" }),
    { posts: ["문제", "해결"] },
  );
});

test("완성 상태는 입력 누락·HOLD·Show HN을 구분한다", () => {
  assert.equal(displayCompletionStatus(createDraftDocument("showHn")), "manual_only");
  assert.equal(displayCompletionStatus(createDraftDocument("reddit")), "needs_input");
  const hunt = createDraftDocument("productHunt");
  hunt.internal.authorInputs = { pricing: "Free", assets: "gallery" };
  assert.equal(displayCompletionStatus(hunt, { validationOk: true }), "needs_review");
  const x1 = createDraftDocument("x1");
  assert.equal(displayCompletionStatus(x1, { validationOk: true }), "ready");
  assert.equal(displayCompletionStatus(x1, { locale: "en-US", stale: true }), "stale");
});

test("HOLD와 stale이면 복사를 차단한다", () => {
  const held = createDraftDocument("productHunt");
  assert.match(copyBlockReason(held, { locale: "en-US" }), /작성자 입력/);
  held.internal.authorInputs = { pricing: "Free", assets: "gallery ready" };
  assert.match(copyBlockReason(held, { locale: "en-US" }), /HOLD/);
  held.internal.authorReady = true;
  assert.match(copyBlockReason(held, { locale: "en-US", stale: true }), /오래되었습니다/);
  assert.equal(hashPublishFields({ body: "a" }), hashPublishFields({ body: "a" }));
});

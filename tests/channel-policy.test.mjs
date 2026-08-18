import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  opsLanguageIssues,
  policyMatrix,
  prepublishGates,
  promoIssues,
  repeatQualityWarnings,
  reviewPolicyMatchesHold,
  structureIssues,
} from "../src/channel-policy.mjs";
import { mapCompletionStatus } from "../src/completion.mjs";
import { composeDraft, reviewDraft, validateDraft } from "../src/composition.mjs";
import { buildDraftDocuments, buildProjectSummary } from "../src/content.mjs";
import { CHANNEL_KEYS, createDraftDocument, fieldContract, validatePublish } from "../src/drafts.mjs";
import { FakeGrokTextRunner } from "../src/grok-oauth-proxy.mjs";

const source = {
  input: { owner: "coreline-ai", repo: "memory_node_graph", fullName: "coreline-ai/memory_node_graph", url: "https://github.com/coreline-ai/memory_node_graph" },
  repository: {
    name: "memory_node_graph",
    fullName: "coreline-ai/memory_node_graph",
    description: "Markdown 문서를 지식 그래프로 탐색하는 3D 브라우저",
    url: "https://github.com/coreline-ai/memory_node_graph",
    homepage: "https://memory.example",
    language: "JavaScript",
    topics: ["knowledge-graph"],
    defaultBranch: "main",
    readmeUrl: "https://github.com/coreline-ai/memory_node_graph/blob/main/README.md",
    license: "MIT",
  },
  readme: `# Atlas\n\nMarkdown 문서를 지식 그래프로 변환합니다.\n\n[demo](https://memory.example)\n\n## 주요 기능\n\n- 문서 간 링크를 그래프로 표시\n`,
  packageJson: { dependencies: { three: "^1.0.0" } },
};

const facts = {
  name: "AI Systems Atlas",
  repositoryUrl: "https://github.com/a/b",
  demoUrl: "https://memory.example",
  license: "MIT",
  technologies: [],
};

test("지원 채널 전체가 예상 status와 field contract를 가진다", () => {
  const matrix = policyMatrix();
  assert.deepEqual(Object.keys(matrix).sort(), [...CHANNEL_KEYS].sort());
  assert.equal(matrix.showHn.translationPolicy, "disabled");
  assert.equal(matrix.showHn.preferredProvider, null);
  assert.deepEqual(matrix.showHn.publishFields, []);
  assert.equal(matrix.reddit.translationPolicy, "draftOnly");
  assert.deepEqual(matrix.reddit.requiredAuthorInputs, ["subreddit", "rules", "flair"]);
  assert.equal(matrix.dev.translationPolicy, "draftOnly");
  assert.ok(matrix.dev.requiredAuthorInputs.includes("aiDisclosure"));
  assert.equal(matrix.facebook.publishFields.includes("reelsCaption"), true);
  assert.equal(matrix.facebook.publishFields.includes("groupBody"), true);
  assert.equal(matrix.instagram.publishFields.includes("cover"), true);
  assert.equal(matrix.instagram.publishFields.includes("caption"), true);
  assert.ok(prepublishGates("facebook").some((gate) => gate.key === "originalVideo"));
  assert.ok(prepublishGates("geeknews").some((gate) => gate.key === "showCategory"));

  const items = buildDraftDocuments(buildProjectSummary(source));
  for (const channel of CHANNEL_KEYS) {
    const document = items[channel];
    assert.equal(document.status, matrix[channel].status);
    assert.equal(document.translationPolicy, matrix[channel].translationPolicy);
    if (channel === "showHn") {
      assert.deepEqual(document.publishFields, {});
      continue;
    }
    assert.ok(validatePublish(channel, document.publishFields).ok, channel);
    assert.match(fieldContract(channel).join(","), /:/);
  }
});

test("전문가 검토 HOLD·manual 정책과 구현이 일치한다", () => {
  const { hold, draftOnly, manual } = reviewPolicyMatchesHold();
  assert.deepEqual(hold.sort(), ["dev", "indieHackers", "peerlist", "productHunt", "reddit", "showHn"].sort());
  assert.deepEqual(draftOnly.sort(), ["dev", "reddit"]);
  assert.deepEqual(manual, ["showHn"]);
  assert.equal(mapCompletionStatus("reddit"), "needs_input");
  assert.equal(mapCompletionStatus("indieHackers"), "needs_input");
  assert.equal(mapCompletionStatus("dev", {
    authorInputs: { realCase: "x", code: "y", failure: "z", aiDisclosure: "used" },
    validationOk: true,
  }), "needs_input");
  assert.equal(mapCompletionStatus("showHn"), "manual_only");
  assert.equal(mapCompletionStatus("peerlist", { validationOk: true }), "needs_review");
});

test("한국어 운영 문구와 홍보 글은 영어 게시 필드에서 거부된다", () => {
  assert.ok(opsLanguageIssues({ body: "HOLD — 게시 금지" }).length > 0);
  assert.ok(opsLanguageIssues({ body: "[게시 전 직접 선택] 체크" }).length > 0);
  assert.equal(opsLanguageIssues({ body: "AI Systems Atlas is a read-only demo." }).length, 0);
  assert.ok(promoIssues("dev", { facts: { name: "Atlas", description: "just launched, check out my tool" } }).length > 0);
  assert.ok(structureIssues("reddit", { title: "Show HN", body: "please upvote" }).length > 0);
  const facebook = validatePublish("facebook", {
    reelsCaption: "same caption",
    groupBody: "same caption",
  });
  assert.equal(facebook.ok, false);
  assert.ok(facebook.issues.some((issue) => issue.code === "FIELD_COLLAPSE"));
  const instagram = validatePublish("instagram", {
    cover: "AI Systems Atlas 실제 화면을 아주 긴 표지 문구로 넣으면 바로 실패함",
    caption: "caption",
  });
  assert.equal(instagram.ok, false);
});

test("반복 훅·CTA 검사는 같은 템플릿을 경고한다", () => {
  const hook = "문서가 쌓일수록 연결을 놓칩니다. 첫 화면이 보이나요?";
  const warnings = repeatQualityWarnings({
    x1: { body: hook },
    linkedin: { body: hook },
    okky: { title: hook, body: hook },
  });
  assert.ok(warnings.some((item) => item.code === "REPEATED_HOOK"));
  assert.ok(warnings.some((item) => item.code === "REPEATED_CTA"));
});

test("Reddit·Indie Hackers·DEV는 입력 없이 ready가 되지 않는다", async () => {
  let calls = 0;
  const runner = new FakeGrokTextRunner(async () => {
    calls += 1;
    return { englishSummary: { oneSentence: "x", shortIntro: "x", features: [], demoBoundary: "x" }, publishFields: { facts: { name: "AI Systems Atlas" } } };
  });
  const reddit = await composeDraft({
    channel: "reddit",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { facts: { name: "AI Systems Atlas", description: "graph", demoUrl: "", repositoryUrl: "https://github.com/a/b", license: "MIT", features: [] } },
    facts,
  }, { runner });
  assert.equal(reddit.status, "needs_input");
  const indie = await composeDraft({
    channel: "indieHackers",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: { title: "AI Systems Atlas", body: "AI Systems Atlas https://memory.example" },
    facts,
  }, { runner });
  assert.equal(indie.status, "needs_input");
  const dev = validateDraft({
    channel: "dev",
    publishFields: { facts: { name: "AI Systems Atlas", description: "graph" } },
    facts,
  });
  assert.equal(dev.status, "needs_input");
  assert.ok(dev.missingInputs.includes("aiDisclosure"));
  assert.equal(calls, 0);
});

test("Show HN은 compose·review에서 provider를 호출하지 않는다", async () => {
  let calls = 0;
  const runner = new FakeGrokTextRunner(async () => {
    calls += 1;
    return { issues: [], suggestions: [] };
  });
  await assert.rejects(() => composeDraft({
    channel: "showHn",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: {},
    facts,
  }, { runner }), /영문 재구성/);
  await assert.rejects(() => reviewDraft({
    channel: "showHn",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    publishFields: {},
    facts,
  }, { runner }), /영문 재구성/);
  assert.equal(calls, 0);
  assert.deepEqual(createDraftDocument("showHn").publishFields, {});
});

test("Phase 6 OAuth smoke fixture는 비밀 없이 그룹 대표 채널을 통과한다", () => {
  let raw;
  try {
    raw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/providers/phase6-smoke.json"), "utf8");
  } catch {
    return;
  }
  const report = JSON.parse(raw);
  assert.doesNotMatch(raw, /sk-|Bearer |\/Users\/[^/\s]+\/\.(grok|codex)\/|XAI_API_KEY|OPENAI_API_KEY|prompt\.txt|HOLD —|게시 전/);
  assert.equal(report.items.xThread.provider, "grok");
  assert.equal(report.items.geeknews.provider, "codex");
  assert.equal(report.items.indieHackers.provider, "codex");
  assert.equal(report.items.xThread.status, "ready");
  assert.equal(report.items.geeknews.status, "ready");
  assert.equal(report.items.indieHackers.status, "needs_review");
  assert.equal(report.items.xThread.formatOk, true);
  assert.equal(report.items.geeknews.formatOk, true);
  assert.equal(report.items.indieHackers.formatOk, true);
  assert.ok(Array.isArray(report.items.xThread.publishFields.segments));
  assert.equal(report.items.xThread.publishFields.segments.length, 3);
  assert.match(report.items.indieHackers.publishFields.body, /read-only|editing/i);
});

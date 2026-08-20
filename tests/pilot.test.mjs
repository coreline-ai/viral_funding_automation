import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildDraftDocuments, buildProjectSummary } from "../src/content.mjs";
import { validatePublish } from "../src/drafts.mjs";
import { informationLossIssues, linkedInPilotIssues, productHuntPilotIssues, sanitizePilotFixture, xAngleIssues } from "../src/pilot.mjs";
import { countXWeightedCharacters } from "../src/x-text.mjs";

const source = {
  input: { owner: "coreline-ai", repo: "memory_node_graph", fullName: "coreline-ai/memory_node_graph", url: "https://github.com/coreline-ai/memory_node_graph" },
  repository: {
    name: "memory_node_graph",
    fullName: "coreline-ai/memory_node_graph",
    description: "Markdown 문서를 지식 그래프로 탐색하는 3D 브라우저",
    url: "https://github.com/coreline-ai/memory_node_graph",
    homepage: "",
    language: "JavaScript",
    topics: ["knowledge-graph", "threejs"],
    defaultBranch: "main",
    readmeUrl: "https://github.com/coreline-ai/memory_node_graph/blob/main/README.md",
    license: "MIT",
  },
  readme: `# Memory Node Graph\n\nMarkdown 문서를 지식 그래프로 변환하고 브라우저에서 탐색합니다.\n\n[![Live Demo](https://img.shields.io/badge/live-demo.svg)](https://memory.example)\n\n## 주요 기능\n\n- 문서 간 링크를 그래프로 표시\n- Three.js 기반 3D 탐색\n- 검색과 노드 필터링\n\n## 요구사항\n\n- Node.js 22 이상\n`,
  packageJson: { dependencies: { three: "^1.0.0" } },
};

test("X 3안은 각도가 다르고 280 가중자를 넘지 않는다", () => {
  const items = buildDraftDocuments(buildProjectSummary(source));
  const bodies = [items.x1.publishFields.body, items.x2.publishFields.body, items.x3.publishFields.body];
  assert.equal(xAngleIssues(bodies).length, 0);
  for (const body of bodies) {
    assert.equal(validatePublish("x1", { body }).ok, true);
    assert.ok(countXWeightedCharacters(body.trim()) <= 280);
  }
});

test("LinkedIn 원문은 문제·구현·데모 경계·질문 구조를 가진다", () => {
  const items = buildDraftDocuments(buildProjectSummary(source));
  const facts = { name: "Memory Node Graph", demoUrl: "https://memory.example", repositoryUrl: source.repository.url };
  assert.equal(linkedInPilotIssues(items.linkedin.publishFields.body, facts).length, 0);
});

test("Product Hunt 필드는 60/260을 지키고 투표 요청이 없다", () => {
  const items = buildDraftDocuments(buildProjectSummary(source));
  const fields = items.productHunt.publishFields;
  assert.equal(productHuntPilotIssues(fields).length, 0);
  assert.equal(validatePublish("productHunt", fields).ok, true);
});

test("파일럿 fixture는 비밀과 정보 손실을 거절한다", () => {
  const fields = { body: "Memory Node Graph https://memory.example MIT" };
  assert.equal(informationLossIssues(fields, fields, { name: "Memory Node Graph", demoUrl: "https://memory.example" }).length, 0);
  assert.ok(informationLossIssues(fields, { body: "hello" }, { name: "Memory Node Graph" }).length > 0);
  assert.throws(() => sanitizePilotFixture({ channel: "x1", publishFields: { body: "see XAI_API_KEY in child env" } }), /비밀/);
  const clean = sanitizePilotFixture({ channel: "x1", provider: "grok", status: "ready", publishFields: { body: "ok" }, evidence: [] });
  assert.equal(clean.channel, "x1");
});

test("저장된 OAuth smoke fixture는 비밀 없이 검증을 통과한다", () => {
  let raw;
  try {
    raw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/providers/pilot-smoke.json"), "utf8");
  } catch {
    return;
  }
  const report = JSON.parse(raw);
  assert.doesNotMatch(raw, /sk-|Bearer |\/Users\/[^/\s]+\/\.(grok|codex)\/|XAI_API_KEY|OPENAI_API_KEY|prompt\.txt/);
  assert.equal(report.items.x1.provider, "grok");
  assert.equal(report.items.linkedin.provider, "codex");
  assert.equal(report.items.productHunt.provider, "codex");
  assert.equal(report.items.x1.formatOk, true);
  assert.equal(report.items.linkedin.formatOk, true);
  assert.equal(report.items.productHunt.formatOk, true);
  assert.equal(report.linkedIn.length, 0);
  assert.equal(report.productHunt.length, 0);
});

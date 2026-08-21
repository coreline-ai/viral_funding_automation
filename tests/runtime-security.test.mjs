import assert from "node:assert/strict";
import test from "node:test";

import { composeDraft, reviewDraft, validateDraft } from "../src/composition.mjs";
import { FakeGrokTextRunner } from "../src/grok-oauth-proxy.mjs";
import { claimEvidenceIssues, providerOutputDlpIssues } from "../src/runtime-security.mjs";

const facts = {
  name: "AI Systems Atlas",
  repositoryUrl: "https://github.com/coreline-ai/memory_node_graph",
  demoUrl: "https://memory.example",
  license: "MIT",
  technologies: ["React", "Three.js", "Remark"],
  features: ["Explore source-backed relationships"],
  description: "A read-only public demo.",
};

const brief = {
  publisherRole: "owner",
  accountVoice: "personal",
  ownershipConfirmed: true,
  goal: "feedback",
  audience: "developers",
  targetLocale: "en-US",
};

function request(extra = {}) {
  return {
    channel: "x1",
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    provider: "grok",
    publishFields: { body: "AI Systems Atlas https://memory.example" },
    facts,
    campaignBrief: brief,
    ...extra,
  };
}

test("DLP는 token·private key·개인 경로·canary를 값 없이 분류한다", () => {
  const issues = providerOutputDlpIssues({
    body: "Bearer this-must-never-be-exposed-12345678 /Users/demo/.ssh/id_ed25519",
    note: "-----BEGIN PRIVATE KEY-----",
    canary: "R1_CANARY_1234567890",
  }, { canaryValues: ["R1_CANARY_1234567890"] });
  assert.deepEqual(issues.map((issue) => issue.code), ["PRIVATE_PATH_EXPOSURE", "SECRET_EXPOSURE", "SECRET_EXPOSURE", "CANARY_EXPOSURE"]);
  assert.doesNotMatch(JSON.stringify(issues), /this-must-never|R1_CANARY|\/Users\/demo/);
});

test("근거 없는 기술·기능·성과·외부 URL claim은 canonical fact로 통과하지 않는다", () => {
  const issues = claimEvidenceIssues(request(), {
    body: "AI Systems Atlas is powered by Kubernetes, has OAuth login, and is trusted by millions of teams. https://evil.example",
  });
  assert.ok(issues.some((issue) => issue.code === "UNSUPPORTED_TECHNOLOGY" && issue.claim === "Kubernetes"));
  assert.ok(issues.some((issue) => issue.code === "UNSUPPORTED_CAPABILITY" && issue.claim === "OAuth login"));
  assert.ok(issues.some((issue) => issue.code === "UNSUPPORTED_PERFORMANCE_CLAIM"));
  assert.ok(issues.some((issue) => issue.code === "UNSUPPORTED_URL"));
});

test("provider의 DLP 결과와 허위 claim은 compose·validate에서 게시 후보가 되지 않는다", async () => {
  const secretRunner = new FakeGrokTextRunner(async () => ({
    englishSummary: { oneSentence: "A", shortIntro: "B", features: [], demoBoundary: "C" },
    publishFields: { body: "AI Systems Atlas Bearer token-that-must-not-leak-123456" },
  }));
  await assert.rejects(() => composeDraft(request(), { runner: secretRunner }), (error) => error?.code === "SENSITIVE_PROVIDER_OUTPUT");

  const falseRunner = new FakeGrokTextRunner(async () => ({
    englishSummary: { oneSentence: "A", shortIntro: "B", features: [], demoBoundary: "C" },
    publishFields: { body: "AI Systems Atlas is powered by Kubernetes and trusted by millions of teams. https://memory.example" },
  }));
  await assert.rejects(() => composeDraft(request(), { runner: falseRunner }), /기술 구성|성과 또는 비교/);

  const validated = validateDraft(request({
    publishFields: { body: "AI Systems Atlas runs on Kubernetes https://memory.example" },
    sourceDraft: { publishFields: { body: "AI Systems Atlas https://memory.example" } },
  }));
  assert.equal(validated.contentStatus, "invalid");
  assert.equal(validated.publishReady, false);
  assert.ok(validated.validation.issues.some((issue) => issue.code === "UNSUPPORTED_TECHNOLOGY"));
});

test("근거가 있는 기술·URL은 evidenceId와 source를 포함해 통과한다", async () => {
  const runner = new FakeGrokTextRunner(async () => ({
    englishSummary: { oneSentence: "A", shortIntro: "B", features: ["Explore source-backed relationships"], demoBoundary: "A read-only public demo." },
    publishFields: { body: "AI Systems Atlas uses React and Three.js to explore source-backed relationships. https://memory.example" },
  }));
  const result = await composeDraft(request(), { runner });
  assert.equal(result.contentStatus, "candidate");
  assert.ok(result.evidence.some((item) => item.evidenceId === "fact:technology:1" && item.source === "facts.technologies[0]"));
  assert.ok(result.evidence.every((item) => item.evidenceId && item.source));
});

test("review provider도 민감 출력은 차단한다", async () => {
  const runner = new FakeGrokTextRunner(async () => ({
    issues: ["/Users/demo/.codex/auth.json"],
    suggestions: [],
  }));
  await assert.rejects(() => reviewDraft(request(), { runner }), (error) => error?.code === "SENSITIVE_PROVIDER_OUTPUT");
});

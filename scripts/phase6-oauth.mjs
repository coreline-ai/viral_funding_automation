#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { composeDraft } from "../src/composition.mjs";
import { buildDraftDocuments, buildProjectSummary } from "../src/content.mjs";
import { CliCodexTextRunner, CliGrokTextRunner, loadCodexRuntimeConfig, loadGrokRuntimeConfig } from "../src/grok-oauth-proxy.mjs";
import { hashPublishFields, validatePublish } from "../src/drafts.mjs";
import { sanitizePilotFixture } from "../src/pilot.mjs";

const source = {
  input: { owner: "coreline-ai", repo: "memory_node_graph", fullName: "coreline-ai/memory_node_graph", url: "https://github.com/coreline-ai/memory_node_graph" },
  repository: {
    name: "memory_node_graph",
    fullName: "coreline-ai/memory_node_graph",
    description: "Markdown 문서를 관계형 지식 그래프로 탐색하는 웹앱",
    url: "https://github.com/coreline-ai/memory_node_graph",
    homepage: "https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation",
    language: "TypeScript",
    topics: ["knowledge-graph"],
    defaultBranch: "main",
    readmeUrl: "https://github.com/coreline-ai/memory_node_graph/blob/main/README.md",
    license: "MIT",
  },
  readme: `# AI Systems Atlas\n\nMarkdown 문서를 지식 그래프로 변환합니다.\n\n[demo](https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation)\n\n## 주요 기능\n\n- 문서 간 링크를 그래프로 표시\n`,
  packageJson: { dependencies: { three: "^1.0.0" } },
};

const facts = {
  name: "AI Systems Atlas",
  repositoryUrl: "https://github.com/coreline-ai/memory_node_graph",
  demoUrl: "https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation",
  license: "MIT",
  technologies: ["TypeScript", "React", "Three.js"],
};

const items = buildDraftDocuments(buildProjectSummary(source));

async function runOne(channel, provider, runner, publishFields, authorInputs = {}) {
  const result = await composeDraft({
    channel,
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    provider,
    publishFields,
    facts,
    authorInputs,
    sourceHash: hashPublishFields(publishFields),
  }, { runner });
  const fixture = sanitizePilotFixture(result);
  const format = validatePublish(channel, fixture.publishFields ?? {}, { facts });
  return { ...fixture, formatOk: format.ok, formatIssues: format.issues };
}

const grok = new CliGrokTextRunner(loadGrokRuntimeConfig());
const codex = new CliCodexTextRunner(loadCodexRuntimeConfig());

const xThread = await runOne("xThread", "grok", grok, items.xThread.publishFields);
const geeknews = await runOne("geeknews", "codex", codex, items.geeknews.publishFields);
const indieHackers = await runOne("indieHackers", "codex", codex, items.indieHackers.publishFields, {
  motivation: "문서가 늘어날수록 연결을 잃어 직접 그래프 탐색기를 만들었습니다.",
  hardDecision: "편집 기능을 빼고 읽기 전용 공개 데모만 먼저 열었습니다.",
});

const report = {
  capturedAt: new Date().toISOString(),
  items: { xThread, geeknews, indieHackers },
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/providers");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "phase6-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  ok: true,
  xThread: xThread.status,
  geeknews: geeknews.status,
  indieHackers: indieHackers.status,
}, null, 2)}\n`);

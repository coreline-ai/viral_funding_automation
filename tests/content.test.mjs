import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parseArguments, run } from "../src/cli.mjs";
import { buildProjectSummary, renderContentPack, writeContentPack } from "../src/content.mjs";
import { countXWeightedCharacters } from "../src/x-text.mjs";

const source = {
  input: {
    owner: "coreline-ai",
    repo: "memory_node_graph",
    fullName: "coreline-ai/memory_node_graph",
    url: "https://github.com/coreline-ai/memory_node_graph",
  },
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
  readme: `# Memory Node Graph

Markdown 문서를 지식 그래프로 변환하고 브라우저에서 탐색합니다.

[![Live Demo](https://img.shields.io/badge/live-demo.svg)](https://memory.example)

## 주요 기능

- 문서 간 링크를 그래프로 표시
- Three.js 기반 3D 탐색
- 검색과 노드 필터링

## 요구사항

- Node.js 22 이상

`,
  packageJson: { dependencies: { three: "^1.0.0", marked: "^2.0.0" } },
};

test("README 근거로 프로젝트 요약을 만든다", () => {
  const summary = buildProjectSummary(source);

  assert.equal(summary.name, "Memory Node Graph");
  assert.equal(summary.demoUrl, "https://memory.example");
  assert.deepEqual(summary.features, [
    "문서 간 링크를 그래프로 표시",
    "Three.js 기반 3D 탐색",
    "검색과 노드 필터링",
  ]);
  assert.deepEqual(summary.limitations, ["Node.js 22 이상"]);
  assert.ok(summary.technologies.includes("three"));
  assert.ok(summary.audiences.length > 0);
});

test("장식 문자를 제거하고 배지 이미지 대신 실제 데모 링크를 선택한다", () => {
  const summary = buildProjectSummary({
    ...source,
    repository: {
      ...source.repository,
      description: "한국어 설명 | English description",
    },
    readme: source.readme.replace("# Memory Node Graph", "# ✦ AI Systems Atlas"),
  });

  assert.equal(summary.name, "AI Systems Atlas");
  assert.equal(summary.description, "한국어 설명");
  assert.equal(summary.demoUrl, "https://memory.example");
  assert.ok(!summary.demoUrl.includes("img.shields.io"));
});

test("패키지 레지스트리의 registry를 try 힌트로 오인하지 않고 homepage를 사용한다", () => {
  const summary = buildProjectSummary({
    ...source,
    repository: {
      ...source.repository,
      name: "express",
      fullName: "expressjs/express",
      description: "Fast, unopinionated, minimalist web framework for node.",
      homepage: "https://expressjs.com",
    },
    readme: `# express

[entry guide](https://example.com/entry)
[country guide](https://example.com/country)
[npm registry](https://www.npmjs.com/)
[Try package](https://www.npmjs.com/package/express)
`,
  });

  assert.equal(summary.demoUrl, "https://expressjs.com");
});

test("독립된 try 경로는 실제 데모 링크로 계속 인식한다", () => {
  const summary = buildProjectSummary({
    ...source,
    repository: { ...source.repository, homepage: "https://docs.example" },
    readme: `# ripgrep

[Run it in your browser](https://codapi.org/try/ripgrep/)
`,
  });

  assert.equal(summary.demoUrl, "https://codapi.org/try/ripgrep/");
});

test("요약과 바이럴 콘텐츠 3종을 포함한 6개 파일을 렌더링한다", () => {
  const files = renderContentPack(buildProjectSummary(source));

  assert.deepEqual(Object.keys(files).sort(), [
    "community-post.md",
    "long-post.md",
    "project-summary.json",
    "project-summary.md",
    "short-post.md",
    "viral-hooks.md",
  ]);
  assert.doesNotThrow(() => JSON.parse(files["project-summary.json"]));
  assert.match(files["short-post.md"], /https:\/\/memory\.example/);
  assert.doesNotMatch(files["short-post.md"], /^#/);
  assert.ok(countXWeightedCharacters(files["short-post.md"].trim()) <= 240);
  assert.match(files["community-post.md"], /^# GeekNews Show 게시 초안/m);
  assert.match(files["community-post.md"], /등록 구분: `Show`/);
  assert.match(files["community-post.md"], /현재 확인할 점/);
  assert.doesNotMatch(files["community-post.md"], /프로젝트\./);
  assert.match(files["long-post.md"], /^# .*DEV 기술 글 초안/m);
  assert.match(files["long-post.md"], /## 해결하려는 문제/);
  assert.match(files["long-post.md"], /## 접근 방식/);
  assert.match(files["long-post.md"], /## 직접 실행하기/);
  assert.match(files["long-post.md"], /## 게시 전 보강할 내용/);
  assert.match(files["long-post.md"], /라이선스: MIT/);
  assert.ok(!Object.values(files).join("\n").includes("혁신적인"));
});

test("X 가중 문자는 CJK·emoji를 2자, URL을 23자로 계산한다", () => {
  assert.equal(countXWeightedCharacters("abc"), 3);
  assert.equal(countXWeightedCharacters("한글"), 4);
  assert.equal(countXWeightedCharacters("🙂"), 2);
  assert.equal(countXWeightedCharacters("https://example.com/very/long/path"), 23);
  assert.equal(countXWeightedCharacters("한 A https://example.com"), 2 + 1 + 1 + 1 + 23);
});

test("생성 파일을 저장소 이름 디렉터리에 기록한다", async () => {
  const root = await mkdtemp(join(tmpdir(), "viral-mvp-"));
  try {
    const outputDirectory = await writeContentPack(root, source.input.repo, renderContentPack(buildProjectSummary(source)));
    const names = (await readdir(outputDirectory)).sort();
    assert.equal(names.length, 6);
    assert.equal(JSON.parse(await readFile(join(outputDirectory, "project-summary.json"), "utf8")).repository, source.repository.fullName);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI 인자를 검증하고 네트워크 없는 실행도 가능하다", async () => {
  assert.deepEqual(parseArguments(["--repo", source.input.url]), {
    repo: source.input.url,
    out: "output",
    help: false,
  });
  assert.throws(() => parseArguments([]), /--repo/);
  assert.throws(() => parseArguments(["--unknown"]), /지원하지 않는/);

  const root = await mkdtemp(join(tmpdir(), "viral-cli-"));
  const output = [];
  const fetchImpl = async (url) => {
    if (url.endsWith("/repos/coreline-ai/memory_node_graph")) {
      return new Response(JSON.stringify({
        name: source.repository.name,
        full_name: source.repository.fullName,
        description: source.repository.description,
        html_url: source.repository.url,
        language: source.repository.language,
        topics: source.repository.topics,
        default_branch: "main",
        private: false,
        license: { spdx_id: "MIT" },
      }));
    }
    if (url.endsWith("/readme")) return new Response(source.readme);
    if (url.endsWith("/license")) return new Response("not found", { status: 404 });
    if (url.endsWith("/contents/package.json")) return new Response(JSON.stringify(source.packageJson));
    return new Response("not found", { status: 404 });
  };

  try {
    const receipt = await run(["--repo", source.input.url, "--out", "generated"], {
      apiBase: "https://api.test",
      cwd: root,
      fetchImpl,
      stdout: (value) => output.push(value),
    });
    assert.equal(receipt.repository, source.input.fullName);
    assert.equal(receipt.files.length, 6);
    assert.equal(output.length, 1);
    assert.equal((await readdir(receipt.outputDirectory)).length, 6);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("README가 없는 저장소도 사실 기반 기본 콘텐츠를 만든다", () => {
  const minimal = buildProjectSummary({
    ...source,
    readme: "",
    packageJson: null,
    repository: { ...source.repository, description: "", homepage: "", topics: [] },
  });

  assert.equal(minimal.name, "memory_node_graph");
  assert.equal(minimal.description, "memory_node_graph 오픈소스 프로젝트");
  assert.deepEqual(minimal.features, []);
  assert.equal(minimal.demoUrl, "");
  const files = renderContentPack(minimal);
  assert.equal(files["short-post.md"].split(minimal.description).length - 1, 1);
  assert.ok(countXWeightedCharacters(files["short-post.md"].trim()) <= 240);
});

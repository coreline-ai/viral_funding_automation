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

test("요약과 주요 채널 수동 게시 출시팩 18개 파일을 렌더링한다", () => {
  const files = renderContentPack(buildProjectSummary(source));

  assert.deepEqual(Object.keys(files).sort(), [
    "community-post.md",
    "dev-article.md",
    "disquiet-product.md",
    "geeknews-show.md",
    "linkedin-post.md",
    "long-post.md",
    "project-summary.json",
    "project-summary.md",
    "reddit-post.md",
    "short-post.md",
    "show-hn.md",
    "threads-series.md",
    "viral-hooks.md",
    "x-single-1.md",
    "x-single-2.md",
    "x-single-3.md",
    "x-thread.md",
    "youtube-shorts.md",
  ]);
  assert.doesNotThrow(() => JSON.parse(files["project-summary.json"]));
  const singles = ["x-single-1.md", "x-single-2.md", "x-single-3.md"].map((name) => files[name]);
  assert.equal(new Set(singles).size, 3);
  for (const draft of singles) {
    assert.match(draft, /https:\/\/memory\.example/);
    assert.doesNotMatch(draft, /^#/);
    assert.ok(countXWeightedCharacters(draft.trim()) <= 240);
  }
  for (const segment of files["x-thread.md"].split(/\n\s*---\s*\n/u)) {
    assert.ok(countXWeightedCharacters(segment.trim()) <= 280);
  }
  assert.match(files["threads-series.md"], /Threads Build in Public/);
  assert.match(files["threads-series.md"], /## 5\/5 현재 단계와 피드백/);
  assert.match(files["reddit-post.md"], /대상 서브레딧과 규칙 확인 전 게시 금지/);
  assert.match(files["reddit-post.md"], /## 제목[\s\S]*## 본문/);
  assert.match(files["reddit-post.md"], /업보트·Star를 요청하지 마세요/);
  assert.match(files["linkedin-post.md"], /누구에게 유용한가/);
  assert.match(files["disquiet-product.md"], /제품을 먼저 등록하고 검토받은 뒤/);
  assert.match(files["geeknews-show.md"], /^# GeekNews Show 게시 초안/m);
  assert.match(files["geeknews-show.md"], /등록 구분: `Show`/);
  assert.doesNotMatch(files["geeknews-show.md"], /프로젝트\./);
  assert.match(files["dev-article.md"], /^# .*DEV 기술 글 작업본/m);
  assert.match(files["dev-article.md"], /## 해결하려는 문제/);
  assert.match(files["dev-article.md"], /## 접근 방식/);
  assert.match(files["dev-article.md"], /## 직접 실행하기/);
  assert.match(files["dev-article.md"], /## 게시 전 보강할 내용/);
  assert.match(files["dev-article.md"], /라이선스: MIT/);
  assert.match(files["youtube-shorts.md"], /1080×1920/);
  assert.match(files["youtube-shorts.md"], /## 20초 샷리스트/);
  assert.match(files["show-hn.md"], /HOLD/);
  assert.match(files["show-hn.md"], /Do not generate or automate HN comments/);
  assert.equal(files["short-post.md"], files["x-single-1.md"]);
  assert.equal(files["community-post.md"], files["geeknews-show.md"]);
  assert.equal(files["long-post.md"], files["dev-article.md"]);
  assert.ok(!Object.values(files).join("\n").includes("혁신적인"));
});

test("X 가중 문자는 CJK·emoji를 2자, URL을 23자로 계산한다", () => {
  assert.equal(countXWeightedCharacters("abc"), 3);
  assert.equal(countXWeightedCharacters("한글"), 4);
  assert.equal(countXWeightedCharacters("🙂"), 2);
  assert.equal(countXWeightedCharacters("👨‍👩‍👧‍👦"), 2);
  assert.equal(countXWeightedCharacters("🙋🏽"), 2);
  assert.equal(countXWeightedCharacters("cafe\u0301"), countXWeightedCharacters("café"));
  assert.equal(countXWeightedCharacters("https://example.com/very/long/path"), 23);
  assert.equal(countXWeightedCharacters("한 A https://example.com"), 2 + 1 + 1 + 1 + 23);
});

test("생성 파일을 저장소 이름 디렉터리에 기록한다", async () => {
  const root = await mkdtemp(join(tmpdir(), "viral-mvp-"));
  try {
    const outputDirectory = await writeContentPack(root, source.input.repo, renderContentPack(buildProjectSummary(source)));
    const names = (await readdir(outputDirectory)).sort();
    assert.equal(names.length, 18);
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
    assert.equal(receipt.files.length, 18);
    assert.equal(output.length, 1);
    assert.equal((await readdir(receipt.outputDirectory)).length, 18);
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

test("채널 템플릿이 특정 지식 그래프 도메인을 다른 저장소에 덧붙이지 않는다", () => {
  const unrelated = buildProjectSummary({
    ...source,
    input: {
      owner: "sample",
      repo: "tiny_calc",
      fullName: "sample/tiny_calc",
      url: "https://github.com/sample/tiny_calc",
    },
    repository: {
      ...source.repository,
      name: "tiny_calc",
      fullName: "sample/tiny_calc",
      description: "A small command-line calculator",
      url: "https://github.com/sample/tiny_calc",
      homepage: "https://calc.example",
      topics: ["cli", "calculator"],
      readmeUrl: "https://github.com/sample/tiny_calc/blob/main/README.md",
    },
    readme: "# Tiny Calc\n\nA small command-line calculator.\n\n## Features\n\n- Adds two numbers\n",
    packageJson: null,
  });
  const files = renderContentPack(unrelated);
  const channelDrafts = [
    files["threads-series.md"],
    files["reddit-post.md"],
    files["linkedin-post.md"],
    files["disquiet-product.md"],
    files["youtube-shorts.md"],
    files["show-hn.md"],
  ].join("\n");

  assert.doesNotMatch(channelDrafts, /knowledge graphs|growing Markdown|문서·지식 관리|관계와 근거/u);
  assert.match(files["reddit-post.md"], /first-use experience/);
  assert.match(files["youtube-shorts.md"], /Tiny Calc 실제 화면 20초 데모/);
});

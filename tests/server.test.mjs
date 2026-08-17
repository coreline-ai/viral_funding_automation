import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createAppServer } from "../src/server.mjs";

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function textResponse(value, init = {}) {
  return new Response(value, { status: init.status ?? 200, headers: init.headers });
}

function githubFixtureFetch() {
  return async (url, options = {}) => {
    assert.equal(options.method, undefined);
    if (url.endsWith("/repos/coreline-ai/memory_node_graph")) {
      return jsonResponse({
        name: "memory_node_graph",
        full_name: "coreline-ai/memory_node_graph",
        description: "Markdown 문서를 관계형 지식 그래프로 탐색하는 웹앱",
        html_url: "https://github.com/coreline-ai/memory_node_graph",
        homepage: "https://atlas.example",
        language: "TypeScript",
        topics: ["knowledge-graph"],
        default_branch: "main",
        private: false,
        license: { spdx_id: "MIT" },
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
      });
    }
    if (url.endsWith("/readme")) {
      return textResponse("# AI Systems Atlas\n\n## 주요 기능\n\n- Markdown 지식 그래프\n\n## 요구사항\n\n- Node.js 22 이상\n");
    }
    if (url.endsWith("/license")) return textResponse("not found", { status: 404 });
    if (url.endsWith("/contents/package.json")) {
      return textResponse(JSON.stringify({ dependencies: { three: "^1.0.0" } }));
    }
    return textResponse("not found", { status: 404 });
  };
}

async function withServer(options, callback) {
  const webRoot = await mkdtemp(join(tmpdir(), "viral-web-root-"));
  await Promise.all([
    writeFile(join(webRoot, "index.html"), "<!doctype html><title>Coreline Launch</title>"),
    writeFile(join(webRoot, "favicon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
    writeFile(join(webRoot, "styles.css"), ":root{color-scheme:dark}"),
    writeFile(join(webRoot, "app.js"), "export {};"),
  ]);
  const server = createAppServer({ webRoot, ...options });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await callback(origin);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(webRoot, { recursive: true, force: true });
  }
}

test("정적 파일만 allowlist로 제공하고 보안 헤더를 설정한다", async () => {
  await withServer({}, async (origin) => {
    const index = await fetch(`${origin}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /Coreline Launch/);
    assert.match(index.headers.get("content-security-policy"), /img-src 'self'/);
    assert.equal(index.headers.get("x-content-type-options"), "nosniff");

    assert.equal((await fetch(`${origin}/styles.css`)).status, 200);
    assert.equal((await fetch(`${origin}/app.js`)).status, 200);
    const xText = await fetch(`${origin}/x-text.mjs`);
    assert.equal(xText.status, 200);
    assert.match(xText.headers.get("content-type"), /^text\/javascript/);
    assert.match(await xText.text(), /countXWeightedCharacters/);
    const favicon = await fetch(`${origin}/favicon.svg`);
    assert.equal(favicon.status, 200);
    assert.match(favicon.headers.get("content-type"), /^image\/svg\+xml/);
    assert.equal((await fetch(`${origin}/package.json`)).status, 404);
    assert.equal((await fetch(`${origin}/%2e%2e/package.json`)).status, 404);

    const method = await fetch(`${origin}/styles.css`, { method: "POST" });
    assert.equal(method.status, 405);
    assert.equal(method.headers.get("allow"), "GET, HEAD");
  });
});

test("공개 GitHub URL을 분석해 GUI용 사실과 주요 채널 원고 18종을 반환한다", async () => {
  await withServer({ fetchImpl: githubFixtureFetch(), token: "server-only-token" }, async (origin) => {
    const response = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/coreline-ai/memory_node_graph" }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.repository.fullName, "coreline-ai/memory_node_graph");
    assert.equal(payload.repository.language, "TypeScript");
    assert.equal(payload.facts.hasReadme, true);
    assert.equal(payload.facts.license, "MIT");
    assert.equal(payload.baseline.stars, 42);
    assert.equal(payload.baseline.forks, 7);
    assert.equal(payload.baseline.openIssues, 3);
    assert.ok(!Number.isNaN(Date.parse(payload.baseline.capturedAt)));
    assert.deepEqual(Object.keys(payload.drafts).sort(), [
      "dev",
      "disquiet",
      "facebook",
      "geeknews",
      "indieHackers",
      "instagram",
      "linkedin",
      "okky",
      "peerlist",
      "productHunt",
      "reddit",
      "shorts",
      "showHn",
      "threads",
      "x1",
      "x2",
      "x3",
      "xThread",
    ]);
    assert.match(payload.drafts.x1, /AI Systems Atlas/);
    assert.match(payload.drafts.threads, /Build in Public/);
    assert.match(payload.drafts.reddit, /서브레딧/);
    assert.match(payload.drafts.facebook, /Facebook Reels/);
    assert.match(payload.drafts.instagram, /Instagram Reels/);
    assert.match(payload.drafts.productHunt, /Maker 첫 댓글/);
    assert.match(payload.drafts.peerlist, /Launchpad/);
    assert.match(payload.drafts.indieHackers, /Build in Public/);
    assert.match(payload.drafts.okky, /OKKY 프로젝트 소개/);
    assert.match(payload.drafts.showHn, /HOLD/);
    assert.ok(!JSON.stringify(payload).includes("server-only-token"));
  });
});

test("게시 직전 기준점 API는 공개 repository metadata만 반환한다", async () => {
  const calls = [];
  await withServer({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return jsonResponse({
        name: "memory_node_graph",
        full_name: "coreline-ai/memory_node_graph",
        html_url: "https://github.com/coreline-ai/memory_node_graph",
        private: false,
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
      });
    },
    token: "server-only-token",
  }, async (origin) => {
    const response = await fetch(`${origin}/api/baseline`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/coreline-ai/memory_node_graph" }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.repository.fullName, "coreline-ai/memory_node_graph");
    assert.equal(payload.baseline.stars, 42);
    assert.equal(payload.baseline.forks, 7);
    assert.equal(payload.baseline.openIssues, 3);
    assert.ok(!Number.isNaN(Date.parse(payload.baseline.capturedAt)));
    assert.ok(!JSON.stringify(payload).includes("server-only-token"));
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/repos\/coreline-ai\/memory_node_graph$/);
});

test("API 입력 경계와 method 오류를 안정적인 JSON으로 반환한다", async () => {
  await withServer({}, async (origin) => {
    const getResponse = await fetch(`${origin}/api/generate`);
    assert.equal(getResponse.status, 405);
    assert.equal((await getResponse.json()).error.code, "METHOD_NOT_ALLOWED");

    const contentType = await fetch(`${origin}/api/generate`, { method: "POST", body: "{}" });
    assert.equal(contentType.status, 415);

    const badJson = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    assert.equal(badJson.status, 400);
    assert.equal((await badJson.json()).error.code, "INVALID_JSON");

    const badUrl = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://example.com/a/b" }),
    });
    assert.equal(badUrl.status, 400);
    assert.equal((await badUrl.json()).error.code, "INVALID_REPOSITORY_URL");

    const tooLarge = await fetch(`${origin}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: `https://github.com/a/${"b".repeat(9000)}` }),
    });
    assert.equal(tooLarge.status, 413);
    assert.equal((await tooLarge.json()).error.code, "REQUEST_TOO_LARGE");
  });
});

test("GitHub 404와 rate limit을 사용자용 오류로 변환한다", async () => {
  const cases = [
    { status: 404, headers: {}, expectedStatus: 404, expectedCode: "REPOSITORY_NOT_FOUND" },
    { status: 403, headers: { "x-ratelimit-remaining": "0" }, expectedStatus: 429, expectedCode: "GITHUB_RATE_LIMIT" },
  ];
  for (const fixture of cases) {
    await withServer({
      fetchImpl: async () => textResponse("GitHub error", fixture),
    }, async (origin) => {
      const response = await fetch(`${origin}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoUrl: "https://github.com/coreline-ai/missing" }),
      });
      assert.equal(response.status, fixture.expectedStatus);
      assert.equal((await response.json()).error.code, fixture.expectedCode);
    });
  }
});

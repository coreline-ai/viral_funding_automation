import assert from "node:assert/strict";
import test from "node:test";

import {
  GitHubApiError,
  fetchRepositoryBaseline,
  fetchRepositorySource,
  parseGitHubRepoUrl,
} from "../src/github.mjs";

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function textResponse(value, init = {}) {
  return new Response(value, { status: init.status ?? 200, headers: init.headers });
}

test("공개 GitHub 저장소 루트 URL을 파싱한다", () => {
  assert.deepEqual(parseGitHubRepoUrl("https://github.com/coreline-ai/memory_node_graph.git/"), {
    owner: "coreline-ai",
    repo: "memory_node_graph",
    fullName: "coreline-ai/memory_node_graph",
    url: "https://github.com/coreline-ai/memory_node_graph",
  });
});

test("GitHub 이외 URL과 하위 경로를 거부한다", () => {
  assert.throws(() => parseGitHubRepoUrl("http://github.com/a/b"), /https/);
  assert.throws(() => parseGitHubRepoUrl("https://example.com/a/b"), /github\.com/);
  assert.throws(() => parseGitHubRepoUrl("https://github.com/a/b/issues"), /루트 URL/);
});

test("메타데이터, README, 라이선스, package.json을 GET으로 수집한다", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/repos/coreline-ai/sample")) {
      return jsonResponse({
        name: "sample",
        full_name: "coreline-ai/sample",
        description: "샘플 저장소",
        html_url: "https://github.com/coreline-ai/sample",
        homepage: "https://sample.example",
        language: "JavaScript",
        topics: ["knowledge-graph"],
        default_branch: "main",
        private: false,
        license: null,
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
      });
    }
    if (url.endsWith("/readme")) return textResponse("# Sample\n\n설명입니다.");
    if (url.endsWith("/license")) return jsonResponse({ license: { spdx_id: "MIT" } });
    if (url.endsWith("/contents/package.json")) {
      return textResponse(JSON.stringify({ dependencies: { three: "^1.0.0" } }));
    }
    return textResponse("not found", { status: 404 });
  };

  const source = await fetchRepositorySource("https://github.com/coreline-ai/sample", {
    apiBase: "https://api.test",
    fetchImpl,
    token: "test-token",
  });

  assert.equal(source.repository.fullName, "coreline-ai/sample");
  assert.equal(source.repository.license, "MIT");
  assert.equal(source.repository.stars, 42);
  assert.equal(source.repository.forks, 7);
  assert.equal(source.repository.openIssues, 3);
  assert.equal(source.readme, "# Sample\n\n설명입니다.");
  assert.equal(source.packageJson.dependencies.three, "^1.0.0");
  assert.equal(calls.length, 4);
  assert.ok(calls.every(({ options }) => options.method === undefined));
  assert.ok(calls.every(({ options }) => options.headers.Authorization === "Bearer test-token"));
});

test("게시 직전 공개 기준점은 repository metadata 한 번만 읽는다", async () => {
  const calls = [];
  const baseline = await fetchRepositoryBaseline("https://github.com/coreline-ai/sample", {
    apiBase: "https://api.test",
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return jsonResponse({
        full_name: "coreline-ai/sample",
        html_url: "https://github.com/coreline-ai/sample",
        private: false,
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
      });
    },
    token: "test-token",
  });

  assert.deepEqual(baseline, {
    repository: "coreline-ai/sample",
    repositoryUrl: "https://github.com/coreline-ai/sample",
    stars: 42,
    forks: 7,
    openIssues: 3,
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/repos\/coreline-ai\/sample$/);
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-token");
});

test("누락되거나 잘못된 공개 기준점 수치는 0으로 정규화한다", async () => {
  const baseline = await fetchRepositoryBaseline("https://github.com/acme/minimal", {
    apiBase: "https://api.test",
    fetchImpl: async () => jsonResponse({
      full_name: "acme/minimal",
      private: false,
      stargazers_count: -1,
      forks_count: "7",
    }),
  });

  assert.equal(baseline.stars, 0);
  assert.equal(baseline.forks, 0);
  assert.equal(baseline.openIssues, 0);
});

test("선택 파일이 없어도 저장소 메타데이터를 반환한다", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/repos/acme/minimal")) {
      return jsonResponse({ name: "minimal", full_name: "acme/minimal", private: false });
    }
    return textResponse("not found", { status: 404 });
  };

  const source = await fetchRepositorySource("https://github.com/acme/minimal", {
    apiBase: "https://api.test",
    fetchImpl,
  });

  assert.equal(source.readme, "");
  assert.equal(source.packageJson, null);
  assert.equal(source.repository.license, "UNKNOWN");
});

test("비공개 저장소와 API 제한 오류를 명확히 반환한다", async () => {
  await assert.rejects(
    fetchRepositorySource("https://github.com/acme/private", {
      apiBase: "https://api.test",
      fetchImpl: async () => jsonResponse({ private: true }),
    }),
    (error) => error instanceof GitHubApiError && /비공개/.test(error.message),
  );

  await assert.rejects(
    fetchRepositorySource("https://github.com/acme/limited", {
      apiBase: "https://api.test",
      fetchImpl: async () => textResponse("limited", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      }),
    }),
    (error) => error instanceof GitHubApiError && error.status === 403 && /rate limit/.test(error.message),
  );
});

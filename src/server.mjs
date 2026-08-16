#!/usr/bin/env node
import { createServer as createNodeServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildProjectSummary, renderContentPack } from "./content.mjs";
import { fetchRepositoryBaseline, fetchRepositorySource, GitHubApiError } from "./github.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4310;
const MAX_BODY_BYTES = 8 * 1024;
const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_WEB_ROOT = resolve(MODULE_DIRECTORY, "../web");

const STATIC_ROUTES = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/favicon.svg", { file: "favicon.svg", type: "image/svg+xml; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", type: "text/css; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }],
  ["/x-text.mjs", { file: "x-text.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
]);

class HttpError extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

function applySecurityHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function sendJson(response, status, payload, headers = {}) {
  applySecurityHeaders(response);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendEmpty(response, status, headers = {}) {
  applySecurityHeaders(response);
  response.writeHead(status, headers);
  response.end();
}

async function readJsonBody(request) {
  const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new HttpError(415, "UNSUPPORTED_CONTENT_TYPE", "Content-Type은 application/json이어야 합니다.");
  }

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "REQUEST_TOO_LARGE", "요청 본문은 8KB를 넘을 수 없습니다.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, "REQUEST_TOO_LARGE", "요청 본문은 8KB를 넘을 수 없습니다.");
    }
    chunks.push(chunk);
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_JSON", "요청 JSON 형식을 확인하세요.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "INVALID_REQUEST", "요청 본문은 JSON 객체여야 합니다.");
  }
  return payload;
}

function mapApplicationError(error) {
  if (error instanceof HttpError) return error;
  if (error instanceof TypeError) {
    return new HttpError(400, "INVALID_REPOSITORY_URL", "공개 GitHub 저장소 URL을 확인하세요.");
  }
  if (error instanceof GitHubApiError) {
    if (error.status === 404) {
      return new HttpError(404, "REPOSITORY_NOT_FOUND", "공개 GitHub 저장소를 찾을 수 없습니다.");
    }
    if (error.status === 403 && /rate limit/i.test(error.message)) {
      return new HttpError(429, "GITHUB_RATE_LIMIT", "GitHub API 요청 한도에 도달했습니다. 잠시 후 다시 시도하거나 서버에 GITHUB_TOKEN을 설정하세요.");
    }
    if (error.status === 400 && /비공개/.test(error.message)) {
      return new HttpError(400, "PRIVATE_REPOSITORY", "비공개 저장소는 현재 지원하지 않습니다.");
    }
    return new HttpError(502, "GITHUB_API_ERROR", "GitHub 저장소 정보를 가져오지 못했습니다.");
  }
  return new HttpError(500, "INTERNAL_ERROR", "콘텐츠를 생성하지 못했습니다. 다시 시도하세요.");
}

async function buildGenerationResponse(repoUrl, options) {
  if (typeof repoUrl !== "string" || repoUrl.trim().length === 0) {
    throw new TypeError("repoUrl is required");
  }
  const source = await fetchRepositorySource(repoUrl, {
    fetchImpl: options.fetchImpl,
    apiBase: options.apiBase,
    token: options.token,
  });
  const summary = buildProjectSummary(source);
  const files = renderContentPack(summary);

  return {
    repository: {
      name: source.input.repo,
      fullName: source.input.fullName,
      url: source.repository.url,
      language: source.repository.language,
      visibility: "public",
    },
    facts: {
      hasReadme: source.readme.trim().length > 0,
      license: summary.license,
      demoUrl: summary.demoUrl,
      featureCount: summary.features.length,
      audienceCount: summary.audiences.length,
      limitationCount: summary.limitations.length,
    },
    baseline: {
      capturedAt: new Date().toISOString(),
      stars: source.repository.stars,
      forks: source.repository.forks,
      openIssues: source.repository.openIssues,
    },
    summary,
    drafts: {
      x1: files["x-single-1.md"],
      x2: files["x-single-2.md"],
      x3: files["x-single-3.md"],
      xThread: files["x-thread.md"],
      threads: files["threads-series.md"],
      reddit: files["reddit-post.md"],
      linkedin: files["linkedin-post.md"],
      disquiet: files["disquiet-product.md"],
      geeknews: files["geeknews-show.md"],
      dev: files["dev-article.md"],
      shorts: files["youtube-shorts.md"],
      showHn: files["show-hn.md"],
    },
  };
}

async function buildBaselineResponse(repoUrl, options) {
  if (typeof repoUrl !== "string" || repoUrl.trim().length === 0) {
    throw new TypeError("repoUrl is required");
  }
  const result = await fetchRepositoryBaseline(repoUrl, options);
  return {
    repository: {
      fullName: result.repository,
      url: result.repositoryUrl,
      visibility: "public",
    },
    baseline: {
      capturedAt: new Date().toISOString(),
      stars: result.stars,
      forks: result.forks,
      openIssues: result.openIssues,
    },
  };
}

async function serveStatic(request, response, route, webRoot) {
  try {
    const content = await readFile(join(route.root ?? webRoot, route.file));
    applySecurityHeaders(response);
    response.writeHead(200, { "Content-Type": route.type });
    if (request.method === "HEAD") response.end();
    else response.end(content);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendEmpty(response, 404);
      return;
    }
    throw error;
  }
}

export function createAppServer(options = {}) {
  const webRoot = resolve(options.webRoot ?? DEFAULT_WEB_ROOT);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const token = options.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const onError = options.onError ?? ((error) => console.error(error));

  return createNodeServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      if (requestUrl.pathname === "/api/generate") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        const payload = await readJsonBody(request);
        const result = await buildGenerationResponse(payload.repoUrl, {
          apiBase: options.apiBase,
          fetchImpl,
          token,
        });
        sendJson(response, 200, result);
        return;
      }

      if (requestUrl.pathname === "/api/baseline") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        const payload = await readJsonBody(request);
        const result = await buildBaselineResponse(payload.repoUrl, {
          apiBase: options.apiBase,
          fetchImpl,
          token,
        });
        sendJson(response, 200, result);
        return;
      }

      const route = STATIC_ROUTES.get(requestUrl.pathname);
      if (route && (request.method === "GET" || request.method === "HEAD")) {
        await serveStatic(request, response, route, webRoot);
        return;
      }
      if (route) {
        throw new HttpError(405, "METHOD_NOT_ALLOWED", "GET 요청만 지원합니다.", { Allow: "GET, HEAD" });
      }
      sendEmpty(response, 404);
    } catch (error) {
      const mapped = mapApplicationError(error);
      if (mapped.status === 500) onError(error);
      sendJson(response, mapped.status, {
        error: { code: mapped.code, message: mapped.message },
      }, mapped.headers);
    }
  });
}

function parsePort(value) {
  const port = Number(value ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError("PORT는 1~65535 사이의 정수여야 합니다.");
  }
  return port;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const host = process.env.HOST?.trim() || DEFAULT_HOST;
  const port = parsePort(process.env.PORT);
  const server = createAppServer();
  server.listen(port, host, () => {
    console.log(`Coreline Launch: http://${host}:${port}`);
    console.log("종료: Ctrl+C");
  });
}

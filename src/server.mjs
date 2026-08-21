#!/usr/bin/env node
import { createServer as createNodeServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildGenerationArtifacts, buildProjectSummary } from "./content.mjs";
import { fetchRepositoryBaseline, fetchRepositorySource, GitHubApiError } from "./github.mjs";
import { CliCodexTextRunner, CliGrokTextRunner, GrokProxyError, loadCodexRuntimeConfig, loadGrokRuntimeConfig } from "./grok-oauth-proxy.mjs";
import { CodexOAuthProxyRunner, loadCodexOAuthProxyConfig } from "./providers/codex-oauth-proxy.mjs";
import { PublishIntentError, createApprovalRevision, createPublishIntentStore } from "./publish-intent.mjs";
import { DryRunConnectorError } from "./platforms/connector.mjs";
import { buildConnectorDryRun, validateConnectorIntent } from "./platforms/registry.mjs";
import { DryRunEvidenceError, createDryRunEvidenceManifest } from "./dry-run-rehearsal.mjs";
import { preferredProvider } from "./completion.mjs";
import { composeDraft, reviewDraft, validateDraft } from "./composition.mjs";
import { TRANSLATE_MAX_BODY_BYTES, createDefaultTranslateQueue, translatePublishFields } from "./translation.mjs";
import {
  COMPOSE_RESPONSE_VERSION,
  READINESS_SCHEMA_VERSION,
  APPROVAL_REVISION_RESPONSE_SCHEMA_VERSION,
  PUBLISH_INTENT_RESPONSE_SCHEMA_VERSION,
  DRY_RUN_RESPONSE_SCHEMA_VERSION,
  assertV1ApprovalRevisionRequest,
  assertV1ComposeRequest,
  assertV1DryRunRequest,
  assertV1PublishIntentRequest,
  assertV1ReviewRequest,
  assertV1ValidateRequest,
  attachV1Meta,
  buildCapabilities,
  readRequestId,
  sanitizePublicReadiness,
  v1ErrorEnvelope,
} from "./api/v1/contract.mjs";

export const DEFAULT_HOST = "127.0.0.1";
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
  ["/drafts.mjs", { file: "drafts.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/locales.mjs", { file: "locales.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/channel-profiles.mjs", { file: "channel-profiles.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/channel-state.mjs", { file: "channel-state.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/platform-registry.mjs", { file: "platform-registry.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/platform-readiness.mjs", { file: "platform-readiness.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/publish-intent.mjs", { file: "publish-intent.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/request-fingerprint.mjs", { file: "request-fingerprint.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/runtime-security.mjs", { file: "runtime-security.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/threads-preview.mjs", { file: "threads-preview.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/workspace-migration.mjs", { file: "workspace-migration.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/dry-run-rehearsal.mjs", { file: "dry-run-rehearsal.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/automation-go-live.mjs", { file: "automation-go-live.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/platforms/connector.mjs", { file: "platforms/connector.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/platforms/threads.mjs", { file: "platforms/threads.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
  ["/platforms/registry.mjs", { file: "platforms/registry.mjs", type: "text/javascript; charset=utf-8", root: MODULE_DIRECTORY }],
]);

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function assertLoopbackHost(host = DEFAULT_HOST) {
  const normalized = String(host ?? "").trim().toLowerCase();
  if (!LOOPBACK_HOSTS.has(normalized)) {
    throw new HttpError(503, "LOOPBACK_ONLY", "로컬 API는 127.0.0.1, localhost 또는 ::1에서만 실행할 수 있습니다.");
  }
  return normalized;
}

function hostName(header = "") {
  const value = String(header).trim().toLowerCase();
  if (value.startsWith("[")) return value.slice(0, value.indexOf("]") + 1);
  return value.split(":", 1)[0];
}

function isLoopbackHostHeader(header) {
  return LOOPBACK_HOSTS.has(hostName(header));
}

function allowedOrigin(request) {
  const host = String(request.headers.host ?? "").toLowerCase();
  const origin = String(request.headers.origin ?? "").toLowerCase();
  return Boolean(host) && origin === `http://${host}` && isLoopbackHostHeader(host);
}

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

async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new HttpError(415, "UNSUPPORTED_CONTENT_TYPE", "Content-Type은 application/json이어야 합니다.");
  }

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "REQUEST_TOO_LARGE", maxBytes > MAX_BODY_BYTES ? "번역 요청 본문이 너무 큽니다." : "요청 본문은 8KB를 넘을 수 없습니다.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new HttpError(413, "REQUEST_TOO_LARGE", maxBytes > MAX_BODY_BYTES ? "번역 요청 본문이 너무 큽니다." : "요청 본문은 8KB를 넘을 수 없습니다.");
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
  if (error instanceof PublishIntentError || error instanceof DryRunConnectorError || error instanceof DryRunEvidenceError) {
    const mapped = new HttpError(error.status, error.code, error.message);
    mapped.retryable = error.retryable;
    return mapped;
  }
  if (error instanceof GrokProxyError) {
    return new HttpError(error.status, error.code, error.message);
  }
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
  const artifacts = buildGenerationArtifacts(summary);

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
    drafts: artifacts.drafts,
    documents: artifacts.documents,
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
  const bindHost = assertLoopbackHost(options.host ?? DEFAULT_HOST);
  const launchNonce = options.launchNonce ?? globalThis.crypto.randomUUID();
  const requestGuardsEnabled = options.requestGuards !== false;
  let lastProbeAt = 0;
  const webRoot = resolve(options.webRoot ?? DEFAULT_WEB_ROOT);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const token = options.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const onError = options.onError ?? ((error) => console.error(error));
  const grokConfig = options.grokConfig ?? loadGrokRuntimeConfig(options.env ?? process.env);
  const grokRunner = options.grokRunner ?? new CliGrokTextRunner(grokConfig);
  const codexProxyConfig = options.codexProxyConfig ?? loadCodexOAuthProxyConfig(options.env ?? process.env);
  const codexConfig = options.codexConfig ?? loadCodexRuntimeConfig(options.env ?? process.env);
  // OAuth credentials and CLI execution belong to the already logged-in
  // loopback Proxy. Direct CLI is retained only as the legacy disabled path.
  const codexRunner = options.codexRunner ?? (codexProxyConfig.enabled
    ? new CodexOAuthProxyRunner(codexProxyConfig, { fetchImpl })
    : new CliCodexTextRunner(codexConfig));
  const translateQueue = options.translateQueue ?? createDefaultTranslateQueue(options.env ?? process.env);
  const publishIntentStore = options.publishIntentStore ?? createPublishIntentStore();

  const server = createNodeServer(async (request, response) => {
    let requestId = "";
    let v1 = false;
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      v1 = requestUrl.pathname.startsWith("/api/v1/");
      requestId = readRequestId({}, request.headers);

      if (v1 && !isLoopbackHostHeader(request.headers.host)) {
        throw new HttpError(421, "INVALID_HOST", "loopback Host 헤더만 허용합니다.");
      }
      const requireProtectedV1Post = () => {
        if (!requestGuardsEnabled) return;
        if (!allowedOrigin(request)) throw new HttpError(403, "INVALID_ORIGIN", "동일 loopback origin 요청만 허용합니다.");
        if (request.headers["x-viral-nonce"] !== launchNonce) {
          throw new HttpError(403, "INVALID_NONCE", "로컬 API nonce가 일치하지 않습니다.");
        }
      };

      if (requestUrl.pathname === "/api/v1/capabilities") {
        if (request.method !== "GET") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "GET 요청만 지원합니다.", { Allow: "GET" });
        }
        const port = Number(String(request.headers.host ?? "").split(":").at(-1)) || DEFAULT_PORT;
        sendJson(response, 200, buildCapabilities(requestId, { host: bindHost, port, nonce: launchNonce }), { "X-Request-ID": requestId });
        return;
      }

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

      if (requestUrl.pathname === "/api/v1/providers/readiness") {
        if (request.method !== "GET") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "GET 요청만 지원합니다.", { Allow: "GET" });
        }
        const [grok, codex] = await Promise.all([
          grokRunner.readiness({ probeAuth: false }),
          codexRunner.readiness({ probeAuth: false }),
        ]);
        sendJson(response, 200, attachV1Meta({
          grok: sanitizePublicReadiness(grok, "grok"),
          codex: sanitizePublicReadiness(codex, "codex"),
        }, { schemaVersion: READINESS_SCHEMA_VERSION, requestId }), { "X-Request-ID": requestId });
        return;
      }

      if (requestUrl.pathname === "/api/v1/providers/probe") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        requireProtectedV1Post();
        await readJsonBody(request);
        if (Date.now() - lastProbeAt < 60_000) {
          throw new HttpError(429, "PROBE_RATE_LIMITED", "인증 확인은 1분에 한 번만 실행할 수 있습니다.", { "Retry-After": "60" });
        }
        lastProbeAt = Date.now();
        const probeAbort = new AbortController();
        request.once("close", () => { if (!response.headersSent) probeAbort.abort(); });
        const [grok, codex] = await translateQueue.run(async () => Promise.all([
          grokRunner.readiness({ probeAuth: true }),
          codexRunner.readiness({ probeAuth: true }),
        ]), { signal: probeAbort.signal, timeoutMs: 90_000 });
        sendJson(response, 200, attachV1Meta({
          grok: sanitizePublicReadiness(grok, "grok"),
          codex: sanitizePublicReadiness(codex, "codex"),
          probed: true,
        }, { schemaVersion: READINESS_SCHEMA_VERSION, requestId }), { "X-Request-ID": requestId });
        return;
      }

      if (requestUrl.pathname === "/api/translate") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        const payload = await readJsonBody(request, TRANSLATE_MAX_BODY_BYTES);
        const requested = payload?.provider === "auto" ? "auto" : payload?.provider === "codex" ? "codex" : "grok";
        const resolved = requested === "auto" ? (preferredProvider(payload.channel) ?? "grok") : requested;
        const runners = { grok: grokRunner, codex: codexRunner };
        const result = await translatePublishFields({ ...payload, provider: requested }, {
          runner: resolved === "codex" ? codexRunner : grokRunner,
          runners,
          queue: translateQueue,
        });
        sendJson(response, 200, result);
        return;
      }

      if (requestUrl.pathname === "/api/v1/drafts/compose") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        requireProtectedV1Post();
        const payload = assertV1ComposeRequest(await readJsonBody(request, TRANSLATE_MAX_BODY_BYTES));
        requestId = readRequestId(payload, request.headers);
        const abort = new AbortController();
        request.once("close", () => {
          if (!response.headersSent) abort.abort();
        });
        const result = await composeDraft({ ...payload, requestId }, {
          runners: { grok: grokRunner, codex: codexRunner },
          queue: translateQueue,
          signal: abort.signal,
          deadlineMs: 90_000,
        });
        sendJson(response, 200, attachV1Meta(result, {
          schemaVersion: result.schemaVersion ?? COMPOSE_RESPONSE_VERSION,
          requestId,
        }), { "X-Request-ID": requestId });
        return;
      }

      if (requestUrl.pathname === "/api/v1/drafts/review") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        requireProtectedV1Post();
        const payload = assertV1ReviewRequest(await readJsonBody(request, TRANSLATE_MAX_BODY_BYTES));
        requestId = readRequestId(payload, request.headers);
        const requested = payload?.provider === "auto" ? "auto" : payload?.provider === "codex" ? "codex" : "grok";
        const resolved = requested === "auto" ? (preferredProvider(payload.channel) ?? "grok") : requested;
        const abort = new AbortController();
        request.once("close", () => {
          if (!response.headersSent) abort.abort();
        });
        const result = await reviewDraft({ ...payload, provider: requested, requestId }, {
          runner: resolved === "codex" ? codexRunner : grokRunner,
          runners: { grok: grokRunner, codex: codexRunner },
          queue: translateQueue,
          signal: abort.signal,
          deadlineMs: 90_000,
        });
        sendJson(response, 200, attachV1Meta(result, {
          schemaVersion: result.schemaVersion ?? COMPOSE_RESPONSE_VERSION,
          requestId,
        }), { "X-Request-ID": requestId });
        return;
      }

      if (requestUrl.pathname === "/api/v1/drafts/validate") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        requireProtectedV1Post();
        const payload = assertV1ValidateRequest(await readJsonBody(request, TRANSLATE_MAX_BODY_BYTES));
        requestId = readRequestId(payload, request.headers);
        const result = validateDraft(payload);
        sendJson(response, 200, attachV1Meta(result, {
          schemaVersion: result.schemaVersion ?? COMPOSE_RESPONSE_VERSION,
          requestId,
        }), { "X-Request-ID": requestId });
        return;
      }

      if (requestUrl.pathname === "/api/v1/approval-revisions") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        requireProtectedV1Post();
        const payload = assertV1ApprovalRevisionRequest(await readJsonBody(request, TRANSLATE_MAX_BODY_BYTES));
        requestId = readRequestId(payload, request.headers);
        const approvalRevision = createApprovalRevision(payload);
        sendJson(response, 200, {
          schemaVersion: APPROVAL_REVISION_RESPONSE_SCHEMA_VERSION,
          requestId,
          approvalRevision,
        }, { "X-Request-ID": requestId });
        return;
      }

      if (requestUrl.pathname === "/api/v1/publish-intents") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        requireProtectedV1Post();
        const payload = assertV1PublishIntentRequest(await readJsonBody(request, TRANSLATE_MAX_BODY_BYTES));
        requestId = readRequestId(payload, request.headers);
        const publishIntent = publishIntentStore.create({ approvalRevision: payload.approvalRevision });
        sendJson(response, 200, {
          schemaVersion: PUBLISH_INTENT_RESPONSE_SCHEMA_VERSION,
          requestId,
          publishIntent,
        }, { "X-Request-ID": requestId });
        return;
      }

      if (requestUrl.pathname === "/api/v1/dry-runs") {
        if (request.method !== "POST") {
          throw new HttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 지원합니다.", { Allow: "POST" });
        }
        requireProtectedV1Post();
        const payload = assertV1DryRunRequest(await readJsonBody(request));
        requestId = readRequestId(payload, request.headers);
        // Validate before writing to the process-local duplicate store so a
        // broken readiness attestation cannot reserve a publication key.
        validateConnectorIntent({
          approvalRevision: payload.approvalRevision,
          readiness: payload.readiness,
          operationInputs: payload.operationInputs ?? {},
        });
        const publishIntent = publishIntentStore.create({
          approvalRevision: payload.approvalRevision,
          readiness: payload.readiness,
          operationInputs: payload.operationInputs ?? {},
        });
        const dryRun = buildConnectorDryRun({
          approvalRevision: payload.approvalRevision,
          readiness: payload.readiness,
          operationInputs: payload.operationInputs ?? {},
          publishIntent,
          credentialHandle: payload.credentialHandle,
          safety: payload.safety,
        });
        const evidenceManifest = createDryRunEvidenceManifest(dryRun);
        sendJson(response, 200, {
          schemaVersion: DRY_RUN_RESPONSE_SCHEMA_VERSION,
          requestId,
          publishIntent,
          dryRun,
          evidenceManifest,
        }, { "X-Request-ID": requestId });
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
      if (v1) {
        const envelope = v1ErrorEnvelope(requestId, mapped);
        const retryAfter = envelope.status === 429 || envelope.status === 503
          ? (mapped.headers?.["Retry-After"] ?? "30")
          : undefined;
        sendJson(response, envelope.status, envelope.body, {
          ...mapped.headers,
          "X-Request-ID": requestId,
          ...(retryAfter ? { "Retry-After": retryAfter } : {}),
        });
        return;
      }
      sendJson(response, mapped.status, {
        error: { code: mapped.code, message: mapped.message },
      }, mapped.headers);
    }
  });

  // Keep the exported factory loopback-only too. The CLI already passes a
  // checked host, but tests/embedding callers must not accidentally bind the
  // OAuth execution server to every interface through Node's default listen.
  const nodeListen = server.listen.bind(server);
  server.listen = function loopbackListen(port, hostOrCallback, callback) {
    const host = typeof hostOrCallback === "string" ? assertLoopbackHost(hostOrCallback) : bindHost;
    const listener = typeof hostOrCallback === "function" ? hostOrCallback : callback;
    return nodeListen(port, host, listener);
  };
  return server;
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
  const host = assertLoopbackHost(process.env.HOST?.trim() || DEFAULT_HOST);
  const port = parsePort(process.env.PORT);
  const server = createAppServer({ host });
  server.listen(port, host, () => {
    console.log(`Coreline Launch: http://${host}:${port}`);
    console.log("종료: Ctrl+C");
  });
}

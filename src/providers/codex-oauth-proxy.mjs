import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";

import { GrokProxyError } from "../grok-oauth-proxy.mjs";
import { providerOutputDlpIssues } from "../runtime-security.mjs";

const DEFAULT_BASE_URL = "http://127.0.0.1:4348";
const DEFAULT_CALLER_ID = "viral";
const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_OUTPUT_CHARS = 16_000;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function boundedInteger(env, name, fallback, minimum, maximum) {
  const raw = String(env[name] ?? "").trim();
  if (!raw) return fallback;
  if (!/^\d+$/u.test(raw)) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", `${name}은 정수여야 합니다.`, { status: 503 });
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", `${name} 범위가 올바르지 않습니다.`, { status: 503 });
  }
  return value;
}

function safeLoopbackBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", "Codex OAuth Proxy URL 형식이 올바르지 않습니다.", { status: 503 });
  }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname) || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", "Codex OAuth Proxy는 loopback HTTP base URL만 허용합니다.", { status: 503 });
  }
  return url.origin;
}

function secretFromFile(file) {
  if (!file || !isAbsolute(file) || !existsSync(file)) {
    throw new GrokProxyError("CODEX_PROXY_UNAVAILABLE", "Codex OAuth Proxy caller credential이 준비되지 않았습니다.", { status: 503 });
  }
  const mode = statSync(file).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", "Codex OAuth Proxy caller credential 파일 권한은 0600이어야 합니다.", { status: 503 });
  }
  const secret = readFileSync(file, "utf8").trim();
  if (secret.length < 24 || secret.length > 512) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", "Codex OAuth Proxy caller credential 형식이 올바르지 않습니다.", { status: 503 });
  }
  return secret;
}

function publicProxyError(status, code, fallback) {
  if (status === 401 || status === 403) {
    return new GrokProxyError("CODEX_PROXY_UNAUTHORIZED", "Codex OAuth Proxy caller 권한을 확인하세요.", { status: 503 });
  }
  if (status === 429) {
    return new GrokProxyError("CODEX_RATE_LIMITED", "Codex OAuth Proxy 대기열이 가득 찼습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }
  if (status >= 500) {
    return new GrokProxyError("CODEX_PROXY_UNAVAILABLE", "Codex OAuth Proxy를 사용할 수 없습니다.", { status: 503 });
  }
  return new GrokProxyError(code, fallback, { status: 502 });
}

function normalizeProxyText(value, requestId, maxOutputChars) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.text !== "string") {
    throw new GrokProxyError("CODEX_PROXY_INVALID_OUTPUT", "Codex OAuth Proxy 응답 형식이 올바르지 않습니다.", { status: 502 });
  }
  const text = value.text.trim();
  if (!text || text.length > maxOutputChars) {
    throw new GrokProxyError("CODEX_PROXY_INVALID_OUTPUT", "Codex OAuth Proxy 응답 길이가 올바르지 않습니다.", { status: 502 });
  }
  let payload;
  try {
    payload = JSON.parse(text.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, ""));
  } catch {
    throw new GrokProxyError("CODEX_PROXY_INVALID_OUTPUT", "Codex OAuth Proxy가 JSON 게시 필드를 반환하지 않았습니다.", { status: 502 });
  }
  if (providerOutputDlpIssues(payload).length > 0) {
    throw new GrokProxyError("SENSITIVE_PROVIDER_OUTPUT", "Provider 응답에 민감 정보가 포함되어 결과를 차단했습니다.", { status: 502 });
  }
  return { requestId: typeof value.requestId === "string" ? value.requestId : requestId, payload };
}

/**
 * Configuration belongs to this client only.  OAuth login, CLI execution,
 * queueing, and the upstream OAuth profile stay inside proxy-codex.
 */
export function loadCodexOAuthProxyConfig(env = process.env) {
  const baseUrlRaw = String(env.VIRAL_CODEX_PROXY_BASE_URL ?? "").trim();
  const secretFile = String(env.VIRAL_CODEX_PROXY_SECRET_FILE ?? "").trim();
  if (!baseUrlRaw && !secretFile) {
    return { enabled: false, securityStatus: "disabled", reason: "proxy_not_configured" };
  }
  if (!baseUrlRaw || !secretFile) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", "VIRAL_CODEX_PROXY_BASE_URL과 VIRAL_CODEX_PROXY_SECRET_FILE을 함께 설정하세요.", { status: 503 });
  }
  if (!isAbsolute(secretFile)) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", "VIRAL_CODEX_PROXY_SECRET_FILE은 절대 경로여야 합니다.", { status: 503 });
  }
  const callerId = String(env.VIRAL_CODEX_PROXY_CALLER_ID ?? DEFAULT_CALLER_ID).trim();
  if (!/^[a-z][a-z0-9-]{0,31}$/u.test(callerId)) {
    throw new GrokProxyError("CODEX_PROXY_CONFIG_INVALID", "VIRAL_CODEX_PROXY_CALLER_ID 형식이 올바르지 않습니다.", { status: 503 });
  }
  return {
    enabled: true,
    baseUrl: safeLoopbackBaseUrl(baseUrlRaw || DEFAULT_BASE_URL),
    secretFile,
    callerId,
    timeoutMs: boundedInteger(env, "VIRAL_CODEX_PROXY_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 5_000, 300_000),
    maxOutputChars: boundedInteger(env, "VIRAL_CODEX_PROXY_MAX_OUTPUT_CHARS", DEFAULT_MAX_OUTPUT_CHARS, 256, 32_000),
    securityStatus: "restricted",
  };
}

export class CodexOAuthProxyRunner {
  constructor(config, { fetchImpl = globalThis.fetch } = {}) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async readiness({ probeAuth = false } = {}) {
    if (!this.config?.enabled) {
      return { status: "unavailable", ready: false, version: "", securityStatus: "disabled", reason: "proxy_not_configured" };
    }
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/ready`, { signal: AbortSignal.timeout(5_000) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ready) {
        return { status: "unavailable", ready: false, version: "", securityStatus: "restricted", reason: "proxy_unavailable" };
      }
      secretFromFile(this.config.secretFile);
      // The proxy owns the signed-in OAuth session.  A real one-turn compose
      // remains the explicit authenticated test; readiness never spends a turn.
      return {
        status: "ready",
        ready: true,
        version: "proxy-codex",
        securityStatus: "restricted",
        ...(probeAuth ? { auth: "proxy_session_not_cost_probed" } : {}),
      };
    } catch {
      return { status: "unavailable", ready: false, version: "", securityStatus: "restricted", reason: "proxy_unavailable" };
    }
  }

  async run(request, signal = new AbortController().signal) {
    if (!this.config?.enabled) {
      throw new GrokProxyError("CODEX_PROXY_UNAVAILABLE", "Codex OAuth Proxy가 설정되지 않았습니다.", { status: 503 });
    }
    const secret = secretFromFile(this.config.secretFile);
    const timeout = AbortSignal.timeout(this.config.timeoutMs);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    timeout.addEventListener("abort", abort, { once: true });
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/internal/v1/codex/conversation`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret}`,
          "x-heybot-service-id": this.config.callerId,
        },
        body: JSON.stringify({
          requestId: request.requestId,
          capability: "conversation.respond.v1",
          input: {
            messages: [{
              role: "user",
              content: `${request.prompt}\n\nOUTPUT_SCHEMA=${JSON.stringify(request.schema)}`,
            }],
          },
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw publicProxyError(response.status, "CODEX_PROXY_INVALID_OUTPUT", "Codex OAuth Proxy 요청을 처리하지 못했습니다.");
      }
      return normalizeProxyText(body, request.requestId, this.config.maxOutputChars);
    } catch (error) {
      if (error instanceof GrokProxyError) throw error;
      if (controller.signal.aborted) {
        throw new GrokProxyError("CODEX_TIMEOUT", "Codex OAuth Proxy 요청이 취소되었거나 시간이 초과되었습니다.", { status: signal?.aborted ? 499 : 504 });
      }
      throw new GrokProxyError("CODEX_PROXY_UNAVAILABLE", "Codex OAuth Proxy 연결에 실패했습니다.", { status: 503 });
    } finally {
      signal?.removeEventListener("abort", abort);
      timeout.removeEventListener("abort", abort);
    }
  }
}

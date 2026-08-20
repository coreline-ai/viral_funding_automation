import { allCompletionProfiles, COMPOSE_REQUEST_VERSION, COMPOSE_RESPONSE_VERSION, COMPLETION_STATUSES } from "../../completion.mjs";
import { CHANNEL_KEYS } from "../../drafts.mjs";
import { SOURCE_LOCALE, SUPPORTED_LOCALES, TARGET_LOCALE } from "../../locales.mjs";
import { GrokProxyError } from "../../grok-oauth-proxy.mjs";

export const ERROR_SCHEMA_VERSION = "viral-error/v1";
export const CAPABILITIES_SCHEMA_VERSION = "viral-capabilities/v1";
export const READINESS_SCHEMA_VERSION = "viral-readiness/v1";
export const COMPOSE_CACHE_TTL_MS = 10 * 60 * 1000;
export const COMPOSE_CACHE_MAX_ENTRIES = 64;
export const V1_PROVIDERS = Object.freeze(["auto", "grok", "codex"]);

export const V1_ERROR_HTTP = Object.freeze({
  SOURCE_STALE: 409,
  QUEUE_FULL: 429,
  GROK_QUEUE_FULL: 429,
  REQUEST_CANCELLED: 499,
  PROVIDER_TIMEOUT: 504,
  GROK_TIMEOUT: 504,
  PROVIDER_RATE_LIMIT: 429,
  GROK_RATE_LIMITED: 429,
  CODEX_RATE_LIMITED: 429,
  LOGIN_REQUIRED: 401,
  GROK_LOGIN_REQUIRED: 401,
  CODEX_LOGIN_REQUIRED: 401,
  TRANSLATION_DISABLED: 400,
  INVALID_PROVIDER: 400,
  INVALID_CHANNEL: 400,
  INVALID_REQUEST: 400,
  UNKNOWN_FIELD: 400,
  UNSUPPORTED_CONTENT_TYPE: 415,
  REQUEST_TOO_LARGE: 413,
});

const COMPOSE_KEYS = Object.freeze([
  "schemaVersion", "requestId", "idempotencyKey", "channel", "provider",
  "sourceLocale", "targetLocale", "sourceHash", "facts", "sourceDraft",
  "authorInputs", "publishFields", "siblings",
]);
const REVIEW_KEYS = Object.freeze([
  "schemaVersion", "requestId", "channel", "provider", "sourceLocale",
  "targetLocale", "publishFields", "sourceDraft", "facts",
]);
const VALIDATE_KEYS = Object.freeze([
  "schemaVersion", "requestId", "channel", "sourceLocale", "targetLocale",
  "sourceHash", "facts", "sourceDraft", "publishFields", "authorInputs", "siblings",
]);

export function newRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function readRequestId(payload, headers = {}) {
  const fromBody = typeof payload?.requestId === "string" ? payload.requestId.trim() : "";
  const fromHeader = String(headers["x-request-id"] ?? "").trim();
  return fromBody || fromHeader || newRequestId();
}

export function rejectUnknownKeys(payload, allowed, label) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new GrokProxyError("INVALID_REQUEST", "요청 본문은 JSON 객체여야 합니다.");
  }
  const extra = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new GrokProxyError("UNKNOWN_FIELD", `${label}에 알 수 없는 필드가 있습니다: ${extra[0]}`);
  }
}

export function assertV1ComposeRequest(payload) {
  rejectUnknownKeys(payload, COMPOSE_KEYS, "compose");
  if (payload.schemaVersion && payload.schemaVersion !== COMPOSE_REQUEST_VERSION) {
    throw new GrokProxyError("INVALID_REQUEST", "지원하지 않는 compose schema입니다.");
  }
  if (payload.provider != null && !V1_PROVIDERS.includes(payload.provider)) {
    throw new GrokProxyError("INVALID_PROVIDER", "provider는 auto, grok, codex만 지원합니다.");
  }
  return payload;
}

export function assertV1ReviewRequest(payload) {
  rejectUnknownKeys(payload, REVIEW_KEYS, "review");
  if (payload.provider != null && !V1_PROVIDERS.includes(payload.provider)) {
    throw new GrokProxyError("INVALID_PROVIDER", "provider는 auto, grok, codex만 지원합니다.");
  }
  return payload;
}

export function assertV1ValidateRequest(payload) {
  rejectUnknownKeys(payload, VALIDATE_KEYS, "validate");
  return payload;
}

export function sanitizePublicReadiness(entry = {}, id) {
  const status = entry.status ?? (entry.ready ? "ready" : "unavailable");
  return {
    id,
    status,
    ready: Boolean(entry.ready),
    version: typeof entry.version === "string" ? entry.version.replace(/\/Users\/[^\s]+/g, "") : "",
  };
}

export function buildCapabilities(requestId) {
  return {
    schemaVersion: CAPABILITIES_SCHEMA_VERSION,
    requestId,
    sourceLocale: SOURCE_LOCALE,
    targetLocales: [TARGET_LOCALE],
    locales: [...SUPPORTED_LOCALES],
    providers: [...V1_PROVIDERS],
    statuses: [...COMPLETION_STATUSES],
    channels: CHANNEL_KEYS,
    profiles: allCompletionProfiles(),
    bind: { host: "127.0.0.1", defaultPort: 4310, loopbackOnly: true },
    cors: "disabled",
    followUp: {
      tls: false,
      pairing: false,
      externalDevices: false,
      note: "외부 기기 접속은 TLS·pairing·device auth 전용 후속 계획이 필요합니다.",
    },
  };
}

export function normalizeV1Error(error) {
  const status = Number(error?.status) || 500;
  let code = String(error?.code ?? "INTERNAL_ERROR");
  if (status === 499 || /취소/.test(error?.message ?? "")) code = "REQUEST_CANCELLED";
  else if (code === "GROK_TIMEOUT" || code === "CODEX_TIMEOUT") code = "PROVIDER_TIMEOUT";
  else if (code === "GROK_QUEUE_FULL") code = status === 503 ? "QUEUE_UNAVAILABLE" : "QUEUE_FULL";
  else if (code === "GROK_RATE_LIMITED" || code === "CODEX_RATE_LIMITED") code = "PROVIDER_RATE_LIMIT";
  else if (code === "GROK_LOGIN_REQUIRED" || code === "CODEX_LOGIN_REQUIRED") code = "LOGIN_REQUIRED";
  const mappedStatus = V1_ERROR_HTTP[code] ?? V1_ERROR_HTTP[error?.code] ?? status;
  return {
    status: mappedStatus,
    code,
    message: error?.message || "요청을 처리하지 못했습니다.",
  };
}

export function v1ErrorEnvelope(requestId, error) {
  const mapped = normalizeV1Error(error);
  return {
    status: mapped.status,
    body: {
      schemaVersion: ERROR_SCHEMA_VERSION,
      requestId,
      error: { code: mapped.code, message: mapped.message },
    },
  };
}

export function attachV1Meta(payload, { schemaVersion, requestId }) {
  return {
    ...payload,
    schemaVersion: payload.schemaVersion || schemaVersion,
    requestId: payload.requestId || requestId,
  };
}

export const COMPOSE_EXAMPLE = Object.freeze({
  schemaVersion: COMPOSE_REQUEST_VERSION,
  requestId: "req_example_compose",
  idempotencyKey: "idem_example_x1",
  channel: "x1",
  provider: "auto",
  sourceLocale: SOURCE_LOCALE,
  targetLocale: TARGET_LOCALE,
  sourceHash: "c0ffee00",
  facts: {
    name: "AI Systems Atlas",
    repositoryUrl: "https://github.com/coreline-ai/memory_node_graph",
    demoUrl: "https://ai-systems-atlas.vercel.app/",
    license: "MIT",
    technologies: ["TypeScript"],
  },
  sourceDraft: { publishFields: { body: "AI Systems Atlas https://ai-systems-atlas.vercel.app/" } },
  publishFields: { body: "AI Systems Atlas https://ai-systems-atlas.vercel.app/" },
  authorInputs: {},
});

export { COMPOSE_REQUEST_VERSION, COMPOSE_RESPONSE_VERSION };

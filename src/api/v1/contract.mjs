import { allCompletionProfiles, COMPOSE_REQUEST_VERSION, COMPOSE_RESPONSE_VERSION, COMPLETION_STATUSES } from "../../completion.mjs";
import { CHANNEL_KEYS } from "../../drafts.mjs";
import { SOURCE_LOCALE, SUPPORTED_LOCALES, TARGET_LOCALE } from "../../locales.mjs";
import { GrokProxyError } from "../../grok-oauth-proxy.mjs";
import { providerOutputDlpIssues } from "../../runtime-security.mjs";
import { compositionRequestFingerprint } from "../../request-fingerprint.mjs";
import { automationGoLiveCapability } from "../../automation-go-live.mjs";

export const ERROR_SCHEMA_VERSION = "viral-error/v1";
export const CAPABILITIES_SCHEMA_VERSION = "viral-capabilities/v1";
export const READINESS_SCHEMA_VERSION = "viral-readiness/v1";
export const APPROVAL_REVISION_REQUEST_SCHEMA_VERSION = "viral-approval-revision-request/v1";
export const APPROVAL_REVISION_RESPONSE_SCHEMA_VERSION = "viral-approval-revision-response/v1";
export const PUBLISH_INTENT_REQUEST_SCHEMA_VERSION = "viral-publish-intent-request/v1";
export const PUBLISH_INTENT_RESPONSE_SCHEMA_VERSION = "viral-publish-intent-response/v1";
export const DRY_RUN_REQUEST_SCHEMA_VERSION = "viral-dry-run-request/v1";
export const DRY_RUN_RESPONSE_SCHEMA_VERSION = "viral-dry-run-response/v1";
export const COMPOSE_CACHE_TTL_MS = 10 * 60 * 1000;
export const COMPOSE_CACHE_MAX_ENTRIES = 64;
export const V1_PROVIDERS = Object.freeze(["auto", "grok", "codex"]);

export const V1_ERROR_HTTP = Object.freeze({
  SOURCE_STALE: 409,
  REQUEST_FINGERPRINT_MISMATCH: 409,
  IDEMPOTENCY_CONFLICT: 409,
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
  CODEX_PROXY_CONFIG_INVALID: 503,
  CODEX_PROXY_UNAUTHORIZED: 503,
  CODEX_PROXY_UNAVAILABLE: 503,
  CODEX_PROXY_INVALID_OUTPUT: 502,
  PROVIDER_SECURITY_DISABLED: 503,
  SENSITIVE_PROVIDER_OUTPUT: 502,
  TRANSLATION_DISABLED: 400,
  INVALID_PROVIDER: 400,
  INVALID_CHANNEL: 400,
  INVALID_REQUEST: 400,
  INVALID_JSON: 400,
  INVALID_FIELDS: 400,
  INVALID_AUTHOR_INPUT: 400,
  INVALID_OPERATION_INPUT: 400,
  INTERNAL_NOT_ALLOWED: 400,
  LOCK_TERM_MISMATCH: 502,
  GROK_INVALID_OUTPUT: 502,
  CODEX_INVALID_OUTPUT: 502,
  GROK_CLI_NOT_FOUND: 503,
  CODEX_CLI_NOT_FOUND: 503,
  PROBE_RATE_LIMITED: 429,
  INVALID_ORIGIN: 403,
  INVALID_HOST: 421,
  INVALID_NONCE: 403,
  UNKNOWN_FIELD: 400,
  UNSUPPORTED_CONTENT_TYPE: 415,
  REQUEST_TOO_LARGE: 413,
  INVALID_APPROVAL_INPUT: 400,
  APPROVAL_NOT_READY: 400,
  LOCALE_REVIEW_REQUIRED: 400,
  INVALID_ASSET_HASH: 400,
  INVALID_ACCOUNT_TARGET: 400,
  INVALID_APPROVAL_REVISION: 400,
  INVALID_PUBLISH_INTENT: 400,
  MANUAL_ONLY_PLATFORM: 400,
  SENSITIVE_APPROVAL_INPUT: 400,
  UNSUPPORTED_LOCALE: 400,
  DUPLICATE_PUBLISH_INTENT: 409,
  DRY_RUN_UNSUPPORTED_CHANNEL: 400,
  CONNECTOR_PLATFORM_MISMATCH: 400,
  PUBLISH_INTENT_NOT_READY: 409,
  STALE_APPROVAL: 409,
  STALE_ACCOUNT: 409,
  STALE_ASSET: 409,
  POLICY_REVERIFY_REQUIRED: 409,
  SENSITIVE_READINESS_INPUT: 400,
  THREADS_TEXT_REQUIRED: 400,
  X_TEXT_REQUIRED: 400,
  LINKEDIN_TEXT_REQUIRED: 400,
  LINKEDIN_ACCOUNT_TYPE: 400,
  INVALID_DRY_RUN_TIME: 400,
  INVALID_CREDENTIAL_HANDLE: 400,
  CREDENTIAL_HANDLE_REQUIRED: 400,
  SENSITIVE_CREDENTIAL_HANDLE: 400,
  INVALID_DRY_RUN_SAFETY: 400,
  DRY_RUN_KILL_SWITCH_REQUIRED: 409,
  UNSAFE_DRY_RUN_RECEIPT: 500,
  SENSITIVE_DRY_RUN_EVIDENCE: 500,
});

const COMPOSE_KEYS = Object.freeze([
  "schemaVersion", "requestId", "idempotencyKey", "channel", "provider",
  "sourceLocale", "targetLocale", "sourceHash", "requestFingerprint", "facts", "sourceDraft",
  "authorInputs", "operationInputs", "campaignBrief", "approvalStatus", "publishFields", "siblings",
]);
const REVIEW_KEYS = Object.freeze([
  "schemaVersion", "requestId", "channel", "provider", "sourceLocale",
  "targetLocale", "publishFields", "sourceDraft", "facts",
]);
const VALIDATE_KEYS = Object.freeze([
  "schemaVersion", "requestId", "channel", "sourceLocale", "targetLocale",
  "sourceHash", "requestFingerprint", "provider", "facts", "sourceDraft", "publishFields", "authorInputs", "operationInputs", "campaignBrief", "approvalStatus", "siblings",
]);
const APPROVAL_REVISION_KEYS = Object.freeze([
  "schemaVersion", "requestId", "channel", "targetLocale", "publishFields", "sourcePublishFields",
  "facts", "authorInputs", "operationInputs", "campaignBrief", "assetHash", "accountTarget",
  "approvedBy", "localeReviewed",
]);
const PUBLISH_INTENT_KEYS = Object.freeze(["schemaVersion", "requestId", "approvalRevision"]);
const DRY_RUN_KEYS = Object.freeze([
  "schemaVersion", "requestId", "approvalRevision", "readiness", "operationInputs", "credentialHandle", "safety",
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

function requireFields(payload, required, label) {
  const missing = required.find((key) => !(key in payload));
  if (missing) throw new GrokProxyError("INVALID_REQUEST", `${label}에 필수 필드가 없습니다: ${missing}`);
}

export function assertV1ApprovalRevisionRequest(payload) {
  rejectUnknownKeys(payload, APPROVAL_REVISION_KEYS, "approval revision");
  requireFields(payload, ["schemaVersion", "requestId", "channel", "targetLocale", "publishFields", "sourcePublishFields", "facts", "authorInputs", "operationInputs", "campaignBrief", "approvedBy", "localeReviewed"], "approval revision");
  if (payload.schemaVersion !== APPROVAL_REVISION_REQUEST_SCHEMA_VERSION) {
    throw new GrokProxyError("INVALID_REQUEST", "지원하지 않는 approval revision schema입니다.");
  }
  return payload;
}

export function assertV1PublishIntentRequest(payload) {
  rejectUnknownKeys(payload, PUBLISH_INTENT_KEYS, "publish intent");
  requireFields(payload, ["schemaVersion", "requestId", "approvalRevision"], "publish intent");
  if (payload.schemaVersion !== PUBLISH_INTENT_REQUEST_SCHEMA_VERSION) {
    throw new GrokProxyError("INVALID_REQUEST", "지원하지 않는 publish intent schema입니다.");
  }
  return payload;
}

/** Validates the local-only connector request shape. It never accepts a token. */
export function assertV1DryRunRequest(payload) {
  rejectUnknownKeys(payload, DRY_RUN_KEYS, "dry run");
  requireFields(payload, ["schemaVersion", "requestId", "approvalRevision", "readiness"], "dry run");
  if (payload.schemaVersion !== DRY_RUN_REQUEST_SCHEMA_VERSION) {
    throw new GrokProxyError("INVALID_REQUEST", "지원하지 않는 dry-run schema입니다.");
  }
  if (!payload.readiness || typeof payload.readiness !== "object" || Array.isArray(payload.readiness)) {
    throw new GrokProxyError("INVALID_REQUEST", "dry-run readiness는 JSON 객체여야 합니다.");
  }
  if (payload.operationInputs != null && (typeof payload.operationInputs !== "object" || Array.isArray(payload.operationInputs))) {
    throw new GrokProxyError("INVALID_REQUEST", "operationInputs는 JSON 객체여야 합니다.");
  }
  if (!("credentialHandle" in payload) || payload.credentialHandle === "") {
    throw new GrokProxyError("CREDENTIAL_HANDLE_REQUIRED", "비밀값이 아닌 외부 vault credential reference가 필요합니다.");
  }
  if (typeof payload.credentialHandle !== "string" || !/^[A-Za-z0-9._:-]{8,160}$/u.test(payload.credentialHandle)) {
    throw new GrokProxyError("INVALID_CREDENTIAL_HANDLE", "credentialHandle은 opaque 식별자만 허용합니다.");
  }
  if (providerOutputDlpIssues({ credentialHandle: payload.credentialHandle }).length > 0) {
    throw new GrokProxyError("SENSITIVE_CREDENTIAL_HANDLE", "credentialHandle에 token·secret·개인 경로를 넣을 수 없습니다.");
  }
  if (!("safety" in payload)) {
    throw new GrokProxyError("DRY_RUN_KILL_SWITCH_REQUIRED", "실제 게시 잠금(kill switch)을 확인해야 합니다.");
  }
  if (!payload.safety || payload.safety.schemaVersion !== "viral-dry-run-safety/v1" || payload.safety.execution !== "dry_run") {
    throw new GrokProxyError("INVALID_DRY_RUN_SAFETY", "dry-run safety 계약이 올바르지 않습니다.");
  }
  if (payload.safety.userKillSwitch !== "live_write_locked" || payload.safety.liveWriteLocked !== true) {
    throw new GrokProxyError("DRY_RUN_KILL_SWITCH_REQUIRED", "실제 게시 잠금(kill switch)을 유지해야 합니다.");
  }
  return payload;
}

export function sanitizePublicReadiness(entry = {}, id) {
  const status = entry.status ?? (entry.ready ? "ready" : "unavailable");
  const rawVersion = typeof entry.version === "string" ? entry.version : "";
  const version = providerOutputDlpIssues({ value: rawVersion }).length > 0
    ? ""
    : rawVersion.replace(/\/Users\/[^\s]+/g, "").slice(0, 160);
  const securityStatus = ["restricted", "experimental", "disabled"].includes(entry.securityStatus)
    ? entry.securityStatus
    : "";
  return {
    id,
    status,
    ready: Boolean(entry.ready),
    version,
    ...(securityStatus ? { securityStatus } : {}),
    ...(entry.reason === "security_unverified" ? { reason: "security_unverified" } : {}),
  };
}

export function buildCapabilities(requestId, { host = "127.0.0.1", port = 4310, nonce = "" } = {}) {
  return {
    schemaVersion: CAPABILITIES_SCHEMA_VERSION,
    requestId,
    sourceLocale: SOURCE_LOCALE,
    targetLocales: [...new Set(Object.values(allCompletionProfiles()).flatMap((profile) => profile.supportedLocales ?? [TARGET_LOCALE]))],
    locales: [...SUPPORTED_LOCALES],
    providers: [...V1_PROVIDERS],
    statuses: [...COMPLETION_STATUSES],
    channels: CHANNEL_KEYS,
    profiles: allCompletionProfiles(),
    bind: { host, defaultPort: port, loopbackOnly: true },
    cors: "disabled",
    nonce,
    idempotency: {
      scope: "process_local",
      ttlMs: COMPOSE_CACHE_TTL_MS,
      restartBehavior: "cleared_on_process_restart",
    },
    publishIntents: {
      scope: "process_local",
      actualNetworkWrite: false,
      restartBehavior: "cleared_on_process_restart",
    },
    dryRunConnectors: {
      scope: "loopback_local_only",
      platforms: ["threads", "x", "linkedin"],
      actualNetworkWrite: false,
      credentialResolution: "not_configured",
      userKillSwitch: "live_write_locked",
    },
    socialAutomation: automationGoLiveCapability(),
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
  const retryable = typeof error?.retryable === "boolean"
    ? error.retryable
    : [429, 503, 504].includes(mappedStatus);
  return {
    status: mappedStatus,
    code,
    message: error?.message || "요청을 처리하지 못했습니다.",
    retryable,
  };
}

export function v1ErrorEnvelope(requestId, error) {
  const mapped = normalizeV1Error(error);
  return {
    status: mapped.status,
    body: {
      schemaVersion: ERROR_SCHEMA_VERSION,
      requestId,
      error: { code: mapped.code, message: mapped.message, retryable: mapped.retryable },
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

const composeExample = {
  schemaVersion: COMPOSE_REQUEST_VERSION,
  requestId: "req_example_compose",
  idempotencyKey: "idem_example_x1",
  channel: "x1",
  provider: "auto",
  sourceLocale: SOURCE_LOCALE,
  targetLocale: TARGET_LOCALE,
  sourceHash: "c0ffee00",
  campaignBrief: {
    publisherRole: "curator",
    accountVoice: "personal",
    ownershipConfirmed: false,
    goal: "first-use feedback",
    audience: "developers",
    targetLocale: TARGET_LOCALE,
  },
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
};
composeExample.requestFingerprint = compositionRequestFingerprint({
  channel: composeExample.channel,
  provider: "grok",
  sourceLocale: composeExample.sourceLocale,
  targetLocale: composeExample.targetLocale,
  publishFields: composeExample.publishFields,
  facts: { ...composeExample.facts, features: [], description: "" },
  authorInputs: composeExample.authorInputs,
  operationInputs: {},
  campaignBrief: composeExample.campaignBrief,
});
export const COMPOSE_EXAMPLE = Object.freeze(composeExample);

export { COMPOSE_REQUEST_VERSION, COMPOSE_RESPONSE_VERSION };

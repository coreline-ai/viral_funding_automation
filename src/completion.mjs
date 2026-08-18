import { CHANNEL_KEYS, channelSpec, fieldContract, isChannelKey, matchesFieldContract } from "./drafts.mjs";
import {
  channelProfile,
  preferredProvider,
  requiredAuthorInputs,
} from "./channel-profiles.mjs";
import { GrokProxyError, TRANSLATION_PROVIDERS, normalizeTranslationProvider } from "./grok-oauth-proxy.mjs";

export { preferredProvider, requiredAuthorInputs } from "./channel-profiles.mjs";

export const COMPLETION_STATUSES = Object.freeze(["ready", "needs_review", "needs_input", "manual_only"]);
export const COMPOSE_REQUEST_VERSION = "viral-compose-request/v1";
export const COMPOSE_RESPONSE_VERSION = "viral-compose-response/v1";

export function completionProfile(channel) {
  const spec = channelSpec(channel);
  const profile = channelProfile(channel);
  if (!spec || !profile) return null;
  return {
    channel,
    fields: spec.fields,
    translationPolicy: spec.translationPolicy,
    preferredProvider: preferredProvider(channel),
    requiredAuthorInputs: requiredAuthorInputs(channel),
    lengthRules: profile.lengthRules,
    locale: profile.locale,
    aiPolicy: profile.aiPolicy,
  };
}

export function mapCompletionStatus(channel, { authorInputs = {}, validationOk = false } = {}) {
  const spec = channelSpec(channel);
  if (!spec || spec.translationPolicy === "disabled" || channel === "showHn") return "manual_only";
  const missing = requiredAuthorInputs(channel).filter((key) => !String(authorInputs[key] ?? "").trim());
  if (missing.length > 0 || spec.translationPolicy === "draftOnly") return "needs_input";
  if (!validationOk || spec.status === "hold") return "needs_review";
  return "ready";
}

export function resolveComposeProvider(channel, requested = "auto") {
  if (channel === "showHn" || channelSpec(channel)?.translationPolicy === "disabled") {
    throw new GrokProxyError("TRANSLATION_DISABLED", "이 채널은 영문 재구성을 할 수 없습니다.");
  }
  if (requested === "auto") return preferredProvider(channel);
  return normalizeTranslationProvider(requested);
}

export function validateAuthorInputs(channel, authorInputs = {}) {
  if (authorInputs && (typeof authorInputs !== "object" || Array.isArray(authorInputs))) {
    throw new GrokProxyError("INVALID_AUTHOR_INPUT", "작성자 입력은 객체여야 합니다.");
  }
  const allowed = new Set(requiredAuthorInputs(channel));
  for (const key of Object.keys(authorInputs ?? {})) {
    if (!allowed.has(key)) throw new GrokProxyError("INVALID_AUTHOR_INPUT", `알 수 없는 작성자 입력입니다: ${key}`);
  }
  return { ...(authorInputs ?? {}) };
}

export function validateComposeRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new GrokProxyError("INVALID_REQUEST", "요청 본문은 JSON 객체여야 합니다.");
  }
  if (payload.schemaVersion && payload.schemaVersion !== COMPOSE_REQUEST_VERSION) {
    throw new GrokProxyError("INVALID_REQUEST", "지원하지 않는 compose schema입니다.");
  }
  if (!isChannelKey(payload.channel)) throw new GrokProxyError("INVALID_CHANNEL", "지원하지 않는 채널입니다.");
  if (payload.status != null && !COMPLETION_STATUSES.includes(payload.status)) {
    throw new GrokProxyError("INVALID_REQUEST", "알 수 없는 완성 상태입니다.");
  }
  const authorInputs = validateAuthorInputs(payload.channel, payload.authorInputs);
  const provider = resolveComposeProvider(payload.channel, payload.provider ?? "auto");
  if (payload.sourceDraft?.publishFields && !matchesFieldContract(payload.channel, payload.sourceDraft.publishFields)) {
    throw new GrokProxyError("INVALID_FIELDS", "sourceDraft.publishFields가 채널 계약과 다릅니다.");
  }
  return {
    schemaVersion: COMPOSE_REQUEST_VERSION,
    channel: payload.channel,
    provider,
    sourceLocale: payload.sourceLocale ?? "ko-KR",
    targetLocale: payload.targetLocale ?? "en-US",
    sourceHash: payload.sourceHash ?? "",
    authorInputs,
    status: mapCompletionStatus(payload.channel, {
      authorInputs,
      validationOk: Boolean(payload.validationOk),
    }),
  };
}

export function sanitizeProviderResult(channel, payloadOut = {}) {
  const blocked = ["status", "translationPolicy", "internal", "sourceHash"];
  for (const key of blocked) {
    if (key in payloadOut) throw new GrokProxyError("GROK_INVALID_OUTPUT", "정책 상태는 변경할 수 없습니다.", { status: 502 });
  }
  if (payloadOut.publishFields && !matchesFieldContract(channel, payloadOut.publishFields)) {
    throw new GrokProxyError("GROK_INVALID_OUTPUT", `게시 필드는 ${fieldContract(channel).join(", ")} 형식이어야 합니다.`, { status: 502 });
  }
  return {
    publishFields: payloadOut.publishFields,
    summary: payloadOut.englishSummary ?? payloadOut.summary,
  };
}

export function sanitizeReviewResult(payloadOut = {}) {
  if (payloadOut.publishFields) {
    throw new GrokProxyError("GROK_INVALID_OUTPUT", "검토 결과는 게시 필드를 바꿀 수 없습니다.", { status: 502 });
  }
  return {
    issues: Array.isArray(payloadOut.issues) ? payloadOut.issues : [],
    suggestions: Array.isArray(payloadOut.suggestions) ? payloadOut.suggestions : [],
  };
}

export function allCompletionProfiles() {
  return Object.fromEntries(CHANNEL_KEYS.map((channel) => [channel, completionProfile(channel)]));
}

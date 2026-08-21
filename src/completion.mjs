import { CHANNEL_KEYS, channelSpec, fieldContract, isChannelKey, matchesFieldContract } from "./drafts.mjs";
import {
  channelProfile,
  authorInputDefs,
  campaignBriefIssues,
  defaultLocale,
  normalizeCampaignBrief,
  preferredProvider,
  requiredAuthorInputs,
  supportMode,
  supportedLocales,
  validateTypedInputs,
} from "./channel-profiles.mjs";
import { CONTENT_STATUSES, assessChannelState } from "./channel-state.mjs";
import { GrokProxyError, TRANSLATION_PROVIDERS, normalizeTranslationProvider } from "./grok-oauth-proxy.mjs";
import { providerOutputDlpIssues } from "./runtime-security.mjs";

export { preferredProvider, requiredAuthorInputs } from "./channel-profiles.mjs";

// Legacy `status` remains readable during migration, but all new responses use
// contentStatus + operationsStatus + approvalStatus.
export const COMPLETION_STATUSES = CONTENT_STATUSES;
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
    locale: profile.defaultLocale,
    defaultLocale: profile.defaultLocale,
    supportedLocales: profile.supportedLocales,
    supportMode: profile.supportMode,
    aiPolicy: profile.aiPolicy,
  };
}

export function mapCompletionStatus(channel, options = {}) {
  return assessChannelState({ channel, ...options }).contentStatus;
}

export function resolveComposeProvider(channel, requested = "auto") {
  if (supportMode(channel) === "manual_only" || channelSpec(channel)?.translationPolicy === "disabled") {
    throw new GrokProxyError("TRANSLATION_DISABLED", "이 채널은 영문 재구성을 할 수 없습니다.");
  }
  if (requested === "auto") return preferredProvider(channel);
  return normalizeTranslationProvider(requested);
}

export function validateAuthorInputs(channel, authorInputs = {}) {
  if (authorInputs && (typeof authorInputs !== "object" || Array.isArray(authorInputs))) {
    throw new GrokProxyError("INVALID_AUTHOR_INPUT", "작성자 입력은 객체여야 합니다.");
  }
  const issues = validateTypedInputs(channel, authorInputs, { scope: "all" });
  const unknown = issues.find((issue) => issue.code === "UNKNOWN_INPUT" || issue.code === "INVALID_INPUT_OBJECT");
  if (unknown) throw new GrokProxyError("INVALID_AUTHOR_INPUT", unknown.message);
  return { ...(authorInputs ?? {}) };
}

export function validateOperationInputs(channel, operationInputs = {}) {
  if (operationInputs && (typeof operationInputs !== "object" || Array.isArray(operationInputs))) {
    throw new GrokProxyError("INVALID_OPERATION_INPUT", "운영 입력은 객체여야 합니다.");
  }
  const issues = validateTypedInputs(channel, operationInputs, { scope: "operations" });
  const unknown = issues.find((issue) => issue.code === "UNKNOWN_INPUT" || issue.code === "INVALID_INPUT_OBJECT");
  const gateKeys = new Set((channelProfile(channel)?.prepublishGates ?? []).map((gate) => gate.key));
  const extra = Object.keys(operationInputs ?? {}).find((key) => !gateKeys.has(key) && !authorInputDefs(channel).some((def) => def.key === key));
  if (unknown && extra) throw new GrokProxyError("INVALID_OPERATION_INPUT", unknown.message);
  return { ...(operationInputs ?? {}) };
}

export function validateComposeRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new GrokProxyError("INVALID_REQUEST", "요청 본문은 JSON 객체여야 합니다.");
  }
  if (payload.schemaVersion && payload.schemaVersion !== COMPOSE_REQUEST_VERSION) {
    throw new GrokProxyError("INVALID_REQUEST", "지원하지 않는 compose schema입니다.");
  }
  if (!isChannelKey(payload.channel)) throw new GrokProxyError("INVALID_CHANNEL", "지원하지 않는 채널입니다.");
  const authorInputs = validateAuthorInputs(payload.channel, payload.authorInputs);
  const operationInputs = validateOperationInputs(payload.channel, payload.operationInputs);
  const profile = channelProfile(payload.channel);
  const targetLocale = payload.targetLocale ?? profile?.defaultLocale ?? defaultLocale(payload.channel);
  if (!supportedLocales(payload.channel).includes(targetLocale)) {
    throw new GrokProxyError("UNSUPPORTED_LOCALE", "이 채널에서 지원하지 않는 게시 언어입니다.");
  }
  const campaignBrief = normalizeCampaignBrief(payload.campaignBrief, { channel: payload.channel, targetLocale });
  const provider = supportMode(payload.channel) === "reference_only"
    ? null
    : resolveComposeProvider(payload.channel, payload.provider ?? "auto");
  if (payload.sourceDraft?.publishFields && !matchesFieldContract(payload.channel, payload.sourceDraft.publishFields)) {
    throw new GrokProxyError("INVALID_FIELDS", "sourceDraft.publishFields가 채널 계약과 다릅니다.");
  }
  return {
    schemaVersion: COMPOSE_REQUEST_VERSION,
    channel: payload.channel,
    provider,
    sourceLocale: payload.sourceLocale ?? "ko-KR",
    targetLocale,
    sourceHash: payload.sourceHash ?? "",
    authorInputs,
    operationInputs,
    campaignBrief,
    contentStatus: mapCompletionStatus(payload.channel, {
      authorInputs,
      operationInputs,
      campaignBrief,
      validationOk: Boolean(payload.validationOk),
    }),
  };
}

export function sanitizeProviderResult(channel, payloadOut = {}) {
  const dlpIssue = providerOutputDlpIssues(payloadOut)[0];
  if (dlpIssue) {
    throw new GrokProxyError("SENSITIVE_PROVIDER_OUTPUT", "Provider 응답에 민감 정보가 포함되어 결과를 차단했습니다.", { status: 502 });
  }
  const blocked = ["status", "contentStatus", "operationsStatus", "approvalStatus", "supportMode", "translationPolicy", "internal", "sourceHash"];
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
  const dlpIssue = providerOutputDlpIssues(payloadOut)[0];
  if (dlpIssue) {
    throw new GrokProxyError("SENSITIVE_PROVIDER_OUTPUT", "Provider 검토 응답에 민감 정보가 포함되어 결과를 차단했습니다.", { status: 502 });
  }
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

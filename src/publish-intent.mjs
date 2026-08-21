import { assessChannelState } from "./channel-state.mjs";
import { supportedLocales, supportMode } from "./channel-profiles.mjs";
import { CHANNEL_KEYS, serializePublish, validatePublish } from "./drafts.mjs";
import { channelAutomationPolicy, platformForChannel } from "./platform-registry.mjs";
import { assessPlatformReadiness } from "./platform-readiness.mjs";
import { canonicalJson, sha256Hex } from "./request-fingerprint.mjs";
import { providerOutputDlpIssues } from "./runtime-security.mjs";

// These records describe a possible future publication only. They deliberately
// do not contain an OAuth credential or any method that can call a platform.
export const APPROVAL_REVISION_SCHEMA_VERSION = "viral-approval-revision/v1";
export const PUBLISH_INTENT_SCHEMA_VERSION = "viral-publish-intent/v1";
export const PUBLISH_INTENT_STATUSES = Object.freeze([
  "draft",
  "ready_for_dry_run",
  "blocked",
  "expired",
]);

const FORBIDDEN_INPUT_KEY = /(?:access|refresh)?[_-]?(?:token|secret)|password|authorization|private[_-]?key/iu;

export class PublishIntentError extends Error {
  constructor(code, message, { status = 400 } = {}) {
    super(message);
    this.name = "PublishIntentError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function clone(value) {
  return JSON.parse(canonicalJson(value ?? {}));
}

function nonEmptyString(value, name, { minLength = 1 } = {}) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < minLength) {
    throw new PublishIntentError("INVALID_APPROVAL_INPUT", `${name} 입력이 필요합니다.`);
  }
  return text;
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, item]) => FORBIDDEN_INPUT_KEY.test(key) || hasForbiddenKey(item));
}

function assertNoCredentialMaterial(value) {
  if (hasForbiddenKey(value) || providerOutputDlpIssues(value).length > 0) {
    throw new PublishIntentError("SENSITIVE_APPROVAL_INPUT", "승인 snapshot에는 token·secret·비밀번호·개인 경로를 넣을 수 없습니다.");
  }
}

function normalizeNullableHash(value) {
  if (value == null || value === "") return null;
  const hash = String(value).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(hash)) {
    throw new PublishIntentError("INVALID_ASSET_HASH", "assetHash는 SHA-256 64자리 hex 또는 null이어야 합니다.");
  }
  return hash;
}

function normalizeAccountTarget(value, platform) {
  if (value == null) return null;
  if (!isRecord(value)) throw new PublishIntentError("INVALID_ACCOUNT_TARGET", "accountTarget은 객체 또는 null이어야 합니다.");
  const allowed = new Set(["platform", "accountId", "targetId", "targetType", "handle"]);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected) throw new PublishIntentError("INVALID_ACCOUNT_TARGET", `accountTarget에 허용되지 않는 필드가 있습니다: ${unexpected}`);
  const target = {
    platform: nonEmptyString(value.platform ?? platform, "accountTarget.platform"),
    accountId: nonEmptyString(value.accountId, "accountTarget.accountId"),
    targetId: nonEmptyString(value.targetId, "accountTarget.targetId"),
    targetType: nonEmptyString(value.targetType, "accountTarget.targetType"),
    ...(typeof value.handle === "string" && value.handle.trim() ? { handle: value.handle.trim() } : {}),
  };
  if (target.platform !== platform) {
    throw new PublishIntentError("INVALID_ACCOUNT_TARGET", "accountTarget.platform이 채널 플랫폼과 다릅니다.");
  }
  return deepFreeze(target);
}

function sourceFingerprint(sourcePublishFields) {
  return sha256Hex(canonicalJson(sourcePublishFields ?? {}));
}

function factsFingerprint(facts) {
  return sha256Hex(canonicalJson(facts ?? {}));
}

function contentHash(publishFields) {
  return sha256Hex(canonicalJson(publishFields ?? {}));
}

function approvalComparable({
  channel,
  platform,
  targetLocale,
  publishFields,
  sourcePublishFields,
  facts,
  authorInputs,
  operationInputs,
  campaignBrief,
  assetHash,
  accountTarget,
  approvedBy,
  localeReviewed,
}) {
  return {
    channel,
    platform,
    targetLocale,
    publishFields: publishFields ?? {},
    sourceFingerprint: sourceFingerprint(sourcePublishFields ?? publishFields),
    factsFingerprint: factsFingerprint(facts),
    authorInputs: authorInputs ?? {},
    operationInputs: operationInputs ?? {},
    campaignBrief: campaignBrief ?? {},
    assetHash: assetHash ?? null,
    accountTarget: accountTarget ?? null,
    approvedBy,
    localeReviewed: localeReviewed === true,
  };
}

function approvalFingerprint(comparable) {
  return sha256Hex(canonicalJson({ schemaVersion: APPROVAL_REVISION_SCHEMA_VERSION, ...comparable }));
}

function newRecordId(prefix, fingerprint) {
  const random = globalThis.crypto?.randomUUID?.().replaceAll("-", "") ?? "";
  return `${prefix}_${(random || fingerprint).slice(0, 20)}`;
}

function assertApprovalEligible({ channel, targetLocale, publishFields, facts, authorInputs, operationInputs, campaignBrief }) {
  if (!CHANNEL_KEYS.includes(channel)) throw new PublishIntentError("INVALID_CHANNEL", "지원하지 않는 채널입니다.");
  if (supportMode(channel) !== "compose") {
    throw new PublishIntentError("MANUAL_ONLY_PLATFORM", "manual-only 또는 reference-only 채널에는 승인 snapshot을 만들 수 없습니다.");
  }
  if (!supportedLocales(channel).includes(targetLocale)) {
    throw new PublishIntentError("UNSUPPORTED_LOCALE", "이 채널에서 지원하지 않는 게시 언어입니다.");
  }
  const validation = validatePublish(channel, publishFields, { facts, campaignBrief });
  if (!validation.ok) {
    throw new PublishIntentError("APPROVAL_NOT_READY", validation.issues[0]?.message ?? "게시 필드 검증이 필요합니다.");
  }
  const state = assessChannelState({
    channel,
    validationOk: validation.ok,
    authorInputs,
    operationInputs,
    campaignBrief,
    approvalStatus: "unreviewed",
  });
  if (state.contentStatus !== "candidate" || state.operationsStatus !== "ready") {
    throw new PublishIntentError("APPROVAL_NOT_READY", state.contentInputIssues[0]?.message ?? state.operationIssues[0]?.message ?? "콘텐츠와 운영 조건을 먼저 확인하세요.");
  }
}

/** Creates an immutable, credential-free representation of exactly what was approved. */
export function createApprovalRevision(input = {}, { approvedAt = new Date().toISOString() } = {}) {
  const channel = String(input.channel ?? "");
  const platform = platformForChannel(channel);
  const targetLocale = String(input.targetLocale ?? "");
  const publishFields = clone(input.publishFields ?? {});
  const sourcePublishFields = clone(input.sourcePublishFields ?? publishFields);
  const facts = clone(input.facts ?? {});
  const authorInputs = clone(input.authorInputs ?? {});
  const operationInputs = clone(input.operationInputs ?? {});
  const campaignBrief = clone(input.campaignBrief ?? {});
  const approvedBy = nonEmptyString(input.approvedBy, "승인자", { minLength: 2 });
  const localeReviewed = input.localeReviewed === true;
  if (!localeReviewed) throw new PublishIntentError("LOCALE_REVIEW_REQUIRED", "게시 언어 검토를 확인해야 승인할 수 있습니다.");
  if (Number.isNaN(Date.parse(approvedAt))) throw new PublishIntentError("INVALID_APPROVAL_INPUT", "승인 시각 형식이 올바르지 않습니다.");

  assertNoCredentialMaterial({ publishFields, sourcePublishFields, facts, authorInputs, operationInputs, campaignBrief, approvedBy });
  assertApprovalEligible({ channel, targetLocale, publishFields, facts, authorInputs, operationInputs, campaignBrief });
  const accountTarget = normalizeAccountTarget(input.accountTarget, platform);
  const assetHash = normalizeNullableHash(input.assetHash);
  const policy = channelAutomationPolicy(channel, { targetLocale, localeReviewed });
  const comparable = approvalComparable({
    channel,
    platform,
    targetLocale,
    publishFields,
    sourcePublishFields,
    facts,
    authorInputs,
    operationInputs,
    campaignBrief,
    assetHash,
    accountTarget,
    approvedBy,
    localeReviewed,
  });
  const fingerprint = approvalFingerprint(comparable);
  const copyText = serializePublish(channel, publishFields);
  const revision = {
    schemaVersion: APPROVAL_REVISION_SCHEMA_VERSION,
    revisionId: newRecordId("apr", fingerprint),
    status: "approved",
    fingerprint,
    channel,
    platform,
    targetLocale,
    localeReviewed,
    publishFields,
    copyText,
    contentHash: contentHash(publishFields),
    sourceFingerprint: comparable.sourceFingerprint,
    factsFingerprint: comparable.factsFingerprint,
    authorInputs,
    operationInputs,
    campaignBrief,
    assetHash,
    accountTarget,
    approvedBy,
    approvedAt: new Date(approvedAt).toISOString(),
    policyStatusAtApproval: policy.status,
  };
  return deepFreeze(revision);
}

function comparableFromRevision(revision) {
  return {
    channel: revision.channel,
    platform: revision.platform,
    targetLocale: revision.targetLocale,
    publishFields: revision.publishFields,
    sourceFingerprint: revision.sourceFingerprint,
    factsFingerprint: revision.factsFingerprint,
    authorInputs: revision.authorInputs,
    operationInputs: revision.operationInputs,
    campaignBrief: revision.campaignBrief,
    assetHash: revision.assetHash,
    accountTarget: revision.accountTarget,
    approvedBy: revision.approvedBy,
    localeReviewed: revision.localeReviewed,
  };
}

export function assertApprovalRevision(revision) {
  if (!isRecord(revision) || revision.schemaVersion !== APPROVAL_REVISION_SCHEMA_VERSION) {
    throw new PublishIntentError("INVALID_APPROVAL_REVISION", "approvalRevision 형식이 올바르지 않습니다.");
  }
  assertNoCredentialMaterial(revision);
  const required = ["revisionId", "fingerprint", "channel", "platform", "targetLocale", "copyText", "contentHash", "sourceFingerprint", "factsFingerprint", "approvedBy", "approvedAt"];
  if (required.some((key) => typeof revision[key] !== "string" || !revision[key])) {
    throw new PublishIntentError("INVALID_APPROVAL_REVISION", "approvalRevision 필수 필드가 없습니다.");
  }
  if (revision.status !== "approved" || !isRecord(revision.publishFields)) {
    throw new PublishIntentError("INVALID_APPROVAL_REVISION", "승인되지 않은 snapshot은 publish intent에 사용할 수 없습니다.");
  }
  if (platformForChannel(revision.channel) !== revision.platform || !supportedLocales(revision.channel).includes(revision.targetLocale)) {
    throw new PublishIntentError("INVALID_APPROVAL_REVISION", "approvalRevision의 채널·플랫폼·언어 조합이 올바르지 않습니다.");
  }
  if (serializePublish(revision.channel, revision.publishFields) !== revision.copyText || contentHash(revision.publishFields) !== revision.contentHash) {
    throw new PublishIntentError("INVALID_APPROVAL_REVISION", "approvalRevision의 게시 필드 무결성이 맞지 않습니다.");
  }
  if (approvalFingerprint(comparableFromRevision(revision)) !== revision.fingerprint) {
    throw new PublishIntentError("INVALID_APPROVAL_REVISION", "approvalRevision 지문이 맞지 않습니다.");
  }
  return deepFreeze(clone(revision));
}

export function approvalInvalidationReasons(revision, current = {}) {
  if (!revision) return ["APPROVAL_REVISION_MISSING"];
  try {
    assertApprovalRevision(revision);
  } catch {
    return ["APPROVAL_REVISION_INVALID"];
  }
  const currentPlatform = platformForChannel(current.channel ?? revision.channel);
  const currentComparable = approvalComparable({
    channel: current.channel ?? revision.channel,
    platform: currentPlatform,
    targetLocale: current.targetLocale ?? revision.targetLocale,
    publishFields: current.publishFields ?? {},
    sourcePublishFields: current.sourcePublishFields ?? current.publishFields ?? {},
    facts: current.facts ?? {},
    authorInputs: current.authorInputs ?? {},
    operationInputs: current.operationInputs ?? {},
    campaignBrief: current.campaignBrief ?? {},
    assetHash: current.assetHash ?? null,
    accountTarget: current.accountTarget ?? null,
    approvedBy: current.approvedBy ?? revision.approvedBy,
    localeReviewed: current.localeReviewed === true,
  });
  const reasons = [];
  if (currentComparable.channel !== revision.channel || currentComparable.platform !== revision.platform) reasons.push("CHANNEL_CHANGED");
  if (currentComparable.targetLocale !== revision.targetLocale) reasons.push("LOCALE_CHANGED");
  if (canonicalJson(currentComparable.publishFields) !== canonicalJson(revision.publishFields)) reasons.push("PUBLISH_FIELDS_CHANGED");
  if (currentComparable.sourceFingerprint !== revision.sourceFingerprint) reasons.push("SOURCE_CHANGED");
  if (currentComparable.factsFingerprint !== revision.factsFingerprint) reasons.push("FACTS_CHANGED");
  if (canonicalJson(currentComparable.authorInputs) !== canonicalJson(revision.authorInputs)) reasons.push("AUTHOR_INPUTS_CHANGED");
  if (canonicalJson(currentComparable.operationInputs) !== canonicalJson(revision.operationInputs)) reasons.push("OPERATION_INPUTS_CHANGED");
  if (canonicalJson(currentComparable.campaignBrief) !== canonicalJson(revision.campaignBrief)) reasons.push("CAMPAIGN_BRIEF_CHANGED");
  if (currentComparable.assetHash !== revision.assetHash) reasons.push("ASSET_CHANGED");
  if (canonicalJson(currentComparable.accountTarget) !== canonicalJson(revision.accountTarget)) reasons.push("ACCOUNT_TARGET_CHANGED");
  if (currentComparable.approvedBy !== revision.approvedBy) reasons.push("APPROVER_CHANGED");
  if (currentComparable.localeReviewed !== true) reasons.push("LOCALE_REVIEW_REQUIRED");
  return reasons;
}

export function assessApprovalRevision(revision, current = {}) {
  const reasons = approvalInvalidationReasons(revision, current);
  return Object.freeze({
    status: reasons.length === 0 ? "approved" : (reasons[0] === "APPROVAL_REVISION_MISSING" ? "unreviewed" : "invalidated"),
    valid: reasons.length === 0,
    reasons: Object.freeze(reasons),
  });
}

export function publishIntentDuplicateKey(revision) {
  const approved = assertApprovalRevision(revision);
  return sha256Hex(canonicalJson({
    platform: approved.platform,
    accountId: approved.accountTarget?.accountId ?? null,
    channelTarget: approved.accountTarget?.targetId ?? null,
    contentHash: approved.contentHash,
    assetHash: approved.assetHash,
  }));
}

/**
 * Builds a non-publishing intent. Supplying a readiness attestation enables
 * the Phase 3 local dry-run gate only; this record still has no publisher.
 * Omitting it preserves the Phase 1 intent-only behavior for older callers.
 */
export function createPublishIntent({ approvalRevision, readiness, operationInputs, createdAt = new Date().toISOString() } = {}) {
  const revision = assertApprovalRevision(approvalRevision);
  if (Number.isNaN(Date.parse(createdAt))) throw new PublishIntentError("INVALID_PUBLISH_INTENT", "intent 생성 시각 형식이 올바르지 않습니다.");
  const policy = channelAutomationPolicy(revision.channel, {
    targetLocale: revision.targetLocale,
    localeReviewed: revision.localeReviewed,
  });
  const blockedReasons = [];
  let status = "draft";
  if (readiness !== undefined) {
    const assessment = assessPlatformReadiness({
      channel: revision.channel,
      readiness,
      operationInputs: operationInputs ?? revision.operationInputs,
      targetLocale: revision.targetLocale,
    });
    if (assessment.issues.some((entry) => entry.code === "POLICY_REVERIFY_REQUIRED")) {
      status = "expired";
      blockedReasons.push("POLICY_REVERIFY_REQUIRED");
    } else if (!revision.accountTarget) {
      status = "draft";
      blockedReasons.push("ACCOUNT_TARGET_REQUIRED");
    } else if (!assessment.dryRunEligible) {
      status = "blocked";
      blockedReasons.push(...assessment.issues.map((entry) => entry.code));
    } else {
      status = "ready_for_dry_run";
    }
  } else if (policy.status === "needs_reverify") {
    status = "expired";
    blockedReasons.push("POLICY_REVERIFY_REQUIRED");
  } else if (!revision.accountTarget) {
    blockedReasons.push("ACCOUNT_TARGET_REQUIRED");
  } else {
    // Intent-only callers remain blocked. Only the Phase 3 route supplies
    // an assessed readiness record and can create a dry-run-ready intent.
    status = "blocked";
    blockedReasons.push("PHASE_1_CONNECTOR_DISABLED");
  }
  const duplicateKey = publishIntentDuplicateKey(revision);
  const fingerprint = sha256Hex(canonicalJson({ schemaVersion: PUBLISH_INTENT_SCHEMA_VERSION, revisionId: revision.revisionId, duplicateKey }));
  return deepFreeze({
    schemaVersion: PUBLISH_INTENT_SCHEMA_VERSION,
    intentId: newRecordId("pint", fingerprint),
    status,
    fingerprint,
    duplicateKey,
    approvalRevisionId: revision.revisionId,
    approvalFingerprint: revision.fingerprint,
    platform: revision.platform,
    channel: revision.channel,
    targetLocale: revision.targetLocale,
    accountTarget: revision.accountTarget,
    assetHash: revision.assetHash,
    contentHash: revision.contentHash,
    blockedReasons: Object.freeze(blockedReasons),
    createdAt: new Date(createdAt).toISOString(),
  });
}

/** Process-local dedupe only. It creates no network request and is cleared on restart. */
export class PublishIntentStore {
  #items = new Map();

  create(input = {}) {
    const intent = createPublishIntent(input);
    const duplicate = this.#items.get(intent.duplicateKey);
    if (duplicate) {
      throw new PublishIntentError("DUPLICATE_PUBLISH_INTENT", "같은 승인 snapshot의 publish intent가 이미 있습니다.", { status: 409 });
    }
    this.#items.set(intent.duplicateKey, intent);
    return intent;
  }

  get(duplicateKey) {
    return this.#items.get(duplicateKey) ?? null;
  }

  get size() {
    return this.#items.size;
  }
}

export function createPublishIntentStore() {
  return new PublishIntentStore();
}

import { assertApprovalRevision } from "../publish-intent.mjs";
import { accountTargetFromReadiness, assessPlatformReadiness } from "../platform-readiness.mjs";
import { canonicalJson, sha256Hex } from "../request-fingerprint.mjs";
import { providerOutputDlpIssues } from "../runtime-security.mjs";

// Dry-run connectors are pure payload planners. They have no fetch, child
// process, credential store, upload, schedule, or platform write operation.
export const CONNECTOR_DRY_RUN_SCHEMA_VERSION = "viral-connector-dry-run/v1";
export const DRY_RUN_RECEIPT_SCHEMA_VERSION = "viral-dry-run-receipt/v1";
export const DRY_RUN_SAFETY_SCHEMA_VERSION = "viral-dry-run-safety/v1";
export const CREDENTIAL_RESOLUTION_STATUS = "not_configured";
export const LIVE_WRITE_KILL_SWITCH = "live_write_locked";

const OPAQUE_HANDLE_RE = /^[A-Za-z0-9._:-]{8,160}$/u;

export class DryRunConnectorError extends Error {
  constructor(code, message, { status = 409, retryable = false } = {}) {
    super(message);
    this.name = "DryRunConnectorError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function same(value, expected) {
  return canonicalJson(value ?? null) === canonicalJson(expected ?? null);
}

function issue(code, message) {
  return Object.freeze({ code, message });
}

function maskedAccount(accountTarget = {}) {
  const handle = String(accountTarget.handle ?? "").replace(/^@/u, "");
  const accountId = String(accountTarget.accountId ?? "");
  const visible = accountId.length <= 4 ? "••••" : `••••${accountId.slice(-4)}`;
  return deepFreeze({
    ...(handle ? { handle: `@${handle}` } : {}),
    accountId: visible,
    targetType: String(accountTarget.targetType ?? "unknown"),
  });
}

/**
 * This is intentionally an opaque-handle contract only. The current phase
 * cannot resolve a credential and never returns a submitted handle.
 */
export function resolveDryRunCredential({ credentialHandle } = {}) {
  const hasOpaqueHandle = typeof credentialHandle === "string" && OPAQUE_HANDLE_RE.test(credentialHandle);
  return deepFreeze({
    status: CREDENTIAL_RESOLUTION_STATUS,
    handleProvided: hasOpaqueHandle,
    liveWriteBlocked: true,
  });
}

/**
 * Requires a user-controlled fail-closed interlock and a non-secret external
 * vault reference. Neither value can enable a platform write in this build.
 */
export function assertDryRunExecutionControls({ safety, credentialHandle } = {}) {
  if (!safety || safety.schemaVersion !== DRY_RUN_SAFETY_SCHEMA_VERSION || safety.execution !== "dry_run") {
    throw new DryRunConnectorError("INVALID_DRY_RUN_SAFETY", "dry-run safety 계약이 올바르지 않습니다.", { status: 400 });
  }
  if (safety.userKillSwitch !== LIVE_WRITE_KILL_SWITCH || safety.liveWriteLocked !== true) {
    throw new DryRunConnectorError("DRY_RUN_KILL_SWITCH_REQUIRED", "실제 게시 잠금(kill switch)을 유지해야 local dry-run을 실행할 수 있습니다.", { status: 409 });
  }
  const credential = resolveDryRunCredential({ credentialHandle });
  if (!credential.handleProvided) {
    throw new DryRunConnectorError("CREDENTIAL_HANDLE_REQUIRED", "비밀값이 아닌 외부 vault credential reference가 필요합니다.", { status: 400 });
  }
  if (providerOutputDlpIssues({ credentialHandle }).length > 0) {
    throw new DryRunConnectorError("SENSITIVE_CREDENTIAL_HANDLE", "credential reference에 token·secret·개인 경로를 넣을 수 없습니다.", { status: 400 });
  }
  return deepFreeze({
    safety: {
      schemaVersion: DRY_RUN_SAFETY_SCHEMA_VERSION,
      execution: "dry_run",
      userKillSwitch: LIVE_WRITE_KILL_SWITCH,
      liveWriteLocked: true,
    },
    credential,
  });
}

/** Classifies a future platform response without performing a request. */
export function classifyDryRunError(error = {}) {
  const code = String(error.code ?? "");
  const status = Number(error.status) || 0;
  if ([401, 403, 409, 429].includes(status)) {
    return deepFreeze({ retryable: false, status, code: code || `HTTP_${status}` });
  }
  if (["DUPLICATE_PUBLISH_INTENT", "POLICY_REVERIFY_REQUIRED", "STALE_APPROVAL", "STALE_ASSET", "STALE_ACCOUNT"].includes(code)) {
    return deepFreeze({ retryable: false, status: status || 409, code });
  }
  return deepFreeze({ retryable: false, status: status || 400, code: code || "DRY_RUN_BLOCKED" });
}

/**
 * Checks that the approved snapshot still refers to the currently attested
 * account and asset. It makes no network request; a false result is a hard
 * block before an adapter can build a payload.
 */
export function validateDryRunIntent({ approvalRevision, readiness, operationInputs = {}, now = Date.now() } = {}) {
  let revision;
  try {
    revision = assertApprovalRevision(approvalRevision);
  } catch (error) {
    return deepFreeze({ ok: false, revision: null, readiness: null, issues: Object.freeze([issue(error.code ?? "INVALID_APPROVAL_REVISION", error.message)]) });
  }
  if (providerOutputDlpIssues({ readiness, operationInputs }).length > 0) {
    return deepFreeze({ ok: false, revision, readiness: null, issues: Object.freeze([issue("SENSITIVE_READINESS_INPUT", "dry-run readiness에 개인 경로 또는 인증 정보가 포함되었습니다.")]) });
  }
  let assessment;
  try {
    assessment = assessPlatformReadiness({
      channel: revision.channel,
      readiness,
      operationInputs,
      targetLocale: revision.targetLocale,
      now,
    });
  } catch (error) {
    return deepFreeze({ ok: false, revision, readiness: null, issues: Object.freeze([issue(error.code ?? "INVALID_READINESS", error.message)]) });
  }
  const issues = [];
  if (!assessment.dryRunEligible) {
    issues.push(...assessment.issues.map((entry) => issue(entry.code, entry.message)));
  }
  const accountTarget = accountTargetFromReadiness(assessment.readiness);
  if (!same(revision.accountTarget, accountTarget)) {
    issues.push(issue("STALE_ACCOUNT", "승인 snapshot의 계정 대상과 현재 readiness가 다릅니다. 다시 승인하세요."));
  }
  if ((revision.assetHash ?? null) !== (assessment.assetHash ?? null)) {
    issues.push(issue("STALE_ASSET", "승인 snapshot의 자산 hash와 현재 readiness가 다릅니다. 다시 승인하세요."));
  }
  if (revision.policyStatusAtApproval === "needs_reverify") {
    issues.push(issue("POLICY_REVERIFY_REQUIRED", "승인 당시 정책 snapshot이 만료되어 있습니다."));
  }
  return deepFreeze({
    ok: issues.length === 0,
    revision,
    readiness: assessment.readiness,
    assessment,
    issues: Object.freeze(issues),
  });
}

export function assertValidDryRunIntent(input = {}) {
  const result = validateDryRunIntent(input);
  if (!result.ok) {
    const first = result.issues[0] ?? issue("DRY_RUN_BLOCKED", "dry-run 사전조건을 확인하세요.");
    throw new DryRunConnectorError(first.code, first.message);
  }
  return result;
}

export function createDryRunReceipt({ revision, intent, endpointClass, requestCount, credential, safety, requestedAt = new Date().toISOString() } = {}) {
  if (Number.isNaN(Date.parse(requestedAt))) {
    throw new DryRunConnectorError("INVALID_DRY_RUN_TIME", "dry-run 시각 형식이 올바르지 않습니다.", { status: 400 });
  }
  const source = {
    platform: revision.platform,
    channel: revision.channel,
    approvalRevisionId: revision.revisionId,
    contentHash: revision.contentHash,
    assetHash: revision.assetHash ?? null,
    duplicateKey: intent.duplicateKey,
    endpointClass,
    requestCount,
    requestedAt: new Date(requestedAt).toISOString(),
  };
  const receiptId = `dry_${sha256Hex(canonicalJson(source)).slice(0, 20)}`;
  return deepFreeze({
    schemaVersion: DRY_RUN_RECEIPT_SCHEMA_VERSION,
    receiptId,
    execution: "dry_run",
    result: "simulated",
    platform: revision.platform,
    channel: revision.channel,
    account: maskedAccount(revision.accountTarget),
    approvalRevisionId: revision.revisionId,
    publishIntentId: intent.intentId,
    contentHash: revision.contentHash,
    assetHash: revision.assetHash ?? null,
    endpointClass,
    requestCount,
    requestedAt: source.requestedAt,
    networkWriteCount: 0,
    credential: credential ?? resolveDryRunCredential(),
    safety: safety ?? {
      schemaVersion: DRY_RUN_SAFETY_SCHEMA_VERSION,
      execution: "dry_run",
      userKillSwitch: LIVE_WRITE_KILL_SWITCH,
      liveWriteLocked: true,
    },
    liveWriteBlocked: true,
  });
}

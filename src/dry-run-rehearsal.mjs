import { canonicalJson, sha256Hex } from "./request-fingerprint.mjs";
import { providerOutputDlpIssues } from "./runtime-security.mjs";

export const DRY_RUN_EVIDENCE_SCHEMA_VERSION = "viral-dry-run-evidence/v1";

export class DryRunEvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DryRunEvidenceError";
    this.code = code;
    this.status = 500;
    this.retryable = false;
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/**
 * Produces a shareable dry-run proof without copying publish text, payloads,
 * credential handles, headers, private paths, or raw readiness inputs.
 */
export function createDryRunEvidenceManifest(dryRun = {}) {
  const receipt = dryRun?.receipt;
  if (!receipt || receipt.execution !== "dry_run" || receipt.networkWriteCount !== 0 || receipt.liveWriteBlocked !== true) {
    throw new DryRunEvidenceError("UNSAFE_DRY_RUN_RECEIPT", "안전 조건을 충족한 dry-run receipt만 증거로 만들 수 있습니다.");
  }
  if (receipt.safety?.liveWriteLocked !== true || receipt.safety?.userKillSwitch !== "live_write_locked") {
    throw new DryRunEvidenceError("DRY_RUN_KILL_SWITCH_REQUIRED", "실제 게시 잠금이 유지된 receipt가 필요합니다.");
  }
  const comparable = {
    schemaVersion: DRY_RUN_EVIDENCE_SCHEMA_VERSION,
    receiptId: receipt.receiptId,
    generatedAt: receipt.requestedAt,
    platform: receipt.platform,
    channel: receipt.channel,
    account: receipt.account,
    approvalRevisionId: receipt.approvalRevisionId,
    publishIntentId: receipt.publishIntentId,
    contentHash: receipt.contentHash,
    assetHash: receipt.assetHash ?? null,
    endpointClass: receipt.endpointClass,
    requestCount: receipt.requestCount,
    networkWriteCount: 0,
    credentialStatus: receipt.credential?.status ?? "not_configured",
    credentialHandlePresent: receipt.credential?.handleProvided === true,
    liveWriteLocked: true,
    assertions: [
      "approval_snapshot_matched",
      "account_and_asset_attestation_matched",
      "credential_value_not_resolved",
      "publish_text_omitted",
      "external_network_write_zero",
    ],
  };
  if (providerOutputDlpIssues(comparable).length > 0) {
    throw new DryRunEvidenceError("SENSITIVE_DRY_RUN_EVIDENCE", "dry-run evidence에 민감 정보가 감지되어 생성을 중단했습니다.");
  }
  return deepFreeze({
    ...comparable,
    manifestHash: sha256Hex(canonicalJson(comparable)),
  });
}

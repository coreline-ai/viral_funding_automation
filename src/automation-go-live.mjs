import { PLATFORM_KEYS, PLATFORM_REGISTRY } from "./platform-registry.mjs";
import { providerOutputDlpIssues } from "./runtime-security.mjs";

// This contract is intentionally pre-publish only. It records the smallest
// possible future Threads scope while keeping every live write capability off.
export const AUTOMATION_GO_LIVE_SCHEMA_VERSION = "viral-automation-go-live/v1";
export const AUTOMATION_GO_LIVE_DECISION = "NO_GO_PENDING_EXTERNAL_INPUTS";

export const THREADS_FIRST_AUTOMATION_SCOPE = Object.freeze({
  platform: "threads",
  channel: "threads",
  format: "single_text",
  maxPostsPerApproval: 1,
  automaticRetry: false,
  scheduling: false,
  mediaUpload: false,
  crossPosting: false,
});

export const DEFERRED_EXTERNAL_INPUTS = Object.freeze([
  Object.freeze({ id: "threads_account", label: "Threads 공개 profile·handle과 계정 책임자 확인" }),
  Object.freeze({ id: "meta_app", label: "Meta App ID와 등록 redirect URI 확인" }),
  Object.freeze({ id: "threads_scopes", label: "threads_basic·threads_content_publish 승인 확인" }),
  Object.freeze({ id: "policy_reverification", label: "최신 공식 정책과 App Dashboard 요구사항 재검증" }),
  Object.freeze({ id: "credential_vault_strategy", label: "OS Keychain 또는 별도 encrypted credential service 선택·보안 검토" }),
  Object.freeze({ id: "account_owner_approval", label: "실제 계정 기반 local dry-run과 계정 책임자 승인" }),
]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function manualOnlyPlatforms() {
  return PLATFORM_KEYS.filter((key) => PLATFORM_REGISTRY[key].automationMode === "manual_only");
}

function deferredCandidatePlatforms() {
  return PLATFORM_KEYS.filter((key) => key !== "threads" && PLATFORM_REGISTRY[key].automationMode !== "manual_only");
}

/**
 * Returns a safe, credential-free decision package. External account input is
 * deliberately not accepted here; those facts stay deferred until a separate
 * go-live review and can never silently enable a publish capability.
 */
export function automationGoLiveAssessment({ generatedAt = new Date().toISOString() } = {}) {
  const timestamp = new Date(generatedAt);
  if (!Number.isFinite(timestamp.getTime())) throw new TypeError("generatedAt은 유효한 시각이어야 합니다.");
  return deepFreeze({
    schemaVersion: AUTOMATION_GO_LIVE_SCHEMA_VERSION,
    generatedAt: timestamp.toISOString(),
    decision: AUTOMATION_GO_LIVE_DECISION,
    internalPreparationStatus: "complete",
    externalInputsStatus: "deferred",
    actualPublishCapability: false,
    actualUploadCapability: false,
    actualScheduleCapability: false,
    credentialVaultStrategy: "not_selected",
    nextScope: { ...THREADS_FIRST_AUTOMATION_SCOPE },
    deferredExternalInputs: DEFERRED_EXTERNAL_INPUTS.map((item) => ({ ...item })),
    keepBlockedPlatforms: deferredCandidatePlatforms(),
    manualOnlyPlatforms: manualOnlyPlatforms(),
    assertions: {
      liveWriteRoutes: 0,
      socialNetworkWriteEnabled: false,
      oauthCredentialAcceptedByBrowser: false,
      oauthCredentialAcceptedByMarkdown: false,
    },
  });
}

export function automationGoLiveCapability() {
  const assessment = automationGoLiveAssessment({ generatedAt: "2026-08-21T00:00:00.000Z" });
  return deepFreeze({
    phase: "pre_publish_preflight",
    decision: assessment.decision,
    internalPreparationStatus: assessment.internalPreparationStatus,
    externalInputsStatus: assessment.externalInputsStatus,
    actualPublishCapability: false,
    actualUploadCapability: false,
    actualScheduleCapability: false,
    credentialVaultStrategy: assessment.credentialVaultStrategy,
    nextScope: { ...assessment.nextScope },
  });
}

function markdownValue(value) {
  return String(value ?? "").replace(/[\r\n]+/gu, " ").trim() || "미확인";
}

/** Generates a safe decision report without account IDs, copy, paths, or credentials. */
export function automationGoLiveReportMarkdown({ generatedAt = new Date().toISOString() } = {}) {
  const assessment = automationGoLiveAssessment({ generatedAt });
  const lines = [
    "# 소셜 자동 게시 Go/No-Go 보고서",
    "",
    `생성 시각: ${markdownValue(assessment.generatedAt)}`,
    `판정: ${assessment.decision}`,
    `내부 사전 준비: ${assessment.internalPreparationStatus}`,
    `외부 입력: ${assessment.externalInputsStatus}`,
    "",
    "## 실제 기능 노출 상태",
    `- 실제 게시 capability: ${assessment.actualPublishCapability}`,
    `- 실제 업로드 capability: ${assessment.actualUploadCapability}`,
    `- 실제 예약 capability: ${assessment.actualScheduleCapability}`,
    `- live write route 수: ${assessment.assertions.liveWriteRoutes}`,
    "",
    "## 다음 별도 개발의 최대 허용 범위",
    "- 플랫폼: Threads",
    "- 형식: 승인된 단일 텍스트 1건",
    "- 자동 재시도: 없음",
    "- 예약: 없음",
    "- 미디어 업로드: 없음",
    "- 교차 게시: 없음",
    "",
    "## 후순위 외부 운영 게이트",
    ...assessment.deferredExternalInputs.map((item) => `- [ ] ${markdownValue(item.label)}`),
    "",
    "## 계속 차단",
    `- 후속 후보: ${assessment.keepBlockedPlatforms.map(markdownValue).join(", ")}`,
    `- 수동 전용: ${assessment.manualOnlyPlatforms.map(markdownValue).join(", ")}`,
    "",
    "## credential 저장 결정",
    "- 현재 선택: 선택 안 됨",
    "- 후보: OS Keychain 또는 별도 encrypted credential service",
    "- 실제 token·secret은 이 보고서, Git, 브라우저 localStorage에 저장하지 않습니다.",
    "",
    "## 결론",
    "- 외부 운영 게이트를 완료하고 별도 보안 검토를 통과하기 전에는 실제 자동 게시 개발을 시작하지 않습니다.",
    "- 현재 제품은 승인 snapshot과 local dry-run까지만 제공하며 외부 플랫폼 write는 0회입니다.",
    "",
  ];
  const report = lines.join("\n");
  if (providerOutputDlpIssues({ report }).length > 0) throw new TypeError("Go/No-Go 보고서에 민감 정보 패턴이 포함되었습니다.");
  return report;
}

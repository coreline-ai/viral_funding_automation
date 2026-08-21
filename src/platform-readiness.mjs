import { channelProfile, requiredOperationInputs, supportedLocales, validateTypedInputs } from "./channel-profiles.mjs";
import { platformForChannel, platformProfile, policyStatus } from "./platform-registry.mjs";
import { providerOutputDlpIssues } from "./runtime-security.mjs";

// This module stores only non-secret readiness attestations and local asset
// metadata. It deliberately cannot resolve credentials, upload an asset, or
// contact a social platform.
export const PLATFORM_READINESS_SCHEMA_VERSION = "viral-platform-readiness/v1";
export const EXTERNAL_CREDENTIAL_VAULT_STATUS = "external_vault_required";

const ACCOUNT_TYPES = Object.freeze({
  x: ["personal", "organization"],
  threads: ["threads_profile"],
  linkedin: ["person", "organization"],
  facebook: ["page"],
  instagram: ["professional"],
  shorts: ["channel"],
  tiktok: ["creator", "business"],
  discord: ["server"],
  bluesky: ["personal"],
  mastodon: ["personal"],
});

const REQUIRED_SCOPES = Object.freeze({
  x: ["tweet.write"],
  threads: ["threads_basic", "threads_content_publish"],
  linkedin: ["w_member_social"],
  facebook: ["pages_manage_posts"],
  instagram: ["instagram_content_publish"],
  shorts: ["youtube.upload"],
  tiktok: ["video.publish"],
  discord: ["webhook_or_bot_scope"],
  bluesky: ["write_scope"],
  mastodon: ["write:statuses"],
});

const ASSET_REQUIRED_PLATFORMS = new Set(["facebook", "instagram", "shorts", "tiktok"]);
const PUBLIC_ASSET_URL_PLATFORMS = new Set(["facebook", "instagram", "tiktok"]);
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const FORBIDDEN_KEY = /(?:access|refresh)?[_-]?(?:token|secret)|password|authorization|private[_-]?key|cookie|session(?:[_-]?id)?/iu;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const SAFE_IDENTIFIER_RE = /^[A-Za-z0-9._:@-]{2,160}$/u;
const SAFE_HANDLE_RE = /^@?[A-Za-z0-9._-]{2,100}$/u;
const TIMEZONE_RE = /^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/u;

export class PlatformReadinessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PlatformReadinessError";
    this.code = code;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function noSecretMaterial(value) {
  const scan = (item) => {
    if (Array.isArray(item)) return item.some(scan);
    if (!isRecord(item)) return false;
    return Object.entries(item).some(([key, child]) => FORBIDDEN_KEY.test(key) || scan(child));
  };
  return !scan(value) && providerOutputDlpIssues(value).length === 0;
}

function httpsUrl(value, { allowLoopback = false } = {}) {
  try {
    const url = new URL(text(value));
    if (url.protocol === "https:") return url.toString();
    if (allowLoopback && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return url.toString();
  } catch {
    // A typed issue is returned by the caller.
  }
  return "";
}

function dateIsCurrent(value, now) {
  if (!DATE_RE.test(text(value))) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && parsed <= now;
}

function readableReason(code, fallback) {
  return { code, message: fallback };
}

function profileFor(platform) {
  const profile = platformProfile(platform);
  if (!profile) throw new PlatformReadinessError("INVALID_PLATFORM", "지원하지 않는 플랫폼입니다.");
  return profile;
}

export function platformReadinessSchema(platform) {
  const profile = profileFor(platform);
  return Object.freeze({
    platform,
    automationMode: profile.automationMode,
    accountTypes: Object.freeze([...(ACCOUNT_TYPES[platform] ?? [])]),
    requiredScopes: Object.freeze([...(REQUIRED_SCOPES[platform] ?? [])]),
    requiresDeveloperApp: profile.automationMode === "automation_candidate",
    requiresAsset: ASSET_REQUIRED_PLATFORMS.has(platform),
    requiresPublicAssetUrl: PUBLIC_ASSET_URL_PLATFORMS.has(platform),
    supportsTextOnly: !ASSET_REQUIRED_PLATFORMS.has(platform),
    credentialVaultStatus: EXTERNAL_CREDENTIAL_VAULT_STATUS,
  });
}

export function emptyPlatformReadiness(platform) {
  const schema = platformReadinessSchema(platform);
  return deepFreeze({
    schemaVersion: PLATFORM_READINESS_SCHEMA_VERSION,
    platform,
    account: {
      accountType: schema.accountTypes[0] ?? "manual",
      profileId: "",
      targetId: "",
      targetType: "profile",
      handle: "",
      profileUrl: "",
      owner: "",
      timezone: "Asia/Seoul",
      targetLocale: "",
    },
    developerApp: {
      configured: false,
      appId: "",
      approvedScopes: [],
      redirectUri: "",
      credentialVaultConfirmed: false,
      credentialVaultStatus: EXTERNAL_CREDENTIAL_VAULT_STATUS,
    },
    policy: { url: "", verifiedAt: "" },
    asset: null,
  });
}

function safeAccount(raw, schema) {
  const account = isRecord(raw) ? raw : {};
  return {
    accountType: schema.accountTypes.includes(account.accountType) ? account.accountType : (schema.accountTypes[0] ?? "manual"),
    profileId: text(account.profileId),
    targetId: text(account.targetId),
    targetType: text(account.targetType) || "profile",
    handle: text(account.handle),
    profileUrl: text(account.profileUrl),
    owner: text(account.owner),
    timezone: text(account.timezone),
    targetLocale: text(account.targetLocale),
  };
}

function safeDeveloperApp(raw) {
  const app = isRecord(raw) ? raw : {};
  const scopes = Array.isArray(app.approvedScopes)
    ? [...new Set(app.approvedScopes.map(text).filter(Boolean))].sort()
    : [];
  return {
    configured: app.configured === true,
    appId: text(app.appId),
    approvedScopes: scopes,
    redirectUri: text(app.redirectUri),
    credentialVaultConfirmed: app.credentialVaultConfirmed === true,
    credentialVaultStatus: EXTERNAL_CREDENTIAL_VAULT_STATUS,
  };
}

function safePolicy(raw) {
  const policy = isRecord(raw) ? raw : {};
  return { url: text(policy.url), verifiedAt: text(policy.verifiedAt) };
}

function safeAsset(raw) {
  if (raw == null) return null;
  const asset = isRecord(raw) ? raw : {};
  return {
    hash: text(asset.hash).toLowerCase(),
    fileName: text(asset.fileName).replace(/^.*[\\/]/u, ""),
    mimeType: text(asset.mimeType).toLowerCase(),
    sizeBytes: Number(asset.sizeBytes),
    width: Number(asset.width),
    height: Number(asset.height),
    altText: text(asset.altText),
    rightsConfirmed: asset.rightsConfirmed === true,
    publicUrl: text(asset.publicUrl),
  };
}

/** Normalizes only safe metadata. Raw files, path names, and credentials never enter this record. */
export function normalizePlatformReadiness(input = {}) {
  if (!isRecord(input) || !noSecretMaterial(input)) {
    throw new PlatformReadinessError("SENSITIVE_READINESS_INPUT", "readiness에는 token·secret·비밀번호·개인 경로를 넣을 수 없습니다.");
  }
  const platform = text(input.platform);
  const schema = platformReadinessSchema(platform);
  return deepFreeze({
    schemaVersion: PLATFORM_READINESS_SCHEMA_VERSION,
    platform,
    account: safeAccount(input.account, schema),
    developerApp: safeDeveloperApp(input.developerApp),
    policy: safePolicy(input.policy),
    asset: safeAsset(input.asset),
  });
}

export function accountTargetFromReadiness(readiness) {
  const normalized = normalizePlatformReadiness(readiness);
  const account = normalized.account;
  if (!SAFE_IDENTIFIER_RE.test(account.profileId) || !SAFE_IDENTIFIER_RE.test(account.targetId) || !SAFE_IDENTIFIER_RE.test(account.targetType)) return null;
  if (!SAFE_HANDLE_RE.test(account.handle)) return null;
  return deepFreeze({
    platform: normalized.platform,
    accountId: account.profileId,
    targetId: account.targetId,
    targetType: account.targetType,
    handle: account.handle.replace(/^@/u, ""),
  });
}

function accountIssues(readiness, channel, targetLocale) {
  const { account } = readiness;
  const allowedTypes = platformReadinessSchema(readiness.platform).accountTypes;
  const issues = [];
  if (allowedTypes.length > 0 && !allowedTypes.includes(account.accountType)) issues.push(readableReason("ACCOUNT_TYPE_REQUIRED", "계정 유형을 선택하세요."));
  if (!SAFE_IDENTIFIER_RE.test(account.profileId)) issues.push(readableReason("PROFILE_ID_REQUIRED", "공개 profile/Page/channel ID를 입력하세요."));
  if (!SAFE_IDENTIFIER_RE.test(account.targetId)) issues.push(readableReason("ACCOUNT_TARGET_REQUIRED", "게시 대상 ID를 입력하세요."));
  if (!SAFE_IDENTIFIER_RE.test(account.targetType)) issues.push(readableReason("TARGET_TYPE_REQUIRED", "게시 대상 유형을 입력하세요."));
  if (!SAFE_HANDLE_RE.test(account.handle)) issues.push(readableReason("ACCOUNT_HANDLE_REQUIRED", "공개 계정 handle을 입력하세요."));
  if (!httpsUrl(account.profileUrl)) issues.push(readableReason("PUBLIC_PROFILE_URL_REQUIRED", "공개 프로필 URL(https)을 입력하세요."));
  if (account.owner.length < 2) issues.push(readableReason("ACCOUNT_OWNER_REQUIRED", "계정 소유자 또는 책임자를 입력하세요."));
  if (!TIMEZONE_RE.test(account.timezone)) issues.push(readableReason("ACCOUNT_TIMEZONE_REQUIRED", "IANA timezone(예: Asia/Seoul)을 입력하세요."));
  if (!supportedLocales(channel).includes(account.targetLocale)) issues.push(readableReason("ACCOUNT_LOCALE_REQUIRED", "채널에서 지원하는 게시 언어를 선택하세요."));
  if (targetLocale && account.targetLocale !== targetLocale) issues.push(readableReason("ACCOUNT_LOCALE_MISMATCH", "선택한 게시 언어와 계정 대상 언어가 다릅니다."));
  return issues;
}

function developerAppIssues(readiness) {
  const schema = platformReadinessSchema(readiness.platform);
  if (!schema.requiresDeveloperApp) return [];
  const app = readiness.developerApp;
  const issues = [];
  if (!app.configured) issues.push(readableReason("DEVELOPER_APP_REQUIRED", "Developer App 준비 여부를 확인하세요."));
  if (!SAFE_IDENTIFIER_RE.test(app.appId)) issues.push(readableReason("DEVELOPER_APP_ID_REQUIRED", "비밀값이 아닌 Developer App ID를 입력하세요."));
  if (!httpsUrl(app.redirectUri, { allowLoopback: true })) issues.push(readableReason("REDIRECT_URI_REQUIRED", "등록한 redirect URI를 입력하세요."));
  for (const scope of schema.requiredScopes) {
    if (!app.approvedScopes.includes(scope)) issues.push(readableReason("SCOPE_REQUIRED", `승인된 scope가 필요합니다: ${scope}`));
  }
  if (!app.credentialVaultConfirmed) issues.push(readableReason("EXTERNAL_CREDENTIAL_VAULT_REQUIRED", "외부 credential vault 준비를 확인하세요. token은 이 앱에 입력하지 않습니다."));
  return issues;
}

function policyIssues(readiness, now) {
  const policy = readiness.policy;
  const issues = [];
  if (!httpsUrl(policy.url)) issues.push(readableReason("POLICY_URL_REQUIRED", "공식 정책 URL을 입력하세요."));
  if (!dateIsCurrent(policy.verifiedAt, now)) issues.push(readableReason("POLICY_VERIFIED_AT_REQUIRED", "정책 확인일을 오늘 또는 과거 날짜로 기록하세요."));
  if (policyStatus(readiness.platform, { now, policyVerifiedAt: policy.verifiedAt }) === "needs_reverify") {
    issues.push(readableReason("POLICY_REVERIFY_REQUIRED", "정책 확인일이 없거나 만료되었습니다. 공식 정책을 다시 확인하세요."));
  }
  return issues;
}

function assetIssues(readiness) {
  const schema = platformReadinessSchema(readiness.platform);
  if (!schema.requiresAsset) return [];
  const asset = readiness.asset;
  if (!asset) return [readableReason("ASSET_REQUIRED", "이 플랫폼에는 검증된 이미지 또는 세로 영상 자산이 필요합니다.")];
  const issues = [];
  if (!HASH_RE.test(asset.hash)) issues.push(readableReason("ASSET_HASH_REQUIRED", "파일 SHA-256 hash를 확인하세요."));
  if (!IMAGE_MIME_TYPES.has(asset.mimeType) && !VIDEO_MIME_TYPES.has(asset.mimeType)) issues.push(readableReason("ASSET_FORMAT_INVALID", "지원되는 이미지 또는 영상 형식이 필요합니다."));
  if (!Number.isSafeInteger(asset.sizeBytes) || asset.sizeBytes <= 0 || asset.sizeBytes > 2 * 1024 * 1024 * 1024) issues.push(readableReason("ASSET_SIZE_INVALID", "자산 파일 크기를 확인하세요."));
  if (!Number.isSafeInteger(asset.width) || asset.width < 1 || !Number.isSafeInteger(asset.height) || asset.height < 1) issues.push(readableReason("ASSET_DIMENSIONS_REQUIRED", "자산 해상도를 확인하세요."));
  if (asset.altText.length < 3) issues.push(readableReason("ASSET_ALT_TEXT_REQUIRED", "대체 텍스트 또는 접근성 설명을 3자 이상 입력하세요."));
  if (!asset.rightsConfirmed) issues.push(readableReason("ASSET_RIGHTS_REQUIRED", "자산 권리·사용 허가를 확인하세요."));
  if (schema.requiresPublicAssetUrl && !httpsUrl(asset.publicUrl)) issues.push(readableReason("ASSET_PUBLIC_URL_REQUIRED", "이 플랫폼에는 공개 HTTPS 자산 URL이 필요합니다."));
  if (readiness.platform === "shorts" && asset.height < asset.width) issues.push(readableReason("VERTICAL_ASSET_REQUIRED", "YouTube Shorts에는 세로형 자산이 필요합니다."));
  return issues;
}

function manualOperationIssues(channel, operationInputs = {}) {
  const profile = channelProfile(channel);
  const typed = validateTypedInputs(channel, operationInputs, { scope: "operations" })
    .map((issue) => readableReason(issue.code ?? "MANUAL_OPERATION_REQUIRED", issue.message));
  const typedKeys = new Set(requiredOperationInputs(channel));
  const generic = (profile?.prepublishGates ?? [])
    .filter((gate) => !typedKeys.has(gate.key))
    .filter((gate) => operationInputs?.[gate.key] !== true)
    .map((gate) => readableReason("MANUAL_OPERATION_REQUIRED", gate.message));
  return [...typed, ...generic];
}

/**
 * Evaluates external prerequisites without a platform request. `dryRunEligible`
 * means input readiness only; `canStartDryRun` stays false until Phase 3 adds a
 * connector that still has no publish operation.
 */
export function assessPlatformReadiness({ channel, readiness, operationInputs = {}, targetLocale, now = Date.now() } = {}) {
  const platform = platformForChannel(channel);
  if (!platform) return deepFreeze({ status: "blocked", dryRunEligible: false, canStartDryRun: false, issues: [readableReason("INVALID_CHANNEL", "지원하지 않는 채널입니다.")] });
  const normalized = normalizePlatformReadiness(readiness ?? emptyPlatformReadiness(platform));
  if (normalized.platform !== platform) {
    return deepFreeze({ status: "blocked", dryRunEligible: false, canStartDryRun: false, platform, readiness: normalized, issues: [readableReason("PLATFORM_CHANNEL_MISMATCH", "채널과 readiness 플랫폼이 다릅니다.")] });
  }
  const profile = platformProfile(platform);
  const automationBlocked = profile.automationMode === "manual_only" || profile.automationMode === "draft_only";
  const manualIssues = manualOperationIssues(channel, operationInputs);
  const issues = automationBlocked
    ? [...manualIssues]
    : [
      ...policyIssues(normalized, now),
      ...accountIssues(normalized, channel, targetLocale),
      ...developerAppIssues(normalized),
      ...assetIssues(normalized),
    ];
  if (automationBlocked) {
    issues.unshift(readableReason("MANUAL_OR_DRAFT_ONLY", "이 채널은 자동 게시 대상이 아닙니다. 수동 운영 확인만 기록합니다."));
  }
  const dryRunEligible = !automationBlocked && issues.length === 0;
  return deepFreeze({
    status: dryRunEligible ? "ready_for_phase_3" : "blocked",
    platform,
    channel,
    readiness: normalized,
    accountTarget: accountTargetFromReadiness(normalized),
    assetHash: normalized.asset?.hash ?? null,
    credentialVaultStatus: EXTERNAL_CREDENTIAL_VAULT_STATUS,
    dryRunEligible,
    canStartDryRun: false,
    issues: Object.freeze(issues),
  });
}

function markdownValue(value) {
  return String(value ?? "").replace(/[\r\n]+/gu, " ").trim() || "미확인";
}

/** Exports only a sanitized operational checklist; neither raw copy nor credentials are included. */
export function readinessReportMarkdown({ projectName = "프로젝트", repositoryUrl = "", assessment, generatedAt = new Date().toISOString() } = {}) {
  if (!assessment || !isRecord(assessment)) throw new PlatformReadinessError("INVALID_READINESS_REPORT", "readiness 평가 결과가 필요합니다.");
  const ready = assessment.status === "ready_for_phase_3";
  const account = assessment.readiness?.account ?? {};
  const asset = assessment.readiness?.asset;
  const lines = [
    `# ${markdownValue(projectName)} 플랫폼 readiness 보고서`,
    "",
    `생성 시각: ${markdownValue(generatedAt)}`,
    `플랫폼: ${markdownValue(assessment.platform)}`,
    `채널: ${markdownValue(assessment.channel)}`,
    `입력 readiness: ${ready ? "Phase 3 dry-run 사전조건 충족" : "차단"}`,
    "",
    "## 계정·정책 확인",
    `- 공개 profile URL: ${markdownValue(account.profileUrl)}`,
    `- 계정 owner: ${markdownValue(account.owner)}`,
    `- timezone: ${markdownValue(account.timezone)}`,
    `- target locale: ${markdownValue(account.targetLocale)}`,
    `- 정책 확인일: ${markdownValue(assessment.readiness?.policy?.verifiedAt)}`,
    `- 정책 URL: ${markdownValue(assessment.readiness?.policy?.url)}`,
    "",
    "## Developer App·credential 경계",
    `- App 준비 확인: ${assessment.readiness?.developerApp?.configured ? "확인" : "미확인"}`,
    `- 승인 scope: ${(assessment.readiness?.developerApp?.approvedScopes ?? []).map(markdownValue).join(", ") || "미확인"}`,
    `- credential vault: ${EXTERNAL_CREDENTIAL_VAULT_STATUS} (${assessment.readiness?.developerApp?.credentialVaultConfirmed ? "준비 확인" : "미확인"})`,
    "",
    "## 자산",
    `- SHA-256: ${asset?.hash ? markdownValue(asset.hash) : "없음"}`,
    `- 형식·크기·해상도: ${asset ? `${markdownValue(asset.mimeType)} · ${markdownValue(asset.sizeBytes)} bytes · ${markdownValue(asset.width)}×${markdownValue(asset.height)}` : "없음"}`,
    `- 권리 확인: ${asset?.rightsConfirmed ? "확인" : "미확인"}`,
    "",
    "## 차단 사유",
    ...(assessment.issues?.length ? assessment.issues.map((issue) => `- ${markdownValue(issue.code)}: ${markdownValue(issue.message)}`) : ["- 없음"]),
    "",
    "## 안전 경계",
    "- 이 보고서는 인증 비밀값, 비밀번호, 원고 전문을 포함하지 않습니다.",
    "- 이 단계에서는 실제 외부 플랫폼 POST, 업로드, 게시, 예약 요청을 실행하지 않습니다.",
    `- 저장소: ${markdownValue(repositoryUrl)}`,
    "",
  ];
  const report = lines.join("\n");
  if (!noSecretMaterial({ report })) throw new PlatformReadinessError("SENSITIVE_READINESS_REPORT", "보고서에 민감 정보가 포함되어 내보내기를 중단했습니다.");
  return report;
}

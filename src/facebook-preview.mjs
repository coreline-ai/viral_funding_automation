export const FACEBOOK_PREVIEW_SCHEMA_VERSION = "viral-facebook-preview/v1";

const SAFE_HANDLE_RE = /^@?[A-Za-z0-9._-]{2,100}$/u;
const SAFE_GROUP_NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .,&'()_-]{1,99}$/u;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) {
    return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 Facebook 원고가 없습니다. 원문으로 대체하지 않습니다." };
  }
  if (localeStale || approvalStatus === "invalidated") {
    return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. 다시 검토하고 승인하세요." };
  }
  if (approvalStatus === "approved") {
    return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다." };
  }
  return { key: "candidate", label: "후보 · 승인 필요", description: "현재 원고는 게시 전 점검용 후보입니다. 실제 게시 전 사람 승인이 필요합니다." };
}

function safeIdentity(value) {
  const raw = String(value ?? "").trim();
  if (!SAFE_HANDLE_RE.test(raw)) {
    return { handle: "@preview_account", known: false, label: "계정 정보 미확인", initials: "P" };
  }
  const handle = raw.startsWith("@") ? raw : `@${raw}`;
  return {
    handle,
    known: true,
    label: "게시 대상 계정",
    initials: handle.slice(1).replace(/[._-]/gu, "").slice(0, 2).toUpperCase() || "P",
  };
}

function safeGroupName(value) {
  const name = String(value ?? "").trim();
  return SAFE_GROUP_NAME_RE.test(name) ? name : "";
}

function fieldIssues(reelsCaption, groupBody) {
  const issues = [];
  if (!reelsCaption.trim()) issues.push({ code: "EMPTY_REELS_CAPTION", message: "Facebook Reels 캡션이 비어 있습니다." });
  if (!groupBody.trim()) issues.push({ code: "EMPTY_GROUP_BODY", message: "Facebook 그룹 본문이 비어 있습니다." });
  if (reelsCaption.trim() && groupBody.trim() && reelsCaption.trim() === groupBody.trim()) {
    issues.push({ code: "FIELD_COLLAPSE", message: "Reels 캡션과 그룹 본문은 서로 다른 원고여야 합니다." });
  }
  return issues;
}

function issuesForSurface(issues, surface) {
  return issues.filter((issue) => {
    if (issue.code === "FIELD_COLLAPSE") return true;
    if (surface === "reels") return issue.code === "EMPTY_REELS_CAPTION";
    return issue.code === "EMPTY_GROUP_BODY";
  });
}

function mediaReadiness(asset, operationInputs) {
  const originalConfirmed = operationInputs?.originalContentConfirmed === true;
  const hasAsset = Boolean(asset?.hash && asset?.mimeType);
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  const vertical = width > 0 && height >= width;
  if (!originalConfirmed) {
    return { key: "needs_original_confirmation", label: "원본 영상·콘텐츠 확인 필요", description: "게시 전 본인이 만든 원본 세로 영상·콘텐츠인지 확인하세요.", vertical, hasAsset };
  }
  if (!hasAsset) {
    return { key: "needs_asset", label: "세로 영상 자산 미확인", description: "파일은 저장·업로드하지 않습니다. readiness에서 실제 자산 hash와 규격을 확인하세요.", vertical, hasAsset };
  }
  if (!vertical) {
    return { key: "needs_vertical_asset", label: "세로형 자산 확인 필요", description: "Reels 읽기 비율을 판단하려면 세로형 원본 영상인지 확인하세요.", vertical, hasAsset };
  }
  return { key: "ready", label: "세로 원본 자산 확인", description: "이 화면은 파일을 업로드하지 않고 Reels의 읽기 밀도만 보여줍니다.", vertical, hasAsset };
}

function groupReadiness(operationInputs) {
  const groupName = safeGroupName(operationInputs?.groupName);
  const locale = String(operationInputs?.groupLocale ?? "").trim();
  const ruleUrl = String(operationInputs?.ruleUrl ?? "").trim();
  const checkedAt = String(operationInputs?.rulesCheckedAt ?? "").trim();
  const complete = Boolean(groupName && locale && /^https:\/\//iu.test(ruleUrl) && DATE_RE.test(checkedAt));
  return {
    key: complete ? "ready" : "needs_group_context",
    groupName: groupName || "대상 그룹 미확인",
    locale: locale || "그룹 언어 미확인",
    description: complete
      ? "그룹명·언어·규칙 URL·확인일이 기록됐습니다. 실제 게시 전 다시 확인하세요."
      : "그룹명·언어·규칙 URL·확인일을 입력하면 그룹 원고 미리보기를 열 수 있습니다.",
  };
}

/** Local-only Facebook draft preview model. It never receives credentials,
 * account IDs, media URLs, raw files, or performs DOM/network work. */
export function createFacebookPreviewModel({
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  publicHandle = "",
  operationInputs = {},
  asset = null,
} = {}) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields) ? publishFields : {};
  const reelsCaption = typeof fields.reelsCaption === "string" ? fields.reelsCaption : "";
  const groupBody = typeof fields.groupBody === "string" ? fields.groupBody : "";
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const issues = localeAvailable ? fieldIssues(reelsCaption, groupBody) : [];
  const group = groupReadiness(operationInputs);
  const reels = mediaReadiness(asset, operationInputs);

  return deepFreeze({
    schemaVersion: FACEBOOK_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    identity: deepFreeze(safeIdentity(publicHandle)),
    content: deepFreeze({
      reelsCaption,
      groupBody,
      valid: issues.length === 0,
      issues: deepFreeze(issues),
    }),
    reels: deepFreeze({ ...reels, issues: deepFreeze(issuesForSurface(issues, "reels")) }),
    group: deepFreeze({ ...group, issues: deepFreeze(issuesForSurface(issues, "group")) }),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 Facebook Reels·그룹 원고의 게시 전 읽기 흐름을 확인하는 로컬 미리보기입니다. 실제 Facebook 화면·게시물·업로드·게시 예약 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}

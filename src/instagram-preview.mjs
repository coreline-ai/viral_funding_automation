export const INSTAGRAM_PREVIEW_SCHEMA_VERSION = "viral-instagram-preview/v1";
export const INSTAGRAM_COVER_CHARACTER_LIMIT = 42;

const SAFE_HANDLE_RE = /^@?[A-Za-z0-9._-]{2,100}$/u;
const SAFE_PUBLIC_URL_RE = /^https:\/\/[^\s]+$/iu;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) {
    return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 Instagram 원고가 없습니다. 원문으로 대체하지 않습니다." };
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
  if (!SAFE_HANDLE_RE.test(raw)) return { handle: "@preview_account", known: false, label: "계정 정보 미확인" };
  return { handle: raw.startsWith("@") ? raw : `@${raw}`, known: true, label: "게시 대상 계정" };
}

function contentIssues(cover, caption) {
  const issues = [];
  const coverLength = Array.from(cover).length;
  if (!cover.trim()) issues.push({ code: "EMPTY_COVER", message: "Instagram 표지 문구가 비어 있습니다." });
  if (!caption.trim()) issues.push({ code: "EMPTY_CAPTION", message: "Instagram 캡션이 비어 있습니다." });
  if (cover.trim() && caption.trim() && cover.trim() === caption.trim()) {
    issues.push({ code: "FIELD_COLLAPSE", message: "표지 문구와 캡션은 서로 다른 원고여야 합니다." });
  }
  if (coverLength > INSTAGRAM_COVER_CHARACTER_LIMIT) {
    issues.push({
      code: "IG_COVER",
      message: `표지 문구가 ${INSTAGRAM_COVER_CHARACTER_LIMIT}자를 초과했습니다.`,
      current: coverLength,
      limit: INSTAGRAM_COVER_CHARACTER_LIMIT,
    });
  }
  return { coverLength, issues };
}

function mediaReadiness(asset, operationInputs) {
  const originalConfirmed = operationInputs?.originalVideo === true;
  const hasAsset = Boolean(asset?.hash && asset?.mimeType);
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  const vertical = width > 0 && height > width;
  if (!originalConfirmed) {
    return { key: "needs_original_confirmation", label: "원본 세로 영상 확인 필요", description: "실제 게시 전 본인이 사용할 원본 영상인지 직접 확인하세요.", hasAsset, vertical };
  }
  if (!hasAsset) {
    return { key: "needs_asset", label: "세로 영상 자산 미확인", description: "파일을 저장·업로드하지 않습니다. readiness에서 실제 자산 hash와 규격을 확인하세요.", hasAsset, vertical };
  }
  if (!vertical) {
    return { key: "needs_vertical_asset", label: "9:16 세로 자산 확인 필요", description: "현재 자산이 세로형인지 확인한 뒤 줄바꿈과 표지 위치를 검토하세요.", hasAsset, vertical };
  }
  return { key: "ready", label: "세로 원본 자산 확인", description: "이 화면은 파일을 렌더하거나 업로드하지 않고, 원고의 읽기 밀도만 보여줍니다.", hasAsset, vertical };
}

function coverReadiness(operationInputs) {
  const safeAreaConfirmed = operationInputs?.coverSafeArea === true;
  return safeAreaConfirmed
    ? { key: "ready", label: "표지 안전 영역 확인", description: "모바일에서 표지 문구가 잘리지 않는지 직접 확인했습니다." }
    : { key: "needs_safe_area", label: "표지 안전 영역 확인 필요", description: "실제 영상의 모바일 안전 영역에서 표지 문구가 잘리지 않는지 확인하세요." };
}

function profileReadiness(operationInputs) {
  const profileLink = String(operationInputs?.profileLink ?? "").trim();
  return operationInputs?.profileLink === true || SAFE_PUBLIC_URL_RE.test(profileLink)
    ? { key: "ready", label: "프로필 링크 확인", description: "프로필 링크 확인이 기록되었습니다. 실제 게시 직전에 실제 연결을 다시 확인하세요." }
    : { key: "needs_profile_link", label: "프로필 링크 확인 필요", description: "공개 데모 또는 저장소로 연결되는 HTTPS 프로필 링크를 확인하세요." };
}

/**
 * Local-only Instagram Reels draft model. It intentionally projects only
 * copy, safe public handle, and non-secret readiness booleans; it does not
 * accept/render media URLs, credentials, files, profile IDs, or DOM/network.
 */
export function createInstagramPreviewModel({
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
  const cover = typeof fields.cover === "string" ? fields.cover : "";
  const caption = typeof fields.caption === "string" ? fields.caption : "";
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const { coverLength, issues } = localeAvailable ? contentIssues(cover, caption) : { coverLength: Array.from(cover).length, issues: [] };
  const media = mediaReadiness(asset, operationInputs);
  const coverReadinessState = coverReadiness(operationInputs);
  const profile = profileReadiness(operationInputs);

  return deepFreeze({
    schemaVersion: INSTAGRAM_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    identity: deepFreeze(safeIdentity(publicHandle)),
    content: deepFreeze({
      cover,
      caption,
      coverLength,
      coverLimit: INSTAGRAM_COVER_CHARACTER_LIMIT,
      valid: issues.length === 0,
      issues: deepFreeze(issues),
    }),
    media: deepFreeze(media),
    coverReadiness: deepFreeze(coverReadinessState),
    profile: deepFreeze(profile),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 Instagram Reels 원고의 표지·캡션·세로 읽기 폭을 확인하는 로컬 미리보기입니다. 실제 Instagram 화면·게시물·영상 업로드·게시 예약 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}

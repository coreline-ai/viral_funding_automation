export const TIKTOK_PREVIEW_SCHEMA_VERSION = "viral-tiktok-preview/v1";

export const TIKTOK_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ value: "unconfirmed", label: "공개 범위 미확인" }),
  Object.freeze({ value: "public_candidate", label: "전체 공개 후보" }),
  Object.freeze({ value: "friends_candidate", label: "친구 공개 후보" }),
  Object.freeze({ value: "private_candidate", label: "나만 보기 후보" }),
]);

const UNSAFE_BRIEF_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function plainText(value) {
  return typeof value === "string" ? value : "";
}

function safePreviewText(value) {
  const text = plainText(value);
  return UNSAFE_BRIEF_RE.test(text) ? "" : text;
}

function visibilityModel(value) {
  const option = TIKTOK_VISIBILITY_OPTIONS.find((item) => item.value === value)
    ?? TIKTOK_VISIBILITY_OPTIONS[0];
  return {
    key: option.value,
    label: option.label,
    requiresCreatorCheck: option.value === "unconfirmed",
    description: option.value === "unconfirmed"
      ? "실제 계정에서 가능한 공개 범위를 직접 확인하세요. 이 선택지는 API와 동기화하지 않습니다."
      : "로컬 검토 후보입니다. 실제 계정의 가능한 공개 범위와 일치하는지 게시 직전에 확인하세요.",
  };
}

function readinessModel({ assetReviewed, watermarkReviewed }) {
  if (!assetReviewed) {
    return {
      key: "needs_asset_review",
      label: "세로 원본 영상 확인 필요",
      description: "파일을 업로드하거나 렌더하지 않습니다. 사용할 세로 원본 영상과 사용 권한을 직접 확인하세요.",
    };
  }
  if (!watermarkReviewed) {
    return {
      key: "needs_watermark_review",
      label: "워터마크 확인 필요",
      description: "다른 플랫폼 워터마크가 없는 원본인지 실제 영상에서 확인하세요.",
    };
  }
  return {
    key: "reviewed",
    label: "영상 검토 표시됨",
    description: "이 상태는 사용자의 로컬 확인만 뜻합니다. 파일·길이·해상도·음원을 읽거나 추정하지 않습니다.",
  };
}

/**
 * Local-only TikTok manual-brief model. It accepts only session input for a
 * pre-publish visual review; it never produces a post payload, persists the
 * brief, reads a file, or contacts TikTok.
 */
export function createTikTokPreviewModel({ brief = {} } = {}) {
  const source = brief && typeof brief === "object" && !Array.isArray(brief) ? brief : {};
  const rawCaption = plainText(source.caption);
  const rawCover = plainText(source.cover);
  const caption = safePreviewText(rawCaption);
  const cover = safePreviewText(rawCover);
  const issues = [];
  if (!rawCaption.trim()) issues.push({ code: "EMPTY_CAPTION", message: "TikTok 캡션을 직접 입력하세요." });
  if (!rawCover.trim()) issues.push({ code: "EMPTY_COVER", message: "첫 화면 또는 표지 문구를 직접 입력하세요." });
  if (rawCaption && !caption) issues.push({ code: "UNSAFE_CAPTION", message: "캡션에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다." });
  if (rawCover && !cover) issues.push({ code: "UNSAFE_COVER", message: "표지 문구에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다." });
  const visibility = visibilityModel(String(source.visibility ?? ""));
  if (visibility.requiresCreatorCheck) issues.push({ code: "VISIBILITY_UNCONFIRMED", message: "게시 대상 계정에서 가능한 공개 범위를 직접 확인하세요." });
  const media = readinessModel({
    assetReviewed: source.assetReviewed === true,
    watermarkReviewed: source.watermarkReviewed === true,
  });
  if (media.key !== "reviewed") issues.push({ code: media.key.toUpperCase(), message: media.label });
  const empty = !rawCaption.trim() && !rawCover.trim();

  return deepFreeze({
    schemaVersion: TIKTOK_PREVIEW_SCHEMA_VERSION,
    status: deepFreeze(empty
      ? { key: "empty", label: "수동 초안 입력 필요", description: "TikTok은 아직 생성 채널이 아닙니다. 캡션과 첫 화면 문구를 직접 입력하세요." }
      : { key: "manual_candidate", label: "수동 검토 후보", description: "이 초안은 이 브라우저 세션에서만 보이며 실제 게시 준비 완료 상태가 아닙니다." }),
    content: deepFreeze({
      caption,
      cover,
      captionLength: Array.from(caption).length,
      coverLength: Array.from(cover).length,
      valid: issues.length === 0,
      issues: deepFreeze(issues),
    }),
    visibility: deepFreeze(visibility),
    media: deepFreeze(media),
    notice: "이 화면은 TikTok 수동 초안의 세로 읽기 흐름만 확인하는 로컬 미리보기입니다. 실제 TikTok 화면·계정·음원·영상 업로드·게시·예약 또는 API 요청 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}

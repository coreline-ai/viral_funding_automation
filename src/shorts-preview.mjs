export const SHORTS_PREVIEW_SCHEMA_VERSION = "viral-shorts-preview/v1";
export const YOUTUBE_TITLE_CHARACTER_LIMIT = 100;
export const YOUTUBE_DESCRIPTION_CHARACTER_LIMIT = 5000;

const SAFE_HANDLE_RE = /^@?[A-Za-z0-9._-]{2,100}$/u;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) {
    return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 Shorts 원고가 없습니다. 원문으로 대체하지 않습니다." };
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
  if (!SAFE_HANDLE_RE.test(raw)) return { handle: "@preview_channel", known: false, label: "채널 정보 미확인" };
  return { handle: raw.startsWith("@") ? raw : `@${raw}`, known: true, label: "게시 대상 채널" };
}

function textLength(value) {
  return Array.from(value).length;
}

function contentIssues(title, description, shots) {
  const issues = [];
  const titleLength = textLength(title);
  const descriptionLength = textLength(description);
  if (!title.trim()) issues.push({ code: "EMPTY_TITLE", message: "Shorts 제목이 비어 있습니다." });
  if (!description.trim()) issues.push({ code: "EMPTY_DESCRIPTION", message: "Shorts 설명이 비어 있습니다." });
  if (titleLength > YOUTUBE_TITLE_CHARACTER_LIMIT) {
    issues.push({ code: "YT_TITLE_LIMIT", message: `Shorts 제목이 ${YOUTUBE_TITLE_CHARACTER_LIMIT}자를 초과했습니다.`, current: titleLength, limit: YOUTUBE_TITLE_CHARACTER_LIMIT });
  }
  if (descriptionLength > YOUTUBE_DESCRIPTION_CHARACTER_LIMIT) {
    issues.push({ code: "YT_DESCRIPTION_LIMIT", message: `Shorts 설명이 ${YOUTUBE_DESCRIPTION_CHARACTER_LIMIT.toLocaleString("ko-KR")}자를 초과했습니다.`, current: descriptionLength, limit: YOUTUBE_DESCRIPTION_CHARACTER_LIMIT });
  }
  const normalizedShots = shots.map((value, index) => ({ index: index + 1, text: typeof value === "string" ? value : "" }));
  const blankShots = normalizedShots.filter((shot) => !shot.text.trim()).map((shot) => shot.index);
  if (normalizedShots.length === 0) issues.push({ code: "EMPTY_SHOTS", message: "Shorts 샷 자막이 없습니다." });
  else if (blankShots.length > 0) issues.push({ code: "EMPTY_SHOT", message: `${blankShots.join(", ")}번 샷 자막이 비어 있습니다.` });
  if (normalizedShots.length > 0 && normalizedShots.length < 3) {
    issues.push({ code: "SHOT_COUNT", message: "Shorts 샷 자막은 3개 이상이 필요합니다.", current: normalizedShots.length, minimum: 3 });
  }
  return { titleLength, descriptionLength, shots: normalizedShots, issues };
}

function mediaReadiness(asset, operationInputs) {
  const verticalConfirmed = operationInputs?.verticalVideo === true;
  const hasAsset = Boolean(asset?.hash && asset?.mimeType);
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  const verticalOrSquare = width > 0 && height >= width;
  const rightsConfirmed = asset?.rightsConfirmed === true;
  if (!verticalConfirmed) {
    return { key: "needs_vertical_confirmation", label: "세로 영상 검수 필요", description: "실제 1080×1920 세로 영상을 검수했는지 확인하세요.", hasAsset, verticalOrSquare, rightsConfirmed };
  }
  if (!hasAsset) {
    return { key: "needs_asset", label: "영상 자산 미확인", description: "파일을 저장·업로드하지 않습니다. readiness에서 실제 자산 hash와 규격을 확인하세요.", hasAsset, verticalOrSquare, rightsConfirmed };
  }
  if (!verticalOrSquare) {
    return { key: "needs_vertical_asset", label: "세로·정사각형 자산 확인 필요", description: "Shorts 분류를 위해 세로 또는 정사각형 원본인지 실제 파일에서 확인하세요.", hasAsset, verticalOrSquare, rightsConfirmed };
  }
  if (!rightsConfirmed) {
    return { key: "needs_rights_confirmation", label: "영상 권리 확인 필요", description: "사용할 영상·음원·화면 녹화물의 권리와 허가를 확인하세요.", hasAsset, verticalOrSquare, rightsConfirmed };
  }
  return { key: "ready", label: "세로 영상 자산 확인", description: "해상도와 길이는 이 미리보기에서 추정하지 않습니다. 실제 파일을 최종 검수하세요.", hasAsset, verticalOrSquare, rightsConfirmed };
}

/**
 * Local-only YouTube Shorts draft model. It projects copy, non-secret asset
 * readiness and a shot sequence only; it never renders a media file, opens
 * an embed, retains a file path, or performs DOM/network work.
 */
export function createShortsPreviewModel({
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
  const title = typeof fields.title === "string" ? fields.title : "";
  const description = typeof fields.description === "string" ? fields.description : "";
  const shots = Array.isArray(fields.shots) ? fields.shots : [];
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const content = localeAvailable
    ? contentIssues(title, description, shots)
    : { titleLength: textLength(title), descriptionLength: textLength(description), shots: [], issues: [] };
  const media = mediaReadiness(asset, operationInputs);

  return deepFreeze({
    schemaVersion: SHORTS_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    identity: deepFreeze(safeIdentity(publicHandle)),
    content: deepFreeze({
      title,
      description,
      titleLength: content.titleLength,
      titleLimit: YOUTUBE_TITLE_CHARACTER_LIMIT,
      descriptionLength: content.descriptionLength,
      descriptionLimit: YOUTUBE_DESCRIPTION_CHARACTER_LIMIT,
      shots: deepFreeze(content.shots),
      valid: content.issues.length === 0,
      issues: deepFreeze(content.issues),
    }),
    media: deepFreeze(media),
    emptyMessage: status.key === "empty" ? status.description : "",
    notice: "이 화면은 YouTube Shorts 원고의 9:16 읽기 흐름과 샷 순서를 확인하는 로컬 미리보기입니다. 실제 YouTube 화면·영상 재생·채널·업로드·게시 예약 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}

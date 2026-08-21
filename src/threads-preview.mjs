export const THREADS_PREVIEW_SCHEMA_VERSION = "viral-threads-preview/v1";

const SAFE_HANDLE_RE = /^@?[A-Za-z0-9._-]{2,100}$/u;
const MAX_POSTS = 3;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function normalizedHandle(value) {
  const handle = String(value ?? "").trim();
  if (!SAFE_HANDLE_RE.test(handle)) return "@preview_account";
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function previewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) {
    return { key: "empty", label: "대상 언어 원고 없음", description: "선택한 언어의 원고가 없습니다. 원문으로 대체하지 않습니다." };
  }
  if (localeStale || approvalStatus === "invalidated") {
    return { key: "stale", label: "수정으로 승인 무효", description: "현재 원고가 승인 snapshot과 다릅니다. 다시 검토하고 승인하세요." };
  }
  if (approvalStatus === "approved") {
    return { key: "approved", label: "승인 snapshot과 일치", description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다." };
  }
  return { key: "candidate", label: "후보 · 승인 필요", description: "현재 원고는 미리보기용 후보입니다. 실제 게시 전 사람 승인이 필요합니다." };
}

/**
 * Builds a safe, immutable, local-only representation of a Threads post
 * sequence. It intentionally accepts no credentials, account IDs, URLs, or
 * asset data and performs no DOM or network work.
 */
export function createThreadsPreviewModel({
  posts = [],
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  publicHandle = "",
} = {}) {
  const status = previewStatus({ localeAvailable, localeStale, approvalStatus });
  const safePosts = Array.isArray(posts) && posts.every((post) => typeof post === "string")
    ? posts
    : [];
  const hasValidPostCount = safePosts.length >= 1 && safePosts.length <= MAX_POSTS;
  const hasPostText = safePosts.every((post) => post.length > 0);
  const isRenderable = status.key !== "empty" && hasValidPostCount && hasPostText;
  const handle = normalizedHandle(publicHandle);
  const identityKnown = SAFE_HANDLE_RE.test(String(publicHandle ?? "").trim());
  const total = isRenderable ? safePosts.length : 0;

  const cards = isRenderable
    ? safePosts.map((text, index) => ({
      index: index + 1,
      total,
      sequenceLabel: `연속 게시 계획 · ${index + 1}/${total}`,
      text,
    }))
    : [];

  const emptyMessage = status.key === "empty"
    ? status.description
    : !hasValidPostCount
      ? "Threads 미리보기에는 1~3개의 게시물 원고가 필요합니다."
      : !hasPostText
        ? "비어 있는 게시물 원고는 미리보기로 표시하지 않습니다."
        : "";

  return deepFreeze({
    schemaVersion: THREADS_PREVIEW_SCHEMA_VERSION,
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    identity: deepFreeze({
      handle,
      known: identityKnown,
      label: identityKnown ? "게시 계정" : "계정 정보 미확인",
      avatarText: handle.replace(/^@/u, "").slice(0, 1).toUpperCase() || "P",
    }),
    sequenceLabel: total > 0 ? `연속 게시 계획 · ${total}개` : "연속 게시 계획",
    cards: deepFreeze(cards),
    emptyMessage,
    notice: "비공식 Threads 스타일 미리보기 · 실제 화면은 계정·지역·서비스 버전에 따라 달라질 수 있습니다.",
    externalWriteCount: 0,
  });
}

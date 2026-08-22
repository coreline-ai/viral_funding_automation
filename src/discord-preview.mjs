export const DISCORD_PREVIEW_SCHEMA_VERSION = "viral-discord-preview/v1";
export const DISCORD_MESSAGE_MAX_LENGTH = 2_000;
export const DISCORD_EMBED_TEXT_MAX_LENGTH = 6_000;

const UNSAFE_BRIEF_RE = /(?:bearer\s+[a-z0-9._~+\-/=]{12,}|(?:access|refresh)?[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|(?:\/Users\/|\/Volumes\/|C:\\Users\\))/iu;
const MENTION_CANDIDATE_RE = /(?:@everyone|@here|<@!?\d+>|<@&\d+>)/giu;

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

function countCharacters(value) {
  return Array.from(value).length;
}

function safeText(value) {
  const text = plainText(value);
  return UNSAFE_BRIEF_RE.test(text) ? "" : text;
}

function safeHttpsUrl(value) {
  const text = safeText(value).trim();
  if (!text) return "";
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function mentionCandidates(value) {
  return Array.from(new Set(plainText(value).match(MENTION_CANDIDATE_RE) ?? []));
}

/**
 * Session-only Discord message review. This is intentionally a local proof
 * surface: it never builds a send payload, resolves a mention, reads a server,
 * or stores any account/endpoint credential.
 */
export function createDiscordPreviewModel({ brief = {} } = {}) {
  const source = brief && typeof brief === "object" && !Array.isArray(brief) ? brief : {};
  const rawTargetAlias = plainText(source.targetAlias);
  const rawMessage = plainText(source.message);
  const rawEmbedTitle = plainText(source.embedTitle);
  const rawEmbedDescription = plainText(source.embedDescription);
  const rawEmbedUrl = plainText(source.embedUrl);
  const targetAlias = safeText(rawTargetAlias).trim();
  const message = safeText(rawMessage);
  const embedTitle = safeText(rawEmbedTitle);
  const embedDescription = safeText(rawEmbedDescription);
  const embedUrl = safeHttpsUrl(rawEmbedUrl);
  const issues = [];

  if (!rawTargetAlias.trim()) issues.push({ code: "TARGET_ALIAS_REQUIRED", message: "대상 채널 별칭을 로컬 표시용으로 입력하세요." });
  if (rawTargetAlias && !targetAlias) issues.push({ code: "UNSAFE_TARGET_ALIAS", message: "대상 별칭에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (!rawMessage.trim()) issues.push({ code: "MESSAGE_REQUIRED", message: "메시지를 직접 입력하세요." });
  if (rawMessage && !message) issues.push({ code: "UNSAFE_MESSAGE", message: "메시지에 credential 또는 개인 경로처럼 보이는 값이 있어 미리보기에 표시하지 않습니다." });

  const messageLength = countCharacters(message);
  if (messageLength > DISCORD_MESSAGE_MAX_LENGTH) {
    issues.push({ code: "MESSAGE_TOO_LONG", message: `메시지는 ${DISCORD_MESSAGE_MAX_LENGTH.toLocaleString("ko-KR")}자 이하여야 합니다.` });
  }

  const rawEmbedEntered = Boolean(rawEmbedTitle.trim() || rawEmbedDescription.trim() || rawEmbedUrl.trim());
  const safeEmbedTextLength = countCharacters(embedTitle) + countCharacters(embedDescription);
  if (rawEmbedTitle && !embedTitle) issues.push({ code: "UNSAFE_EMBED_TITLE", message: "추가 정보 제목에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (rawEmbedDescription && !embedDescription) issues.push({ code: "UNSAFE_EMBED_DESCRIPTION", message: "추가 정보 설명에 credential 또는 개인 경로처럼 보이는 값이 있어 표시하지 않습니다." });
  if (rawEmbedUrl.trim() && !embedUrl) issues.push({ code: "INVALID_EMBED_URL", message: "추가 정보 링크는 공개 HTTPS URL만 표시할 수 있습니다." });
  if (safeEmbedTextLength > DISCORD_EMBED_TEXT_MAX_LENGTH) {
    issues.push({ code: "EMBED_TEXT_TOO_LONG", message: `추가 정보 텍스트는 ${DISCORD_EMBED_TEXT_MAX_LENGTH.toLocaleString("ko-KR")}자 이하여야 합니다.` });
  }

  // Inspect the raw input for @ candidates even when unsafe content is
  // suppressed from the preview. A rejected secret-looking message must not
  // accidentally hide a separate mention review requirement.
  const mentions = mentionCandidates(rawMessage);
  if (mentions.length && source.mentionReviewed !== true) {
    issues.push({ code: "MENTION_REVIEW_REQUIRED", message: "@ 후보가 있습니다. 실제 채널의 알림 영향과 규칙을 직접 확인한 뒤 표시하세요." });
  }

  const empty = !rawTargetAlias.trim() && !rawMessage.trim() && !rawEmbedEntered;
  const valid = issues.length === 0;
  return deepFreeze({
    schemaVersion: DISCORD_PREVIEW_SCHEMA_VERSION,
    status: deepFreeze(empty
      ? { key: "empty", label: "수동 메시지 입력 필요", description: "Discord는 생성 채널이 아닙니다. 대상 별칭과 메시지를 직접 입력하세요." }
      : valid
        ? { key: "manual_candidate", label: "수동 검토 후보", description: "이 화면은 로컬 줄바꿈·길이·알림 후보 검토용이며 실제 전송 준비 완료 상태가 아닙니다." }
        : { key: "needs_input", label: "입력·규칙 확인 필요", description: "아래 항목을 보완한 뒤 실제 채널의 권한과 규칙을 따로 확인하세요." }),
    content: deepFreeze({
      targetAlias,
      message,
      messageLength,
      messageRemaining: DISCORD_MESSAGE_MAX_LENGTH - messageLength,
      valid,
      issues: deepFreeze(issues),
    }),
    mentionSafety: deepFreeze({
      candidates: deepFreeze(mentions),
      mode: "none",
      reviewed: source.mentionReviewed === true,
      description: mentions.length
        ? "표시된 @ 후보는 이 화면에서 누구에게도 알림을 보내지 않습니다. 실제 전송 권한·알림 대상은 별도로 확인해야 합니다."
        : "알림 대상 없음으로 검토합니다. 실제 Discord 기본 동작이나 권한을 이 화면이 대신 결정하지 않습니다.",
    }),
    extra: deepFreeze({
      entered: rawEmbedEntered,
      title: embedTitle,
      description: embedDescription,
      url: embedUrl,
      textLength: safeEmbedTextLength,
      textRemaining: DISCORD_EMBED_TEXT_MAX_LENGTH - safeEmbedTextLength,
    }),
    notice: "이 화면은 Discord 메시지의 읽기 폭과 길이·알림 후보만 확인하는 로컬 미리보기입니다. 실제 Discord 화면·서버·계정·반응·첨부·전송·예약 또는 API 요청 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}

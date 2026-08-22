import { countXWeightedCharacters } from "./x-text.mjs";

export const X_PREVIEW_SCHEMA_VERSION = "viral-x-review/v1";

const X_CHANNELS = new Set(["x1", "x2", "x3", "xThread"]);
const X_SINGLE_CHANNELS = new Set(["x1", "x2", "x3"]);
const X_HANDLE_RE = /^@?[A-Za-z0-9_]{4,15}$/u;
const URL_RE = /https?:\/\/[^\s)\]]+/giu;
const X_WEIGHT_LIMIT = 280;
const X_THREAD_MIN_SEGMENTS = 3;

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function safeHandle(value) {
  const raw = String(value ?? "").trim();
  if (!X_HANDLE_RE.test(raw)) {
    return {
      handle: "@preview_account",
      known: false,
      label: "계정 정보 미확인",
      initials: "@",
    };
  }
  const handle = raw.startsWith("@") ? raw : `@${raw}`;
  const characters = handle.slice(1).replace(/_/gu, "").slice(0, 2).toUpperCase();
  return {
    handle,
    known: true,
    label: "게시 대상 계정(로컬 readiness)",
    initials: characters || "@",
  };
}

function reviewStatus({ localeAvailable, localeStale, approvalStatus }) {
  if (!localeAvailable) {
    return {
      key: "empty",
      label: "대상 언어 원고 없음",
      description: "선택한 언어의 X 원고가 없습니다. 원문으로 대체하지 않습니다.",
    };
  }
  if (localeStale || approvalStatus === "invalidated") {
    return {
      key: "stale",
      label: "수정으로 승인 무효",
      description: "현재 원고가 승인 snapshot과 다릅니다. 다시 검토하고 승인하세요.",
    };
  }
  if (approvalStatus === "approved") {
    return {
      key: "approved",
      label: "승인 snapshot과 일치",
      description: "현재 원고와 승인 snapshot의 게시 필드가 일치합니다.",
    };
  }
  return {
    key: "candidate",
    label: "후보 · 승인 필요",
    description: "현재 원고는 게시 전 점검용 후보입니다. 실제 게시 전 사람 승인이 필요합니다.",
  };
}

function sourceItems(channel, publishFields) {
  const fields = publishFields && typeof publishFields === "object" && !Array.isArray(publishFields)
    ? publishFields
    : {};
  if (X_SINGLE_CHANNELS.has(channel)) {
    return typeof fields.body === "string" ? [fields.body] : [];
  }
  if (channel === "xThread") {
    return Array.isArray(fields.segments)
      ? fields.segments.map((segment) => typeof segment === "string" ? segment : "")
      : [];
  }
  return [];
}

function normalizedUrlCount(value) {
  return [...String(value ?? "").matchAll(URL_RE)].length;
}

function contentIssues(channel, items) {
  const issues = [];
  if (!X_CHANNELS.has(channel)) {
    issues.push({ code: "INVALID_CHANNEL", message: "X 게시 전 점검에서 지원하지 않는 채널입니다." });
    return issues;
  }
  if (items.length === 0) {
    issues.push({
      code: "EMPTY_FIELD",
      message: X_SINGLE_CHANNELS.has(channel) ? "X 게시 본문이 비어 있습니다." : "X 스레드 구간이 비어 있습니다.",
    });
    return issues;
  }
  if (channel === "xThread" && items.length < X_THREAD_MIN_SEGMENTS) {
    issues.push({ code: "ARRAY_LENGTH", message: "X 스레드는 최소 3개 구간이 필요합니다." });
  }
  items.forEach((item, index) => {
    if (!item.trim()) {
      issues.push({
        code: "EMPTY_FIELD",
        field: channel === "xThread" ? `segments.${index}` : "body",
        message: channel === "xThread" ? `스레드 ${index + 1}구간이 비어 있습니다.` : "X 게시 본문이 비어 있습니다.",
      });
    }
    const weightedLength = countXWeightedCharacters(item.trim());
    if (weightedLength > X_WEIGHT_LIMIT) {
      issues.push({
        code: "X_LIMIT",
        field: channel === "xThread" ? `segments.${index}` : "body",
        message: channel === "xThread"
          ? `스레드 ${index + 1}구간이 280 가중자를 초과했습니다.`
          : "X 게시 본문이 280 가중자를 초과했습니다.",
        current: weightedLength,
        limit: X_WEIGHT_LIMIT,
      });
    }
  });
  return issues;
}

/**
 * Produces a local, read-only X draft review model. This is intentionally not
 * an X Post renderer: it accepts no credentials or IDs and performs no I/O.
 */
export function createXPreviewModel({
  channel = "",
  publishFields = {},
  locale = "",
  localeAvailable = true,
  localeStale = false,
  approvalStatus = "unreviewed",
  publicHandle = "",
} = {}) {
  const items = sourceItems(channel, publishFields);
  const status = reviewStatus({ localeAvailable, localeStale, approvalStatus });
  // A missing target locale is a locale state, not an invalid empty X post.
  // Keep its blank panel focused on the explicit no-fallback instruction.
  const issues = localeAvailable ? contentIssues(channel, items) : [];
  const isThread = channel === "xThread";
  const cards = status.key === "empty"
    ? []
    : items.map((text, index) => {
      const weightedLength = countXWeightedCharacters(text.trim());
      const remaining = X_WEIGHT_LIMIT - weightedLength;
      return {
        index: index + 1,
        total: items.length,
        kind: isThread ? "thread_segment" : "single",
        sequenceLabel: isThread ? `스레드 원고 계획 · ${index + 1}/${items.length}` : "단일 원고",
        draftLabel: isThread ? `연속 원고 · ${index + 1}/${items.length}` : "원고 초안 · 게시 전",
        text,
        weightedLength,
        limit: X_WEIGHT_LIMIT,
        remaining,
        overLimit: remaining < 0,
        urlCount: normalizedUrlCount(text),
      };
    });
  const emptyMessage = status.key === "empty"
    ? status.description
    : items.length === 0
      ? (X_SINGLE_CHANNELS.has(channel) ? "X 게시 본문이 비어 있습니다." : "X 스레드 구간이 비어 있습니다.")
      : "";

  return deepFreeze({
    schemaVersion: X_PREVIEW_SCHEMA_VERSION,
    channel: X_CHANNELS.has(channel) ? channel : "",
    kind: isThread ? "thread" : "single",
    locale: String(locale ?? ""),
    status: deepFreeze(status),
    content: deepFreeze({
      valid: issues.length === 0,
      issues: deepFreeze(issues),
    }),
    identity: deepFreeze(safeHandle(publicHandle)),
    cards: deepFreeze(cards),
    emptyMessage,
    notice: "이 화면은 게시 전 원고·길이 검토 도구입니다. 실제 X 화면·X 게시물·게시 예약 기능이 아닙니다.",
    externalWriteCount: 0,
  });
}

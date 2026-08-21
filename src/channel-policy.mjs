import { channelProfile, preferredProvider, requiredAuthorInputs } from "./channel-profiles.mjs";
import { CHANNEL_KEYS, channelSpec, publishLooksInternal } from "./drafts.mjs";
import { channelAutomationPolicy, platformReadinessList } from "./platform-registry.mjs";

const OPS_LANGUAGE = [
  /HOLD\s*—/,
  /\[게시 전[^\]]*\]/,
  /작성자가 직접/,
  /## 게시 전 확인/,
  /Status:\s*`?HOLD/i,
  /운영 게이트/,
  /수동 확인 체크리스트/,
  /게시 금지/,
];

const DEV_PROMO = [
  /\bjust launched\b/i,
  /\bcheck out my\b/i,
  /\bplease follow\b/i,
  /\bplease clap\b/i,
  /\blaunch day\b/i,
  /지금 출시/,
  /팔로우/,
];

function flattenText(fields) {
  const parts = [];
  const walk = (value) => {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(fields);
  return parts.join("\n");
}

function firstLine(value) {
  return String(value ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
}

function normalizeHook(value) {
  return firstLine(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ctaLine(value) {
  const lines = String(value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.find((line) => /[?？]/.test(line)) ?? "";
}

export function prepublishGates(channel) {
  return channelProfile(channel)?.prepublishGates ?? [];
}

export function composeHint(channel) {
  return channelProfile(channel)?.composeHint ?? "";
}

export function opsLanguageIssues(fields) {
  const text = flattenText(fields);
  const issues = [];
  if (publishLooksInternal(text)) {
    issues.push({ group: "policy", code: "OPS_LANGUAGE", field: "", message: "게시 필드에 운영 문구·HOLD·체크리스트가 있습니다." });
    return issues;
  }
  for (const pattern of OPS_LANGUAGE) {
    if (pattern.test(text)) {
      issues.push({ group: "policy", code: "OPS_LANGUAGE", field: "", message: "게시 필드에 내부 운영 문구가 있습니다." });
      break;
    }
  }
  return issues;
}

export function promoIssues(channel, fields) {
  if (channel !== "dev") return [];
  const text = flattenText(fields);
  const issues = [];
  for (const pattern of DEV_PROMO) {
    if (pattern.test(text)) {
      issues.push({ group: "policy", code: "DEV_PROMO", field: "", message: "DEV 게시 필드에 홍보성 문구가 있습니다." });
      break;
    }
  }
  if (fields && typeof fields === "object" && ("title" in fields || "body" in fields)) {
    issues.push({ group: "policy", code: "DEV_ARTICLE", field: "", message: "DEV는 완성 기사 제목·본문을 생성할 수 없습니다." });
  }
  return issues;
}

export function structureIssues(channel, fields = {}) {
  if (channel === "reddit" && fields && (fields.title || fields.body)) {
    return [{ group: "policy", code: "REDDIT_GENERATED_POST", field: "", message: "Reddit은 제목·본문을 생성하지 않습니다." }];
  }
  return [];
}

export function structureWarnings(channel, fields = {}) {
  const warnings = [];
  if (channel === "xThread") {
    const last = Array.isArray(fields.segments) ? fields.segments.at(-1) ?? "" : "";
    if (last && !/[?？]/.test(last)) {
      warnings.push({ group: "quality", code: "MISSING_QUESTION", field: "segments", message: "X 스레드 마지막 구간에 구체 질문이 없습니다." });
    }
  }
  if (channel === "threads") {
    const last = Array.isArray(fields.posts) ? fields.posts.at(-1) ?? "" : "";
    if (last && !/[?？]/.test(last)) {
      warnings.push({ group: "quality", code: "MISSING_QUESTION", field: "posts", message: "Threads 마지막 게시에 구체 질문이 없습니다." });
    }
  }
  return warnings;
}

export function prepublishWarnings(channel) {
  return prepublishGates(channel).map((gate) => ({
    group: "prepublish",
    code: "PREPUBLISH_GATE",
    field: gate.key,
    message: gate.message,
  }));
}

export function repeatQualityWarnings(channelFields = {}) {
  const hooks = new Map();
  const ctas = new Map();
  const features = new Map();
  for (const [channel, fields] of Object.entries(channelFields)) {
    if (channel === "showHn") continue;
    const text = flattenText(fields);
    const hook = normalizeHook(text);
    if (hook.length >= 12) {
      const list = hooks.get(hook) ?? [];
      list.push(channel);
      hooks.set(hook, list);
    }
    const cta = normalizeHook(ctaLine(text));
    if (cta.length >= 8) {
      const list = ctas.get(cta) ?? [];
      list.push(channel);
      ctas.set(cta, list);
    }
    for (const line of String(text).split(/\r?\n/)) {
      const feature = normalizeHook(line.replace(/^[-*•]\s*/, ""));
      if (feature.length >= 16 && /^[-*•]/.test(line.trim())) {
        const list = features.get(feature) ?? [];
        list.push(channel);
        features.set(feature, list);
      }
    }
  }
  const warnings = [];
  for (const [hook, channels] of hooks) {
    if (channels.length >= 3) {
      warnings.push({ group: "quality", code: "REPEATED_HOOK", field: hook, message: `같은 첫 문장이 ${channels.length}개 채널에 반복됩니다.`, channels });
    }
  }
  for (const [cta, channels] of ctas) {
    if (channels.length >= 3) {
      warnings.push({ group: "quality", code: "REPEATED_CTA", field: cta, message: `같은 질문이 ${channels.length}개 채널에 반복됩니다.`, channels });
    }
  }
  for (const [feature, channels] of features) {
    if (new Set(channels).size >= 3) {
      warnings.push({ group: "quality", code: "REPEATED_FEATURE", field: feature, message: `같은 기능 문구가 ${new Set(channels).size}개 채널에 반복됩니다.`, channels: [...new Set(channels)] });
    }
  }
  return warnings;
}

export function policyMatrix() {
  return Object.fromEntries(CHANNEL_KEYS.map((channel) => {
    const spec = channelSpec(channel);
    const automation = channelAutomationPolicy(channel);
    return [channel, {
      channel,
      status: spec.status,
      translationPolicy: spec.translationPolicy,
      supportMode: channelProfile(channel)?.supportMode,
      defaultLocale: channelProfile(channel)?.defaultLocale,
      supportedLocales: channelProfile(channel)?.supportedLocales,
      preferredProvider: preferredProvider(channel),
      requiredAuthorInputs: requiredAuthorInputs(channel),
      publishFields: spec.fields,
      prepublishGates: prepublishGates(channel).map((gate) => gate.key),
      automation,
    }];
  }));
}

// Platform-level inventory intentionally remains separate from the 18 draft
// variants: X has four content variants but one future platform connector.
export function platformAutomationMatrix(options = {}) {
  return Object.fromEntries(platformReadinessList(options).map((profile) => [profile.id, profile]));
}

export function reviewPolicyMatchesHold() {
  const matrix = policyMatrix();
  const hold = CHANNEL_KEYS.filter((channel) => matrix[channel].status === "hold");
  const draftOnly = CHANNEL_KEYS.filter((channel) => matrix[channel].translationPolicy === "draftOnly");
  const manual = CHANNEL_KEYS.filter((channel) => matrix[channel].translationPolicy === "disabled");
  return { hold, draftOnly, manual };
}

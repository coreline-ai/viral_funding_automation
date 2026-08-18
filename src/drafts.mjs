import { channelProfile, requiredAuthorInputs } from "./channel-profiles.mjs";
import { countXWeightedCharacters } from "./x-text.mjs";

export const DRAFT_SCHEMA_VERSION = "viral-draft/v1";
export const DOCUMENTS_SCHEMA_VERSION = "viral-documents/v1";
export const SOURCE_LOCALE = "ko-KR";

export const CHANNEL_KEYS = Object.freeze([
  "x1", "x2", "x3", "xThread", "threads", "reddit", "linkedin", "disquiet",
  "facebook", "instagram", "productHunt", "peerlist", "indieHackers", "okky",
  "geeknews", "dev", "shorts", "showHn",
]);

function channelDef(status, translationPolicy, fieldTypes) {
  const fields = Object.keys(fieldTypes);
  return Object.freeze({
    status,
    translationPolicy,
    fields,
    required: fields,
    fieldTypes: Object.freeze(fieldTypes),
  });
}

export const CHANNEL_REGISTRY = Object.freeze({
  x1: channelDef("draft", "allowed", { body: "string" }),
  x2: channelDef("draft", "allowed", { body: "string" }),
  x3: channelDef("draft", "allowed", { body: "string" }),
  xThread: channelDef("draft", "allowed", { segments: "string[]" }),
  threads: channelDef("draft", "allowed", { posts: "string[]" }),
  linkedin: channelDef("draft", "allowed", { body: "string" }),
  okky: channelDef("gate", "allowed", { title: "string", body: "string" }),
  geeknews: channelDef("gate", "allowed", { title: "string", body: "string" }),
  disquiet: channelDef("gate", "allowed", {
    productName: "string",
    tagline: "string",
    productLink: "string",
    postBody: "string",
  }),
  facebook: channelDef("gate", "allowed", { reelsCaption: "string", groupBody: "string" }),
  instagram: channelDef("gate", "allowed", { cover: "string", caption: "string" }),
  shorts: channelDef("gate", "allowed", { title: "string", description: "string", shots: "string[]" }),
  productHunt: channelDef("hold", "allowed", {
    name: "string",
    tagline: "string",
    description: "string",
    firstComment: "string",
  }),
  peerlist: channelDef("hold", "allowed", { name: "string", tagline: "string", comment: "string" }),
  indieHackers: channelDef("hold", "allowed", { title: "string", body: "string" }),
  reddit: channelDef("hold", "draftOnly", { facts: "object" }),
  dev: channelDef("hold", "draftOnly", { facts: "object" }),
  showHn: channelDef("hold", "disabled", {}),
});

const LABELS = {
  title: "제목",
  body: "본문",
  productName: "제품명",
  tagline: "한 줄 소개",
  productLink: "제품 링크",
  postBody: "연결 포스트",
  reelsCaption: "Reels 캡션",
  groupBody: "그룹 본문",
  cover: "표지",
  caption: "캡션",
  description: "설명",
  name: "제품명",
  firstComment: "Maker 첫 댓글",
  comment: "Maker 댓글",
  shots: "샷 자막",
};

function emptyInternal() {
  return {
    checklists: [],
    warnings: [],
    placeholders: [],
    policyUrls: [],
    notes: [],
    authorReady: false,
    authorInputs: {},
    previousEnglish: null,
    lastReview: null,
    prepublish: [],
  };
}

export function isChannelKey(value) {
  return CHANNEL_KEYS.includes(value);
}

export function channelSpec(channel) {
  return CHANNEL_REGISTRY[channel] ?? null;
}

export function publishFieldType(channel, field) {
  return channelSpec(channel)?.fieldTypes?.[field] ?? "string";
}

export function fieldContract(channel) {
  return (channelSpec(channel)?.fields ?? []).map((field) => `${field}:${publishFieldType(channel, field)}`);
}

export function jsonSchemaForFieldType(kind) {
  if (kind === "string[]") return { type: "array", items: { type: "string" }, minItems: 1 };
  if (kind === "object") return { type: "object" };
  return { type: "string" };
}

export function publishFieldsJsonSchema(channel) {
  const spec = channelSpec(channel);
  const fields = spec?.fields ?? [];
  return {
    type: "object",
    additionalProperties: false,
    required: fields,
    properties: Object.fromEntries(fields.map((field) => [
      field,
      jsonSchemaForFieldType(publishFieldType(channel, field)),
    ])),
  };
}

export function matchesFieldContract(channel, fields) {
  const spec = channelSpec(channel);
  if (!spec || !fields || typeof fields !== "object" || Array.isArray(fields)) return false;
  const keys = Object.keys(fields);
  if (keys.length !== spec.fields.length || spec.fields.some((field) => !keys.includes(field))) return false;
  return spec.fields.every((field) => {
    const kind = publishFieldType(channel, field);
    const value = fields[field];
    if (kind === "string[]") return Array.isArray(value) && value.every((item) => typeof item === "string") && value.length > 0;
    if (kind === "object") return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    return typeof value === "string";
  });
}

export function coerceStoredPublishFields(channel, fields) {
  if (matchesFieldContract(channel, fields)) return fields;
  const raw = typeof fields === "string"
    ? fields
    : (!matchesFieldContract(channel, fields) && typeof fields?.body === "string" && Object.keys(fields).length === 1
      ? fields.body
      : null);
  if (raw == null) return fields;
  const parsed = parsePublish(channel, raw);
  return matchesFieldContract(channel, parsed) ? parsed : fields;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function canonicalPublishJson(fields) {
  return JSON.stringify(sortValue(fields ?? {}));
}

export function hashPublishFields(fields) {
  const text = canonicalPublishJson(fields);
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function emptyFields(channel) {
  const spec = channelSpec(channel);
  if (!spec || spec.fields.length === 0) return {};
  return Object.fromEntries(spec.fields.map((field) => {
    const kind = publishFieldType(channel, field);
    if (kind === "string[]") return [field, []];
    if (kind === "object") {
      return [field, { name: "", description: "", demoUrl: "", repositoryUrl: "", license: "", features: [] }];
    }
    return [field, ""];
  }));
}

export function createDraftDocument(channel, options = {}) {
  const spec = channelSpec(channel);
  if (!spec) throw new TypeError(`지원하지 않는 채널입니다: ${channel}`);
  return {
    channel,
    schemaVersion: DRAFT_SCHEMA_VERSION,
    status: options.status ?? spec.status,
    sourceLocale: options.sourceLocale ?? SOURCE_LOCALE,
    translationPolicy: options.translationPolicy ?? spec.translationPolicy,
    publishFields: options.publishFields ?? emptyFields(channel),
    internal: {
      ...emptyInternal(),
      prepublish: (channelProfile(channel)?.prepublishGates ?? []).map((gate) => gate.key),
      ...options.internal,
      authorReady: Boolean(options.internal?.authorReady),
    },
    profile: channelProfile(channel),
  };
}

function isBlank(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function flattenFields(fields) {
  const parts = [];
  const walk = (value) => {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(fields);
  return parts.join("\n");
}

function isLegacyBlob(channel, fields) {
  const spec = channelSpec(channel);
  if (!spec || !fields || typeof fields !== "object") return false;
  if (spec.fields.length <= 1) return false;
  return typeof fields.body === "string" && spec.fields.some((field) => !(field in fields));
}

function section(title, body) {
  return `## ${title}\n\n${String(body ?? "").trim()}`;
}

export function serializePublish(channel, fields) {
  const spec = channelSpec(channel);
  if (!spec || channel === "showHn") return "";
  const value = fields ?? {};
  if (isLegacyBlob(channel, value)) return String(value.body ?? "");
  if (["x1", "x2", "x3", "linkedin"].includes(channel)) return String(value.body ?? "").replace(/\n$/, "");
  if (channel === "xThread") return (value.segments ?? []).map((item) => String(item).trim()).filter(Boolean).join("\n\n---\n\n");
  if (channel === "threads") return (value.posts ?? []).map((item) => String(item).trim()).filter(Boolean).join("\n\n---\n\n");
  if (channel === "reddit" || channel === "dev") {
    const facts = value.facts ?? {};
    const features = Array.isArray(facts.features) ? facts.features : [];
    return [
      `프로젝트명: ${facts.name ?? ""}`,
      `프로젝트 설명: ${facts.description ?? ""}`,
      `공개 데모: ${facts.demoUrl || "없음"}`,
      `소스: ${facts.repositoryUrl ?? ""}`,
      `라이선스: ${facts.license ?? ""}`,
      "",
      ...features.map((item) => `- ${item}`),
    ].join("\n").trim();
  }
  if (channel === "shorts") {
    const shots = (value.shots ?? []).map((item, index) => `${index + 1}. ${item}`).join("\n");
    return [section("제목", value.title), section("설명", value.description), section("샷 자막", shots)].join("\n\n");
  }
  return spec.fields
    .filter((field) => !["shots", "segments", "posts", "facts"].includes(field))
    .map((field) => section(LABELS[field] ?? field, value[field]))
    .join("\n\n");
}

function parseSections(text) {
  const sections = [];
  let current = null;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) sections.push(current);
  return sections.map((item) => ({ title: item.title, body: item.body.join("\n").trim() }));
}

function findSection(sections, titles) {
  const wanted = titles.map((title) => title.toLowerCase());
  return sections.find((item) => wanted.includes(item.title.toLowerCase()))?.body ?? "";
}

export function parsePublish(channel, text) {
  const spec = channelSpec(channel);
  if (!spec || channel === "showHn") return {};
  const raw = String(text ?? "");
  if (["x1", "x2", "x3", "linkedin"].includes(channel)) {
    return { body: raw.replace(/\s+$/u, raw.endsWith("\n") ? "\n" : "") };
  }
  if (channel === "xThread") return { segments: raw.split(/\n\s*---\s*\n/u).map((item) => item.trim()).filter(Boolean) };
  if (channel === "threads") return { posts: raw.split(/\n\s*---\s*\n/u).map((item) => item.trim()).filter(Boolean) };
  if (channel === "reddit" || channel === "dev") {
    const read = (label) => raw.match(new RegExp(`^${label}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
    const demo = read("공개 데모");
    return {
      facts: {
        name: read("프로젝트명"),
        description: read("프로젝트 설명"),
        demoUrl: demo === "없음" ? "" : demo,
        repositoryUrl: read("소스"),
        license: read("라이선스"),
        features: [...raw.matchAll(/^- (.+)$/gm)].map((match) => match[1].trim()),
      },
    };
  }
  const sections = parseSections(raw);
  if (sections.length === 0 && raw.trim()) return { body: raw };
  if (channel === "shorts") {
    const shotText = findSection(sections, ["샷 자막"]);
    return {
      title: findSection(sections, ["제목"]),
      description: findSection(sections, ["설명"]),
      shots: shotText.split(/\r?\n/).map((line) => line.replace(/^\d+\.\s*/, "").trim()).filter(Boolean),
    };
  }
  return Object.fromEntries(spec.fields.map((field) => [field, findSection(sections, [LABELS[field], field])]));
}

function characterCount(value) {
  return Array.from(String(value ?? "")).length;
}

function extractUrls(value) {
  return [...String(value ?? "").matchAll(/https?:\/\/[^\s)\]]+/giu)].map((match) => match[0].replace(/[.,;:]+$/u, ""));
}

export function validatePublish(channel, fields, options = {}) {
  const spec = channelSpec(channel);
  const issues = [];
  if (!spec) return { ok: false, issues: [{ code: "INVALID_CHANNEL", message: "지원하지 않는 채널입니다." }] };
  if (channel === "showHn") {
    return { ok: Object.keys(fields ?? {}).length === 0, issues: Object.keys(fields ?? {}).length ? [{ code: "FORBIDDEN_FIELDS", message: "Show HN에는 게시 필드가 없습니다." }] : [] };
  }
  const value = fields ?? {};
  if (isLegacyBlob(channel, value)) {
    if (isBlank(value.body)) issues.push({ code: "EMPTY_FIELD", field: "body", message: "게시 본문이 비어 있습니다." });
    return { ok: issues.length === 0, issues };
  }
  if (["x1", "x2", "x3"].includes(channel)) {
    if (isBlank(value.body)) issues.push({ code: "EMPTY_FIELD", field: "body", message: "게시 본문이 비어 있습니다." });
    const weighted = countXWeightedCharacters(String(value.body ?? "").trim());
    if (weighted > 280) issues.push({ code: "X_LIMIT", field: "body", message: "X 280 가중자를 초과했습니다.", current: weighted, limit: 280 });
  } else if (channel === "xThread") {
    const segments = Array.isArray(value.segments) ? value.segments : [];
    if (segments.length === 0) issues.push({ code: "EMPTY_FIELD", field: "segments", message: "스레드 구간이 비어 있습니다." });
    segments.forEach((segment, index) => {
      if (isBlank(segment)) issues.push({ code: "EMPTY_FIELD", field: `segments.${index}`, message: `스레드 ${index + 1}구간이 비어 있습니다.` });
      const weighted = countXWeightedCharacters(String(segment).trim());
      if (weighted > 280) issues.push({ code: "X_LIMIT", field: `segments.${index}`, message: `스레드 ${index + 1}구간이 280 가중자를 초과했습니다.`, current: weighted, limit: 280 });
    });
  } else if (channel === "productHunt") {
    for (const field of spec.required) {
      if (isBlank(value[field])) issues.push({ code: "EMPTY_FIELD", field, message: `${LABELS[field]}이 비어 있습니다.` });
    }
    const taglineCount = characterCount(value.tagline);
    if (taglineCount > 60) issues.push({ code: "PH_TAGLINE", field: "tagline", message: "태그라인 60자를 초과했습니다.", current: taglineCount, limit: 60 });
    const descriptionCount = characterCount(value.description);
    if (descriptionCount > 260) issues.push({ code: "PH_DESCRIPTION", field: "description", message: "설명 260자를 초과했습니다.", current: descriptionCount, limit: 260 });
  } else {
    for (const field of spec.required) {
      if (["segments", "posts", "shots"].includes(field)) {
        if (!Array.isArray(value[field]) || value[field].every((item) => isBlank(item))) {
          issues.push({ code: "EMPTY_FIELD", field, message: "필수 게시 필드가 비어 있습니다." });
        }
      } else if (field === "facts") {
        const facts = value.facts ?? {};
        if (isBlank(facts.name) && isBlank(facts.description)) issues.push({ code: "EMPTY_FIELD", field: "facts", message: "검증 사실이 비어 있습니다." });
      } else if (isBlank(value[field])) {
        issues.push({ code: "EMPTY_FIELD", field, message: "필수 게시 필드가 비어 있습니다." });
      }
    }
  }
  const profile = channelProfile(channel);
  const minItems = profile?.lengthRules?.minItems ?? 0;
  if (channel === "xThread" && minItems && Array.isArray(value.segments) && value.segments.length < minItems) {
    issues.push({ code: "ARRAY_LENGTH", field: "segments", message: `X 스레드는 ${minItems}개 구간이 필요합니다.` });
  }
  if (channel === "threads" && minItems && Array.isArray(value.posts) && value.posts.length < minItems) {
    issues.push({ code: "ARRAY_LENGTH", field: "posts", message: `Threads는 ${minItems}개 게시가 필요합니다.` });
  }
  if (channel === "shorts" && minItems && Array.isArray(value.shots) && value.shots.length < minItems) {
    issues.push({ code: "ARRAY_LENGTH", field: "shots", message: `Shorts 샷 자막은 ${minItems}개 이상이어야 합니다.` });
  }
  if (channel === "facebook") {
    const reels = String(value.reelsCaption ?? "").trim();
    const group = String(value.groupBody ?? "").trim();
    if (reels && group && reels === group) {
      issues.push({ code: "FIELD_COLLAPSE", field: "groupBody", message: "Facebook Reels 캡션과 그룹 본문은 서로 달라야 합니다." });
    }
  }
  if (channel === "instagram") {
    const cover = String(value.cover ?? "").trim();
    const caption = String(value.caption ?? "").trim();
    if (cover && caption && cover === caption) {
      issues.push({ code: "FIELD_COLLAPSE", field: "caption", message: "Instagram 표지와 캡션은 서로 달라야 합니다." });
    }
    const coverLimit = profile?.lengthRules?.coverChars;
    if (coverLimit && Array.from(cover).length > coverLimit) {
      issues.push({ code: "IG_COVER", field: "cover", message: `표지 ${coverLimit}자를 초과했습니다.`, current: Array.from(cover).length, limit: coverLimit });
    }
  }
  const facts = options.facts;
  if (facts) {
    const allowed = [facts.repositoryUrl, facts.demoUrl].filter(Boolean);
    if (allowed.length > 0) {
      for (const url of extractUrls(flattenFields(value))) {
        if (!allowed.some((item) => url === item || url.startsWith(item) || item.startsWith(url))) {
          issues.push({ code: "URL_MISMATCH", message: "확인된 프로젝트 URL과 다른 링크가 있습니다.", url });
        }
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

export function collectLockTerms(facts = {}) {
  return [...new Set([facts.name, facts.repositoryUrl, facts.demoUrl, facts.license, ...(facts.technologies ?? [])]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean))];
}

export function missingLockTerms(sourceFields, targetFields, facts) {
  const sourceText = flattenFields(sourceFields);
  const targetText = flattenFields(targetFields);
  return collectLockTerms(facts).filter((term) => sourceText.includes(term) && !targetText.includes(term));
}

export function displayCompletionStatus(document, options = {}) {
  const spec = channelSpec(document?.channel);
  if (!spec || spec.translationPolicy === "disabled" || document?.channel === "showHn") return "manual_only";
  if (options.locale === "en-US" && options.stale) return "stale";
  const inputs = document?.internal?.authorInputs ?? options.authorInputs ?? {};
  const missing = requiredAuthorInputs(document.channel).filter((key) => !String(inputs[key] ?? "").trim());
  if (missing.length > 0 || spec.translationPolicy === "draftOnly") return "needs_input";
  if (options.locale === "en-US" && options.missingTranslation) return "needs_review";
  if (!options.validationOk || spec.status === "hold") return "needs_review";
  return "ready";
}

export function copyBlockReason(document, options = {}) {
  const spec = channelSpec(document?.channel);
  if (!spec) return "지원하지 않는 채널입니다.";
  const status = options.completionStatus ?? displayCompletionStatus(document, {
    locale: options.locale,
    stale: options.stale,
    missingTranslation: options.missingTranslation,
    validationOk: options.validation ? options.validation.ok : true,
    authorInputs: options.authorInputs,
  });
  if (document.translationPolicy === "disabled" || status === "manual_only") {
    return "이 채널은 생성 원고를 복사할 수 없습니다.";
  }
  if (status === "stale" || (options.locale === "en-US" && options.stale)) {
    return "원문이 바뀌어 영문 원고가 오래되었습니다. 다시 생성하세요.";
  }
  if (options.locale === "en-US" && options.missingTranslation) return "영어 원고가 없습니다.";
  if (status === "needs_input") return "작성자 입력이 필요합니다.";
  if (document.status === "hold" && !document.internal?.authorReady) {
    return "HOLD 채널은 작성자 보강 완료 전에는 복사할 수 없습니다.";
  }
  if (document.translationPolicy === "draftOnly" && !document.internal?.authorReady) {
    return "작성자 보강 완료 전에는 복사할 수 없습니다.";
  }
  if (status === "needs_review" && !document.internal?.authorReady) {
    return "검토가 끝나기 전에는 복사할 수 없습니다.";
  }
  if (options.validation && !options.validation.ok) {
    return options.validation.issues[0]?.message ?? "게시 필드 검증에 실패했습니다.";
  }
  return "";
}

export function publishLooksInternal(text) {
  const value = String(text ?? "");
  return /HOLD\s*—/.test(value)
    || /\[게시 전[^\]]*\]/.test(value)
    || /작성자가 직접/.test(value)
    || /## 게시 전 확인/.test(value)
    || /Status:\s*`?HOLD/i.test(value)
    || /운영 게이트/.test(value)
    || /게시 금지/.test(value);
}

export function translationFactsFromSummary(summary) {
  return {
    name: summary.name,
    repositoryUrl: summary.repositoryUrl,
    demoUrl: summary.demoUrl ?? "",
    license: summary.license,
    technologies: summary.technologies ?? [],
    features: summary.features ?? [],
    description: summary.description ?? "",
  };
}

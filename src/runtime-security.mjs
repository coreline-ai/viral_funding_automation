/**
 * Runtime security helpers for untrusted repository text and OAuth provider
 * output.  This module deliberately has no dependency on a provider runner so
 * both Grok and Codex paths use the exact same checks.
 */

const URL_RE = /https?:\/\/[^\s)\]}>,"']+/giu;
const PRIVATE_PATH_RE = /(?:\/Users\/[^\s"'`]+|\/Volumes\/[^\s"'`]+|~\/(?:\.ssh|\.codex|\.grok)(?:\/[^\s"'`]*)?|\$HOME(?:\/[^\s"'`]*)?|(?:^|[\s"'])\.(?:env|npmrc|pypirc)(?:\b|\/))/giu;
const SECRET_PATTERNS = [
  /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/giu,
  /\b(?:bearer|authorization)\s*[:=]?\s+[A-Za-z0-9._~+\/-]{16,}\b/giu,
  /\b(?:xai|openai|api|access|refresh)[_-]?(?:api[_-]?key|key|token)[\s:=]+[A-Za-z0-9._~+\/-]{12,}\b/giu,
  /\bsk-[A-Za-z0-9_-]{16,}\b/giu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/giu,
];

const TECHNOLOGY_ALIASES = Object.freeze([
  { canonical: "Kubernetes", re: /\b(?:kubernetes|k8s)\b/giu },
  { canonical: "React", re: /\breact(?:\.js)?\b/giu },
  { canonical: "Next.js", re: /\bnext(?:\.js)?\b/giu },
  { canonical: "Three.js", re: /\bthree(?:\.js)?\b/giu },
  { canonical: "TypeScript", re: /\btypescript\b/giu },
  { canonical: "JavaScript", re: /\bjavascript\b/giu },
  { canonical: "Node.js", re: /\bnode(?:\.js)?\b/giu },
  { canonical: "Drizzle ORM", re: /\bdrizzle(?:\s+orm)?\b/giu },
  { canonical: "Cloudflare D1", re: /\b(?:cloudflare\s+)?d1\b/giu },
  { canonical: "Remark", re: /\bremark\b/giu },
  { canonical: "Unified", re: /\bunified\b/giu },
  { canonical: "Vite", re: /\bvite\b/giu },
  { canonical: "Docker", re: /\bdocker\b/giu },
  { canonical: "PostgreSQL", re: /\bpostgres(?:ql)?\b/giu },
  { canonical: "Supabase", re: /\bsupabase\b/giu },
  { canonical: "GraphQL", re: /\bgraphql\b/giu },
  { canonical: "OAuth", re: /\boauth\b/giu },
  { canonical: "mobile app", re: /\b(?:mobile|ios|android)\s+app\b/giu },
  { canonical: "GitHub sync", re: /\b(?:github|repository)\s+sync(?:ing)?\b/giu },
]);

const HIGH_RISK_CAPABILITIES = Object.freeze([
  { canonical: "OAuth login", re: /\b(?:oauth|single[ -]?sign[ -]?on)\s+(?:login|sign[ -]?in|authentication)\b/giu },
  { canonical: "live collaboration", re: /\b(?:live|real[ -]?time)\s+collaboration\b/giu },
  { canonical: "mobile app", re: /\b(?:mobile|ios|android)\s+app\b/giu },
  { canonical: "GitHub sync", re: /\b(?:github|repository)\s+sync(?:ing)?\b/giu },
]);

const PERFORMANCE_CLAIMS = Object.freeze([
  /\b(?:trusted by|used by|loved by)\s+(?:millions?|thousands?|hundreds?)\b/giu,
  /\bmillions?\s+of\s+(?:teams?|users?|developers?|companies?)\b/giu,
  /\bwidely\s+adopted\b/giu,
  /\b(?:best|fastest|leading|revolutionary|guaranteed|unmatched)\b/giu,
  /\b(?:#1|number\s+one)\b/giu,
]);

function reset(re) {
  re.lastIndex = 0;
  return re;
}

function allStrings(value, path = "", result = []) {
  if (typeof value === "string") {
    result.push({ path: path || "$", value });
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => allStrings(item, `${path}[${index}]`, result));
    return result;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) allStrings(item, path ? `${path}.${key}` : key, result);
  }
  return result;
}

function normalized(value) {
  return String(value ?? "").toLocaleLowerCase("en-US");
}

function sourceText(request = {}) {
  return [
    request?.facts?.name,
    request?.facts?.repositoryUrl,
    request?.facts?.demoUrl,
    request?.facts?.license,
    request?.facts?.description,
    ...(request?.facts?.technologies ?? []),
    ...(request?.facts?.features ?? []),
  ].filter(Boolean).join("\n");
}

function sourceEntries(request = {}) {
  const facts = request?.facts ?? {};
  return [
    ["fact:name", "facts.name", facts.name],
    ["fact:repositoryUrl", "facts.repositoryUrl", facts.repositoryUrl],
    ["fact:demoUrl", "facts.demoUrl", facts.demoUrl],
    ["fact:license", "facts.license", facts.license],
    ["fact:description", "facts.description", facts.description],
    ...(facts.technologies ?? []).map((value, index) => [`fact:technology:${index + 1}`, `facts.technologies[${index}]`, value]),
    ...(facts.features ?? []).map((value, index) => [`fact:feature:${index + 1}`, `facts.features[${index}]`, value]),
  ].filter(([, , value]) => String(value ?? "").trim());
}

function firstEvidenceId(entries, phrase) {
  const needle = normalized(phrase);
  return entries.find(([, , value]) => normalized(value).includes(needle))?.[0] ?? "";
}

function valuesFor(re, text) {
  return [...String(text ?? "").matchAll(reset(re))].map((match) => match[0]);
}

function outputUrls(value) {
  return allStrings(value).flatMap(({ path, value: text }) => valuesFor(URL_RE, text).map((url) => ({ path, url: url.replace(/[.,;:]+$/u, "") })));
}

/** Returns redacted issues only; secret values are never carried into an issue. */
export function providerOutputDlpIssues(payload, { canaryValues = [] } = {}) {
  const issues = [];
  const canaries = [
    ...canaryValues,
    // This helper also protects browser-created approval snapshots. Browser
    // runtimes do not expose Node's `process.env`.
    globalThis.process?.env?.VIRAL_DLP_CANARY,
  ].map((value) => String(value ?? "").trim()).filter((value) => value.length >= 8);
  for (const { path, value } of allStrings(payload)) {
    if (valuesFor(PRIVATE_PATH_RE, value).length > 0) {
      issues.push({ code: "PRIVATE_PATH_EXPOSURE", field: path, message: "Provider 응답에 개인 경로 또는 인증 경로가 포함되었습니다." });
    }
    if (SECRET_PATTERNS.some((re) => valuesFor(re, value).length > 0)) {
      issues.push({ code: "SECRET_EXPOSURE", field: path, message: "Provider 응답에 인증 정보 또는 비밀값 패턴이 포함되었습니다." });
    }
    if (canaries.some((canary) => value.includes(canary))) {
      issues.push({ code: "CANARY_EXPOSURE", field: path, message: "Provider 응답에 보안 canary가 포함되었습니다." });
    }
  }
  return issues;
}

export function canonicalEvidence(request = {}) {
  return sourceEntries(request).map(([evidenceId, source, value]) => ({ evidenceId, source, value: String(value) }));
}

/**
 * Claim checks are intentionally conservative: only high-risk technologies,
 * capabilities, performance claims, and URLs are blocked automatically.
 * Other editorial wording remains a human review concern.
 */
export function claimEvidenceIssues(request = {}, outputFields = {}) {
  const issues = [];
  const entries = sourceEntries(request);
  const source = normalized(sourceText(request));
  const output = allStrings(outputFields);
  for (const { path, value } of output) {
    for (const item of TECHNOLOGY_ALIASES) {
      for (const match of valuesFor(item.re, value)) {
        const evidenceId = firstEvidenceId(entries, match) || firstEvidenceId(entries, item.canonical);
        if (!evidenceId) {
          issues.push({ code: "UNSUPPORTED_TECHNOLOGY", field: path, claim: item.canonical, message: "근거 없는 기술 구성 주장이 포함되었습니다." });
        }
      }
    }
    for (const item of HIGH_RISK_CAPABILITIES) {
      for (const match of valuesFor(item.re, value)) {
        const evidenceId = firstEvidenceId(entries, match) || firstEvidenceId(entries, item.canonical);
        if (!evidenceId) {
          issues.push({ code: "UNSUPPORTED_CAPABILITY", field: path, claim: item.canonical, message: "근거 없는 기능 주장이 포함되었습니다." });
        }
      }
    }
    for (const pattern of PERFORMANCE_CLAIMS) {
      for (const match of valuesFor(pattern, value)) {
        if (!source.includes(normalized(match))) {
          issues.push({ code: "UNSUPPORTED_PERFORMANCE_CLAIM", field: path, claim: match, message: "근거 없는 성과 또는 비교 우위 주장이 포함되었습니다." });
        }
      }
    }
  }
  const allowedUrls = new Set(entries.flatMap(([, , value]) => valuesFor(URL_RE, value).map((url) => url.replace(/[.,;:]+$/u, ""))));
  for (const { path, url } of outputUrls(outputFields)) {
    if (!allowedUrls.has(url)) {
      issues.push({ code: "UNSUPPORTED_URL", field: path, claim: "external URL", message: "근거 목록에 없는 외부 링크가 포함되었습니다." });
    }
  }
  return issues;
}

export function evidenceForOutput(request = {}, outputFields = {}) {
  const output = normalized(allStrings(outputFields).map((item) => item.value).join("\n"));
  return canonicalEvidence(request).filter((item) => output.includes(normalized(item.value)));
}

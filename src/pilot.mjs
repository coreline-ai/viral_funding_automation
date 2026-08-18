import { channelProfile } from "./channel-profiles.mjs";
import { validatePublish } from "./drafts.mjs";
import { countXWeightedCharacters } from "./x-text.mjs";

const SECRET_PATTERN = /sk-[a-zA-Z0-9_-]{10,}|Bearer\s+\S+|\/Users\/[^/\s]+\/\.(grok|codex)\/|XAI_API_KEY|OPENAI_API_KEY|prompt\.txt|schema\.json/i;

export function xAngleIssues(bodies) {
  const issues = [];
  const texts = (bodies ?? []).map((body) => String(body ?? "").trim());
  if (texts.length !== 3) issues.push({ code: "X_ANGLE_COUNT", message: "X 단일 안은 3개여야 합니다." });
  if (new Set(texts).size !== texts.filter(Boolean).length) issues.push({ code: "X_ANGLE_DUP", message: "X 3안 문구가 서로 달라야 합니다." });
  texts.forEach((body, index) => {
    const weighted = countXWeightedCharacters(body);
    if (weighted > 280) issues.push({ code: "X_LIMIT", field: `x${index + 1}`, message: "X 280 가중자를 초과했습니다.", current: weighted });
  });
  return issues;
}

export function linkedInPilotIssues(body, facts = {}) {
  const text = String(body ?? "");
  const issues = [];
  if (!/문제|problem/i.test(text)) issues.push({ code: "LI_PROBLEM", field: "body", message: "LinkedIn에 문제 서술이 없습니다." });
  if (!/구현|implementation|parse|AST|그래프/i.test(text)) issues.push({ code: "LI_IMPL", field: "body", message: "LinkedIn에 구현 선택이 없습니다." });
  if (!/데모 경계|read-only|읽기 전용|로그인 없/i.test(text)) issues.push({ code: "LI_BOUNDARY", field: "body", message: "LinkedIn에 공개 데모 경계가 없습니다." });
  if (!/[?？]/.test(text)) issues.push({ code: "LI_QUESTION", field: "body", message: "LinkedIn에 구체 질문이 없습니다." });
  if (facts.name && !text.includes(facts.name)) issues.push({ code: "LI_NAME", field: "body", message: "LinkedIn에 프로젝트명이 없습니다." });
  if (facts.demoUrl && !text.includes(facts.demoUrl) && !text.includes(facts.repositoryUrl ?? "")) {
    issues.push({ code: "LI_URL", field: "body", message: "LinkedIn에 확인된 URL이 없습니다." });
  }
  return issues;
}

export function productHuntPilotIssues(fields = {}) {
  const issues = [];
  const taglineCount = Array.from(String(fields.tagline ?? "")).length;
  const descriptionCount = Array.from(String(fields.description ?? "")).length;
  if (taglineCount > 60) issues.push({ code: "PH_TAGLINE", field: "tagline", message: "태그라인 60자를 초과했습니다.", current: taglineCount });
  if (descriptionCount > 260) issues.push({ code: "PH_DESCRIPTION", field: "description", message: "설명 260자를 초과했습니다.", current: descriptionCount });
  if (/\bupvote\b|please vote|업보트/i.test(JSON.stringify(fields))) {
    issues.push({ code: "PH_UPVOTE", message: "Product Hunt에 투표 요청이 있습니다." });
  }
  for (const field of ["name", "tagline", "description", "firstComment"]) {
    if (!String(fields[field] ?? "").trim()) issues.push({ code: "EMPTY_FIELD", field, message: `${field}가 비어 있습니다.` });
  }
  return issues;
}

export function informationLossIssues(sourceFields, outputFields, facts = {}) {
  const source = JSON.stringify(sourceFields);
  const output = JSON.stringify(outputFields);
  return [facts.name, facts.repositoryUrl, facts.demoUrl, facts.license]
    .map((value) => String(value ?? "").trim())
    .filter((term) => term && source.includes(term) && !output.includes(term))
    .map((value) => ({ code: "INFO_LOSS", field: value, message: `검증 사실이 결과에서 빠졌습니다: ${value}` }));
}

export function sanitizePilotFixture(result = {}) {
  const json = JSON.stringify({
    channel: result.channel,
    provider: result.provider,
    status: result.status,
    sourceHash: result.sourceHash,
    publishFields: result.publishFields,
    summary: result.summary,
    validation: result.validation,
    evidence: result.evidence,
  });
  if (SECRET_PATTERN.test(json)) throw new Error("파일럿 fixture에 비밀·경로가 남아 있습니다.");
  return JSON.parse(json);
}

export function pilotProfileHint(channel) {
  return channelProfile(channel)?.angle ?? "";
}

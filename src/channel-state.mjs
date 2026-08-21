import {
  allowsFirstPerson,
  channelProfile,
  normalizeCampaignBrief,
  requiredOperationInputs,
  supportMode,
  validateTypedInputs,
} from "./channel-profiles.mjs";

export const CONTENT_STATUSES = Object.freeze([
  "candidate",
  "needs_input",
  "invalid",
  "reference_ready",
  "manual_only",
]);
export const OPERATIONS_STATUSES = Object.freeze(["ready", "blocked"]);
export const APPROVAL_STATUSES = Object.freeze(["unreviewed", "approved"]);

function textFromFields(fields) {
  const parts = [];
  const walk = (value) => {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(fields);
  return parts.join("\n");
}

export function normalizeApprovalStatus(value, legacyAuthorReady = false) {
  if (APPROVAL_STATUSES.includes(value)) return value;
  return legacyAuthorReady ? "approved" : "unreviewed";
}

export function firstPersonIssues(fields, campaignBrief, { channel } = {}) {
  const text = textFromFields(fields);
  const brief = normalizeCampaignBrief(campaignBrief, { channel });
  const issues = [];
  for (const match of text.matchAll(/\b(I built|we built|I contributed)\b/gi)) {
    if (!allowsFirstPerson(brief, match[0])) {
      issues.push({
        group: "policy",
        code: "UNSUPPORTED_AUTHORSHIP",
        field: "",
        message: `작성자 역할 근거 없이 “${match[0]}”를 사용할 수 없습니다. 중립 표현으로 바꾸세요.`,
      });
    }
  }
  return issues;
}

export function operationIssues(channel, operationInputs = {}) {
  const profile = channelProfile(channel);
  const typed = validateTypedInputs(channel, operationInputs, { scope: "operations" });
  const typedKeys = new Set(requiredOperationInputs(channel));
  const generic = (profile?.prepublishGates ?? [])
    .filter((gate) => !typedKeys.has(gate.key))
    .filter((gate) => operationInputs?.[gate.key] !== true)
    .map((gate) => ({
      key: gate.key,
      code: "OPERATION_GATE_REQUIRED",
      message: gate.message,
    }));
  return [...typed, ...generic];
}

export function assessChannelState({
  channel,
  validationOk = false,
  authorInputs = {},
  operationInputs = {},
  campaignBrief = {},
  approvalStatus,
  legacyAuthorReady = false,
} = {}) {
  const mode = supportMode(channel);
  const normalizedBrief = normalizeCampaignBrief(campaignBrief, { channel });
  // Goal/audience are collected in the campaign brief UI and included in prompts,
  // but do not block a neutral, fact-only candidate. Authorship claims are still
  // strictly blocked by firstPersonIssues when role evidence is absent.
  const contentInputIssues = validateTypedInputs(channel, authorInputs, { scope: "content" });
  const operations = operationIssues(channel, operationInputs);
  const normalizedApproval = normalizeApprovalStatus(approvalStatus, legacyAuthorReady);
  let contentStatus = "invalid";
  if (mode === "manual_only") contentStatus = "manual_only";
  else if (mode === "reference_only") contentStatus = validationOk ? "reference_ready" : "invalid";
  else if (contentInputIssues.length > 0) contentStatus = "needs_input";
  else if (!validationOk) contentStatus = "invalid";
  else contentStatus = "candidate";
  const operationsStatus = operations.length === 0 && mode === "compose" ? "ready" : "blocked";
  const publishReady = contentStatus === "candidate"
    && operationsStatus === "ready"
    && normalizedApproval === "approved";
  return {
    supportMode: mode,
    contentStatus,
    operationsStatus,
    approvalStatus: normalizedApproval,
    publishReady,
    campaignBrief: normalizedBrief,
    contentInputIssues,
    operationIssues: operations,
  };
}

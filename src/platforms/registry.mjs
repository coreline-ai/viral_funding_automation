import { platformForChannel } from "../platform-registry.mjs";
import {
  CONNECTOR_DRY_RUN_SCHEMA_VERSION,
  DryRunConnectorError,
  assertDryRunExecutionControls,
  assertValidDryRunIntent,
  createDryRunReceipt,
} from "./connector.mjs";
import { buildThreadsTextDryRunPayload } from "./threads.mjs";

const X_CHANNELS = new Set(["x1", "x2", "x3", "xThread"]);

function frozen(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) frozen(item);
  }
  return value;
}

function xPayload(revision) {
  const items = revision.channel === "xThread"
    ? revision.publishFields.segments
    : [revision.publishFields.body];
  if (!Array.isArray(items) || items.length === 0 || items.some((item) => typeof item !== "string" || !item.trim())) {
    throw new DryRunConnectorError("X_TEXT_REQUIRED", "X dry-run에는 승인된 텍스트가 필요합니다.", { status: 400 });
  }
  return frozen({
    endpointClass: "x_text_post",
    payloads: items.map((text, index) => ({
      sequence: index + 1,
      text,
      ...(index > 0 ? { replyToDryRunIndex: index } : {}),
    })),
  });
}

function linkedinPayload(revision, readiness) {
  const commentary = String(revision.publishFields?.body ?? "").trim();
  if (!commentary) throw new DryRunConnectorError("LINKEDIN_TEXT_REQUIRED", "LinkedIn dry-run에는 승인된 본문이 필요합니다.", { status: 400 });
  const accountType = readiness?.account?.accountType;
  if (!['person', 'organization'].includes(accountType)) {
    throw new DryRunConnectorError("LINKEDIN_ACCOUNT_TYPE", "LinkedIn account type은 person 또는 organization이어야 합니다.", { status: 400 });
  }
  return frozen({
    endpointClass: "linkedin_text_post",
    requiredVersionHeaders: ["Linkedin-Version: YYYYMM", "X-Restli-Protocol-Version: 2.0.0"],
    payloads: [{
      author: `urn:li:${accountType}:${revision.accountTarget.accountId}`,
      commentary,
      visibility: "PUBLIC",
      feedDistribution: "MAIN_FEED",
    }],
  });
}

function descriptor({ id, platform, channels, requiredScopes, buildPayload }) {
  return frozen({ id, platform, channels: [...channels], requiredScopes: [...requiredScopes], buildPayload });
}

// A compact registry keeps Phase 3 intentionally limited to the pilot and two
// followers. All other platforms remain readiness-only or manual-only.
export const DRY_RUN_CONNECTORS = frozen({
  threads: descriptor({
    id: "threads-text-dry-run",
    platform: "threads",
    channels: ["threads"],
    requiredScopes: ["threads_basic", "threads_content_publish"],
    buildPayload: (revision) => buildThreadsTextDryRunPayload(revision),
  }),
  x: descriptor({
    id: "x-text-dry-run",
    platform: "x",
    channels: [...X_CHANNELS],
    requiredScopes: ["tweet.write"],
    buildPayload: (revision) => xPayload(revision),
  }),
  linkedin: descriptor({
    id: "linkedin-text-dry-run",
    platform: "linkedin",
    channels: ["linkedin"],
    requiredScopes: ["w_member_social"],
    buildPayload: (revision, readiness) => linkedinPayload(revision, readiness),
  }),
});

export function dryRunConnectorForChannel(channel) {
  const platform = platformForChannel(channel);
  const connector = DRY_RUN_CONNECTORS[platform] ?? null;
  if (!connector || !connector.channels.includes(channel)) return null;
  return connector;
}

export function validateConnectorIntent(input = {}) {
  const channel = input?.approvalRevision?.channel;
  const connector = dryRunConnectorForChannel(channel);
  if (!connector) {
    throw new DryRunConnectorError("DRY_RUN_UNSUPPORTED_CHANNEL", "이 채널에는 dry-run connector가 없습니다.", { status: 400 });
  }
  const validation = assertValidDryRunIntent(input);
  if (validation.revision.platform !== connector.platform) {
    throw new DryRunConnectorError("CONNECTOR_PLATFORM_MISMATCH", "승인 snapshot과 connector 플랫폼이 다릅니다.", { status: 400 });
  }
  return frozen({ connector, ...validation });
}

/** Builds a local payload plan and simulated receipt; it never calls an API. */
export function buildConnectorDryRun({ approvalRevision, readiness, operationInputs = {}, publishIntent, credentialHandle, safety, requestedAt } = {}) {
  const validation = validateConnectorIntent({ approvalRevision, readiness, operationInputs });
  if (!publishIntent || publishIntent.status !== "ready_for_dry_run") {
    throw new DryRunConnectorError("PUBLISH_INTENT_NOT_READY", "ready_for_dry_run publish intent가 필요합니다.");
  }
  if (publishIntent.approvalRevisionId !== validation.revision.revisionId) {
    throw new DryRunConnectorError("STALE_APPROVAL", "publish intent와 approval snapshot이 다릅니다.");
  }
  const controls = assertDryRunExecutionControls({ safety, credentialHandle });
  const plan = validation.connector.buildPayload(validation.revision, validation.readiness);
  const receipt = createDryRunReceipt({
    revision: validation.revision,
    intent: publishIntent,
    endpointClass: plan.endpointClass,
    requestCount: plan.payloads.length,
    credential: controls.credential,
    safety: controls.safety,
    requestedAt,
  });
  return frozen({
    schemaVersion: CONNECTOR_DRY_RUN_SCHEMA_VERSION,
    connector: validation.connector.id,
    mode: "dry_run",
    payload: plan,
    receipt,
  });
}

// Browser-safe workspace migration helpers. They never inspect, create, or
// retain credentials; only the former boolean approval marker is replaced.
export const APPROVAL_SNAPSHOT_WORKSPACE_VERSION = 6;
export const PLATFORM_READINESS_WORKSPACE_VERSION = 7;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * V5 approvalStatus/authorReady was a mutable checkbox, not an immutable
 * snapshot. Preserve every draft and locale but force re-approval in V6.
 */
export function upgradeWorkspaceApprovalSnapshots(workspace) {
  if (!isRecord(workspace) || workspace.version !== 5) return workspace;
  const documents = Object.fromEntries(Object.entries(workspace.documents ?? {}).map(([channel, document]) => [
    channel,
    {
      ...document,
      internal: {
        ...(document?.internal ?? {}),
        authorReady: false,
        approvalStatus: "unreviewed",
        approvalRevision: null,
        approvalActor: typeof document?.internal?.approvalActor === "string" ? document.internal.approvalActor : "",
      },
    },
  ]));
  return {
    ...workspace,
    version: APPROVAL_SNAPSHOT_WORKSPACE_VERSION,
    documents,
    migratedFrom: workspace.migratedFrom || 5,
  };
}

/**
 * V7 adds an explicitly empty, non-secret platform readiness area. Existing
 * content and approval snapshots remain untouched; readiness must be entered
 * again instead of guessing an account, scope, asset, or credential state.
 */
export function upgradeWorkspacePlatformReadiness(workspace) {
  if (!isRecord(workspace) || workspace.version !== APPROVAL_SNAPSHOT_WORKSPACE_VERSION) return workspace;
  const documents = Object.fromEntries(Object.entries(workspace.documents ?? {}).map(([channel, document]) => [
    channel,
    {
      ...document,
      internal: {
        ...(document?.internal ?? {}),
        platformReadiness: null,
      },
    },
  ]));
  return {
    ...workspace,
    version: PLATFORM_READINESS_WORKSPACE_VERSION,
    documents,
    migratedFrom: workspace.migratedFrom || APPROVAL_SNAPSHOT_WORKSPACE_VERSION,
  };
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVAL_SNAPSHOT_WORKSPACE_VERSION,
  PLATFORM_READINESS_WORKSPACE_VERSION,
  upgradeWorkspaceApprovalSnapshots,
  upgradeWorkspacePlatformReadiness,
} from "../src/workspace-migration.mjs";

test("V5 localStorage workspace는 원고를 보존하고 legacy 승인 체크만 V6 snapshot 재승인으로 낮춘다", () => {
  const v5 = {
    version: 5,
    repoUrl: "https://github.com/coreline-ai/memory_node_graph",
    documents: {
      x1: {
        channel: "x1",
        locales: { "ko-KR": { publishFields: { body: "원문" } }, "en-US": { publishFields: { body: "English copy" } } },
        internal: { authorReady: true, approvalStatus: "approved", authorInputs: { note: "keep" } },
      },
    },
  };
  const migrated = upgradeWorkspaceApprovalSnapshots(v5);
  assert.equal(migrated.version, APPROVAL_SNAPSHOT_WORKSPACE_VERSION);
  assert.deepEqual(migrated.documents.x1.locales, v5.documents.x1.locales);
  assert.deepEqual(migrated.documents.x1.internal.authorInputs, { note: "keep" });
  assert.equal(migrated.documents.x1.internal.authorReady, false);
  assert.equal(migrated.documents.x1.internal.approvalStatus, "unreviewed");
  assert.equal(migrated.documents.x1.internal.approvalRevision, null);
  assert.equal(migrated.documents.x1.internal.approvalActor, "");
  assert.equal(upgradeWorkspaceApprovalSnapshots(migrated), migrated);
});

test("V6 workspace는 기존 원고·승인 snapshot을 보존하고 V7 non-secret readiness를 빈 상태로 추가한다", () => {
  const v6 = {
    version: APPROVAL_SNAPSHOT_WORKSPACE_VERSION,
    documents: {
      threads: {
        channel: "threads",
        locales: { "en-US": { publishFields: { posts: ["copy"] } } },
        internal: { approvalRevision: { revisionId: "keep" }, approvalStatus: "approved" },
      },
    },
  };
  const migrated = upgradeWorkspacePlatformReadiness(v6);
  assert.equal(migrated.version, PLATFORM_READINESS_WORKSPACE_VERSION);
  assert.deepEqual(migrated.documents.threads.locales, v6.documents.threads.locales);
  assert.deepEqual(migrated.documents.threads.internal.approvalRevision, { revisionId: "keep" });
  assert.equal(migrated.documents.threads.internal.platformReadiness, null);
  assert.equal(upgradeWorkspacePlatformReadiness(migrated), migrated);
});

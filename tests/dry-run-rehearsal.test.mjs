import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDryRunEvidenceManifest } from "../src/dry-run-rehearsal.mjs";
import { buildConnectorDryRun } from "../src/platforms/registry.mjs";
import { createApprovalRevision, createPublishIntentStore } from "../src/publish-intent.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixtures/dry-run/memory-node-graph-threads.json", import.meta.url), "utf8"));
const verifiedPack = await readFile(new URL("../campaigns/memory_node_graph/2026-08-first-launch/final/verified-channel-copy-pack.md", import.meta.url), "utf8");

function createRehearsal() {
  const approvalRevision = createApprovalRevision({
    channel: fixture.channel,
    targetLocale: fixture.targetLocale,
    publishFields: fixture.publishFields,
    sourcePublishFields: fixture.publishFields,
    facts: fixture.facts,
    authorInputs: {},
    operationInputs: fixture.operationInputs,
    campaignBrief: fixture.campaignBrief,
    accountTarget: fixture.accountTarget,
    assetHash: null,
    approvedBy: fixture.approvedBy,
    localeReviewed: true,
  }, { approvedAt: fixture.approvedAt });
  const store = createPublishIntentStore();
  const publishIntent = store.create({
    approvalRevision,
    readiness: fixture.readiness,
    operationInputs: fixture.operationInputs,
    createdAt: fixture.approvedAt,
  });
  const dryRun = buildConnectorDryRun({
    approvalRevision,
    readiness: fixture.readiness,
    operationInputs: fixture.operationInputs,
    publishIntent,
    credentialHandle: fixture.credentialHandle,
    safety: fixture.safety,
    requestedAt: fixture.requestedAt,
  });
  return { approvalRevision, store, publishIntent, dryRun };
}

test("memory_node_graph Threads 최종 교정본 1건이 승인→intent→receipt 전체 local rehearsal을 통과한다", () => {
  assert.equal(fixture.attestationMode, "synthetic_account_rehearsal");
  for (const post of fixture.publishFields.posts) assert.ok(verifiedPack.includes(post));
  const { approvalRevision, publishIntent, dryRun } = createRehearsal();
  assert.equal(publishIntent.status, "ready_for_dry_run");
  assert.equal(dryRun.connector, "threads-text-dry-run");
  assert.deepEqual(dryRun.payload.payloads.map((entry) => entry.text), fixture.publishFields.posts);
  assert.equal(dryRun.receipt.approvalRevisionId, approvalRevision.revisionId);
  assert.equal(dryRun.receipt.networkWriteCount, 0);
  assert.equal(dryRun.receipt.liveWriteBlocked, true);
  assert.equal(dryRun.receipt.safety.userKillSwitch, "live_write_locked");
  assert.equal(dryRun.receipt.credential.handleProvided, true);
});

test("sanitized evidence manifest는 원고·vault reference·인증값 없이 dry-run 증명만 남긴다", () => {
  const { dryRun } = createRehearsal();
  const manifest = createDryRunEvidenceManifest(dryRun);
  assert.equal(manifest.schemaVersion, "viral-dry-run-evidence/v1");
  assert.equal(manifest.networkWriteCount, 0);
  assert.equal(manifest.credentialStatus, "not_configured");
  assert.equal(manifest.credentialHandlePresent, true);
  assert.equal(manifest.liveWriteLocked, true);
  assert.match(manifest.manifestHash, /^[a-f0-9]{64}$/u);
  const serialized = JSON.stringify(manifest);
  assert.doesNotMatch(serialized, /README와 개발 계획|vault-ref|access.?token|refresh.?token|client.?secret|authorization|\/Users\/|\/Volumes\//iu);
  assert.equal("payload" in manifest, false);
  assert.equal("publishFields" in manifest, false);
});

test("같은 승인 snapshot의 두 번째 rehearsal intent는 process-local duplicate로 차단된다", () => {
  const { approvalRevision, store } = createRehearsal();
  assert.throws(
    () => store.create({ approvalRevision, readiness: fixture.readiness, operationInputs: fixture.operationInputs }),
    (error) => error?.code === "DUPLICATE_PUBLISH_INTENT" && error?.status === 409,
  );
});

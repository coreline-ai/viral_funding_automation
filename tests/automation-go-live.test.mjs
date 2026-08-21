import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AUTOMATION_GO_LIVE_DECISION,
  DEFERRED_EXTERNAL_INPUTS,
  THREADS_FIRST_AUTOMATION_SCOPE,
  automationGoLiveAssessment,
  automationGoLiveCapability,
  automationGoLiveReportMarkdown,
} from "../src/automation-go-live.mjs";
import { providerOutputDlpIssues } from "../src/runtime-security.mjs";

const checklist = await readFile(new URL("../reviews/automation/AUTOMATION_GO_LIVE_CHECKLIST.md", import.meta.url), "utf8");

test("외부 입력을 후순위로 두어도 실제 게시 capability는 fail-closed다", () => {
  const assessment = automationGoLiveAssessment({ generatedAt: "2026-08-21T12:00:00.000Z" });
  assert.equal(assessment.decision, AUTOMATION_GO_LIVE_DECISION);
  assert.equal(assessment.internalPreparationStatus, "complete");
  assert.equal(assessment.externalInputsStatus, "deferred");
  assert.equal(assessment.actualPublishCapability, false);
  assert.equal(assessment.actualUploadCapability, false);
  assert.equal(assessment.actualScheduleCapability, false);
  assert.equal(assessment.assertions.liveWriteRoutes, 0);
  assert.equal(assessment.assertions.socialNetworkWriteEnabled, false);
  assert.equal(assessment.credentialVaultStrategy, "not_selected");
  assert.equal(assessment.deferredExternalInputs.length, DEFERRED_EXTERNAL_INPUTS.length);
});

test("다음 별도 개발 범위는 Threads 단일 텍스트 1건으로만 고정된다", () => {
  const capability = automationGoLiveCapability();
  assert.deepEqual(capability.nextScope, THREADS_FIRST_AUTOMATION_SCOPE);
  assert.equal(capability.nextScope.platform, "threads");
  assert.equal(capability.nextScope.maxPostsPerApproval, 1);
  assert.equal(capability.nextScope.automaticRetry, false);
  assert.equal(capability.nextScope.scheduling, false);
  assert.equal(capability.nextScope.mediaUpload, false);
  assert.equal(capability.nextScope.crossPosting, false);
  assert.equal(capability.actualPublishCapability, false);
});

test("후속 후보와 manual-only 플랫폼은 Go/No-Go 패키지에서도 차단된다", () => {
  const assessment = automationGoLiveAssessment();
  for (const platform of ["x", "linkedin", "facebook", "instagram", "shorts", "tiktok", "discord", "bluesky", "mastodon"]) {
    assert.ok(assessment.keepBlockedPlatforms.includes(platform), platform);
  }
  for (const platform of ["reddit", "showHn", "geeknews", "disquiet", "productHunt", "peerlist", "indieHackers", "okky"]) {
    assert.ok(assessment.manualOnlyPlatforms.includes(platform), platform);
  }
  assert.ok(!assessment.keepBlockedPlatforms.includes("threads"));
});

test("Go/No-Go 보고서와 정본 체크리스트에는 원고·credential·개인 경로가 없다", () => {
  const report = automationGoLiveReportMarkdown({ generatedAt: "2026-08-21T12:00:00.000Z" });
  assert.match(report, /NO_GO_PENDING_EXTERNAL_INPUTS/);
  assert.match(report, /실제 게시 capability: false/);
  assert.match(report, /live write route 수: 0/);
  assert.match(report, /OS Keychain 또는 별도 encrypted credential service/);
  assert.equal(providerOutputDlpIssues({ report, checklist }).length, 0);
  assert.doesNotMatch(`${report}\n${checklist}`, /access token\s*[:=]\s*\S+|refresh token\s*[:=]\s*\S+|client secret\s*[:=]\s*\S+|\/Users\/|\/Volumes\//i);
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("R4 OAuth adversarial smoke는 명시적 opt-in 없이는 provider를 실행하지 않고 안전한 manifest만 낸다", () => {
  const result = spawnSync(process.execPath, ["scripts/oauth-security-smoke.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, VIRAL_RUN_OAUTH_ADVERSARIAL: "" },
  });
  assert.equal(result.status, 0);
  const manifest = JSON.parse(result.stdout);
  assert.equal(manifest.schemaVersion, "viral-oauth-smoke-manifest/v1");
  assert.equal(manifest.status, "blocked");
  assert.equal(manifest.checks.optInRequired, false);
  assert.doesNotMatch(result.stdout, /VIRAL_R4_CANARY|\/Users\/|auth\.json|Bearer |sk-/);
});

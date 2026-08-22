import assert from "node:assert/strict";
import test from "node:test";

import {
  PLATFORM_PREVIEW_REGISTRY,
  PLATFORM_PREVIEW_SCHEMA_VERSION,
  PREVIEW_TEMPLATE_TYPES,
  REMAINING_PREVIEW_KEYS,
  previewSpecForChannel,
  previewSpecForPlatform,
} from "../src/platform-preview-registry.mjs";

test("나머지 17개 플랫폼의 local-only preview metadata를 한 registry에서 관리한다", () => {
  assert.equal(PLATFORM_PREVIEW_SCHEMA_VERSION, "viral-platform-preview-registry/v1");
  assert.equal(REMAINING_PREVIEW_KEYS.length, 17);
  assert.deepEqual(REMAINING_PREVIEW_KEYS.slice(0, 5), ["linkedin", "facebook", "instagram", "shorts", "tiktok"]);
  assert.deepEqual(REMAINING_PREVIEW_KEYS.slice(-3), ["discord", "bluesky", "mastodon"]);
  for (const key of REMAINING_PREVIEW_KEYS) {
    const spec = previewSpecForPlatform(key);
    assert.equal(spec, PLATFORM_PREVIEW_REGISTRY[key]);
    assert.ok(PREVIEW_TEMPLATE_TYPES.includes(spec.template));
    assert.equal(spec.localOnly, true);
    assert.equal(spec.externalWriteCount, 0);
    assert.ok(spec.noGo.includes("social_write"));
    assert.equal(Object.isFrozen(spec), true);
  }
});

test("생성 채널·참고 자료·새 수동 brief를 혼동하지 않는다", () => {
  assert.equal(previewSpecForChannel("linkedin")?.inputMode, "publish_fields");
  assert.equal(previewSpecForChannel("reddit")?.inputMode, "reference_only");
  assert.equal(previewSpecForChannel("showHn")?.inputMode, "manual_only");
  assert.equal(previewSpecForPlatform("tiktok")?.inputMode, "manual_brief");
  assert.equal(previewSpecForPlatform("discord")?.channel, "");
  assert.equal(previewSpecForChannel("x1"), null);
  assert.equal(previewSpecForPlatform("threads"), null);
});

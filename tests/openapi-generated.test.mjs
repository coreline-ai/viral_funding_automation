import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { CHANNEL_KEYS, publishFieldsJsonSchema } from "../src/drafts.mjs";

const generated = JSON.parse(await readFile(new URL("../openapi/generated/channel-publish-fields.v1.json", import.meta.url), "utf8"));
const types = await readFile(new URL("../openapi/generated/channel-publish-fields.v1.d.ts", import.meta.url), "utf8");

test("registry-generated OpenAPI field contract는 18개 채널과 정확히 일치한다", () => {
  assert.deepEqual(Object.keys(generated.$defs), CHANNEL_KEYS);
  for (const channel of CHANNEL_KEYS) {
    assert.deepEqual(generated.$defs[channel], publishFieldsJsonSchema(channel));
  }
  assert.equal(generated.ComposeRequestChannel.oneOf.length, CHANNEL_KEYS.length);
  assert.match(types, /export interface PublishFieldsByChannel/);
  assert.match(types, /export type ComposeRequest/);
});

test("생성 계약은 stale 없이 유지되고 TypeScript가 설치된 환경에서는 소비자가 컴파일된다", (t) => {
  const check = spawnSync(process.execPath, ["scripts/generate-openapi-field-contract.mjs", "--check"], {
    cwd: process.cwd(), encoding: "utf8",
  });
  assert.equal(check.status, 0, check.stderr);
  const tsc = spawnSync("tsc", ["-p", "openapi/generated/tsconfig.json", "--noEmit"], {
    cwd: process.cwd(), encoding: "utf8",
  });
  if (tsc.error?.code === "ENOENT") {
    t.skip("tsc가 없는 Node-only 환경에서는 generated type compile smoke를 건너뜁니다.");
    return;
  }
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
});

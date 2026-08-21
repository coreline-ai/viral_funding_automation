import type { ComposeRequest, PublishFieldsByChannel } from "./channel-publish-fields.v1.js";

const x: PublishFieldsByChannel["x1"] = { body: "Atlas https://example.com" };
const request: ComposeRequest<"x1"> = {
  schemaVersion: "viral-compose-request/v1",
  requestId: "req_smoke",
  idempotencyKey: "idem_smoke",
  requestFingerprint: "0".repeat(64),
  channel: "x1",
  provider: "grok",
  sourceLocale: "ko-KR",
  targetLocale: "en-US",
  facts: {},
  publishFields: x,
};
void request;

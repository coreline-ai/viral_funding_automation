#!/usr/bin/env node
/** Generate OpenAPI-consumable channel publish-field contracts from the runtime registry. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CHANNEL_KEYS, publishFieldsJsonSchema } from "../src/drafts.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const jsonPath = resolve(root, "openapi/generated/channel-publish-fields.v1.json");
const typesPath = resolve(root, "openapi/generated/channel-publish-fields.v1.d.ts");
const checkOnly = process.argv.includes("--check");

const defs = Object.fromEntries(CHANNEL_KEYS.map((channel) => [channel, publishFieldsJsonSchema(channel)]));
const channelOneOf = CHANNEL_KEYS.map((channel) => ({
  type: "object",
  required: ["channel", "publishFields"],
  properties: {
    channel: { const: channel },
    publishFields: { $ref: `#/$defs/${channel}` },
  },
}));
const document = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "channel-publish-fields.v1.json",
  title: "Viral channel publish fields",
  description: "Generated from src/drafts.mjs CHANNEL_REGISTRY. Do not edit manually.",
  $defs: defs,
  ComposeRequestChannel: { oneOf: channelOneOf },
  PublishFieldsByChannel: { oneOf: CHANNEL_KEYS.map((channel) => ({ $ref: `#/$defs/${channel}` })) },
};

function typeForSchema(schema) {
  if (schema.type === "array") return "string[]";
  if (schema.type === "object") return "Record<string, unknown>";
  return "string";
}
function typeForChannel(channel) {
  const schema = defs[channel];
  const entries = Object.entries(schema.properties);
  if (entries.length === 0) return "Record<string, never>";
  return `{ ${entries.map(([field, value]) => `${JSON.stringify(field)}: ${typeForSchema(value)}`).join("; ")} }`;
}
const types = [
  "// Generated from src/drafts.mjs by scripts/generate-openapi-field-contract.mjs. Do not edit manually.",
  `export type ViralChannel = ${CHANNEL_KEYS.map((channel) => JSON.stringify(channel)).join(" | ")};`,
  "export interface PublishFieldsByChannel {",
  ...CHANNEL_KEYS.map((channel) => `  ${JSON.stringify(channel)}: ${typeForChannel(channel)};`),
  "}",
  "export type ComposeRequest<C extends ViralChannel = ViralChannel> = {",
  "  schemaVersion: \"viral-compose-request/v1\"; requestId: string; idempotencyKey: string; requestFingerprint: string;",
  "  channel: C; provider: \"auto\" | \"grok\" | \"codex\"; sourceLocale: \"ko-KR\"; targetLocale: string;",
  "  facts: Record<string, unknown>; publishFields: PublishFieldsByChannel[C];",
  "};",
  "",
].join("\n");

async function matches(path, value) {
  try { return (await readFile(path, "utf8")) === value; } catch { return false; }
}
if (checkOnly) {
  const valid = (await matches(jsonPath, `${JSON.stringify(document, null, 2)}\n`)) && (await matches(typesPath, types));
  if (!valid) {
    console.error("Generated OpenAPI field contract is stale. Run: node scripts/generate-openapi-field-contract.mjs");
    process.exitCode = 1;
  }
} else {
  await writeFile(jsonPath, `${JSON.stringify(document, null, 2)}\n`);
  await writeFile(typesPath, types);
  console.log(`generated ${CHANNEL_KEYS.length} channel field contracts`);
}

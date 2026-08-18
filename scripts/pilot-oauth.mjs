#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { composeDraft } from "../src/composition.mjs";
import { CliCodexTextRunner, CliGrokTextRunner, loadCodexRuntimeConfig, loadGrokRuntimeConfig } from "../src/grok-oauth-proxy.mjs";
import { hashPublishFields, validatePublish } from "../src/drafts.mjs";
import { loadVerifiedPublishFields } from "../src/verified-copy.mjs";
import { linkedInPilotIssues, productHuntPilotIssues, sanitizePilotFixture, xAngleIssues } from "../src/pilot.mjs";

const facts = {
  name: "AI Systems Atlas",
  repositoryUrl: "https://github.com/coreline-ai/memory_node_graph",
  demoUrl: "https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation",
  license: "MIT",
  technologies: ["TypeScript", "React", "Three.js"],
};

const overlay = loadVerifiedPublishFields();

async function runOne(channel, provider, runner, publishFields, authorInputs = {}) {
  const result = await composeDraft({
    channel,
    sourceLocale: "ko-KR",
    targetLocale: "en-US",
    provider,
    publishFields,
    facts,
    authorInputs,
    sourceHash: hashPublishFields(publishFields),
  }, { runner });
  const fixture = sanitizePilotFixture(result);
  const format = validatePublish(channel, fixture.publishFields ?? {}, { facts });
  return { ...fixture, formatOk: format.ok, formatIssues: format.issues };
}

const grok = new CliGrokTextRunner(loadGrokRuntimeConfig());
const codex = new CliCodexTextRunner(loadCodexRuntimeConfig());

const x1 = await runOne("x1", "grok", grok, overlay.x1);
const linkedin = await runOne("linkedin", "codex", codex, overlay.linkedin);
const productHunt = await runOne("productHunt", "codex", codex, overlay.productHunt, {
  pricing: "Free",
  assets: "gallery ready",
});

const report = {
  capturedAt: new Date().toISOString(),
  xAngles: xAngleIssues([x1.publishFields?.body ?? "", overlay.x2.body, overlay.x3.body]),
  linkedIn: linkedInPilotIssues(linkedin.publishFields?.body ?? "", facts),
  productHunt: productHuntPilotIssues(productHunt.publishFields ?? {}),
  items: { x1, linkedin, productHunt },
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/providers");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "pilot-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, x1: x1.status, linkedin: linkedin.status, productHunt: productHunt.status }, null, 2)}\n`);

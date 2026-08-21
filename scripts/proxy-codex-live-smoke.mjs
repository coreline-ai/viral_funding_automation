import { createHash } from "node:crypto";

import { hashPublishFields } from "../src/drafts.mjs";
import { compositionRequestFingerprint } from "../src/request-fingerprint.mjs";
import { createAppServer } from "../src/server.mjs";

const facts = {
  name: "AI Systems Atlas",
  repositoryUrl: "https://github.com/coreline-ai/memory_node_graph",
  demoUrl: "https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation",
  license: "MIT",
  technologies: ["TypeScript", "React", "Three.js", "Remark", "Unified", "Cloudflare D1"],
  features: [
    "Parses README and dev-plan Markdown into nodes and source-backed relationships",
    "Separates source-backed relationships from visualization-only links",
    "Explores the graph in three Three.js views",
  ],
  description: "README와 개발 계획 Markdown을 근거 관계와 함께 탐색하는 오픈소스 웹앱입니다.",
};

const publishFields = {
  body: "README와 개발 계획이 쌓일수록 파일은 찾을 수 있어도 결정·개념·작업의 연결을 놓치기 쉽습니다. AI Systems Atlas는 Markdown에서 노드와 출처 근거 관계를 만들고 Three.js에서 탐색합니다. 공개 데모는 로그인 없는 읽기 전용 정적 snapshot입니다. https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation",
};

const campaignBrief = {
  publisherRole: "curator",
  accountVoice: "personal",
  ownershipConfirmed: false,
  goal: "첫 사용 피드백 수집",
  audience: "Markdown 문서를 관리하는 개발자",
  targetLocale: "en-US",
};

const sourceHash = hashPublishFields(publishFields);
const requestFingerprint = compositionRequestFingerprint({
  channel: "linkedin",
  provider: "codex",
  sourceLocale: "ko-KR",
  targetLocale: "en-US",
  publishFields,
  facts,
  authorInputs: {},
  operationInputs: {},
  campaignBrief,
});

const requestBody = {
  schemaVersion: "viral-compose-request/v1",
  requestId: `proxy_smoke_${Date.now()}`,
  idempotencyKey: `proxy-smoke-${Date.now()}`,
  channel: "linkedin",
  provider: "codex",
  sourceLocale: "ko-KR",
  targetLocale: "en-US",
  sourceHash,
  requestFingerprint,
  facts,
  publishFields,
  authorInputs: {},
  operationInputs: {},
  campaignBrief,
};

function shortHash(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, 16);
}

const app = createAppServer({ env: process.env });
await new Promise((resolve, reject) => {
  app.once("error", reject);
  app.listen(0, "127.0.0.1", resolve);
});

try {
  const port = app.address().port;
  const origin = `http://127.0.0.1:${port}`;
  const capabilities = await fetch(`${origin}/api/v1/capabilities`).then((response) => response.json());
  const readiness = await fetch(`${origin}/api/v1/providers/readiness`).then((response) => response.json());
  const response = await fetch(`${origin}/api/v1/drafts/compose`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-viral-nonce": capabilities.nonce,
    },
    body: JSON.stringify(requestBody),
  });
  const body = await response.json();
  const fields = body.publishFields ?? {};
  const summary = body.summary ?? {};
  console.log(JSON.stringify({
    schemaVersion: "viral-proxy-live-smoke/v1",
    provider: "codex",
    channel: "linkedin",
    proxyReady: Boolean(readiness?.codex?.ready),
    status: response.status,
    actualOAuthOneTurn: response.ok,
    contentStatus: body.contentStatus ?? "",
    operationsStatus: body.operationsStatus ?? "",
    validationOk: Boolean(body.validation?.ok),
    errorCode: body.error?.code ?? "",
    output: response.ok ? {
      fieldNames: Object.keys(fields),
      fieldLengths: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value ?? "").length])),
      summaryHash: shortHash(JSON.stringify(summary)),
      publishHash: shortHash(JSON.stringify(fields)),
    } : undefined,
  }));
  process.exitCode = response.ok ? 0 : 1;
} finally {
  await new Promise((resolve) => app.close(resolve));
}

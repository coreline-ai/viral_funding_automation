import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FINAL_DIR = join(dirname(fileURLToPath(import.meta.url)), "../campaigns/memory_node_graph/2026-08-first-launch/final");
const VERIFIED_REPOSITORY = "coreline-ai/memory_node_graph";
const VERIFIED_DEMO = "https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation";

function fences(markdown) {
  return [...String(markdown).matchAll(/```text\n([\s\S]*?)```/g)].map((match) => match[1].trim());
}

function headingBody(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`))?.[1].trim() ?? "";
}

function fenceAfter(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(new RegExp(`## ${escaped}\\n\\n\`\`\`text\\n([\\s\\S]*?)\`\`\``))?.[1].trim() ?? "";
}

export function shouldApplyVerifiedCopy(summary) {
  return summary?.repository === VERIFIED_REPOSITORY
    && String(summary.demoUrl ?? "").startsWith("https://ai-systems-atlas.vercel.app");
}

export function loadVerifiedPublishFields() {
  const pack = readFileSync(join(FINAL_DIR, "verified-channel-copy-pack.md"), "utf8");
  const hunt = readFileSync(join(FINAL_DIR, "product-hunt-launch.md"), "utf8");
  const geeknews = readFileSync(join(FINAL_DIR, "geeknews-show.md"), "utf8");
  const blocks = fences(pack);
  return {
    x1: { body: `${blocks[0]}\n` },
    x2: { body: `${blocks[1]}\n` },
    x3: { body: `${blocks[2]}\n` },
    xThread: { segments: [blocks[3], blocks[4], blocks[5]] },
    threads: { posts: [blocks[6], blocks[7], blocks[8]] },
    linkedin: { body: blocks[9] },
    disquiet: {
      productName: "AI Systems Atlas",
      tagline: "Markdown을 근거가 남는 지식 그래프로 탐색",
      productLink: VERIFIED_DEMO,
      postBody: blocks[10],
    },
    facebook: {
      reelsCaption: blocks[11],
      groupBody: "자기홍보와 외부 링크를 허용하는 그룹 규칙을 확인한 뒤 작성자가 다시 씁니다.",
    },
    instagram: { cover: blocks[12], caption: blocks[13] },
    productHunt: {
      name: "AI Systems Atlas",
      tagline: fenceAfter(hunt, "Tagline"),
      description: fenceAfter(hunt, "Description"),
      firstComment: fenceAfter(hunt, "Maker 첫 댓글"),
    },
    geeknews: {
      title: headingBody(geeknews, "제목"),
      body: `${headingBody(geeknews, "한 줄 소개")}\n\n${headingBody(geeknews, "본문")}`,
    },
  };
}

export function applyVerifiedCopy(summary, items) {
  if (!shouldApplyVerifiedCopy(summary)) return items;
  const overlay = loadVerifiedPublishFields();
  return Object.fromEntries(Object.entries(items).map(([channel, document]) => {
    const publishFields = overlay[channel];
    if (!publishFields) return [channel, document];
    return [channel, { ...document, publishFields }];
  }));
}

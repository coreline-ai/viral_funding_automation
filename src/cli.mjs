#!/usr/bin/env node
import { resolve } from "node:path";
import { buildProjectSummary, renderContentPack, writeContentPack } from "./content.mjs";
import { fetchRepositorySource } from "./github.mjs";

const HELP = `Viral Funding Automation MVP

Usage:
  node src/cli.mjs --repo <public-github-url> [--out <directory>]

Options:
  --repo   https://github.com/<owner>/<repo>
  --out    output directory (default: output)
  --help   show this help
`;

export function parseArguments(argv) {
  const result = { out: "output", help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") result.help = true;
    else if (value === "--repo") result.repo = argv[++index];
    else if (value === "--out") result.out = argv[++index];
    else throw new TypeError(`지원하지 않는 인자입니다: ${value}`);
  }
  if (!result.help && !result.repo) throw new TypeError("--repo가 필요합니다.");
  if (!result.out) throw new TypeError("--out 값이 필요합니다.");
  return result;
}

export async function run(argv, options = {}) {
  const args = parseArguments(argv);
  if (args.help) {
    (options.stdout ?? console.log)(HELP);
    return { help: true };
  }

  const source = await fetchRepositorySource(args.repo, {
    fetchImpl: options.fetchImpl,
    apiBase: options.apiBase,
    token: options.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
  });
  const summary = buildProjectSummary(source);
  const files = renderContentPack(summary);
  const rootDirectory = resolve(options.cwd ?? process.cwd(), args.out);
  const outputDirectory = await writeContentPack(rootDirectory, source.input.repo, files);
  const receipt = { repository: source.input.fullName, outputDirectory, files: Object.keys(files) };
  (options.stdout ?? console.log)(JSON.stringify(receipt, null, 2));
  return receipt;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { countXWeightedCharacters, truncateXWeightedText } from "./x-text.mjs";

const FEATURE_SECTION = /(핵심\s*특징|주요\s*기능|기능|features?|what it does)/i;
const LIMIT_SECTION = /(요구사항|주의|한계|제약|requirements?|limitations?|caveats?)/i;
const DEMO_HINT = /(?:\b(?:live|demo|try)\b|실시간|데모|체험|열기)/i;
const PACKAGE_REGISTRY_HOSTS = [
  /(?:^|\.)npmjs\.(?:com|org)$/i,
  /(?:^|\.)pypi\.org$/i,
  /(?:^|\.)crates\.io$/i,
  /(?:^|\.)rubygems\.org$/i,
  /(?:^|\.)nuget\.org$/i,
  /(?:^|\.)packagist\.org$/i,
];
const BANNED_HYPE = ["최고의", "혁신적인", "완벽한", "압도적인", "무조건"];

function cleanMarkdown(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value) {
  return cleanMarkdown(value).replace(/^[^\p{L}\p{N}_.-]+/u, "").trim();
}

function cleanDescription(value) {
  const cleaned = cleanMarkdown(value);
  const localized = cleaned.split(/\s+\|\s+/)[0]?.trim();
  return localized || cleaned;
}

function firstReadmeParagraph(readme) {
  const lines = readme.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("[") || line.startsWith("<") || line.startsWith(">") || line.startsWith("-")) continue;
    const cleaned = cleanMarkdown(line);
    if (cleaned.length >= 24) return cleaned;
  }
  return "";
}

function readSectionBullets(readme, sectionPattern, limit) {
  const results = [];
  let active = false;
  let sectionLevel = 7;
  for (const raw of readme.split(/\r?\n/)) {
    const heading = raw.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (active && level <= sectionLevel) active = false;
      if (sectionPattern.test(cleanMarkdown(heading[2]))) {
        active = true;
        sectionLevel = level;
      }
      continue;
    }
    if (!active) continue;
    const bullet = raw.match(/^\s*[-*]\s+(.+)$/);
    if (!bullet) continue;
    const cleaned = cleanMarkdown(bullet[1].replace(/^\[[ xX]\]\s*/, ""));
    if (cleaned.length < 5 || cleaned.length > 220 || results.includes(cleaned)) continue;
    results.push(cleaned);
    if (results.length >= limit) break;
  }
  return results;
}

function isPackageRegistryUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return PACKAGE_REGISTRY_HOSTS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

function findDemoUrl(repository, readme) {
  const badgeLinks = [...readme.matchAll(/\[!\[([^\]]*)\]\([^)]+\)\]\((https?:\/\/[^)\s]+)\)/g)]
    .map((match) => ({ label: cleanMarkdown(match[1]), url: match[2] }));
  const plainLinks = [...readme.matchAll(/(?<!!)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)]
    .map((match) => ({ label: cleanMarkdown(match[1]), url: match[2] }));
  const links = [...badgeLinks, ...plainLinks];
  const explicit = links.find((link) => {
    const asset = /(?:img\.shields\.io|\.(?:svg|png|jpe?g|gif|webp)(?:\?|$))/i.test(link.url);
    return DEMO_HINT.test(`${link.label} ${link.url}`)
      && !link.url.includes("github.com")
      && !isPackageRegistryUrl(link.url)
      && !asset;
  });
  return explicit?.url ?? repository.homepage ?? "";
}

function inferAudiences(text, language) {
  const value = text.toLowerCase();
  const audiences = [];
  if (/knowledge graph|지식 그래프|graph rag/.test(value)) audiences.push("문서와 지식 관계를 탐색하려는 AI 개발자");
  if (/markdown|documentation|문서/.test(value)) audiences.push("Markdown 문서를 구조화해 활용하려는 개발팀");
  if (/three\.js|3d|시각화/.test(value)) audiences.push("브라우저 기반 데이터 시각화에 관심 있는 개발자");
  if (audiences.length === 0) audiences.push(`${language || "오픈소스"} 프로젝트를 탐색하는 개발자`);
  return audiences.slice(0, 3);
}

function collectTechnologies(repository, packageJson) {
  const values = [repository.language, ...repository.topics];
  const dependencies = Object.keys(packageJson?.dependencies ?? {})
    .filter((name) => !name.startsWith("@types/"))
    .slice(0, 8);
  for (const item of dependencies) values.push(item);
  return [...new Set(values.filter(Boolean))].slice(0, 10);
}

function generateHooks(summary) {
  const feature = summary.features[0] ?? summary.description;
  const tech = summary.technologies.slice(0, 3).join(" · ");
  const hooks = [
    `${summary.name} — ${summary.description}`,
    feature ? `핵심 기능: ${feature}` : `${summary.name} 공개 데모`,
    summary.demoUrl ? `설치 전에 브라우저에서 먼저 체험하는 ${summary.name}` : `${summary.name}를 로컬에서 실행하는 방법`,
    tech ? `${tech}로 만든 ${summary.name}` : `${summary.name}의 구현과 사용 경험`,
    `${summary.name}를 사용해 보고 막힌 지점을 알려주세요`,
  ];
  return [...new Set(hooks.map((value) => value.trim()).filter(Boolean))].slice(0, 5);
}

export function buildProjectSummary(source) {
  const readmeTitle = source.readme.match(/^#\s+(.+)$/m)?.[1];
  const name = cleanTitle(readmeTitle ?? source.repository.name);
  const description = cleanDescription(source.repository.description || firstReadmeParagraph(source.readme) || `${name} 오픈소스 프로젝트`);
  const features = readSectionBullets(source.readme, FEATURE_SECTION, 5);
  const limitations = readSectionBullets(source.readme, LIMIT_SECTION, 3);
  const combined = `${name}\n${description}\n${features.join("\n")}\n${source.readme.slice(0, 8000)}`;
  const summary = {
    schemaVersion: "viral-project-summary/v1",
    name,
    repository: source.repository.fullName,
    repositoryUrl: source.repository.url,
    description,
    audiences: inferAudiences(combined, source.repository.language),
    features,
    technologies: collectTechnologies(source.repository, source.packageJson),
    demoUrl: findDemoUrl(source.repository, source.readme),
    license: source.repository.license,
    defaultBranch: source.repository.defaultBranch,
    limitations,
    evidence: {
      readme: source.repository.readmeUrl,
      repository: source.repository.url,
    },
  };
  return { ...summary, hooks: generateHooks(summary) };
}

function bulletList(values, emptyText = "- README에서 별도 항목을 찾지 못했습니다.") {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : emptyText;
}

function channelDescription(summary) {
  const original = cleanMarkdown(summary.description);
  const name = cleanMarkdown(summary.name);
  if (!name || original.length <= name.length) return original;

  let value = original;
  if (value.toLocaleLowerCase().startsWith(name.toLocaleLowerCase())) {
    value = value.slice(name.length).replace(/^[\s:—–-]+/u, "");
  }
  if (value.toLocaleLowerCase().endsWith(name.toLocaleLowerCase())) {
    const withoutName = value.slice(0, -name.length).replace(/[\s:—–-]+$/u, "");
    value = withoutName ? `${withoutName} 프로젝트` : value;
  }
  return value || original;
}

function asSentence(value) {
  const cleaned = cleanMarkdown(value);
  if (/[.!?。]$/u.test(cleaned)) return cleaned;
  if (/[가-힣]$/u.test(cleaned) && !/(다|요|니다)$/u.test(cleaned)) return `${cleaned}입니다.`;
  return `${cleaned}.`;
}

function cleanChannelItems(values) {
  return values.map((value) => cleanTitle(value)).filter(Boolean);
}

function renderXPost(summary) {
  const link = summary.demoUrl || summary.repositoryUrl;
  const suffix = `\n\n${link}`;
  const textBudget = 240 - countXWeightedCharacters(suffix);
  const originalDescription = cleanMarkdown(summary.description);
  const headline = originalDescription.toLocaleLowerCase().startsWith(cleanMarkdown(summary.name).toLocaleLowerCase())
    ? originalDescription
    : `${summary.name} — ${channelDescription(summary)}`;
  const text = truncateXWeightedText(headline, textBudget);
  return `${text}${suffix}\n`;
}

function feedbackCta(summary) {
  return `${summary.name}를 사용해 보고, 막히거나 이해하기 어려운 부분을 GitHub Issue로 알려주세요.`;
}

function assertNoHype(files) {
  const text = Object.values(files).join("\n");
  for (const word of BANNED_HYPE) {
    if (text.includes(word)) throw new Error(`금지 과장어가 생성되었습니다: ${word}`);
  }
}

export function renderContentPack(summary) {
  const featureLines = bulletList(cleanChannelItems(summary.features));
  const technologyLines = bulletList(summary.technologies);
  const audienceLines = bulletList(summary.audiences);
  const limitations = bulletList(summary.limitations, "- README의 요구사항과 제한 사항을 게시 전에 다시 확인하세요.");
  const demoLine = summary.demoUrl ? `- 공개 데모: ${summary.demoUrl}` : "- 공개 데모: 없음";
  const cta = feedbackCta(summary);
  const description = channelDescription(summary);
  const representativeLink = summary.demoUrl || summary.repositoryUrl;

  const files = {
    "project-summary.json": `${JSON.stringify(summary, null, 2)}\n`,
    "project-summary.md": `# ${summary.name}\n\n${summary.description}\n\n## 대상 사용자\n\n${audienceLines}\n\n## 핵심 기능\n\n${featureLines}\n\n## 기술\n\n${technologyLines}\n\n## 링크\n\n- GitHub: ${summary.repositoryUrl}\n${demoLine}\n- 라이선스: ${summary.license}\n\n## 확인할 한계\n\n${limitations}\n\n## 근거\n\n- README: ${summary.evidence.readme}\n`,
    "viral-hooks.md": `# ${summary.name} 콘텐츠 Hook\n\n${summary.hooks.map((hook, index) => `${index + 1}. ${hook}`).join("\n")}\n`,
    "short-post.md": renderXPost(summary),
    "community-post.md": `# GeekNews Show 게시 초안\n\n등록 구분: \`Show\`\n\n대표 링크: ${representativeLink}\n\n## 제목\n\n${summary.name} – ${description}\n\n## 본문\n\n${summary.name}를 소개합니다. ${asSentence(description)}\n\nREADME에서 확인한 주요 기능은 다음과 같습니다.\n\n${featureLines}\n\n${summary.demoUrl ? `공개 데모는 로그인 없이 먼저 확인할 수 있습니다.\n\n- 공개 데모: ${summary.demoUrl}\n` : ""}- GitHub: ${summary.repositoryUrl}\n- 라이선스: ${summary.license}\n\n## 현재 확인할 점\n\n${limitations}\n\n직접 사용해 보셨을 때 막히는 부분이나 가장 먼저 필요한 정보가 무엇인지 의견을 듣고 싶습니다.\n`,
    "long-post.md": `# ${summary.name} DEV 기술 글 초안\n\n> 이 글은 GitHub README와 저장소 메타데이터에서 확인한 사실로 만든 기술 초안입니다. DEV 게시 전 실제 설계 과정과 실행 예제를 직접 보강하세요.\n\n## 해결하려는 문제\n\n${asSentence(description)}\n\nREADME 내용을 기준으로 다음 개발자와 팀이 검토할 수 있는 프로젝트입니다.\n\n${audienceLines}\n\n## 접근 방식\n\n저장소가 공개한 핵심 기능은 다음과 같습니다.\n\n${featureLines}\n\n각 기능을 실제로 구현하면서 선택한 이유와 대안을 게시 전에 이 섹션에 추가하면, 링크 소개가 아니라 독립적인 기술 글이 됩니다.\n\n## 구현 구성\n\n저장소 메타데이터와 패키지 정보에서 확인한 기술 구성입니다.\n\n${technologyLines}\n\n구성 요소가 서로 어떻게 연결되는지, 핵심 데이터 흐름과 트레이드오프를 실제 코드 기준으로 보강하세요.\n\n## 직접 실행하기\n\n${summary.demoUrl ? `공개 데모: ${summary.demoUrl}\n\n` : ""}GitHub: ${summary.repositoryUrl}\n\n설치와 로컬 실행 명령은 원본 README에서 최신 내용을 확인하세요: ${summary.evidence.readme}\n\n## 현재 한계\n\n${limitations}\n\n## 소스와 라이선스\n\n- 저장소: ${summary.repositoryUrl}\n- 라이선스: ${summary.license}\n- 기본 브랜치: ${summary.defaultBranch}\n\n## 게시 전 보강할 내용\n\n- [ ] 이 프로젝트를 만들게 된 실제 계기\n- [ ] 핵심 구현을 보여주는 코드 또는 명령 예제\n- [ ] 선택하지 않은 대안과 현재 설계의 트레이드오프\n- [ ] 직접 실행해 확인한 결과와 알려진 실패 사례\n\n## 피드백\n\n${cta}\n`,
  };
  assertNoHype(files);
  return files;
}

export async function writeContentPack(rootDirectory, repoName, files) {
  const outputDirectory = join(rootDirectory, repoName);
  await mkdir(outputDirectory, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const target = join(outputDirectory, name);
    const temporary = `${target}.tmp`;
    await writeFile(temporary, content, "utf8");
    await rename(temporary, target);
  }
  return outputDirectory;
}

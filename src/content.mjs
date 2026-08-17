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

function truncateCharacters(value, limit) {
  const characters = Array.from(cleanMarkdown(value));
  if (characters.length <= limit) return characters.join("");
  return `${characters.slice(0, Math.max(0, limit - 1)).join("").trimEnd()}…`;
}

function renderXPost(summary, body) {
  const link = summary.demoUrl || summary.repositoryUrl;
  const suffix = `\n\n${link}`;
  const textBudget = 240 - countXWeightedCharacters(suffix);
  const text = truncateXWeightedText(body, textBudget);
  return `${text}${suffix}\n`;
}

function renderXVariants(summary) {
  const description = channelDescription(summary);
  const feature = cleanChannelItems(summary.features)[0] || description;
  const audience = summary.audiences[0] || "개발자";
  const technology = summary.technologies.slice(0, 3).join(" · ");
  const originalDescription = cleanMarkdown(summary.description);
  const first = originalDescription.toLocaleLowerCase().startsWith(cleanMarkdown(summary.name).toLocaleLowerCase())
    ? originalDescription
    : `${summary.name} — ${description}`;
  return [
    renderXPost(summary, first),
    renderXPost(summary, `${feature}. ${summary.name}에서 실제 결과와 구현을 공개했습니다.`),
    renderXPost(summary, `${audience}를 위한 ${summary.name}. ${technology ? `${technology} 기반으로 ` : ""}${description}`),
  ];
}

function renderXThread(summary) {
  const link = summary.demoUrl || summary.repositoryUrl;
  const features = cleanChannelItems(summary.features);
  const finalSuffix = `\n${link}`;
  const finalBody = `4/4 현재 확인할 점\n\n${summary.limitations.slice(0, 2).map((value) => `• ${value}`).join("\n") || "• README의 요구사항과 한계를 확인하세요."}\n\n직접 사용해 보고 막힌 부분을 알려주세요.`;
  const segments = [
    `1/4 ${summary.name}를 만든 이유\n\n${asSentence(channelDescription(summary))}`,
    `2/4 해결 방식\n\n${features.slice(0, 2).map((value) => `• ${value}`).join("\n") || "• README에서 핵심 기능을 확인하세요."}`,
    `3/4 구현 구성\n\n${summary.technologies.slice(0, 5).join(" · ") || "저장소 README에서 기술 구성을 확인할 수 있습니다."}`,
    `${truncateXWeightedText(finalBody, 280 - countXWeightedCharacters(finalSuffix))}${finalSuffix}`,
  ];
  return `${segments.map((segment) => truncateXWeightedText(segment, 280)).join("\n\n---\n\n")}\n`;
}

function renderThreadsSeries(summary) {
  const features = cleanChannelItems(summary.features);
  const link = summary.demoUrl || summary.repositoryUrl;
  return `# Threads Build in Public 연속 게시 초안

> 각 번호를 별도 게시물로 올리고, 실제 대표 이미지를 첫 게시물에 첨부하세요.

## 1/5 README에서 확인한 핵심 목표

${asSentence(channelDescription(summary))}

## 2/5 공개할 때 정리한 기준

기능 목록만 나열하지 않고, 공개된 사용 흐름과 현재 한계를 함께 확인할 수 있도록 정리했습니다.

## 3/5 해결 방식

${bulletList(features.slice(0, 3))}

## 4/5 실제 확인

${summary.demoUrl ? `로그인 없이 공개 데모를 확인할 수 있습니다: ${summary.demoUrl}` : `GitHub에서 설치와 실행 방법을 확인할 수 있습니다: ${summary.repositoryUrl}`}

## 5/5 현재 단계와 피드백

${bulletList(summary.limitations, "- README의 요구사항과 현재 한계를 게시 전에 다시 확인하세요.")}

가장 먼저 막히는 부분이나 더 보고 싶은 사용 흐름을 알려주세요.

${link}
`;
}

function renderRedditDraft(summary) {
  const features = cleanChannelItems(summary.features);
  const link = summary.demoUrl || summary.repositoryUrl;
  return `# Reddit 수동 게시 초안

상태: \`대상 서브레딧과 규칙 확인 전 게시 금지\`

- 대상 서브레딧: \`[게시 전 직접 선택]\`
- [ ] 자기홍보 허용 여부 확인
- [ ] 계정 연령·Karma·참여 이력 조건 확인
- [ ] 제목 형식·플레어·링크 규칙 확인
- [ ] 다른 서브레딧에 동일 본문 반복 게시하지 않음

## 제목

I built ${summary.name} — looking for feedback on the first-use experience

## 본문

개발자 본인이 만든 프로젝트를 공유합니다. ${asSentence(channelDescription(summary))}

현재 구현에서 확인할 수 있는 기능:

${bulletList(features.slice(0, 4))}

${summary.demoUrl ? `직접 체험: ${summary.demoUrl}\n\n` : ""}소스: ${summary.repositoryUrl}

라이선스: ${summary.license}

현재 한계:

${bulletList(summary.limitations, "- README의 요구사항과 제한 사항을 다시 확인해야 합니다.")}

이 프로젝트를 실제 작업에 적용한다면 어떤 부분이 가장 먼저 막힐지 구체적인 피드백을 받고 싶습니다.

> 영어권 서브레딧에 게시할 경우 본문 전체를 작성자 본인의 영어로 다시 검토하세요. 업보트·Star를 요청하지 마세요.

대표 링크: ${link}
`;
}

function renderLinkedInDraft(summary) {
  const features = cleanChannelItems(summary.features);
  return `# LinkedIn 게시물 초안

${summary.name}를 만들면서 해결하려고 했던 문제는 단순했습니다.

${asSentence(channelDescription(summary))}

이번 공개 버전에서는 다음 흐름을 확인할 수 있습니다.

${bulletList(features.slice(0, 3))}

기술 구성: ${summary.technologies.slice(0, 6).join(" · ") || "원본 README 참조"}

누구에게 유용한가:

${bulletList(summary.audiences)}

${summary.demoUrl ? `공개 데모: ${summary.demoUrl}\n` : ""}GitHub: ${summary.repositoryUrl}
라이선스: ${summary.license}

현재 한계:

${bulletList(summary.limitations, "- README의 요구사항과 한계를 확인해 주세요.")}

비슷한 문제를 해결해 본 분들의 구현 경험과 협업 피드백을 듣고 싶습니다.
`;
}

function renderDisquietDraft(summary) {
  const features = cleanChannelItems(summary.features);
  return `# Disquiet 제품 등록·연결 포스트 초안

> 현재 Disquiet은 본인이 만든 제품을 먼저 등록하고 검토받은 뒤, 제품에 연결된 포스트를 작성하는 구조입니다.

## 제품 등록 정보

- 제품명: ${summary.name}
- 한 줄 소개: ${channelDescription(summary)}
- 제품 링크: ${summary.demoUrl || summary.repositoryUrl}
- GitHub: ${summary.repositoryUrl}
- 라이선스: ${summary.license}
- 대표 이미지: 실제 제품 화면 1장 첨부

## 주요 기능

${bulletList(features.slice(0, 4))}

## 제품 연결 포스트

${summary.name}를 공개합니다.

${asSentence(channelDescription(summary))}

이 소개에서는 기능 목록보다 실제 사용자가 핵심 흐름과 현재 한계를 함께 이해할 수 있도록 정리했습니다.

현재 확인할 수 있는 범위:

${bulletList(features.slice(0, 3))}

현재 한계:

${bulletList(summary.limitations, "- README의 요구사항과 한계를 확인해 주세요.")}

직접 사용했을 때 이해하기 어려운 지점이나 다음에 보고 싶은 기능을 알려주세요.

> 제품 등록·검토가 끝난 뒤 이 포스트를 제품에 연결하세요. 일반 메이커 로그로 단독 게시하지 않습니다.
`;
}

function renderFacebookDraft(summary) {
  const features = cleanChannelItems(summary.features);
  const link = summary.demoUrl || summary.repositoryUrl;
  return `# Facebook Reels·그룹 수동 게시 작업본

상태: \`원본 세로 영상과 그룹 규칙 확인 전 게시 금지\`

- 그룹 규칙 도움말: https://www.facebook.com/help/462230500886400/
- 원본 콘텐츠 안내: https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/

## Facebook Reels 캡션

${summary.name}의 실제 화면을 20초로 정리했습니다.

${asSentence(channelDescription(summary))}

확인할 수 있는 내용:

${bulletList(features.slice(0, 3))}

데모와 소스: ${link}

## 관련 Facebook 그룹용 본문

직접 만든 ${summary.name}의 현재 공개 버전을 공유합니다.

${asSentence(channelDescription(summary))}

${summary.demoUrl ? `로그인 없이 확인 가능한 데모: ${summary.demoUrl}\n\n` : ""}GitHub: ${summary.repositoryUrl}
라이선스: ${summary.license}

현재 한계:

${bulletList(summary.limitations, "- README의 요구사항과 현재 한계를 다시 확인해야 합니다.")}

이런 도구를 처음 사용할 때 가장 먼저 확인하고 싶은 정보가 무엇인지 피드백을 받고 싶습니다.

## 게시 전 확인

- [ ] 기존 1080×1920 세로 영상이 실제 제품 화면으로 구성됨
- [ ] 게시 대상 그룹의 자기홍보·링크·게시 형식 규칙 확인
- [ ] 같은 문구를 여러 그룹에 반복 게시하지 않음
- [ ] 다른 사람의 영상이나 사소한 편집본이 아닌 원본 콘텐츠 사용
- [ ] 반응이나 공유를 인위적으로 요청하지 않음
`;
}

function renderInstagramDraft(summary) {
  const features = cleanChannelItems(summary.features);
  const link = summary.demoUrl || summary.repositoryUrl;
  const coverText = truncateCharacters(`${summary.name} 실제 화면 20초`, 42);
  return `# Instagram Reels 게시 작업본

상태: \`원본 세로 영상·표지·프로필 링크 검수 후 게시\`

- Creator Best Practices: https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/

## 표지 문구

${coverText}

## Reels 캡션

${summary.name}의 실제 사용 화면을 20초로 정리했습니다.

${asSentence(channelDescription(summary))}

${features.slice(0, 2).map((feature) => `• ${feature}`).join("\n") || "• README에서 핵심 기능을 확인할 수 있습니다."}

데모와 GitHub는 프로필의 대표 링크에서 확인할 수 있습니다.

#opensource #buildinpublic #devtools

## 링크 메모

- 대표 링크: ${link}
- GitHub: ${summary.repositoryUrl}

## 게시 전 확인

- [ ] 기존 1080×1920 세로 영상이 실제 제품 화면으로 구성됨
- [ ] 핵심 UI가 모바일 안전 영역 안에서 식별됨
- [ ] 표지 문구와 자막을 실제 영상에서 확인
- [ ] 프로필 링크가 대표 링크로 연결됨
- [ ] 반복 댓글·과도한 태그·인위적 반응 요청 없음
`;
}

function renderProductHuntDraft(summary) {
  const description = truncateCharacters(`${summary.name} — ${channelDescription(summary)}`, 260);
  const tagline = truncateCharacters(channelDescription(summary), 60);
  const features = cleanChannelItems(summary.features);
  return `# Product Hunt 론칭 준비 작업본

상태: \`제품 페이지·대표 자산·작성자 영어 검토 후 예약 또는 게시\`

- 공식 게시 방법: https://help.producthunt.com/en/articles/479557-how-to-post-a-product

## 제품 정보

- 제품명: ${summary.name}
- 태그라인: ${tagline}
- 설명(260자 이내): ${description}
- 제품 URL: ${summary.demoUrl || summary.repositoryUrl}
- GitHub: ${summary.repositoryUrl}
- 라이선스: ${summary.license}
- 가격: \`[Free / Paid / Free trial 중 실제 상태 선택]\`
- 공개 상태: \`[Live / Beta 상태 직접 확인]\`
- Topics: \`[Product Hunt에서 실제 선택]\`

## Thumbnail

- 권장: 정사각형, 240×240
- 사용 파일: \`[실제 제품 아이콘 선택]\`

## Gallery 자산

- [ ] 실제 제품 화면 2장 이상 준비 — 권장 1270×760
- [ ] 첫 이미지에서 제품명과 핵심 화면이 식별됨
- [ ] 영상은 공개 YouTube 전체 URL만 사용하거나 생략
- [ ] 이미지 안 문구와 현재 제품 기능이 일치함

## Maker 첫 댓글

안녕하세요. ${summary.name}를 만든 개발자입니다.

${asSentence(channelDescription(summary))}

현재 공개 버전에서 먼저 확인할 수 있는 기능은 다음과 같습니다.

${bulletList(features.slice(0, 3))}

현재 한계:

${bulletList(summary.limitations, "- README의 요구사항과 현재 한계를 확인해 주세요.")}

실제로 사용했을 때 첫 화면에서 이해하기 어려운 부분을 구체적으로 알려주시면 다음 개선에 반영하겠습니다.

## 게시 전 확인

- [ ] 제품과 공개 링크가 실제로 작동함
- [ ] 개인 계정의 게시 권한과 Maker 정보 확인
- [ ] 대표 이미지·영상 권리와 최신 화면 확인
- [ ] 태그라인·설명·첫 댓글을 작성자 본인의 영어로 재작성
- [ ] 첫 댓글을 작성자 본인의 말투로 수정
- [ ] 먼저 Create Draft로 전체 미리보기를 확인한 뒤 30일 안의 날짜를 예약
- [ ] 투표나 인위적 반응을 요청하지 않음
`;
}

function renderPeerlistDraft(summary) {
  const features = cleanChannelItems(summary.features);
  return `# Peerlist Launchpad 론칭 준비 작업본

상태: \`프로필 인증·프로젝트 완성도·작성자 영어·론칭 일정 확인 후 게시\`

- 공식 Launchpad 가이드: https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad

## Launchpad 제품 정보

- 제품명: ${summary.name}
- 한 줄 소개: ${truncateCharacters(channelDescription(summary), 120)}
- 제품 URL: ${summary.demoUrl || summary.repositoryUrl}
- GitHub: ${summary.repositoryUrl}
- 대표 이미지: 실제 제품 화면 1장

## 주요 기능

${bulletList(features.slice(0, 4))}

## Maker 소개 댓글

${summary.name}를 공개합니다. ${asSentence(channelDescription(summary))}

현재 공개 버전의 기능과 한계를 함께 적었습니다. 처음 사용했을 때 막히는 단계와 더 필요한 사용 예시를 알려주세요.

## 게시 전 확인

- [ ] Peerlist 프로필 인증 완료
- [ ] 프로젝트 페이지 필수 항목과 완성도 확인
- [ ] 월요일 공개 또는 예약 일정 확인
- [ ] 대표 링크와 이미지가 외부에서 열림
- [ ] 제품 소개와 댓글을 작성자 본인의 영어로 재작성
- [ ] 원치 않는 메시지로 추천을 요청하지 않음
- [ ] 링크를 무관한 게시물이나 댓글에 반복하지 않음
`;
}

function renderIndieHackersDraft(summary) {
  const features = cleanChannelItems(summary.features);
  return `# Indie Hackers Build in Public 작업본

상태: \`실제 제작 경험과 작성자 본인의 영어를 보강한 뒤 게시\`

- 커뮤니티: https://www.indiehackers.com/

## 제목

I built ${summary.name} and I am looking for feedback on the first-use flow

## 본문

### 해결하려던 문제

${asSentence(channelDescription(summary))}

### 지금까지 만든 것

${bulletList(features.slice(0, 4))}

### 공개 상태

${summary.demoUrl ? `- 데모: ${summary.demoUrl}\n` : ""}- GitHub: ${summary.repositoryUrl}
- 라이선스: ${summary.license}

### 현재 한계

${bulletList(summary.limitations, "- README의 요구사항과 현재 한계를 확인해 주세요.")}

## 피드백 받고 싶은 부분

처음 접한 사용자가 어떤 단계에서 목적을 이해하지 못하는지, 실제 작업에 적용하려면 어떤 예시가 먼저 필요한지 알고 싶습니다.

> 게시 전 실제 제작 계기와 가장 어려웠던 결정 한 가지를 작성자 본인의 경험으로 추가하세요. 판매 문구나 성과 수치를 만들어 넣지 마세요.
`;
}

function renderOkkyDraft(summary) {
  const features = cleanChannelItems(summary.features);
  return `# OKKY 프로젝트 소개·피드백 작업본

상태: \`커뮤니티 규칙과 최종 말투 확인 후 게시\`

- 커뮤니티: https://okky.kr/community

## 제목

[프로젝트 공유] ${summary.name} — ${truncateCharacters(channelDescription(summary), 48)}

## 본문

안녕하세요. 직접 개발한 ${summary.name}의 현재 공개 버전을 공유합니다.

${asSentence(channelDescription(summary))}

현재 확인할 수 있는 기능:

${bulletList(features.slice(0, 4))}

${summary.demoUrl ? `공개 데모: ${summary.demoUrl}\n` : ""}GitHub: ${summary.repositoryUrl}
라이선스: ${summary.license}

현재 한계:

${bulletList(summary.limitations, "- README의 요구사항과 현재 한계를 확인해 주세요.")}

처음 사용하셨을 때 설명이 부족한 부분이나 실제 개발 업무에서 필요할 것 같은 사용 예시를 알려주시면 다음 수정에 참고하겠습니다.

## 게시 전 확인

- [ ] OKKY 게시판과 프로젝트 공유 규칙 확인
- [ ] 광고문이 아닌 개발 경험과 현재 한계 중심으로 최종 수정
- [ ] 데모·GitHub 링크가 외부에서 열림
- [ ] Star·추천·반복 댓글을 요청하지 않음
`;
}

function renderShortsDraft(summary) {
  return `# YouTube Shorts 게시 준비 초안

상태: \`실제 세로 영상 제작·검수 후 게시\`

- 권장 규격: 1080×1920, H.264, 15~30초
- 화면: 실제 제품 화면만 사용
- 시청 조건: 무음으로도 이해되는 자막
- 음악: 저작권이 확인된 음원 또는 무음
- 재사용 채널: Instagram Reels · Facebook Reels · TikTok

## 20초 샷리스트

| 구간 | 화면 | 자막 |
|---|---|---|
| 0~3초 | 대표 화면 전체 | ${summary.name}, 20초 안에 핵심 화면을 확인해 보세요 |
| 3~7초 | 핵심 그래프·결과 확대 | ${cleanChannelItems(summary.features)[0] || channelDescription(summary)} |
| 7~12초 | 탐색·필터·근거 영역 | ${cleanChannelItems(summary.features)[1] || "문서와 관계를 한 화면에서 탐색"} |
| 12~16초 | 구현 또는 근거 화면 | ${summary.technologies.slice(0, 3).join(" · ") || "실제 저장소 기반 구현"} |
| 16~20초 | 대표 화면 + 링크 안내 | ${summary.name} · 데모와 GitHub에서 확인하세요 |

## 제목

${summary.name} 실제 화면 20초 데모

## 설명

${asSentence(channelDescription(summary))}

${summary.demoUrl ? `데모: ${summary.demoUrl}\n` : ""}GitHub: ${summary.repositoryUrl}
라이선스: ${summary.license}

## 게시 전 확인

- [ ] 화면의 개인정보·token·로컬 경로 제거
- [ ] 자막이 모바일 안전 영역 안에 있음
- [ ] 데모와 GitHub 링크가 열림
- [ ] 사용한 음악·이미지·폰트 권리 확인
`;
}

function renderShowHnDraft(summary) {
  const technologies = summary.technologies.slice(0, 5).join(", ") || "the technologies listed in the repository";
  const titleSuffix = summary.demoUrl ? "an open-source project with a live demo" : "an open-source project";
  return `# Show HN human-review draft

Status: \`HOLD — publish only after earlier channel feedback is incorporated\`

## Title

Show HN: ${summary.name} – ${titleSuffix}

## Submission URL

${summary.demoUrl || summary.repositoryUrl}

## Author context draft

I built ${summary.name}. The repository currently describes it as: ${channelDescription(summary)}

The current implementation uses ${technologies}.

What you can try:

${bulletList(cleanChannelItems(summary.features).slice(0, 4))}

Current limitations:

${bulletList(summary.limitations, "- Review the repository requirements and known limitations before posting.")}

Source: ${summary.repositoryUrl}
License: ${summary.license}

I would especially appreciate feedback on the first confusing step in the demo and whether the relationship evidence is clear enough.

## Before posting

- [ ] Rewrite the title and context in the author's own English
- [ ] Confirm the demo works without signup or email
- [ ] Incorporate feedback from earlier channels
- [ ] Be available to answer technical questions after submission
- [ ] Do not ask anyone to upvote or comment
- [ ] Do not generate or automate HN comments
`;
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
  const xVariants = renderXVariants(summary);
  const geeknews = `# GeekNews Show 게시 초안\n\n등록 구분: \`Show\`\n\n대표 링크: ${representativeLink}\n\n## 제목\n\n${summary.name} – ${description}\n\n## 본문\n\n${summary.name}를 소개합니다. ${asSentence(description)}\n\nREADME에서 확인한 주요 기능은 다음과 같습니다.\n\n${featureLines}\n\n${summary.demoUrl ? `공개 데모는 로그인 없이 먼저 확인할 수 있습니다.\n\n- 공개 데모: ${summary.demoUrl}\n` : ""}- GitHub: ${summary.repositoryUrl}\n- 라이선스: ${summary.license}\n\n## 현재 확인할 점\n\n${limitations}\n\n직접 사용해 보셨을 때 막히는 부분이나 가장 먼저 필요한 정보가 무엇인지 의견을 듣고 싶습니다.\n`;
  const dev = `# ${summary.name} DEV 기술 글 작업본\n\n> 이 글은 GitHub README와 저장소 메타데이터에서 확인한 사실로 만든 작업본입니다. 실제 설계 과정과 실행 예제를 직접 보강하기 전에는 게시하지 마세요.\n\n## 해결하려는 문제\n\n${asSentence(description)}\n\nREADME 내용을 기준으로 다음 개발자와 팀이 검토할 수 있는 프로젝트입니다.\n\n${audienceLines}\n\n## 접근 방식\n\n저장소가 공개한 핵심 기능은 다음과 같습니다.\n\n${featureLines}\n\n각 기능을 구현하면서 선택한 이유와 검토한 대안을 실제 경험으로 보강하세요.\n\n## 구현 구성\n\n저장소 메타데이터와 패키지 정보에서 확인한 기술 구성입니다.\n\n${technologyLines}\n\n구성 요소의 연결, 핵심 데이터 흐름, 실패 처리와 트레이드오프를 실제 코드 기준으로 보강하세요.\n\n## 직접 실행하기\n\n${summary.demoUrl ? `공개 데모: ${summary.demoUrl}\n\n` : ""}GitHub: ${summary.repositoryUrl}\n\n설치와 로컬 실행 명령은 원본 README에서 최신 내용을 확인하세요: ${summary.evidence.readme}\n\n## 현재 한계\n\n${limitations}\n\n## 소스와 라이선스\n\n- 저장소: ${summary.repositoryUrl}\n- 라이선스: ${summary.license}\n- 기본 브랜치: ${summary.defaultBranch}\n\n## 게시 전 보강할 내용\n\n- [ ] 이 프로젝트를 만들게 된 실제 계기\n- [ ] 핵심 구현을 보여주는 코드 또는 명령 예제\n- [ ] 선택하지 않은 대안과 현재 설계의 트레이드오프\n- [ ] 직접 실행해 확인한 결과와 알려진 실패 사례\n\n## 피드백\n\n${cta}\n`;

  const files = {
    "project-summary.json": `${JSON.stringify(summary, null, 2)}\n`,
    "project-summary.md": `# ${summary.name}\n\n${summary.description}\n\n## 대상 사용자\n\n${audienceLines}\n\n## 핵심 기능\n\n${featureLines}\n\n## 기술\n\n${technologyLines}\n\n## 링크\n\n- GitHub: ${summary.repositoryUrl}\n${demoLine}\n- 라이선스: ${summary.license}\n\n## 확인할 한계\n\n${limitations}\n\n## 근거\n\n- README: ${summary.evidence.readme}\n`,
    "viral-hooks.md": `# ${summary.name} 콘텐츠 Hook\n\n${summary.hooks.map((hook, index) => `${index + 1}. ${hook}`).join("\n")}\n`,
    "x-single-1.md": xVariants[0],
    "x-single-2.md": xVariants[1],
    "x-single-3.md": xVariants[2],
    "x-thread.md": renderXThread(summary),
    "threads-series.md": renderThreadsSeries(summary),
    "reddit-post.md": renderRedditDraft(summary),
    "linkedin-post.md": renderLinkedInDraft(summary),
    "disquiet-product.md": renderDisquietDraft(summary),
    "facebook-post.md": renderFacebookDraft(summary),
    "instagram-reels.md": renderInstagramDraft(summary),
    "product-hunt-launch.md": renderProductHuntDraft(summary),
    "peerlist-launchpad.md": renderPeerlistDraft(summary),
    "indie-hackers-post.md": renderIndieHackersDraft(summary),
    "okky-post.md": renderOkkyDraft(summary),
    "geeknews-show.md": geeknews,
    "dev-article.md": dev,
    "youtube-shorts.md": renderShortsDraft(summary),
    "show-hn.md": renderShowHnDraft(summary),
    "short-post.md": xVariants[0],
    "community-post.md": geeknews,
    "long-post.md": dev,
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

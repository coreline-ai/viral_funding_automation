# 바이럴 원고 최종 채널 적합성 검토·교정 보고서

검토 기준일: `2026-08-17 KST`  
검토 대상: `memory_node_graph`용 18개 웹 원고와 첫 출시팩  
판정 범위: 사실 정확성, 채널 형식, 언어, 과장·스팸 위험, AI 콘텐츠 정책, 게시 전 운영 게이트

## 1. 결론

검토 전 자동 생성 18개 원고는 **사실 기반 작업본**으로는 유효했지만, 전체를 그대로 복사해 게시할 수 있는 최종본은 아니었다.

전문가 검토와 공식 자료 대조 후 다음처럼 교정했다.

- X·Threads·LinkedIn·Disquiet·Facebook·Instagram·OKKY·GeekNews·Shorts: 채널별 훅, 공개 데모 경계, 구체적 질문 중심으로 교정
- 기술 스택: GitHub Topics와 실제 package dependencies를 분리
- `Node.js 22.13+` 같은 실행 요구사항을 제품 한계로 반복하던 오류 수정
- Reddit·Product Hunt 자동본·Peerlist·Indie Hackers·DEV·Show HN: `HOLD`를 명시하고 사람 입력 전 복사 차단
- Show HN: 생성 제목·본문을 제거하고 작성자 전용 사실 체크리스트만 유지
- DEV: README 재구성형 홍보 초안을 제거하고 사람 기술 사례 작성 자료로 변경
- `memory_node_graph` 전용 최종 교정 원고를 `final/verified-channel-copy-pack.md`로 작성

어떤 문구도 바이럴 성과를 보장할 수는 없다. 최종 판정은 **채널 형식과 정책에 맞고, 확인된 사실만 사용하며, 스팸·과장 위험을 줄인 원고인가**에 대한 판정이다.

## 2. 검토 체계

### 전문가 역할

| 역할 | 검토 범위 |
|---|---|
| 소셜 API 전문가 | Threads, X, LinkedIn, Facebook, Instagram, Bluesky, Mastodon, Discord의 공식 게시 방식·권한 |
| 커뮤니티 플랫폼 전문가 | Reddit, Product Hunt, Show HN, GeekNews, Disquiet, DEV, Peerlist, Indie Hackers, OKKY의 게시 문화·규칙 |
| 콘텐츠 에디토리얼 전문가 | 18개 생성 원고의 사실성·채널 적합성·언어·CTA·AI틱 반복 표현 |
| 주 에이전트 | 공개 저장소·데모·package.json 재검증, 코드 교정, 재생성·테스트, 최종 문서 통합 |

### 검토 근거

- 프로젝트 공개 저장소: https://github.com/coreline-ai/memory_node_graph
- 프로젝트 공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
- 각 서비스 공식 도움말·개발자 문서·정책
- 실제 생성 코드: `src/content.mjs`
- 실제 웹 작업본: `/api/generate` 응답과 `campaigns/.../generated`

## 3. 인터넷·저장소 사실 검증

| 항목 | 확인 결과 |
|---|---|
| 저장소 | `coreline-ai/memory_node_graph`, Public |
| 프로젝트명 | `AI Systems Atlas` |
| GitHub 설명 | Markdown을 관계형 지식 그래프로 변환·탐색하는 프로젝트 |
| 기본 언어 | TypeScript |
| 기본 브랜치 | `main` |
| 라이선스 | MIT |
| 공개 데모 | 직접 HTTP `200` 확인 |
| 공개 데모 접근 | 로그인 불필요 |
| 공개 데모 경계 | 검증 JSON을 읽는 읽기 전용 정적 snapshot, 운영 D1/API/OAuth 미포함 |
| 로컬 요구사항 | Node.js 22.13+, Wrangler/Miniflare로 로컬 D1 구성 |
| 주요 실제 구현 기술 | TypeScript, React, Three.js, Remark/Unified, Next/vinext, Drizzle ORM, Cloudflare D1 |

숫자형 데이터는 시점에 따라 바뀌므로 최종 게시 원고에서 기준 시각 없는 노드·관계·사용자·성과 수치를 사용하지 않았다.

## 4. 발견한 핵심 문제와 수정

### 4.1 기술 스택과 GitHub Topics 혼합

기존 `collectTechnologies()`는 저장소 언어 뒤에 `repository.topics`를 넣어 `ai`, `coreline-ai`, `local-first`, `data-visualization`을 기술 스택처럼 출력했다.

수정:

- `technologies`: 저장소 언어 + `package.json dependencies`
- `topics`: GitHub Topics 별도 배열
- DEV 작업 자료와 프로젝트 요약에서 두 영역을 명확히 분리

### 4.2 실행 요구사항을 현재 한계로 표시

기존 섹션 정규식은 `요구사항`을 `limitations`에 포함했다. 이 때문에 `Node.js 22.13+`, `Wrangler/Miniflare`가 모든 채널에서 제품 한계처럼 반복됐다.

수정:

- `requirements`와 `limitations` 분리
- README에서 `read-only/static snapshot` 문장을 `demoNote`로 추출
- 대외 원고에는 `공개 범위와 현재 한계`로 표시
- 설치 요구사항은 프로젝트 요약·기술 글 작성 자료에만 별도 표시

### 4.3 공개 데모와 로컬 앱의 기대 불일치

기존 원고 대부분은 로그인 없는 데모만 강조하고 정적·읽기 전용이라는 사실을 밝히지 않았다.

수정:

```text
공개 데모는 로그인 없는 읽기 전용 정적 snapshot이며,
Markdown 가져오기와 저장소 동기화는 로컬 앱에서 사용할 수 있습니다.
```

이 경계 문장을 Threads, LinkedIn, Disquiet, OKKY, X 스레드, Product Hunt 최종본 등에 반영했다.

### 4.4 AI틱 반복 표현

기존 원고는 다음 표현을 여러 채널에서 반복했다.

- “실제 결과와 구현을 공개했습니다”
- “누구에게 유용한가” 뒤 기능 목록
- “막힌 부분을 알려주세요”
- “README에서 확인한 주요 기능”

수정:

- X: 문제 중심, 근거 관계와 화면 연결의 차이, 구현 흐름 3안으로 분리
- Threads: 5개 메타 게시를 3개 대화형 게시로 축소
- CTA: `첫 화면에서 관계 근거와 탐색 방법이 이해되는가`처럼 답할 수 있는 한 질문으로 교정
- Shorts: 긴 기술 bullet 대신 20초 자막 흐름으로 축약

### 4.5 한·영 혼합과 작성자 경험 생성 위험

Reddit, Indie Hackers, Show HN은 영어 제목과 한국어 본문이 섞여 있었다. DEV는 실제 경험이 없는데도 게시문처럼 보였다.

수정:

- Reddit: 제목·본문 제거, 대상 Subreddit 결정 후 작성자가 다시 쓸 사실 자료만 제공
- Indie Hackers: `HOLD`, 실제 계기·어려운 결정·실패를 작성자 입력으로 고정
- DEV: `HOLD`, AI 사용 공개와 사람 기술 사례 체크리스트로 전환
- Show HN: 생성 제목·본문 전면 제거

### 4.6 작업 지시까지 복사되는 위험

웹의 기존 `복사` 버튼은 `[게시 전 직접 선택]`, 체크리스트, `HOLD`까지 전체 복사했다.

수정:

- 버튼명을 `작업본 복사`로 변경
- 복사 후 서비스 입력 필드와 내부 체크를 구분하라는 안내 표시
- 본문에 `HOLD`가 남은 Reddit·Product Hunt 자동본·Peerlist·Indie Hackers·DEV·Show HN 작업본은 복사 버튼 비활성화
- 사람이 충분히 보강해 `HOLD`를 직접 해제한 경우에만 복사 가능

## 5. 18개 원고 최종 판정

| 웹 원고 | 교정 후 판정 | 이유·남은 조건 |
|---|---|---|
| X 단일 1안 | 조건부 사용 가능 | 가중 문자 통과, 한 안만 선택 |
| X 단일 2안 | 조건부 사용 가능 | 공허한 홍보 대신 대표 기능·데모 흐름 |
| X 단일 3안 | 조건부 사용 가능 | 잘못된 Topics 기술 나열 제거 |
| X 스레드 | 조건부 사용 가능 | 4개에서 3개로 축소, 각 구간 280 가중자 검사 |
| Threads | 조건부 사용 가능 | 메타 설명 제거, 3개 대화형 게시로 교정 |
| Reddit | HOLD | Subreddit·계정·Flair·언어 미확정 |
| LinkedIn | 조건부 사용 가능 | 구현 구성 정확화, 전문적 질문 보강 |
| Disquiet | 조건부 사용 가능 | 제품 선등록 후 연결 포스트로 사용 |
| Facebook | Reels 조건부 / 그룹 HOLD | 그룹은 규칙·자기홍보 허용 확인 필요 |
| Instagram | 조건부 사용 가능 | 프로필 링크·표지·세로 영상 확인 필요 |
| Product Hunt 자동본 | HOLD | 한국어 입력 자료, 영문 정본은 별도 final 사용 |
| Peerlist | HOLD | 영문·인증 프로필·프로젝트 100% 필요 |
| Indie Hackers | HOLD | 작성자의 실제 계기·실패·결정 필요 |
| OKKY | 조건부 사용 가능 | 실제 카테고리와 운영정책 확인 필요 |
| GeekNews 자동본 | 작업본 | 실제 게시에는 별도 final 정본 우선 |
| DEV | HOLD | 사람 기술 사례·코드·AI 공개 전 게시 금지 |
| YouTube Shorts | 조건부 사용 가능 | 완성 영상·권리·자막 검수 필요 |
| Show HN | 생성 원고 사용 금지 | 작성자가 LLM 도움 없이 처음부터 직접 작성 |

## 6. 서비스별 정책 대조 핵심

### X

- 일반 게시물 280 가중 문자
- 링크는 t.co 처리 기준 적용
- 자동 게시 개발 시 공식 API와 사용자 명시 승인 필요

공식 자료:

- https://help.x.com/en/using-x/how-to-post
- https://docs.x.com/x-api/posts/create-post

### Threads

- 공식 API가 텍스트·미디어 게시를 지원
- 이 프로젝트는 자동화 전에도 원본 콘텐츠와 실제 제품 화면을 함께 사용

공식 자료:

- https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- https://about.fb.com/news/2024/10/find-your-community-with-new-threads-educational-insights/

### LinkedIn

- 기능 목록보다 고유 경험·지식·실행 가능한 insight 중심이 적합
- 현재 원고는 공개 버전의 구현 맥락과 질문을 보강

공식 자료:

- https://www.linkedin.com/help/linkedin/answer/a7455199
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-04

### Reddit

- 반복·대량 자기홍보와 자동화된 스팸 확산 금지
- Subreddit 규칙이 플랫폼 공통 초안보다 우선

공식 자료:

- https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki

### Product Hunt

- 제품 정보, 260자 설명, Thumbnail, Gallery, Maker 첫 댓글과 Draft 확인 필요
- 업보트 요구·보상·조직적 투표 금지

공식 자료:

- https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post

### GeekNews

- 본인 프로젝트는 Show, 가입 1주, 로그인 없는 직접 체험 권장
- 대량 AI 요약·SEO형 글, 반복 홍보, 과도한 자동화 제한

공식 자료:

- https://news.hada.io/guidelines
- https://news.hada.io/terms

### DEV

- 본문 자체에 실질적인 개발 내용 필요
- AI 보조 사실 공개와 작성자 사실 검증 필요
- AI 보조 글이 자신의 프로그램 홍보를 목적으로 해서는 안 됨

공식 자료:

- https://dev.to/terms
- https://dev.to/guidelines-for-ai-assisted-articles-on-dev/

### Show HN

- 직접 만든 프로젝트와 즉시 체험 가능한 데모 필요
- 2026년 운영자 안내에 따라 제출 문장에 LLM 생성·편집·윤문을 사용하지 않음

공식 자료:

- https://news.ycombinator.com/showhn.html
- https://news.ycombinator.com/item?id=22336638

## 7. 최종 사용 파일

| 파일 | 용도 |
|---|---|
| `campaigns/memory_node_graph/2026-08-first-launch/final/verified-channel-copy-pack.md` | 채널별 교정 정본·HOLD 기준 |
| `campaigns/memory_node_graph/2026-08-first-launch/final/geeknews-show.md` | GeekNews 조건부 최종본 |
| `campaigns/memory_node_graph/2026-08-first-launch/final/product-hunt-launch.md` | Product Hunt 조건부 영문 정본 |
| `campaigns/memory_node_graph/2026-08-first-launch/final/product-hunt-checklist.md` | Product Hunt 계정·자산 게이트 |
| `reviews/automation/PUBLISHING_AUTOMATION_PREFLIGHT_20260817.md` | 계정 확보 이후 자동화 개발 입력정보 |

`output/memory_node_graph`와 `campaigns/.../generated`는 최신 템플릿으로 재생성되더라도 **자동 분석 작업본**이다. 실제 게시에는 위 final 파일과 서비스별 계정 조건을 우선한다.

## 8. 최종 판정

- 사실성: `통과`
- 기술 스택·Topics 분리: `통과`
- 공개 데모/로컬 경계: `통과`
- 과장·성과 수치: `통과`
- X 문자 검증: `통과`
- 영어권 채널 한·영 혼합 방지: `HOLD 게이트로 통과`
- Show HN AI 정책: `생성 본문 제거로 통과`
- DEV AI 정책: `사람 작성 자료 전환으로 통과`
- 실제 게시 완료: `미실행 — 계정 확보 후 사용자 직접 진행`

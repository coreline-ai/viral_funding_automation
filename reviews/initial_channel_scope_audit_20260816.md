# 초기 개발 계획 바이럴 채널 전체 점검

점검 일시: `2026-08-16 KST`

점검 대상:

- `coreline_github_viral_funding_automation_plan.md`
- 현재 `src/`, `web/`, `tests/`
- `memory_node_graph` 첫 출시팩
- 각 플랫폼의 2026-08 현재 공식 문서와 운영 안내

## 0. 후속 구현 반영 결과

이 문서는 구현 전 누락 범위를 찾기 위해 작성한 감사 기준선이다. 감사 후 `전체 채널 상태 표시 → Threads → Reddit → X 3안·스레드 → LinkedIn·Disquiet → DEV → Shorts → Show HN` 순서로 수동 게시용 MVP를 반영했다.

| 항목 | 후속 구현 상태 |
|---|---|
| 전체 채널 상태 | 외부 플랫폼 13개를 `초안·운영 게이트·보류·후순위`로 GUI 표시 |
| 채널 원고 | X 4종을 포함한 12개 원고 탭과 Markdown 파일 생성 |
| X | 단일 3안과 4개 구간 스레드, 복합 emoji·URL·CJK 회귀 검사 |
| Threads·LinkedIn | 채널별 수동 게시 원고 구현 |
| Reddit | 서브레딧·계정·규칙 미확인 시 게시 금지 게이트 구현 |
| Disquiet | 제품 등록 정보 + 제품 연결 포스트 구현 |
| GeekNews | 기존 Show 원고·최종본·preflight·baseline 유지 |
| DEV | 기술 글 작업본과 수동 보강 전 게시 금지 유지 |
| Shorts | 샷리스트 + 실제 제품 화면 기반 20초, 1080×1920, H.264 영상 제작 |
| Show HN | 사람 영어 재작성·앞선 피드백 반영 전 보류 작업본 구현 |
| 선택 채널 | TikTok·Discord·Bluesky·Mastodon은 상태만 표시하고 생성 범위에서 제외 |

실제 `memory_node_graph` API 생성 결과를 캠페인에 갱신했고, Chromium 데스크톱·모바일 1턴에서 13개 상태, 12개 원고, 복사, 저장, 모바일 탭 스크롤, 콘솔 오류 없음까지 통과했다. 아래의 “현재 구현” 표현은 감사 시점의 역사적 상태다.

## 1. 결론

초기 계획에 포함된 바이럴 사이트 전체를 기준으로 보면 현재 구현은 완료 상태가 아니다.

- `memory_node_graph`의 초기 핵심 채널 8개 중 GeekNews만 게시 조건부 완료다.
- X는 단일 원고 1개만 구현되어 초기 계획의 `단일 게시물 3안 + 스레드 1안`에는 미달한다.
- DEV는 섹션 구조 초안만 있으며 실제 기술 글은 미완성이다.
- Threads, LinkedIn, Reddit, Show HN, YouTube Shorts는 생성물이 없다.
- §10에 포함된 Disquiet도 없으며, 초기 계획의 `메이커 로그` 방식은 현재 Disquiet 제품 중심 구조와 맞지 않는다.
- Bluesky와 Mastodon은 초기 계획에서 선택 채널이므로 핵심 MVP 완료 조건에서는 제외할 수 있다.
- TikTok과 Discord는 `mini-web-game`용 권장 채널로, `memory_node_graph` 첫 캠페인의 필수 채널은 아니다.

따라서 현재 상태를 정확히 표현하면 다음과 같다.

> 공개 GitHub 저장소를 분석해 X·GeekNews·DEV 구조 초안을 생성하는 1차 MVP는 완료했지만, 초기 계획의 전체 바이럴 출시팩은 미완성이다.

## 2. 초기 계획에서 확인된 전체 배포 표면

### 외부 플랫폼

1. X
2. Threads
3. LinkedIn
4. Reddit
5. Show HN
6. GeekNews
7. Disquiet
8. DEV Community
9. YouTube Shorts
10. TikTok
11. Discord
12. Bluesky
13. Mastodon

### GitHub 내부 배포 표면

14. README 출시 섹션
15. GitHub Release Notes

초기 계획의 `memory_node_graph` 권장 채널은 X, Threads, Show HN, GeekNews, Reddit, LinkedIn, DEV.to, YouTube Shorts의 8개다. Disquiet은 §10의 공통 채널 생성 목록에, Bluesky와 Mastodon은 §21의 선택 채널에 들어 있다. TikTok과 Discord는 `mini-web-game` 권장 채널이다.

## 3. 현재 구현 대조표

| 채널 | 초기 계획 산출물 | 현재 상태 | 판정 |
|---|---|---|---|
| X | 단일 게시물 3안 + 스레드 1안 | 단일 게시물 1안, 280 가중자 UI | `부분 구현` |
| Threads | 연속 게시 1안 | 없음 | `누락` |
| LinkedIn | 게시물 1안 | 없음 | `누락` |
| Reddit | 서브레딧별 제목·본문 | 없음 | `누락` |
| Show HN | 제목·본문 | 후순위 안내만 있음 | `의도적 보류` |
| GeekNews | 소개문 + 수동 게시 준비 | 생성 초안, 검토된 최종본, 체크리스트 | `조건부 완료` |
| Disquiet | 메이커 로그 | 없음. 계획 형식도 현재 서비스와 불일치 | `누락·계획 갱신 필요` |
| DEV | 기술 글 | 섹션 구조와 보강 체크만 있음 | `부분 구현` |
| YouTube Shorts | 짧은 영상 | 실제 대표 이미지 1장만 있음 | `누락` |
| TikTok | 게임·제품 짧은 영상 | 없음 | `대상 저장소별 후순위` |
| Discord | 관련 커뮤니티 소개 | 없음 | `대상 저장소별 후순위` |
| Bluesky | 선택 게시물 | 없음 | `선택 채널` |
| Mastodon | 선택 게시물 | 없음 | `선택 채널` |
| GitHub README 출시 섹션 | README 문안 | 없음 | `누락` |
| GitHub Release Notes | 릴리스 문안 | 없음 | `누락` |

현재 외부 플랫폼 구현 수:

- 완료: GeekNews `1개` — 단, 계정과 최종 말투 확인 필요
- 부분 구현: X, DEV `2개`
- 누락 또는 보류: 나머지 `10개`

## 4. 플랫폼별 현재 규칙과 현실적인 MVP 모드

### 4.1 X

공식 기준:

- 일반 게시물은 280 가중 문자다.
- CJK와 emoji는 대부분 2, URL은 23으로 계산한다.
- 공식 문서는 정확한 처리를 위해 `twitter-text` 사용을 권장한다.

현재 구현:

- 실제 `memory_node_graph` 원고는 `110 / 280`으로 안전하다.
- 다만 자체 계산기는 복합 emoji·ZWJ 같은 전체 `twitter-text` 호환성을 보장하지 않는다.
- 초기 계획의 단일 게시물 3안과 스레드 1안 중 단일 게시물 1안만 있다.

판정: `부분 구현`. 실제 현재 원고는 게시 가능하지만 범용 검증기와 초기 산출물 계약은 미완성이다.

공식 문서: https://docs.x.com/fundamentals/counting-characters

### 4.2 Threads

공식 API는 텍스트·이미지·영상·캐러셀 게시를 지원하며 OAuth와 Meta 앱 구성이 필요하다. 이미지와 영상 URL을 API로 게시하려면 공개 접근 가능한 URL이 필요하다.

현실적인 MVP:

- API 연동 없이 Build in Public 형식의 연속 원고 생성
- 대표 이미지와 함께 수동 복사·게시
- X 원고를 그대로 재사용하지 않고 제작 문제, 과정, 결과, 피드백 순서로 작성

판정: `필수 누락`. 초기 `memory_node_graph` 핵심 채널이므로 수동 원고 탭은 복구해야 한다.

공식 자료: https://www.postman.com/meta/threads/overview

### 4.3 LinkedIn

LinkedIn Posts API는 텍스트·이미지·영상·문서 등 유기적 게시물을 지원하지만, 사용자·조직 권한과 버전 헤더가 필요하다.

현실적인 MVP:

- API 연동 없이 문제 → 만든 이유 → 기술적 해결 → 대상 사용자 → 데모 순서의 수동 원고
- 직업적·협업 맥락을 중심으로 작성

판정: `누락`. 바이럴 핵심 1차 채널보다는 GeekNews·Threads·X 이후가 현실적이다.

공식 문서: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api

### 4.4 Reddit

Reddit은 플랫폼 공통 규칙 외에 각 서브레딧 규칙을 별도로 적용한다. Data API는 스팸·인센티브 사용을 금지하며, 상업적 이용 등은 별도 계약이 필요할 수 있다.

현실적인 MVP:

- 자동 게시 금지
- 대상 서브레딧을 먼저 선택
- 해당 서브레딧의 자기홍보·계정 이력·제목·플레어 규칙을 사람이 확인
- 개발자 본인 공개, 문제·구현·한계 중심의 제목과 본문 생성
- 동일 본문을 여러 서브레딧에 반복하지 않음

판정: `필수 원고 누락`. 다만 계정·서브레딧 자격 확인 전에는 게시 준비 완료로 처리할 수 없다.

공식 문서:

- https://redditinc.com/policies/data-api-terms
- https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam

### 4.5 Show HN

Show HN은 직접 만든 비사소한 프로젝트를 다른 사람이 바로 실행하거나 체험할 수 있어야 한다. 가입 장벽을 낮추고, 랜딩 페이지·펀드레이저만 제출하면 안 되며, 업보트나 댓글을 요청해서도 안 된다.

현실적인 MVP:

- 자동 생성·자동 제출하지 않음
- 앞선 채널 피드백으로 README와 데모를 고친 뒤 영어 제목과 제작 배경을 사람이 작성
- 작성자가 게시 후 질의에 대응 가능한 시간에 제출

판정: `보류가 맞음`. 그러나 출시팩 안에는 보류 이유와 사람 작성용 체크리스트가 있어야 한다.

공식 문서: https://news.ycombinator.com/showhn.html

### 4.6 GeekNews Show

공식 이용법상 게시 등록은 가입 후 일주일이 지나야 가능하다. 본인 프로젝트는 Show로 등록해야 하며, 특정 서비스의 반복 홍보, 대량 생성 요약, 단축 URL 우회, 업보트 요청은 제한될 수 있다.

현재 구현:

- 자동 생성 초안 있음
- 검토된 `final/geeknews-show.md` 있음
- 대표 이미지, 공개 기준점, 중복 검색, 체크리스트 있음
- 계정 로그인·가입 기간·최종 말투 확인이 남음

판정: `첫 게시 조건부 완료`.

공식 문서:

- https://news.hada.io/guidelines
- https://news.hada.io/terms

### 4.7 Disquiet

초기 계획의 `메이커 로그` 방식은 현재 서비스 구조와 맞지 않는다. 현재 Disquiet 안내는 본인이 만든 제품을 먼저 등록하고 검토받은 뒤, 제품에 연결된 포스트를 작성해야 메인 피드에 노출된다고 설명한다. 기존 아티클·메이커로그 신규 작성은 일반적으로 중단된 상태다.

현실적인 MVP:

- `메이커 로그`가 아니라 `제품 등록 정보 + 제품 연결 포스트` 생성
- 제품명, 한 줄 소개, 대표 이미지, 데모, 만든 이유, 현재 단계, 피드백 요청 구성
- 수동 등록·검토 유지

판정: `누락 + 초기 계획 갱신 필수`.

현재 서비스 안내: https://disquiet.io/announcement

### 4.8 DEV Community

DEV 정책은 개발 주제의 고품질 콘텐츠여야 하고, 홍보나 백링크가 주목적이면 안 되며, 외부 링크만 두는 대신 본문 자체에 실질적인 내용을 포함해야 한다.

현재 구현:

- 문제·접근·구현·실행·한계 섹션 골격 있음
- 실제 제작 계기, 코드·명령 예제, 대안과 트레이드오프, 실패 사례 없음

판정: `구조만 부분 구현`. 현재 초안을 그대로 게시하면 안 된다.

공식 문서: https://dev.to/terms#11-content-policy

### 4.9 YouTube Shorts

현재 공식 도움말 기준 정사각형 또는 세로형, 최대 3분 영상이 Shorts로 분류될 수 있다. 1분을 넘는 Short에 활성 Content ID 클레임이 있으면 전 세계 차단될 수 있으므로 음악 권리 확인이 필요하다.

현실적인 MVP:

- `memory_node_graph` 실제 화면 기반 15~30초 세로 데모
- 첫 2초 문제 훅 → 문서 선택 → 그래프 전환 → 근거 탐색 → 데모·GitHub CTA
- 자막, 무음 시청, 저작권 안전 음원 또는 무음

판정: `누락`. 현재 대표 이미지 1장은 영상 산출물을 대체하지 못한다.

공식 문서: https://support.google.com/youtube/answer/15424877

### 4.10 TikTok

TikTok은 본인 제품·브랜드를 홍보하는 게시물에도 콘텐츠 공개 설정을 사용하도록 안내한다. 대량 상업 콘텐츠 배포, 가짜 참여, 계정 자동 운영은 금지된다. 공식 Content Posting API는 등록 앱과 권한 구성이 필요하다.

현실적인 MVP:

- `mini-web-game` 우선 채널
- `memory_node_graph`에는 Shorts와 같은 세로 데모를 재편집하되 TikTok 게시 시 자체 제품 홍보 표시 확인
- 자동 게시는 후순위

판정: `memory_node_graph 필수 아님`, `mini-web-game 캠페인에서는 필수 후보`.

공식 문서:

- https://support.tiktok.com/en/business-and-creator/creator-and-business-accounts/promoting-a-brand-product-or-service
- https://developers.tiktok.com/doc/content-posting-api-get-started/

### 4.11 Discord

Discord는 원치 않는 대량 메시지와 자동화된 사용자 계정 행동을 금지한다. 각 서버의 자체 홍보 규칙도 별도로 확인해야 한다.

현실적인 MVP:

- 관련 서버의 홍보 허용 채널과 관리자 규칙을 먼저 확인
- 동일 메시지 대량 전송이나 DM 홍보 금지
- 요청받았거나 허용된 채널에만 짧은 소개와 데모 게시

판정: `범용 생성 탭보다 캠페인별 수동 체크리스트가 적합`.

공식 문서: https://discord.com/guidelines

### 4.12 Bluesky

Bluesky compose intent는 300 Unicode grapheme cluster 제한을 안내하며, 사용자가 최종 확인해야 게시된다. 반복 스팸과 인위적 참여 조작은 금지된다.

현실적인 MVP:

- 300 grapheme 이하 원고
- compose intent로 작성 화면만 열기
- X 원고와 같은 사실을 쓰되 Bluesky 제한으로 별도 검증

판정: `선택 채널`. 구현 비용은 낮지만 첫 캠페인 필수는 아니다.

공식 문서:

- https://docs.bsky.app/docs/advanced-guides/intent-links
- https://bsky.social/about/support/community-guidelines

### 4.13 Mastodon

Mastodon 기본 글자 제한은 500자이고 URL은 기본 23자로 계산하지만, 실제 제한은 인스턴스 설정으로 확인해야 한다. 공개 범위와 서버별 규칙도 다를 수 있다.

현실적인 MVP:

- 대상 인스턴스 URL과 제한을 먼저 확인
- 공개 범위·해시태그·대체 텍스트 안내
- 자동 게시보다 복사 또는 서버 작성 화면 안내

판정: `선택 채널`. 인스턴스가 정해지기 전에는 완성 원고 판정 불가다.

공식 문서: https://docs.joinmastodon.org/user/posting/

## 5. 프로젝트별 실제 채널 구분

모든 채널을 모든 저장소에 동시에 적용하면 안 된다. 생성은 가능해도 게시 순서는 분리해야 한다.

### `memory_node_graph`

| 우선순위 | 채널 | 이유 |
|---|---|---|
| 1차 | GeekNews Show | 한국어 개발자·오픈소스·직접 체험과 잘 맞음 |
| 1차 대안 | Threads 또는 X | 시각적 결과와 Build in Public 문맥이 강함 |
| 2차 | Disquiet | 본인 제품 등록과 제작 과정 공유에 적합 |
| 2차 | LinkedIn | 개발 과정·협업·전문성 서사에 적합 |
| 2차 조건부 | Reddit | 적합 서브레딧과 계정 참여 이력이 있을 때만 |
| 2차 | YouTube Shorts | 그래프 전환을 짧은 영상으로 설명하기 좋음 |
| 3차 | DEV | 실제 구현 글을 충분히 쓴 뒤 |
| 마지막 게이트 | Show HN | 앞선 피드백으로 데모·설명을 다듬은 뒤 |
| 선택 | Bluesky·Mastodon | 실제 운영 계정과 독자가 있을 때 |

### `dev-plan-skill`

- Show HN, X, Threads, Reddit, GeekNews, DEV, LinkedIn 후보
- 시각 영상보다 구체적인 문제·실행 예제·전후 비교가 중요

### `mini-web-game`

- Threads, X, YouTube Shorts, TikTok, Reddit 게임 커뮤니티, Discord 후보
- 오픈소스 소개와 게임 플레이 확산을 분리해야 함

## 6. 전체 게시 전 완료 기준

초기 계획의 전체 바이럴 출시팩을 완료했다고 말하려면 최소한 다음 산출물이 필요하다.

- [ ] X 단일 게시물 3안
- [ ] X 스레드 1안
- [ ] Threads 연속 게시 1안
- [ ] LinkedIn 게시물 1안
- [ ] Reddit 대상 서브레딧·규칙·제목·본문
- [ ] Show HN 사람 작성용 영어 제목·본문·게이트
- [x] GeekNews Show 초안·최종본·체크리스트
- [ ] Disquiet 제품 등록 정보·연결 포스트
- [ ] DEV 실질 기술 글
- [ ] YouTube Shorts 세로 영상·제목·설명
- [ ] README 출시 섹션
- [ ] GitHub Release Notes
- [ ] 각 채널 최종 URL·대표 에셋·게시 순서 기록

Bluesky·Mastodon은 선택 항목이다. TikTok·Discord는 대상 저장소가 `mini-web-game`일 때 추가한다.

## 7. 권장 개발 순서

초기 계획을 한 번에 전부 구현하지 않고, 수동 게시용 원고 생성부터 복구한다.

| 순서 | 작업 | 범위 |
|---:|---|---|
| 1 | 채널 인벤토리 복구 | GUI와 API에서 전체 채널 상태를 `완료·초안·보류·미지원`으로 표시 |
| 2 | Threads 원고 | Build in Public 연속 게시, 복사·다운로드 |
| 3 | Reddit 원고 | 서브레딧 입력, 규칙 확인, 제목·본문, 자동 게시 없음 |
| 4 | X 계약 완성 | 단일 3안, 스레드 1안, 공식 계산 호환성 보강 |
| 5 | LinkedIn·Disquiet | 전문 서사와 현재 Disquiet 제품 등록 형식 적용 |
| 6 | DEV 실질화 | 실제 코드·명령·트레이드오프를 저장소 근거로 보강 |
| 7 | Shorts | 실제 제품 화면 15~30초 세로 영상 |
| 8 | Show HN 게이트 | 앞선 게시 반응과 제품 개선 후 사람 작성 |
| 9 | 선택 채널 | Bluesky·Mastodon, 저장소별 TikTok·Discord |

중요한 운영 원칙:

- 모든 원고를 생성할 수 있어도 같은 날 모든 채널에 게시하지 않는다.
- 첫 채널 게시 후 최소 72시간, 권장 7일 동안 반응과 피드백을 확인한다.
- 삭제·플래그·스팸 지적이 있으면 다음 채널 게시를 중단한다.
- Reddit, Discord, Show HN은 자동 게시하지 않는다.

## 8. 최종 판정

현재 구현은 초기 계획의 전체 바이럴 시스템이 아니라 `X·GeekNews·DEV 3종 생성 MVP`다. Threads와 Reddit만 빠진 것이 아니라 LinkedIn, Disquiet, YouTube Shorts, X 스레드와 다중 문안, GitHub 내부 출시 문안도 빠져 있다.

다음 개발은 자동 게시나 계정 연동이 아니라 `Threads → Reddit → X 계약 완성` 순서로 수동 원고 생성 범위를 복구하는 것이 가장 작고 현실적이다.

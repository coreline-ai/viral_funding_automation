# Viral Funding Automation MVP

공개 GitHub 저장소 URL 하나를 읽어 프로젝트 사실을 요약하고, 채널별 **수동 게시용 원고**를 만드는 로컬 웹앱입니다.

```text
공개 GitHub URL 입력
→ README·라이선스·저장소 metadata 확인
→ 전체 채널 상태 표시
→ 18개 채널 원고 편집·복사·다운로드
```

## 현재 구현

- 공개 저장소만 지원하며 원본 저장소는 수정하지 않음
- README, license, 저장소 metadata, 선택적 `package.json`만 읽음
- 외부 플랫폼 19개의 `초안·운영 게이트·보류·후순위` 상태 표시
- 채널 원고 18종 생성
  - X 단일 게시물 3안 + 3개 구간 스레드
  - Threads 대화형 연속 게시 3개
  - Reddit 수동 게시 작업본
  - LinkedIn 게시물
  - Disquiet 제품 등록 정보 + 제품 연결 포스트
  - Facebook Reels 캡션 + 그룹 규칙 확인형 본문
  - Instagram Reels 표지·캡션·프로필 링크 체크
  - Product Hunt 제품 정보·Gallery·Maker 첫 댓글
  - Peerlist Launchpad 제품 정보·Maker 댓글·자격 체크
  - Indie Hackers 작성자 보강 자료
  - OKKY 프로젝트 소개·피드백 작업본
  - GeekNews Show
  - DEV 사람 작성용 검증 자료(AI 보조 공개 게이트)
  - YouTube Shorts 스크립트·샷리스트
  - Show HN 작성자 전용 사실 체크리스트(생성 제목·본문 없음)
- 원고별 편집·작업본 복사·Markdown 저장, 18종 일괄 다운로드
- `HOLD` 상태인 Reddit·Product Hunt 자동본·Peerlist·Indie Hackers·DEV·Show HN은 사람 보강 전 복사 차단
- 실제 package dependencies와 GitHub Topics, 실행 요구사항과 현재 한계, 읽기 전용 공개 데모 경계를 분리
- 마지막 작업을 브라우저 `localStorage`에 저장하고 이전 3종·12종 데이터를 v3 형식으로 마이그레이션
- 자동 게시, 예약 게시, OAuth, SNS API 쓰기 연동 없음
- 외부 패키지, LLM API, GitHub token의 브라우저 저장 없음

TikTok은 Shorts의 세로 영상을 재사용하는 후보로 상태를 표시합니다. Discord·Bluesky·Mastodon은 상태만 표시하는 후순위 또는 선택 채널입니다. 모든 원고가 생성되어도 동시에 게시하지 않고, 운영 게이트를 확인한 채널부터 한 번에 하나씩 게시합니다.

## 프로젝트 1차 종료 상태

계정 확보 전 단계의 1차 개발은 완료했습니다.

- 서비스 19종의 수동 게시 방법·공식 자동화 가능 범위·계정 정보를 조사했습니다.
- 18개 생성 원고를 공개 저장소 사실과 서비스 정책에 맞춰 교정했습니다.
- `memory_node_graph` 전용 채널별 최종 교정 원고와 HOLD 기준을 작성했습니다.
- 자동 게시·OAuth·예약은 계정과 Developer App 확보 후 2차 개발에서 채널 하나씩 진행합니다.

핵심 문서:

- [서비스별 게시·자동화 개발 사전조사](reviews/automation/PUBLISHING_AUTOMATION_PREFLIGHT_20260817.md)
- [바이럴 원고 최종 채널 적합성 검토](reviews/final_channel_copy_validation_20260817.md)
- [AI Systems Atlas 채널별 최종 교정 원고팩](campaigns/memory_node_graph/2026-08-first-launch/final/verified-channel-copy-pack.md)
- [프로젝트 1차 종료 보고서](PROJECT_PHASE1_CLOSURE_20260817.md)
- [영문 재구성 수직 MVP 개발 계획](dev-plan/implement_20260817_182435.md)

## 요구사항

- Node.js 22 이상
- 공개 GitHub API 접근
- 선택: `GITHUB_TOKEN` 또는 `GH_TOKEN` 환경변수

## 웹 GUI 실행

```bash
npm run web
```

브라우저에서 [http://127.0.0.1:4310](http://127.0.0.1:4310)을 엽니다.

사용 순서:

1. 공개 GitHub URL을 입력하고 `콘텐츠 생성`을 누릅니다.
2. 빠른 확인은 `memory_node_graph 예제로 1턴 실행`을 누릅니다.
3. 전체 채널 상태에서 초안과 운영 게이트를 구분합니다.
4. 18개 탭의 게시 필드를 검토·수정한 뒤 복사하거나 Markdown으로 저장합니다.
5. 영어가 필요하면 `현재 원고 번역`을 누릅니다. 이 머신에서 이미 `grok login`된 세션을 사용하며 API Key를 넣지 않습니다.
6. HOLD 채널은 `작성자 보강 완료` 전에는 복사되지 않습니다. Show HN은 번역하지 않습니다.
7. GeekNews 첫 게시를 진행할 때만 `직접 게시 전 준비`의 기준점과 5개 체크 항목을 완료합니다.
8. 첫 게시 후 최소 72시간, 권장 7일 동안 반응을 확인한 뒤 다음 채널을 결정합니다.

### 채널별 주의사항

| 채널 | 웹앱 산출물 | 실제 게시 전 남은 일 |
|---|---|---|
| X | 단일 3안, 스레드 1안 | 최종 문구·대표 이미지 확인 |
| Threads | 3개 대화형 연속 게시 | 대표 이미지와 본인 말투 확인 |
| Reddit | 작성자 재작성용 검증 사실·규칙 체크 | 서브레딧·계정·Flair·언어 확정 후 처음부터 작성 |
| LinkedIn | 전문적 제작 서사 | 협업 맥락과 본인 말투 확인 |
| Disquiet | 제품 등록 + 연결 포스트 | 제품 등록·검토 후 연결 게시 |
| Facebook | Reels 캡션 + 그룹 본문 | 원본 세로 영상·그룹별 규칙·반복 게시 여부 확인 |
| Instagram | Reels 표지·캡션 | 세로 영상 안전 영역·표지·프로필 링크 확인 |
| Product Hunt | 자동 분석 입력 자료(HOLD) | 첫 출시팩의 영문 정본·Gallery·Maker 계정·Create Draft 확인 |
| Peerlist | Launchpad 입력 자료(HOLD) | 프로필 인증·프로젝트 100%·론칭 일정·작성자 영어 확인 |
| Indie Hackers | 작성자 보강 자료(HOLD) | 실제 제작 계기·어려웠던 결정·본인 영어 보강 |
| OKKY | 국내 개발자용 프로젝트 소개 | 게시판 규칙·개발 경험·본인 말투 확인 |
| GeekNews | Show 원고 + preflight | 로그인·가입 기간·중복·최종 원고 확인 |
| DEV | 사람 작성용 검증 자료(HOLD) | 실제 기술 사례·코드·실패·AI 보조 공개 후 별도 작성 |
| Shorts | 제목·설명·20초 샷리스트 | 실제 세로 영상과 권리·안전 영역 검수 |
| Show HN | 작성자용 사실 체크리스트(HOLD) | 생성·윤문 원고를 쓰지 않고 작성자가 처음부터 직접 작성 |

X는 CJK·emoji·URL 가중치를 반영하며 단일 원고와 스레드 각 구간이 280 가중자를 넘으면 복사를 막습니다. Reddit·Product Hunt 자동본·Peerlist·Indie Hackers·DEV·Show HN은 `HOLD`가 남아 있으면 작업본 복사를 차단합니다. Show HN에는 생성 제목·본문을 제공하지 않습니다.

GeekNews preflight는 [공식 이용법](https://news.hada.io/guidelines)과 [Show 목록](https://news.hada.io/show)만 연결합니다. 로그인, 가입 기간 판정, 실제 글 등록, 관리자 전용 GitHub Traffic 수집은 자동화하지 않습니다.

## CLI 실행

```bash
npm run generate -- \
  --repo https://github.com/coreline-ai/memory_node_graph \
  --out output
```

생성 파일:

```text
output/memory_node_graph/
├─ project-summary.json
├─ project-summary.md
├─ viral-hooks.md
├─ x-single-1.md
├─ x-single-2.md
├─ x-single-3.md
├─ x-thread.md
├─ threads-series.md
├─ reddit-post.md
├─ linkedin-post.md
├─ disquiet-product.md
├─ facebook-post.md
├─ instagram-reels.md
├─ product-hunt-launch.md
├─ peerlist-launchpad.md
├─ indie-hackers-post.md
├─ okky-post.md
├─ geeknews-show.md
├─ dev-article.md
├─ youtube-shorts.md
├─ show-hn.md
├─ short-post.md       # x-single-1 호환 별칭
├─ community-post.md   # geeknews-show 호환 별칭
└─ long-post.md        # dev-article 호환 별칭
```

모든 결과는 사실 기반 작업본입니다. 링크·규칙·본인 경험을 사람이 확인한 뒤 직접 게시해야 합니다.

## `memory_node_graph` 실제 출시팩

검증된 예제 결과는 [`campaigns/memory_node_graph/2026-08-first-launch`](campaigns/memory_node_graph/2026-08-first-launch)에 있습니다.

- 실제 API 응답과 18개 채널 원고, 호환 파일을 포함한 생성 파일 24개
- 공개 데모 캡처 이미지
- 실제 제품 화면 기반 20초, 1080×1920, H.264 Shorts MVP
- GeekNews 첫 게시 최종 초안과 체크리스트
- Product Hunt 영문 제출 원고·Gallery/Thumbnail 원본·게시 직전 체크리스트
- 전문가·공식 자료 검토를 반영한 채널별 최종 교정 원고팩

## GUI 테마

GUI는 `memory_node_graph`의 어두운 색상, 반투명 표면, 얇은 경계선, UI·monospace 조합만 참고합니다. 해당 프로젝트의 그래프·로고·Three.js 코드는 웹앱 GUI에 재사용하지 않습니다.

## 테스트

```bash
npm test
```

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
- 외부 플랫폼 19개의 상태를 [`src/platform-registry.mjs`](src/platform-registry.mjs) 단일 registry에서 표시
  - Threads는 첫 text dry-run pilot, X·LinkedIn은 후속 검증군으로만 표시
  - manual-only 채널은 connector·publish intent 선택 대상이 아니며, Threads·X·LinkedIn만 **local dry-run** payload planner를 제공
  - local dry-run은 승인 snapshot·readiness를 대조해 payload 계획과 simulated receipt만 만들며 외부 플랫폼 HTTP write는 항상 `0회`
  - local dry-run 실행에는 session-only opaque credential reference와 `live_write_locked` user kill switch가 모두 필요함. reference와 잠금 상태는 `localStorage`에 저장하지 않음
  - safe evidence JSON은 ID·hash·마스킹 계정·endpoint class·`networkWriteCount: 0`만 내보내고 원고 전문·credential reference·token은 제외
  - 자동 게시 Go/No-Go는 `NO_GO_PENDING_EXTERNAL_INPUTS`로 고정. 내부 준비는 완료했지만 외부 계정·App·vault 선택은 후순위이며 실제 게시·업로드·예약 capability는 모두 `false`
  - 다음 별도 개발의 최대 범위는 Threads의 승인된 단일 텍스트 1건이며 자동 재시도·예약·미디어·교차 게시를 제외
  - 정책 확인일이 30일을 넘기면 `needs_reverify`로 낮춤
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
- 콘텐츠 유효성, 실제 게시 운영 조건, 사람 승인을 분리해 세 조건을 모두 통과한 결과만 복사 허용
- 승인자는 현재 게시 필드·언어·원문·사실 지문·작성자/운영 입력·자산 hash·계정 target을 credential-free **approval snapshot**으로 동결
  - 수정하면 snapshot은 자동 무효화되고 재승인이 필요함
  - 로컬 `publish intent`는 중복키만 기록하는 process-local 계약이며, 유효한 readiness가 있을 때만 `ready_for_dry_run`이 됨
  - `POST /api/v1/dry-runs`는 loopback nonce 보호 아래 local receipt만 만들며 실제 플랫폼 connector·게시 요청을 만들지 않음
- 실제 package dependencies와 GitHub Topics, 실행 요구사항과 현재 한계, 읽기 전용 공개 데모 경계를 분리
- 마지막 작업을 브라우저 `localStorage`에 저장하고 이전 3종·12종 데이터를 구조화 문서로 마이그레이션
- Codex 원고 생성은 이미 로그인된 loopback `proxy-codex`를 우선 사용. 이 앱은 OAuth token·CLI home·직접 `login`을 소유하지 않으며, 전용 `viral` caller credential으로만 Proxy에 요청함
- 자동 게시, 예약 게시, SNS API 쓰기 연동 없음
- 외부 패키지, LLM API Key, GitHub token의 브라우저 저장 없음

TikTok은 Shorts의 세로 영상을 재사용하는 후보로 상태를 표시합니다. Discord·Bluesky·Mastodon은 상태만 표시하는 후순위 또는 선택 채널입니다. 모든 원고가 생성되어도 동시에 게시하지 않고, 운영 게이트를 확인한 채널부터 한 번에 하나씩 게시합니다.

## 프로젝트 1차 종료 상태

계정 확보 전 단계의 1차 개발은 완료했습니다.

- 서비스 19종의 수동 게시 방법·공식 자동화 가능 범위·계정 정보를 조사했습니다.
- 18개 채널의 게시 준비 자료를 공개 저장소 사실과 서비스 정책에 맞춰 교정했습니다.
- `memory_node_graph` 전용 채널별 최종 교정 원고와 HOLD 기준을 작성했습니다.
- 자동 게시·OAuth·예약은 계정과 Developer App 확보 후 2차 개발에서 채널 하나씩 진행합니다.

핵심 문서:

- [서비스별 게시·자동화 개발 사전조사](reviews/automation/PUBLISHING_AUTOMATION_PREFLIGHT_20260817.md)
- [바이럴 원고 최종 채널 적합성 검토](reviews/final_channel_copy_validation_20260817.md)
- [AI Systems Atlas 채널별 최종 교정 원고팩](campaigns/memory_node_graph/2026-08-first-launch/final/verified-channel-copy-pack.md)
- [프로젝트 1차 종료 보고서](PROJECT_PHASE1_CLOSURE_20260817.md)
- [영문 재구성 수직 MVP 개발 계획](dev-plan/implement_20260817_182435.md)
- [Grok/Codex OAuth 완성 원고 계획](dev-plan/implement_20260818_210532.md)
- [소셜 자동 게시 이전 준비 계획](dev-plan/implement_20260821_201014.md)
- [소셜 자동 게시 Go/No-Go 체크리스트](reviews/automation/AUTOMATION_GO_LIVE_CHECKLIST.md)
- [로그인된 Codex OAuth Proxy 연동 계획](dev-plan/codex_oauth_proxy_integration_20260821.md)
- [R1 OAuth 격리·DLP 위협 모델](reviews/security/R1_OAUTH_ISOLATION_THREAT_MODEL_20260820.md)
- [R4 OAuth 공격 smoke 실행 가이드](reviews/security/R4_OAUTH_ADVERSARIAL_SMOKE_RUNBOOK_20260821.md)
- [R5 Codex OAuth Proxy 실제 1턴 결과](reviews/security/R5_CODEX_PROXY_LIVE_ONE_TURN_20260821.md)
- [로컬 API OpenAPI 3.1](openapi/viral-api.v1.yaml)
- [registry-generated 채널 field contract](openapi/generated/channel-publish-fields.v1.json)

## 요구사항

- Node.js 22 이상
- 공개 GitHub API 접근
- 영어 완성 원고: 로그인된 loopback `proxy-codex`, 이 프로젝트 전용 `viral` caller credential, Proxy가 허용한 `conversation.respond.v1` capability
- 선택: 서버 환경의 `GITHUB_TOKEN` 또는 `GH_TOKEN` (브라우저에 넣지 않음)

### 개발 검증 도구

- `npm test`의 OpenAPI parser/schema 검증: Python 3, `PyYAML`, `jsonschema`
- generated TypeScript consumer smoke: `tsc`가 있으면 실행하며, 없는 Node-only 환경에서는 해당 smoke만 skip

## 웹 GUI 실행

```bash
npm run web:proxy
```

이미 로그인된 Codex Proxy를 사용할 때는 `npm run web:proxy`를 실행합니다. Proxy 없이 원고 편집·검증 UI만 열려면 `npm run web`을 사용합니다. 브라우저에서 [http://127.0.0.1:4310](http://127.0.0.1:4310)을 엽니다. 기본 bind는 loopback만 열고 CORS는 없습니다.

로컬 `/api/v1` 계약은 [openapi/viral-api.v1.yaml](openapi/viral-api.v1.yaml)이 정본인 **loopback contract beta**입니다. 웹 GUI가 같은 compose/review/validate/readiness 경로를 씁니다. 상태 변경 POST는 같은 origin과 실행마다 새로 발급되는 `X-Viral-Nonce`가 필요하며, `GET /providers/readiness`는 절대 OAuth probe를 실행하지 않습니다. `/api/generate`와 `/api/translate`는 호환 유지합니다. 외부 기기·LAN 공개와 mobile codegen은 TLS·pairing·device auth가 있는 후속 계획에서만 다룹니다.

사용 순서:

1. 공개 GitHub URL을 입력하고 `콘텐츠 생성`을 누릅니다.
2. 빠른 확인은 `memory_node_graph 예제로 1턴 실행`을 누릅니다.
3. 전체 채널 상태에서 초안과 운영 게이트를 구분합니다.
4. 게시자 역할·계정 성격·목표·대상 독자를 입력합니다. 역할 근거가 없으면 `I/we built` 같은 표현은 허용되지 않습니다.
5. 게시 언어를 선택합니다. 한국어 원문에서 영어·일본어·중국어(간체)·스페인어 후보를 한 채널씩 구성할 수 있습니다. GeekNews·OKKY·Disquiet은 한국어·영어만 지원합니다.
6. compose 채널은 Codex Proxy 상태가 `준비됨`일 때만 `Codex`를 고르고 `생성`을 누릅니다. 생성한 언어별 후보는 원문 변경 시 모두 오래됨 처리되며, Proxy caller credential 또는 권한이 없으면 원고 편집·검증만 허용합니다.
7. Reddit·DEV는 참고 자료만 제공하며 최종 제목·본문은 작성자가 직접 작성합니다. Show HN은 생성·검토·번역 버튼을 숨깁니다.
8. 콘텐츠 후보라도 계정·미디어·그룹 규칙 등 운영 조건을 확인하고, 승인자 이름/역할을 입력한 뒤 현재 결과를 immutable snapshot으로 승인해야 복사할 수 있습니다. 원고·언어·사실·입력·자산·계정 변경은 재승인이 필요합니다.
9. Threads·X·LinkedIn은 실제 token이 아닌 외부 vault reference를 입력하고 `실제 게시 잠금`을 켠 경우에만 local dry-run을 실행할 수 있습니다. 결과의 safe evidence JSON으로 `외부 write 0회`를 확인합니다.
10. GeekNews 첫 게시를 진행할 때만 `직접 게시 전 준비`의 기준점과 5개 체크 항목을 완료합니다.
11. 첫 게시 후 최소 72시간, 권장 7일 동안 반응을 확인한 뒤 다음 채널을 결정합니다. 앱은 게시하지 않습니다.

Phase 4는 코드·합성 계정 E2E까지 구현됐습니다. 실제 Threads 계정/App Dashboard의 ID, redirect URI, 승인 scope, 정책 확인과 외부 credential vault는 계정 책임자가 입력해야 하므로 실제 계정 운영 리허설은 아직 완료로 표시하지 않습니다.

Phase 5 내부 준비 패키지는 외부 입력을 후순위로 분리합니다. GUI와 `/api/v1/capabilities`는 `NO_GO_PENDING_EXTERNAL_INPUTS`, `actualPublishCapability: false`를 표시하며 후순위 운영 게이트와 별도 보안 검토 전에는 실제 자동 게시 개발을 시작하지 않습니다.

### 게시 준비 상태

단일 `ready` 상태를 쓰지 않습니다. 복사 가능한 실제 게시 준비 상태는 아래 세 축을 모두 통과한 경우입니다.

| 축 | 값 | 의미 |
|---|---|---|
| 콘텐츠 | `candidate` | 게시 필드·사실·길이 검증을 통과한 후보 |
| 콘텐츠 | `needs_input` / `invalid` | 작성자 정보 또는 게시 필드 보완 필요 |
| 콘텐츠 | `reference_ready` | Reddit·DEV 참고 자료 준비 완료. 최종 글은 직접 작성 |
| 콘텐츠 | `manual_only` | Show HN처럼 AI 생성·윤문 금지 |
| 운영 | `ready` / `blocked` | 계정·미디어·카테고리·커뮤니티 규칙 확인 여부 |
| 승인 | `approved` / `unreviewed` | 현재 결과를 사람이 승인했는지 여부 |

`publishReady`는 `candidate + operations ready + approved`일 때만 true입니다. 원문 변경으로 결과가 `stale`이면 다시 생성·승인하기 전 복사할 수 없습니다.

### 로그인된 Codex OAuth Proxy 연결

이 프로젝트에서 `codex login` 또는 `grok login`을 실행하지 않습니다. OAuth 로그인·CLI 실행·상위 queue는 이미 로그인된 `proxy-codex`가 소유합니다. 이 앱에는 OAuth token을 복사하지 않습니다.

```bash
VIRAL_CODEX_PROXY_BASE_URL=http://127.0.0.1:4348
VIRAL_CODEX_PROXY_CALLER_ID=viral
VIRAL_CODEX_PROXY_SECRET_FILE=/absolute/path/to/viral-codex-proxy.secret
```

- Proxy URL은 `127.0.0.1`·`localhost`·`::1` loopback HTTP만 허용합니다.
- credential 파일은 Git 제외 경로에 `0600` 권한으로 보관합니다. Proxy의 `viral` caller credential과만 일치해야 하며, 다른 서비스 credential을 재사용하지 않습니다.
- `GET /api/v1/providers/readiness`는 Proxy 연결 상태만 읽고 OAuth 요청을 만들지 않습니다. 실제 인증·생성 확인은 사용자가 `생성`을 누른 1턴 compose에서만 합니다.
- 생성이 길면 `중지`로 취소할 수 있습니다. 원문 한국어는 그대로 남습니다.
- 앱과 Proxy의 text 요청은 모두 queue 1로 순차 실행합니다.
- Grok은 텍스트용 로그인 Proxy contract가 준비될 때까지 생성 대상으로 연결하지 않습니다.

구체적인 Proxy 권한 설정과 1턴 smoke는 [로그인된 Codex OAuth Proxy 연동 계획](dev-plan/codex_oauth_proxy_integration_20260821.md)을 따릅니다.

### 로컬 API 예제

웹과 같은 계약입니다. 기본 서버는 `127.0.0.1`만 열고 CORS는 없습니다. `HOST=0.0.0.0` 같은 non-loopback bind는 시작 단계에서 거부됩니다.

```bash
curl -sS http://127.0.0.1:4310/api/v1/capabilities
curl -sS http://127.0.0.1:4310/api/v1/providers/readiness
```

compose/review/validate는 capabilities 응답의 `nonce`를 `X-Viral-Nonce` 헤더에 넣어 같은 loopback origin에서 호출합니다. 재시도는 동일 `idempotencyKey`와 SHA-256 `requestFingerprint`를 유지해야 하며, 같은 key에 다른 입력을 넣으면 `409 IDEMPOTENCY_CONFLICT`가 반환됩니다. 이 캐시는 프로세스 메모리에서 최대 64건·10분만 유지되고 서버 재시작 때 비워집니다.

채널별 `publishFields` 계약은 runtime registry에서 생성됩니다. 수정 후 아래 명령으로 생성물 일치 여부를 확인합니다.

```bash
npm run api:contract:check
```

`POST /api/v1/providers/probe`는 사용자 명시 상태 점검이며 60초 cooldown이 있습니다. Proxy OAuth session에 비용이 드는 숨은 요청을 만들지 않으며, 실제 생성 검증은 1턴 compose로만 합니다. compose/review/validate 본문 예는 [openapi/viral-api.v1.yaml](openapi/viral-api.v1.yaml)을 봅니다. 다른 기기에서 이 포트를 열려면 TLS·pairing·device auth가 있는 후속 계획이 필요합니다. 이 MVP는 LAN 공개를 하지 않습니다.

`POST /api/v1/approval-revisions`는 현재 원고를 immutable approval snapshot으로만 반환합니다. `POST /api/v1/publish-intents`는 그 snapshot의 `platform + account + target + content hash + asset hash` 중복키를 process-local 메모리에 기록할 뿐, 소셜 플랫폼에는 어떤 HTTP 요청도 만들지 않습니다. token·secret·password·개인 경로 패턴은 snapshot 전에 거부합니다.

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

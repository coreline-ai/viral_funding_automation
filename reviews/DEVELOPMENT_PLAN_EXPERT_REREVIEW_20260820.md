# 개발 계획 전문가 재검토 보고서

검토 일시: `2026-08-20 KST`
검토 대상: `dev-plan/implement_20260818_210532.md` 및 커밋 `1caf6d8` 기준 구현
검토 방식: 아키텍처·OAuth 보안, 채널·콘텐츠 제품성, 모바일 API·전달 가능성의 독립 전문가 3인 검토 + 주 에이전트 코드·테스트 재검증

## 1. 최종 판정

**조건부 승인 / 릴리스 판정 재개방**

- 방향: 승인
- 로컬 웹 기능 기반: 양호
- “18개 완성 원고 생성기” 표현: 부정확
- 실제 상태: **18개 채널 게시 준비 워크벤치 beta**
- Phase 2·3·5·6·7·8 완료 판정: 재검토 필요
- 모바일 호환 API 완료 판정: 보류
- 보완 전 `MVP 릴리스 가능`: 철회 권고

`npm test`는 로컬 네트워크 허용 환경에서 `93/93 통과`했다. 그러나 현재 테스트는 정상 경로와 fake provider 중심이며, 아래 동시성·격리·채널 언어·실행 가능한 OpenAPI 문제를 충분히 검증하지 않는다.

## 2. 잘된 부분

- API Key 없이 로그인된 Grok/Codex CLI 세션을 재사용하는 방향이 사용자 요구와 맞다.
- OAuth token 파일을 앱이 직접 읽거나 브라우저에 전달하지 않는다.
- Show HN 생성·번역·윤문을 차단한 정책은 최신 운영자 안내와 일치한다.
- 게시 필드와 내부 체크리스트를 분리하고 원문을 AI 결과로 덮어쓰지 않는 방향이 맞다.
- 자동 게시를 제외하고 사람 검토·복사 직전까지만 지원하는 범위가 현실적이다.
- X 280 가중자와 Product Hunt 주요 필드 검증 등 파일럿 채널 기반은 유효하다.
- `/api/v1`를 loopback 전용으로 시작하고 TLS·pairing을 후속으로 분리한 판단은 적절하다.

## 3. P0 — 릴리스 전 필수 수정

### P0-1. 채널별 기본 언어가 잘못됨

모든 `CHANNEL_PROFILES`가 `en-US`로 고정되어 있다. 이 때문에 GeekNews 실제 OAuth fixture도 영어로 생성된다. GeekNews·OKKY·Disquiet처럼 한국어 커뮤니티가 기본인 채널과 글로벌 영어 채널을 동일한 번역 대상으로 처리하면 실제 게시 적합성이 떨어진다.

수정 기준:

- profile에 `defaultLocale`과 `supportedLocales`를 분리한다.
- GeekNews·OKKY·Disquiet 기본값은 `ko-KR`로 둔다.
- X·LinkedIn·Product Hunt 등은 캠페인 target에 따라 `en-US`를 선택한다.
- source와 target이 같으면 “번역”이 아니라 선택적 채널 재구성으로 처리한다.
- 일괄 영어 생성에서 한국어 기본 채널을 자동 포함하지 않는다.

### P0-2. `ready`가 실제 게시 준비 상태를 과장함

현재 prepublish gate는 warning에 불과하다. 따라서 다음 조건을 확인하지 않아도 콘텐츠 validator만 통과하면 `ready`가 될 수 있다.

- GeekNews 가입 기간·Show 분류
- Disquiet 제품 등록 상태
- Facebook 원본 영상·그룹 규칙
- Instagram 원본 영상·프로필 링크·안전 영역
- Shorts 실제 세로 영상

수정 기준:

- 단일 상태를 다음 3축으로 나눈다.
  - `contentStatus`: `candidate | needs_input | invalid | reference_only | manual_only`
  - `operationsStatus`: `blocked | ready`
  - `approvalStatus`: `unreviewed | approved`
- 기존 `ready`는 `content_ready_candidate` 의미로 낮춘다.
- 실제 게시 준비 완료는 콘텐츠·운영·사람 승인 3축을 모두 통과했을 때만 표시한다.
- AI 생성 revision은 사람 승인 전 복사하지 않거나 첫 복사 시 명시 승인 절차를 거친다.

### P0-3. 작성자 귀속·입력 게이트가 부족함

임의의 공개 GitHub URL을 넣을 수 있지만 게시자가 owner인지 확인하지 않고 `I built...` 같은 1인칭 문장이 생성될 수 있다. 이는 프로젝트 기능 사실과 별개인 작성자 귀속 오류다.

수정 기준:

- 공통 campaign brief에 다음을 추가한다.
  - `publisherRole`: `owner | maintainer | contributor | curator`
  - `accountVoice`: `personal | organization`
  - `ownershipConfirmed`
  - `goal`, `audience`, `targetLocale`
- `I built`·`we built`는 role과 accountVoice 근거가 있을 때만 허용한다.
- 작성자 입력은 단순 non-empty가 아니라 타입·최소 길이·URL·확인 시각·자산 hash를 검증한다.
- Product Hunt Maker 계정·Topic·launch 상태, Facebook group/rule URL, Indie Hackers 실제 실패 경험을 보강한다.

### P0-4. Reddit·DEV 상태 모델이 모순됨

Reddit과 DEV는 완성 제목·본문이 아니라 사실 자료만 제공한다. 그런데 `translationPolicy: draftOnly`는 입력을 모두 채워도 항상 `needs_input`을 반환한다. provider를 호출한 뒤에도 `missingInputs: []`와 `status: needs_input`이 함께 나올 수 있다.

수정 기준:

- 채널 지원 모드를 `compose | reference_only | manual_only`로 분리한다.
- Reddit·DEV는 `reference_only`, Show HN은 `manual_only`로 둔다.
- `reference_ready`와 `human_draft_required` 의미를 UI에서 분명히 표시한다.
- Reddit·DEV·Show HN을 “완성 원고 수”에 포함하지 않는다.

### P0-5. 사실 검증이 허위 기능·정성 주장을 막지 못함

현재 claim 검사는 일부 숫자·`guaranteed`·`revolutionary`만 탐지한다. fake provider가 `Kubernetes 기반`, `millions of teams가 사용` 같은 근거 없는 문장을 반환해도 `ready`가 될 수 있음이 재현됐다.

수정 기준:

- 숫자, 사용자·성과, 기술, 기능, 고유명사, 비교 우위 claim을 canonical facts와 대조한다.
- 각 claim은 `evidenceId`와 source field를 가져야 한다.
- 근거가 없는 claim은 최소 `needs_review`로 내리고 복사를 차단한다.
- 실제 허위 Kubernetes/millions 재현을 회귀 테스트로 고정한다.

### P0-6. OAuth CLI 격리와 응답 비밀정보 차단이 충분히 증명되지 않음

- Codex `read-only`는 파일 쓰기는 막지만 호스트 파일 읽기 자체를 의미하지 않는다.
- Grok은 denylist 기반 도구 차단으로 신규 도구 이름에 fail-open 가능성이 있다.
- `childEnvironment()`는 OAuth 사용을 위해 HOME을 유지한다.
- runtime compose 응답에는 token·개인 경로·canary secret DLP가 없다.

수정 기준:

- OAuth를 읽을 수 있는 최소 전용 HOME 또는 외부 OS sandbox 가능성을 먼저 spike한다.
- Grok은 sandbox와 도구 0개 fail-closed 구성이 증명될 때만 production 상태로 둔다.
- 모든 provider 응답에 token·인증 경로·개인 경로·canary secret 차단을 적용한다.
- 외부 canary 파일 읽기, prompt injection, tool call 실제 CLI adversarial test를 추가한다.
- 격리 증명이 안 되면 해당 provider를 `experimental` 또는 `disabled`로 내린다.

### P0-7. Idempotency가 동시 요청과 입력 변경을 안전하게 처리하지 못함

- 완료 결과만 cache하므로 같은 요청이 동시에 들어오면 provider가 여러 번 실행된다.
- cache key가 facts, authorInputs, Locale, profile/schema version을 포함하지 않는다.
- 같은 key로 pricing 등 입력을 변경해도 과거 결과가 재사용될 수 있다.
- 웹은 클릭마다 새 idempotencyKey를 만들어 네트워크 재시도 의미가 약하다.

수정 기준:

- in-flight Promise와 완료 결과를 함께 저장한다.
- SHA-256 canonical request fingerprint를 사용한다.
- fingerprint는 channel, source/target Locale, publishFields, facts, authorInputs, resolved provider, profile/schema version을 포함한다.
- 같은 key + 다른 fingerprint는 `409 IDEMPOTENCY_CONFLICT`를 반환한다.
- 동일 요청 20건 동시 실행에서 provider 1회 호출을 릴리스 게이트로 둔다.

### P0-8. sourceHash와 stale 보장이 실제로 성립하지 않음

- 현재 hash는 publishFields만 대상으로 하는 32-bit 값이다.
- 서버는 authoritative revision을 보관하지 않는다.
- route가 `currentSourceHash`를 전달하지 않아 실행 후 검사는 자기 자신과 비교한다.
- 웹은 응답 적용 직전에 현재 원본 hash를 다시 확인하지 않는다.
- validate endpoint는 전달된 sourceHash의 불일치를 검증하지 않는다.

수정 기준:

- stateless MVP라면 `sourceHash`를 보안 lock이 아닌 client correlation 값이라고 명시한다.
- SHA-256 request fingerprint와 불투명 `compositionId`를 도입한다.
- 웹은 응답 적용 직전에 현재 fingerprint와 응답 fingerprint를 비교한다.
- 실제 revision history가 없다면 “revision 저장” 표현을 삭제하고 “현재 결과 + 이전 결과 1개”라고 문서화한다.

### P0-9. loopback 서버 호출 경계가 부족함

- 실행 시 `HOST=0.0.0.0`을 설정할 수 있지만 capabilities는 항상 loopback이라고 응답한다.
- Host·Origin·세션 nonce 검증이 없다.
- `GET /providers/readiness?probe=1`이 실제 LLM 호출이라는 side effect를 가진다.
- CORS 비활성만으로 DNS rebinding과 로컬 악성 프로세스를 방어할 수 없다.

수정 기준:

- 이번 MVP는 non-loopback bind를 fail-closed한다.
- Host allowlist에 `127.0.0.1`, `localhost`, `[::1]`만 허용한다.
- state-changing route는 per-launch nonce와 Origin 검사를 적용한다.
- 실제 auth probe는 보호된 POST와 사용자 명시 동작으로 이동하고 queue/rate limit을 적용한다.

### P0-10. 제품 저장소에 `.grok/skills`가 추적됨

계획은 `.grok/`을 커밋하지 않는다고 명시하지만 현재 `.grok/skills/parallel-dev-plan-orchestrator` 16개 파일이 Git에 추적되어 있다. 런타임 제품과 무관한 에이전트 스킬이 기능 커밋에 포함된 범위 이탈이다.

수정 기준:

- 제품 기능에 필요한 파일이 아니면 추적 대상에서 제거한다.
- `.grok/` 전체 ignore를 기본으로 하고 필요한 공개 설정만 별도 명시 경로로 둔다.
- release test에 `git ls-files .grok` 결과 0건을 추가한다.

### P0-11. 검증 원고 내부 문구가 게시 필드에 남음

`src/verified-copy.mjs`의 Facebook `groupBody`가 “그룹 규칙을 확인한 뒤 작성자가 다시 씁니다”라는 운영 지시다. 현재 internal-language 정규식이 이를 잡지 못하면 Korean source copy가 `ready`로 표시될 수 있다.

수정 기준:

- Facebook group은 group/rules/language가 입력되기 전 `needs_input`으로 둔다.
- 운영 지시는 `internal/prepublish`로 이동하고 `groupBody`에는 게시문만 허용한다.
- verified pack 파싱을 fence 순서가 아니라 명시적 channel/field manifest로 바꾼다.

## 4. P1 — 계약과 품질 보강

### OpenAPI는 아직 실행 가능한 모바일 계약이 아님

- 테스트가 YAML 문자열 존재 여부 중심이며 실제 schema validator가 아니다.
- `publishFields`, `facts`, `sourceDraft`, `authorInputs`가 일반 객체라 채널별 모델 생성이 어렵다.
- 실제 응답의 `summary`, `evidence`, `humanInputsUsed`, `composedAt` 일부가 문서에 없다.
- ErrorCode enum에 실제 runtime 오류가 다수 빠져 있다.
- request required 필드와 runtime validator가 일치하지 않는다.

보완:

- OpenAPI 3.1 parser/meta-schema 검증을 추가한다.
- 18개 channel field contract를 `oneOf + channel const` 또는 생성 schema로 연결한다.
- 모든 실제 요청·응답·오류를 OpenAPI validator에 통과시킨다.
- 최소 TypeScript와 Kotlin/Swift 중 하나의 generated model compile smoke를 수행한다.

### queue·취소·프로세스 생명주기

- 대기 중인 요청을 취소해도 queue에서 제거되지 않는다.
- 이미 abort된 signal로 dequeue되면 provider가 실행될 수 있다.
- `OAuthTextProvider.cancel()` 계약은 production 경로에서 사용되지 않고 인자 의미도 불명확하다.
- 실제 HTTP abort → child kill → temp cleanup 통합 테스트가 없다.

보완:

- signal-aware cancellable queue와 전체 deadline을 사용한다.
- queued cancellation은 provider spawn 0회를 보장한다.
- timeout·취소 뒤 child process와 temp workspace 0건을 확인한다.

### 채널 길이·정책 freshness

- LinkedIn, Threads, Shorts 등 일부 profile은 실질적인 최대 길이 검증이 없다.
- `정확한 채널 길이 검증 완료`라는 표현이 실제보다 넓다.
- profile에 `policyUrl`, `verifiedAt`, `expiresAt`를 기록하고 만료 시 `needs_review`로 내린다.
- live-form에서만 확인 가능한 채널은 자동 `ready`를 금지한다.

## 5. 최신 공식 정책 재확인

- Show HN 운영자는 2026-03-28 편집에서 게시 텍스트를 LLM으로 생성·편집하지 말라고 명시했다. 현재 `manual_only` 유지가 맞다.
  https://news.ycombinator.com/item?id=22336638
- DEV는 AI 보조 공개와 사람 사실 검증을 요구하며, 자기 사업·프로그램 홍보가 목적이면 안 된다. 현재 `reference_only`가 가장 안전하다.
  https://dev.to/guidelines-for-ai-assisted-articles-on-dev
- Reddit은 반복·대량 홍보와 생성형 AI 도구를 이용한 스팸 확산을 금지하고 커뮤니티별 규칙 확인을 요구한다.
  https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- Product Hunt의 현재 제출 흐름은 개인 계정, URL, 제품명, tagline, Topics, Thumbnail, pricing, 260자 description, Maker, first comment, draft/schedule을 요구한다. 현재 author input은 이 중 일부만 포함한다.
  https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- GeekNews 2026-08-16 약관은 충분한 검토 없는 대량 요약·SEO형 콘텐츠, 반복 홍보, 배포 채널화, 과도한 자동화를 금지한다.
  https://news.hada.io/terms

## 6. 수정된 현실 일정

| 보완 단계 | 내용 | 예상 |
|---:|---|---:|
| R0 | Locale·3축 상태·작성자 role·reference/manual 모드·Facebook internal hotfix | 2~3일 |
| R1 | CLI 격리 spike·runtime DLP·사실 evidence validator | 3~5일 |
| R2 | in-flight idempotency·SHA-256 fingerprint·stale apply·cancellable queue | 2~3일 |
| R3 | Host/Origin/nonce·readiness POST·실행 가능한 OpenAPI | 2~3일 |
| R4 | 실제 OAuth 공격 시나리오·채널 E2E·릴리스 증거 | 1~2일 |

전체 보완 예상: `10~16 개발일`

- 웹 안전 릴리스 게이트만 우선하면 R0~R2의 핵심 범위 `6~9일`
- 모바일 계약 beta 재승인까지 R3 포함 `8~12일`
- 전체 재릴리스 R4 포함 `10~16일`
- CLI의 OS-level 격리 방식이 불명확하면 `2~4일 spike`가 추가될 수 있다. 실패 시 provider를 experimental/disabled로 내리는 것이 일정상 안전하다.

## 7. 권장 MVP 순서

1. 한 채널씩 생성하는 기본 흐름을 유지한다. 일괄 생성은 고급 동작으로 내린다.
2. 공통 brief 4~6개를 먼저 받고 추천 채널 한 개를 보여준다.
3. 영어 트랙 X·Threads·LinkedIn, 한국어 트랙 GeekNews·OKKY부터 실제 E2E한다.
4. Product Hunt·Peerlist·Facebook Group은 계정·자산·규칙 조건부 채널로 유지한다.
5. Reddit·DEV는 reference-only, Show HN은 manual-only로 명확히 분리한다.
6. 실제 사용 KPI를 확인한 뒤 전체 채널과 모바일 계약을 확대한다.

권장 KPI:

- 저장소 URL 입력 후 `5분 이내` 첫 content-ready 후보
- 잘못된 채널 언어 `0건`
- 근거 없는 `I/we built` `0건`
- 승인한 revision과 복사 문자열 일치율 `100%`
- 동일 idempotency key 동시 요청 20건에서 provider 호출 `1회`
- canary secret·OAuth token·개인 경로 API 노출 `0건`

## 8. 릴리스 재승인 조건

- [ ] `.grok/` 추적 파일 0건
- [ ] 한국어 기본 채널이 영어 일괄 생성에서 제외됨
- [ ] content·operations·approval 상태가 분리됨
- [ ] publisher role 없는 `I/we built`가 차단됨
- [ ] Reddit·DEV reference-only, Show HN manual-only가 UI/API에 일치함
- [ ] 허위 기술·기능·성과 claim이 ready가 되지 않음
- [ ] 외부 canary secret 읽기·응답 유출 0건
- [ ] 동일 idempotency key 동시 20건 provider 1회
- [ ] 같은 key + 다른 fingerprint가 409 conflict
- [ ] queued request 취소 후 provider spawn 0회
- [ ] non-loopback·잘못된 Host·Origin 요청 거부
- [ ] auth probe side-effect GET 제거
- [ ] 실제 OpenAPI schema validation과 runtime error enum 일치
- [ ] 원문 변경 중 도착한 응답을 웹이 적용하지 않음
- [ ] 영어·한국어 대표 5채널 실제 E2E 통과

## 9. 검증 기록

- `npm test`: 로컬 네트워크 허용 환경에서 `93/93 PASS`
- 제한 sandbox 내부 실행: loopback `EPERM`으로 HTTP test 15건 실패, 코드 실패가 아님
- `main`: `1caf6d8`
- `origin/main`: `1caf6d8`
- 작업트리: clean
- Dev Lesson 검색: `0건`

## 10. 최종 권고

기존 계획은 폐기하지 않는다. 방향과 구현 자산이 유효하므로 같은 계획을 재개방해 위 R0~R4를 추가한다. 완료 표현은 다음처럼 수정한다.

```text
기존: 전체 채널 + 모바일 API 계약 완료, MVP 릴리스 가능
수정: 로컬 웹 beta 구현 완료, 전문가 재검토 P0 보완 진행 중
```

외부 모바일 기기 접속은 여전히 별도 계획으로 유지한다.

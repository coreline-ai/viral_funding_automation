# 구현 프롬프트 — ko-KR → en-US 번역 수직 MVP

**사용 금지 / 보관 문서.** 이 문서는 `XAI_API_KEY` 직접 호출을 전제로 하므로 현재 구현에 사용하지 않는다. 현재 콘텐츠 구성·OAuth 정본은 [`implement_20260818_210532.md`](./implement_20260818_210532.md)와 [`codex_oauth_proxy_integration_20260821.md`](./codex_oauth_proxy_integration_20260821.md)다.

---

다른 세션/에이전트에 아래 블록을 그대로 붙여 실행한다. 이 파일이 구현 지시의 정본이다. 원 계획 `implement_20260817_182435.md`의 체크박스는 진행에 맞춰 갱신한다.

---

## 에이전트에게 줄 프롬프트

```text
너는 viral_funding_automation 저장소에서 `ko-KR → en-US` 번역 수직 MVP를 Phase 1부터 Phase 4까지 끝까지 구현한다.

정본 계획: `dev-plan/implement_20260817_182435.md`
이 프롬프트의 「고정 결정」이 계획 문구와 충돌하면 이 프롬프트를 우선한다.
계획을 다시 쓰거나 범위를 넓히지 마라. 코드를 구현하고 테스트를 통과시켜라.

============================================================
0. 완료 정의 (이게 되어야 끝)
============================================================

웹 GUI에서 허용 채널 1개(권장: X 1안 또는 LinkedIn)로 다음을 한 번에 할 수 있어야 한다.

1. 공개 GitHub URL로 콘텐츠 생성 (기존 예제 1턴 유지)
2. 현재 탭 원고의 publishFields만 영어로 번역
3. 데스크톱에서 원문/번역 2열 비교·각각 수정·Locale별 저장
4. 복사·`<channel>.en-US.md` 다운로드
5. X 가중 문자 / Product Hunt 60·260 검증 후 위반 시 복사·다운로드 차단

자동 테스트: `npm test`, `node --check src/*.mjs web/app.js`, `git diff --check`
실키 영어 1턴은 Phase 2 코드 완료와 별도 게이트다. 키(`XAI_API_KEY`)가 있으면 허용 채널 1개 HTTP 200을 확인하고, 없으면 mock으로 Phase 2 코드를 완료한 뒤 계획에 “실키 1턴 미실행”을 기록한다. 키 없다고 Phase 2 코드를 열어두지 마라.

============================================================
1. 하지 말 것
============================================================

- 일본어·스페인어·포르투갈어·프랑스어, 18개 일괄 번역, GUI 자체 현지화
- DeepL 등 다중 Provider, 자동 fallback
- 자동 게시·예약·OAuth·SNS API
- Show HN 제목·본문 생성·번역·윤문
- HOLD 자동 해제
- 필드별 입력 위젯 (title/body 각각 input). 편집기는 직렬화 텍스트 2열만
- Instagram 42자, Peerlist 120자 등 Phase 4 범위 밖 검증 추가
- npm 의존성 추가. `package.json` dependencies는 계속 없음
- 브라우저 번들·HTML·localStorage·로그·에러 메시지에 API Key 노출
- 번역 결과 자동 축약·자동 삭제
- 외부 README 원문을 번역 Provider에 넣기
- 계획에 없는 리팩터·추상화·새 채널
- 기존 문자열 `drafts` 키를 제거하거나 이름 변경

============================================================
2. 고정 결정 (코딩 중 다시 고르지 말 것)
============================================================

1. `/api/generate`는 기존 문자열 `drafts`(18키)를 유지하고, 구조화 초안은 `documents`로 추가한다.
2. CLI 24파일은 운영 작업본이다. 게시문 + internal(체크리스트·HOLD·placeholder)을 지금처럼 유지한다.
3. 복사, `.en-US.md`, Provider 입력, 비교 편집기는 `publishFields`만 사용한다. internal은 넣지 않는다.
4. v3 → v4 이관은 파싱하지 않는다. v3 문자열 전체를 해당 채널 `locales["ko-KR"].legacyMarkdown` 또는 `publishFields.body`에 보존하고, 구조화 필드는 재생성 후에만 채운다. 사용자에게 구버전은 재생성 안내.
5. 번역 Provider는 `fetch` + 서버 env `XAI_API_KEY`, base `https://api.x.ai/v1`. 모델은 `TRANSLATION_MODEL` 없으면 구현 당일 https://docs.x.ai/developers/models 에서 확인한 chat/completions 또는 responses 호환 모델. SDK 설치 금지.
6. HOLD 채널은 번역 가능, 복사는 차단. 사람 보강 완료는 `internal.authorReady === true` 체크로만 해제. 자동 해제 없음. 체크 UI는 HOLD/draftOnly 채널에만 둔다.
7. `/api/translate` 본문 한도는 생성 API(8KB)와 분리한다. 번역은 64KB.
8. 잠금 용어는 summary 사실 허용 목록만: `name`, `repositoryUrl`, `demoUrl`, `license`, `technologies[]`, 명시적 버전 문자열. 본문의 모든 숫자(3/3, 20초, 1080×1920)를 잠그지 마라.
9. Phase 3 편집기는 publishFields를 채널 템플릿으로 직렬화한 통 텍스트 2열이다. 필드 위젯 금지.
10. Phase 4 길이 검증 채널은 X 단일·X 스레드·Product Hunt tagline/description만. 그 외 채널은 빈 필수 publish 필드만 거부.
11. 한국어 X 검증 재연결은 Phase 1 완료 조건이다. textarea 전체가 아니라 publish body/segments만 잰다.
12. 생성 경로의 기존 truncation(X 240 예산, PH 60/260)은 유지한다. 번역 결과는 자르지 않고 초과를 표시·차단만 한다.
13. stale hash는 `publishFields`만. internal·authorReady 변경은 stale이 아니다.
14. 원본 Locale `ko-KR`, 목표 `en-US`. BCP 47만 허용.
15. 한 요청은 현재 탭 채널 1개만 번역한다.
16. 정책은 Locale이 바뀌어도 약화하지 않는다.

============================================================
3. 현재 코드 계약 (회귀 기준)
============================================================

스택: Node.js 22+, ESM, 의존성 없음. `npm test` = `node --test`.
웹: `127.0.0.1:4310`, 정적 allowlist `/ /app.js /styles.css /favicon.svg /x-text.mjs`.
API: `POST /api/generate`, `POST /api/baseline`. 생성 본문 8KB, JSON only.
drafts 키(순서 무관, 집합 고정):
  x1 x2 x3 xThread threads reddit linkedin disquiet facebook instagram
  productHunt peerlist indieHackers okky geeknews dev shorts showHn
CLI 24파일: project-summary.json/md, viral-hooks.md, 위 채널 md, 별칭 short-post / community-post / long-post.
저장: `localStorage` 키 `coreline-launch:workspace:v1`, 현재 `STORAGE_VERSION = 3`.
HOLD 복사 차단은 지금 본문 정규식 `/(?:상태|Status):\s*`?HOLD\b/` — 구조화 후 `document.status`와 `authorReady`로 옮겨라. 정규식만 남겨 두지 마라.
웹 테스트는 HTML/JS 문자열 계약이다. UI를 바꾸면 `tests/web.test.mjs`를 같이 갱신한다.
`tests/web.test.mjs`의 `packageJson.dependencies === undefined`는 유지한다.

============================================================
4. 채널 레지스트리 (src/drafts.mjs에 코드로 고정)
============================================================

schemaVersion: `viral-draft/v1`

공통 문서 형태:
{
  channel,                    // drafts 키
  schemaVersion: "viral-draft/v1",
  status: "draft" | "hold" | "gate",
  sourceLocale: "ko-KR",
  translationPolicy: "allowed" | "draftOnly" | "disabled",
  publishFields: { ... },     // 채널별, 문자열 또는 문자열 배열
  internal: {
    checklists: string[],
    warnings: string[],
    placeholders: string[],
    policyUrls: string[],
    notes: string[],
    authorReady: false
  }
}

채널 맵:

| channel | status | translationPolicy | publishFields | 복사 기본 |
|---|---|---|---|---|
| x1 x2 x3 | draft | allowed | { body } | X 280 OK 시 |
| xThread | draft | allowed | { segments: [s1,s2,s3] } | 모든 구간 280 OK 시 |
| threads | draft | allowed | { posts: [p1,p2,p3] } | 허용 |
| linkedin | draft | allowed | { body } | 허용 |
| okky | gate | allowed | { title, body } | 허용 |
| geeknews | gate | allowed | { title, body } | 허용 |
| disquiet | gate | allowed | { productName, tagline, productLink, postBody } | 허용 |
| facebook | gate | allowed | { reelsCaption, groupBody } | 허용 |
| instagram | gate | allowed | { cover, caption } | 허용 |
| shorts | gate | allowed | { title, description, shots } | 허용. shots는 자막 문자열 배열 |
| productHunt | hold | allowed | { name, tagline, description, makerComment } | authorReady 전 차단 |
| peerlist | hold | allowed | { name, tagline, comment } | authorReady 전 차단 |
| indieHackers | hold | allowed | { title, body } | authorReady 전 차단 |
| reddit | hold | draftOnly | { facts } 사실 나열만. 제목·본문 생성 없음 | authorReady 있어도 게시문 없음. 사실 복사는 authorReady 후 |
| dev | hold | draftOnly | { facts } 검증 사실만. 게시문 없음 | 동일 |
| showHn | hold | disabled | {} 비움. 사실도 publishFields에 넣지 않음 | 번역 버튼 없음. API 거부. 복사 차단 |

facts 필드(reddit/dev): name, description, demoUrl, repositoryUrl, license, features[] 정도만. 체크리스트는 internal.

복사 차단 우선순위 (가장 안전한 쪽 유지):
disabled → hold && !authorReady → draftOnly && !authorReady → stale → 길이/필드 검증 실패 → 허용

Show HN internal에는 작성자 체크리스트와 확인된 사실(name/demo/source/license/description)만 둔다. publishFields는 빈 객체.

============================================================
5. 모듈 책임
============================================================

- `src/drafts.mjs` 신규
  채널 레지스트리, document 생성/검증, publish 직렬화, 운영 팩(CLI) 직렬화, status/policy, stale hash (`sha256` of canonical JSON publishFields), authorReady.
- `src/locales.mjs` 신규
  allowlist `ko-KR`, `en-US`와 표시 이름.
- `src/translation.mjs` 신규
  lock term 추출, Provider 호출(fetch), 응답 스키마 `viral-translation/v1` 검증, lock 검증, 에러 매핑. mock 주입 가능해야 한다 (`options.fetchImpl` / `options.provider`).
- `src/content.mjs`
  기존 렌더러를 document 빌더 + 두 renderer로 재구성. `buildProjectSummary` 유지. `renderContentPack(summary)`는 운영 팩 24파일을 지금과 같은 파일명·핵심 내용으로 출력.
- `src/x-text.mjs`
  기존 함수 유지. 새 validator가 재사용.
- `src/server.mjs`
  generate 응답에 `documents` 추가. `POST /api/translate` 추가. 번역 한도 64KB. 키는 `process.env.XAI_API_KEY`만. createAppServer(options)로 provider/fetch/token 주입.
- `web/app.js` `web/index.html` `web/styles.css`
  documents + drafts 수신. Locale 상태. 2열 비교. 번역 버튼. stale. authorReady 체크. 복사/다운로드는 publish 직렬화만. 저장 v4.
- 테스트
  기존 4파일 갱신 + `tests/drafts.test.mjs` + `tests/translation.test.mjs`.

============================================================
6. API 계약
============================================================

POST /api/generate  (본문 8KB, 기존과 동일)
응답에 기존 필드를 유지하고 추가:
{
  ...기존,
  drafts: { /* 18 문자열, 운영 팩과 동일 내용 */ },
  documents: {
    schemaVersion: "viral-documents/v1",
    sourceLocale: "ko-KR",
    items: { x1: DraftDocument, ... 18키 }
  }
}

POST /api/translate  (본문 64KB)
요청:
{
  channel: "x1",
  sourceLocale: "ko-KR",
  targetLocale: "en-US",
  publishFields: { ... },
  facts: { name, repositoryUrl, demoUrl, license, technologies }
}
금지: internal, README 원문, API key, 운영 체크리스트.

성공 응답 200:
{
  schemaVersion: "viral-translation/v1",
  channel,
  sourceLocale,
  targetLocale,
  publishFields: { ...같은 키만 },
  sourceHash: "<hex>",
  translatedAt: "<ISO>"
}

에러는 기존처럼 { error: { code, message } }.
코드 예: UNSUPPORTED_LOCALE, TRANSLATION_DISABLED, INVALID_CHANNEL,
REQUEST_TOO_LARGE, MISSING_API_KEY, PROVIDER_UNAUTHORIZED,
PROVIDER_RATE_LIMIT, PROVIDER_TIMEOUT, PROVIDER_ERROR,
LOCK_TERM_MISMATCH, INVALID_TRANSLATION_SHAPE.

Show HN / disabled는 Provider 호출 전에 거부.
draftOnly는 번역은 허용(사실 필드), 복사 정책은 클라이언트가 유지.
지원 채널·필드 키가 레지스트리와 다르면 거부.
응답 publishFields에 요청에 없는 키를 추가하거나 필요한 키를 빼면 LOCK/SHAPE 실패.
키 누락·401·429·timeout 메시지에 비밀정보 없음.

============================================================
7. 웹 저장 v4
============================================================

STORAGE_VERSION = 4
기존 키 `coreline-launch:workspace:v1` 유지.
v1→v2→v3 마이그레이션은 기존 함수를 거친 뒤 v4로 올린다.

v4 workspace:
{
  version: 4,
  savedAt, repoUrl, repository, facts, summary,
  drafts,              // 18 문자열 (운영 팩, 탭 호환·재생성 안내용)
  initialDrafts,
  documents: {         // 구조화
    [channel]: {
      ...DraftDocument,
      locales: {
        "ko-KR": { publishFields, updatedAt, sourceHash },
        "en-US"?: { publishFields, updatedAt, sourceHash, stale }
      }
    }
  },
  activeDraft, activeLocale,  // activeLocale 기본 ko-KR
  baseline, preflight
}

v3 이관: 각 채널 문자열을 drafts에 그대로 두고, documents[channel].locales["ko-KR"]에는 파싱 없이 body 또는 legacyMarkdown으로 보존. 구조화 맵은 비어 있거나 body 하나에 넣는다. 피드백: 신규 6종이 아니라 “구조화 초안은 콘텐츠 생성을 다시 눌러 만드세요.”

원문 publishFields가 바뀌면 해당 채널 en-US.stale = true, 복사·다운로드 차단.
번역 성공 시 stale = false, sourceHash = 현재 ko-KR hash.

============================================================
8. GUI 요구
============================================================

- 기존 18탭, 19 채널 보드, 예제 1턴, GeekNews preflight, baseline 유지
- 편집 영역에 Locale 선택: ko-KR / en-US
- 버튼 `현재 원고 번역` — 현재 탭 1개만 POST /api/translate
- Show HN: 번역 버튼 숨기고 직접 작성 안내
- disabled가 아닌데 번역 실패/진행 상태 표시
- 데스크톱(기존 1180px 이상): 원문 | 번역 2열. 번역이 없으면 오른쪽은 빈 상태(원문 복사 금지)
- 모바일(760/520 기존 쿼리): 1열, Locale 전환으로 원문/번역 교체
- HOLD/draftOnly 채널: `작성자 보강 완료` 체크 → internal.authorReady
- 복사/단일 다운로드: 활성 Locale의 publish 직렬화만
- 영어 파일명: `<repo>-<channel>.en-US.md` (기존 sanitizeFilename 유지)
- 일괄 다운로드 `viral-content-pack.md`: 운영 팩 문자열(drafts) 기준. 번역 언어로 바꾸지 마라. 회귀 최소
- GeekNews preflight 보고서는 기존처럼 drafts.geeknews 운영본 + 체크. 구조 변경 최소화
- X 검증은 활성 Locale의 publish body/segments. 운영 팩 전체가 아님
- 번역 중 중복 클릭 방지. 실패 시 기존 en-US 상태 롤백(부분 덮어쓰기 금지)

============================================================
9. Phase별 구현 순서 (앞 Phase 테스트 통과 전에 다음 금지)
============================================================

----- Phase 1. 게시 필드 / internal 분리 -----

구현:
- drafts.mjs 레지스트리 + hash + serializePublish + serializeOperatorPack
- content.mjs가 DraftDocument[]를 만들고, renderContentPack은 operator pack 24파일 출력
- generate 응답에 documents 추가. drafts 문자열은 operator pack과 동일
- 웹이 documents를 받아도 당장은 publish 직렬화를 에디터에 넣거나, 생성 직후 operator pack을 drafts에 유지하되 X 검증은 publish 필드로 전환
- 저장 v4 + v3 마이그레이션
- HOLD를 document.status로 이동. 복사 조건은 status/policy/authorReady
- 한국어 X 검증을 publish body/segments로 재연결

테스트:
- 18 documents 모두 publishFields + internal
- serializePublish 결과에 체크리스트, `HOLD —`, `[게시 전`, placeholder 없음
- CLI 24 파일명 + 기존 content.test 핵심 매칭 유지 (Show HN 생성 제목 없음, X 3안 서로 다름, PH 260자 등)
- generate 응답이 drafts 18문자열 + documents.items 18키
- v3 fixture가 v4로 올라가고 원문 문자열 손실 없음
- Show HN publishFields 빈 객체, 생성 title/body 없음
- 한국어 X 1안/스레드 검증이 publish 기준으로 기존 한도 동작
- npm test, node --check, git diff --check

체크박스: implement_20260817_182435.md Phase 1을 실제 상태에 맞게 갱신.

----- Phase 2. 영어 번역 API -----

구현:
- locales.mjs
- translation.mjs: 프롬프트는 시스템/개발자 지시와 사용자 데이터를 분리. 사용자 데이터는 publishFields + facts + lockTerms만. “새 사실·성과·기능 추가 금지, lock 용어 그대로.”
- POST /api/translate
- createAppServer({ translator, fetchImpl, token }) 로 mock
- 키 없으면 MISSING_API_KEY, Provider 호출 없음

테스트 (tests/translation.test.mjs + server.test.mjs):
- mock으로 정상 영어 + 스키마
- 미지원 locale/channel/필드/64KB 초과 거부
- 요청 객체에 internal 키가 없음 (translator가 받은 payload 단언)
- lock 용어 변경 응답 실패
- 숫자만 다른 정상 의역(20초→20 seconds)은 실패로 보지 않음
- 401/429/timeout/키 없음 메시지에 key/bearer 없음
- Show HN은 Provider mock이 호출되지 않음
- 키가 있으면 X1 또는 LinkedIn 1턴 200을 수동/스크립트로 확인하고 계획에 기록

----- Phase 3. GUI -----

구현:
- Locale 선택, 번역 버튼, 2열/1열, stale, authorReady, .en-US.md
- Show HN 번역 UI 없음
- 웹 테스트 계약 문자열 갱신 (STORAGE_VERSION = 4, 번역 버튼, 2열, authorReady)
- 기존 테마 토큰·innerHTML 금지·reduced motion 유지

테스트:
- 현재 탭만 fetch /api/translate (app.js 계약 또는 server+가급적 단위)
- 탭·Locale 전환 후 수정 유지
- 원문 수정 → en-US stale → 복사 차단
- HOLD + 번역문 있어도 authorReady 전 복사 차단
- Show HN에 번역 버튼 없음
- .en-US.md에 internal/체크리스트 없음
- 예제 1턴·18탭·저장 복원 회귀
- npm test + 브라우저에서 예제 1턴 (브라우저 도구 있으면 실제 확인, 없으면 콘솔 없는 범위와 미검증을 계획에 기록)

----- Phase 4. X · Product Hunt 검증 -----

구현:
- 공통 validatePublish(channel, publishFields, locale)
- X: countXWeightedCharacters(body) <= 280, URL은 23
- X thread: 각 segment <= 280, 하나라도 초과면 전체 복사 차단
- PH: tagline 문자 수 <= 60, description <= 260 (가중 아님, 기존 Array.from 문자)
- 필수 publish 빈 문자열/공백 거부 (showHn 빈 객체는 예외, 복사는 원래 차단)
- URL이 facts의 repositoryUrl/demoUrl과 다르면 실패
- GUI에 현재 수치/한도 표시. 자동 축약 없음
- HOLD+stale+길이초과가 겹치면 가장 안전 차단

테스트:
- 영문 280 경계, URL 23
- 스레드 한 구간 초과 → 전체 차단
- PH 60/260 경계와 +1
- emoji·CJK·영문·URL 혼합
- 빈 필드, 깨진 URL
- 한국어 X 결과가 Phase 1과 회귀 없음
- npm test, node --check, git diff --check

============================================================
10. 진행 규칙
============================================================

- 직렬로만 구현한다. 이 작업은 공유 스키마라 병렬 worktree를 쓰지 마라.
- 각 Phase 종료 시 implement_20260817_182435.md 체크박스를 실제와 맞게 켠다.
- 이슈는 해당 Phase 「이슈 및 수정」에 기록하고 같은 Phase에서 고친다.
- 구현 중 발견한 교훈 후보는 계획의 교훈 분류에 plan-only | existing-reference | new-lesson로 적는다. 없으면 “발생 후보 없음”을 완료 체크.
- README는 MVP가 실제로 동작한 뒤에만, 번역 GUI·환경변수 `XAI_API_KEY`·HOLD 사람 확인 체크를 짧게 반영한다. 마케팅 문구 금지.
- 커밋은 요청받기 전에는 하지 마라. 사용자가 커밋을 요청하면 Phase별로 나누거나 하나의 논리 커밋으로 정리한다.

지금 Phase 1부터 구현을 시작해라. 질문을 되풀이하지 말고, 이 프롬프트의 고정 결정으로 진행하라.
```

---

## 사용 방법

1. 새 에이전트 세션에서 저장소 루트를 연다.
2. 위 코드 블록 전체를 첫 메시지로 붙인다.
3. 구현이 끝나면 계획 파일 체크박스와 `npm test` 결과로 완료를 확인한다.

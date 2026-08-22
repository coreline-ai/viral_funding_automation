# 구현 프롬프트 — X 게시 전 원고 검토

아래 블록을 새 구현 에이전트의 첫 메시지로 그대로 사용한다.

```text
프로젝트: /Volumes/Eprojects/project_202608/viral_funding_automation

다음 개발 계획과 전문가 검토를 정본으로 삼아, X 채널의 `게시 전 원고 검토` 기능을 Phase 1~4까지 모두 구현해줘.

정본 문서:
- /Volumes/Eprojects/project_202608/viral_funding_automation/dev-plan/implement_20260821_225946.md
- /Volumes/Eprojects/project_202608/viral_funding_automation/reviews/design/X_PREPUBLISH_REVIEW_20260821.md
- /Volumes/Eprojects/project_202608/viral_funding_automation/dev-plan/implement_20260821_222000.md

핵심 목표:
현재 웹앱의 X 1안·2안·3안·X 스레드 탭에서, 사용자가 현재 선택 언어의 원고를 실제 게시 전에 검토할 수 있는 앱 고유의 **`X 게시 전 원고 검토`** 화면을 구현한다.

이 기능은 X UI·X Post·X 작성기의 클론이 아니다. X 정책상 존재하지 않는 Post mock-up을 만들지 말고, 줄바꿈·로컬 가중 문자 추정·URL·스레드 순서·승인 snapshot 상태를 점검하는 local-only proof surface만 구현한다.

완료 정의:
1. X 4개 탭(`x1`, `x2`, `x3`, `xThread`)에서만 `원고 | 게시 전 점검` 하위 보기를 전환할 수 있다.
2. 단일안은 현재 locale의 `publishFields.body`, X 스레드는 `publishFields.segments[]`를 원문·줄바꿈·순서 그대로 표시한다.
3. 각 원고/구간에 `로컬 가중 문자 추정 / 280`, 잔여·초과, URL 수를 표시한다.
4. `후보`, `승인 snapshot과 일치`, `수정으로 승인 무효`, `대상 언어 원고 없음`, `원고 오류`를 상태와 텍스트로 분명히 구분한다.
5. desktop 640px / mobile 390px 읽기 폭 preset과 실제 320px responsive를 제공한다.
6. 외부 X 요청·social write·OAuth·approval snapshot·copy·publish intent·dry-run·connector 호출이 preview에서 모두 0회다.
7. 기존 전체 회귀 테스트와 Threads·X·LinkedIn local dry-run이 계속 `networkWriteCount: 0`으로 통과한다.

절대 금지:
- X 로고, 워드마크, X glyph, Chirp font, 공식 SVG/CSS/DOM, screenshot, brand asset 복사·저장·배포
- X Post, 타임라인, 작성기, feed, 로그인, 탐색, trends, profile의 pixel-perfect clone 또는 mock-up
- avatar, display name, verified badge, timestamp, impression/like/reply/repost/bookmark/share 수·버튼·permalink·`View on X`
- clickable X URL/mention/hashtag, link unfurl/card, media preview, X iframe/embed, remote font/image
- X API/HTTP 요청, OAuth login/token, POST/upload/schedule/delete, 비밀번호, cookie, browser automation, scraping
- access token, refresh token, client secret, App ID, profile ID, vault reference를 DOM·model·localStorage·Git·Markdown에 저장
- `src/x-text.mjs` 알고리즘 교체, 새 문자 계산기, `twitter-text` 설치, OpenAPI/connector/schema/provider 리팩터링
- Threads/X/LinkedIn preview 공통 framework 추출, 기존 미커밋 변경사항 삭제/reset/덮어쓰기
- 사용자 요청 없는 git commit 또는 push

필수 UI·문구 계약:
- 기능명은 `X 게시 전 원고 검토` 또는 `게시 전 점검`만 사용한다.
- `X Post 미리보기`, `X 작성기`, `X 스타일 미리보기`, `공식 X 미리보기`라는 표현은 사용하지 않는다.
- 상단에 아래 안전 고지를 항상 표시한다.
  `이 화면은 게시 전 원고·길이 검토 도구입니다. 실제 X 화면·X 게시물·게시 예약 기능이 아닙니다.`
  `외부 X 요청·게시 0회.`
- X를 설명하는 `대상 채널 · X` 텍스트는 허용하지만 X처럼 보이는 brand lockup은 만들지 않는다.
- 단일안은 앱 고유의 proof sheet 하나로 렌더한다. X 카드처럼 보이게 만들지 않는다.
- X 스레드는 `<ol><li>`의 의미 구조로 `스레드 원고 계획 1/3`처럼 표시한다. 실제 reply chain·게시 결과라고 표현하지 않는다.
- readiness에 기록된 공개 `@handle`만 `게시 대상 계정(로컬 readiness)`으로 클릭 불가 텍스트 표시한다. 값이 없거나 X handle 규칙에 맞지 않으면 `@preview_account`와 `계정 정보 미확인`으로 표시한다.
- display name, avatar, verified, 시간, 반응, 액션 아이콘은 만들지 않는다.
- 본문과 URL은 `textContent`만 사용한다. `innerHTML`, raw HTML, `<a>`, iframe을 사용하지 않는다.
- CSS에는 `white-space: pre-wrap`, `overflow-wrap: anywhere`, `dir="auto"`를 적용한다.
- 상태는 색만으로 표현하지 않는다. 텍스트 + 색을 함께 사용한다.
- X 280자 경계는 기존 `src/x-text.mjs`의 `countXWeightedCharacters()`만 사용해 validator와 UI가 같은 값을 보이게 한다.
- 현재 카운터는 X `twitter-text` 완전 호환이 보장되지 않으므로 화면 표기는 반드시 `로컬 가중 문자 추정`이다. 이 기능이 실제 게시 가능 판정을 추가하면 안 된다.
- target locale 원고가 없으면 source(ko-KR) 원고를 절대 대체 표시하지 말고 empty state만 보인다.
- 280자 초과, 1~2개만 있는 스레드, stale 원고도 숨기거나 자르지 않는다. 본문과 함께 정확한 차단·경고 이유를 표시한다.
- preview state는 UI session state일 뿐이며 credential/reference/secret을 persist하지 않는다.

먼저 검토할 파일:
- README.md
- dev-plan/implement_20260821_225946.md
- reviews/design/X_PREPUBLISH_REVIEW_20260821.md
- dev-plan/implement_20260821_222000.md
- src/drafts.mjs
- src/x-text.mjs
- src/platform-readiness.mjs
- src/platform-registry.mjs
- src/server.mjs
- web/index.html
- web/app.js
- web/styles.css
- src/threads-preview.mjs
- tests/threads-preview.test.mjs
- tests/web.test.mjs
- tests/server.test.mjs
- tests/dry-run-rehearsal.test.mjs

구현 범위와 파일 책임:
- 신규 `src/x-preview.mjs`: 순수 immutable `createXPreviewModel()`만 담당한다.
- 수정 `src/server.mjs`: 브라우저 import용 X preview module static allowlist만 추가한다. API route는 추가하지 않는다.
- 수정 `web/index.html`: X 4개 탭에만 보이는 nested tablist와 local review panel markup을 추가한다.
- 수정 `web/app.js`: X review state, safe model input, `textContent` renderer, tab/viewport keyboard handler만 추가한다.
- 수정 `web/styles.css`: `.x-review-*` 독립 namespace의 proof sheet, diagnostic lane, responsive/a11y rule만 추가한다.
- 신규 `tests/x-preview.test.mjs`: pure model 단위 테스트를 작성한다.
- 수정 `tests/web.test.mjs`, `tests/server.test.mjs`: markup/a11y/security/static module 회귀를 추가한다.
- 수정 `dev-plan/implement_20260821_225946.md`: 구현이 실제로 완료된 항목·테스트·이슈/교훈만 체크한다.
- README는 모든 구현·검증이 끝난 뒤 기능과 external write 0을 짧게 반영할 수 있다.

Phase 1 — 순수 X 원고 검토 model
1. `src/x-preview.mjs`를 새로 만든다.
2. `createXPreviewModel()` 입력은 아래로 제한한다.
   ```js
   {
     channel,          // x1 | x2 | x3 | xThread
     publishFields,    // { body } | { segments }
     locale,
     localeAvailable,
     localeStale,
     approvalStatus,   // approved | unreviewed | invalidated
     publicHandle,
   }
   ```
3. model은 `single | thread`, status, safe identity, cards, notice, `externalWriteCount: 0`만 반환한다. 모든 결과는 deep immutable이어야 한다.
4. 각 card는 `text`, `index`, `total`, `weightedLength`, `limit: 280`, `remaining`, `overLimit`, `urlCount`, `sequenceLabel`만 가진다.
5. 단일안은 `body`만, xThread는 `segments[]`만 사용한다. 불필요한 input을 허용하지 않는다.
6. status는 locale/approval와 content validity를 한 상태로 뭉개지 않는다. 예를 들어 stale + 280 초과를 동시에 표시할 수 있어야 한다.
7. safe handle은 X handle 허용 형식(영문·숫자·underscore, 4~15자)만 `@handle`로 노출하고 그 외에는 placeholder로 바꾼다.
8. `fetch`, DOM, localStorage, connector, approval, publish intent, dry-run, API를 호출하지 않는다.
9. browser import가 필요하면 `src/server.mjs` static allowlist만 최소 추가한다.
10. `tests/x-preview.test.mjs`에 단일/스레드, 280/281, URL 23, CJK/emoji/NFC, 빈 body, 1~2개 스레드, locale 없음, stale, unsafe handle, immutability, secret-field 부재를 추가한다.

Phase 2 — X 1안 단일 원고 검토 UI
1. `x1` 채널에서만 먼저 `원고 | 게시 전 점검` nested tab을 보이게 만든다. 기본 선택은 원고다.
2. panel은 앱 고유 proof sheet로 아래 정보만 표시한다.
   - `X 게시 전 원고 검토`
   - 대상 채널, 현재 locale
   - 후보/approved/stale/empty와 content warning
   - 게시 대상 계정(로컬 readiness) 또는 safe placeholder
   - `로컬 가중 문자 추정 142 / 280`, 남은/초과, URL 수
   - 줄바꿈을 보존한 body proof
   - 실제 X UI/게시·외부 요청 0 고지
3. desktop 640px / mobile 390px button은 `aria-pressed`로 구현한다. device frame을 만들지 않는다.
4. current editor, locale, readiness handle, approval 상태가 변경되면 즉시 review model/panel을 다시 렌더한다.
5. `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, ArrowLeft/Right/Home/End roving keyboard를 구현한다.
6. status만 `aria-live="polite"`로 알리고 본문 전체를 live announce하지 않는다.
7. forced-colors, reduced-motion, focus-visible, 44px control, 320px overflow를 지원한다.
8. `tests/web.test.mjs`에는 X review markup·safe label·no X card anatomy·no `innerHTML`/iframe/external X fetch를 회귀로 추가한다.

Phase 3 — X 2·3안과 X 스레드 확장
1. Phase 2 패턴을 `x2`, `x3`에도 적용한다. 여러 안을 동시에 실제 게시 대상으로 보이게 합치지 않는다.
2. `xThread`에서는 `<ol><li>`로 segments를 순서대로 표시하고, 각 구간에 `스레드 원고 계획 n/m`, 가중 문자, URL 수, 남은/초과를 표시한다.
3. 1~2개 segment면 본문은 렌더하되 `최소 3개 구간 미충족`을 표시한다.
4. reply ID, Post ID, 수직 답글선, avatar, actual thread action처럼 보이는 요소를 추가하지 않는다.
5. 채널 전환 후 이전 단일안/스레드의 panel state·cards·status가 남지 않는지 테스트한다.

Phase 4 — 안전·브라우저 회귀 QA
1. browser에서 X 1안 → approval snapshot 일치 → editor 수정 → stale, target locale 없음, safe/unsafe handle, 280/281, xThread 순서를 실제로 확인한다.
2. 1280px desktop와 390px mobile screenshot을 아래 절대 경로에 저장한다.
   - /Volumes/Eprojects/project_202608/viral_funding_automation/output/playwright/x-review-desktop.png
   - /Volumes/Eprojects/project_202608/viral_funding_automation/output/playwright/x-review-mobile.png
3. 320px viewport에서 `scrollWidth <= viewport`를 확인한다.
4. review 전환/편집 중 `x.com`, `api.x.com`, `twitter.com`, `platform.twitter.com` 요청 0건과 external write 0회를 확인한다.
5. review가 `/api/v1/approval-revisions`, `/api/v1/publish-intents`, `/api/v1/dry-runs` 요청을 생성하지 않음을 확인한다.
6. 기존 Threads·X·LinkedIn local dry-run 회귀에서 `networkWriteCount: 0`을 확인한다.
7. 아래를 모두 실행한다.
   - npm test
   - npm run api:contract:check
   - find src scripts tests -type f -name '*.mjs' -print0 | xargs -0 -n1 node --check
   - node --check web/app.js
   - git diff --check

진행 규칙:
- Phase 0은 이미 완료됐다. 반드시 Phase 1부터 시작하고 각 Phase의 자체 테스트가 끝난 뒤에만 다음 Phase로 간다.
- 기존 미커밋 변경사항을 보존한다. scope 밖 코드 정리·공통화·재작성은 하지 않는다.
- 새 패키지 설치가 필요하다고 판단해도 설치하지 말고, 현재 표기는 `로컬 가중 문자 추정`으로 유지한다.
- 실패는 해당 Phase에서 수정한다. 재사용 가능한 문제만 정본 계획에 증거와 함께 `plan-only | existing-reference | new-lesson`으로 기록한다.
- 실제 구현과 검증이 끝난 항목만 `dev-plan/implement_20260821_225946.md` 체크박스를 갱신한다.
- git commit/push는 하지 않는다.

최종 보고 형식:
1. 변경한 파일
2. 구현 내용과 데이터 흐름
3. X clone 금지 경계 준수 확인
4. 화면 증거 절대 경로
5. 테스트 결과
6. 외부 X 요청·write 0 보장 확인
7. 발생 이슈·교훈 분류
8. 남은 위험과 다음 작업

코드 일부만 작성하고 멈추지 말고, Phase 1~4와 자동·브라우저 검증까지 완료한 뒤 보고해줘.
```

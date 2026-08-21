# 구현 프롬프트 — 전체 화면 단계별 완성

아래 블록은 현재 저장소 상태를 보존하면서 Coreline Launch 웹앱의 모든 화면(surface)을 **한 화면 단위로 끝까지 구현·검증**하도록 지시하는 실행 프롬프트다.
`Golo` 등 구현 에이전트의 첫 메시지로 그대로 사용한다.

```text
프로젝트: /Volumes/Eprojects/project_202608/viral_funding_automation

현재 웹앱의 모든 화면을 기존 기능 계약에 맞춰 완성·검증해줘. 이 앱은 별도 라우트가 많은 서비스가 아니라 하나의 workspace 안에서 상태에 따라 보이는 화면(surface)이 바뀌는 Vanilla JavaScript 웹앱이다. 따라서 “페이지”는 아래 화면 목록을 뜻한다.

정본 문서:
- /Volumes/Eprojects/project_202608/viral_funding_automation/README.md
- /Volumes/Eprojects/project_202608/viral_funding_automation/dev-plan/implement_20260821_201014.md
- /Volumes/Eprojects/project_202608/viral_funding_automation/dev-plan/implement_20260821_222000.md
- /Volumes/Eprojects/project_202608/viral_funding_automation/reviews/design/THREADS_PREVIEW_FEASIBILITY_REVIEW_20260821.md
- /Volumes/Eprojects/project_202608/viral_funding_automation/dev-plan/IMPLEMENT_PROMPT_20260821_threads_preview.md

먼저 읽을 코드:
- web/index.html
- web/app.js
- web/styles.css
- src/server.mjs
- src/drafts.mjs
- src/channel-profiles.mjs
- src/platform-registry.mjs
- src/platform-readiness.mjs
- src/publish-intent.mjs
- src/platforms/threads.mjs
- tests/web.test.mjs, tests/server.test.mjs, tests/threads-preview.test.mjs

제품 한 줄 정의:
공개 GitHub 저장소의 검증 가능한 사실을 바탕으로 18개 채널의 수동 게시용 원고를 만들고, 언어·사람 승인·계정/자산 readiness·local dry-run을 분리해 실제 소셜 게시 전에 안전하게 검토하는 로컬 웹앱이다.

최종 목표:
사용자가 `저장소 입력 → 사실 확인 → 채널 선택 → 원고/언어 편집 → 승인 snapshot → readiness → local dry-run → 수동 게시 준비 문서` 흐름을 각 화면에서 끊김 없이 이해하고 검증할 수 있게 한다. 현재 계획의 Threads 미리보기도 이 흐름 안에서 완성한다.

절대 금지:
- 실제 소셜 플랫폼 POST, 업로드, 예약, API write, browser macro, 비공식 API
- access token, refresh token, client secret, 비밀번호, OAuth CLI home, credential vault 값의 화면·Markdown·Git·localStorage 저장
- Codex/Grok OAuth proxy와 소셜 credential 공유
- Reddit, DEV, Show HN, GeekNews, Product Hunt 등 manual-only/reference-only 채널의 자동 게시 기능
- README·GitHub·API에서 확인하지 않은 기능, 성과 수치, 계정 상태, 실제 반응 수를 임의 표시
- 기존 미커밋 변경사항 삭제, `git reset`, 무단 commit/push
- 새 프레임워크·의존성 설치, 전면 리팩터링, 계획 밖 페이지/기능 확장
- Threads/Meta 또는 다른 서비스의 로고·워드마크·공식 screenshot·SVG·CSS·DOM·iframe 복사

현재 작업트리 규칙:
1. 시작 즉시 `git status --short`와 `git diff`를 확인한다.
2. 이미 존재하는 미커밋 파일은 다른 작업의 결과일 수 있으므로 삭제·되돌림·덮어쓰기를 하지 않는다.
3. 특히 `src/threads-preview.mjs`, `tests/threads-preview.test.mjs`, `src/server.mjs`의 기존 변경은 먼저 검토한다. 요구사항을 이미 만족하는 부분은 재구현하지 말고 이어서 완성한다.
4. 아래 Phase는 순서대로만 진행한다. 현재 Phase의 테스트가 모두 통과하기 전 다음 Phase를 시작하지 않는다.
5. 문제가 발생하면 먼저 해당 Phase에서 최소 수정으로 해결한다. 재사용 가능한 문제만 정본 계획의 이슈/교훈 규칙에 따라 `plan-only | existing-reference | new-lesson`으로 기록한다.

공통 구현 원칙:
- 기존 무의존성 Vanilla DOM 구조와 `src/server.mjs` static allowlist를 유지한다.
- 현재 실제 데이터(state, draft document, locale entry, approval assessment, readiness record)를 사용한다. 데모 전용 하드코딩, 가짜 완료 상태, 가짜 계정/반응 수를 만들지 않는다.
- 원고·URL 텍스트는 `textContent`만 사용해 렌더한다. `innerHTML`, remote image, iframe, link unfurl은 금지한다.
- 모든 기능은 keyboard, focus, `aria-*`, 320px mobile, reduced motion, forced colors를 고려한다.
- 화면 상태가 바뀌면 색만이 아니라 사람이 읽을 수 있는 텍스트 상태도 함께 표시한다.
- 개인/비밀 데이터는 localStorage와 화면 상태에 넣지 않는다. localStorage에는 기존 credential-free workspace 계약만 유지한다.
- actual publish capability는 계속 `false`여야 하며 local dry-run의 `networkWriteCount`는 계속 `0`이어야 한다.

구현 대상 화면 목록과 완료 기준:

| 번호 | 화면(surface) | 현재 기능 계약 | 구현·검증 완료 기준 |
|---:|---|---|---|
| 1 | 앱 shell·Evidence rail | 좌측 GitHub 근거/프로젝트 정보 | 빈 상태와 분석 완료 상태가 명확히 전환되고 README·license·demo·기능/대상/한계가 실제 summary만 표시된다. |
| 2 | 저장소 입력·Welcome | 공개 GitHub URL 입력 또는 example 1턴 | URL 검증·로딩·오류·재시도·example 흐름이 keyboard와 mobile에서 동작한다. 원본 저장소 write는 0회다. |
| 3 | 프로젝트 Header·채널 보드 | 18개 채널의 content/operations/approval 상태 | 선택 채널과 상태 축이 혼동되지 않고, manual/reference-only/compose 상태가 텍스트와 색으로 구분된다. |
| 4 | 자동 게시 Go/No-Go | external input은 후순위, actual publish 차단 | `NO_GO_PENDING_EXTERNAL_INPUTS`, 외부 운영 게이트, live write 차단이 명확하며 실제 게시 control이 없다. |
| 5 | 계정·권한·자산 readiness | non-secret 운영 준비 정보와 local dry-run 조건 | 플랫폼별 입력은 typed validation을 따르고, secret 입력은 차단되며 receipt/report만 내려받을 수 있다. |
| 6 | 원고·언어·생성/검토 workbench | 18개 채널, 5개 언어, compose/reference/manual 모드 | 원문·선택 언어 후보·stale·typed author input·길이/정책·provider readiness가 정확히 함께 변한다. 복사는 유효한 승인 snapshot만 허용한다. |
| 7 | Threads 읽기 전용 미리보기 | `posts[]` 1~3개, 공개 handle, locale/approval 상태 | 아래 Threads 전용 조건을 충족한 비공식 visual simulation이 동작한다. 외부 요청은 0회다. |
| 8 | Action dock·다운로드 | 복사/개별 Markdown/전체 다운로드 | content·operations·approval 3축을 우회하지 않으며 복사는 publish fields만, 다운로드는 안전한 내부 정보만 담는다. |
| 9 | GeekNews 수동 게시 preflight | 기준점/5개 체크/문서 다운로드 | 실제 등록 UI나 자동 submit 없이, 수동 확인 5개와 공개 GitHub 기준점을 명확히 남긴다. |

Phase 0 — 기준선과 공통 UI 회귀 확인
1. README와 정본 계획을 읽고 `web/index.html`의 실제 section/ID를 위 9개 surface에 매핑한다.
2. `web/app.js`의 render/state 흐름과 `web/styles.css`의 desktop/mobile breakpoint를 확인한다.
3. 기존 테스트를 우선 실행해 현재 기준선을 기록한다. 기존 실패가 있으면 원인·재현 명령을 보고하고, 무관한 코드를 고치지 않는다.
4. 각 surface가 실제 데이터 없이 가짜 내용을 보이지 않는지 점검한다.

Phase 0 자체 테스트:
- `npm test`
- `npm run api:contract:check`
- `find src scripts tests -type f -name '*.mjs' -print0 | xargs -0 -n1 node --check`
- `node --check web/app.js`
- `git diff --check`

Phase 1 — 화면 1~3: 프로젝트 입력과 콘텐츠 작업 시작 흐름
1. Evidence rail, repository command, welcome, project header, channel board의 상태를 실제 app state에 연결한다.
2. empty/loading/success/error 상태가 서로 잔존하지 않도록 render 순서를 정리한다. 현재 작동하는 데이터 fetch/API 계약은 바꾸지 않는다.
3. 18개 채널에서 `contentStatus`, `operationsStatus`, `approvalStatus`, support mode가 명확히 보이게 한다.
4. tablist의 선택/focus/Arrow/Home/End 동작, status live region, 320px overflow를 회귀 테스트한다.

Phase 1 자체 테스트:
- 빈 상태 → example repository 1턴 → project/channel board 상태를 브라우저에서 확인한다.
- malformed/non-public repository 오류가 welcome/result 화면을 동시에 보이지 않게 하는지 확인한다.
- 18개 채널이 고유 label, 모드, 상태를 정확히 표기하는지 test fixture로 검증한다.

Phase 2 — 화면 4~6: 안전한 원고 완성·승인·운영 준비 흐름
1. Go/No-Go와 readiness의 상태가 실제 `automation-go-live`, `platform-readiness`, approval 계약에서만 계산되는지 확인하고 UI 회귀를 고친다.
2. 채널 선택, locale 선택, compose/review/validate/revert, author input, stale 상태, approval snapshot, copy/download gate를 한 흐름으로 검증한다.
3. manual-only/reference-only 채널은 완성 원고 생성·자동 게시처럼 보이지 않게 하고, 필요한 사람 입력/수동 작성 안내를 우선 표시한다.
4. credential-like 입력은 즉시 차단하고 localStorage, download, error/toast에 노출되지 않도록 회귀 테스트한다.
5. Threads/X/LinkedIn local dry-run control은 valid approval + readiness에서만 활성화하고, 실행 뒤 safe receipt의 `networkWriteCount: 0`만 표시한다.

Phase 2 자체 테스트:
- 원고/언어/사실/author input/asset/account 중 하나가 바뀌면 approval snapshot이 무효가 되어 copy가 차단된다.
- invalid locale, missing target draft, long X text, unsupported channel input, secret-like string을 회귀한다.
- local dry-run 중 social external HTTP write가 0건이며 connector result가 receipt 외 상태를 바꾸지 않는지 확인한다.

Phase 3 — 화면 7: Threads 스타일 읽기 전용 미리보기
이 Phase는 `dev-plan/IMPLEMENT_PROMPT_20260821_threads_preview.md`를 더 상세한 정본으로 사용한다. 다음 조건을 모두 구현한다.
1. Threads 탭에서만 nested tablist `원고 | 미리보기`를 보인다. 다른 채널에서는 숨기고 editor 상태로 안전하게 돌아간다.
2. 선택 locale의 `publishFields.posts` 1~3개만 `<ol><li>` 카드로 렌더한다. 대상 언어가 없으면 원문 fallback 없이 empty state를 보인다.
3. 카드 순서, 줄바꿈, URL 텍스트를 정확히 보존하고 `연속 게시 계획 · 1/3`로 표시한다. reply/container chain이라고 주장하지 않는다.
4. approved/unreviewed/stale/invalidated/empty 상태를 텍스트+색으로 표기한다. editor·locale·approval·public handle 변경을 즉시 반영한다.
5. readiness의 안전한 public `handle`만 표시한다. 없거나 유효하지 않으면 `@preview_account` + `계정 정보 미확인` placeholder를 쓴다. 이름·avatar 사진·verified mark·반응 수·실제 시간은 만들지 않는다.
6. `Desktop · 680px`/`Mobile · 390px` preset, Arrow/Home/End, `aria-selected`, `aria-controls`, `aria-pressed`, reduced motion, forced colors, 320px overflow 방지를 구현한다.
7. 흰색 읽기 surface의 독립 namespace CSS만 만든다. Threads/Meta brand asset, iframe, remote image/fetch, action button/link, `innerHTML`은 금지한다.
8. 항상 `비공식 Threads 스타일 미리보기`와 `외부 네트워크 write 0회` 고지를 표시한다.

Phase 3 자체 테스트:
- `tests/threads-preview.test.mjs`: 1/2/3 posts, empty target locale, stale/invalidated, unsafe handle fallback, immutability, I/O 없음.
- `tests/web.test.mjs`: nested tabs, `<ol><li>`, keyboard/a11y marker, no brand asset/iframe/innerHTML, static action glyph.
- `tests/server.test.mjs`: model module static route만 허용하고 새 API route가 없음.
- 실제 브라우저에서 1280px desktop와 390px mobile 캡처를 만든다.
  - /Volumes/Eprojects/project_202608/viral_funding_automation/output/playwright/threads-preview-desktop.png
  - /Volumes/Eprojects/project_202608/viral_funding_automation/output/playwright/threads-preview-mobile.png
- preview 전후 요청을 확인해 social domain, `/api/v1/approval-revisions`, `/api/v1/publish-intents`, `/api/v1/dry-runs` 호출이 0건인지 검증한다.

Phase 4 — 화면 8~9: 복사·다운로드·수동 게시 준비 마감
1. Action dock은 승인된 revision의 publish fields만 복사한다. internal checklist/status/placeholder/credential reference가 clipboard에 포함되지 않게 한다.
2. 개별·전체 Markdown 다운로드는 현재 schema/version과 관련 status를 안전하게 표기하되 token/private path/secret을 배제한다.
3. GeekNews preflight는 5개 사람 확인과 공개 GitHub 기준점만 관리한다. 자동 등록·자동 스케줄·제출 버튼을 만들지 않는다.
4. 72시간 결과 확인은 후속 수동 운영 안내로만 남기며 metric을 꾸며내지 않는다.

Phase 4 자체 테스트:
- approved 아닌 원고, stale 원고, reference-only/manual-only 채널은 복사 불가다.
- download content와 clipboard publish fields가 계약대로 분리된다.
- preflight 5개 체크 전후 UI/다운로드 gate와 실제 소셜 network write 0을 확인한다.

Phase 5 — 전체 회귀·문서·브라우저 증거
1. 모든 Phase 테스트와 다음 명령을 실행한다.
   - npm test
   - npm run api:contract:check
   - find src scripts tests -type f -name '*.mjs' -print0 | xargs -0 -n1 node --check
   - node --check web/app.js
   - git diff --check
2. Playwright CLI 또는 프로젝트의 기존 브라우저 QA 경로로 다음 흐름을 실제 확인한다.
   - empty → example 1턴 → Threads tab → 미리보기 desktop/mobile
   - approval snapshot 일치 → editor 수정 → stale/invalidated 표기 및 copy 차단
   - target locale 없음 → empty state → target posts 존재 시 cards
   - readiness/approval 통과 → local dry-run → `networkWriteCount: 0`
3. 기능이 실제로 끝난 경우에만 README에 최대 2개의 짧은 문장으로 화면·Threads preview·external write 0을 반영한다.
4. `dev-plan/implement_20260821_222000.md`의 체크박스와 이슈/교훈 분류를 실제 검증 결과로만 갱신한다. 문서가 요구하지 않는 새 계획/기능은 만들지 않는다.

최종 완료 게이트:
- 9개 화면이 empty/loading/success/error와 mobile/desktop에서 일관되게 작동한다.
- 18개 채널의 content/operations/approval/support-mode 구분이 정확하다.
- 모든 현재 원고·언어·승인·readiness UI는 실제 credential-free state만 사용한다.
- Threads preview는 선택 locale·posts·approval·safe handle과 정확히 일치하며 external fetch/write 0이다.
- 실제 자동 게시 capability는 여전히 false이고 social platform live write route는 0개다.
- 기존 테스트, API contract, syntax, diff checks가 모두 통과한다.
- 작업 전부터 있던 변경사항은 보존했다.

최종 보고 형식:
1. 변경한 파일 — 파일별 역할
2. 화면별 구현 결과 — 위 1~9의 완료 상태
3. Threads preview 데이터 흐름과 안전 경계
4. 브라우저 증거 — desktop/mobile capture 절대 경로와 검증한 흐름
5. 테스트 결과 — 명령별 PASS/FAIL, 총 테스트 수
6. external write 0 보장 — 코드·브라우저·dry-run 근거
7. 발생 이슈·교훈 분류 — 없으면 없음
8. 남은 위험과 다음 작업 — 실제 자동 게시가 아닌 후속 별도 범위만 제안

구현을 중간에 요약만 하고 끝내지 말고, 각 Phase의 구현·자체 테스트·전체 회귀·브라우저 검증·문서 갱신까지 마친 뒤에 최종 보고해줘.
```

## 사용 전 확인

- 이 프롬프트는 현재 기능을 안전하게 **완성·검증**하는 목적이다. 실제 소셜 자동 게시 개발 프롬프트가 아니다.
- 7번 Threads 미리보기의 상세 제약은 별도 Threads 전용 프롬프트를 우선한다.
- 현재 작업트리에 이미 시작된 Threads preview model 변경이 있을 수 있으므로, 구현 에이전트는 반드시 보존·검토 후 남은 범위만 수행해야 한다.

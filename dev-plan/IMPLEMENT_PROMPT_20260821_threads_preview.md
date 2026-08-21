# 구현 프롬프트 — Threads 스타일 게시물 미리보기

아래 블록을 새 구현 에이전트의 첫 메시지로 그대로 사용한다.

```text
프로젝트: /Volumes/Eprojects/project_202608/viral_funding_automation

다음 개발 계획을 정본으로 삼아 Threads 스타일 게시물 미리보기의 Phase 1~3을 모두 구현해줘.

정본 문서:
- /Volumes/Eprojects/project_202608/viral_funding_automation/dev-plan/implement_20260821_222000.md
- /Volumes/Eprojects/project_202608/viral_funding_automation/reviews/design/THREADS_PREVIEW_FEASIBILITY_REVIEW_20260821.md

목표:
현재 웹앱의 Threads 탭에서 사용자가 현재 선택 언어의 원고 1~3개를 실제 게시 전 읽기 좋게 확인하도록,
고충실도·읽기 전용 `Threads 스타일 게시물 미리보기`를 구현한다.

이 작업의 완료 정의:
1. Threads 탭에서만 `원고 | 미리보기` 하위 보기를 전환할 수 있다.
2. 미리보기는 현재 선택 locale의 `publishFields.posts` 1~3개를 순서·줄바꿈·URL 텍스트 그대로 렌더한다.
3. `approved`, `unreviewed`, `invalidated/stale`, 대상 언어 없음/빈 posts 상태를 안전하게 구분한다.
4. desktop 680px와 mobile 390px CSS preset을 제공하고, 320px에서도 가로 스크롤·본문 잘림이 없다.
5. preview는 실제 게시, API write, OAuth, fetch, connector, approval snapshot 생성, publish intent, dry-run을 절대 실행하지 않는다.
6. 기존 Threads approval → readiness → local dry-run 회귀는 계속 `networkWriteCount: 0`으로 통과한다.

절대 금지:
- Threads/Meta 로고, 워드마크, 공식 아이콘/SVG, screenshot, CSS, DOM, iframe 복사 또는 저장
- Threads 전체 피드·검색·로그인·작성기·DM·인사이트 클론
- 실제 Threads API/HTTP 요청, 게시·예약·업로드, 브라우저 매크로
- OAuth token, refresh token, client secret, 비밀번호, credential vault reference를 화면·localStorage·Git·Markdown에 저장
- 외부 URL unfurl, 외부 fetch, remote image, 실제 반응 수·verified badge·실제 게시 시각 위조
- topic, reply/quote, Fediverse, 이미지/GIF/투표/텍스트 첨부, X·LinkedIn preview로 범위 확장
- 새 패키지 설치 또는 프레임워크 교체
- 기존 미커밋 변경사항 삭제·reset·덮어쓰기
- 사용자 요청 없이 git commit 또는 push

필수 구현 원칙:
- 정확한 서비스 pixel clone이 아니라 `비공식 Threads 스타일 미리보기`다.
- 상단 또는 panel 안에 다음 고지를 항상 보인다.
  `비공식 Threads 스타일 미리보기 · 실제 화면은 계정·지역·서비스 버전에 따라 달라질 수 있습니다.`
- 앱의 기존 dark workbench 안에 독립된 흰색 읽기 surface를 만들되, Threads 서비스 전체 shell/navigation은 만들지 않는다.
- 본문은 반드시 `textContent`로만 넣고 `white-space: pre-wrap`, `overflow-wrap: anywhere`, `dir="auto"`를 쓴다. `innerHTML`은 금지다.
- `posts[]`는 실제 reply/container chain이 아니다. 각 카드에 `연속 게시 계획 · 1/3`처럼 표시한다.
- preview identity는 현재 non-secret readiness의 public `handle`만 사용한다. handle이 없거나 안전하지 않으면 `@preview_account` placeholder와 `계정 정보 미확인`을 보인다. 실사용자 이름·avatar·verified mark·반응 수를 꾸며내지 않는다.
- avatar는 자체 CSS의 이니셜/중립 placeholder만 사용한다. 외부 image URL을 사용하지 않는다.
- action row는 자체 generic line glyph 또는 텍스트로 만든 시각 요소만 허용한다. button/link가 아니고 `aria-hidden="true"`여야 한다.
- preview의 상태는 `후보`, `승인 snapshot과 일치`, `미승인`, `수정으로 승인 무효`, `대상 언어 원고 없음`처럼 텍스트와 색을 함께 사용한다.
- preview는 현재 편집 중 원고를 즉시 반영한다. 승인 snapshot과 현재 원고가 다르면 강하게 stale/invalidated를 보여주되 approval/copy gate를 우회하지 않는다.
- 대상 번역 원고가 없으면 source 원고를 대체 표시하지 말고 empty state를 보인다.
- 상호작용 state는 session/browser UI state만 사용한다. preview에 credential/reference/secret을 persist하지 않는다.

먼저 검토할 파일:
- README.md
- dev-plan/implement_20260821_222000.md
- reviews/design/THREADS_PREVIEW_FEASIBILITY_REVIEW_20260821.md
- web/index.html
- web/app.js
- web/styles.css
- src/drafts.mjs
- src/platform-readiness.mjs
- src/platforms/threads.mjs
- src/server.mjs
- tests/web.test.mjs, tests/server.test.mjs, tests/dry-run-rehearsal.test.mjs

구현 순서:

Phase 1 — 순수 preview model
1. `src/threads-preview.mjs`를 새로 만든다.
2. `createThreadsPreviewModel()`은 순수 함수여야 하며 외부 I/O, DOM, fetch, API 호출이 없어야 한다.
3. 입력은 현재 locale의 `posts`, locale 상태, approval assessment, 안전한 public handle만 받는다.
4. 출력은 immutable cards, sequence label, identity state, preview state, empty state만 가진다.
5. secret-like key/value, App ID, account ID, profile URL, vault reference는 output에 넣지 않는다.
6. browser에서 import가 필요하면 `src/server.mjs`의 static allowlist만 최소로 확장한다. 신규 API route는 만들지 않는다.
7. `tests/threads-preview.test.mjs`로 1/2/3 posts, 빈 posts, 대상 locale 없음, stale/invalidated, handle fallback, immutability, no-I/O 경계를 검증한다.

Phase 2 — UI와 접근성
1. `web/index.html`에 Threads 활성 상태에서만 보이는 nested tablist `원고 | 미리보기`를 추가한다.
2. desktop 680px / mobile 390px 버튼은 `aria-pressed`를 쓰고 실제 device frame이나 Threads navigation을 만들지 않는다.
3. `web/app.js`에 최소 preview UI state와 `renderThreadsPreview()`를 추가한다.
4. 기존 editor, locale 변경, approval snapshot 무효화, channel 변경 시 preview를 즉시 재렌더한다.
5. `<ol><li>`로 1~3개 cards의 의미 순서를 구현한다. 세로 연결선은 장식만 담당한다.
6. `web/styles.css`에 `.threads-preview-simulation` 등 독립 namespace를 사용한다. 기존 메인 테마를 회귀시키지 않는다.
7. mobile 320px, 390px와 desktop 680px/1280px에서 가로 넘침이 없도록 한다.
8. nested tabs에 Arrow/Home/End 키 이동, 올바른 focus, `aria-selected`, `aria-controls`를 구현한다. 상태 변화만 aria-live로 전달한다.
9. reduced motion·forced colors·AA 대비를 보장한다.
10. `tests/web.test.mjs`에 markup/a11y/no-brand-asset/no-innerHTML/no-interactive action 회귀를 추가한다.

Phase 3 — 안전 검증과 브라우저 E2E
1. 원고 변경 전 approval snapshot 일치 → 편집 → invalidated/stale badge E2E를 검증한다.
2. target locale 없음 → empty state → locale 원고가 있을 때 card 표시 흐름을 검증한다.
3. 1280px desktop와 390px mobile screenshot을 다음 절대 경로에 저장한다.
   - /Volumes/Eprojects/project_202608/viral_funding_automation/output/playwright/threads-preview-desktop.png
   - /Volumes/Eprojects/project_202608/viral_funding_automation/output/playwright/threads-preview-mobile.png
4. preview를 조작해도 external social request, `/api/v1/approval-revisions`, `/api/v1/publish-intents`, `/api/v1/dry-runs` 호출이 없음을 테스트한다.
5. 기존 Threads local dry-run rehearsal과 approval/readiness 회귀가 유지되는지 확인한다.
6. 다음을 모두 실행한다.
   - npm test
   - npm run api:contract:check
   - find src scripts tests -type f -name '*.mjs' -print0 | xargs -0 -n1 node --check
   - node --check web/app.js
   - git diff --check

진행 규칙:
- Phase 0은 이미 완료됐다. Phase 1부터 구현하고 각 Phase 테스트가 통과해야 다음 Phase로 간다.
- 테스트 실패는 우선 해당 Phase 안에서 수정한다. 재사용 가능한 문제가 생기면 정본 계획의 이슈/교훈 섹션에 증거와 함께 기록하고 `plan-only | existing-reference | new-lesson`으로 분류한다.
- 구현 결과와 테스트 수를 기준으로 `dev-plan/implement_20260821_222000.md`의 체크박스를 실제 상태에 맞게 갱신한다.
- README에는 기능이 실제로 동작하고 테스트가 끝난 뒤에만, 1~2개의 짧은 문장으로 ‘Threads 읽기 전용 미리보기’와 외부 write 0을 반영한다.
- no-go 정책은 유지한다: `actualPublishCapability: false`, social live write route 0, local dry-run only.

최종 보고 형식:
1. 변경한 파일
2. 구현 내용과 데이터 흐름
3. 화면 증거 경로
4. 테스트 결과
5. 외부 write 0 보장 확인
6. 발생 이슈·교훈 분류
7. 남은 위험과 다음 작업

코드만 부분적으로 작성하고 멈추지 말고, Phase 1~3과 검증까지 완료한 뒤 보고해줘.
```

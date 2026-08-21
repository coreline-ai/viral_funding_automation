# Threads 게시 미리보기 정밀 디자인·구현 가능성 검토

검토일: `2026-08-21 KST`
검토 관점: Threads UI/UX, 소셜 제품 운영, 프런트엔드·접근성 아키텍처
결론: **조건부 GO — 고충실도 게시물 시뮬레이션은 구현한다. Threads 전체 서비스의 pixel-perfect 클론은 구현하지 않는다.**

## 검토 목적

현재 웹앱에서 Threads 원고를 실제 게시 전에 읽기 구조·줄바꿈·연속 게시 순서·승인 상태 기준으로 검토할 수 있는 미리보기의 범위를 정한다.

이 문서에서 `정밀`은 특정 시점의 공개 Threads UI가 가진 **게시물 정보 구조와 읽기 경험**을 자체 CSS로 재현한다는 뜻이다. Meta의 화면, 로고, CSS, DOM, 공식 아이콘을 복제하거나 실제 서비스처럼 동작하게 만든다는 뜻이 아니다.

## 종합 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| Threads 텍스트 게시물 카드 시뮬레이션 | GO | 현재 `threads.posts: string[]`, locale, approval snapshot, stale, local dry-run 계약을 재사용 가능 |
| 1~3개 연속 게시 순서 표시 | GO | 현재 원고가 3개 `posts[]`로 이미 구조화됨 |
| 데스크톱·모바일 CSS 프리셋 | GO | 외부 서비스 호출 없이 독립 surface로 렌더 가능 |
| 링크·대표 이미지 실제 unfurl | HOLD | 실제 Threads crawler 결과와 다를 수 있고 현재 text-only approval asset hash와 연결되지 않음 |
| topic·reply/quote control 표시 | 후속 P1 | 실제 write payload와 아직 결속하지 않으므로 표시용 입력도 별도 계약 필요 |
| 웹 피드·검색·로그인·작성기 전체 복제 | NO-GO | 서비스 변화가 빠르고 제품 목적·브랜드 혼동 위험이 큼 |
| 실제 게시·업로드·예약·OAuth token 처리 | NO-GO | 현재 `actualPublishCapability: false`, 외부 write 0회 원칙 유지 |

## 공식 UI·제품 변화 기준

Threads 웹은 단일 열뿐 아니라 사용자 정의 피드·다중 열을 제공하며, 우하단 `+`로 팝업 작성기를 여는 구조를 확장했다. 따라서 미리보기는 전체 웹앱이 아니라 **게시물 카드의 시각 언어**만 참고해야 한다. [Meta Threads 웹 업데이트](https://about.fb.com/news/2025/04/new-features-threads-web-experience/)

공식 안내에서 토픽 추가와 답글·인용 제어가 게시 경험의 일부로 확인되지만, 현재 프로젝트의 첫 actual-publish 범위는 단일 텍스트 글뿐이다. 토픽·대화 제어는 preview v1의 입력으로 만들지 않고 후속 결정으로 분리한다. [Meta의 토픽·답글 제어 안내](https://about.fb.com/news/2025/03/new-threads-features-more-personalized-experience-you-control/)

Threads 기능·웹 레이아웃은 계속 변한다. 정확도는 고정된 pixel parity가 아니라 `공식 공개 기준 + 관찰일 + viewport`가 기록된 visual simulation으로 관리한다. [Meta의 2026 Threads 업데이트](https://about.fb.com/news/2026/06/meta-launching-new-features-500-million-monthly-threads-users/)

## 디자인 참조 계약

### 구현할 시각 구조

| 요소 | 자체 구현 기준 |
|---|---|
| 읽기 폭 | desktop `680px` preset, mobile `390px` preset |
| surface | 앱의 어두운 workbench 안에 독립된 흰색 게시물 읽기 카드 |
| 프로필 행 | placeholder avatar, 표시 이름, 안전한 `@handle`, 고정 `미리보기` 시간 |
| 본문 | `textContent`와 `white-space: pre-wrap`으로 줄바꿈을 원문 그대로 표시 |
| 연속 글 | 의미 있는 `<ol><li>` 구조, 카드 사이의 장식 연결선, `연속 게시 순서 1/3` 표기 |
| 반응 행 | 좋아요·답글·재게시·공유를 뜻하는 자체 generic line glyph. 클릭 불가·카운트 미표시 |
| 상태 | 후보·승인 snapshot 일치·미승인·수정으로 무효/stale를 앱 고지 영역에서 분리 표시 |
| 하단 고지 | `비공식 Threads 스타일 미리보기 · 실제 화면은 계정·지역·앱 버전에 따라 달라질 수 있음` |

### 절대 포함하지 않을 자산·동작

- Threads/Meta 로고, 워드마크, 공식 소용돌이 아이콘, 공식 SVG/CSS/DOM
- 공식 사용자 게시물·아바타·스크린샷의 제품 포함 또는 export
- Threads iframe/embed, 스크래핑, 로그인 세션, 외부 `fetch()`
- 실제 반응 수·검증 배지·게시 시각·링크 썸네일의 위조
- `게시`, `예약`, `업로드`, 좋아요, 답글, 공유 동작

상표와 저작권은 Meta brand resource 또는 허가 범위에서만 사용해야 한다. 따라서 MVP에는 텍스트 라벨과 독자 구현 CSS만 쓰고 “공식 미리보기”라고 표기하지 않는다. [Meta 이용약관](https://www.facebook.com/terms)

## 현재 구현과의 접점

| 현재 자산 | 재사용 방식 | 변경 금지 경계 |
|---|---|---|
| `src/drafts.mjs`의 `threads.posts: string[]` | 카드 1~3개를 같은 순서로 render | 실제 reply/container 체인으로 표현하지 않음 |
| `web/app.js`의 선택 locale·원고 상태 | 현재 locale fields를 즉시 반영 | 대상 번역이 없을 때 원문 fallback 금지 |
| approval snapshot·fingerprint | snapshot 일치/무효 배지 계산 | preview가 승인·복사 조건을 우회하지 않음 |
| `platformReadiness.account.handle` | 안전한 공개 handle만 표시 | App ID, vault reference, token, ID는 표시하지 않음 |
| local dry-run | preview와 나란히 존재 | preview가 intent·connector·API 요청을 만들지 않음 |

현재 `posts[]`는 실 게시 후 생성되는 `reply_to_id` 체인이 아니라 local payload의 순서다. 따라서 카드에는 `연속 게시 계획 · 아직 게시되지 않음`을 표시한다.

## 권장 데이터·렌더링 경계

```text
선택된 Threads publishFields.posts + activeLocale
  + currentApprovalAssessment + safe public handle
        → createThreadsPreviewModel()  // 순수·no I/O
        → renderThreadsPreview()       // textContent만 사용
        → desktop/mobile CSS preset
```

- `src/threads-preview.mjs`: 순수 모델 생성과 입력 검증만 담당한다.
- `web/app.js`: Threads 탭이 선택되었을 때만 view model을 만들고 DOM을 렌더한다.
- `web/index.html`: `원고 | 미리보기`의 독립 하위 tablist와 읽기 전용 panel만 가진다.
- `web/styles.css`: `.threads-preview-simulation` 내부의 독립 토큰만 가진다.
- `src/server.mjs`: 새 순수 모듈을 브라우저에 제공해야 할 때 allowlist static route만 추가한다. API route는 만들지 않는다.

## 접근성·보안 기준

- `<ol><li>`로 순서를 전달하고 장식 연결선과 반응 glyph는 screen reader에서 제외한다.
- nested tablist는 Arrow/Home/End 키, `aria-selected`, `aria-controls`를 지원한다.
- 상태 변화만 `aria-live`로 알리고 편집 중 카드 본문 전체를 반복 낭독하지 않는다.
- 320px·390px·680px 이상에서 가로 스크롤·본문 잘림이 없어야 한다.
- 색만으로 후보/승인/stale을 구분하지 않고 텍스트 배지와 대비 AA를 제공한다.
- `innerHTML`, raw HTML, iframe, OAuth, token, 외부 social 요청은 허용하지 않는다.

## 전문가 권고

첫 구현은 **텍스트 카드 + 3개 연속 게시 + 상태 + desktop/mobile**까지만 만든다. 링크 카드, 이미지, topic, reply/quote control, 작성기 시뮬레이션은 승인 asset hash와 실제 Threads write 계약이 정해진 후 별도 계획으로 진행한다.

# X 게시 전 원고 검토 — 정밀 디자인·클론 가능성 전문가 검토

검토일: `2026-08-21 KST`<br>
검토 관점: X 정책·브랜드, 소셜 제품 UX, 프런트엔드·접근성 아키텍처<br>
판정: **실제 X UI/게시물 정밀 클론은 NO-GO. 앱 고유의 `X 게시 전 원고 검토`는 GO.**

## 결론

아직 X에 존재하지 않는 `x1`·`x2`·`x3`·`xThread` 초안을 실제 X Post·타임라인·작성기처럼 보이게 렌더하는 것은 진행하지 않는다. X Display Requirements는 실제·수정되지 않은 Post만 표시하도록 하고, 플랫폼에 없는 Post의 mock-up을 금지한다. 실제 Post를 나중에 표시할 때는 공식 embed 또는 최신 Display Requirements를 별도 적용한다.

이번 기능의 목적은 X 화면을 복제하는 것이 아니라, 사람이 **본문 줄바꿈, 예상 가중 문자, URL 처리, 스레드 순서, 선택 언어, 승인 snapshot 상태**를 게시 전에 확인하는 것이다. 기능 명칭은 `X 게시 전 원고 검토`로 고정한다.

## 전문가 종합 판정

| 검토 항목 | 판정 | 이유 |
|---|---|---|
| 실제 X Post·작성기·타임라인 정밀 클론 | NO-GO | 존재하지 않는 Post mock-up·브랜드 혼동 경계 |
| X 로고·Chirp 폰트·공식 SVG/CSS/DOM·스크린샷 사용 | NO-GO | 공식 브랜드·저작권 자산 복제 금지 |
| 독자 CSS의 text-only 원고 점검 panel | GO | 실제 X Content가 아닌 로컬 편집·검토 도구 |
| X 1·2·3안의 줄바꿈·가중 문자·승인 상태 표시 | GO | 기존 데이터·검증기를 안전하게 재사용 가능 |
| X 스레드의 원고 순서·구간별 가중 문자 점검 | GO | `segments[]`는 현재도 독립된 원고 계획임 |
| desktop/mobile 읽기 폭 비교 | GO | 기기/서비스 UI가 아닌 로컬 proof surface의 폭 비교 |
| 실제 X Content 표시 | HOLD | 실제 게시 후 공식 embed 또는 Display Requirements 전체 적용이 필요 |
| API/OAuth/업로드/예약/자동 게시 | NO-GO | 현 pre-publish 범위 및 external write 0 원칙 밖 |

## 공식 근거와 정책 경계

- X는 실제·수정되지 않은 Post 표시를 요구하며 존재하지 않는 Post mock-up을 금지한다. [X Display Requirements](https://docs.x.com/developer-terms/display-requirements)
- X 브랜드 툴킷은 로고·Post template 사용에 공식 가이드를 요구하고, 공유 Post는 실제 Post를 수정 없이 사용하도록 안내한다. [X Brand Toolkit](https://about.x.com/en/who-we-are/brand-toolkit)
- 일반 Post는 280자 기준이며 URL은 원래 길이와 무관하게 23자로 계산된다. 정확한 문자 계산에는 `twitter-text` 사용이 권장된다. [X Character Counting](https://docs.x.com/fundamentals/counting-characters), [X Link Posting](https://help.x.com/en/using-x/how-to-post-a-link)
- 실제 자동 action은 OAuth 외에 행위의 명확한 설명·명시적 동의가 필요하며 비공식 웹 스크립팅은 허용되지 않는다. [X Automation Rules](https://help.x.com/en/rules-and-policies/x-automation)

## 정밀 분석 결과: 구현 가능한 디자인 계약

### 정보 구조

```text
X 게시 전 원고 검토
├─ 대상 채널 · X
├─ 언어 · ko-KR / en-US / …
├─ 승인 상태 · 후보 | snapshot 일치 | 수정 후 재승인 필요
├─ 로컬 가중 문자 추정 · 142 / 280 · URL 1개(예상 23)
├─ 읽기 폭 · 넓게 640px | 모바일 390px
├─ 원고 proof surface
│  └─ 본문 줄바꿈·URL 텍스트를 그대로 표시
└─ 안전 고지 · 실제 X 화면·게시 기능이 아님 · 외부 요청/게시 0회
```

- **단일안 (`x1`·`x2`·`x3`)**: proof surface 하나와 문자 진단 하나만 표시한다.
- **스레드 (`xThread`)**: 의미 있는 `<ol><li>`로 `원고 1/3`, `원고 2/3`, `원고 3/3`을 표시한다. 실제 reply chain·게시된 스레드라고 표현하지 않는다.
- **계정**: 필요할 때 readiness의 공개 `@handle`만 `게시 대상 계정(로컬 readiness)`으로, 클릭 불가 텍스트로 표시한다. 표시명·아바타·verified·시간은 사용하지 않는다.
- **번역 없음**: 선택한 target locale 원고가 없으면 빈 상태만 표시한다. `ko-KR` 원문 fallback은 금지한다.
- **280 초과/미승인/stale**: 본문을 숨기지 않는다. 원고와 문제를 함께 보여야 사람이 수정할 수 있다.

### 시각 계약

| 요소 | 독자 구현 기준 |
|---|---|
| 표면 | 현재 앱의 dark workbench 안에 neutral proof sheet. X 화면의 black/white/blue 레이아웃을 모사하지 않음 |
| 글꼴 | 기존 `--font-ui`, `--font-mono`만. Chirp·remote font 금지 |
| 본문 | desktop 16px/1.55, mobile 15px/1.55, `white-space: pre-wrap`, `overflow-wrap:anywhere`, `dir="auto"` |
| 메타 | 11px mono, 상태·카운트는 읽기 쉬운 텍스트와 색을 함께 제공 |
| 폭 | desktop `640px`, mobile `390px`; 320px에서는 전체 폭으로 축소 |
| 간격 | shell 18px/14px, proof 20px/16px, segment 12px; 장식보다 본문 줄바꿈을 우선 |
| 상호작용 | `원고 | 게시 전 점검`과 폭 선택만. 게시·예약·좋아요·답글 등 X 행동을 닮은 control은 없음 |

### 접근성·보안 계약

- 하위 탭은 `role="tablist"`, `aria-selected`, `aria-controls`, ArrowLeft/Right·Home·End roving focus를 제공한다.
- 상태만 `aria-live="polite"`로 알리고, 타이핑마다 본문 전체를 반복해 읽지 않는다.
- 장식 요소 없이 스레드 순서를 `<ol><li>`로 전달한다.
- forced colors, reduced motion, focus-visible, 44px 이상 viewport control, 320px overflow를 검증한다.
- 본문은 `textContent`로만 넣는다. `innerHTML`, iframe, raw HTML, remote font/image, external fetch를 사용하지 않는다.
- model/DOM/localStorage에 access token, refresh token, client secret, App ID, profile ID, vault reference, cookie를 넣지 않는다.

## 정확도 한계와 보완 원칙

현재 `src/x-text.mjs`는 NFC 정규화, URL 23자, CJK/emoji 가중 계산을 구현하며 기존 `validatePublish()`와 같은 결과를 내야 한다. 하지만 자체 URL 정규식 기반 구현이 X의 `twitter-text`와 모든 Unicode edge case에서 동치인지는 증명되지 않았다.

따라서 v1의 표기는 **`로컬 가중 문자 추정`**으로 고정한다. 실제 X write 범위로 넘어가기 전에만 별도 계획으로 `twitter-text` 호환 fixture와 의존성 도입 여부를 재검토한다. 이번 UI에서 새 계산기를 만들거나 자동 게시 가능 판정을 부여하지 않는다.

## 현재 코드 접점

| 현재 자산 | X 원고 검토에서의 역할 | 변경 금지 경계 |
|---|---|---|
| `src/drafts.mjs` | `x1~x3.body`, `xThread.segments[]`, `validatePublish()` 정본 | publish schema 변경 없음 |
| `src/x-text.mjs` | 모든 구간의 동일한 가중 문자 계산 | 별도 카운터 작성 없음 |
| `web/app.js` | locale, approval assessment, safe readiness handle, Threads nested-tabs 패턴 | preview가 approval/dry-run 생성 금지 |
| `src/platform-readiness.mjs` | 공개 `account.handle`만 사용 | credential/App/ID 노출 금지 |
| `src/server.mjs` | browser import용 static allowlist | API route 추가 없음 |
| `tests/threads-preview.test.mjs` | immutable/no-fallback/stale/handle test 패턴 참고 | 성급한 공통 framework 추출 없음 |

## 정밀 클론 금지 목록

- X 로고·워드마크·X glyph·공식 SVG·Chirp font·공식 CSS/DOM/스크린샷
- 좌측 navigation, 중앙 timeline, 우측 trends, compose modal, 실제 Post card의 외형·동작
- avatar, display name, verified badge, timestamp, impression/like/reply/repost/bookmark/share, permalink
- `Post`, `Reply`, `Repost`, `Like`, `View on X` 또는 유사 행동 버튼
- clickable mention/hashtag/X URL, link unfurl/card, media preview
- X iframe/embed, `x.com`·`api.x.com`·`twitter.com`·`platform.twitter.com` 요청
- OAuth, token, password, cookie, browser automation, scraping, API POST/upload/schedule/delete

## 구현 가능 최종 판단

**클론 자체는 진행 불가**다. 대신 위 독자 design contract에 따른 `X 게시 전 원고 검토`는 현재 Threads preview의 순수 model·안전 renderer 경계를 재사용하여 약 2~3일 내 구현 가능하다. 첫 구현은 X 1안 단일 원고부터 시작하고, 이후 2·3안과 스레드를 같은 안전 경계에서 순서대로 확장한다.

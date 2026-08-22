# 나머지 플랫폼 게시 전 미리보기 검토 — 2026-08-22

## 결론

X·Threads에 이어 **나머지 17개 플랫폼도 모두 로컬 미리보기로 구현 가능**하다. 단, 원고 데이터의 성격이 다르므로 모든 채널을 같은 게시물 카드로 만들면 안 된다.

| 구분 | 대상 | 미리보기의 정체 | 구현 판단 |
|---|---|---|---|
| 완성 원고형 | LinkedIn, Facebook, Instagram, Product Hunt, Peerlist, Disquiet, Indie Hackers, OKKY, GeekNews, YouTube Shorts | 현재 `publishFields`를 실제 읽기 흐름에 가깝게 보여주는 게시 전 화면 | 진행 가능 |
| 사람 작성 보조형 | Reddit, DEV, Show HN | 완성 게시물이 아닌 작성 폼·사실 자료·필수 입력을 보여주는 준비 화면 | 진행 가능. 완성 글처럼 보이게 만들지 않음 |
| 신규 수동 입력형 | TikTok, Discord, Bluesky, Mastodon | 현 생성기에는 원고가 없으므로 사용자가 입력한 로컬 brief만 보여주는 미리보기 | 입력 계약을 먼저 만든 뒤 진행 |

공통 목표는 “실제 서비스에서 이 글·영상·제품 등록이 어느 정도 밀도와 줄바꿈으로 보일지”를 판단하게 하는 것이다. 각 화면은 서비스의 **정보 순서·읽기 폭·콘텐츠 밀도·미디어 비율**을 가깝게 반영한다. 다만 실제 계정, 반응 수치, 인증 배지, 타임스탬프, 로고·폰트·스크린샷·소스 CSS는 사용하지 않는다. 따라서 미리보기는 실제 게시물이나 공식 화면이 아니라, 명확히 표시된 로컬 draft simulation이다.

## 공통 안전·디자인 계약

- 선택한 target locale의 원고만 렌더한다. 번역본이 없거나 stale이면 원문으로 대체하지 않고 빈 상태와 이유를 보인다.
- 미리보기는 승인 snapshot·운영 readiness·길이 검증을 **표시만** 한다. 승인·복사·publish intent·dry-run을 우회하거나 변경하지 않는다.
- 모든 본문은 `textContent`와 `white-space: pre-wrap`으로 렌더한다. `innerHTML`, iframe, live embed, 외부 이미지·폰트·fetch는 금지한다.
- handle은 readiness에 있는 공개 handle만 축약해 표시할 수 있다. avatar·실명·인증·반응·시간은 가짜로 만들지 않는다.
- local asset은 session의 object URL만 잠깐 사용하고, readiness의 asset hash와 일치할 때만 렌더한다. 경로·token·secret·object URL은 snapshot이나 localStorage에 저장하지 않는다.
- 각 플랫폼은 구현 직전에 공식 도움말과 공개 화면의 비로그인 visual reference를 다시 확인하고, URL·확인일·viewport를 해당 Phase 검증 기록에 남긴다. UI를 scrape·복사·embed하지 않는다.
- 구현과 검증은 반드시 한 플랫폼씩 끝낸다. 앞 플랫폼의 unit/DOM/browser QA가 통과하기 전 다음 플랫폼 코드를 시작하지 않는다.

## 플랫폼별 판단과 화면 계약

| 순서 | 플랫폼 | 현재 입력 | 가까이 볼 요소 | 미리보기 계약 / 반드시 막을 것 |
|---:|---|---|---|---|
| 1 | LinkedIn | `body` | 밝은 전문 피드의 작성자·본문·공개 범위·댓글 설정 밀도 | 3,000자 진단, role/handle은 안전한 readiness만. 실제 프로필·반응·post 버튼 없음 |
| 2 | Facebook | `reelsCaption`, `groupBody` | 세로 Reels와 그룹 글의 서로 다른 읽기 구조 | Reels·Group을 별도 surface로. 그룹명·규칙 확인 전 group preview는 준비 상태만 표시 |
| 3 | Instagram | `cover`, `caption` | 9:16 video stage, cover와 caption의 우선순위 | asset hash 일치 전에는 placeholder만. 실제 계정·음원·reaction UI 없음 |
| 4 | YouTube Shorts | `title`, `description`, `shots[]` | 9:16 stage와 title/description/shot 흐름 | asset metadata·title 길이·shot 순서 확인. 가짜 view/like/채널 정보 없음 |
| 5 | TikTok | 없음 | 세로 영상·caption·cover·visibility 준비 흐름 | 새 manual brief를 먼저 정의. 생성 원고나 watermark가 있는 화면을 임의로 만들지 않음 |
| 6 | Product Hunt | `name`, `tagline`, `description`, `firstComment` | 제품 header, thumbnail/gallery, pricing, maker comment | asset·pricing·product URL·maker readiness를 분리. fake vote/rank/review 없음 |
| 7 | Peerlist | `name`, `tagline`, `comment` | launch card, cover, demo, maker comment | Verified 개인 profile, 100% complete project, name/tagline/cover/demo, launch-day 확인을 readiness로 분리. upvote 요청·rank/schedule UI 차단 |
| 8 | Disquiet | `productName`, `tagline`, `productLink`, `postBody` | 제품 중심 detail와 연결 포스트 | product 등록/검토 상태가 없는 일반 maker post처럼 렌더하지 않음 |
| 9 | Reddit | `facts`만 | subreddit·post type·title·flair·body 작성 구조 | facts는 자료 pane만. 실제 제출글 제목/본문은 사용자가 직접 입력할 때만 local draft로 표시 |
| 10 | Indie Hackers | `title`, `body` | problem/learning/question 중심 article thread | author role·동기·결정 입력 없이는 `I built` 서술을 만들지 않음 |
| 11 | DEV | `facts`만 | article title/tags/body/disclosure 작성 구조 | `human_draft_required` 화면. 홍보성 자동 article 또는 publish-ready 상태를 만들지 않음 |
| 12 | OKKY | `title`, `body` | 한국어 커뮤니티 글의 category·title·본문 구조 | 카테고리·규칙 확인을 별도 gate로 보이고 가짜 댓글·추천 수 없음 |
| 13 | GeekNews | `title`, `body` | Show 등록의 간결한 title/body/source 구조 | Show 유형·가입/규칙 readiness를 표시. 뉴스/Show 혼동, score/comment, 이미지 본문 없음 |
| 14 | Show HN | 없음 | manual-only submission checklist와 단순 원고 폭 | 사람이 직접 쓴 내용만 local field에 표시. AI 생성/번역/윤문 및 제출 버튼 없음 |
| 15 | Discord | 없음 | message와 optional local embed의 정보 밀도 | manual message brief부터. webhook URL/token/서버명·실제 메시지 전송 없음, mentions 기본 차단 |
| 16 | Bluesky | 없음 | 짧은 text post와 locale/link facet 준비 상태 | manual text brief부터. rich-text facet은 표시용 진단만, 실제 profile/feed/reaction 없음 |
| 17 | Mastodon | 없음 | 본문·server·visibility·content warning 작성 흐름 | instance별 문자 한도·규칙을 사용자 입력으로 받음. 보편적 500자 제한으로 고정하지 않음 |

## 공식 확인 근거

| 플랫폼 | 구현에 반영할 공식 근거 |
|---|---|
| LinkedIn | [Post and share updates](https://www.linkedin.com/help/linkedin/answer/a527227) — 3,000자와 audience/comment 설정 |
| Facebook | [Create a reel](https://www.facebook.com/help/www/2862139500770200), [Facebook video sharing changes](https://www.facebook.com/help/398606435303267) |
| Instagram | [Create a reel](https://www.facebook.com/help/instagram/225190788256708) |
| YouTube Shorts | [Shorts 만들기](https://support.google.com/youtube/answer/10059070?hl=en-EN), [동영상 세부정보](https://support.google.com/youtube/answer/57407?co=GENIE.Platform%3DAndroid&hl=en) |
| TikTok | [Content Posting API](https://developers.tiktok.com/products/content-posting-api/), [Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines) |
| Product Hunt | [How to post a product](https://help.producthunt.com/en/articles/479557-how-to-post-a-product) |
| Peerlist | [Launch a project](https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad), [Launchpad guidelines](https://help.peerlist.io/individual/launchpad/guidelines-faqs) |
| Disquiet | [공지사항](https://disquiet.io/announcement) |
| Reddit | [How to post and comment](https://support.reddithelp.com/hc/en-us/articles/360060422572-How-do-I-post-and-comment-on-Reddit), [Spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam) |
| Indie Hackers | [Successful post tips](https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd) |
| DEV | [Writing, editing and scheduling](https://dev.to/help/writing-editing-scheduling), [AI-assisted articles](https://dev.to/guidelines-for-ai-assisted-articles-on-dev/) |
| OKKY | [OKKY 소개](https://okky.kr/corp/about), [사이드 프로젝트 및 모임&스터디 게시판 이용 규칙](https://okky.kr/articles/1437303) |
| GeekNews | [이용법](https://news.hada.io/guidelines), [이용약관](https://news.hada.io/terms) |
| Show HN | [Show HN guide](https://news.ycombinator.com/showhn.html), [HN guidelines](https://news.ycombinator.com/newsguidelines.html) |
| Discord | [Webhooks](https://docs.discord.com/developers/platform/webhooks), [Webhook resource](https://docs.discord.com/developers/resources/webhook) |
| Bluesky | [Posts](https://bsky.network/docs/about-bluesky-content/posts/), [Rich text](https://bsky.network/docs/about-bluesky-content/post-richtext/) |
| Mastodon | [Posting guide](https://docs.joinmastodon.org/user/posting/), [Instance v2 API](https://docs.joinmastodon.org/methods/instance/#v2), [Brand Toolkit](https://joinmastodon.org/branding) |

## 구현 우선순위

1. **LinkedIn**을 다음 1개로 구현한다. 단일 body가 이미 있고 asset·커뮤니티 선택·manual-only 제약이 없어, 미리보기 framework를 가장 작게 검증할 수 있다.
2. Facebook → Instagram → YouTube Shorts → TikTok 순서로 세로 미디어 preview의 asset/hash 경계를 재사용한다.
3. Product Hunt → Peerlist → Disquiet은 제품 launch/detail의 structured field 검토를 진행한다.
4. Reddit → Indie Hackers → DEV → OKKY → GeekNews → Show HN은 커뮤니티/사람 작성 경계를 유지한다.
5. Discord → Bluesky → Mastodon은 별도 manual brief contract를 추가한 뒤 진행한다.

**완료 정의:** 각 플랫폼은 1280·390·320px 시각 확인, 빈 locale·stale·미승인·필수 입력 누락, 긴 URL/한국어/emoji, social request/write 0, 기존 전체 회귀를 통과했을 때만 완료다.

## 구현 현황

| 플랫폼 | 상태 | 증거 |
|---|---|---|
| LinkedIn | 완료 | local-only immutable model, `원고 | 게시 전 미리보기`, 3,000자 진단, desktop/mobile preset, `npm test` 179/179 PASS (`2026-08-22`) |
| Facebook | 완료 | `원고 | Reels 미리보기 | 그룹 미리보기`, Reels/Group 분리 immutable model, 원본 자산·그룹 규칙 context gate, desktop/mobile preset, `npm test` 183/183 PASS (`2026-08-22`) |
| Instagram | 완료 | `원고 | Reels 미리보기`, cover/caption 42자·readiness 분리 immutable model, 390px·320px browser QA, `npm test` 187/187 PASS (`2026-08-22`) |
| YouTube Shorts | 완료 | `원고 | Shorts 미리보기`, title 100자·description 5,000자·3개 이상 shot 자막·세로 asset/권리 readiness 분리 immutable model, desktop/390px/320px browser QA, `npm test` 191/191 PASS (`2026-08-22`) |
| TikTok | 완료 | 생성 채널을 늘리지 않는 session-only `Preview Lab`, caption·cover·visibility·원본/워터마크 local check, 새로고침 초기화, desktop/390px/320px browser QA, `npm test` 195/195 PASS (`2026-08-22`) |
| Product Hunt | 완료 | `원고 | Launch 미리보기`, name/tagline 60자/description 260자/first comment와 product URL 후보·pricing·topic·Maker·gallery readiness 분리, actual launch/vote/rank/review 없음, desktop/390px/320px browser QA, `npm test` 199/199 PASS (`2026-08-22`) |
| Peerlist | 완료 | `원고 | Launch 미리보기`, 개인 profile·Verified·프로젝트 100%·cover·demo·launch day를 분리한 local proof sheet, upvote 요청 경고, desktop/390px/320px QA, `npm test` 203/203 PASS (`2026-08-22`) |
| Disquiet | 완료 | `원고 | 제품·포스트 미리보기`, 제품명·태그라인·공개 링크와 연결 포스트 분리, 본인 제품·등록/검토 요청·검토 승인 확인을 local gate로 표시, desktop/390px/320px QA, `npm test` 207/207 PASS (`2026-08-22`) |
| Reddit | 완료 | `사실 자료 | 직접 작성 미리보기`, facts와 session-only title/body·post type·NSFW/spoiler 분리, subreddit·규칙 URL/확인일·flair local gate, 외부 제출 0, desktop/390px/320px QA, `npm test` 212/212 PASS (`2026-08-22`) |
| Indie Hackers | 완료 | `원고 | 토론 초안 미리보기`, title/body와 lived-experience input·1인칭 귀속 경고 분리, 외부 등록 0, desktop/390px/320px QA, `npm test` 216/216 PASS (`2026-08-22`) |
| DEV | 완료 | `사실 자료 | article 준비 미리보기`, reference facts와 session-only title/tags/body/disclosure 분리, 실제 사례·코드·실패·AI 공개 gate, 외부 DEV 요청/게시 0, desktop/390px/320px QA, `npm test` 219/219 PASS (`2026-08-22`) |
| OKKY | 완료 | `원고 | 커뮤니티 글 미리보기`, 기존 한국어 title/body와 session-only 게시 문맥·기존 규칙 확인 gate 분리, 실제 category/계정/댓글/추천/제출 없음, desktop/390px/320px QA, `npm test` 222/222 PASS (`2026-08-22`) |
| GeekNews | 완료 | `원고 | Show 미리보기`, title/body와 고정 `Show` intent·공개 source/demo 후보·가입 기간/Show 유형/반복 등록 규칙/최종 원고 확인을 분리한 local proof sheet, 뉴스 선택·이미지·점수·댓글·등록/API 없음, desktop/390px/320px browser QA, `npm test` 225/225 PASS (`2026-08-22`) |
| Show HN | 완료 | `직접 작성 | 읽기 미리보기`, 생성 원고와 분리한 session-only title/body·source/demo·직접 작성/개인 작업 확인만 투영, 실제 HN UI·계정·투표·댓글·제출/API 없음, desktop/390px/320px browser QA, `npm test` 228/228 PASS (`2026-08-22`) |
| Discord | 완료 | session-only `Discord 메시지 미리보기`, target alias·message·선택 context·@ 후보 확인을 독자적 local proof sheet로 분리, 2,000자/6,000자 진단, 실제 Discord UI·server/user identity·reaction·attachment·전송/API 없음, desktop/390px/320px browser QA, `npm test` 231/231 PASS (`2026-08-22`) |
| Bluesky | 완료 | session-only `Bluesky 짧은 게시문 미리보기`, locale·short text·300 grapheme/UTF-8 진단과 URL/@handle 후보의 수동 확인을 독자적 local proof sheet로 분리, DID/profile/feed/reaction/facet 해석/AT Protocol write 없음, desktop/390px/320px browser QA, `npm test` 234/234 PASS (`2026-08-22`) |
| Mastodon | 완료 | session-only `Mastodon status 미리보기`, instance alias·수동 입력 max characters/URL reserve·visibility·content warning·body/rule 확인을 독자적 local proof sheet로 분리, instance API/auth/account/timeline/reaction/write 없음, desktop/390px/320px browser QA, `npm test` 237/237 PASS (`2026-08-22`) |

# 서비스별 바이럴 게시·자동화 개발 사전조사

검토 기준일: `2026-08-17 KST`  
적용 프로젝트: `Viral Funding Automation MVP`  
자동화 개발 시작 조건: `실제 게시 계정과 개발자 앱 확보 후`

## 1. 문서 목적

이 문서는 계정 확보 이후 각 서비스를 하나씩 자동화할 때 다시 처음부터 조사하지 않도록 다음 정보를 정리한 사전 개발 자료다.

1. 사람이 웹이나 앱에서 게시하는 기본 방법
2. 공식 API로 가능한 게시 범위
3. 계정·개발자 앱·OAuth·권한·심사 요구사항
4. 개발 시작 전에 사용자가 제공해야 할 정보
5. 프로젝트에서 허용할 자동화 수준
6. 공식 API가 없거나 정책 위험이 큰 서비스의 수동 유지 근거

표기 원칙:

- `공식 확인`: 공식 개발자 문서·도움말·정책에서 확인한 내용
- `개발 권장`: 이 프로젝트에서 채택할 보수적인 구현 방향
- `재확인`: 정책·요금·권한·제한이 바뀔 수 있어 실제 계정 확보일에 다시 확인할 값

## 2. 한 줄 결론

현재 1차 프로젝트는 **원고 생성·사람 검토·수동 게시 준비까지 완료**한 상태다. 2차 자동화는 비밀번호나 브라우저 매크로가 아니라 공식 API만 사용하고 다음 흐름으로 채널 하나씩 구현한다.

```text
계정 OAuth 연결
→ 게시 계정·내용·자산 미리보기
→ 사용자 최종 승인
→ 공식 API 한 번 호출
→ 외부 게시 ID·URL·시각 기록
→ 실패하면 수동 게시로 전환
```

첫 실제 자동화 대상은 `Threads 텍스트 승인 게시`다. Reddit·Show HN·GeekNews·Product Hunt·Disquiet·Peerlist·Indie Hackers·OKKY는 수동 게시를 유지한다. DEV는 공식 API를 사용하더라도 `published: false` 비공개 초안까지만 자동화한다.

## 3. 전체 채널 판정표

| 서비스 | 수동 게시 | 공식 쓰기 수단 | 계정 확보 후 권장 수준 | 핵심 차단 조건 |
|---|---|---|---|---|
| Threads | 가능 | 공식 API | 사용자 승인 텍스트 게시 | Meta App·OAuth·게시 권한 |
| X | 가능·웹 예약 가능 | 공식 API | 비용 확인 후 승인 게시 | Developer App·OAuth PKCE·사용량 비용 |
| LinkedIn | 가능·웹 예약 가능 | 공식 Posts API | 개인 계정 승인 게시 | Developer App·제품 권한·버전 헤더 |
| Facebook Page | 가능·Business Suite 예약 | Graph API | Page 텍스트 승인 게시 | Page 권한·Page Token·앱 심사 |
| Facebook Groups | 가능 | 범용 자동화 제외 | 수동 유지 | 그룹별 규칙·자기홍보 허용 |
| Instagram | 미디어+캡션 | 공식 Content Publishing API | 이미지 1개 승인 게시부터 | Professional 계정·게시 권한·미디어 |
| Product Hunt | 웹 Draft·예약 | Launch write API 미확인 | 수동 Create Draft | 개인 계정·자산·영문·미리보기 |
| Peerlist | 웹 Launchpad·예약 | 공개 write API 미확인 | 수동 유지 | 인증 개인 프로필·프로젝트 100% |
| Indie Hackers | 가능 | 공개 write API 미확인 | 수동 유지 | 실제 제작 경험·커뮤니티 가치 |
| OKKY | 가능 | 공개 write API 미확인 | 수동 유지 | 카테고리·운영정책·반복 홍보 금지 |
| Reddit | 가능 | 승인형 Data API | 수동 유지 | API 승인·OAuth·서브레딧별 규칙 |
| Show HN | 가능 | 공식 write API 없음 | 사람 직접 작성·수동 제출 | LLM 생성·편집 문장 사용 금지 |
| GeekNews Show | 가능 | 공개 write API 미확인 | 수동 Show 등록 | 가입 1주·중복·대량 자동화 금지 |
| Disquiet | 제품 연결 포스트 | 공개 write API 미확인 | 수동 유지 | 제품 선등록·실제 폼 재확인 |
| DEV / Forem | 웹 Draft·Publish·Schedule | 공식 Articles API | 비공개 초안까지만 | API key·기술 사례·AI 사용 공개 |
| YouTube Shorts | 가능 | YouTube Data API | private/unlisted 업로드 후 승인 | Google OAuth·영상·처리 상태 |
| TikTok | 가능 | Content Posting API | Draft Upload 우선 | 앱 등록·scope 승인·감사·도메인 |
| Discord | 가능 | Incoming Webhook | 허가받은 채널 승인 게시 | 서버 소유·관리자 허가·Webhook 비밀 |
| Bluesky | 가능 | AT Protocol | 텍스트 승인 게시 | AT OAuth 또는 단일 계정 App Password |
| Mastodon | 가능 | 인스턴스 REST API | 승인 게시 후 네이티브 예약 | 인스턴스 URL·앱 등록·OAuth |

## 4. 모든 서비스에 공통으로 받아야 할 정보

### 4.1 계정 정보

| 필드 | 예시·설명 |
|---|---|
| `channel` | `threads`, `x`, `linkedin` 등 고정 식별자 |
| `accountType` | 개인, Page, Professional, Organization 등 |
| `accountHandle` | 외부 사용자명 또는 Page 이름 |
| `profileUrl` | 사람이 확인할 공개 프로필 URL |
| `owner` | 계정 연결과 게시를 최종 승인할 사람 |
| `locale` | `ko-KR`, `en-US` 등 게시 언어 |
| `timezone` | 기본값 `Asia/Seoul` |
| `postingMode` | `manualOnly`, `draftOnly`, `approvalPublish`, `scheduled` |

### 4.2 개발자 앱·OAuth 정보

- 앱 소유 주체: 개인 또는 법인/조직
- 개발자 앱 ID와 앱 상태: 개발, 테스트, Live
- HTTPS Callback/Redirect URI
- 개인정보처리방침 URL
- 이용약관 URL이 요구되는 서비스는 해당 URL
- 승인된 OAuth scope 목록
- App Review·API access·audit 상태
- 테스트 계정과 실제 운영 계정 구분
- 토큰 만료·갱신 방식

`client secret`, access token, refresh token, webhook token은 Markdown·Git·브라우저 `localStorage`에 저장하지 않는다. 서버 환경변수, OS Keychain 또는 암호화된 서버 저장소만 사용한다.

### 4.3 콘텐츠·자산 정보

- 제목, 본문, 첫 댓글, 링크, 태그·Topic·Flair
- 대표 이미지와 영상의 원본 파일
- 외부 API가 읽을 수 있는 공개 HTTPS 미디어 URL 또는 직접 업로드 파일
- 이미지 대체 텍스트
- 영상 제목·설명·공개 범위·음원 권리
- 채널별 최종 문구와 자산 hash
- 게시 대상: Page, Subreddit, Group, Category, Instance, Discord Channel 등

### 4.4 게시 안전 정보

- 최종 승인자와 승인 시각
- 승인할 때 본 계정·전체 문구·자산 snapshot
- 중복 방지 ID: `account + channel + contentHash + assetHash`
- 최대 재시도 횟수와 재시도 가능한 오류 범위
- `401`, `403`, `429` 발생 시 자동 중단
- 외부 게시 ID, permalink, 게시 시각, 응답 상태
- 전체 게시 중단 스위치

자동 댓글·자동 DM·좋아요·투표·업보트·대량 그룹 게시는 구현하지 않는다.

## 5. API 자동화 후보 상세

### 5.1 Threads

**수동 게시:** Threads 앱 또는 웹에서 텍스트와 미디어를 작성하고 답글 범위를 확인한 뒤 게시한다.

**공식 확인:**

- API 호스트: `https://graph.threads.net`
- 생성: `POST /me/threads`
- 발행: `POST /me/threads_publish?creation_id={container_id}`
- 텍스트·이미지·영상·캐러셀 지원
- 이미지·영상 URL은 Meta 서버가 접근 가능한 공개 URL이어야 함
- 게시 ID를 받은 뒤 `permalink` 조회 가능
- 권한: `threads_basic`, `threads_content_publish`
- 게시 가능량은 고정값을 코드에 넣지 않고 `/me/threads_publishing_limit`으로 확인

**필요 정보:** Meta Developer App ID, Threads use case, redirect URI, 실제 Threads 계정, 승인 scope, 토큰 갱신 정보, 게시할 계정 ID.

**개발 권장:** 첫 버전은 텍스트 1개만 `미리보기 → 승인 → 게시 → permalink 저장`한다. `auto_publish_text`와 자체 예약 큐는 첫 버전에서 사용하지 않는다.

공식 자료:

- https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api

### 5.2 X

**수동 게시:** 일반 게시물은 280자이며 웹 작성 화면에서 초안 저장과 예약을 사용할 수 있다.

**공식 확인:**

- 게시: `POST https://api.x.com/2/tweets`
- 미디어: `POST https://api.x.com/2/media/upload`
- 스레드는 이전 게시 ID에 답글을 순서대로 생성
- OAuth 2.0 Authorization Code with PKCE
- 기본 scope: `tweet.read`, `tweet.write`, `users.read`
- 미디어: `media.write`
- 장기 연결: `offline.access`
- API 사용량 비용과 할당량이 있으므로 개발 시작일 Console 재확인 필요

**필요 정보:** X Developer Project/App, client ID, redirect URI, 승인 scope, 요금·크레딧 허용 범위, 계정 username.

**개발 권장:** 단일 텍스트 승인 게시부터 시작한다. 스레드는 각 구간의 성공 ID를 받은 다음 구간에만 사용하며 중간 실패 시 자동 재개하지 않는다.

공식 자료:

- https://docs.x.com/x-api/posts/create-post
- https://docs.x.com/x-api/media/upload-media
- https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
- https://help.x.com/en/using-x/how-to-post

### 5.3 LinkedIn

**수동 게시:** 개인과 Page 모두 작성 화면에서 게시할 수 있고 공식 도움말이 웹 예약을 안내한다.

**공식 확인:**

- 게시: `POST https://api.linkedin.com/rest/posts`
- 텍스트·이미지·영상·문서·기사 링크·다중 이미지 지원
- 이미지와 영상은 해당 업로드 API에서 URN을 먼저 받아야 함
- 헤더: `Linkedin-Version: YYYYMM`, `X-Restli-Protocol-Version: 2.0.0`
- 개인 계정: `Share on LinkedIn` 제품과 `w_member_social`
- 조직 Page: `w_organization_social`과 Page 역할 필요
- 조직·고급 Community Management 사용은 별도 심사 조건을 개발 시작일 다시 확인

**필요 정보:** Developer App, 개인/조직 구분, member URN 또는 organization URN, Page 역할, 승인 scope, 버전 헤더 기준월.

**개발 권장:** 개인 계정 텍스트 승인 게시부터 시작한다. 조직 Page와 미디어는 별도 단계로 분리한다.

공식 자료:

- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-04
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- https://www.linkedin.com/help/linkedin/answer/a1347212/schedule-posts?lang=en

### 5.4 Facebook Page

**수동 게시:** Page로 전환한 뒤 Meta Business Suite에서 텍스트·링크·미디어를 작성하고 초안·즉시 게시·예약을 선택한다.

**공식 확인:**

- Page와 Page Access Token: `GET /me/accounts`
- 텍스트·링크: `POST /{page-id}/feed`
- 사진: `POST /{page-id}/photos`
- 영상: `POST /{page-id}/videos`
- Reels는 업로드 세션·파일 업로드·처리 확인·발행이 분리됨
- 일반 권한 후보: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- 다른 사용자의 Page 연결은 Advanced Access와 App Review가 필요할 수 있음

**필요 정보:** Facebook Page ID, Page 관리자 계정, Page 역할, Meta App, 승인 권한, Page Access Token 발급·갱신 방식.

**개발 권장:** 개인 프로필과 Groups는 자동화하지 않는다. Page 텍스트 승인 게시를 먼저 하고 Reels는 영상 파이프라인 단계에서 별도 개발한다.

공식 자료:

- https://developers.facebook.com/docs/graph-api/reference/page/feed/
- https://www.facebook.com/help/www/181155025579876?locale=en_GB
- https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api

### 5.5 Instagram

**수동 게시:** 텍스트 단독 게시가 아니라 사진·영상·Reel에 캡션을 붙여 게시한다.

**공식 확인:**

- 컨테이너: `POST /{ig-user-id}/media`
- 처리 확인: `GET /{container-id}?fields=status_code,status`
- 발행: `POST /{ig-user-id}/media_publish`
- 이미지·영상·Reel·Stories·캐러셀 지원 범위는 계정·API 방식에 따라 확인
- 계정은 Business 또는 Creator Professional 계정
- Instagram Login 권한 후보: `instagram_business_basic`, `instagram_business_content_publish`
- Facebook Login 방식은 `instagram_basic`, `instagram_content_publish`와 Page 관련 권한 필요

**필요 정보:** Professional 계정 ID, Instagram Login/Facebook Login 선택, Meta App, 승인 scope, 공개 미디어 URL 또는 업로드 방식, 캡션, 대체 텍스트.

**개발 권장:** 이미지 1개+캡션 승인 게시부터 시작한다. 텍스트만 있으면 게시 버튼을 활성화하지 않는다. Reel은 처리 상태 polling과 실패 영수증을 추가한 뒤 진행한다.

공식 자료:

- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- https://github.com/fbsamples/reels_publishing_apis/blob/main/insta_reels_publishing_api_sample/README.md
- https://www.facebook.com/help/instagram/138925576505882

### 5.6 Bluesky

**수동 게시:** 텍스트·이미지·영상을 작성한다. 링크·멘션·태그는 rich-text facet으로 처리된다.

**공식 확인:**

- SDK: `@atproto/api`
- 레코드: `app.bsky.feed.post`
- 생성: `POST /xrpc/com.atproto.repo.createRecord`
- 이미지: `com.atproto.repo.uploadBlob` 후 embed
- 결과: AT URI와 CID
- 공개 서비스는 AT Protocol OAuth 권장
- 단일 소유 계정의 로컬 테스트는 별도 App Password 사용 가능

**필요 정보:** handle, DID/PDS 정보, OAuth client metadata URL 또는 App Password 방식, 게시 언어, 이미지 alt text.

**개발 권장:** 로컬 단일 계정은 게시 전용 App Password로 검증할 수 있지만 서버 측 비밀로만 저장한다. 여러 사용자를 받는 순간 OAuth로 전환한다.

공식 자료:

- https://docs.bsky.app/docs/advanced-guides/posts
- https://docs.bsky.app/docs/advanced-guides/oauth-client
- https://docs.bsky.app/docs/advanced-guides/post-richtext

### 5.7 Mastodon

**수동 게시:** 가입한 인스턴스에서 텍스트·미디어·대체 텍스트·공개 범위·Content Warning을 정해 게시한다. 글자 수와 규칙은 인스턴스마다 다를 수 있다.

**공식 확인:**

- 게시: `POST /api/v1/statuses`
- 미디어: `POST /api/v2/media`
- 예약: `scheduled_at`, 최소 5분 이후
- 중복 방지: `Idempotency-Key`
- 앱 등록: `POST /api/v1/apps`
- scope: `write:statuses`, 미디어 `write:media`, 예약 조회 `read:statuses`

**필요 정보:** 인스턴스 URL, 계정 handle, 인스턴스 앱 ID·secret, OAuth redirect URI, 공개 범위, Content Warning, 언어.

**개발 권장:** 승인 게시를 먼저 검증하고 이후 자체 예약 큐보다 Mastodon 네이티브 예약을 사용한다.

공식 자료:

- https://docs.joinmastodon.org/methods/statuses/
- https://docs.joinmastodon.org/methods/media/
- https://docs.joinmastodon.org/user/posting/

### 5.8 Discord

**수동 게시:** 서버와 채널 규칙을 확인하고 메시지·파일을 직접 전송한다.

**공식 확인:**

- Webhook: `POST /webhooks/{webhook.id}/{webhook.token}`
- `content`, 파일, embed 등을 보낼 수 있음
- `wait=true`로 Message 객체 수신 가능
- 한 방향 게시만 필요하면 Bot과 Gateway가 필요하지 않음

**필요 정보:** 본인 소유 또는 관리자에게 명시 허가받은 서버, guild ID, channel ID, Webhook URL, 허용 메시지 유형.

**개발 권장:** 바이럴 대량 전송이 아니라 소유한 테스트 채널의 게시 엔진 검증에만 사용한다. 외부 서버·DM 자동 홍보는 금지한다.

공식 자료:

- https://docs.discord.com/developers/platform/webhooks
- https://docs.discord.com/developers/resources/webhook

### 5.9 DEV / Forem

**수동 게시:** Markdown 글에 제목·본문·설명·최대 4개 태그·대표 이미지·Canonical URL 등을 입력하고 Draft·Publish·Schedule을 선택한다.

**공식 확인:**

- 생성: `POST https://dev.to/api/articles`
- 인증: 사용자 설정에서 만든 API key
- `published: false`로 비공개 초안 생성
- title, body_markdown, description, tags, canonical_url, main_image 등 지원
- AI 보조 글은 보조 사실을 공개하고 작성자가 검증해야 함
- AI 보조 글이 자기 프로그램 홍보·백링크를 주목적으로 해서는 안 됨
- AI 생성 댓글 금지

**필요 정보:** DEV 계정, API key, 작성자 프로필, 글 언어, 태그, 대표 이미지 URL, AI disclosure 문구, 사람 최종 검토자.

**개발 권장:** API는 `published: false`만 허용한다. 실제 발행은 DEV 편집기에서 사람이 기술 사례·코드·실패·트레이드오프를 확인한 뒤 수행한다.

공식 자료:

- https://developers.forem.com/api/
- https://dev.to/p/editor_guide/
- https://dev.to/guidelines-for-ai-assisted-articles-on-dev/

### 5.10 YouTube Shorts

**수동 게시:** 세로 또는 정사각형 영상을 업로드하고 제목·설명·공개 범위·아동용 여부·권리 정보를 확인한다.

**공식 확인:**

- 업로드: YouTube Data API `videos.insert`
- OAuth scope: `https://www.googleapis.com/auth/youtube.upload`
- `public`, `private`, `unlisted` 상태 지정 가능
- 업로드 후 `videos.list`의 `processingDetails.processingStatus`로 처리 결과 확인
- 중단 복구가 필요한 영상은 resumable upload 권장

**필요 정보:** Google Cloud Project, YouTube Data API 활성화, OAuth client, 채널 ID, 영상 파일, 제목·설명·공개 범위, 아동용 여부, 음원·이미지 권리.

**개발 권장:** 첫 업로드는 `private` 또는 `unlisted`로만 올리고 처리 성공과 사람이 확인한 뒤 공개 전환한다.

공식 자료:

- https://developers.google.com/youtube/v3/guides/uploading_a_video
- https://developers.google.com/youtube/v3/docs/videos/insert
- https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol

### 5.11 TikTok

**수동 게시:** 영상 또는 사진을 선택하고 캡션·해시태그·공개 범위·댓글·Duet·Stitch 설정을 확인한 뒤 게시한다.

**공식 확인:**

- Direct Post와 Upload to TikTok Draft 제공
- 앱 등록과 Content Posting API 제품 필요
- Direct Post: `video.publish` 승인·사용자 승인
- Draft Upload: `video.upload` 승인·사용자 승인
- Direct Post 전 Creator Info 조회 필요
- 원격 영상·사진은 검증한 도메인 또는 URL prefix 필요
- 감사를 통과하지 않은 Direct Post 클라이언트는 게시 공개 범위가 private로 제한됨

**필요 정보:** TikTok Developer App, target open ID, access token, 승인 scope, 감사 상태, 검증 도메인, 영상·사진, creator 설정.

**개발 권장:** 처음에는 Upload API로 TikTok 초안함에 보내고 사용자가 TikTok 앱에서 최종 편집·게시한다. Direct Post는 감사 통과 후 별도 단계다.

공식 자료:

- https://developers.tiktok.com/products/content-posting-api
- https://developers.tiktok.com/doc/content-posting-api-get-started/
- https://developers.tiktok.com/doc/content-posting-api-get-started-upload-content

## 6. 수동 유지 채널 상세

### 6.1 Reddit

- 수동 순서: Subreddit 선정 → Rules 확인 → 허용 게시 유형·Flair 확인 → 제목·본문 작성 → 미리보기 → 게시
- 기술적 API: `POST /api/submit`
- 그러나 API 접근 신청·승인, OAuth, 고유 User-Agent가 필요하고 레거시 문서가 오래됐을 수 있음
- 동일·유사 홍보글 대량 게시, 자동 계정, 비요청 DM, 인위적 Karma·노출 증가 금지
- 필요한 정보: 계정 가입일·Karma, Subreddit, 자기홍보 규칙, 허용 유형, Flair ID, 제목 형식, 링크 허용, API 승인 문서
- 프로젝트 판정: API가 있어도 커뮤니티별 맥락이 핵심이므로 수동 유지

공식 자료:

- https://support.reddithelp.com/hc/en-us/articles/360060422572-How-do-I-post-and-comment-on-Reddit
- https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki
- https://www.reddit.com/dev/api#POST_api_submit
- https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam

### 6.2 Product Hunt

- 개인 계정으로 제품 URL, 이름, Tagline, Topics, Thumbnail, 가격·상태, Gallery, 260자 설명, Makers, 첫 댓글을 입력
- `Create Draft` 또는 30일 이내 예약
- Thumbnail 240×240 정사각형, Gallery 1270×760 이미지 2장 이상 권장
- 회사 계정이 아닌 개인 계정 게시 권한 확인
- Product Hunt API는 존재하지만 제품 Launch/Create Draft mutation은 공식 문서에서 확인되지 않음
- 대량 DM·이메일 투표 요청, 보상과 투표 교환, 조직적 투표 금지
- 프로젝트 판정: 자동화하지 않고 공식 웹 Create Draft를 사람이 작성

공식 자료:

- https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- https://help.producthunt.com/en/articles/2724119-how-to-schedule-a-post
- https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post
- https://api.producthunt.com/v2/docs

### 6.3 Show HN

- 제목은 `Show HN:`으로 시작하고 다른 사람이 바로 체험할 수 있는 직접 만든 프로젝트여야 함
- 공개 write API는 확인되지 않음
- 2026년 운영자 안내에 따라 제출 문장은 작성자가 직접 써야 하며 LLM 생성·편집·윤문을 사용하지 않음
- 친구·사용자에게 업보트·댓글을 요청하지 않음
- 이 프로젝트는 생성 제목·본문을 만들지 않고 사실 체크리스트만 제공

공식 자료:

- https://news.ycombinator.com/showhn.html
- https://news.ycombinator.com/newsguidelines.html
- https://news.ycombinator.com/item?id=22336638
- https://github.com/HackerNews/API

### 6.4 GeekNews Show

- 가입 후 글 등록까지 1주 필요
- 본인 프로젝트는 일반 뉴스가 아니라 `Show`
- Show 선택 시 `Show GN:` 접두사는 서비스가 처리
- 이미지 본문 미지원
- 로그인 없는 체험, 제작 동기·차이·기술·한계, 비마케팅 문체 권장
- 대량 AI 요약·SEO형 콘텐츠, 반복 홍보, 짧은 기간 유사 글, 과도한 자동화 접근 금지
- 공개 write API 미확인, 수동 유지

공식 자료:

- https://news.hada.io/guidelines
- https://news.hada.io/terms

### 6.5 Disquiet

- 본인이 만든 제품을 먼저 등록하고 제품에 연결된 포스트 작성
- Relate/Disquiet 개인 계정, 제품 등록 폼, 대표 이미지, 팀원 정보 필요
- 현재 폼의 전체 필드는 공개 문서로 확정할 수 없어 계정 확보 후 실제 UI 재기록
- 공개 write API 미확인, 수동 유지

공식 자료:

- https://disquiet.io/announcement

### 6.6 Peerlist Launchpad

- 인증 개인 프로필 필요
- `Work` 프로젝트 필수 항목을 채워 100% 완성
- 제품명, Tagline, Cover, Demo link 등 확인
- 월요일 공개 또는 미리 예약
- 모르는 사용자에게 업보트 DM, 무관한 글·댓글 링크 반복 금지
- 공개 write API 미확인, 수동 유지

공식 자료:

- https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad
- https://help.peerlist.io/individual/launchpad/guidelines-faqs

### 6.7 Indie Hackers

- 독자가 겪는 문제부터 시작하고 본문 안에서 실제 배움과 맥락을 제공
- 링크 발표보다 구체적인 질문과 토론을 중심으로 작성
- 실제 제작 계기·어려운 결정·실패한 접근은 작성자가 직접 입력
- 공개 write API 미확인, 수동 유지

참고 자료:

- https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd
- https://www.indiehackers.com/post/how-to-sell-in-communities-without-getting-banned-ee5c766673

### 6.8 OKKY

- 게시 시점에 `피드백`, `AI` 등 실제 카테고리와 규칙 확인
- 단순 외부 링크, 유사 글 반복, 게시판 목적과 맞지 않는 홍보 제한
- 같은 글을 여러 토픽에 반복하지 않음
- 공개 write API 미확인, 수동 유지

공식 자료:

- https://okky.kr/policies/operation-policy
- https://okky.kr/articles/1518586
- https://okky.kr/articles/1547050

### 6.9 Facebook Groups

- 그룹 관리자가 허용한 자기홍보 채널에서만 수동 게시
- 동일 문구를 여러 그룹에 반복 게시하지 않음
- 개인 프로필 로그인 자동화와 그룹 대량 게시 기능은 만들지 않음

## 7. 계정 확보 체크리스트

### 공통

- [ ] 게시에 사용할 실제 개인·Page·Professional 계정 확정
- [ ] 계정 소유자가 OAuth와 게시를 승인할 수 있음
- [ ] 공개 프로필 URL과 계정 유형 기록
- [ ] Developer App 소유 주체 확정
- [ ] HTTPS redirect URI 준비
- [ ] 개인정보처리방침 URL 준비
- [ ] 필요한 서비스의 이용약관 URL 준비
- [ ] 실제 scope와 App Review 상태 캡처
- [ ] 대표 이미지·영상·대체 텍스트 준비
- [ ] 토큰 서버 저장 방식 결정
- [ ] 테스트 계정과 운영 계정 분리
- [ ] 게시 실패·재시도·중복 방지 정책 결정

### 서비스별 추가

| 서비스 | 추가로 확보할 값 |
|---|---|
| Threads | Threads 계정 ID, Meta App, `threads_basic`, `threads_content_publish` |
| X | Developer Project/App, 비용 한도, PKCE scope |
| LinkedIn | member/org URN, Page 역할, API 버전 |
| Facebook Page | Page ID, Page 역할, Page Access Token 발급 경로 |
| Instagram | Professional IG User ID, Login 방식, media host |
| Bluesky | handle·DID, OAuth metadata 또는 게시 전용 App Password |
| Mastodon | 인스턴스 URL, app registration, 공개 범위 |
| Discord | 허가 서버·channel ID·Webhook URL |
| DEV | API key, `published:false`, AI disclosure |
| YouTube | Cloud Project, 채널 ID, `youtube.upload`, 영상 권리 |
| TikTok | App, open ID, `video.upload`/`video.publish`, audit·도메인 |
| Reddit | 계정 이력, Subreddit, Flair, API 승인 여부 |
| Product Hunt | 개인 Maker 계정, Topic, Thumbnail, Gallery |
| Peerlist | 인증 개인 프로필, 100% project, 월요일 일정 |
| Disquiet | Relate 계정, 제품 등록 폼, 연결 포스트 권한 |
| GeekNews | 가입 1주, 중복 검색, Show 등록 권한 |
| OKKY | 카테고리, 자기홍보 허용 여부 |

## 8. 2차 개발 순서

| 순서 | 한 번에 구현할 범위 | 완료 기준 |
|---:|---|---|
| 1 | 공통 승인·영수증 최소 골격 | 계정·문구·자산 snapshot, 중복 차단, 수동 fallback |
| 2 | Threads 텍스트 승인 게시 | OAuth, 미리보기, 1회 게시, permalink, 오류 처리 |
| 3 | Bluesky 텍스트 승인 게시 | facet·결과 AT URI·중복 차단 |
| 4 | Mastodon 텍스트 승인 게시 | 인스턴스 OAuth·Idempotency-Key·URL |
| 5 | X 단일 텍스트 승인 게시 | 비용 확인·PKCE·post ID·280자 검증 |
| 6 | LinkedIn 개인 텍스트 승인 게시 | `w_member_social`, 버전 헤더, Post URN |
| 7 | DEV 비공개 초안 저장 | `published:false`, 편집기 URL, AI disclosure 체크 |
| 8 | Facebook Page 텍스트 승인 게시 | Page ID·Token·permalink |
| 9 | Instagram 이미지 승인 게시 | media container·처리 상태·permalink |
| 10 | YouTube private/unlisted 업로드 | resumable upload·processing 성공 |
| 11 | TikTok Draft Upload | `video.upload`, TikTok 앱 최종 게시 handoff |

각 채널은 다음 조건을 모두 통과한 뒤에만 다음 채널로 넘어간다.

- 테스트 계정 또는 삭제 가능한 검증 게시 성공
- 동일 요청 중복 게시 차단
- 토큰 만료·재연결 안내
- `401/403/429`에서 자동 중단
- 게시 ID·URL·KST/UTC 시각 저장
- API 실패 시 기존 작업본 복사·수동 게시 가능
- 비밀정보가 로그·브라우저·Git diff에 없음

## 9. 개발 시작일 재확인 항목

다음은 고정 사실로 코드에 넣지 않는다.

- API 요금과 무료 크레딧
- App Review·audit·access 신청 절차
- scope 이름과 Advanced Access 조건
- rate limit 숫자
- 미디어 규격과 계정당 게시 제한
- 예약 가능한 기간
- Product Hunt·Peerlist·Disquiet·OKKY의 라이브 폼 필드
- Reddit의 승인 정책과 대상 Subreddit 규칙
- Threads·Meta Graph API 버전
- LinkedIn API 버전 헤더

## 10. 공식 자료 인덱스

문서 본문에 직접 연결한 링크가 정본이다. 구현을 시작할 때 이 인덱스와 각 Developer Console의 현재 상태를 함께 확인한다.

- Threads: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- X: https://docs.x.com/x-api/posts/create-post
- LinkedIn: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-04
- Facebook: https://developers.facebook.com/docs/graph-api/reference/page/feed/
- Instagram: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- Bluesky: https://docs.bsky.app/docs/advanced-guides/posts
- Mastodon: https://docs.joinmastodon.org/methods/statuses/
- Discord: https://docs.discord.com/developers/resources/webhook
- DEV: https://developers.forem.com/api/
- YouTube: https://developers.google.com/youtube/v3/guides/uploading_a_video
- TikTok: https://developers.tiktok.com/products/content-posting-api
- Reddit: https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki
- Product Hunt: https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- Show HN: https://news.ycombinator.com/showhn.html
- GeekNews: https://news.hada.io/guidelines
- Disquiet: https://disquiet.io/announcement
- Peerlist: https://help.peerlist.io/individual/launchpad/how-to-launch-a-project-on-peerlist-launchpad
- Indie Hackers: https://www.indiehackers.com/post/how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd
- OKKY: https://okky.kr/policies/operation-policy

## 11. 최종 전문가 판정

1. 공식 API가 있다고 해서 무인 게시가 적합한 것은 아니다.
2. 첫 구현은 항상 `사용자 승인 게시`이고 예약과 다중 채널 캠페인은 후속이다.
3. 외부 커뮤니티는 기술보다 계정 이력과 맥락이 중요하므로 수동 유지가 더 안전하다.
4. Show HN은 생성·교정 문구 자체를 제공하지 않는다.
5. DEV는 자동 공개가 아니라 비공개 초안 handoff만 구현한다.
6. 계정과 Developer App을 확보하기 전 추가 자동화 코드를 작성할 필요는 없다.

# 플랫폼 계정·권한 readiness 입력 템플릿

이 문서는 실제 자동 게시 구현 전에 사람이 확인할 외부 조건을 정리하기 위한 템플릿이다. 앱의 **계정·권한·자산 readiness** 화면에도 같은 정보만 입력한다.

## 절대 기록하지 않는 정보

- access token, refresh token, client secret, API key, 비밀번호
- 개인 홈 경로, 브라우저 cookie, OAuth Proxy credential
- 원고 전문이나 원본 자산 파일

인증 비밀값은 이후 별도 승인된 OS Keychain 또는 credential vault에만 보관한다. 이 프로젝트의 현재 화면과 localStorage에는 넣지 않는다. Phase 4 local rehearsal은 비밀값이 아닌 opaque vault reference만 브라우저 세션 메모리에서 사용하며 새로고침·채널 이동 시 제거한다.

## 공통 입력

| 항목 | 기록할 값 | 확인 기준 |
|---|---|---|
| 플랫폼 / 채널 |  | 원고 탭과 일치 |
| 계정 유형 |  | 개인·조직·Page·Professional·Channel 등 플랫폼 허용 유형 |
| 공개 profile/Page/channel ID |  | 공개 식별자만 |
| 게시 대상 ID / 유형 |  | 실제 게시 대상과 일치 |
| 공개 handle / profile URL |  | HTTPS 공개 주소 |
| 계정 책임자 |  | 실제 소유자 또는 운영 책임자 |
| timezone / 게시 언어 |  | IANA timezone, 선택 원고 locale과 일치 |
| 공식 policy URL / 확인일 |  | 직접 확인한 공식 문서, 30일 내 |

## Developer App·권한

| 항목 | 기록할 값 | 확인 기준 |
|---|---|---|
| Developer App 준비 |  | 앱 생성·승인 상태를 사람 확인 |
| 공개 App ID |  | 비밀값이 아닌 식별자만 |
| 등록 redirect URI |  | 실제 등록값, loopback 허용 여부 포함 |
| 승인 scope |  | 플랫폼 콘솔에서 확인한 scope 이름 |
| external credential vault 준비 |  | vault 위치가 준비됐다는 확인만 기록 |
| opaque credential reference |  | `vault-ref-...` 같은 비밀이 아닌 식별자. Markdown/localStorage 저장 금지 |

## 자산 readiness

| 항목 | 기록할 값 | 확인 기준 |
|---|---|---|
| SHA-256 |  | 로컬 파일에서 계산한 hash |
| MIME type / bytes / width × height |  | 파일 메타데이터 |
| 대체 텍스트 |  | 3자 이상 접근성 설명 |
| 권리 확인 |  | 제작·라이선스·사용 허가 확인 |
| 공개 HTTPS URL |  | 플랫폼이 요구하는 경우에만 |

파일 원본과 로컬 경로는 기록·업로드하지 않는다. Threads 같은 텍스트-only 후보는 asset 없이도 account/app/policy readiness를 확인할 수 있다. Instagram·YouTube Shorts·TikTok 등 자산 채널은 검증된 자산 없이는 blocked로 유지한다.

## 수동 채널

Reddit, Show HN, GeekNews, Disquiet, Product Hunt, Peerlist, Indie Hackers, OKKY 및 Facebook Group은 connector 대상이 아니다. 기존 원고 탭의 subreddit/group/category/flair/product registration 등 operation gate를 직접 확인하고, 실제 등록은 사람이 한다.

## 다음 단계 조건

Threads만 다음 조건이 모두 맞을 때 Phase 4 **local dry-run rehearsal**로 이동한다.

- 승인 snapshot이 현재 원고·언어·계정·자산 상태와 일치한다.
- 계정 책임자, 공식 정책 확인일, Developer App, 필요한 scope, external credential vault 준비가 기록됐다.
- 텍스트-only 조건 또는 필요한 자산 hash·권리 확인이 통과했다.
- dry-run은 payload와 예상 receipt만 만들며 실제 플랫폼 POST, 업로드, 게시, 예약을 호출하지 않는다.
- 사용자가 실제 게시 잠금(kill switch)을 유지하고 opaque credential reference를 세션에 입력한다.
- evidence JSON은 원고 전문과 credential reference를 제외하고 `networkWriteCount: 0`만 증명한다.

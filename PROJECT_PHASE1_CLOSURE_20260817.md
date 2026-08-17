# 프로젝트 1차 종료 보고서

종료 기준일: `2026-08-17 KST`  
프로젝트: `Viral Funding Automation MVP`  
1차 상태: `COMPLETE`

## 1. 1차 목표와 완료 범위

1차 목표는 공개 GitHub 저장소 URL 하나를 분석해 채널별 수동 게시 작업본을 만들고, 실제 계정 연결 전에 필요한 게시·자동화 조건을 확정하는 것이었다.

완료한 범위:

- 공개 GitHub README·라이선스·metadata·선택적 `package.json` 분석
- 19개 외부 서비스의 상태와 운영 게이트 표시
- 채널 작업본 18종과 호환 파일을 포함한 생성 파일 24개 출력
- 채널별 편집·작업본 복사·Markdown 다운로드
- X 가중 문자 검사와 `HOLD` 작업본 복사 차단
- 기술 스택, GitHub Topics, 실행 요구사항, 제품 한계, 공개 데모 경계 분리
- 소셜 API·커뮤니티 정책·콘텐츠 적합성 전문가 검토
- 서비스별 수동 게시 방법·공식 자동화 범위·계정 준비사항 문서화
- `memory_node_graph` 실제 1턴 생성과 채널별 최종 교정 원고팩 작성

## 2. 핵심 산출물

| 문서·경로 | 용도 |
|---|---|
| `reviews/automation/PUBLISHING_AUTOMATION_PREFLIGHT_20260817.md` | 19개 서비스의 수동 게시·공식 API·OAuth·권한·계정·자산 요구사항 |
| `reviews/final_channel_copy_validation_20260817.md` | 18개 생성 원고의 사실성·정책·채널 적합성 최종 판정 |
| `campaigns/memory_node_graph/2026-08-first-launch/final/verified-channel-copy-pack.md` | 채널별 최종 교정 문구와 HOLD 기준 |
| `campaigns/memory_node_graph/2026-08-first-launch/final/geeknews-show.md` | GeekNews 조건부 최종본 |
| `campaigns/memory_node_graph/2026-08-first-launch/final/product-hunt-launch.md` | Product Hunt 조건부 영문 최종본 |
| `campaigns/memory_node_graph/2026-08-first-launch/generated/` | 실제 API 결과와 자동 분석 작업본 |
| `output/memory_node_graph/` | CLI로 재생성한 최신 출력 24개 |

## 3. 콘텐츠 최종 판정

| 상태 | 채널 |
|---|---|
| 조건 확인 후 사용 가능 | X, Threads, LinkedIn, Disquiet, Facebook Reels, Instagram Reels, OKKY, GeekNews, YouTube Shorts |
| 별도 검토된 최종본 사용 | Product Hunt, GeekNews |
| 작성자·계정 정보 전에는 HOLD | Reddit, Peerlist, Indie Hackers, DEV, Facebook Groups |
| 생성·교정 원고 사용 금지 | Show HN |

`조건 확인 후 사용 가능`은 노출이나 성과를 보장한다는 뜻이 아니다. 확인된 프로젝트 사실을 사용하고 채널 형식·정책에 맞게 교정했다는 뜻이다.

특히 Show HN은 운영자 지침에 따라 LLM이 생성·편집·윤문한 제목과 본문을 제공하지 않는다. DEV는 README 홍보문이 아니라 작성자의 실제 코드·설계 선택·실패 경험과 AI 보조 공개가 포함된 기술 사례가 필요하다.

## 4. 검증 결과

| 검증 | 결과 |
|---|---|
| 자동 테스트 | `29/29 PASS` |
| JavaScript 문법 검사 | `PASS` |
| CLI 실제 생성 | 생성 파일 `24개` 확인 |
| `/api/generate` 실제 1턴 | HTTP `200`, 원고 `18종` 확인 |
| 웹 GUI 실제 1턴 | 채널 상태 `19개`, 원고 탭 `18개` 확인 |
| HOLD 안전장치 | Reddit·Show HN 등 복사 비활성화 확인 |
| Show HN 작업본 | 생성 제목·본문 없음 확인 |
| 브라우저 콘솔 | 오류 `0`, 경고 `0` |
| 공개 저장소·데모 | Public 저장소와 데모 HTTP `200` 확인 |

## 5. 1차에서 하지 않은 일

- 외부 서비스 로그인·OAuth 연결
- Developer App 생성·심사 신청
- 외부 API 쓰기 또는 실제 게시
- 자동 댓글·DM·좋아요·업보트·다중 그룹 게시
- 계정 비밀번호 저장 또는 브라우저 DOM 매크로 게시
- 예약 큐·성과 분석·다중 계정 운영

이는 미완성 코드가 아니라 계정과 권한을 확보한 뒤 진행하도록 의도적으로 남긴 2차 범위다.

## 6. 계정 확보 후 재개 조건

개발을 다시 시작할 때 채널마다 다음 정보를 먼저 확보한다.

- 실제 게시 계정, 계정 유형, 공개 프로필 URL, 최종 승인자
- Developer App ID, HTTPS redirect URI, 승인 scope, App Review 상태
- 개인정보처리방침·이용약관 URL이 필요한 경우 해당 URL
- 대표 이미지·영상·대체 텍스트와 사용 권리
- 게시 언어, 시간대, 게시 대상 Page·Subreddit·Category·Instance
- 토큰의 서버 측 보관 방식
- 중복 차단, 실패 중단, 재시도, 게시 결과 기록 기준

상세 서비스별 값은 `reviews/automation/PUBLISHING_AUTOMATION_PREFLIGHT_20260817.md`를 정본으로 사용한다. API 정책·요금·scope·rate limit은 개발 재개일에 공식 문서와 Developer Console에서 다시 확인한다.

## 7. 2차 개발 순서

| 순서 | 범위 |
|---:|---|
| 1 | 공통 미리보기·최종 승인·중복 방지·게시 영수증 최소 골격 |
| 2 | Threads 텍스트 승인 게시 |
| 3 | Bluesky 텍스트 승인 게시 |
| 4 | Mastodon 텍스트 승인 게시·공식 예약 |
| 5 | X 단일 텍스트 승인 게시 |
| 6 | LinkedIn 개인 텍스트 승인 게시 |
| 7 | DEV 비공개 초안 저장 |
| 8 | Facebook Page 텍스트 승인 게시 |
| 9 | Instagram 이미지 승인 게시 |
| 10 | YouTube private/unlisted 업로드 |
| 11 | TikTok Draft Upload |

각 채널은 `미리보기 → 사용자 최종 승인 → 공식 API 1회 호출 → 외부 ID·URL 기록`까지만 먼저 구현한다. 한 채널의 테스트 게시·중복 차단·오류 처리가 끝난 뒤 다음 채널로 진행한다.

## 8. 종료 판정

- 계정 확보 전 필요한 MVP 개발: `완료`
- 서비스별 자동화 사전정보 수집: `완료`
- 현재 생성 원고의 사실·정책 교정: `완료`
- 실제 외부 게시: `미실행`
- 다음 재개 시점: `첫 자동화 대상 계정과 Developer App 확보 후`

따라서 이 프로젝트는 **수동 게시 준비 MVP 기준으로 1차 종료**한다.

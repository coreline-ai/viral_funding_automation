# 소셜 자동 게시 Go/No-Go 체크리스트

작성일: `2026-08-21 KST`

## 현재 판정

- 판정: `NO_GO_PENDING_EXTERNAL_INPUTS`
- 내부 사전 준비: 완료
- 외부 계정·App·credential 환경 입력: 후순위
- 실제 게시·업로드·예약 capability: `false`
- live social write route: `0`

현재 구현의 종료점은 승인 snapshot, 계정·권한·자산 readiness, 중복 방지, connector local dry-run, safe receipt/evidence다. 이 문서는 실제 게시 기능을 추가하지 않는다.

## 다음 별도 개발의 최대 허용 범위

- 플랫폼: Threads만
- 형식: 승인된 단일 텍스트 1건
- 자동 재시도: 없음
- 예약: 없음
- 미디어 업로드: 없음
- 교차 게시: 없음
- 승인 snapshot과 계정 target이 바뀌면 실행 차단
- user kill switch 기본값: `live_write_locked`

## 후순위 외부 운영 게이트

- [ ] Threads 공개 profile ID·handle과 계정 책임자 확인
- [ ] Meta App ID와 등록 redirect URI 확인
- [ ] `threads_basic`, `threads_content_publish` 승인 상태 확인
- [ ] 최신 공식 정책과 App Dashboard 요구사항 재검증
- [ ] 실제 계정 기반 local dry-run receipt 생성
- [ ] 계정 책임자 최종 승인

## credential vault 결정

현재 방식은 **선택하지 않는다**. 실제 자동 게시 개발 계획을 별도로 승인할 때 다음 중 하나를 선택하고 보안 검토한다.

| 후보 | 현재 상태 | 필수 검토 |
|---|---|---|
| OS Keychain | 미선택 | 프로세스 접근 권한, 계정 분리, 회전, 폐기 |
| 별도 encrypted credential service | 미선택 | TLS, device/service auth, 암호화 키 관리, 감사 로그 |

금지 사항:

- access token, refresh token, client secret을 Git·Markdown·브라우저 localStorage에 저장
- Codex OAuth Proxy caller credential과 소셜 플랫폼 credential 공유
- 비밀번호 로그인, 브라우저 매크로, 비공식 API
- credential 방식이 선택되지 않은 상태에서 임시 평문 파일 사용

## rollback·관측 기준

실제 게시 개발이 별도 승인된 이후에도 첫 범위에는 아래 제약을 적용한다.

- 실패 시 자동 재시도하지 않고 사람이 상태를 확인
- 동일 approval/account/content key는 중복 실행 차단
- 401·403·409·429는 자동 재시도 금지
- 요청 ID, 승인 revision ID, content hash, account mask만 기록
- 원고 전문, token, authorization header, 개인 경로는 로그에서 제외
- kill switch 해제는 별도 사용자 승인 없이는 불가능

## 계속 차단할 플랫폼

- X·LinkedIn: provider access·비용·권한 재검증 전 차단
- Facebook·Instagram·YouTube Shorts·TikTok: media workflow와 자산 검수 전 차단
- Discord·Bluesky·Mastodon: 별도 우선순위 승인 전 차단
- Reddit·Show HN·GeekNews·Disquiet·Product Hunt·Peerlist·Indie Hackers·OKKY: manual-only 유지
- DEV: 사람 작성·검토 자료만 유지

## Go 판정 조건

아래 항목을 모두 완료한 뒤 새로운 개발 계획과 보안 검토를 만들기 전까지 판정은 `NO_GO_PENDING_EXTERNAL_INPUTS`다.

- [ ] 후순위 외부 운영 게이트 완료
- [ ] credential vault 방식 선택
- [ ] Threads 공식 정책·scope 재검증
- [ ] 다음 별도 개발 범위 사용자 승인
- [ ] 실제 게시·rollback·관측 테스트 계획 승인

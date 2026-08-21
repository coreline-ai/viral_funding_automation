# Threads local dry-run 운영 리허설

작성일: 2026-08-21
범위: 실제 Threads 게시 직전까지의 로컬 검증. **외부 POST·컨테이너 생성·게시·업로드·예약 호출 없음**

## 사용자 입력 체크리스트

| 항목 | 상태 | 입력 원칙 |
|---|---|---|
| 실제 Threads 공개 profile ID·handle | 미입력 | GUI readiness에 공개 식별자만 입력 |
| 계정 소유자·게시 승인자 | 미입력 | 실제 운영 책임자가 확인 |
| Meta Developer App 공개 ID | 미입력 | client secret 입력 금지 |
| 등록 redirect URI | 미입력 | App 콘솔의 등록값과 대조 |
| `threads_basic` | 미확인 | 실제 계정/App 확보 시 공식 콘솔에서 재확인 |
| `threads_content_publish` | 미확인 | 실제 계정/App 확보 시 공식 콘솔에서 재확인 |
| 공식 정책 URL·확인일 | 미입력 | 실행일 기준 30일 이내 |
| 외부 credential vault | 미준비 | token은 vault에만 저장 |
| opaque vault reference | 미입력 | 브라우저 세션에서만 사용, 저장·export 금지 |
| 실제 게시 잠금 kill switch | 구현 완료 | `live_write_locked`일 때 local dry-run만 허용 |
| 첫 게시물 대표 이미지 | 미확인 | 현재 Threads 원고 operation gate에서 사람이 확인 |

## 구현된 리허설 흐름

1. `memory_node_graph`의 최종 교정 Threads 3개 원고를 게시 필드로 읽는다.
2. 계정·언어·운영 입력을 포함한 불변 approval snapshot을 만든다.
3. 현재 readiness가 승인 시점의 계정·자산·언어와 같은지 재검증한다.
4. process-local duplicate key를 가진 `ready_for_dry_run` intent를 한 번만 만든다.
5. opaque vault reference 존재와 `live_write_locked` kill switch를 확인한다.
6. Threads payload 계획과 simulated receipt를 로컬 메모리에서 만든다.
7. 원고 전문·vault reference를 제외한 evidence manifest만 내려받을 수 있다.

## 현재 환경 1턴 증거의 성격

- 테스트 fixture: `tests/fixtures/dry-run/memory-node-graph-threads.json`
- 계정/App 값: **합성 rehearsal 식별자**이며 실제 Threads 계정이나 실제 Meta App이라고 주장하지 않는다.
- 사용 원고: `campaigns/memory_node_graph/2026-08-first-launch/final/verified-channel-copy-pack.md`의 Threads 최종 교정본과 byte-for-byte 대조한다.
- 외부 fetch: test에서 호출되면 즉시 실패하도록 차단한다.
- 기대 결과: `networkWriteCount: 0`, `liveWriteBlocked: true`, `credentialStatus: not_configured`.

## 실제 계정 확보 후 남은 운영 작업

1. 위 체크리스트의 미입력·미확인 항목을 실제 계정 소유자가 채운다.
2. 공식 Threads 문서와 Developer App 콘솔에서 scope·redirect URI·정책을 다시 확인한다.
3. GUI에서 승인 snapshot을 새로 만들고 local rehearsal 1턴을 다시 실행한다.
4. evidence JSON에 원고·token·secret·개인 경로가 없고 write count가 0인지 확인한다.
5. 이 단계가 끝나도 실제 게시 기능은 만들거나 호출하지 않는다. Phase 5 Go/No-Go 승인 이후 별도 계획이 필요하다.

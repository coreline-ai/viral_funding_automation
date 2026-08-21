# 개발 계획 전체 상태 감사

검토일: `2026-08-21 KST`
검토 범위: `dev-plan/*.md` **16개 전부**
목적: 과거 계획, 현재 정본, 후순위 외부 게이트를 분리해 서로 다른 체크박스와 지시가 현재 상태로 오인되지 않게 한다.

## 종합 결론

- 현재 제품은 공개 GitHub 저장소를 분석해 채널별 원고 후보를 만들고, 사람이 검토·승인하며, Threads·X·LinkedIn의 **로컬 dry-run payload**까지 확인하는 워크벤치다.
- 실제 소셜 플랫폼 게시·업로드·예약 capability는 `false`이고 외부 write route는 없다.
- 콘텐츠/OAuth 정본은 `implement_20260818_210532.md`, 소셜 자동 게시 직전 준비 정본은 `implement_20260821_201014.md`다.
- 로그인된 Codex 실행 경로는 `codex_oauth_proxy_integration_20260821.md`다. 직접 Grok/Codex CLI 또는 API Key 방식은 현재 실행 정본이 아니다.
- 내부 구현 Phase 0~5는 완료했지만 실제 자동 게시 시작 판정은 `NO_GO_PENDING_EXTERNAL_INPUTS`다. Meta 계정·App·scope·외부 credential vault가 준비되기 전에는 이 판정을 바꾸지 않는다.

## 문서별 판정

| 문서 | 판정 | 현재 의미 |
|---|---|---|
| `IMPLEMENT_PROMPT_20260817_translation_mvp.md` | 사용 금지·보관 | API Key 직접 호출 전제의 폐기된 실행 프롬프트 |
| `codex_oauth_proxy_integration_20260821.md` | 완료·현행 보조 정본 | 전용 `viral` caller와 LinkedIn 실제 OAuth Proxy 1턴 증거. 추가 저장소 회귀는 후속 |
| `implement_20260816_180940.md` | 보관·미실행 | 7주 수요 검증/Funding PR 초기 전략. 현재 개발·Git 지시가 아님 |
| `implement_20260816_192530.md` | 완료·이력 | GitHub URL → 요약·콘텐츠 3종 CLI MVP |
| `implement_20260816_195808.md` | 완료·이력 | 단일 화면 로컬 GUI와 테마 적용 |
| `implement_20260816_203309.md` | 완료·이력 | 예제 1턴·브라우저 복원 흐름 |
| `implement_20260816_211901.md` | 완료·이력 | 데모 URL 오탐·설명 중복 수정 |
| `implement_20260816_213357.md` | 완료·이력 | `memory_node_graph` 첫 출시팩·대표 이미지·원고 3종 |
| `implement_20260816_214553.md` | 완료·이력 | GeekNews 게시 직전 수동 준비와 GitHub 기준점 |
| `implement_20260816_222449.md` | 완료·이력 | X·GeekNews·DEV 채널별 원고 계약 |
| `implement_20260816_225433.md` | 완료·이력 | 19개 플랫폼 상태·12개 당시 원고 확장 |
| `implement_20260817_154334.md` | 완료·이력 | 신규 6개 채널 추가, 총 18개 원고 |
| `implement_20260817_162445.md` | 1차 완료·이력 | 계정 확보 전 수동 게시 MVP 종료와 자동화 사전조사 |
| `implement_20260817_182435.md` | 완료 이력·대체됨 | 직접 Grok CLI 수직 MVP 기록. 현재 provider 경로는 후속 계획으로 대체 |
| `implement_20260818_210532.md` | 조건부 완료·현행 정본 | R0~R3와 Codex Proxy 1턴 완료. 실제 canary·서로 다른 저장소 3종·사람 언어 검토는 R4 후순위 |
| `implement_20260821_201014.md` | 내부 Phase 0~5 완료·현행 정본 | 승인 snapshot, readiness, 중복 차단, connector dry-run, 합성 Threads E2E, Go/No-Go 패키지 완료 |

## 현재 정본 우선순위

1. `implement_20260821_201014.md` — 실제 자동 게시 이전의 제품·보안·운영 경계
2. `implement_20260818_210532.md` — 원고 구성, 다국어, OAuth Proxy, 검증, loopback API beta
3. `codex_oauth_proxy_integration_20260821.md` — 로그인된 Codex Proxy의 실제 연결 방식과 1턴 증거
4. `reviews/automation/AUTOMATION_GO_LIVE_CHECKLIST.md` — 외부 입력 후 Go 재판정 조건
5. 나머지 계획 — 구현 배경과 완료 이력. 현재 범위 또는 실행 지시로 사용하지 않음

## 현재 완료 상태

| 범위 | 상태 | 근거 |
|---|---|---|
| 원고 정본·내부 체크리스트 분리 | 완료 | 게시 복사는 승인된 `publishFields`만 사용 |
| 다국어 후보 구성 | 완료 | `ko-KR`, `en-US`, `ja-JP`, `zh-CN`, `es-ES`; 채널별 허용 locale 적용 |
| Codex OAuth Proxy 실제 1턴 | 완료 | 전용 caller, LinkedIn HTTP 200, 자동 승인 없이 candidate 유지 |
| 승인 snapshot·stale·중복 차단 | 완료 | SHA-256 fingerprint, immutable snapshot, idempotency conflict |
| 19개 플랫폼 registry | 완료 | manual-only와 connector 후보를 단일 정본에서 분리 |
| Threads·X·LinkedIn connector | dry-run만 완료 | 실제 네트워크 write 없이 payload·simulated receipt 생성 |
| Threads 브라우저 1턴 | 합성 리허설 완료 | 실제 계정 증거가 아닌 synthetic account, 외부 write 0회 |
| 실제 자동 게시 | 미구현·차단 | `actualPublishCapability: false`, live write route 0 |

## 남은 항목

### 외부 입력 후 재개

- Meta App ID, redirect URI, `threads_basic`, `threads_content_publish` 승인 상태
- 실제 Threads 계정 target과 소유자 확인
- Git에 넣지 않는 외부 credential vault 선택과 opaque handle 연결
- 플랫폼 정책·scope·요금·버전의 실행 시점 공식 재확인
- 실제 게시 전 보안 재검토와 승인자 Go 판정

### 후순위 품질 검증

- OAuth canary·prompt injection·timeout·cancel·logout의 격리 환경 실제 증거
- 웹앱·라이브러리·CLI/데모 없음 등 서로 다른 저장소 3종 회귀
- 영어·한국어 대표 채널의 사람 편집·채널 적합성 확인
- 기본 GUI에서 추천 채널 한 개를 먼저 보여주는 흐름 단순화

## 최종 판정

현재 변경은 `main`에 반영 가능한 **로컬 beta 및 자동 게시 전 안전 준비 패키지**다. 다만 이는 소셜 자동 게시 완료나 실제 계정 readiness 완료를 뜻하지 않는다. 외부 입력이 준비되면 새 계획에서 Threads 텍스트 게시 한 채널만 대상으로 실제 write adapter를 설계하고, 이 문서의 `NO_GO_PENDING_EXTERNAL_INPUTS`를 별도 승인 절차로 재판정한다.

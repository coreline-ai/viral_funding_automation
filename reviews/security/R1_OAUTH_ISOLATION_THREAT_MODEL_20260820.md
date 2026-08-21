# R1 OAuth CLI 격리·DLP·근거 검증 위협 모델

- 작성일: 2026-08-20 (KST)
- 범위: 로컬 OAuth CLI를 통한 **게시 후보 생성·검토**만 해당한다. 자동 게시와 외부 기기 공개 API는 범위 밖이다.
- 결정: 현재 Codex Desktop 실행 환경에서는 macOS `sandbox-exec` 프로필 적용이 OS에 의해 거부되었다. 따라서 **Grok·Codex OAuth provider를 기본 `disabled`로 fail-closed 처리**한다. 이 상태에서 README·URL·Markdown을 provider에 보내지 않는다.

## 1. 보호 대상

| 자산 | 노출 금지 경로 |
|---|---|
| OAuth access/refresh token 및 API key | 브라우저, API 응답, stdout/stderr, 로그, fixture, prompt, Git |
| 사용자 HOME 내부 파일 | provider tool call, shell, file read, 오류 진단, 생성 문구 |
| SSH·GitHub·개인 API 자격증명 | provider 응답, 모델이 생성한 명령, 환경변수 |
| 개인 절대 경로·인증 파일 경로 | API·UI·오류 응답·저장된 결과 |
| 저장소 사실 데이터 | 모델의 임의 기술·기능·성과·외부 URL 주장 |

## 2. 위협과 방어

| 공격 경로 | R1 방어 | 실패 시 동작 |
|---|---|---|
| README/Issue/Markdown prompt injection | prompt의 `USER_DATA`는 비신뢰 참조 데이터라고 고정하고, 지시·정책·도구·파일·네트워크 요청을 따르지 않도록 명시 | provider 실행 전/후 결정론적 검증, 자동 게시 없음 |
| Grok tool 사용 | `--tools ""`로 도구 0개 allowlist, 단일 turn, memory·subagent·plan·web 비활성화 | OS sandbox probe가 실패하면 Grok disabled |
| Codex tool/host file read | Codex `read-only`만으로는 host file read 차단을 증명할 수 없으므로 기본 disabled | 명시적 실험 opt-in과 별도 증거 전까지 실행하지 않음 |
| OAuth 파일 외 HOME 접근 | sandbox profile은 OAuth auth 파일 1개와 임시 workspace·OS runtime만 read 허용하고, model shell exec는 deny | 프로필을 OS가 적용하지 못하면 provider disabled |
| provider 출력의 token/path/canary | compose·review·translate 공통 runtime DLP로 private path, token, private key, canary를 검사 | `SENSITIVE_PROVIDER_OUTPUT`, 결과·복사 차단 |
| LLM 허위 claim | facts 기반 canonical evidence 목록과 high-risk 기술·기능·성과·URL 대조 | validate는 `invalid`, compose는 provider 결과 거절 |

## 3. 구현 경계

### 실행 격리

`src/grok-oauth-proxy.mjs`는 실행 전에 두 단계로 검사한다.

1. inert `sandbox-exec` probe가 실제로 profile을 적용할 수 있는지 확인한다.
2. provider CLI의 `--version`을 동일 profile에서 실행해 CLI 자체가 해당 경계에서 시작 가능한지 확인한다.

통과한 경우에만 Grok은 `restricted` 상태가 될 수 있다. 실행 프로필은 기본 deny이며 다음만 허용한다.

- provider OAuth auth 파일 1개 read
- 생성한 임시 workspace read/write
- CLI 실행 파일 및 운영체제 runtime read
- 모델 요청에 필요한 outbound network

shell·file 도구를 실행하기 위한 process exec는 허용하지 않는다. Grok은 추가로 명시적 도구 0개 allowlist를 사용한다.

Codex는 현재 공개 CLI 옵션만으로 모델 도구를 0개로 강제하는 증거가 없으므로, OS 경계가 적용되더라도 `VIRAL_ENABLE_EXPERIMENTAL_CODEX_OAUTH=1`이 없으면 disabled다. 이는 기능 축소가 아니라 인증 파일을 읽을 수 있는 agent process를 안전하다고 과장하지 않기 위한 정책이다.

### 현재 환경 spike 결과

- `sandbox-exec` 바이너리는 존재했다.
- inert profile과 Grok CLI version smoke에서 profile 적용이 OS 권한 오류로 거부되었다.
- 결과: 실행 경계가 증명되지 않았으므로 Grok·Codex 모두 `securityStatus: disabled`이다.
- 실제 OAuth 모델 호출·실제 canary 주입은 실행하지 않았다. 이는 R4의 명시적 operator 테스트다.

## 4. 출력 DLP

`src/runtime-security.mjs`는 provider payload 전체를 재귀 검사한다.

- bearer/API/access/refresh token, JWT, private-key PEM 패턴
- 개인 절대 경로, HOME 기반 인증·SSH 경로, secret file 경로
- 테스트용 canary (`VIRAL_DLP_CANARY` 또는 test 전달값)

DLP issue에는 발견한 **값 자체를 기록하지 않는다**. CLI runner는 stdout, stderr, child environment, 명령 전문을 반환하지 않고 `requestId`와 정제된 payload만 반환한다.

## 5. 사실성 evidence 정책

canonical evidence는 `facts.name`, repository/demo URL, license, description, technologies, features에서만 만든다. 생성 원고에는 matched evidence의 `evidenceId`, `source`, `value`를 반환한다.

자동 차단 대상은 다음 high-risk claim이다.

- 기술: Kubernetes, React, Three.js, D1, OAuth 등 알려진 기술 alias
- 기능: OAuth login, GitHub/repository sync, mobile app, live collaboration
- 성과: millions of teams, trusted by, widely adopted, best/fastest/guaranteed 등
- URL: facts에 없는 외부 URL

근거가 없는 claim은 compose 결과가 게시 후보가 되지 못하며, 기존 원고 재검증은 `contentStatus: invalid`, `publishReady: false`가 된다. 일반적인 문체 평가는 사람 검토 대상으로 남긴다.

## 6. R1 검증 항목

- provider는 raw stdout/stderr/env를 반환하지 않는다.
- token·private key·개인 경로·canary 결과는 runtime에서 차단한다.
- `Kubernetes`·`millions of teams`·미확인 OAuth login·외부 URL은 canonical facts 없이는 통과하지 않는다.
- 근거 있는 React·Three.js·demo URL은 evidenceId/source와 함께 통과한다.
- Grok은 zero-tool allowlist와 OS sandbox profile을 구성한다.
- sandbox capability 또는 CLI startup을 증명하지 못하면 provider는 disabled다.

## 7. 후속 범위

| 단계 | 아직 남은 작업 |
|---|---|
| R2 | in-flight idempotency, canonical request fingerprint, stale apply gate, cancellable queue/process lifecycle |
| R3 | loopback Host/Origin/nonce, protected provider probe, 실행 가능한 OpenAPI contract |
| R4 | 명시적 실제 OAuth canary/prompt-injection smoke, timeout/cancel/logout, sanitized provenance manifest, 브라우저 E2E |

R1은 현재 환경에서 OAuth 실행을 허용했다는 증명이 아니다. **안전한 격리를 증명하지 못한 실행을 차단했다는 보안 기준**이다.

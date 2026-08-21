# 로그인된 Codex OAuth Proxy 연동 계획

작성일: `2026-08-21 KST`
상태: **Codex Proxy adapter·전용 caller·실제 1턴 완료**

## 목표

이 웹앱은 OAuth CLI를 직접 로그인·실행하지 않는다. 이미 로그인된 `proxy-codex`가 OAuth session, CLI 실행, upstream queue를 소유하고, 이 앱은 전용 loopback caller로 텍스트 요청만 보낸다.

```text
viral_funding_automation
  -- (127.0.0.1, service caller: viral) --> proxy-codex
  -- (already logged-in OAuth session) --> Codex CLI
```

## 구현 범위

| 순서 | 작업 | 상태 | 종료 기준 |
|---:|---|---|---|
| 1 | Proxy text adapter·loopback URL 검증·0600 secret file 검증 | 완료 | 외부 URL·상대 secret path 거부 |
| 2 | local app의 Codex runner를 Proxy 우선으로 전환 | 완료 | Proxy 설정 시 direct CLI를 실행하지 않음 |
| 3 | `viral` 전용 Proxy caller secret·`conversation.respond.v1` allowlist 추가 | 완료 | 다른 서비스 credential을 재사용하지 않음 |
| 4 | Proxy 재시작·`/ready` 확인 | 완료 | `127.0.0.1:4348/ready`가 ready |
| 5 | LinkedIn 1턴 compose E2E | 완료 | local API → Proxy → logged-in Codex → validator가 HTTP 200 반환 |
| 6 | 결과 검토·기록 | 완료 | token·secret·개인 경로를 출력하지 않음 |

## 현재 구현 파일

- `src/providers/codex-oauth-proxy.mjs`: Proxy runner, URL/credential/output 안전 경계
- `src/server.mjs`: `VIRAL_CODEX_PROXY_*` 설정 시 Proxy runner 선택
- `.env.example`: 로컬 환경 변수 형식만 제공, 실제 secret 없음
- `scripts/proxy-codex-live-smoke.mjs`: 1턴 LinkedIn compose smoke. 원고 전문·OAuth token을 출력하지 않고 status/검증/hash만 출력

## 운영 설정

```bash
VIRAL_CODEX_PROXY_BASE_URL=http://127.0.0.1:4348
VIRAL_CODEX_PROXY_CALLER_ID=viral
VIRAL_CODEX_PROXY_SECRET_FILE=/absolute/path/to/viral-codex-proxy.secret
```

`VIRAL_CODEX_PROXY_SECRET_FILE`은 이 프로젝트의 Git 제외 `runtime/secrets/`에 `0600`으로 두고, Proxy 측 `runtime/secrets/callers/viral.secret`과 같은 값이어야 한다. OAuth token/profile을 이 프로젝트로 복사하지 않는다.

## 실제 1턴 실행 결과

공유 Proxy 권한 변경에 대한 사용자 승인을 받은 뒤, 실행 중인 `proxy-codex`에만 `viral` caller credential과 `conversation.respond.v1` allowlist를 추가하고 재시작했다. 다른 caller credential과 OAuth token은 읽거나 재사용하지 않았다.

실행 명령:

```bash
VIRAL_CODEX_PROXY_BASE_URL=http://127.0.0.1:4348 \\
VIRAL_CODEX_PROXY_CALLER_ID=viral \\
VIRAL_CODEX_PROXY_SECRET_FILE="$PWD/runtime/secrets/codex-proxy.secret" \\
node scripts/proxy-codex-live-smoke.mjs
```

결과: `proxyReady: true`, HTTP `200`, `actualOAuthOneTurn: true`, `contentStatus: candidate`, `operationsStatus: ready`, `validationOk: true`.

출력 원고 전문·OAuth token·caller secret은 저장·출력하지 않았다. 출력 field는 `body` 1개(828자)였고, summary/publish hash만 증거로 남겼다. `approvalStatus`는 자동으로 승인되지 않으므로 이 결과는 게시 준비 완료가 아니라 **사람 검토 전 콘텐츠 후보**다.

## 다음 검증

1. 웹 GUI에서 Proxy-ready 상태를 표시하고 사람이 실제 생성 결과를 검토·승인한다.
2. 실제 프로젝트 사실이 달라진 저장소 2종에서 1턴씩 회귀한다.
3. Grok은 텍스트용 Proxy contract와 전용 caller가 준비된 뒤 별도 연결한다.

## 비범위

- Grok은 현재 실행 중인 텍스트 Proxy contract가 확인되지 않았으므로 연결하지 않는다.
- 자동 게시·소셜 서비스 OAuth·OAuth token export는 추가하지 않는다.
- Proxy의 기존 다른 caller credential을 읽거나 재사용하지 않는다.

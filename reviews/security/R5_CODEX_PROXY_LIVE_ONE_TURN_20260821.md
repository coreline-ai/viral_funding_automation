# R5 로그인된 Codex OAuth Proxy 실제 1턴 결과

작성일: `2026-08-21 KST`
판정: **PASS — Codex Proxy 경로의 1턴 compose·결정론 검증 통과**

## 검증 범위

```text
local viral app API
  → `viral` 전용 caller
  → loopback proxy-codex
  → 이미 로그인된 Codex OAuth CLI
  → LinkedIn publish field validator
```

입력은 `AI Systems Atlas`의 검증된 한국어 사실과 LinkedIn channel contract만 사용했다. 자동 게시·소셜 계정 OAuth·브라우저 게시 동작은 실행하지 않았다.

## 결과

| 항목 | 결과 |
|---|---|
| Proxy readiness | `true` |
| HTTP 응답 | `200` |
| 실제 OAuth 1턴 | `true` |
| channel | `linkedin` |
| 콘텐츠 상태 | `candidate` |
| 운영 상태 | `ready` |
| 사실·형식 validator | `validationOk: true` |
| 게시 필드 | `body` 1개, 828자 |

생성 원고 전문은 evidence 문서·로그에 저장하지 않았다. OAuth token, caller secret, CLI 인증 경로, raw provider stdout은 읽거나 출력하지 않았다.

## 의미와 한계

- 이 결과는 앱이 direct CLI 로그인 대신, 이미 로그인된 Proxy를 통해 실제 Codex OAuth 요청을 처리했음을 증명한다.
- `candidate`는 사람 검토 전 콘텐츠 후보이며, 승인과 실제 채널 운영 조건까지 충족한 `publishReady`는 아니다.
- Grok 텍스트 Proxy는 아직 이 검증 범위 밖이다.
- prompt-injection canary·timeout/cancel·다른 저장소 회귀는 별도 R4/R5 후속 게이트로 남는다.

## 재현

`runtime/secrets/`의 전용 caller credential이 준비된 승인 환경에서만 아래 명령을 실행한다.

```bash
VIRAL_CODEX_PROXY_BASE_URL=http://127.0.0.1:4348 \\
VIRAL_CODEX_PROXY_CALLER_ID=viral \\
VIRAL_CODEX_PROXY_SECRET_FILE="$PWD/runtime/secrets/codex-proxy.secret" \\
node scripts/proxy-codex-live-smoke.mjs
```

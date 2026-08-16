# 엔지니어링·보안·플랫폼 통합 현실성 검토

**검토 대상:** `dev-plan/implement_20260816_180940.md` (513줄, 2026-08-16 18:09:40 KST)
**검토 관점:** Staff 엔지니어 / 보안 / 플랫폼 통합 — **1인 개발 실행 가능성**
**검토일:** 2026-08-16
**원 계획 수정 여부:** 없음. 본 문서는 독립 산출물이다.
**선행 검토와의 관계:** `EXPERT_REVIEW_CONSOLIDATED`, `tech_architecture_review`, `REVIEW_product_mvp`, `reviews/security_platform_policy_review`를 모두 읽었다. 그 문서들은 **원 기획서 v1.0**을 검토했고, 이 문서는 **그 검토들을 반영해 만들어진 실행 계획**을 검토한다. 따라서 앞선 지적의 반복은 최소화하고, **실행 계획 단계에서 새로 생긴 문제와 남아 있는 문제**에 집중한다.

---

## 0. 한 줄 결론

> **Track A는 실행 가능하다. Track B(Phase 6~8)는 "4주"라는 숫자만 빼면 설계가 건전하다 — 실제 공수는 약 17 개발일이고, ETag 캐싱과 라이선스 자동 분류 두 항목을 잘라내지 않으면 4주 안에 끝나지 않는다.**

판정: **조건부 GO.** 아래 §3의 절단 2건과 §4의 누락 계약 12건을 Phase 6 착수 전에 문서에 박으면, 원 계획의 일정과 수용 조건이 실제로 성립한다. 그대로 두면 Phase 7 후반과 Phase 8에서 약 2주가 초과된다.

가장 심각한 단일 결함은 기술이 아니라 **순서**다. Traffic 데이터는 14일만 보관되는데, 그 데이터를 수집하는 `metrics` 명령은 캠페인이 끝난 지 3~5주 뒤인 Phase 7에서 만들어진다. **Phase 7의 metrics는 자기를 정당화한 캠페인의 데이터를 영원히 볼 수 없다.** (§5.1)

---

## 1. 항목별 판정 요약

원 태스크가 지정한 10개 항목에 대한 판정이다.

| # | 항목 | 1인 구현 가능성 | 판정 근거 |
|---|---|---|---|
| 1 | TypeScript CLI | ✅ **쉬움** | Node 24 LTS는 타입 스트리핑으로 `.ts`를 직접 실행한다 → **빌드 스텝 0**. `node:util.parseArgs` + `node --test`로 CLI/테스트 의존성도 0. §6.2 |
| 2 | GitHub 인증 | ✅ **쉬움, 단 계획이 선택을 미뤘다** | Fine-grained PAT 1개가 정답. GitHub App은 JWT 서명·설치토큰 교환으로 1인 CLI에 순손실. 단 **Traffic이 `Administration` 권한을 요구**해 "최소 권한" 원칙과 충돌한다(신규 발견, §3.6) |
| 3 | 라이선스 신호 | ⚠️ **자동화 ROI 음수** | Track A Phase 1에서 사람이 83개를 이미 감사한다. Track B는 저장소 **1개**를 대상으로 한다. n=1 분류기는 만들 이유가 없다. 가치는 분류가 아니라 **STALE 무효화**에 있다 → `approvals.ts`로 대체 (§3.2) |
| 4 | RepoBrief Lite | ✅ **적정** | 스키마 자체는 반나절. 실제 공수는 스키마가 아니라 §3.3의 정규화다 |
| 5 | exact quote | 🔴 **계획이 가장 과소평가한 항목** | `includes()` 한 줄로 보이지만 NFC/NFD·CRLF·NBSP·zero-width 때문에 **한국어 인용문에서 조용히 실패**한다. Phase 8의 "인용 검증률 100%"가 보안이 아니라 정규화 때문에 깨진다 (§3.3) |
| 6 | LLM 어댑터 | ⚠️ **필요성 자체를 재검토할 것** | 승인된 Brief에서 3채널 초안은 **템플릿으로 충분**하다. LLM은 어댑터·스키마 실패·재시도·비결정성·인젝션 표면을 한꺼번에 들여온다. Track B 최대의 절단 후보 (§3.4) |
| 7 | 콘텐츠 린트 | ✅ **적정, 단 문자수 규칙 1건 함정** | 금지어·URL allowlist는 쉽다. X weighted length(CJK 2, URL 23 고정)만 직접 만들면 틀린다 (§3.5) |
| 8 | Draft PR 멱등성 | ⚠️ **계획이 3개 상태를 빠뜨렸다** | closed PR 존재 / 브랜치만 존재 / private 저장소. 마지막은 **Free·Pro 요금제에서 draft PR 생성 자체가 불가**(공식 확인) (§3.7) |
| 9 | metrics | 🔴 **순서 결함** | 14일 롤링 윈도우 vs Phase 7 착수 시점. 데이터가 이미 없다 (§5.1) |
| 10 | 테스트 범위 | ⚠️ **"네트워크 없이"가 최대 공수** | 409/422/429/네트워크 중단을 실제 GitHub에 유발할 수 없다. **주입 가능한 클라이언트 인터페이스 1개**를 명시적으로 허용해야 한다 — 계획의 "불필요한 추상화 금지" 규칙과 충돌하므로 예외를 문서에 박아야 한다 (§3.8) |

---

## 2. 원 계획에서 유지해야 할 판단

이미 잘 된 부분은 건드리지 않는다. 다시 논쟁하지 말 것.

1. **Track A / Track B 분리와 W7 게이트.** 이 계획의 가장 큰 성과다.
2. **명령 5개 고정** (`inspect`, `brief`, `draft`, `funding-pr`, `metrics`). 범위 재확장을 막는 가장 값싼 장치다. `--help`에 다섯 개만 뜨는지 검사하는 자체 테스트도 좋다.
3. **`github → analysis → brief/content → side-effects` 단방향 의존.**
4. **LLM confidence 값을 저장하지도 승인 근거로 쓰지도 않는다** (제약 5). 옳다.
5. **자동 게시 코드 미구현 확인** (Phase 7). 다만 §6.4에서 이를 *증명 가능한* 형태로 강화한다.
6. **NO_GO 시 Phase 6~8 면제.** 게이트가 실제로 닫힐 수 있어야 게이트다.
7. **파일 기반 산출물.** DB 없음이 맞다. 산출물이 git에 들어가므로 감사 로그를 따로 만들 필요가 없다(§7.3).

---

## 3. Phase 6~8의 숨은 복잡도

각 항목에 **실제 공수**와 **권고**를 붙인다.

### 3.1 "GitHub 인증 경로 한 개"가 감춘 3갈래 분기 — 계획이 선택을 Phase 6로 미뤘다

계획은 "GitHub 인증 경로 한 개 결정"이라고만 쓰고 후보를 명시하지 않는다. 그런데 **어느 것을 고르느냐가 Phase 7 태스크의 실현 가능성을 바꾼다.**

| 경로 | 인증 코드 | Phase 7 "ETag·rate-limit 처리" | 판정 |
|---|---|---|---|
| `gh` CLI subprocess | ~0줄 | **불가능에 가깝다.** subprocess 경계에서 `x-ratelimit-*` 헤더와 ETag를 잃는다. `gh api -i`로 헤더를 파싱해 되살리는 건 Octokit을 다시 만드는 일이다 | ❌ Phase 7과 모순 |
| Fine-grained PAT + Octokit | ~30줄 | 플러그인이 대부분 처리 | ✅ **채택** |
| GitHub App | ~150줄 (RS256 JWT, 설치토큰 교환, 60분 갱신, 개인키 보관) | 동일 | ❌ 1인 CLI에 순손실 |

**계획 내부 모순:** "GitHub 인증 경로 한 개"(Phase 6)와 "ETag·rate-limit 처리"(Phase 7)는 독립 선택처럼 쓰여 있지만 실제로는 종속이다. `gh`를 고르면 Phase 7의 태스크 하나가 자동으로 불가능해진다. **Phase 6의 결정 항목에 "Octokit 고정"을 미리 박아두는 것이 안전하다.**

Octokit 선택 시 무료로 해결되는 것 (공식 확인):
- `@octokit/plugin-throttling` — primary·secondary rate limit 모두 처리, `retry-after`/`x-ratelimit-reset` 존중, **쓰기 요청 직렬화**. 즉 선행 기술 검토가 요구한 "쓰기 동시성 1 + 요청 간 간격"이 플러그인 옵션이 된다.
- `@octokit/plugin-retry` — 5xx·일시 실패 재시도.

**공수:** 0.5일 (플러그인 배선 + `onRateLimit`/`onSecondaryRateLimit` 콜백 작성).

### 3.2 라이선스 자동 분류는 Track B에서 만들 이유가 없다 — 가치는 STALE에 있다

Phase 7 태스크: "라이선스 신호를 수집하되 최종 결정은 운영자 승인".

사실관계:
- Track A Phase 1에서 **사람이 공개 저장소 83개를 이미 감사**한다. 라이선스 없음 12개, `other` 6개, 동일 계보 3쌍까지 수동 확인이 완료된다.
- Track B의 대상은 **저장소 1개**다.
- GitHub의 라이선스 판정 자체가 Licensee gem 기반이고 **루트 LICENSE만 본다**고 공식 문서가 명시한다 — 즉 신호를 모아도 최종 판단은 어차피 사람이다.

n=1에 결정론적 분류기(SPDX 상수 목록 + 모노레포 스캔 + match_ratio)를 만드는 것은 **분명한 과잉**이다. 반면 **정말 필요한 것은 분류가 아니라 무효화**다: 제약 4·Phase 7의 "commit·파일 변경 시 라이선스와 claim 승인이 무효화된다".

**권고 — `license-signals.ts`를 `approvals.ts`로 교체:**

```jsonc
// approvals/<owner>__<repo>.json  — 사람이 작성, 기계가 검증만 한다
{
  "repository": "coreline-ai/<repo>",
  "licenseClass": "OPEN_SOURCE",
  "confirmedSpdx": "MIT",
  "confirmedBy": "kyounghwan.choi",
  "confirmedAt": "2026-08-20T04:11:00Z",
  "commitSha": "…40자…",
  "licenseFilePath": "LICENSE",
  "licenseFileSha256": "…",
  "briefSha256": "…"          // repo-brief-lite.json 자체의 해시
}
```

검증기는 40줄이다: 현재 `commitSha` 시점의 `LICENSE` 해시와 brief 해시를 다시 계산해 불일치하면 `STALE` → 모든 명령이 차단. **분류 로직이 사라지고 무효화 게이트만 남는다.**

**공수:** 계획대로 만들면 2일. 이 권고를 따르면 **0.5일.** (절감 1.5일)

### 3.3 exact quote 검증 — 계획이 가장 과소평가한 지점 🔴

Phase 8 수용 조건: "RepoBrief 인용 검증률 100%".
Phase 2 자체 테스트: "모든 EXACT_QUOTE가 기준 commit 파일에 존재한다."

이것이 `file.includes(quotedText)` 한 줄로 보이지만, **한국어 프로젝트에서 거의 확실히 실패한다.**

| 실패 원인 | 왜 발생하는가 |
|---|---|
| **NFC vs NFD** | macOS 파일시스템은 한글을 NFD(자모 분리)로 다루는 경로가 있고, LLM·에디터·클립보드를 거친 인용문은 NFC다. 두 문자열은 눈에 똑같고 `===`는 false다 |
| **CRLF vs LF** | GitHub contents API는 blob 원본을 base64로 준다. 로컬에서 만든 인용문이 LF면 CRLF 파일에서 못 찾는다 |
| **NBSP (U+00A0)** | README 배지·표 정렬에 흔히 섞인다 |
| **zero-width (U+200B/FEFF)** | BOM, 그리고 일부 마크다운 도구가 삽입 |
| **후행 공백 / 표 파이프** | 마크다운 표에서 인용 구간을 잡으면 거의 항상 걸린다 |

**핵심 지적:** 계획의 QA는 제어문자·zero-width를 **공격으로만** 다룬다("Prompt injection, 제어문자, zero-width 문자, 악성 URL을 차단한다"). 그런데 **정상 경로가 동작하려면 똑같은 정규화가 필요하다.** 이 둘을 서로 다른 코드로 구현하면 (a) 정상 인용문이 거짓 실패하고 (b) 정규화 차이를 이용한 우회가 생긴다.

**누락 계약 (가장 중요):**

> **`canonicalize(s: string): string`를 단 한 번 정의하고, 세 지점에서 동일하게 호출한다.**
> ① brief 작성 시 `quotedText` 저장 전, ② 검증 시 GitHub에서 받은 파일, ③ LLM 입력 전 저장소 텍스트 소독.
> 내용: `String.prototype.normalize('NFC')` → CRLF→LF → NBSP→SP → zero-width/BOM 제거 → 행 후행공백 제거.
> `quoteSha256`은 **정규화 후 문자열**에 대해 계산한다.

이 한 문장이 계획의 QA 항목 3개(인용 검증률, 제어문자, zero-width)를 동시에 닫는다.

**공수:** 구현 + 픽스처 테스트 **1.5일.** 계획은 이 항목에 명시적 시간을 배정하지 않았다.

### 3.4 LLM 어댑터 — 필요성 자체를 다시 물어야 한다

Phase 7: "최대 3개 채널 초안 생성". 입력은 **승인된 RepoBrief Lite**(한 줄 소개 + 대상 사용자 + claim + limitations)이고, 출력은 **사람이 반드시 읽고 편집하는** Markdown 초안이다. 자동 게시는 없다.

이 조건에서 LLM의 한계 기여는 **문장 다듬기**뿐이다. 반면 들여오는 비용은:

- 어댑터(프로바이더 1개여도 프로세스/타임아웃/에러 처리)
- 스키마 검증 실패 시 재시도 정책 — **계획에 없다** (누락 계약)
- 비결정성: 같은 입력에 매번 다른 초안 → `draft.md`가 매 실행 churn → 운영자가 "뭐가 바뀐 건지" 알 수 없음
- 프롬프트 인젝션 표면 (그래서 §3.3의 소독과 §6.3의 allowlist가 필요해짐)
- Phase 7·8 QA 항목 3개("허위 claim 차단", "인젝션 테스트", "검증 실패 시 승인 전환 차단")가 전부 이것 때문에 존재

**권고 (절단 후보 1순위):**

> Phase 6의 결정 로그에는 **LLM 제공자를 확정해 기록한다**(계획 준수). 그러나 Phase 7은 **템플릿 렌더러를 먼저 출고**하고, LLM은 `--llm` 옵션으로 남긴다. 실제 캠페인 2회에서 템플릿 초안의 편집량이 과다하다고 측정되면 그때 켠다.

3채널 템플릿(X 짧은 훅 / Threads 중간 / DEV·README 긴 형식)은 Brief 필드를 문자열 보간하는 수준이고 **반나절**이면 끝난다. 그리고 결정론적이라 `draft.md` diff가 의미를 갖는다.

**LLM을 끝내 구현할 경우 반드시 정할 계약 (현재 계획에 없음):**
- 호출 방식: 이 워크스페이스의 기존 패턴대로 **CLI 서브프로세스**(codex/claude/grok) — API 키·SDK·과금 없음. stdin에 프롬프트, stdout에서 JSON.
- 실패 정책: **최대 2회 시도, 이후 FAIL** 하고 실패 사유를 `draft.md` 상단 주석으로 기록. 무한 재시도 금지.
- 결정성 키: `draftKey = sha256(briefSha256 | channel | templateVersion | promptVersion | cliVersion)`. 동일하면 재생성하지 않는다.
- 산출물 frontmatter에 `promptVersion`과 CLI `--version`을 기록 (CLI가 조용히 바뀌는 것에 대한 방어).

**공수:** 템플릿만 0.5일 / LLM 어댑터 포함 1.5일. (절감 1일 + QA 항목 3개 제거)

### 3.5 콘텐츠 린트 — 문자 수만 함정, 나머지는 쉽다

금지어 사전, 수치 주장→claim 바인딩, URL allowlist는 정규식과 집합 연산이라 반나절이다. 함정은 하나다.

**X의 문자 수는 `String.length`가 아니다.** 공식 알고리즘은 weighted length: 대부분의 CJK는 **2 카운트**, URL은 실제 길이와 무관하게 **23자 고정**. `String.length`로 재면 한국어 초안이 로컬 검증을 통과하고 실제 게시창에서 초과한다. 게다가 `String.length`는 UTF-16 코드 유닛이라 이모지 1개가 2로 세어진다.

**권고:**
- X: `twitter-text` 패키지를 쓰거나(정확), 못 쓰면 문서화된 v3 config 상수로 40줄 구현 — `maxWeightedTweetLength: 280`, `scale: 100`, `defaultWeight: 200`, `transformedURLLength: 23`, 가중치 100 구간 `[0–4351, 8192–8205, 8208–8223, 8242–8247]`. **구현 직전 `twitter-text`의 `config/v3.json`으로 상수를 재확인할 것.**
- Threads(500) / LinkedIn(3000) / Reddit 제목(300): **`Intl.Segmenter`로 grapheme 카운트**. Node 24 내장, 의존성 0. `String.length` 금지.

Track B가 X API 게시를 제외했으므로 이 검사는 **차단이 아니라 경고**여도 충분하다. 다만 경고가 없으면 초안이 쓸모없어지므로 생략은 안 된다.

**공수:** 린트 전체 **1.5일** (테스트 포함).

### 3.6 metrics 권한 — 신규 발견, "최소 권한"과 정면 충돌 🔴

**공식 문서 확인 결과 Traffic 엔드포인트 4종(`/traffic/views`, `/traffic/clones`, `/traffic/popular/referrers`, `/traffic/popular/paths`)은 fine-grained PAT의 `Administration` 권한을 요구한다.**

이것은 계획과 선행 보안 검토가 전제한 "`contents:write` + `pull_requests:write`만" 원칙으로는 **metrics가 동작하지 않는다**는 뜻이다. 403이 난다.

선택지는 셋이고, 섞으면 안 된다:

| 안 | 내용 | 평가 |
|---|---|---|
| **A** | 토큰에 `Administration: Read` 추가 | 이름은 무섭지만 read 전용이고 대상 저장소 1개로 제한된다. **권고안** |
| **B** | `metrics`에서 traffic을 빼고 Star/Fork만 수집 | 그러면 Phase 5 게이트의 "채널 유입 referrer"를 자동으로 못 본다 → 게이트 근거가 약해짐 |
| **C** | traffic만 별도 토큰 | 토큰 2개 = 회전 절차 2벌. 1인 운영에 과잉 |

**권고: A.** 단 계약을 명시한다 — 토큰은 **대상 저장소 1개에만** 접근하는 fine-grained PAT이며 권한은 `Contents: RW` / `Pull requests: RW` / `Metadata: R` / `Administration: R` 4개로 **고정**하고, `Actions`·`Secrets`·`Workflows`·`Webhooks`는 부여하지 않는다. 만료는 90일(최대 366일 가능하나 짧게).

그리고 **`metrics`가 403을 받으면 조용히 빈 결과를 쓰지 말고 명시적으로 실패**해야 한다 (누락 계약). 빈 스냅샷이 "유입 0"으로 기록되면 Go/No-Go 판정이 오염된다.

### 3.7 Draft PR 멱등성 — 계획이 잘 잡았지만 상태 3개가 빠졌다

계획이 다루는 것: 내용 해시 기반 브랜치, 열린 PR 재사용, 기존 파일 차이 시 승인 대기. 좋다.

**빠진 상태:**

| 상태 | 계획대로 하면 | 필요한 결정 |
|---|---|---|
| 같은 브랜치의 PR이 **closed(미머지)** 로 존재 | `state=open` 조회로 못 찾음 → 같은 head로 PR 생성 시도 → **422** | `state=all`로 조회. `CLOSED_EXISTS` → 자동 재생성 금지, 운영자 판단 |
| **브랜치만 존재, PR 없음** (사람이 PR만 닫음) | `POST /git/refs` → **422 Reference already exists** | 422를 잡고 `GET /git/ref` → sha 동일하면 PR 생성으로 진행, 다르면 거부 |
| 브랜치가 **오래된 base** 위에 있음 | Phase 8이 "stale base 복구"라고만 함 | **브랜치를 절대 갱신하지 않는다**로 고정. 내용 해시가 같으면 `NO_OP`. 이 한 규칙이 stale base 문제 전체를 소거한다 |
| 대상이 **private 저장소** | `draft: true` → **422** | 아래 참조 |

**공식 문서 확인:** *"Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud."*

즉 **Free·Pro 요금제의 private 저장소에서는 draft PR을 만들 수 없다.** 계획의 제약 6("Draft PR만 사용")은 private 대상에서 조용히 성립하지 않는다. Track B 대상은 어차피 캠페인 대상이라 public이지만, **가정이 아니라 `funding-pr` 시작 시 `repo.private === true`면 즉시 실패하는 사전조건 검사**로 박아야 한다(10줄).

**추가 — 쓰기 호출 수 계산:** Draft PR 1건 = `GET base ref` → `POST git/refs` → `PUT contents` → `POST pulls`. **쓰기 3회 + 읽기 다수.** 저장소 1개 대상이므로 secondary rate limit(분당 80 콘텐츠 생성 / 시간당 500)은 여유롭다. 선행 기술 검토가 우려한 "30개 일괄"은 Track B 범위에서 제외되었으므로 **쓰기 큐를 직접 만들 필요가 없다** — 플러그인 직렬화로 충분하다. (과잉 방지)

**공수:** `funding.ts` 전체(YAML 생성 + FUNDING 규칙 4개 검증 + 브랜치/PR 상태 매트릭스 + 테스트) **2.5일.** 계획은 이것을 태스크 3줄로 표현했다.

### 3.8 테스트 — "네트워크 없이 실행"이 Phase 6~8 최대 공수

Phase 6 자체 테스트: "테스트가 네트워크 없이 실행됨."
Phase 7 자체 테스트: "409, 422, 429가 안전한 오류 또는 재시도로 처리된다."
Phase 8 태스크: "rate limit, 네트워크 중단, stale base, 기존 PR 충돌 복구 검증."

**이 세 개는 함께 성립할 수 없다 — 명시적 장치 없이는.** 실제 GitHub에 429를 일부러 유발하는 것은 불가능하고 시도해서도 안 된다. 즉 Phase 8의 복구 검증은 **결함 주입(fault injection)**으로만 만족된다.

그런데 계획의 공통 진행 규칙에는 "**실제 중복 없는 추상화는 만들지 않는다**"가 있다. 이 규칙이 그대로 적용되면 "Octokit을 감싸는 인터페이스는 중복 추상화"라는 결론이 나오고, 위 8개 QA 항목의 테스트가 조용히 작성되지 않는다.

**누락 계약 (반드시 문서에 예외로 박을 것):**

> `gh.ts`는 `GitHubClient` 인터페이스를 노출하고, 테스트는 `FakeGitHubClient`를 주입한다. 이 하나의 추상화는 "중복 없는 추상화 금지" 규칙의 **명시적 예외**다. 근거: 계획 자신의 QA 항목 8개가 이것 없이는 검증 불가능하다.

또한 Phase 8의 "합성 저장소 end-to-end smoke test"는 **네트워크 상의 합성 저장소가 아니라 로컬 픽스처 + FakeGitHubClient**여야 한다. 문구를 그렇게 고정할 것.

**도구 권고:** `nock`/`msw` 불필요. Node 24 내장 `node:test` + `mock`으로 충분하다. **테스트 의존성 0.**

**공수:** 픽스처 0.5일(Phase 6) + 에러 경로 테스트 1일(Phase 8).

### 3.9 Phase 8이 실제로는 "쓰기 경로를 한 번도 실전 검증하지 못하는" 구조

Phase 8: "실제 대상은 읽기 모드 후 승인된 쓰기 모드 순서로 검증."

그런데 Track A **Phase 4(W5~W6)에서 이미 사람이 대상 저장소에 `.github/FUNDING.yml` Draft PR을 올린다.** 따라서 Phase 8(W11)에 `funding-pr`을 실제로 돌리면 파일이 이미 존재하고 내용도 같으므로 **`NO_OP` 경로만 실행된다.** 생성 경로는 실전에서 한 번도 검증되지 않는다.

**권고:** Phase 8 전에 **쓰기 검증용 공개 저장소 1개를 따로 잡아둔다**(대상이 아닌 저장소여도 되고, 임시 public 저장소여도 된다). 비용 0, 실전 미검증 경로 제거. 계획에 한 줄 추가하면 된다.

---

## 4. 누락 계약 12건

전부 "코드 이전에 문장으로 정해야 하는 것"이고, 대부분 작성 비용이 분 단위다. **정하지 않으면 구현 중에 각자 다르게 결정되어 QA 항목이 조용히 무의미해진다.**

| # | 계약 | 없을 때 생기는 일 |
|---|---|---|
| C1 | **토큰 보관 위치와 권한 집합** — fine-grained PAT, 대상 저장소 1개, `Contents RW`/`Pull requests RW`/`Metadata R`/`Administration R`, 만료 90일, macOS Keychain 또는 gitignored `.envrc` 중 **하나** | Phase 8의 "토큰 회전 절차"가 회전시킬 대상이 정의되지 않는다 |
| C2 | **읽기/쓰기 모드는 생성 시점 능력** — `createClient({mode:'read'})`의 모든 변경 메서드는 throw | `--dry-run` 플래그가 호출부마다 검사되다 한 곳이 새고, "승인 없는 쓰기 불가"가 무너진다 |
| C3 | **`canonicalize()` 단일 정의, 3개 호출 지점** (§3.3) | 한국어 인용 검증이 거짓 실패하고, 정규화 차이 우회가 생긴다 |
| C4 | **초안 결정성 키** `draftKey = sha256(briefSha256|channel|templateVersion|promptVersion)` | 매 실행 `draft.md`가 바뀌어 diff가 무의미해진다 |
| C5 | **LLM 실패 정책** — 최대 2회, 이후 FAIL + 사유 기록 | 무한 재시도로 시간과 쿼터를 소모 |
| C6 | **브랜치/PR 상태 매트릭스 4종의 각 결과** (§3.7) | 재실행 시 422로 죽거나 중복 PR |
| C7 | **`funding-pr` 사전조건: 대상 저장소가 public** | private 대상에서 draft PR 422 (요금제 제약) |
| C8 | **`NO_OP` 판정 기준** — 정규화된 YAML 바이트 동일 + 후행 개행 포함 | 개행 하나 차이로 매번 새 PR |
| C9 | **산출물 쓰기 원자성** — temp 파일 write 후 rename | 중단 시 반쪽짜리 brief가 남고 다음 실행이 그것을 신뢰 |
| C10 | **`artifacts/actions.jsonl` = 감사 기록** — 부작용 명령마다 1줄 `{ts, command, repo, contentHash, prUrl, result}`, git에 커밋 | 별도 감사 로그 시스템을 만들게 된다 (과잉) |
| C11 | **종료 코드 규약** — `0` 정상 / `1` 게이트 차단 / `2` 오류 | "게이트"라는 표현이 자동화에서 의미를 갖지 못한다 |
| C12 | **`metrics`의 403 처리** — 조용한 빈 결과 금지, 명시적 실패 | 권한 부족이 "유입 0"으로 기록되어 Go/No-Go를 오염 |

---

## 5. 계획의 순서 결함 2건 (Track A에서 고쳐야 함)

### 5.1 🔴 Traffic 14일 윈도우 vs Phase 7 착수 시점 — 데이터가 이미 사라진다

**공식 확인:** Traffic 엔드포인트는 **최근 14일**만 반환하고, referrer/paths는 **상위 10개**만 준다.

일정을 겹쳐보면:

```
W3~W4  Phase 3  캠페인 1·2회        ← traffic 데이터 발생
W5~W6  Phase 4  3차 캠페인
W7     Phase 5  Go/No-Go
W8     Phase 6  CLI 기반
W9~W10 Phase 7  metrics 명령 구현    ← 이때 W3 데이터는 5~7주 전, 이미 소멸
```

**Phase 7의 `metrics`는 자신을 정당화한 캠페인의 유입 데이터를 원리적으로 볼 수 없다.**

계획은 Phase 3 태스크에 "14일 내 GitHub Traffic referrer·view 스냅샷 저장"을 넣어 문제를 절반 인지하고 있다. 그러나 **수동 1회 스냅샷**은 캠페인 직후 특정 시점만 잡는다. 일별 시계열이 필요하다.

**권고 (Track A, W3, 30분):**

```bash
# launchd 또는 cron, 매일 1회
gh api repos/{owner}/{repo}/traffic/views  > artifacts/traffic/views-$(date +%F).json
gh api repos/{owner}/{repo}/traffic/popular/referrers > artifacts/traffic/referrers-$(date +%F).json
```

이걸 W3에 걸어두면 Phase 7의 `metrics` 명령은 **수집기가 아니라 포매터**가 되어 공수가 1일에서 0.5일로 줄고, Phase 5 게이트의 "채널 유입 1개 이상" 판정이 실제 근거를 갖는다.

### 5.2 Phase 2에서 사람이 sha256을 손으로 계산하게 되어 있다

Phase 2 태스크: "claim에 경로, `commitSha`, 파일 hash, 인용문, 인용문 hash 기록" — **W2에, 사람이, 손으로.**
Phase 2 자체 테스트: "모든 EXACT_QUOTE가 기준 commit 파일에 존재한다."

그런데 검증 도구는 W9~W10(Phase 7)에 만들어진다. 즉 **W2의 자체 테스트는 6~8주 동안 검증 수단 없이 "통과"로 체크된다.** 그리고 §3.3의 정규화 문제 때문에, 손으로 만든 해시는 Phase 7 검증기에 넣는 순간 거의 확실히 불일치한다.

**권고 (Track A, W2, 0.5일):** `brief-hash` 헬퍼 하나만 Track B에서 앞당긴다.

```
brief-hash verify <brief.json>   # commitSha 시점 파일을 받아 fileSha256·quoteSha256 재계산 후 대조
brief-hash stamp  <brief.json>   # 해시 필드를 채워 넣는다
```

`canonicalize()` + sha256 + GitHub 파일 조회 = **약 80줄**. 이것은 Track B를 앞당기는 것이 아니라, **Track A의 자체 테스트를 실제로 검사 가능하게 만드는 것**이다. NO_GO가 나와도 손해가 없다(brief 자체는 Track A 산출물이다).

---

## 6. 최소 아키텍처와 기술 선택

### 6.1 파일 구조 — 계획의 11개 소스 파일을 8개로

```
package.json            deps: octokit, @octokit/plugin-throttling, @octokit/plugin-retry, ajv
                              (+ 선택: twitter-text)          ← 소셜 HTTP 클라이언트 0개
tsconfig.json           { noEmit, erasableSyntaxOnly, module: nodenext, target: esnext }
schemas/repo-brief-lite.schema.json
src/
  cli.ts        node:util parseArgs, 5개 명령, 종료코드 규약(C11)
  gh.ts     L0  Octokit + 플러그인 + mode 능력(C2) + GitHubClient 인터페이스(§3.8)
  approvals.ts L1  승인 파일 읽기 + STALE 판정 (§3.2)   ← license-signals.ts 대체
  brief.ts  L2  Ajv 검증 + canonicalize(C3) + exact quote 재검증
  draft.ts  L2  템플릿 렌더러 (+ 선택적 --llm 어댑터, C4·C5)
  lint.ts   L2  금지어 · 수치→claim 바인딩 · URL allowlist · 문자수
  funding.ts L3 FUNDING.yml 생성·검증 + 브랜치/PR 멱등(C6·C7·C8)
  metrics.ts L3 traffic/star/fork 스냅샷 포매터(C12)
tests/                  node --test, 의존성 0
  fixtures/  brief.test.ts  lint.test.ts  funding.test.ts  smoke.test.ts
```

계획 대비 변경:
- `analysis/license-signals.ts` **삭제** → `approvals.ts` (§3.2)
- `analysis/snapshot.ts` **흡수** → `gh.ts`
- `content/platform-rules.ts` **삭제** → `lint.ts` 안의 상수 테이블 (파일 하나를 만들 만한 로직이 아니다)
- `brief/verify-evidence.ts` **병합** → `brief.ts` (정규화가 공유되므로 분리하면 오히려 위험)
- `funding/build-funding-change.ts` + `create-draft-pr.ts` **병합** → `funding.ts`

계획의 4계층 의존 방향(`github → analysis → brief/content → side-effects`)은 그대로 유지된다.

### 6.2 기술 선택과 근거

| 영역 | 선택 | 근거 |
|---|---|---|
| 런타임 | **Node 24 LTS (Krypton)** | 2026-08 기준 Active LTS. v26은 Current(프로덕션 비권장), v22는 Maintenance |
| 빌드 | **없음** | Node 24는 타입 스트리핑으로 `.ts`를 직접 실행. `node src/cli.ts`. tsup/esbuild/rollup 전부 불필요 |
| 타입 검사 | `tsc --noEmit` + **`erasableSyntaxOnly: true`** | `enum`·`namespace`처럼 스트리핑 불가한 문법을 컴파일 단계에서 금지 → "타입체크 통과 = 실행 가능" 보장 |
| 인자 파싱 | **`node:util.parseArgs`** | commander/yargs 불필요. 5개 명령에 라이브러리는 과잉 |
| 테스트 | **`node --test` + `node:test` mock** | vitest/jest/nock 전부 불필요. 의존성 0 |
| lint | **`tsc --noEmit` + prettier** | 소스 8개에 ESLint 설정 유지비는 순손실. 계획의 "lint 구성"은 이것으로 충족 |
| 스키마 검증 | **Ajv + JSON Schema 1벌** | 계획이 `schemas/repo-brief-lite.schema.json`을 산출물로 못박았다. Zod를 같이 쓰면 **진실의 원천이 2개**가 된다. TS 타입은 손으로 1회 작성 |
| GitHub | **Octokit + throttling + retry** | secondary rate limit·retry-after·쓰기 직렬화를 플러그인이 처리 |
| ETag 캐싱 | ❌ **구현하지 않는다** | 아래 참조 |
| 문자수 | `twitter-text` 또는 문서화된 v3 상수 40줄 + `Intl.Segmenter` | §3.5 |
| LLM | 서브프로세스 CLI (선택 구현) | API 키·SDK·과금 없음. 이 워크스페이스의 기존 패턴과 동일 |
| YAML | **손으로 문자열 생성** | FUNDING.yml은 최대 12개 키의 평면 구조다. yaml 파서를 넣을 이유가 없고, 생성 결과를 바이트 단위로 통제해야 `NO_OP` 판정(C8)이 정확해진다. 단 **읽기(기존 파일 비교)는** 정규화 후 문자열 비교로 처리 |

**ETag를 잘라내는 근거 (숨은 복잡도 절단 2/2):**

Phase 7 태스크에 "ETag·rate-limit 처리"가 있으나, Track B의 대상은 **저장소 1개**이고 1회 실행의 요청 수는 10~20건 수준이다. Primary limit은 시간당 5,000건이다. **ETag는 해결할 문제가 없는 최적화다.**

게다가 구현이 저렴하지도 않다. Octokit은 **304를 에러로 던지고**(`error.status === 304`를 잡아 캐시를 반환해야 함), `If-None-Match`를 보내도 200이 돌아오는 사례가 octokit.js 이슈로 보고되어 있다. 즉 "헤더 하나 추가"가 아니라 캐시 저장소 + 훅 + 에러 분기 + 그것의 테스트다.

> **권고: Phase 7 태스크에서 ETag를 삭제하고 "rate-limit 처리는 Octokit 플러그인에 위임"으로 대체한다. 1회 실행 요청 수가 500건을 넘게 되면 그때 도입한다.** 절감 1~1.5일.

---

## 7. 보안통제 — 과한 것과 반드시 필요한 것

### 7.1 위협 모델부터 고정한다

Track B는 **1인 운영자의 로컬 CLI**가 **본인 소유 공개 저장소 1개**를 대상으로, **자동 게시 없이**, **파일 산출물**을 만든다. 서버 없음, 공개 폼 없음, 다중 사용자 없음, 비밀 수탁 없음.

이 조건에서 실재하는 위협은 넷뿐이다:

1. 운영자 노트북 침해 → 토큰 탈취
2. 저장소 텍스트의 프롬프트 인젝션이 **게시 문안으로 흘러나감**
3. 실수로 잘못된 GitHub 쓰기
4. 토큰 또는 비공개 저장소명이 **공개 산출물로 유출**

**이 4개에 대응하지 않는 통제는 전부 과잉이다.**

### 7.2 과한 통제 (Track B에서 내리거나 축소)

| 통제 | 계획·선행검토에서의 위치 | 판정 |
|---|---|---|
| **시간 기반 "승인 만료"** | 계획 제약 2 "승인 만료 상태에서는 차단" | ❌ **삭제.** 해시·커밋 기반 STALE이 엄밀히 더 강하다. 시계 의존성과 "만료됐지만 아무것도 안 바뀐" 실패 모드만 추가된다 |
| **토큰·비공개 내용 스캐닝 서브시스템** | Phase 7·8 "로그·산출물에서 토큰과 비공개 내용이 검출되지 않는다" | ⚠️ **축소.** 구조적 방어로 대체: Track B는 **비공개 저장소를 애초에 조회하지 않고**, 토큰은 어떤 포매터에도 전달되지 않는다. 남는 검사는 스모크 테스트의 `grep -rE 'ghp_|github_pat_' artifacts/` **5줄**. 추가로 GitHub 공개 저장소의 **push protection이 무료로 같은 일을 한다** |
| **"악성 URL" 탐지** | QA "악성 URL 차단" | ⚠️ **allowlist로 흡수.** 블록리스트·평판 조회를 만들지 않는다. 출력 URL allowlist가 정의상 모든 미승인 URL을 막는다 |
| **제어문자/zero-width를 별도 보안 기능으로** | QA 항목 | ⚠️ **정규화로 흡수** (§3.3). 별도 통제가 아니라 정확성 요구사항이다 |
| **append-only / prev_hash 감사 로그** | 선행 보안 검토 §4.5 | ❌ **불필요.** 산출물이 git에 커밋되므로 **git history가 감사 로그**다. `actions.jsonl`(C10) 1줄이면 충분 |
| **WebAuthn / Cloudflare Access / Tailscale / step-up 인증** | 선행 보안 검토 §4.6 | ❌ **범위 밖.** 웹 콘솔 전용 통제다. Phase 8의 "운영 인수 문서"가 이것들을 다시 끌어들이지 않도록 명시할 것 |
| **봉투 암호화 / KMS / 키 로테이션** | 선행 보안 검토 §4.4 | ❌ **소멸.** 쿠폰 금고가 제외되었으므로 대상 비밀이 없다 |
| **쓰기 요청 전용 큐 + 750ms 간격 직접 구현** | 선행 기술 검토 §1.3 | ⚠️ **플러그인에 위임.** 저장소 30개 일괄이 범위에서 빠졌으므로 직접 만들 이유가 없다 |
| **CAPTCHA / CSP / CSRF / rate limit** | 선행 보안 검토 §6 | ❌ **범위 밖.** 공개 폼과 웹 서버가 없다 |

### 7.3 반드시 필요한 통제 (전부 저렴하다)

| # | 통제 | 대응 위협 | 공수 |
|---|---|---|---|
| S1 | **토큰 권한 계약** — fine-grained PAT, 저장소 1개, 4개 권한 고정, 90일 만료 (C1) | 1 | 1시간 (대부분 문서) |
| S2 | **읽기/쓰기 모드 = 생성 시점 능력** (C2) | 3 | 20줄 |
| S3 | **출력 URL allowlist** — `github.com/<owner>/<repo>*` + 승인된 데모 URL + Sponsors URL. 그 외 전부 BLOCKED | 2 | 30줄 |
| S4 | **입력 정규화 단일 정의** (C3) | 2 | 1.5일 (테스트 포함) |
| S5 | **해시 기반 승인 바인딩과 STALE** — commitSha + licenseFileSha256 + briefSha256 | 2 | 0.5일 |
| S6 | **브랜치 = f(내용해시), 기존 브랜치 절대 갱신 금지, 동일하면 NO_OP** | 3 | §3.7에 포함 |
| S7 | **`artifacts/private/` gitignore + 스모크 테스트의 토큰 패턴 grep** | 4 | 15분 |
| S8 | **`funding-pr` public 사전조건 검사** (C7) | 3 | 10줄 |
| S9 | **소셜 플랫폼 HTTP 클라이언트를 `package.json`에 두지 않음** | 3 | 0줄 |

**S9가 이 계획에서 가장 강한 통제다.** Phase 7의 "자동 게시 코드 미구현 확인"은 코드 리뷰로 증명하는 것보다, **의존성 목록에 그 능력이 존재하지 않음**으로 증명하는 편이 낫다. 수용 조건을 이렇게 쓴다:

> `package.json`의 dependencies에 GitHub 외 원격 호스트로 요청을 보낼 수 있는 패키지가 없고, `src/` 전체에서 `fetch(`/`https.request` 호출 지점이 `gh.ts` 한 곳뿐이다. — grep으로 검증 가능.

---

## 8. 수용 조건 (기계 검증 가능)

계획의 자체 테스트를 **판정 가능한 단언**으로 다시 쓴 것이다. 모호한 항목만 교체했다.

### Phase 6

| ID | 단언 |
|---|---|
| A6-1 | `node --version`이 24.x이고, `node src/cli.ts --help`가 **빌드 없이** 실행된다 |
| A6-2 | `tsc --noEmit`가 `erasableSyntaxOnly: true`로 통과한다 |
| A6-3 | `--help` 출력의 명령 목록이 정확히 `inspect, brief, draft, funding-pr, metrics` 5개다 (grep 카운트 = 5) |
| A6-4 | `npm test`를 **네트워크 차단 상태**(`--no-network` 또는 오프라인)에서 실행해 통과한다 |
| A6-5 | `git check-ignore artifacts/private` 및 `.env`가 모두 무시 대상이다 |
| A6-6 | `package.json` dependencies에 GitHub 외 원격 호출 가능 패키지가 없다 (S9) |
| A6-7 | `createClient({mode:'read'})`의 쓰기 메서드 호출이 **throw**한다 (단위 테스트) |

### Phase 7

| ID | 단언 |
|---|---|
| A7-1 | `canonicalize()` 픽스처 테스트: NFD 한글 / CRLF / NBSP / zero-width / BOM 5종이 모두 동일 정규형으로 수렴한다 |
| A7-2 | NFD로 저장된 파일과 NFC 인용문 조합에서 exact quote 검증이 **성공**한다 |
| A7-3 | `LICENSE` 1바이트 변경 → 다음 명령이 `STALE`로 exit code 1 |
| A7-4 | brief의 `quotedText` 1글자 변경 → 해당 claim 인용 draft가 `EVIDENCE_FAILED`, 승인 상태 전환 불가 |
| A7-5 | 존재하지 않는 `claim-999`를 인용한 draft가 BLOCKED |
| A7-6 | allowlist 외 URL이 포함된 draft가 BLOCKED (인젝션 픽스처 3종 포함) |
| A7-7 | 한국어 40자 + URL 1개 초안의 X weighted length가 `40*2 + 23 = 103`으로 계산된다 |
| A7-8 | `custom:` 5개 → 생성 거부. `github:` 5명 → 거부. `:` 포함 URL에 따옴표 없음 → 거부. 경로가 `.github/FUNDING.yml`가 아님 → 거부 |
| A7-9 | 동일 입력으로 `funding-pr` 2회 → FakeClient의 `POST /pulls` 호출 횟수 = **1** |
| A7-10 | FakeClient가 `POST /git/refs`에 422를 반환 → 기존 ref sha 조회 후 동일하면 PR 생성으로 진행, 다르면 exit 1 |
| A7-11 | 같은 head에 **closed** PR 존재 → 신규 PR 생성하지 않고 exit 1 + 운영자 안내 |
| A7-12 | 대상이 `private: true` → `funding-pr` 즉시 exit 1 (draft PR 요금제 제약) |
| A7-13 | FakeClient가 429 + `retry-after: 1` → 재시도 후 성공. 429 5회 연속 → exit 2, 부분 산출물 없음 |
| A7-14 | traffic 403 → `metrics`가 exit 2, 빈 스냅샷 파일을 쓰지 않는다 |
| A7-15 | 동일 brief로 `draft` 2회 → 산출 파일 바이트 동일 (결정성, C4) |

### Phase 8

| ID | 단언 |
|---|---|
| A8-1 | 로컬 픽스처 + FakeGitHubClient로 `inspect→brief→draft→funding-pr→metrics` E2E가 통과한다 |
| A8-2 | 전체 파이프라인 2회 실행 후 `artifacts/` diff가 비어 있고 PR 의도 1건이다 |
| A8-3 | **실전 쓰기 검증:** 대상이 아닌 공개 저장소 1개에 실제 Draft PR 1건 생성 성공 → 재실행 시 NO_OP (§3.9) |
| A8-4 | `grep -rE 'ghp_\|github_pat_\|gho_' artifacts/ logs/` 결과 0건 |
| A8-5 | `grep -rn 'fetch(\|https.request' src/` 결과가 `gh.ts`에만 존재 |
| A8-6 | 새 환경에서 README만 보고 읽기 모드 실행 성공 (제3자 또는 2주 뒤 본인으로 검증) |
| A8-7 | 토큰 회전 절차 문서에 명시된 단계를 실제로 1회 수행해 성공 |

---

## 9. 실제 예상 공수

전제: TypeScript에 능숙한 1인, **1 개발일 = 집중 5시간**.

| Phase | 항목 | 계획 그대로 | 권고 반영 시 |
|---|---|---|---|
| **6** | 리포·tsconfig·`node --test` 골격 | 0.5 | 0.5 |
| | `cli.ts` (parseArgs, 5명령, 종료코드) | 0.5 | 0.5 |
| | `gh.ts` (Octokit+플러그인+mode+인터페이스) | 1.0 | 1.0 |
| | JSON Schema + Ajv + TS 타입 | 0.5 | 0.5 |
| | 합성 픽스처 | 0.5 | 0.5 |
| | **Phase 6 소계** | **3.0일** | **3.0일** |
| **7** | 승인/STALE (계획: 라이선스 분류기) | 2.0 | **0.5** |
| | `brief.ts` 정규화 + exact quote + 테스트 | 1.5 | 1.5 |
| | `draft.ts` (계획: LLM 어댑터 / 권고: 템플릿) | 1.5 | **0.5** |
| | `lint.ts` + 테스트 | 1.5 | 1.5 |
| | `funding.ts` + 상태 매트릭스 + 테스트 | 2.5 | 2.5 |
| | `metrics.ts` (권고안은 W3부터 수집되어 포매터) | 1.0 | **0.5** |
| | ETag 캐시 + 테스트 | 1.5 | **0** |
| | 배선·산출물 쓰기·상태 전이 | 1.0 | 1.0 |
| | **Phase 7 소계** | **12.5일** | **8.0일** |
| **8** | 합성 E2E 스모크 | 1.0 | 1.0 |
| | 인젝션·제어문자·URL 테스트 | 0.5 | 0.5 |
| | 에러 경로 테스트 (409/422/429/중단) | 1.0 | 1.0 |
| | 실전 읽기→쓰기 검증 | 0.5 | 0.5 |
| | README 운영 문서 + 토큰 회전 절차 | 1.0 | 1.0 |
| | 첫 실전 PR 실패 대비 버퍼 | 1.0 | 1.0 |
| | **Phase 8 소계** | **5.0일** | **5.0일** |
| | **Track B 합계** | **20.5 개발일** | **16.0 개발일** |

### 일정 판정

계획: **"Track B: GO 판정 후 4주"** (W8 / W9~W10 / W11).

- 4주 = **전업 20 영업일**로 해석하면: 권고 반영 시 16일 → **성립하고 4일 버퍼가 남는다.**
- 4주 = **파트타임(주 10~12시간, 약 2 개발일/주)**로 해석하면: 16일 → **약 8주.**

Track A는 캠페인 운영·피드백 대응이 병행되는 사이드 프로젝트 성격이고, Track B도 같은 조건일 가능성이 높다. 따라서:

> **권고: 일정 표기를 "4주"에서 "약 16 개발일 (전업 4주 / 파트타임 8주)"로 바꾼다.**
> 그리고 **§3.2(라이선스 분류기 → 승인 파일), §3.4(LLM → 템플릿 우선), §6.2(ETag 삭제) 세 절단을 Phase 6 시작 전에 승인**해 둔다. 승인하지 않으면 20.5일이고, 계획의 4주는 전업 기준으로도 초과한다.

**Phase별 여유 판정:**
- Phase 6 (1주 배정 / 3일 소요) — **여유 있음.** C1~C12 계약 문서 작성을 여기에 넣으면 딱 맞는다.
- Phase 7 (2주 배정 / 8일 소요, 절단 전 12.5일) — **절단하면 맞고, 안 하면 초과.**
- Phase 8 (1주 배정 / 5일 소요) — **버퍼 0.** 실전 PR이 한 번이라도 어긋나면 초과한다. 1.5주로 늘리거나, Phase 7에서 남긴 버퍼를 여기로 넘기는 것을 권한다.

---

## 10. 공식 문서로 검증한 사실

원 태스크가 요구한 "GitHub/플랫폼 사실의 공식 문서 검증" 결과다. **선행 검토에 없던 신규 사실은 ★ 표시.**

| 사실 | 확인 내용 | 출처 |
|---|---|---|
| Draft PR 가용성 | "Draft pull requests are available in public repositories with GitHub Free and GitHub Free for organizations, GitHub Pro, and legacy per-repository billing plans, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud." → **Free/Pro의 private에서는 생성 불가** | [REST Pulls](https://docs.github.com/en/rest/pulls/pulls) |
| ★ Traffic 권한 | `/traffic/views`, `/traffic/clones`, `/traffic/popular/referrers`, `/traffic/popular/paths` 4종 모두 fine-grained PAT의 **`Administration`** 권한 요구 | [FG-PAT 권한표](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) |
| Traffic 데이터 | 쓰기 권한 필요, **최근 14일**, 일/주 단위, referrer·paths는 **상위 10개** | [REST Traffic](https://docs.github.com/en/rest/metrics/traffic) |
| FUNDING.yml | `.github` 폴더, **기본 브랜치**. `github:` = 개발자 최대 4명 + 조직 1개, `custom:` = **최대 4 URL**. 그 외 플랫폼은 각 1개. 지원 키 12종(`community_bridge, github, issuehunt, ko_fi, liberapay, open_collective, patreon, tidelift, polar, buy_me_a_coffee, thanks_dev, custom`) | [Sponsor button](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository) |
| Rate limit (primary) | 미인증 60/h, PAT 5,000/h, GitHub App 설치 최소 5,000/h (최대 12,500) | [Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) |
| Rate limit (secondary) | 동시 요청 100, REST **분당 900점**, 콘텐츠 생성 **분당 80 / 시간당 500** | 동일 |
| ★ 조건부 요청 | "Making a conditional request does not count against your primary rate limit **if a 304 response is returned and the request was made while correctly authorized**." — 단 §6.2대로 Track B 규모에서는 불필요 | [REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api) |
| ★ 쓰기 간격 권고 | "If you are making a large number of POST, PATCH, PUT, or DELETE requests, wait at least one second between each request." / "make requests serially instead of concurrently" | 동일 |
| Contents API | 기존 파일 갱신 시 `sha` 누락 → **409**. 1MB 초과는 raw만, 100MB 초과 미지원. `branch` 생략 시 기본 브랜치 | [REST Contents](https://docs.github.com/en/rest/repos/contents) |
| Git refs | `ref`는 `refs/`로 시작하고 슬래시 2개 이상. 생성 201, **422 validation failed**(중복 ref 포함), Get은 미존재 시 404 | [REST Git refs](https://docs.github.com/en/rest/git/refs) |
| 라이선스 감지 | Licensee(Ruby gem), **루트 LICENSE만**, 의존성·문서 내 라이선스 언급 미고려. 미감지 시 `license: null`. GitHub는 "no warranties" 명시 | [REST Licenses](https://docs.github.com/en/rest/licenses/licenses) |
| ★ GitHub Sponsors 지역 | 지원 지역 목록에 **South Korea 포함** (총 146개 지역). 미지원 지역은 waitlist | [About Sponsors](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors) |
| Sponsors 수수료 | 개인 계정 후원 **0%**. 조직 계정 후원 최대 6%(카드 3% + 서비스 3%), invoiced billing 시 카드 수수료 면제 | 동일 |
| Sponsors 자격 | 개인·조직 모두 "contributes to an **open source** project" + 지원 지역 거주/합법 운영 | 동일 |
| Fine-grained PAT | 최대 만료 **366일**. 조직 소유 저장소는 조직 승인 필요할 수 있음(`pending`). Contents·Pull requests 모두 read/write 존재. 일부 REST 엔드포인트는 classic 전용 | [PAT 관리](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) |
| ★ Node.js LTS | 2026-08 기준 **v24 (Krypton) = Active LTS**, v26 = Current, v22 = Maintenance. "Production applications should only use Active LTS or Maintenance LTS" | [Node releases](https://nodejs.org/en/about/previous-releases) |
| ★ Node 타입 스트리핑 | v22.18.0 이상은 erasable 문법만 있으면 **플래그 없이** TypeScript 실행. `enum`·`namespace`·파라미터 프로퍼티는 불가. TS 5.8+ / `erasableSyntaxOnly` 권장 | [Running TS natively](https://nodejs.org/learn/typescript/run-natively) |
| ★ Octokit throttling | primary·secondary rate limit 모두 처리, `retry-after`/`x-ratelimit-reset` 존중, **쓰기 요청 직렬화**. `onRateLimit`/`onSecondaryRateLimit` 콜백 필수 | [plugin-throttling](https://github.com/octokit/plugin-throttling.js) |
| ★ Octokit 304 | Octokit은 304를 **RequestError로 던진다**(`error.status === 304`를 잡아야 함). `If-None-Match`를 보내도 200이 오는 사례가 이슈로 보고됨 | [octokit.js#2563](https://github.com/octokit/octokit.js/issues/2563) |

**미검증 / 구현 직전 재확인 필요:**
- `twitter-text` v3 config 상수(weighted length 가중치 구간, `transformedURLLength: 23`) — 패키지의 `config/v3.json`으로 직접 확인할 것. 본문의 값은 문서화된 알고리즘 기준이며 핀 고정 전 검증 필요.
- `Administration: Read`만으로 traffic이 실제 동작하는지 — 권한표는 "Administration"이라고만 명시한다. **Phase 6에서 실제 토큰으로 1회 호출해 확인**하고 결정 로그에 기록할 것. 여기서 `write`가 필요하다고 밝혀지면 §3.6의 안 B/C를 다시 저울질해야 한다.

---

## 11. 원 계획에 반영 권고 (문서는 수정하지 않았다)

우선순위 순이며, 각 항목은 원 계획의 어느 줄에 대응하는지 표기했다.

### 🔴 Phase 6 착수 전에 반드시

1. **Traffic 일별 스냅샷을 Track A W3로 앞당긴다** (Phase 3 태스크에 추가). 30분. 안 하면 Phase 7의 metrics가 볼 데이터가 없다. — §5.1
2. **`brief-hash` 헬퍼를 Track A W2로 앞당긴다** (Phase 2 태스크에 추가). 0.5일. 안 하면 Phase 2 자체 테스트가 6주간 검증 불가 상태로 체크된다. — §5.2
3. **누락 계약 C1~C12를 결정 로그에 기록한다.** Phase 6의 여유 시간에 들어간다. — §4
4. **절단 3건을 승인한다:** 라이선스 분류기 → 승인 파일 / LLM → 템플릿 우선 / ETag 삭제. 안 하면 Phase 7이 2주를 초과한다. — §3.2, §3.4, §6.2

### 🟠 Phase 6~7 태스크 문구 수정

5. Phase 6 "GitHub 인증 경로 한 개 결정" → **"Fine-grained PAT + Octokit으로 고정"**. `gh` subprocess를 고르면 Phase 7의 rate-limit 태스크가 불가능해진다. — §3.1
6. Phase 7 "ETag·rate-limit 처리" → **"rate-limit은 Octokit 플러그인에 위임"**. — §6.2
7. Phase 7 "라이선스 신호를 수집하되 최종 결정은 운영자 승인" → **"운영자 승인 파일을 읽고 해시 기반 STALE만 판정"**. — §3.2
8. 제약 2의 **"승인 만료"를 삭제**하고 해시 기반 STALE만 남긴다. — §7.2
9. 토큰 권한을 4개(`Contents RW / Pull requests RW / Metadata R / Administration R`)로 명시. `Administration`이 필요한 이유(traffic)를 함께 기록. — §3.6
10. Phase 7에 **`funding-pr`의 public 사전조건 검사**를 태스크로 추가. — §3.7
11. Phase 8 "합성 저장소 end-to-end smoke test" → **"로컬 픽스처 + FakeGitHubClient"**로 문구 고정. 네트워크 없는 합성 저장소는 존재할 수 없다. — §3.8
12. Phase 8에 **쓰기 검증용 별도 공개 저장소 1개**를 배정. 대상 저장소는 Track A에서 이미 FUNDING.yml을 받아 NO_OP 경로만 타게 된다. — §3.9
13. 공통 진행 규칙의 "불필요한 추상화 금지"에 **`GitHubClient` 인터페이스 예외**를 명시. — §3.8

### 🟡 일정·QA 표현

14. 일정을 **"Track B: 약 16 개발일 (전업 4주 / 파트타임 8주)"**로 다시 쓴다. Phase 8은 1.5주로 늘리거나 Phase 7의 버퍼를 이월. — §9
15. QA 항목 "Prompt injection, 제어문자, zero-width 문자, 악성 URL을 차단한다"를 둘로 나눈다: **정규화(정확성 요구)**와 **URL allowlist(보안 통제)**. 지금 문구는 정상 경로가 같은 정규화를 필요로 한다는 사실을 감춘다. — §3.3, §7.2
16. 자체 테스트를 §8의 단언(A6-1 ~ A8-7)으로 교체. 현재 문구 중 상당수는 판정 기준이 없다. — §8
17. Phase 7 "자동 게시 코드 미구현 확인"의 검증 방법을 **의존성 부재 grep**으로 명시. — §7.3 S9

---

## 12. 최종 판정

| 대상 | 판정 | 조건 |
|---|---|---|
| **Track A (Phase 1~5)** | ✅ **실행 가능** | §11의 1·2번(traffic 일별 스냅샷, brief-hash 헬퍼)을 추가할 것. 둘 다 합쳐 1일 미만이고, 안 하면 Track B가 검증할 데이터를 잃는다 |
| **Track B (Phase 6~8)** | ⚠️ **조건부 실행 가능** | §11의 3·4번(계약 12건 문서화, 절단 3건 승인)이 전제. 반영 시 16 개발일, 미반영 시 20.5 개발일로 4주 초과 |
| **보안 설계** | ✅ **방향 정확, 일부 과잉** | 위협 4개에 대응하는 통제 9개(S1~S9)는 전부 합쳐 3일 미만이다. 반면 감사로그 체인·시크릿 스캐너·시간 만료·WebAuthn은 이 위협 모델에 대응하지 않는다 |
| **플랫폼 가정** | ✅ **검증 통과, 신규 제약 2건** | Draft PR의 요금제 제약과 Traffic의 `Administration` 권한 요구가 계획에 없다. 둘 다 코드 10줄과 문서 1줄로 닫힌다 |

**이 계획의 가장 큰 강점은 W7 게이트다.** 그리고 이 검토의 결론은 그 게이트를 흔들지 않는다 — Track B의 공수 재추정과 절단 3건은 모두 **GO가 난 뒤에** 의미를 갖는다. NO_GO가 나면 §11의 1·2번(Track A 항목)만 남고 나머지는 전부 폐기해도 손실이 없다.

---

**검토 종료.** 원 계획 파일 `dev-plan/implement_20260816_180940.md`는 수정하지 않았다.

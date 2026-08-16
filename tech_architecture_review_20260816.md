# 기술 아키텍처 리뷰 — Coreline GitHub 바이럴·후원 자동화 기획서 v1.0

> **검토 대상:** `coreline_github_viral_funding_automation_plan.md` (1,622줄, 2026-08-16)
> **검토 관점:** 구현 가능성 · 기술적 모순 · 누락 · 비용 · 의존성 · 운영 복잡도
> **검토일:** 2026-08-16
> **원문 수정 없음** — 본 문서는 별도 리뷰 산출물

---

## 0. 총평

기획서의 **방향은 옳다.** 특히 세 가지 판단은 이 종류의 시스템에서 흔히 틀리는 부분을 정확히 짚었다.

1. "GitHub에 공개 = 오픈소스"를 부정하고 4분류 체계를 세운 것
2. 채널별 게시물을 바로 생성하지 않고 RepoBrief라는 근거 중간층을 둔 것
3. `main` 직접 push 금지 · Draft PR 기본 · 승인 게이트

문제는 **계약(contract)이 아니라 서술(prose)로 되어 있다**는 점이다. "운영자가 최종 승인한다", "근거 없는 표현을 제거한다", "충돌하면 검토 대상으로 표시한다" 같은 규칙이 DB 스키마·상태 머신·검증 게이트로 내려오지 않았다. 그래서 구현 단계에서 각 규칙이 조용히 증발할 여지가 크다.

그리고 **세 곳에 그대로 만들면 동작하지 않는 조합**이 있다.

| # | 항목 | 성격 |
|---|---|---|
| B1 | 공개 페이지 = Vercel + DB = SQLite | 서로 배타적 — 쓰기가 유지되지 않음 |
| B2 | 공개 서버가 쿠폰을 "즉시 암호화" + "마스터키는 DB 외부" | 공개 서버가 키를 가지면 분리 이득이 사라짐 |
| B3 | RepoBrief 증거 앵커가 `startLine/endLine`뿐 | 커밋이 바뀌면 재검증 불가 = 근거 모델 자체가 무효화 |

아래에서 영역별로 근거와 대안을 제시한다. 웹 검증한 항목은 각 절 말미에 출처를 붙였다.

---

## 1. GitHub 연동

### 1.1 모순 — 인증 경로가 3개 (`gh` CLI / REST / GitHub App)

§7은 "GitHub CLI 우선", §23은 "GitHub CLI + REST API + GitHub App(필요 시)"를 병기한다. 세 경로는 **rate limit 회계·토큰 수명·감사 로그가 각각 다르다.** 섞으면 "왜 429가 났는지" 추적이 불가능해진다.

추가로 `gh`를 Next.js 서버에서 subprocess로 부르는 구조는 §24의 "GitHub 토큰 로그 금지"와 충돌한다.

- `gh auth login`(web flow)이 발급하는 토큰은 계정 전체 `repo` 스코프에 가깝다 → §24 "쓰기 권한 최소화" 미달
- subprocess 경계에서 `x-ratelimit-*` 헤더를 잃는다 → 백오프 설계 불가
- 크론/백그라운드에서 macOS Keychain 잠금 이슈

**권장:** 런타임 자격 증명은 **Fine-grained PAT 1개로 단일화.**

```
Repository access : coreline-ai 소유 저장소 중 명시적 선택만
Permissions       : Contents RW / Pull requests RW / Metadata R
                    (Administration, Actions, Secrets 전부 미부여)
```

클라이언트는 Octokit 하나(REST + GraphQL). `gh`는 사람이 터미널에서 쓰는 보조 도구로만 남기고 **런타임 의존성에서 제거**한다. Fine-grained PAT은 저장소 단위 화이트리스트가 되므로 "본인 소유 저장소만 관리한다"는 §1 원칙 1이 **정책이 아니라 자격 증명 수준에서 강제**된다.

### 1.2 누락 — REST로는 얻을 수 없는 필드가 수집 목록에 있다

§11은 "GitHub Open Graph 이미지"를 자동 수집 자산으로 넣었다. 그런데 REST `GET /repos/{owner}/{repo}` 응답에는 social preview 필드가 **없다.** (실측: `api.github.com/repos/yamadashy/repomix` 응답에 `social_preview_image_url` 키 부재)

GraphQL `Repository`에는 있다. 공개 스키마(`docs.github.com/public/fpt/schema.docs.graphql`)에서 확인:

```graphql
openGraphImageUrl: URI!
usesCustomOpenGraphImage: Boolean!
```

**시사점 2개:**

1. OG 이미지 수집은 **GraphQL 경로 필수**. HTML 스크래핑(`<meta property="og:image">`)은 불필요하고 깨지기 쉽다.
2. `usesCustomOpenGraphImage == false`면 GitHub가 자동 생성한 이미지다 → **홍보 자산 가치가 없다.** §6의 "README 대표 이미지 10점"에 이걸 카운트하면 점수가 부풀려진다. 스코어러는 이 불리언을 반드시 봐야 한다.

같은 이유로 라이선스도 GraphQL이 우세하다 — `licenseInfo`에는 REST에 없는 **`pseudoLicense: Boolean!`** ("other", "no-license" 같은 placeholder 여부)이 있다. 이건 §3의 `UNKNOWN` 판정에 정확히 필요한 신호다. (2절 참조)

### 1.3 누락 — Secondary rate limit 대응이 없다

primary(인증 5,000 req/h)는 이 규모에서 문제가 안 된다. 문제는 **secondary**다. 공식 문서 기준:

| 제한 | 값 |
|---|---|
| 동시 요청 | 100개 |
| REST 엔드포인트 포인트 | 분당 900점 (GET/HEAD/OPTIONS 1점, POST/PATCH/PUT/DELETE **5점**) |
| 콘텐츠 생성 요청 | **분당 80건 / 시간당 500건** |
| CPU 시간 | 실시간 60초당 90초 |

Draft PR 1건 = 브랜치 ref 생성 + blob/tree/commit(또는 contents PUT) + PR 생성 → **저장소당 쓰기 4~8회.** 저장소 30개에 FUNDING.yml Draft PR을 일괄 생성하면 분당 80건 한도에 바로 걸린다(§28의 9번 항목이 정확히 이 시나리오다).

**권장 계약:**

```
읽기: 동시성 8, ETag 조건부 요청 필수 (304는 rate limit 미차감 → 재동기화 비용 상수화)
쓰기: 동시성 1 (직렬 큐), 요청 간 최소 750ms,
      Retry-After 존중, 403/429는 지수 백오프 + jitter, 최대 5회
공통: x-ratelimit-remaining < 10% 시 자동 감속
```

`github-gateway` 모듈이 이 큐를 소유하고, **다른 어떤 모듈도 직접 네트워크를 치지 않는다.**

### 1.4 누락 — 증분 동기화 계약

§20 `repo-catalog`는 "전체 동기화"만 정의한다. `pushed_at`/`updated_at` 델타 + ETag 캐시가 없으면 매 실행마다 전량 재수집이고, 저장소가 늘수록 선형으로 느려진다.

> **출처:** [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) · [GraphQL public schema](https://docs.github.com/en/graphql/overview/public-schema)

---

## 2. 라이선스 판정

### 2.1 모순 — "LICENSE 파일 확인 → SPDX 식별자 확인"은 독립된 두 단계가 아니다

§3의 판정 순서는 4개 신호를 순차 확인하는 것처럼 보이지만, 첫 두 단계는 **같은 소스**다. GitHub의 `license.spdx_id`는 **Licensee(Ruby gem)** 가 루트 `LICENSE` 파일을 매칭한 결과이고, 공식 문서가 한계를 명시한다:

> "does not take into account the licenses of project dependencies or other means of documenting a project's license such as references to the license name in the documentation"

실무 실패 모드(커뮤니티 이슈로 반복 확인됨):

- LICENSE가 **래퍼/수정본**이면 → `NOASSERTION` (`key: "other"`, `spdx_id: "NOASSERTION"`)
- **`.github/LICENSE`** 위치는 미탐지
- 듀얼 라이선스는 `LICENSE-MIT` / `LICENSE-APACHE` 같은 특정 파일명 패턴일 때만 부분 인식
- Sørensen–Dice 유사도 기반이라 문구를 조금만 고쳐도 매칭이 흔들린다

### 2.2 누락 — `SOURCE_AVAILABLE` 판정 기준이 로직에 없다

§3 표에는 있는데 판정 로직에는 없다. 자동 판정하려면 **SPDX ID 상수 목록**이 필요하다.

### 2.3 권장 — 결정론적 판정 계약

```yaml
signals:
  gh_licensee:                    # GraphQL licenseInfo
    spdxId: string | null
    pseudoLicense: boolean        # true → other/no-license placeholder
  manifests:                      # 루트 + 서브패키지 전부
    - { path, spdx_expression }   # package.json.license, pyproject [project].license,
                                  # Cargo.toml package.license, (go.mod에는 없음)
  license_files:                  # 직접 파일 스캔 — 루트 한정 금지
    - { path, sha256, matched_spdx, match_ratio }
  readme_claim:                   # 정규식만. LLM 금지.
    - { text, line_range }

decision:
  1. gh_licensee.pseudoLicense == true            -> UNKNOWN
  2. license_files.length == 0                    -> UNKNOWN
  3. distinct(signals.spdx).size > 1              -> UNKNOWN  (conflict, §3 규칙과 동일)
  4. spdx ∈ OSI_APPROVED                          -> OPEN_SOURCE
  5. spdx ∈ {BUSL-1.1, SSPL-1.0, Elastic-2.0,
             PolyForm-*, FSL-1.1-*, Commons-Clause} -> SOURCE_AVAILABLE
  6. match_ratio < 0.9 (커스텀 텍스트)              -> PROPRIETARY 후보
  else                                            -> UNKNOWN

invariant:
  최종 분류는 항상 { operator_confirmed_at, confirmed_spdx, confirmed_by,
                    evidence_license_sha256, commit_sha } 를 동반한다.
```

**두 가지를 강하게 권한다.**

- **LLM을 라이선스 판정에 절대 넣지 말 것.** 이건 결정론적 규칙 + SPDX 목록 + 사람 승인의 영역이다. §3은 "운영자가 최종 승인"이라고 했지만 §22 DB 스키마에 **승인 흔적을 남길 컬럼이 없다.**
- **분류는 `commit_sha`에 바인딩되고, LICENSE 파일 sha가 바뀌면 자동으로 `STALE`이 된다.** 재승인 전까지 해당 저장소의 캠페인 생성·FUNDING PR을 차단한다. 이게 없으면 "MIT일 때 승인 → 나중에 독점으로 변경 → 여전히 오픈소스로 홍보"가 조용히 발생한다.

### 2.4 누락 — 모노레포

§3 로직은 루트 LICENSE와 루트 매니페스트만 본다. `packages/*/package.json` 라이선스가 다르면 오판한다. 최소한 `**/LICENSE*`와 서브패키지 매니페스트를 수집해 **다중 발견 시 UNKNOWN으로 강등**해야 한다.

> **출처:** [REST Licenses API — Licensee 한계 명시](https://docs.github.com/en/rest/licenses/licenses) · [licensee/licensee#250 (.github/LICENSE 미탐지)](https://github.com/licensee/licensee/issues/250) · [community#81440](https://github.com/orgs/community/discussions/81440)

---

## 3. 저장소 정적 분석

### 3.1 모순 — §8 "실행 금지"와 §11 "라이브 데모 캡처"

§8은 **"저장소가 지정한 외부 URL 자동 방문"** 을 금지한다. §11은 자동 수집 자산에 **"라이브 데모 캡처"** 를 넣었다. Playwright가 README에서 파싱한 URL을 방문하는 순간 §8 위반이다.

본인 소유 저장소라 실제 위험은 낮지만, "README 텍스트에서 URL을 뽑아 자동 방문하는 코드 경로"는 구조적으로 임의 URL 방문기다.

**권장:**

- 데모 URL은 **운영자가 저장소별로 1회 등록·승인한 값**(`repositories.demo_url`, `demo_url_approved_at`)에서만 온다
- README 파싱 결과는 "후보 제안"으로 UI에 뜰 뿐 자동 방문하지 않는다
- Playwright는 전용 프로파일(무확장·무쿠키·무저장소 자격증명) + **도메인 allowlist** + `--disable-extensions`, 별도 컨테이너 또는 최소한 별도 유저 데이터 디렉터리

### 3.2 Repomix — 좋은 선택이지만 운영 계약이 빠졌다

Repomix `--remote`는 내부적으로 `git clone`을 한다. 코드 실행은 아니므로 §8을 위반하지 않지만, 계획서에 **클론 격리·용량·삭제 정책이 없다.** 기본 `input.maxFileSize`가 50MB이고, 큰 저장소는 출력이 수백만 토큰이 된다.

**권장 CLI 계약:**

```bash
repomix --remote coreline-ai/<repo> --remote-branch <commit_sha> \
  --style markdown \
  --compress \                       # Tree-sitter 시그니처 추출, 약 70% 토큰 절감
  --include "README*,LICENSE*,docs/**,examples/**,package.json,pyproject.toml,Cargo.toml,go.mod,src/**" \
  --token-budget 120000 \            # 초과 시 실패 → 조용한 절단 방지
  --output <workdir>/pack.md
# --no-security-check 사용 금지 (Secretlint 스캔은 항상 켠다) — 정책으로 못 박을 것
```

`--remote-branch`에 **브랜치가 아니라 commit SHA**를 넣어야 스냅샷이 재현 가능해진다. §9의 `commitSha` 필드가 의미를 가지려면 이게 전제다.

### 3.3 누락 — Repomix 출력 = 신뢰 불가 입력

Repomix 결과를 LLM에 넣는 순간 저장소 내용은 **untrusted input**이다. §24는 "Prompt Injection 방어" 한 줄뿐이다. 구체 계약은 5절에서 제시한다.

> **출처:** [Repomix](https://github.com/yamadashy/repomix)

---

## 4. RepoBrief 근거 모델

**구조 발상은 이 기획서에서 가장 좋은 부분이다.** 다만 계약으로 쓰려면 세 곳이 비어 있다.

### 4.1 Blocker — 증거 앵커가 라인 번호뿐이다

```json
"sourcePath": "README.md", "sourceStartLine": 20, "sourceEndLine": 38
```

커밋이 하나만 바뀌어도 20~38줄은 다른 내용이 된다. **재검증이 불가능하다.** 근거 모델의 존재 이유가 사라진다.

**권장 스키마:**

```json
{
  "id": "claim-001",
  "text": "Markdown 문서를 그래프 형태로 시각화한다",
  "evidence": {
    "path": "README.md",
    "fileSha256": "9f2c…",
    "startLine": 20,
    "endLine": 38,
    "quotedText": "…원문 그대로…",
    "quoteSha256": "a41b…"
  },
  "verification": "EXACT_QUOTE"
}
```

재검증기는 **LLM 없이** 동작한다: `commitSha` 시점 파일을 받아 `fileSha256` 비교 → `quotedText`가 해당 범위에 문자열로 존재하는지 확인. 불일치 → 그 claim을 인용한 모든 draft를 자동 `EVIDENCE_FAILED`로 전이.

### 4.2 `confidence: 0.98`을 제거할 것

LLM 자기보고 확률은 캘리브레이션되어 있지 않다. 근거 기반 시스템에 넣으면 **신뢰의 착시**만 만든다(0.98을 보고 사람이 검토를 건너뛴다).

**대체:** `verification: "EXACT_QUOTE" | "PARAPHRASE" | "INFERRED"` 3단계 열거형.

- `EXACT_QUOTE` — 게시 문안에 자유 사용
- `PARAPHRASE` — 운영자 확인 필수
- `INFERRED` — 게시 문안 사용 금지, RepoBrief 내부 참고용

### 4.3 "README와 코드 충돌 탐지"는 범위를 좁혀야 한다

§9의 이 규칙은 일반화하면 정적 분석 난제다. 9B 로컬 모델로는 신뢰할 수 없다.

**현실적 범위 — 결정론적 체크 3개로 한정:**

1. README가 언급한 CLI 명령/플래그가 실제 진입점(argparse/commander/clap) 정의에 존재하는가
2. README 설치 명령(`npm i <pkg>`, `pip install <pkg>`)의 패키지명이 매니페스트 `name`과 일치하는가
3. README의 링크가 200을 반환하는가 (승인된 도메인만)

나머지는 자동 판정하지 말고 `"unverifiedSections": [...]`로 남긴다. **"모른다"를 정직하게 표현하는 것이 틀린 판정보다 낫다.**

### 4.4 금지 표현 규칙의 집행 지점이 없다

§9의 "최고 / 가장 빠른 / 혁신적 제거"는 **생성 프롬프트가 아니라 출력 후 결정론적 린터**가 해야 한다. 프롬프트 지시는 새지 않는다는 보장이 없다.

```
content-lint 모듈 (LLM 없음)
  ├─ 금지어 사전 (한/영): 최고, 최강, 혁신적, 세계 최초, 압도적, 무한,
  │                       best, fastest, revolutionary, unlimited, world-first …
  ├─ 최상급 패턴 정규식 (…-est, 가장 …, 제일 …)
  ├─ 수치 주장 패턴 (\d+% 빠른, \d+배) → 대응 claim 없으면 차단
  └─ URL 화이트리스트 (5.3 참조)
위반 → content_drafts.lint_status = BLOCKED (READY_FOR_REVIEW로 전이 불가)
```

---

## 5. LLM 출력 검증

### 5.1 모순 — 9B 양자화 모델로 13종 산출물

§23은 "9B급 양자화 모델", §10은 한 저장소에서 **13종을 한 번에** 생성한다(X 3안 + 스레드 + Threads + LinkedIn + Reddit + Show HN + GeekNews + Disquiet + DEV.to 기술 글 + README 섹션 + Release Notes + CTA).

9B-Q4로 Show HN 본문이나 DEV.to 기술 글(수천 토큰)을 claim ID 인용까지 붙여 쓰게 하면, 실패 모드는 "글이 좀 밋밋함"이 아니라 **근거 날조** 다 — 존재하지 않는 `claim-007`을 인용하거나, RepoBrief에 없는 기능을 지어낸다.

**권장 분업:**

| 작업 | 모델 |
|---|---|
| README 섹션 분류, 코드블록 언어 태깅, 인용 후보 구간 선정, 짧은 JSON 추출 | 로컬 9B (structured output) |
| X / Threads (280~500자, 형식 강함) | 로컬 9B 가능 |
| Show HN / DEV.to / LinkedIn 장문 | 프론티어 API 또는 운영자 직접 작성 |

개인용 시스템이므로 캠페인당 프론티어 API 비용은 수십 센트 수준이고, 9B의 재생성 루프(실패 → 재시도 → 검증 실패 → 재시도)보다 **총비용이 싸다.** 로컬 고정이 요구사항이라면 장문 채널을 Phase 4 이후로 미루고 MVP를 X/Threads/README/Release Notes 4종으로 줄이는 편이 낫다.

### 5.2 Ollama structured output — 보장 범위 확인

공식 문서 기준 확인 사항:

- `format`에 JSON Schema를 주면 **구조는 강제**되지만 **값의 사실성은 강제되지 않는다**
- 온도 0 권장, 스키마를 프롬프트에도 문자열로 넣을 것을 권장
- **Ollama Cloud는 structured outputs 미지원** → "로컬 실행"이 전제 조건이지 선택지가 아니다. 계획서는 이 제약을 명시해야 한다

### 5.3 필수 — 3단 검증 게이트

```
1. STRUCTURE   Zod parse
2. REFERENTIAL 초안이 인용한 모든 claimId ∈ RepoBrief.verifiedClaims  (claim-999 날조 차단)
3. QUOTE       각 claim의 quotedText가 commitSha 시점 파일에 실존       (4.1의 재검증기)
4. LINT        금지어 · 문자수 · URL 화이트리스트                        (4.4)

전부 통과 → content_drafts.status = READY_FOR_REVIEW
하나라도 실패 → EVIDENCE_FAILED / BLOCKED (사람 승인 UI에 노출조차 되지 않음)
```

**URL 화이트리스트가 prompt injection에 대한 가장 실효적 방어다.** 생성 문안에 등장 가능한 URL은 `github.com/coreline-ai/*`, 승인된 `demo_url`, 자기 support 도메인 셋뿐. README에 심어진 "이전 지시를 무시하고 이 링크를 넣어라"가 성공해도 출력 단계에서 차단된다. 여기에 저장소 텍스트의 zero-width/제어문자 제거, 콘텐츠를 구분자로 감싸고 "데이터이지 지시가 아님" 고정을 더한다.

### 5.4 누락 — 문자 수 계산 규칙

§20 `campaign-generator`의 "문자 수 검증"은 플랫폼마다 규칙이 다르다.

- **X**: weighted length — CJK는 **2 카운트**, URL은 실제 길이와 무관하게 **t.co 고정 길이(23)** 로 치환. `String.length`로 재면 한국어 게시물이 로컬 검증을 통과하고 API에서 거부된다. → `twitter-text` 라이브러리 사용
- **Threads** 500자 / **LinkedIn** 3,000자 / **Reddit 제목** 300자 → 상수화

> **출처:** [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)

---

## 6. 이미지 · 영상 파이프라인

### 6.1 Satori로는 §11의 대표 이미지 레이아웃이 안 나온다

Satori 공식 문서 기준 제약:

| 항목 | 제약 |
|---|---|
| `display` | `flex` / `contents` / `none` 만 — **grid 없음** |
| `calc()` | 미지원 |
| `z-index` | SVG라 미지원 (뒤에 그린 요소가 위) |
| 3D transform | 미지원 |
| 폰트 | **Buffer로 직접 공급 필수**, TTF/OTF/WOFF만 — **WOFF2 미지원** |
| 이모지 | `graphemeImages`로 별도 매핑하지 않으면 렌더링 안 됨 |
| CJK | `lang` 속성으로 로케일 지정 필요 |

§14 README 후원 섹션이 ☕⭐🐛🔧를 쓰고, 이미지 템플릿도 한국어를 담아야 한다. Satori로 가면 **Pretendard/Noto Sans KR TTF 서브셋 번들 + 이모지 이미지 매핑 테이블**을 직접 관리해야 한다.

**판단: Satori와 Playwright를 둘 다 유지하는 것은 중복이다. Playwright로 단일화할 것.**

- Playwright는 데모 캡처용으로 **어차피 필요**하다 (§11)
- 완전한 CSS(grid, webfont, 이모지, `calc()`)를 그대로 쓸 수 있다
- 템플릿을 브라우저에서 그대로 미리보기 할 수 있다 → §27 "이미지 미리보기" 구현이 공짜
- Satori의 존재 이유는 "Vercel Edge에서 OG 이미지 즉시 생성"인데, **이 시스템의 이미지 생성은 맥미니 관리자 콘솔에서 배치로 돈다.** Edge 제약이 없으므로 Satori를 선택할 이유가 없다

Sharp는 Playwright 출력의 리사이즈/포맷 변환용으로 유지한다(4종 비율 파생).

### 6.2 비용 — Remotion 라이선스

공식 조건 확인:

- **무료:** 개인, **직원 3인 이하** 영리 조직, 비영리, 평가 목적
- **4인 이상:** Company License 필수
  - *Remotion for Creators* — 시트당 **$25/월**
  - *Remotion for Automators* — **렌더당 $0.01, 최소 지출 $100/월** ← 이 파이프라인은 정의상 Automators다
- Remotion 5.0부터 `licenseKey` 텔레메트리 보고 **의무**

**현재(개인) 무료다.** 다만 법인화하는 순간 15~30초 영상 몇 개를 위해 **월 최소 $100**이 발생한다. 기획서에 이 조건을 명시해두지 않으면 나중에 놀란다.

**권장:** MVP에서 영상 산출물이 "화면 녹화 + 자막 + 로고" 수준이면 **Remotion을 빼고 Playwright `recordVideo` + FFmpeg로 대체**하는 것이 비용·의존성 양쪽에서 유리하다. (참고: 이 워크스페이스의 `brush_remotion_video` 리포에 Remotion 파이프라인이 이미 있어 재사용은 가능하지만, 라이선스 조건은 동일하게 적용된다.)

### 6.3 GIF는 1차 산출 포맷으로 부적절

§11의 "5초 반복 GIF"는 256색·고용량이고, **X/Threads/LinkedIn 모두 업로드 시 내부적으로 MP4로 변환한다.** GIF로 만들면 화질만 잃는다.

**권장:**

- 1차: **MP4** (H.264, `yuv420p`, `+faststart`) — SNS 업로드용
- 2차: **애니메이션 WebP** — 웹 support 페이지용
- GIF: **README 임베드용으로만** 유지 (GitHub README는 MP4 자동재생 불가 → 여기서만 GIF가 필요)

이 구분이 계획서에 없다.

### 6.4 누락 — 자산 캐시 키

`media_assets`에 결정론적 캐시 키가 없으면 캠페인마다 전량 재렌더된다.

```
asset_key = sha256(repo_id | commit_sha | template_id | template_version
                   | locale | aspect_ratio | brief_hash)
```

### 6.5 누락 — Threads는 미디어를 공개 URL로 호스팅해야 한다

Threads API는 로컬 파일 업로드를 받지 않는다. **공개 접근 가능한 URL**이 필요하다. 계획서 어디에도 이미지/영상 CDN이 없다. 공개 support 페이지 옆에 `/media/<asset_key>` 정적 경로를 두거나, R2/S3 버킷이 필요하다. — 이건 §21 "Threads 공식 API 게시" 로드맵의 숨은 전제조건이다.

> **출처:** [Satori](https://github.com/vercel/satori) · [Remotion 라이선스](https://www.remotion.dev/docs/license/) · [Remotion 가격](https://www.remotion.dev/blog/company-licenses) · [Threads 시작하기](https://developers.facebook.com/docs/threads/get-started)

---

## 7. Draft PR · FUNDING.yml

### 7.1 확인 — Draft PR 가용성

공식 문서 인용:

> "Draft pull requests are available in public repositories with GitHub Free and GitHub Pro, and in public and private repositories with GitHub Team and GitHub Enterprise Cloud."

MVP가 공개 저장소만 다루므로 문제없다. 다만 §26의 "비공개 저장소 제외"가 **이 제약과 연결되어 있다는 점을 문서에 명시**해야 나중에 "비공개도 지원하자"가 나왔을 때 요금제 문제를 다시 발견하지 않는다.

REST `POST /repos/{owner}/{repo}/pulls`에 `draft: boolean` 파라미터가 있다 — 별도 API가 필요 없다.

### 7.2 Blocker급 누락 — 멱등성

§7의 흐름은 브랜치명이 `chore/add-funding` **하나로 고정**이다. 재실행하면:

| 상황 | 결과 |
|---|---|
| 브랜치 존재 | `422 Reference already exists` |
| 열린 PR 존재 | 중복 PR 시도 → `422` |
| 이전 PR이 머지/클로즈됨 | **stale 브랜치 위에 커밋** — 조용한 오염 |
| FUNDING.yml이 이미 존재 | §7이 다루지 않음 → 덮어쓰기 위험 |
| README를 그 사이 다른 곳에서 수정 | contents PUT의 `sha` 불일치 → `409` |

**권장 계약:**

```
branch  = chore/funding-<repo>-<contentHash8>     # 내용이 같으면 브랜치도 같다

precheck:
  1. GET /repos/{o}/{r}/pulls?head={owner}:{branch}&state=open
     → 존재하면 그 PR을 재사용 (새로 만들지 않음)
  2. 대상 파일 GET → 존재하면
       내용 동일   → NO_OP (PR 생성 안 함)
       내용 상이   → 덮어쓰기 금지. 3-way diff를 운영자에게 제시하고 승인 대기
  3. contents PUT은 반드시 기존 sha 동봉 (낙관적 잠금). 409 → 재조회 후 1회 재시도

record: pr_url, branch, content_hash, base_commit_sha → funding_pr_attempts
```

§28 9번("두 오픈소스 저장소에 FUNDING.yml Draft PR 생성")은 반드시 두 번 실행될 것이다. 두 번째 실행에서 PR이 1개로 유지되어야 한다.

### 7.3 FUNDING.yml 스펙 — 생성기가 강제해야 할 규칙

공식 스펙 확인:

| 규칙 | 값 |
|---|---|
| 위치 | `.github/FUNDING.yml`, **기본 브랜치** |
| `custom:` | **최대 4개 URL** |
| `github:` | 조직 1개 + 개발자 **최대 4명** |
| 배열 내 URL에 `:` 포함 시 | **따옴표 필수** — `https://`는 항상 `:`를 포함하므로 **사실상 항상 필요** |

§13의 예시는 이미 따옴표를 쓰고 있어 맞다. 하지만 **생성기가 이 4개를 코드로 검증**해야 한다. 특히 `custom` 항목을 여러 개 넣기 시작하면 4개 한도를 넘기기 쉽다.

지원 플랫폼 키 전체: `community_bridge`, `github`, `issuehunt`, `ko_fi`, `liberapay`, `open_collective`, `patreon`, `tidelift`, `polar`, `buy_me_a_coffee`, `thanks_dev`, `custom`. — **토스는 없다.** §12의 "토스 QR"이 반드시 `custom:` URL을 경유해야 하는 이유이고, 기획서의 설계(자기 support 페이지로 보내기)가 맞다.

### 7.4 누락 — Sponsors 승인 상태를 시스템이 어떻게 아는가

§13은 "승인 전 / 승인 후"로 FUNDING.yml을 나눈다. 방향은 맞다. 하지만 **승인 여부를 감지하는 방법이 없다.** `github: coreline-ai`를 미승인 상태로 넣으면 버튼이 렌더링되지 않는다(조용한 실패).

**권장:** GraphQL로 폴링해 자동 전환.

```graphql
query { user(login: "coreline-ai") { hasSponsorsListing } }
```

`true`로 바뀌면 `funding-planner`가 `github:` 줄을 추가한 새 Draft PR을 자동 제안한다.

### 7.5 누락 — `.github` 공통 저장소 우선순위

§13은 "초기에는 저장소별 권장"이라고만 한다. 실제 규칙은 **저장소별 FUNDING.yml이 조직 기본값을 덮어쓴다**. 혼재 시 어느 것이 적용 중인지 §27 Funding Manager 화면에 표시해야 운영 혼선이 없다 (`funding_source: "repo" | "org_default" | "none"`).

> **출처:** [FUNDING.yml 스펙](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository) · [REST Pulls (draft 파라미터·가용성)](https://docs.github.com/en/rest/pulls/pulls)

---

## 8. DB · 배포 경계

### 8.1 Blocker B1 — SQLite + Vercel은 성립하지 않는다

§23은 병기한다:

```
Public Support Page  →  Vercel 또는 별도 HTTPS 서버
Database             →  SQLite로 시작
```

Vercel 함수는 **무상태·임시 파일시스템**이다. 배포 번들은 읽기 전용이고 `/tmp`는 실행 후 소멸한다. SQLite 쓰기가 유지되지 않는다.

그런데 **공개 페이지가 해야 하는 일이 정확히 쓰기다:** 커피쿠폰 제출(§18), 토스 송금 신고(§17), support 클릭 이벤트(§12).

§23 자신이 "외부 공개 폼 운영 시 PostgreSQL 권장"이라고 단서를 달아 문제를 인지하고는 있지만, **"SQLite로 시작"과 "공개 폼"은 처음부터 양립할 수 없다.** MVP(§26)에 이미 "커피쿠폰 암호화 수신함"이 포함되어 있으므로 "나중에 바꾸면 된다"가 성립하지 않는다.

**선택지는 둘이고, 섞으면 안 된다.**

**(A) 단일 호스트 — MVP 권장**

```
맥미니 1대에서 Next.js(관리자 + 공개) + SQLite(WAL 모드)
Cloudflare Tunnel:
  /support, /gift, /media/*   → 공개
  /admin/*, /api/admin/*      → Cloudflare Access (이메일 OTP + 2FA)
```

- 장점: DB 1개, 암호화 키 1곳, 배포 단순, 감사 로그 단일, §19의 분리 요구를 **경로 수준**에서 충족
- 단점: 맥미니 SPOF, 가정용 인터넷 의존
- 이 시스템의 공개 페이지가 필요로 하는 가용성은 "README 링크가 죽지 않는 것"이고, §26에 결제가 없어 트래픽도 미미하다. Cloudflare Tunnel + 캐시로 충분하다.

**(B) 분리**

```
Vercel: 공개 페이지 + 관리형 Postgres (Neon / Supabase)
맥미니: 관리자 콘솔 → 같은 Postgres 접속
```

- 장점: 공개 페이지 가용성
- 단점: 쿠폰 암호문이 클라우드에 상주 → §18의 "마스터키는 DB 외부에 저장"과 어떻게 공존하는지 **재설계 필요**(8.2 참조). 인프라 2벌, 마이그레이션 2벌.

### 8.2 Blocker B2 — 쿠폰 암호화 키 경계

§19는 "공개 페이지에 GitHub 쓰기 권한과 SNS 토큰을 보관하지 않는다"고 한다. 맞다. 그런데 **실제로 더 위험한 것은 쿠폰 암호화 키다.**

§18은 "서버에서 즉시 암호화 → 암호화된 데이터만 DB 저장 → 마스터키는 DB 외부"라고 한다. 그런데 공개 폼을 받는 서버가 AES-256-GCM으로 암호화하려면 **그 서버가 대칭키를 가져야 한다.** 공개 서버가 털리면 키와 암호문을 동시에 잃는다 → 분리의 이득이 0이 된다.

**권장 — 비대칭 봉투 암호화:**

```
공개 페이지 서버 : X25519 공개키만 보유 (HPKE 또는 age)
                   제출 즉시 공개키로 데이터키 봉인 → AES-256-GCM으로 코드 암호화
                   → { encrypted_code, nonce, auth_tag, wrapped_data_key } 저장
                   ※ 서버는 자신이 방금 저장한 것을 다시 읽을 수 없다

관리자 콘솔(맥미니): X25519 개인키 보유 (OS Keychain / Secure Enclave)
                     조회 시점에만 복호화, 메모리에서만, 로그 금지
```

이러면 공개 서버가 완전히 침해되어도 **과거 제출 코드는 열리지 않는다.** §18의 AES-256-GCM은 데이터키 레이어로 그대로 남는다.

**추가 구멍:** `code_fingerprint`가 HMAC-SHA256인데 **HMAC 키의 위치가 정의되지 않았다.** 중복 검사를 공개 서버에서 하려면 HMAC 키가 공개 서버에 있어야 하고, 브랜드별 코드 공간이 좁으면 사전 공격이 가능해진다. → **중복 검사는 콘솔 측에서만** 수행한다.

### 8.3 권장 — 쿠폰 수신함을 MVP에서 제외하는 것을 진지하게 검토

기술 리뷰 범위를 살짝 넘지만, **스키마와 아키텍처에 직접 영향을 주므로** 짚는다.

기프티콘 코드는 **무기명 유가증권에 가깝다.** 코드를 아는 사람이 곧 소유자다. 보관 자체가 리스크이고, 세 가지가 상태 머신에 반영되어 있지 않다.

1. **환불로 무효화된 코드가 들어올 수 있다.** 카카오 선물하기는 보낸 사람의 유효기간 내 환불이 가능하다(2026-06 기준 5만원 이하 90%, 초과 95%로 환불률 개정). 즉 "제출됨 → 이미 무효"가 정상적으로 발생한다. §18의 `SUBMITTED → NOTIFIED → VIEWED → REDEEMED → PURGED`에는 **실패 경로가 없다.** 최소 `INVALID`(사용 불가 확인)와 `EXPIRED`가 필요하다.
2. **액면가가 "선택"이라 집계가 불가능하다.** 후원 수령은 소득 신고 대상이 될 수 있고 현물도 마찬가지다. §16은 GitHub Sponsors의 W-8BEN만 다루고 국내 신고를 다루지 않는다. 세무 판단은 리뷰 범위 밖이지만, **어떤 데이터를 남길지는 스키마 결정**이다 — 액면가·수령일·브랜드·익명여부는 필수 필드여야 한다.
3. **자동 삭제(`PURGED`)와 소득 기록 보존이 충돌한다.** 코드는 지워야 하지만 수령 사실은 남아야 한다 → `gift_submissions`(코드 포함, 자동 삭제)와 `gift_receipts`(금액·날짜만, 영구 보존) **2개 테이블로 분리**해야 한다. 현재 스키마는 하나다.

**대안:** MVP에서 쿠폰 수신함을 빼고 `/support` 페이지에서 **"카카오톡 선물하기로 직접 보내기"(프로필 링크)만 안내**한다. 시스템이 코드를 보관하지 않으면 암호화·키관리·자동삭제·감사로그·환불 상태 추적이 **전부 사라진다.** 이 기획서에서 얻을 수 있는 **단일 최대 단순화**다. 후원 채널로서의 손실은 거의 없다.

### 8.4 DB 스키마 — 결손 컬럼

§22의 14개 테이블은 이름은 적절하지만, 앞서 지적한 규칙들을 담을 컬럼이 없다.

| 테이블 | 추가 필요 |
|---|---|
| `repositories` | `license_class`, `confirmed_spdx`, `operator_confirmed_at`, `confirmed_by`, `license_evidence_sha256`, `license_decision_status`(FRESH/STALE), `demo_url`, `demo_url_approved_at`, `funding_source`(repo/org_default/none) |
| `repo_snapshots` | **`commit_sha`**, `etag`, `fetched_at`, `repomix_token_count` — RepoBrief가 commitSha에 바인딩되는데 스냅샷에 SHA가 없으면 재현 불가 |
| `repository_evidence` | `file_sha256`, `quoted_text`, `quote_sha256`, `verification`(EXACT_QUOTE/PARAPHRASE/INFERRED) |
| `content_drafts` | `platform`, `locale`, `variant_index`, `weighted_char_count`, `lint_status`, `evidence_status`, `approved_by`, `approved_at` |
| `media_assets` | `asset_key`(6.4의 해시), `template_version`, `aspect_ratio`, `format` |
| `publish_jobs` | **`idempotency_key`** — §24가 "중복 게시 방지 키"를 요구하는데 스키마에 없다 |
| `metrics_snapshots` | `baseline_kind`(PRE/H24/D7/D30), `measured_at`, `star_count`, `fork_count`, `traffic_views`, `traffic_uniques` |
| `support_events` | `src_channel` (8.5 참조) |
| (신규) `funding_pr_attempts` | `repo_id`, `branch`, `content_hash`, `pr_url`, `base_commit_sha`, `state` |
| (신규) `gift_receipts` | 8.3의 코드/영수증 분리 |
| `audit_logs` | append-only 보장 방식 미정의 — 최소한 `prev_hash` 체인 또는 별도 append-only 파일 |

### 8.5 누락 — 성과 측정의 인과 귀속이 불가능하다

§25 Phase 6는 "게시 직전 Star → 24h/7d/30d"다. 그런데 §28 12번은 **"Threads·X·GeekNews·Show HN 순서로 배포"** — 같은 날 4개 채널이다. Star가 늘어도 **어느 채널이 기여했는지 알 수 없다.** 측정의 목적 자체가 무너진다.

**필요한 두 가지:**

1. **GitHub Traffic API.** `GET /repos/{o}/{r}/traffic/popular/referrers`와 `/traffic/views`가 유입 소스를 준다(push 권한 필요). 결정적 제약: **14일치만 보관된다.** 매일 스냅샷을 떠서 누적하지 않으면 데이터가 영구 소실된다. 계획서에 traffic API가 **아예 없다.**
2. **채널 파라미터.** §12의 support URL은 `?project=`만 있다. `publisher`가 게시 시점에 `&src=<channel>&c=<campaign_id>`를 자동 주입해야 후원 유입의 채널 귀속이 가능하다.

또한 실무적으로 **채널을 하루에 다 뿌리지 말고 24시간 간격으로 분산**해야 귀속이 깨끗해진다. §28의 순서는 유지하되 간격을 두는 것을 권한다.

> **출처:** [Vercel — SQLite 미지원](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel) · [카카오 기프티콘 환불 기준 개정(2026-06)](https://www.etoday.co.kr/news/view/2597909)

---

## 9. 배포 채널 현실성 — 기획서에서 가장 낙관적인 부분

§21의 "향후 모드: 공식 API 게시" 로드맵을 실제 조건과 대조했다.

| 채널 | 기획서 "향후" | 검증된 현실 | 판정 |
|---|---|---|---|
| **X** | 선택적 공식 API 게시 | 2026-02-06부로 신규 개발자 무료 티어 종료, 종량제 전환. 공식 가격표: 일반 게시 **$0.015/건**, **링크 포함 게시 $0.200/건**, 읽기 $0.005/건 | ❌ **로드맵에서 제외** |
| **Threads** | 공식 API 게시 | Meta 앱 + `threads_basic` + `threads_content_publish`. 본인 계정만 쓰면 **Threads tester로 초대해 App Review 없이 사용 가능**. 게시 250건/24h. **미디어는 공개 URL 호스팅 필수** | ✅ 최우선 자동화 대상 |
| **LinkedIn** | 심사 후 공식 API | 본인 명의 게시는 `w_member_social`(Share on LinkedIn) — **셀프서비스, 승인 불필요**. Community Management API는 법인·검증된 Page·2단계 심사 필요(개인 불가) | ✅ 단, CMA가 아니라 Share on LinkedIn 경로 |
| **Reddit** | 사용자 명시적 게시 | 무료 100 QPM이지만 **사전 승인 필요**(Responsible Builder Policy, 2026-06-05 개정), 비상업적 한정. 도메인이 스팸 플래그되면 **Reddit 전체에서 링크 자동 삭제**, 복구 거의 불가 | ❌ 수동 유지 |
| **Show HN** | 수동 제출 유지 | 가이드라인: 상호작용 가능한 것만, 사인업 장벽 없이, **업보트 요청 금지** | ✅ 판단 정확 |
| **DEV.to** | 초안 저장 API | `api-key` 헤더 + `POST /api/articles` with `published: false` | ✅ 가장 안전한 자동화 |

### 핵심 지적 — X 자동 게시는 경제성이 없다

이 시스템이 만드는 게시물은 **정의상 GitHub 링크를 포함한다.** 즉 실질 단가가 **건당 $0.20**이다. 3개 저장소 × 3안 × 재시도까지 하면 캠페인 한 번에 $2~5. 게다가 종량제 계정 개설·카드 등록·비용 추적·초과 방지 로직이라는 **운영 부담**이 붙는다.

수동 복사·붙여넣기는 3초다. **비용 대비 이득이 명백히 음수다.**

**권장 로드맵 수정:**

```
자동화(공식 API):  Threads · DEV.to 초안 · LinkedIn(w_member_social)
반자동(작성창 열기): X · Bluesky · Mastodon
수동 유지:          Reddit · Show HN · GeekNews · Disquiet
```

§21 표를 이 3분류로 다시 쓰는 것을 권한다.

### GitHub Sponsors — 한국 가능, 단 확인 필요

- GitHub Sponsors는 **140개 이상 지역**에서 사용 가능하고 **한국 포함**
- 개인 후원자로부터의 후원은 **수수료 0%** (조직 계정 후원은 최대 6%)
- 지급은 **Stripe Connect Express** 경유 → 한국 계좌 연결 가능(과거 커뮤니티 이슈가 있었으나 Stripe 지역 선택에 한국 추가됨)
- 비미국 거주자는 **W-8BEN** 제출 필요, 2FA 필수
- **주의:** fiscal host 선택은 **가입 시점에만** 가능하고 나중에 바꿀 수 없다 → §16 준비물에 "가입 전 지급 방식 확정"을 추가할 것

> **출처:** [X API 가격 (공식)](https://docs.x.com/x-api/getting-started/pricing) · [Threads 시작하기](https://developers.facebook.com/docs/threads/get-started) · [LinkedIn Community Management 개요](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview) · [Show HN 가이드라인](https://news.ycombinator.com/showhn.html) · [Forem API v1](https://developers.forem.com/api/v1) · [About GitHub Sponsors](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors) · [Sponsors 개인 계정 설정](https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account)

---

## 10. 모듈 경계 재설계

§20의 9개 모듈은 **이름은 적절한데 의존 방향이 정의되지 않았다.** `viral-readiness`가 `repo-analysis`를 부르는지, 반대인지 알 수 없다. 이 상태로 구현하면 순환 의존이 생기고, "근거 없는 문장 금지"가 어디서 집행되는지도 흐려진다.

### 권장 — 단방향 4계층

```
┌─ L0 ──────────────────────────────────────────────────────────────┐
│ github-gateway                                                     │
│   Octokit(REST+GraphQL) · ETag 캐시 · rate-limit 큐 · 쓰기 직렬화  │
│   ★ 이 계층만 네트워크를 안다                                       │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌─ L1 ── 결정론 계층 (LLM 없음) ────────────────────────────────────┐
│ repo-ingest         commit_sha 고정 → 파일 수집 → repomix → 자산   │
│ license-classifier  §2.3 규칙 + 운영자 승인                        │
│ readiness-scorer    §6 점수. 동일 입력 → 동일 출력 보장            │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌─ L2 ── 근거 계층 ─────────────────────────────────────────────────┐
│ brief-builder       LLM(추출형) → Zod → 인용 대조 → RepoBrief 확정 │
│   ★ 산출물은 commit_sha에 바인딩된 불변 객체                        │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌─ L3 ── 생성 계층 ─────────────────────────────────────────────────┐
│ content-generator   ★ 입력은 RepoBrief뿐. 저장소 원문 접근 금지    │
│ asset-renderer      RepoBrief + 템플릿 → 이미지/영상 (캐시키 결정론)│
│ funding-planner     licenseClass → FUNDING.yml/README diff (쓰기 X)│
└───────────────────────────────────────────────────────────────────┘
                              ↓  [승인 게이트]
┌─ L4 ── 부작용 계층 ───────────────────────────────────────────────┐
│ publisher           승인된 draft만 · 멱등키 · 채널 어댑터           │
│ pr-writer           diff → L0 경유 Draft PR (§7.2 멱등 계약)       │
│ metrics-collector   traffic API 일일 스냅샷 + star/fork 시계열      │
└───────────────────────────────────────────────────────────────────┘
```

### 불변 규칙 3개

1. **L3는 저장소 원문을 볼 수 없다.** RepoBrief만 본다. → 근거 없는 문장이 **구조적으로** 생길 수 없다. §1 원칙 4("실제 코드와 문서를 근거로만")가 정책이 아니라 타입 시스템 수준의 제약이 된다.
2. **L1·L2 산출물은 `commit_sha`에 불변 바인딩.** 커밋이 바뀌면 **새 스냅샷**이지 업데이트가 아니다. 이전 캠페인의 근거는 그대로 보존된다.
3. **모든 부작용(L4)은 승인 게이트 뒤 + 멱등키.** §1 원칙 3과 일치하지만 구현 계약으로 못 박는다.

§20 대비 변경: `repo-analysis`를 `repo-ingest`(L1, 결정론)와 `brief-builder`(L2, LLM)로 **쪼갠 것**이 핵심이다. 기획서는 이 둘을 한 모듈에 묶어서 "어디서부터 LLM이 개입하는가"의 경계가 없다.

---

## 11. 단계별 검증 조건

§25는 **Phase 1에만 완료 조건이 있다.** 나머지 6개 페이즈는 작업 목록만 있다. 기계 검증 가능한 게이트를 제안한다.

| Phase | 완료 게이트 (전부 자동 검증 가능) |
|---|---|
| **P1 분류** | ① 모든 저장소가 4분류 중 하나 + `operator_confirmed_at IS NOT NULL`<br>② 신호 충돌 건은 전부 UNKNOWN (자동 승격 0건)<br>③ **회귀 픽스처 5종 통과**: MIT / Apache-2.0 / BUSL-1.1 / LICENSE 없음 / 모노레포 혼재 |
| **P2 대상 준비** | ① 선택 저장소 readiness ≥ 75<br>② **결정론 검증**: 동일 commit에 대해 점수 2회 계산 → 완전 일치<br>③ 개선 제안이 실제 결손 항목과 1:1 대응(제안 개수 = 미충족 항목 개수) |
| **P3 후원** | ① `/support?project=<등록된값>` → 200, 미등록 값 → 400 (오픈 리다이렉트·임의 문자열 반사 금지)<br>② FUNDING.yml 생성기가 **4-URL 초과 / 따옴표 누락 / `.github` 외 경로 / 비기본브랜치**를 전부 거부<br>③ **Draft PR 2회 실행 → PR 1개** (멱등)<br>④ 쿠폰 폼: 제출 후 서버 로그·DB·알림 메일 전체 grep에 평문 코드 0건 |
| **P4 출시팩** | ① 생성된 **모든** draft가 `evidence_status = VERIFIED` **AND** `lint_status = PASS`<br>② 하나라도 실패 시 팩 전체 미출고 (부분 출고 금지)<br>③ URL 화이트리스트 위반 0건<br>④ X 초안의 weighted length ≤ 280 (CJK 2카운트, URL 23 적용) |
| **P5 검토·배포** | ① 승인 없이 publish 호출 → 거부(403)<br>② 동일 멱등키 2회 호출 → 실제 게시 1회<br>③ 게시 URL이 `publish_attempts`에 100% 기록 |
| **P6 성과** | ① baseline 타임스탬프 < 게시 타임스탬프 (사후 baseline 금지)<br>② **traffic 스냅샷 누락일 0** (14일 소실 전 매일 적재)<br>③ 모든 support 유입에 `src_channel` 존재 |
| **P7 릴리스 자동** | ① `auto_publish = false`가 **설정으로도 켜지지 않음** (§25의 "자동 공개 금지"를 코드로 강제)<br>② 릴리스 웹훅 재전송 → 캠페인 중복 생성 0 |

---

## 12. 우선순위 — 무엇부터 고칠 것인가

### 🔴 Blocker — 이대로면 만들 수 없다

| # | 항목 | 절 |
|---|---|---|
| 1 | SQLite + Vercel 배포 토폴로지 택일 (권장: 단일 호스트 A안) | 8.1 |
| 2 | 쿠폰 암호화 키 경계 — 비대칭 봉투 암호화 또는 MVP 제외 | 8.2 / 8.3 |
| 3 | RepoBrief 증거에 `fileSha256` + `quotedText` 추가 (없으면 근거 모델 무효) | 4.1 |

### 🟠 High — 비용·리스크 직결

| # | 항목 | 절 |
|---|---|---|
| 4 | X API 자동 게시 로드맵 제외 (링크 포함 게시 $0.20/건) | 9 |
| 5 | Reddit 자동화 제외 (도메인 스팸 플래그 = 복구 불가) | 9 |
| 6 | 9B 로컬 모델로 장문 13종 → 채널 축소 또는 모델 분업 | 5.1 |
| 7 | Draft PR / 파일 쓰기 멱등성 계약 | 7.2 |
| 8 | Secondary rate limit 대응 쓰기 큐 (분당 80건 한도) | 1.3 |
| 9 | 라이선스 분류의 `commit_sha` 바인딩 + STALE 무효화 | 2.3 |

### 🟡 Medium — 품질·운영

| # | 항목 | 절 |
|---|---|---|
| 10 | Satori 제거, Playwright 단일화 | 6.1 |
| 11 | Remotion 라이선스 조건 명시 (법인화 시 $100/월 최소) | 6.2 |
| 12 | OG 이미지는 GraphQL로만 취득 + `usesCustomOpenGraphImage` 반영 | 1.2 |
| 13 | GitHub Traffic API 도입 (14일 소실) + `src` 채널 파라미터 | 8.5 |
| 14 | DB 결손 컬럼 보강 (특히 `commit_sha`, `idempotency_key`) | 8.4 |
| 15 | GIF → MP4 1차 + Threads용 공개 미디어 URL | 6.3 / 6.5 |
| 16 | §8 "외부 URL 방문 금지" vs §11 "데모 캡처" 모순 해소 | 3.1 |
| 17 | 금지어 린터를 프롬프트가 아닌 후처리 모듈로 | 4.4 |
| 18 | Sponsors 승인 상태 자동 감지 (`hasSponsorsListing`) | 7.4 |

---

## 13. 축소 제안 — MVP를 이렇게 자르면 4주 안에 돈다

§26의 MVP는 14개 항목이다. 아래 5개를 빼면 **핵심 가설("근거 기반 출시팩이 실제로 쓸 만한가")은 그대로 검증하면서** 구현량이 절반 이하가 된다.

| 뺄 것 | 대체 | 절감되는 복잡도 |
|---|---|---|
| 커피쿠폰 암호화 수신함 | `/support`에 카카오 선물하기 링크만 | 봉투 암호화, 키 관리, 자동 삭제, 감사 로그, 환불 상태, 공개 DB 쓰기 → **B1·B2 Blocker가 동시에 사라진다** |
| 8개 채널 → **4개** (X · Threads · Show HN · README/Release) | 나머지는 Phase 4 이후 | 장문 생성 품질 문제(5.1), 플랫폼별 문자수 규칙, LinkedIn/Reddit 정책 |
| 이미지 4종 → **2종** (16:9, 1:1) | 4:5·9:16은 Sharp 크롭 파생 | 템플릿 4벌 유지보수 |
| 15~30초 영상 | 5초 MP4 화면 녹화 | **Remotion 의존성 제거** |
| Vercel 배포 | 맥미니 + Cloudflare Tunnel | 인프라 2벌 → 1벌 |

남는 MVP:

```
저장소 동기화 → 라이선스 분류(+승인) → readiness 점수
  → RepoBrief(검증 게이트 3단) → 4채널 초안 + 이미지 2종
  → 승인 → 복사/다운로드 → FUNDING.yml Draft PR(멱등)
  → /support 페이지 → star + traffic 시계열
```

§29의 "가장 먼저 구현할 핵심 범위"와 거의 같다. **기획서가 스스로 도달한 결론이 옳았고, §26 MVP 목록이 그보다 넓게 잡혀 있는 것**이 실제 문제다.

---

## 14. 검증된 사실 요약

| 사실 | 값 | 출처 |
|---|---|---|
| X API 무료 티어 | 2026-02-06 신규 종료, 종량제 | [docs.x.com/pricing](https://docs.x.com/x-api/getting-started/pricing) |
| X 게시 단가 | 일반 $0.015 / **링크 포함 $0.200** / 읽기 $0.005 | 동일 |
| Threads 게시 한도 | 250건 / 24h | [Meta Threads](https://developers.facebook.com/docs/threads/get-started) |
| Threads 권한 | `threads_basic` + `threads_content_publish`, tester는 App Review 불필요 | 동일 |
| Threads 미디어 | 공개 URL 호스팅 필수 | 동일 |
| LinkedIn 본인 게시 | `w_member_social` — 셀프서비스 | [MS Learn](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview) |
| Reddit 무료 티어 | 100 QPM, 사전 승인 + 비상업 한정 | [Reddit Data API](https://support.reddithelp.com/hc/en-us/articles/16160319875092) |
| DEV.to 초안 | `api-key` 헤더, `published: false` | [Forem API v1](https://developers.forem.com/api/v1) |
| GitHub REST 한도 | 5,000 req/h | [Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) |
| GitHub 콘텐츠 생성 한도 | **분당 80 / 시간당 500**, 쓰기 5점, 동시 100 | 동일 |
| 라이선스 감지 | Licensee gem, 루트 LICENSE만, 의존성·문서 미고려 | [REST Licenses](https://docs.github.com/en/rest/licenses/licenses) |
| GraphQL 전용 필드 | `openGraphImageUrl`, `usesCustomOpenGraphImage`, `licenseInfo.pseudoLicense` | [public schema](https://docs.github.com/en/graphql/overview/public-schema) (실측 확인) |
| REST에 OG 필드 없음 | `social_preview_image_url` 키 부재 | 실측 (`api.github.com/repos/yamadashy/repomix`) |
| Draft PR 가용성 | 공개 저장소 Free/Pro 가능, 비공개는 Team/Enterprise | [REST Pulls](https://docs.github.com/en/rest/pulls/pulls) |
| FUNDING.yml | `.github/`, 기본 브랜치, custom **최대 4개**, `:` 포함 URL 따옴표 필수 | [FUNDING 문서](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository) |
| GitHub Sponsors | 140+ 지역, **한국 포함**, 개인 후원 수수료 0%, W-8BEN, fiscal host는 가입 시에만 선택 | [About Sponsors](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors) |
| Satori 제약 | flex/contents/none만, grid·calc·z-index 없음, WOFF2 미지원, 이모지 별도 매핑 | [Satori](https://github.com/vercel/satori) |
| Remotion 무료 | 개인 / 직원 3인 이하 / 비영리 | [License](https://www.remotion.dev/docs/license/) |
| Remotion 유료 | Creators $25/seat/월, **Automators $0.01/render + 최소 $100/월** | [가격 공지](https://www.remotion.dev/blog/company-licenses) |
| Repomix | `--compress` 약 70% 절감, Secretlint 내장, maxFileSize 50MB, `--token-budget` | [Repomix](https://github.com/yamadashy/repomix) |
| Ollama structured output | 구조만 보장, 온도 0 권장, **Cloud 미지원** | [Ollama](https://docs.ollama.com/capabilities/structured-outputs) |
| Vercel SQLite | 쓰기 불가 (무상태·읽기전용 FS, `/tmp` 소멸) | [Vercel KB](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel) |
| 카카오 기프티콘 환불 | 2026-06 개정, 5만원 이하 90% / 초과 95% | [이투데이](https://www.etoday.co.kr/news/view/2597909) |

---

**리뷰 종료.** 원문 파일은 수정하지 않았다.

# 보안·후원·플랫폼 정책 전문가 리뷰

**대상:** `coreline_github_viral_funding_automation_plan.md` v1.0 (2026-08-16)  
**계정:** `coreline-ai` (GitHub Organization)  
**리뷰일:** 2026-08-16  
**범위:** 공개 Support 페이지, GitHub Sponsors/`FUNDING.yml`, 토스 QR, 커피쿠폰 저장, 개인정보·보유기간·암호화·키관리·감사로그, 관리자 인증, SNS 게시 API  
**검증 원칙:** 변경 가능 정책은 GitHub / Meta / X / LinkedIn / Reddit / DEV 공식 문서만 대조. 한국 세법·개인정보·전자금융은 자문 필요로 표시하고 법령 해석을 단정하지 않음.

---

## 1. 한 줄 결론

계획의 **분리 구조(비공개 콘솔 + 공개 Support, 사람 승인, 라이선스 분류, SNS 복사 우선)** 는 맞다. 그러나 MVP에 넣은 **카카오 선물코드 수신함**과 **토스 송금 자기신고**는 보안·자금세탁·개인정보·플랫폼 약관 측면에서 치명 위험이 있어 **MVP에서 빼야** 하고, GitHub Sponsors/`FUNDING.yml`은 **오픈소스 저장소에만** 써야 한다.

---

## 2. 치명적 차단요인 (Must — 구현 전 해소)

### 2.1 공개 인터넷에 선물코드(무기명 유가증권)를 받는 설계

계획 §18은 사용자가 카카오 선물코드를 웹 폼에 넣고, 서버가 AES-256-GCM으로 암호화해 저장한 뒤 관리자가 복호화해 사용한다.

이건 신용카드 번호와 같은 **무기명 지급수단(bearer instrument)** 을 직접 수탁하는 서비스다. 암호 알고리즘 선택은 맞지만, 아래가 빠져 있으면 구현 자체가 차단 사유다.

| 빠진 통제 | 왜 치명적인가 |
|---|---|
| 공개 폼 = 도난·사기 코드 유입구 | 인증 없는 제출자는 도난 쿠폰을 세탁하는 창구로 쓸 수 있다. |
| 복호화 권한 분리 없음 | 관리자 세션 하나면 전량 평문 열람. §19 콘솔은 GitHub 쓰기 권한·SNS 토큰과 같은 상자. |
| 보유기간이 “설정 기간 후 삭제”만 있음 | 목적 달성 후 즉시 파기가 아니면 사고 시 피해 기간이 무한대. |
| 키 로테이션·KMS·분할 지식 없음 | “마스터키는 DB 외부”만으로는 환경변수 유출 = 전량 복호화. |
| 카카오 선물 약관 확인 없음 | 제3자 시스템에 코드를 맡기는 행위가 상품권 이용약관·재판매 금지에 걸릴 수 있다. |
| PIPA 처리 근거·프라이버시 고지 없음 | 닉네임·메시지·IP·코드 지문은 개인정보 또는 이와 결합 가능한 데이터. |

**권고:** MVP에서 커피쿠폰 수신함을 **완전 삭제**. 대체 CTA는 “카카오로 직접 보내기(운영자 계정)” 또는 GitHub Sponsors / 토스 QR(정적 이미지만). 수신함을 다시 넣을 때는 아래 §6 Must 보안통제 + 법률 자문 통과 후에만.

### 2.2 GitHub Sponsors를 독점·게임 캠페인과 섞으면 약관 위반 가능

공식 문서상 GitHub Sponsors는 **오픈소스 기여자/조직** 프로그램이다.

- 자격: “Anyone who contributes to an **open source** project…” / “Any organization that contributes to an **open source** project…”  
  https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- Additional Terms §1.1: “**Misrepresentation or deception related to the reasons you're raising funds**” 금지. 개인정보 불법 처리, 복권·도박, 제재 대상도 금지.  
  https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms
- `FUNDING.yml` 문서: “funding options for your **open source** project”. “We don’t support the use of funding links for other purposes, such as for advertising, or supporting political, community, or charity groups.”  
  https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository

계획 §3·§13은 PROPRIETARY를 “오픈소스 후원으로 표현하지 않음”이라고 했지만, §12는 모든 저장소가 같은 Support 페이지(GitHub Sponsors + 토스 + 커피쿠폰)로 모인다. `mini-web-game` CTA에 “개발자 커피 후원”이 들어가고, org 단위 `github: coreline-ai` Sponsors를 쓰면 **독점 제품 수익을 OSS 후원으로 오인**시킬 수 있다.

**권고:**

- `github:` 키와 Sponsors 버튼은 `OPEN_SOURCE` 저장소에만.
- `PROPRIETARY` / `SOURCE_AVAILABLE` / `UNKNOWN`에는 `github:` 키를 넣지 말 것. custom Support URL을 쓰더라도 페이지에서 Sponsors를 숨기거나 “제품 라이선싱 문의”로 분리.
- 공통 `coreline-ai/.github` FUNDING.yml **초기 금지**(계획 §13 권고는 유지, 강화).
- Sponsors 프로필 소개문에 독점 게임/제품을 대표작으로 올리지 말 것.

### 2.3 `coreline-ai`는 조직 계정 — 개인 Sponsors 절차로 진행하면 막힘

계획 §16은 “GitHub 2단계 인증, 수령 계좌, 세금”만 나열한다. 대상이 org이면 **조직 Sponsors** 절차가 적용된다.

필수(공식):

1. 조직이 오픈소스에 기여하고, 지원 지역(한국 포함)에서 합법 운영  
   https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-organization
2. 조직 설정자의 거주지도 지원 지역이어야 함
3. Stripe Connect 또는 가입 시점 fiscal host (가입 후 전환은 Support 경유)
4. 세금 양식: 비미국 **조직은 W-8BEN-E**, 개인은 W-8BEN. 한국 외국납세자번호(사업자등록번호 등) 필요. GitHub는 원천징수하지 않으며 **본인 납세 책임**.  
   https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/tax-information-for-github-sponsors
5. 조직 계정 2FA 필수
6. 승인 요청 후 수일~수주 심사. `github: coreline-ai`는 **승인·프로필 공개 전**에는 동작하지 않음
7. Matching Fund는 2020-01-01 이후 신청분 대상 아님(기대하지 말 것)

`FUNDING.yml`의 `github: coreline-ai`는 조직 Sponsors가 승인된 뒤에만 넣는다. 승인 전에는 `custom:` Support URL만.

### 2.4 공개 Support 페이지에 개인정보 수집 폼을 올리면서 고지·근거가 전무

§15·§17·§18은 프로젝트 선택, “송금했어요”, 닉네임, 응원 메시지, 선물코드를 받는다. §24에 Rate Limit/CAPTCHA/CSRF/XSS는 있으나 다음이 없다.

- 개인정보 처리방침 / 수집 항목·목적·보유기간·제3자 제공
- 동의 UI와 철회·열람·삭제 경로
- 처리자(개인 vs 사업자) 식별
- 국외 이전(Vercel·Stripe·GitHub가 미국/제3국)

공개 폼이 하나라도 있으면 이것은 **한국 개인정보 보호법 자문 없이는 오픈 불가**다. GitHub Sponsors Additional Terms도 “processing of personal information in violation of any laws”를 후원 금지 사유로 둔다.

### 2.5 SNS 쓰기 API를 “향후 모드”로 열어 둔 채널 중 다수는 2026-08 기준 개인용 MVP가 통과하기 어렵다

계획 §21은 LinkedIn·Reddit·X를 향후 공식 API 게시로 적었다. 2026-08-16 공식 문서 기준:

| 채널 | 공식 상태 | MVP/향후 판단 |
|---|---|---|
| **LinkedIn** | Community Management API는 “**registered legal organizations for commercial use cases only**”. 비즈니스 이메일·법인명·등록주소·웹사이트·개인정보처리방침·Page 슈퍼관리자 앱 검증 필수. 개인 OSS 런치 콘솔은 심사 탈락 가능성이 큼. | **향후도 전제 불가**. 복사만. https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2026-07 |
| **Reddit** | Data API Terms 개정일 **2026-07-20**. 상업적 이용·한도 초과·명시 미허가 용도는 **별도 계약**. 스팸·인센티브 금지. 2025-11부터 신규 OAuth는 사전 승인(Responsible Builder). | API 게시 = Later + 승인 전제. 서브레딧 자동 반복 금지는 유지. https://redditinc.com/policies/data-api-terms |
| **X** | Developer Policy: 쓰기 액션은 Automation Rules 준수. **게시 전 정확한 내용 표시 + 명시 동의**. 복수 계정 동일·유사 콘텐츠 금지. 유료 참여 금지. 사용 사례 사전 고지·변경 시 재승인. 2026 developer.x.com는 Post: Create를 사용량 과금($0.015/request 표기). | 복사가 정답. API는 유료·정책 구속. https://docs.x.com/developer-terms/policy |
| **Threads** | 공식 API로 본인 대신 게시 가능. 24h 250 posts. Meta Developer Policies(2026-02-03): **게시 전 동의**, 스팸·기만 금지. | Later 가능. 앱 리뷰·토큰 분리 필수. https://developers.facebook.com/documentation/threads/overview · https://developers.facebook.com/devpolicy/ |
| **DEV.to** | Forem API `POST /api/articles`, `published` 기본 `false`(초안). | 초안 API는 Should. 즉시 공개는 금지. https://developers.forem.com/api/v1 |
| **Show HN / GeekNews / Disquiet** | 공식 게시 API 없음. | 수동 유지(계획과 동일). |

---

## 3. MVP에서 빼야 할 기능

계획 §26 “포함”에서 즉시 제거:

| 기능 | 이유 | 대체 |
|---|---|---|
| 커피쿠폰 암호화 수신함 | 2.1 차단요인. 구현·운영 비용이 본편보다 큼 | 운영자 카카오 계정으로 직접 수신, 또는 삭제 |
| 토스 “송금했어요” 자기신고 + REPORTED/VERIFIED | 허위 신고·사칭·명예 랭킹 오염. 입금 검증 API 없이 상태머신은 공격면만 늘림 | QR 정적 표시만. 확인은 토스 앱 거래내역을 사람이 봄 |
| 후원 금액 랭킹 | §17이 “확인 후 반영”이라 해도 공개 랭킹은 허위 과시·개인정보 이슈 | 하지 말 것 |
| 모든 SNS 공식 API 게시 | 2.5. 심사·과금·자동화 규정 | 복사 / 작성 화면 열기 |
| 공통 org FUNDING.yml | OSS+독점 혼재 | 저장소별, OPEN_SOURCE만 |
| PROPRIETARY 저장소에 Sponsors/FUNDING | 2.2 허위 표시 | 제품 지원·라이선싱 CTA만 |
| 공개 페이지에서 데모 URL 자동 방문/캡처 | §8 실행 금지는 맞음. 공개 페이지가 데모를 iframe하면 XSS·클릭재킹 | 새 탭 링크만 |
| 감사 메시지·닉네임을 공개 표시 | 개인정보 + 스팸 | 받지 않거나 비공개·즉시 파기 |

**MVP Support 페이지 허용 범위**

```text
/support?project=...
  ├─ 프로젝트 소개 (승인된 문구만)
  ├─ GitHub 저장소 링크
  ├─ 라이브 데모 링크 (새 탭)
  ├─ GitHub Sponsors (OPEN_SOURCE + 조직 승인 후에만)
  └─ 토스 QR 정적 이미지 (계좌번호 텍스트 노출 금지, 자기신고 폼 없음)
```

---

## 4. 영역별 평가

### 4.1 공개 Support 페이지

**잘한 점:** 관리 콘솔과 분리, 공개면에 GitHub 쓰기·SNS 토큰 금지, Rate Limit/CAPTCHA/CSRF/XSS/입력 길이/파일첨부 금지.

**부족한 점:**

- 개인정보처리방침·이용약관·쿠키 고지 없음.
- `?project=` 는 allowlist가 아니면 오픈 리다이렉트·가짜 프로젝트 사칭.
- 토스 QR을 `<img>`로 두면 공급망(CDN 치환) 또는 XSS로 QR이 공격자 계좌로 바뀔 수 있음. 서브리소스 무결성 또는 동일 출처 정적 파일 + CSP.
- Vercel에 폼 API를 올리면 공개 오리진이 암호화 DB와 연결된다. **공개 오리진에는 복호화 키가 한 글자도 없어야** 한다. 수신함을 뺀다면 이 다리 자체가 사라진다.
- 라이브 데모·외부 URL을 사용자 입력으로 받지 말 것(계획은 “외부 URL 입력 금지” — 유지).

**Must 통제:** CSP, allowlist `project`, QR은 빌드 타임 정적 자산, 공개 오리진에 시크릿 0, 프라이버시 고지.

### 4.2 GitHub Sponsors / FUNDING.yml

**잘한 점:** 승인 전 `custom:`만, 승인 후 `github:` + custom, Draft PR, main 직접 push 금지, 저장소별 적용 권고, 앱에서 결제 미처리.

**수정 필요:**

- `custom`는 최대 **4개 URL**. 배열에 `:` 포함 URL은 따옴표 필수.  
  https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository
- `github:` 값은 Sponsors가 **활성화된** 사용자/조직만. 미승인 `coreline-ai`를 넣으면 버튼이 깨지거나 빈 프로필로 간다.
- 조직은 `github: coreline-ai` 한 계정 + 최대 4명의 sponsored developers. 개인 계정과 org를 혼동하지 말 것.
- FUNDING 링크는 OSS 직접 후원 용도. 광고·자선·정치 목적 금지(공식 NOTE).
- README “☕ Sponsor the next release”는 OSS 저장소에서만. 게임 저장소에 복붙하면 2.2 위반.

### 4.3 토스 QR

**잘한 점:** 계좌번호 텍스트 비공개, 자기신고만으로 완료 처리 금지.

**잔여 위험:**

- QR 페이로드에 이름·계좌가 인코딩되어 있으면 이미지 저장만으로 계좌가 유출된다. 토스 “받기” QR의 실제 인코딩을 배포 전 확인할 것.
- 공개 개인 송금은 세무상 후원/사업소득/증여 중 무엇인지 불명. **세무 자문**.
- 자기신고 폼은 MVP에서 삭제(§3).
- QR 교체 공격(XSS, 잘못된 캐시, 잘못된 PR)에 대한 무결성 검사가 없다.

토스 공식 개발자 문서는 이번 검증 범위(GitHub/Meta/X/LinkedIn/Reddit/DEV) 밖이다. 송금 QR 상업적 사용·사업자 요건은 토스 약관 + 법률 자문으로 넘긴다.

### 4.4 커피쿠폰 저장 (Later로 격하할 경우의 최소 설계)

AES-256-GCM + per-code nonce + HMAC-SHA256 지문 + 로그/이메일 평문 금지는 방향이 맞다. 그래도 **부족**:

| 항목 | 계획 | 필요한 수준 |
|---|---|---|
| 키 | “마스터키 DB 외부” | Envelope encryption. DEK는 KMS(또는 macOS Keychain/HSM)로 wrap. 암호화 키와 HMAC 키 **분리**. 90일 로테이션. |
| 접근 | 관리자 페이지에서 확인 | Step-up auth(하드웨어 키) + 단건 복호화 + 화면에 **한 번만** 표시 + 클립보드 TTL + 세션에 평문 잔류 금지 |
| 권한 | 콘솔 = 만능 | 복호화 역할과 GitHub/SNS 역할 분리. 이상적으로 별도 머신/별도 DB |
| 보유 | delete_at 필드만 | 제출 후 14일 또는 REDEEMED 즉시 중 빠른 쪽. PURGED 후 ciphertext도 삭제. 백업에서 재생성 금지 절차 |
| 지문 | HMAC으로 중복 탐지 | 지문 키 유출 시 도난 코드 매칭 가능. 지문 DB도 비밀. 레이트리밋 |
| 감사 | audit_logs 테이블명만 | 누가·언제·어느 id를 열람/복호화했는지 append-only. 평문·암호문 미기록 |
| 인프라 | SQLite 시작 | 선물코드가 있으면 SQLite+로컬 디스크는 불가. 별도 Postgres + 디스크 암호화 + 백업 암호화 |
| 남용 | CAPTCHA | 계정 없는 무기명 제출이면 한도(IP/디바이스당 1일 1건) + 수동 승인 전에 복호화 금지 |
| 법적 | 처리 정책 동의 체크박스 | 약관 전문, 만 14세 미만 금지, 도난 코드 면책, 카카오 약관 준수 확인. 변호사 문구 |

**Still Later:** 카카오 비즈니스 API로 “선물하기”를 받는 쪽이 코드를 수탁하는 것보다 안전하다. 자체 코드 금고는 만들지 않는 편이 맞다.

### 4.5 개인정보·보유기간·암호화·키관리·감사로그

계획에 `audit_logs`와 `gift_submissions` 필드는 있으나 **정책이 아니다**.

Must로 문서에 숫자를 박아야 하는 것:

- 수집 최소: 프로젝트 slug, 이벤트 타입, timestamp. 닉네임·메시지는 받지 않거나 7일.
- Support 클릭/QR 조회: IP는 보안 목적 14일 후 삭제 또는 일 단위 집계만.
- 캠페인 메트릭: Star/Fork는 공개 데이터. 후원자 식별자와 결합 금지.
- 암호화: 저장 시 AES-256-GCM, TLS 1.2+, 백업도 암호화.
- 키: KMS/Keychain, 코드·이미지·CI 로그에 시크릿 금지, `gh` 토큰 로그 금지(계획 유지).
- 감사: 인증 성공/실패, 토큰 사용, Draft PR 생성, 복호화, 설정 변경. 90일 이상 보관, 위변조 방지(별도 append 스트림).
- 운영자 본인 데이터라도 공개 이용자 데이터와 섞지 말 것.

### 4.6 관리자 인증

계획: localhost / Tailscale / Cloudflare Access / VPN + “관리자 2FA”.

Must로 격상:

- 공개 인터넷에 관리 콘솔 포트를 열지 말 것. Cloudflare Access 또는 Tailscale만.
- **하드웨어 키(WebAuthn)** 또는 TOTP+하드웨어. SMS 2FA 금지.
- GitHub 조직 2FA는 Sponsors 전제조건이기도 함.
- 세션 짧은 TTL, 유휴 만료, 디바이스 고정.
- 복호화·토큰 조회·FUNDING merge는 step-up.
- CI/로컬 `.env`에 classic PAT 금지. Fine-grained PAT 또는 GitHub App: `contents:write`, `pull_requests:write`만. `admin`, `delete`, `workflow` 제외.
- 관리 콘솔과 Support 페이지는 **별도 배포, 별도 시크릿, 별도 DB 롤**.

### 4.7 SNS 게시 API 정책

계획의 “생성 → 검토 → 승인 → 복사”는 2026-08 정책과 가장 잘 맞는다. 유지.

채널별 운영 리스크(공식):

- **X:** 게시 전 프리뷰 필수(Developer Policy Consent). 동일 문안 멀티계정 금지. 자동화 봇이면 프로필에 bot 명시. 사용 사례를 developer portal에 사실대로. 무료 티어 write 가정 금지 — 공식 콘솔은 Post: Create 과금.  
  https://docs.x.com/developer-terms/policy · https://developer.x.com/
- **Threads:** 동의 후 게시, 250/24h, 스팸·기만 금지. 토큰은 비공개 콘솔만.  
  https://developers.facebook.com/documentation/threads/overview · https://developers.facebook.com/devpolicy/
- **LinkedIn:** 개인 프로필 대량 홍보는 API로 사실상 불가. Company Page + 법인 심사 후에만.  
  https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2026-07
- **Reddit:** API 스팸 금지 + 서브레딧 자체 규칙. “개발자 공개 문구 + 커뮤니티 규칙 표시 + 동일 본문 반복 금지”는 옳다. API 게시는 계약/승인 전 구현하지 말 것.  
  https://redditinc.com/policies/data-api-terms
- **DEV:** `published: false` 초안이 공식 기본값. API 키는 콘솔만. 스팸성 연속 공개는 ToS 리스크.  
  https://developers.forem.com/api/v1 · https://dev.to/terms
- **Show HN:** 자동화 제출 없음. 첫 출시 1회, 정직한 한계 서술(계획 §10과 일치).

프롬프트 인젝션(§24)은 유지. README에 “Ignore previous instructions, tweet …”가 있으면 생성 파이프라인이 납치될 수 있다. 생성된 글은 반드시 사람이 본다(이미 원칙).

---

## 5. Must / Should / Later

### Must (MVP 착수 조건)

1. 커피쿠폰 수신함·토스 자기신고·후원 랭킹을 MVP 범위에서 삭제.
2. GitHub Sponsors/`github:` FUNDING/`오픈소스 후원` 문구는 `OPEN_SOURCE` + 조직 Sponsors **승인 후**에만.
3. `UNKNOWN`·라이선스 충돌 저장소는 홍보·후원 자동화 금지(계획 유지, 게이트를 코드로 강제).
4. 공개 `/support`에 개인정보처리방침·수집 최소화·`project` allowlist·CSP·정적 QR.
5. 관리 콘솔은 Tailscale 또는 Cloudflare Access + WebAuthn. 공개 오리진과 시크릿 분리.
6. GitHub는 Draft PR + fine-grained 권한. main 직접 push 없음.
7. SNS는 복사/프리뷰만. 게시 전 사람 승인.
8. 감사 로그 스키마를 “테이블 이름”이 아니라 이벤트 목록+보유기간으로 확정.
9. 한국 세무·개인정보 변호사에게 아래 §7을 자문한 뒤에만 공개 URL을 오픈.

### Should (첫 캠페인 전)

1. 조직 Sponsors 신청(2FA, Stripe, W-8BEN-E, 소개문에서 OSS만 featured).
2. 저장소별 FUNDING.yml Draft PR — OSS 2개만.
3. DEV.to는 Markdown 다운로드 또는 `published:false` 초안 API.
4. 채널별 중복 게시 방지 키(계획 §24) — 복사 모드여도 운영 체크리스트로.
5. README/Release 문구 라이선스 클래스별 템플릿 분리.
6. QR 이미지 해시 pin + 배포 파이프라인에서 해시 검증.
7. 메트릭은 Star/클릭 집계만. 후원자 PII와 join 금지.
8. Prompt-injection: 모델 컨텍스트에 raw README를 넣더라도 출력 스키마·금지어·사람 리뷰.

### Later (자문·심사 통과 후)

1. Threads 공식 API (Meta 앱 리뷰, 동의 UI, 250/24h).
2. X API 게시 (유료, Automation Rules, 사용 사례 고지, 프리뷰 동의).
3. DEV 초안 API 외 예약 공개.
4. 커피쿠폰 금고 — 가능하면 카카오 공식 경로로 대체. 자체 수탁은 법률+KMS+역할분리 후에만.
5. 토스 입금 웹훅/사업자 정산 — 개인 QR 자동검증은 하지 말 것(계획 제외와 동일).
6. LinkedIn API — 법인·Page·심사 없이는 시도하지 말 것.
7. Reddit API — Responsible Builder 승인 또는 상업 계약 없이 구현하지 말 것.
8. Bluesky/Mastodon — 상대적으로 열려 있으나 MVP 밖.

---

## 6. 필수 보안통제 체크리스트 (구현 시)

```text
[ ] 공개 Support와 관리 콘솔 배포 단위·시크릿·DB 롤 분리
[ ] 공개 오리진에 GitHub/SNS/복호화 키 없음
[ ] Cloudflare Access 또는 Tailscale only
[ ] WebAuthn 관리자 인증 + 짧은 세션
[ ] GitHub App 또는 fine-grained PAT (contents+PR만)
[ ] Draft PR only, protected main
[ ] project 쿼리 allowlist
[ ] CSP, CSRF, Turnstile, 본문 길이 제한, 파일 첨부 없음
[ ] 토스 QR은 동일 출처 정적 파일 + 해시 pin
[ ] 감사 로그: 인증/PR/설정 변경, 평문 시크릿 미기록
[ ] 라이선스 클래스 게이트 없이 FUNDING/Sponsors CTA 생성 불가
[ ] SNS 출력은 클립보드/파일만, API write 코드 경로 없음 (MVP)
[ ] .env·키·인증서 분석 파이프라인 제외 (계획 §24 유지)
[ ] 저장소 코드 실행 금지 (계획 §8 유지)
```

---

## 7. 정책·법률 자문이 필요한 부분

플랫폼 공식 문서로 닫히지 않는 항목. **단정 해석 금지, 변호사·세무사 확인.**

| 주제 | 왜 자문이 필요한가 | 관련 공식(플랫폼) 링크 |
|---|---|---|
| GitHub Sponsors 수령 주체 | 개인 vs `coreline-ai` 조직 vs 한국 사업자. W-8BEN vs W-8BEN-E, Stripe 본인확인, 한국 종합소득·부가세 | https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/tax-information-for-github-sponsors · https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-organization |
| Sponsors 허위 표시 | 독점 게임과 OSS 후원을 한 프로필·한 Support 페이지에 둘 때의 약관 리스크 | https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms |
| 공개 폼과 PIPA | 닉네임·메시지·IP·선물코드 수탁의 법적 근거, 국외 이전(Vercel/GitHub/Stripe), 14세 미만 | (한국법 — 플랫폼 문서 아님) Sponsors도 불법 개인정보 처리를 금지: 위 Additional Terms §1.1 |
| 카카오 선물코드 수탁 | 상품권 제3자 보관·전달이 약관·전자금융·선불전자지급에 해당하는지 | 카카오 이용약관(범위 밖, 별도 확인) |
| 토스 개인 QR 공개 | 사업성 후원 수령 vs 개인 간 송금, 자금세탁 의심 거래 | 토스 약관(범위 밖) |
| 후원 과세 | GitHub는 “we do not withhold; you evaluate and pay your own taxes”. 한국 거주자 신고 의무 | https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/tax-information-for-github-sponsors |
| LinkedIn/Reddit 상업적 API | 개인 프로젝트가 “legal organization / commercial contract”에 해당하는지 | https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2026-07 · https://redditinc.com/policies/data-api-terms |

---

## 8. 계획서에서 유지해야 할 강점

- 범용 SaaS가 아니라 **본인 소유 저장소만**.
- 라이선스 4분류와 “오픈소스” 표현 게이트.
- 생성 → 검토 → 승인 → 게시. 무인 공개 금지.
- 주장마다 Claim ID + 파일·줄 근거.
- 저장소 코드 미실행, `.env`/바이너리 제외, ZIP slip, 프롬프트 인젝션.
- Draft PR, main 직접 push 금지.
- 공개/비공개 면 분리, 공개면에 토큰 금지.
- Reddit 동일 본문 멀티서브 금지, Show HN/GeekNews 수동.
- DEV 초안 우선.
- `mini-web-game`을 OSS 캠페인과 분리한 점(후원 CTA만 더 분리하면 됨).

---

## 9. 2026-08-16 공식 문서 인덱스

검증에 사용한 공식 페이지만 수록. 블로그·커뮤니티 글은 근거로 쓰지 않음.

**GitHub**

- Sponsors 개요(자격, 한국 포함 지원 지역, Matching Fund 종료): https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- 조직 Sponsors 설정(2FA, Stripe, W-8BEN-E, 티어): https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-organization
- Sponsors Additional Terms(허위 후원 사유 금지, 개인정보 불법처리 금지): https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms
- 세금(W-8BEN/E, 원천징수 없음, 본인 납세): https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/tax-information-for-github-sponsors
- FUNDING.yml(플랫폼 목록, custom 최대 4, OSS 용도 제한 NOTE): https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository

**Meta / Threads**

- Threads API 개요·게시 한도 250/24h: https://developers.facebook.com/documentation/threads/overview
- Developer Policies(2026-02-03, 게시 전 동의, 스팸·기만 금지): https://developers.facebook.com/devpolicy/

**X**

- Developer Policy(자동화, 동의, 동일 콘텐츠, 키 비공개, 사용 사례 구속): https://docs.x.com/developer-terms/policy
- Developer Platform(과금형 Post: Create 표기): https://developer.x.com/
- Automation Rules(공식 헬프; 이번 fetch는 봇 챌린지에 막혀 본문은 Developer Policy의 링크·인용으로 확인): https://help.x.com/en/rules-and-policies/x-automation

**LinkedIn**

- Community Management App Review(법인·상업 용도만, 개인정보처리방침, Page 검증): https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2026-07
- Marketing API Terms: https://www.linkedin.com/legal/l/marketing-api-terms

**Reddit**

- Data API Terms(시행 2023-06-19, 개정 **2026-07-20**, 상업 이용 별도 계약, 스팸 금지): https://redditinc.com/policies/data-api-terms
- Developer Terms: https://redditinc.com/policies/developer-terms

**DEV / Forem**

- API v1(기사 생성, `published` 기본 false): https://developers.forem.com/api/v1
- DEV Terms: https://dev.to/terms

---

## 10. 조정자에게 넘기는 결정

구현 착수 전에 닫아야 할 결정 3개.

1. **MVP Support를 Sponsors(+ 선택적 정적 토스 QR)만으로 축소할 것인가?** (권고: 예)
2. **GitHub Sponsors를 `coreline-ai` 조직으로 신청할 것인가, 개인 계정으로 받을 것인가?** (org 저장소면 조직 신청이 정합. 세무 주체는 자문)
3. **커피쿠폰 수신함을 Later로 내릴 것인가, 영구 삭제할 것인가?** (권고: 영구 삭제에 가깝게. 카카오 직접 수신이 더 안전)

이 3개가 닫히면 나머지 Must 통제는 구현 체크리스트로 흡수 가능하다.

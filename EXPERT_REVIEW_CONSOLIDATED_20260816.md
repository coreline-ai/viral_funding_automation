# Coreline GitHub 바이럴·후원 자동화 — 전문 에이전트 통합 검토

> 검토 대상: `coreline_github_viral_funding_automation_plan.md` v1.0  
> 검토일: 2026-08-16  
> 검토 관점: 제품·MVP, 기술 아키텍처, 보안·후원·플랫폼 정책  
> 원본 상태: 수정하지 않음

## 1. 최종 판정

현재 계획은 **제품 방향과 안전 원칙은 타당하지만, MVP 범위와 구현 순서는 현실적이지 않다.**

가장 큰 문제는 외부 수요가 검증되기 전에 다음을 한 번에 만들도록 되어 있다는 점이다.

- 관리자 웹 콘솔
- 14개 수준의 데이터 테이블
- 근거 기반 LLM 파이프라인
- 이미지 4종·GIF·영상 생성
- 8개 이상 채널 콘텐츠와 게시 연동
- 공개 Support 페이지
- 토스 송금 신고
- 커피쿠폰 암호화 수신함
- GitHub Draft PR과 성과 분석

이 범위는 개인용 도구의 첫 MVP가 아니라 **여러 제품을 결합한 플랫폼 범위**다. 현재 필요한 것은 시스템 전체 구현이 아니라 다음 가설을 낮은 비용으로 검증하는 것이다.

> 저장소 한 개를 충분히 정비하고 두세 채널에 직접 출시했을 때, 제3자의 방문·사용·피드백이 실제로 발생하는가?

따라서 프로젝트를 다음처럼 재정의한다.

> **1단계는 런치 콘솔 개발이 아니라 실제 런치 실험이다. 실험에서 반복 작업과 수요가 확인될 때만 얇은 자동화 도구를 만든다.**

## 2. 검토 방식과 산출물

세 전문 에이전트가 독립적으로 원문 1,622줄을 검토했다.

| 검토 | 핵심 관점 | 산출물 |
|---|---|---|
| 제품·MVP | 가치제안, 실측 저장소 현황, 우선순위, 성공·중단 기준 | `REVIEW_product_mvp_20260816.md` |
| 기술 아키텍처 | GitHub, 라이선스, RepoBrief, LLM 검증, 미디어, PR, DB·배포 | `tech_architecture_review_20260816.md` |
| 보안·정책 | Sponsors, FUNDING.yml, 토스, 쿠폰, 개인정보, SNS 정책 | `reviews/security_platform_policy_review_20260816.md` |

조정 단계에서 GitHub 계정 통계와 변경 가능성이 큰 플랫폼 조건을 다시 확인했다.

## 3. 확인된 현재 상태

2026-08-16 `gh repo list coreline-ai --limit 300` 기준:

| 항목 | 값 |
|---|---:|
| 전체 저장소 | 117 |
| 공개 / 비공개 | 83 / 34 |
| Star 합계 | 119 |
| Fork 합계 | 4 |
| Star 0개 | 13개 저장소 |
| Star 1개 | 95개 저장소 |
| Star 3개 이상 | 2개 저장소 |
| 공개 저장소 중 라이선스 없음 | 12개 |
| 공개 저장소 중 GitHub 판정 `other` | 6개 |

중요한 해석:

- Star 1개가 95곳에 집중된 이유가 self-star인지 여부는 API만으로 확정할 수 없다.
- 따라서 “외부 Star가 정확히 몇 개인가”는 추정으로만 다뤄야 한다.
- 다만 Fork가 4개이고 대부분 저장소의 외부 반응이 매우 작다는 점은 확인된다.
- 현재 병목을 바로 “홍보 자동화 부족”이라고 단정하기에는 수요 검증 자료가 부족하다.

초기 후보의 실측 상태:

| 저장소 | Star | Fork | GitHub 라이선스 판정 | 판단 |
|---|---:|---:|---|---|
| `memory_node_graph` | 1 | 0 | MIT | 출시 실험 후보지만 계획상의 91점은 수요를 의미하지 않음 |
| `dev-plan-skill` | 1 | 0 | MIT | 최근성·후속 프로젝트 관계 확인 필요 |
| `dev-plan-v2` | 0 | 0 | 없음 | 라이선스 정비 전 오픈소스 홍보 금지 |
| `mini-web-game` | 2 | 0 | other | OSS가 아닌 제품 캠페인으로 분리 |
| `kakao_coreline_bot` | 7 | 1 | MIT | 현재 실측상 가장 큰 외부 반응 후보 |

또한 동일한 기본 이름을 가진 공개/비공개 저장소 쌍 중 세 쌍에서 GitHub 라이선스 메타데이터가 다르다.

- `flutter_simple_mirroring`: MIT / `_org`: AGPL-3.0
- `kotlin_smart_adaptive_sound`: AGPL-3.0 / `_org`: MIT
- `node_aiweb_news`: MIT / `_org`: ISC

이 결과만으로 코드 동일성이나 라이선스 위반을 단정할 수는 없다. 다만 **캠페인 전에 코드 계보와 배포 권한을 사람이 확인해야 하는 우선 감사 대상**이다.

## 4. 세 검토의 공통 결론

### 유지해야 할 강점

1. 공개 저장소와 오픈소스를 구분하는 4단계 라이선스 분류
2. `생성 → 검토 → 승인 → 게시`의 human-in-the-loop 방식
3. `main` 직접 Push 금지와 Draft PR 기본 정책
4. 관리자 콘솔과 공개 페이지의 보안 경계 분리
5. 저장소 코드를 자동 실행하지 않는 정적 분석 원칙
6. 근거 없는 최상급·성능 표현 금지
7. OSS 캠페인과 독점 제품·게임 캠페인의 분리
8. 범용 SaaS가 아닌 단일 소유자 시스템이라는 제품 경계

### MVP에서 내려야 할 항목

1. 커피쿠폰 암호화 수신함
2. 토스 “송금했어요” 자기신고와 수동 대사 상태 머신
3. 후원 랭킹과 공개 후원자 메시지
4. 8개 채널 동시 생성·배포
5. X·Reddit·LinkedIn·Threads 자동 게시
6. 이미지 4종·GIF·15~30초 영상 동시 생성
7. Remotion 기반 자동 영상 생성
8. 로컬 9B 모델 고정
9. 공개 쓰기 폼이 있는 `/support` 서비스
10. Next.js 관리자 콘솔과 대형 DB 스키마

## 5. 검토 간 의견 차이와 조정 결론

### 5.1 RepoBrief가 필요한가

- 제품 관점: 본인 저장소 몇 개를 홍보하는 데 Claim ID와 증거 테이블은 과도하다.
- 기술 관점: 근거 기반 콘텐츠가 제품의 차별점이므로 증거 불변성이 필요하다.

**조정 결론:** MVP에는 `RepoBrief Lite`만 둔다.

```json
{
  "repository": "owner/repo",
  "commitSha": "...",
  "oneLiner": "...",
  "targetUsers": ["..."],
  "claims": [
    {
      "id": "claim-001",
      "text": "...",
      "path": "README.md",
      "fileSha256": "...",
      "quotedText": "...",
      "quoteSha256": "...",
      "verification": "EXACT_QUOTE"
    }
  ],
  "limitations": ["..."],
  "missingInformation": ["..."]
}
```

제외:

- LLM이 스스로 매기는 `confidence: 0.98`
- 별도 evidence 관계형 테이블
- 모든 코드 주장에 대한 정적 의미 분석
- README와 전체 코드의 일반화된 충돌 탐지

### 5.2 콘솔을 만들 것인가

- 제품 관점: 실제 런치 이전의 콘솔은 잘못된 병목을 자동화할 가능성이 높다.
- 기술 관점: 범위를 축소하면 4주 수준의 로컬 콘솔은 구현 가능하다.

**조정 결론:** 첫 7주는 콘솔을 만들지 않는다. 성공 게이트를 통과한 뒤에도 먼저 **파일 기반 CLI**를 만들고, 최소 5~10회 캠페인에서 반복 사용된 후에만 웹 콘솔을 검토한다.

### 5.3 LinkedIn 자동 게시 가능성

공식 문서상 두 경로를 구분해야 한다.

- 개인 프로필 게시: `Share on LinkedIn` 제품과 `w_member_social` 경로가 존재한다.
- 조직 Page·Community Management: 등록 법인, 비즈니스 이메일, 개인정보처리방침, 앱 심사가 필요하다.

기술적으로 개인 게시가 가능하더라도 MVP의 절약 시간은 매우 작으므로 **복사 모드를 유지**한다.

## 6. 구현 전 반드시 수정할 Blocker

### B1. 수요 검증보다 인프라가 먼저인 순서

현재 계획은 저장소 동기화부터 후원·쿠폰 수신함까지 만든 다음 첫 캠페인을 실행한다. 첫 외부 검증을 3주차 이전으로 당겨야 한다.

### B2. 라이선스 분류의 실재 결함

라이선스 없음, `other`, 모노레포 혼재, 동일 계보 후보 저장소 간 불일치를 별도로 다뤄야 한다. GitHub의 자동 라이선스 값만으로 최종 분류하지 않고 운영자 승인을 남긴다.

### B3. 쿠폰 수신함의 보안·운영 부담

선물코드를 저장하면 암호화, 키 관리, 복호화 권한, 보유기간, 삭제, 감사 로그, 사기·무효 코드, 세무 기록 문제가 함께 생긴다. MVP에서 제거하는 것이 가장 안전하고 비용이 낮다.

### B4. Vercel + 로컬 SQLite 쓰기 구조

Vercel 함수에서 로컬 SQLite 쓰기를 영속 저장소로 사용하는 구조는 성립하지 않는다. MVP 공개 페이지를 정적으로 만들면 이 문제 자체가 사라진다. 향후 폼이 필요하면 관리형 Postgres 또는 단일 호스트 중 하나를 선택해야 한다.

### B5. 증거 앵커의 불변성

`startLine/endLine`만 저장하면 커밋이나 파일이 변경됐을 때 과거 주장을 재검증할 수 없다. `commitSha`, `fileSha256`, `quotedText`, `quoteSha256`을 함께 저장한다.

### B6. 플랫폼 연동의 비용·심사·정책

- X API는 현재 종량제이며 링크 포함 게시가 일반 텍스트 게시보다 비싸다.
- Threads는 공식 게시 API가 있지만 OAuth, 권한, 미디어 공개 URL, 게시 쿼터를 다뤄야 한다.
- LinkedIn 개인 게시와 조직 Page API의 조건이 다르다.
- Reddit API는 승인·정책 리스크 때문에 수동 게시가 안전하다.
- Show HN·GeekNews·Disquiet는 수동 제출을 유지한다.
- DEV는 미공개 초안 API가 현실적인 첫 연동 후보다.

플랫폼 조건과 단가는 바뀔 수 있으므로 구현 직전에 공식 문서를 다시 확인한다.

## 7. 현실적인 8주 계획

### W1 — 계정 청소와 대상 선정

- [ ] 공개 저장소 83개의 라이선스 인벤토리 생성
- [ ] 라이선스 없음 12개와 `other` 6개를 사람 검토
- [ ] 동일 계보 후보 3쌍의 코드·권리 관계 확인
- [ ] 캠페인 대상 저장소 한 개 선정
- [ ] 대상 사용자를 한 문장으로 정의
- [ ] GitHub Sponsors 수령 주체를 개인/조직 중 결정
- [ ] Sponsors 신청이 필요하면 이 주에 시작

완료 기준:

- 대상 저장소가 `OPEN_SOURCE` 또는 명확한 제품 캠페인으로 확정됨
- “누가 왜 사용하는가”를 한 문장으로 설명할 수 있음

### W2 — 프로젝트 자체의 출시 준비

- [ ] 영문 우선 README 정리
- [ ] 첫 화면에 실제 동작 스크린샷 또는 짧은 GIF 배치
- [ ] 5분 이내 Quick Start 검증
- [ ] 데모 URL 또는 재현 가능한 실행 예제 검증
- [ ] 현재 한계와 비지원 항목 명시
- [ ] `RepoBrief Lite`를 사람이 먼저 작성

완료 기준:

- 신규 방문자가 15초 안에 용도와 대상을 이해함
- 검증되지 않은 성능·최상급 표현이 없음

### W3 — 첫 실제 런치

- [ ] 채널 1개에 수동 게시
- [ ] 채널 2개는 같은 날이 아니라 최소 24시간 뒤 게시
- [ ] 게시 직전 Star/Fork/Issue/Traffic 기준점 저장
- [ ] 게시 URL과 사용한 문안을 파일로 기록
- [ ] 모든 댓글·질문·이탈 원인을 수동 기록

권장 채널:

- 한국어 프로젝트: GeekNews 또는 Threads/X 중 하나
- 개발자 도구: DEV.to 초안 또는 관련 커뮤니티 한 곳
- Show HN은 피드백 반영 후로 보류

### W4 — 피드백 반영과 두 번째 런치

- [ ] README와 포지셔닝 수정
- [ ] 두 번째 채널에 수정된 문안으로 게시
- [ ] 채널별 링크 또는 캠페인 식별자를 사용
- [ ] 실제로 반복된 준비 작업과 소요시간 기록

### W5 — 후원 최소 연결

- [ ] 조직/개인 Sponsors 승인 상태 확인
- [ ] 승인된 OSS 저장소만 `github:` FUNDING 항목 사용
- [ ] 미승인 상태라면 잘못된 Sponsors 링크를 노출하지 않음
- [ ] 저장소별 `FUNDING.yml` Draft PR
- [ ] README 후원 섹션 Draft PR
- [ ] 자체 후원 폼과 쿠폰 수신함은 만들지 않음

### W6 — 세 번째 검증

- [ ] 앞선 피드백으로 README와 데모를 다시 검수
- [ ] 기준을 충족하면 Show HN 또는 가장 적합한 한 채널에 게시
- [ ] 업보트·Star 요청 등 커뮤니티 정책 위반 문구 제거
- [ ] 14일 GitHub Traffic 데이터가 소실되기 전에 스냅샷 저장

### W7 — Go / No-Go 게이트

다음 네 조건을 평가한다.

| 지표 | 최소 조건 |
|---|---|
| 실제 캠페인 | 서로 다른 문안 또는 채널로 2회 이상 |
| 채널 유입 | Traffic referrer 또는 캠페인 링크에서 1개 이상 확인 |
| 제3자 사용 신호 | 외부 Issue, Discussion, 의미 있는 Fork, 실제 사용 피드백 중 1건 이상 |
| 자동화 필요성 | 동일 준비 작업이 두 번 이상 반복되고 회당 30분 이상 소요 |

판정:

- 제3자 사용 신호가 없으면 콘솔 개발을 중단하고 프로젝트 자체를 개선한다.
- 사용 신호는 있지만 반복 작업이 작으면 문서 템플릿만 유지한다.
- 사용 신호와 반복 작업이 모두 있으면 W8 자동화로 진행한다.

Star 수는 참고 지표로만 사용한다. 고정된 Star 목표는 저장소 종류와 채널 규모에 따라 별도로 정한다.

### W8 — 조건부 얇은 자동화

Go 판정일 때만 구현한다.

- [ ] 파일 기반 CLI
- [ ] 대상 저장소 한 개 동기화
- [ ] `RepoBrief Lite` 생성과 검증
- [ ] 최대 3개 채널의 초안 Markdown 생성
- [ ] 금지 표현·URL·문자 수 린트
- [ ] 승인 후 복사 또는 파일 다운로드
- [ ] 멱등적인 `FUNDING.yml` Draft PR
- [ ] Star/Fork/Traffic CSV 스냅샷

제외:

- 웹 관리자 콘솔
- SNS 자동 게시
- 공개 DB 쓰기
- 커피쿠폰 저장
- 영상 자동 생성
- 다중 저장소 일괄 PR

## 8. 우선순위 재분류

### Must

| 항목 | 이유 |
|---|---|
| 라이선스 1회 감사 | 현재 확인된 실제 리스크 |
| 대상 저장소 1개 선정 | 학습과 품질 집중 |
| README·데모·Quick Start 개선 | 외부 전환에 직접 영향 |
| 실제 캠페인 2회 | 제품 가설 검증 |
| human approval | 평판·정책 사고 방지 |
| 성공·중단 기준 | 무기한 인프라 개발 방지 |
| Sponsors 수령 주체 확정 | 개인/조직 세금·승인 절차가 다름 |
| 저장소별 FUNDING | OSS·독점 혼재 계정의 잘못된 공통 적용 방지 |
| 캠페인 결과 기록 | 다음 자동화 판단 근거 |

### Should — Go 게이트 이후

| 항목 | 조건 |
|---|---|
| 파일 기반 CLI | 같은 작업이 실제로 반복될 때 |
| RepoBrief Lite 자동 생성 | 초안 품질 개선 효과가 확인될 때 |
| Playwright 이미지 1종 | 수동 이미지 제작이 병목일 때 |
| DEV.to 미공개 초안 API | DEV가 실제 주 채널일 때 |
| Traffic 일일 스냅샷 | 연속 캠페인을 운영할 때 |
| Release 초안 생성 | 릴리스 빈도가 충분할 때 |
| 로컬 SQLite | 파일만으로 이력이 관리되지 않을 때 |

### Later 또는 하지 않음

| 항목 | 판정 |
|---|---|
| Next.js 관리자 콘솔 | 최소 5~10회 반복 사용 후 재검토 |
| 공개 Support 폼 | 법률·개인정보·운영 필요가 확인된 뒤 |
| 커피쿠폰 금고 | 가능하면 영구 제외 |
| 토스 송금 자기신고 | 제외 |
| 후원 랭킹 | 제외 |
| 공통 조직 FUNDING.yml | OSS·독점 혼재 상태에서는 제외 |
| 8채널 동시 배포 | 제외 |
| Reddit/Show HN 자동 게시 | 제외 |
| X API 게시 | 비용·정책을 재검증하기 전 제외 |
| Remotion 소개 영상 | 반복 ROI 확인 전 제외 |
| 로컬 9B 모델 고정 | 품질·비용 비교 실험 전 제외 |

## 9. 조건부 자동화 아키텍처

W7 Go 게이트를 통과했을 때만 적용한다.

```text
L0 github-adapter
   └─ 저장소 조회, ETag, rate limit, Draft PR

L1 deterministic-analysis
   └─ 라이선스 신호, 파일 선택, 해시, readiness checklist

L2 brief-and-content
   └─ RepoBrief Lite, Zod 검증, claim 대조, 문안 생성·린트

L3 side-effects
   └─ 사람 승인 후 파일 출력, Draft PR, metrics snapshot
```

필수 불변 규칙:

1. 라이선스 최종 분류는 운영자 승인과 `commitSha`를 가진다.
2. 콘텐츠 생성기는 승인된 RepoBrief만 입력으로 받는다.
3. 모든 claim은 파일 해시와 실제 인용문으로 재검증할 수 있다.
4. 모든 GitHub 쓰기는 승인 후 실행되고 멱등성을 가진다.
5. 동일 변경을 두 번 실행해도 PR은 한 개만 존재해야 한다.
6. SNS 자동 게시 경로는 MVP 코드에 존재하지 않는다.

GitHub 인증은 한 실행 경로로 단일화한다.

- 런치 실험 단계: 사람이 `gh` CLI 사용
- 얇은 CLI 단계: `gh` 또는 Octokit 중 하나만 선택
- 상시 서버 단계: Fine-grained PAT 또는 GitHub App을 위협 모델과 운영 방식에 맞춰 결정

세 방식을 한 런타임에서 혼용하지 않는다.

## 10. 최소 보안 기준

정적 Support 페이지를 사용할 경우:

- 등록된 project slug만 허용
- 공개 페이지에 GitHub·SNS 토큰 없음
- Sponsors는 승인된 OSS 프로젝트에서만 표시
- QR을 사용한다면 동일 출처 정적 파일과 변경 해시 검증
- 입력 폼, 닉네임, 메시지, 송금 신고, 쿠폰 코드 수집 없음
- 외부 데모는 승인된 URL을 새 탭으로만 연결

향후 관리 콘솔을 만들 경우:

- Tailscale 또는 Cloudflare Access 뒤에 배치
- WebAuthn 또는 강한 2FA
- 짧은 관리자 세션과 중요 작업 step-up 인증
- 토큰 최소 권한
- 인증, 설정 변경, PR 생성 이벤트의 감사 로그
- 공개 서비스와 시크릿·DB 권한 분리

## 11. 플랫폼 운영 기본안

| 채널 | 현실적인 기본 모드 | 비고 |
|---|---|---|
| X | 복사·작성 화면 열기 | API 종량제·정책 변경 가능 |
| Threads | 복사, 이후 조건부 API | OAuth와 publish 흐름 필요 |
| LinkedIn 개인 | 복사, 이후 `Share on LinkedIn` 검토 | 조직 Page API와 구분 |
| Reddit | 수동 | 승인·서브레딧 규칙·스팸 위험 |
| DEV.to | Markdown, 이후 미공개 초안 API | 첫 자동화 후보 |
| Show HN | 수동 | 충분히 다듬은 뒤 1회 제출 |
| GeekNews | 수동 | 커뮤니티 문맥 우선 |
| Disquiet | 수동 | 메이커 로그 수동 검수 |
| Bluesky·Mastodon | Later | 실제 주 채널이 될 때만 |

## 12. 구현 전 결정해야 할 사항

1. 첫 대상 저장소: `kakao_coreline_bot`, `memory_node_graph`, `dev-plan-v2` 중 무엇인가?
2. `dev-plan-skill`과 `dev-plan-v2` 중 어느 것이 공식 주력인가?
3. Sponsors 수령 주체: 개인인가 `coreline-ai` 조직인가?
4. 정적 Support 페이지를 W5에 만들 것인가, GitHub Sponsors 링크만 사용할 것인가?
5. 토스 QR 공개가 필요한가? 필요하면 약관·세무 검토 주체는 누구인가?
6. Go/No-Go의 제3자 사용 신호를 어떤 이벤트로 인정할 것인가?
7. W8 산출물은 CLI인가, 단순 스크립트 모음인가?

## 13. 리스크 등록부

| 위험 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| 수요 없는 프로젝트의 홍보만 자동화 | 높음 | 높음 | W3 런치, W7 중단 게이트 |
| 라이선스 오분류 | 중간 | 높음 | 사람 승인, 해시·커밋 바인딩 |
| 쿠폰 코드 유출·사기 | 중간 | 매우 높음 | 기능 제거 |
| SNS 스팸·계정 평판 손상 | 중간 | 높음 | 수동 게시, 채널 1개씩 |
| API 가격·정책 변화 | 높음 | 중간 | MVP API 연동 제외, 구현 전 재검증 |
| LLM 기능 과장·환각 | 중간 | 높음 | RepoBrief Lite, exact quote, 린터, 사람 승인 |
| 중복 Draft PR | 중간 | 중간 | content hash 기반 멱등성 |
| 잘못된 Sponsors 노출 | 중간 | 높음 | 승인·라이선스 게이트 |
| 측정값의 잘못된 인과 해석 | 높음 | 중간 | 채널 간격, referrer, 정성 피드백 병행 |
| 도구 유지비가 절감 시간을 초과 | 높음 | 중간 | CLI 우선, 실제 반복 후 콘솔 |

## 14. 공식 문서 참고

- GitHub FUNDING.yml: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository
- GitHub Sponsors 개요: https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- GitHub 조직 Sponsors 설정: https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-organization
- GitHub REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Threads 공식 Postman: https://www.postman.com/meta/threads/overview
- X API 가격: https://docs.x.com/x-api/getting-started/pricing
- X Post 생성: https://docs.x.com/x-api/posts/create-post
- LinkedIn Share on LinkedIn: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- LinkedIn Community Management App Review: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- Reddit 개발자 가이드: https://developers.reddit.com/docs/guidelines
- DEV / Forem API v1: https://developers.forem.com/api/v1

## 15. 최종 권고

원 계획을 폐기할 필요는 없다. 다음처럼 재배치하면 된다.

```text
현재 계획의 원칙과 템플릿
        ↓ 유지
라이선스 감사 + 대상 1개 정비
        ↓
수동 실제 런치 2~3회
        ↓
W7 Go/No-Go
        ├─ No-Go: 프로젝트 자체 개선
        └─ Go: 파일 기반 CLI와 RepoBrief Lite
                         ↓ 반복 5~10회
                    웹 콘솔 재검토
```

**현실적인 프로젝트 목표는 “모든 저장소의 바이럴·후원을 자동화”가 아니라 “한 저장소의 실제 채택을 만들고, 그 과정에서 반복된 작업만 자동화”하는 것이다.**


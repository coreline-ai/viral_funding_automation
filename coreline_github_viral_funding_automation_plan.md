# Coreline GitHub 바이럴·후원 자동화 시스템 기획서

> **대상 계정:** `coreline-ai`  
> **목적:** 본인이 소유한 GitHub 저장소를 분석하고, 프로젝트별 바이럴 콘텐츠를 생성·배포하며, GitHub 저장소에 후원 경로를 연결하는 개인용 자동화 시스템 구축  
> **권장 운영 형태:** 비공개 관리자 콘솔 + 공개 프로젝트·후원 페이지

---

## 1. 프로젝트 정의

이 시스템은 불특정 사용자가 GitHub 주소를 입력하는 범용 SaaS가 아니다.

`coreline-ai`가 소유한 저장소를 한곳에서 관리하면서 다음 업무를 자동화하는 **개인용 오픈소스 홍보·후원 콘솔**이다.

```text
coreline-ai 저장소 동기화
        ↓
라이선스·README·데모·대표 이미지 분석
        ↓
홍보 준비도 평가
        ↓
홍보할 저장소 선택
        ↓
채널별 게시물·이미지·영상 생성
        ↓
사용자 검토 및 승인
        ↓
Threads·X·LinkedIn·Reddit·Show HN 등 배포
        ↓
README·FUNDING.yml·Release 정비
        ↓
GitHub Star·방문·후원 전환 추적
```

### 핵심 원칙

1. 본인 소유 저장소만 관리한다.
2. 공개 저장소라도 라이선스를 확인한 후 오픈소스 여부를 판단한다.
3. 게시물은 완전 자동 공개가 아니라 `생성 → 검토 → 승인 → 게시` 흐름을 기본으로 한다.
4. GitHub 저장소의 실제 코드와 문서를 근거로만 홍보 문안을 작성한다.
5. 후원은 GitHub Sponsors, 토스 QR, 커피쿠폰 전달함을 분리해서 제공한다.
6. 독점 라이선스 프로젝트는 오픈소스로 홍보하지 않는다.
7. 공개 후원 페이지와 비공개 관리 콘솔을 분리한다.

---

## 2. 전체 시스템 구조

```text
┌──────────────────────────────────────────────────────────────┐
│                Private Coreline Launch Console               │
├──────────────────────────────────────────────────────────────┤
│  저장소 동기화                                                │
│  라이선스·README·Release·Demo 분석                            │
│  바이럴 준비도 점수                                           │
│  RepoBrief 생성                                               │
│  SNS·커뮤니티별 콘텐츠 생성                                   │
│  이미지·GIF·소개 영상 생성                                    │
│  README·FUNDING.yml Draft PR 생성                             │
│  게시 승인·배포·성과 확인                                     │
│  커피쿠폰 관리                                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ 승인된 결과만 공개
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                 Public Project / Support Page                │
├──────────────────────────────────────────────────────────────┤
│  프로젝트 소개                                                │
│  GitHub 저장소                                                │
│  라이브 데모                                                  │
│  GitHub Sponsors                                              │
│  토스 커피값 QR                                               │
│  카카오 선물코드 비공개 전송                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 저장소 분류 기준

GitHub에서 코드가 공개되어 있다는 이유만으로 오픈소스는 아니다.

각 저장소를 다음 네 가지 중 하나로 분류해야 한다.

| 분류 | 설명 | 바이럴 표현 | 후원 적용 |
|---|---|---|---|
| `OPEN_SOURCE` | MIT, Apache-2.0, GPL 등 표준 오픈소스 라이선스 | 오픈소스 프로젝트 | GitHub Sponsors 권장 |
| `SOURCE_AVAILABLE` | 코드 공개지만 사용·배포 조건이 제한됨 | 공개 소스 또는 기술 프리뷰 | 라이선스 설명 필요 |
| `PROPRIETARY` | 독점 라이선스 | 제품·게임·기술 쇼케이스 | 제품 지원 또는 커피 후원 |
| `UNKNOWN` | 라이선스 없음 또는 불명확 | 오픈소스 표현 금지 | 라이선스 정비 후 결정 |

### 기본 분류 로직

```text
LICENSE 파일 확인
→ SPDX 식별자 확인
→ package.json / pyproject.toml 등의 license 필드 확인
→ README 라이선스 문구 확인
→ 서로 충돌하면 UNKNOWN 처리
→ 운영자가 최종 승인
```

### 중요한 표현 규칙

```text
MIT / Apache / GPL
→ "오픈소스로 공개했습니다"

Proprietary
→ "소스가 공개된 프로젝트입니다"
→ "브라우저에서 실행 가능한 데모입니다"
→ "기술 쇼케이스입니다"

라이선스 없음
→ "오픈소스" 표현 사용 금지
```

---

## 4. 초기 바이럴 대상 권장

### 4.1 `memory_node_graph`

#### 강점

- 시각적으로 강한 지식 그래프
- Markdown 기반
- 로컬 우선 또는 개인 지식 관리 콘셉트
- 짧은 영상과 GIF로 기능 전달 가능
- 개발자와 일반 생산성 사용자 모두 이해 가능

#### 권장 채널

```text
X
Threads
Show HN
GeekNews
Reddit
LinkedIn
DEV.to
YouTube Shorts
```

#### 핵심 후킹 방향

> Markdown 문서를 폴더가 아닌 살아 있는 지식 우주처럼 탐색할 수 있게 만들었습니다.

---

### 4.2 `dev-plan-skill`

#### 강점

- AI 코딩 도구의 범위 확장 문제라는 명확한 고충
- Codex·Claude Code 사용자 대상
- 설치와 이해가 간단함
- 기술 커뮤니티용 글에 적합
- 개발 계획과 QA 자동화라는 차별점

#### 권장 채널

```text
Show HN
X
Threads
Reddit
GeekNews
DEV.to
LinkedIn
```

#### 핵심 후킹 방향

> AI 코딩 도구가 요청하지 않은 기능까지 계속 만드는 문제를 막기 위해 Scope-first 개발 계획 스킬을 만들었습니다.

---

### 4.3 `mini-web-game`

이 프로젝트는 오픈소스 캠페인보다 **게임·제품 확산 캠페인**으로 분리한다.

#### 권장 CTA

```text
게임 플레이
최고 점수 공유
GitHub Star
개발자 커피 후원
라이선싱 문의
```

#### 권장 채널

```text
Threads
X
YouTube Shorts
TikTok
Reddit 게임 커뮤니티
Discord
```

---

## 5. 저장소 관리 대시보드

기본 화면은 GitHub URL 입력창보다 `coreline-ai` 저장소 목록을 중심으로 구성한다.

```text
Coreline Repositories

[ ] memory_node_graph
    License: MIT
    Demo: 있음
    Sponsor: 없음
    Viral Readiness: 91/100
    Last Campaign: 없음

[ ] dev-plan-skill
    License: MIT
    Demo: 일부 있음
    Sponsor: 없음
    Viral Readiness: 78/100
    Last Campaign: 2026-08-10

[ ] mini-web-game
    License: Proprietary
    Demo: 있음
    Sponsor: 제품 지원 방식
    Product Promotion Readiness: 93/100
```

### 필터

```text
전체
오픈소스
제품·게임
라이선스 확인 필요
홍보 준비 완료
README 개선 필요
후원 미적용
최근 업데이트
최근 홍보하지 않은 프로젝트
```

---

## 6. 바이럴 준비도 점수

각 저장소를 자동 분석하여 홍보 준비도를 평가한다.

| 평가 항목 | 배점 |
|---|---:|
| 라이선스 명확성 | 15 |
| 한 줄 소개 | 10 |
| README 대표 이미지 | 10 |
| 실행 가능한 데모 | 15 |
| 30초 이하 영상 또는 GIF | 15 |
| Quick Start | 10 |
| 영문 설명 | 5 |
| GitHub Topics | 5 |
| Release 또는 Tag | 5 |
| 후원 연결 | 5 |
| CTA 명확성 | 5 |
| **합계** | **100** |

### 점수 해석

```text
90~100: 즉시 출시 가능
75~89 : 작은 수정 후 출시
50~74 : README·데모·이미지 보강 필요
0~49  : 바이럴 대상 보류
```

### 자동 개선 제안 예시

```text
- 대표 이미지가 없습니다.
- 30초 이하 데모 영상이 없습니다.
- 영문 한 줄 소개가 없습니다.
- Quick Start가 7단계 이상으로 깁니다.
- 라이선스가 명확하지 않습니다.
- FUNDING.yml이 없습니다.
- 최근 Release가 없습니다.
```

---

## 7. GitHub 데이터 수집

### 수집 항목

```text
저장소명
설명
공개 여부
기본 브랜치
기준 Commit SHA
라이선스
Topics
주 언어
Star
Fork
최근 업데이트
README
문서 폴더
Release
Tag
대표 이미지
스크린샷
라이브 데모 URL
FUNDING.yml
마지막 캠페인 날짜
```

### 권장 GitHub 연결 방식

본인 계정 전용 로컬 관리자 콘솔에서는 GitHub CLI를 우선 사용한다.

```bash
gh auth login
```

자동화 시스템에서 가능한 작업:

```text
저장소 목록 조회
README 조회
Release 조회
Topics 조회
FUNDING.yml 존재 여부 확인
브랜치 생성
README 수정
FUNDING.yml 추가
Draft PR 생성
```

### 안전한 수정 흐름

```text
자동화 시스템
→ chore/add-funding 브랜치 생성
→ FUNDING.yml 추가
→ README 후원 섹션 추가
→ Draft PR 생성
→ 본인이 검토
→ Merge
```

`main` 브랜치에 직접 자동 Push하지 않는 것을 기본 정책으로 한다.

---

## 8. 저장소 분석 엔진

### 권장 구성

```text
GitHub REST API
+ GitHub CLI
+ Repomix
+ 자체 RepoBrief 생성기
```

### 분석 우선순위

```text
README.md
LICENSE
docs/**
examples/**
package.json
pyproject.toml
Cargo.toml
go.mod
src 진입 파일
API 또는 CLI 정의
테스트
Release Notes
대표 이미지와 데모 자산
```

### 실행 금지

외부 저장소는 분석 대상이며 실행 대상이 아니다.

```text
npm install
npm run build
pip install
cargo build
docker compose up
shell script 실행
저장소 내부 바이너리 실행
저장소가 지정한 외부 URL 자동 방문
```

---

## 9. RepoBrief

채널별 게시물을 바로 생성하지 않고 먼저 근거 기반 중간 데이터를 만든다.

```json
{
  "repository": "memory_node_graph",
  "commitSha": "abc123",
  "licenseClass": "OPEN_SOURCE",
  "project": {
    "name": "memory_node_graph",
    "oneLiner": "Markdown 문서를 관계형 지식 그래프로 시각화하는 웹앱",
    "targetUsers": [
      "개발자",
      "Obsidian 사용자",
      "지식 관리 사용자"
    ]
  },
  "verifiedClaims": [
    {
      "id": "claim-001",
      "text": "Markdown 문서를 그래프 형태로 시각화한다",
      "sourcePath": "README.md",
      "sourceStartLine": 20,
      "sourceEndLine": 38,
      "confidence": 0.98
    }
  ],
  "demoUrls": [],
  "screenshots": [],
  "viralAngles": [],
  "limitations": [],
  "missingInformation": [],
  "fundingEligible": true
}
```

### 필수 규칙

```text
모든 기능 주장은 Claim ID를 가져야 한다.
모든 Claim은 파일 경로와 줄 범위를 가져야 한다.
확인되지 않은 성능 표현을 금지한다.
"최고", "가장 빠른", "혁신적" 같은 표현은 근거가 없으면 제거한다.
README와 실제 코드가 충돌하면 운영자 검토 대상으로 표시한다.
```

---

## 10. 채널별 콘텐츠 생성

한 저장소에서 다음 결과를 한 번에 생성한다.

```text
X 단일 게시물 3안
X 스레드 1안
Threads 연속 게시 1안
LinkedIn 게시물 1안
Reddit 제목·본문
Show HN 제목·본문
GeekNews 소개문
Disquiet 메이커 로그
DEV.to 기술 글
README 출시 섹션
GitHub Release Notes
후원 CTA
```

### X

```text
짧은 Hook
문제
해결 방식
짧은 데모
GitHub 링크
Star 또는 피드백 요청
```

기본 모드:

```text
초안 생성
미리보기
복사
X 작성 화면 열기
```

자동 게시는 나중에 선택 기능으로 추가한다.

---

### Threads

```text
1. 개발 중 겪은 문제
2. 기존 방식이 불편했던 이유
3. 프로젝트가 해결하는 방식
4. 실제 실행 화면
5. GitHub 링크와 피드백 요청
```

광고 문구보다 Build in Public 방식이 적합하다.

---

### LinkedIn

```text
문제
→ 직접 만든 이유
→ 기술적 해결 방식
→ 누구에게 유용한지
→ GitHub 링크
→ 협업·피드백 요청
```

---

### Reddit

```text
서브레딧 선택
→ 커뮤니티 규칙 표시
→ 제목 생성
→ 본문 생성
→ 개발자 공개 문구 포함
→ 사용자 검토
→ 복사 또는 명시적 게시
```

동일 본문을 여러 서브레딧에 자동 반복 게시하지 않는다.

---

### Show HN

```text
Show HN: 프로젝트명 – 무엇을 해결하는 도구인지
```

본문 구성:

```text
왜 만들었는가
기존 방식의 문제
기술 구조
직접 실행 링크
현재 한계
피드백 받고 싶은 부분
```

---

### GeekNews

```text
한 줄 소개
왜 만들었는가
핵심 차별점
기술 스택
GitHub 링크
데모 링크
```

---

### DEV.to

```text
문제 정의
기존 방식
설계 과정
핵심 구현
설치 방법
실행 예제
한계
향후 계획
GitHub 링크
```

초기 자동화는 공개 게시보다 초안 저장을 기본으로 한다.

---

## 11. 이미지·영상 에셋 자동 생성

### 기본 산출물

1. 16:9 대표 이미지
2. 1:1 SNS 카드
3. 4:5 LinkedIn 카드
4. 9:16 Shorts 커버
5. 5초 반복 GIF
6. 15~30초 소개 영상

### GitHub에서 자동 수집할 자산

```text
README 첫 대표 이미지
docs 이미지
assets 이미지
public 이미지
GitHub Open Graph 이미지
프로젝트 로고
터미널 실행 예시
Mermaid 다이어그램
라이브 데모 캡처
Release 정보
```

### 권장 기술

```text
HTML/CSS Template
Satori 또는 Playwright
Sharp
Remotion
FFmpeg
```

### 대표 이미지 구조

```text
프로젝트명
한 줄 소개
대표 스크린샷
핵심 기능 3개
GitHub 저장소명
```

---

## 12. GitHub 후원 구조

### 권장 흐름

```text
GitHub Repository
   │
   ├─ Sponsor 버튼
   │      └─ GitHub Sponsors
   │
   └─ Custom Support URL
          └─ Coreline Support Page
               ├─ GitHub Sponsors
               ├─ 토스 QR
               └─ 실제 커피쿠폰 전송
```

### 프로젝트별 후원 유입 구분

```text
/support?project=memory_node_graph
/support?project=dev-plan-skill
/support?project=graphify-legal-wiki
```

이 값으로 다음을 기록한다.

```text
어떤 프로젝트에서 후원 페이지로 이동했는지
GitHub Sponsors 버튼 클릭
토스 QR 표시 또는 클릭
커피쿠폰 전송
감사 메시지 작성
```

---

## 13. FUNDING.yml

### GitHub Sponsors 승인 전

```yaml
custom:
  - "https://your-domain.example/support?project=memory_node_graph"
```

### GitHub Sponsors 승인 후

```yaml
github: coreline-ai

custom:
  - "https://your-domain.example/support?project=memory_node_graph"
```

### 파일 위치

```text
repository/
└── .github/
    └── FUNDING.yml
```

### 적용 정책

```text
OPEN_SOURCE
→ FUNDING.yml 자동 제안
→ README 후원 섹션 자동 제안
→ Draft PR 생성

SOURCE_AVAILABLE
→ 운영자 검토 후 적용

PROPRIETARY
→ GitHub Sponsors를 오픈소스 후원으로 표현하지 않음
→ 제품 지원 또는 개발자 커피 후원으로 별도 안내

UNKNOWN
→ 라이선스 정비 전 자동 적용 금지
```

### 공통 `.github` 저장소 적용 여부

`coreline-ai/.github` 저장소에 공통 FUNDING 설정을 넣으면 여러 저장소에 일괄 적용할 수 있다.

그러나 현재 저장소에 오픈소스와 독점 프로젝트가 섞여 있다면, 초기에는 공통 적용보다 **저장소별 FUNDING.yml** 적용을 권장한다.

---

## 14. README 후원 섹션

### 영문

```md
## ☕ Support the project

If this project saved you time or helped your work, you can support its continued development.

- ⭐ Star the repository
- 🐛 Report bugs and suggest improvements
- 🔧 Contribute code or documentation
- ☕ Sponsor the next release

[Support Coreline Projects](https://your-domain.example/support?project=PROJECT_NAME)
```

### 한글

```md
## ☕ 프로젝트 후원

이 프로젝트가 시간을 절약하거나 작업에 도움이 되었다면 다음 개발을 후원할 수 있습니다.

- ⭐ GitHub Star
- 🐛 버그 및 개선 의견 등록
- 🔧 코드·문서 기여
- ☕ 다음 릴리스 커피 후원

[Coreline 프로젝트 후원하기](https://your-domain.example/support?project=PROJECT_NAME)
```

---

## 15. 공개 Support 페이지

### 화면 구성

```text
Support Coreline Projects

어떤 프로젝트가 도움이 되었나요?

[프로젝트 선택]

────────────────────────

☕ GitHub Sponsors

오픈소스 개발을 1회 또는 매월 후원합니다.

[GitHub에서 후원하기]

────────────────────────

🇰🇷 토스로 커피 한 잔

QR을 스캔해 간편하게 커피값을 보냅니다.

[토스 QR]

────────────────────────

🎁 실제 커피쿠폰 보내기

카카오톡 선물코드를 안전하게 전달합니다.

[커피쿠폰 보내기]
```

### 권장 URL

```text
/support
/support?project=memory_node_graph
/support?project=dev-plan-skill
```

---

## 16. GitHub Sponsors 준비물

```text
GitHub 2단계 인증
GitHub Sponsors 프로필 신청
수령 계좌
세금 및 본인 확인 정보
후원 소개문
1회 후원 티어
월 후원 티어
대표 프로젝트
후원금 사용 목적
```

### 티어 예시

```text
☕ Espresso Supporter
☕ Coffee Supporter
☕☕ Release Supporter
🔁 Monthly Coffee
🚀 Core Contributor Supporter
```

앱에서는 실제 결제를 처리하지 않고 GitHub Sponsors 페이지로 연결한다.

---

## 17. 토스 QR 후원

### MVP 방식

```text
웹페이지에 토스 송금 QR 표시
→ 사용자가 토스 앱으로 송금
→ 사용자가 "송금했어요" 선택
→ 운영자가 실제 입금 수동 확인
```

### 상태

```text
REPORTED
→ 사용자가 송금했다고 알림

VERIFIED
→ 운영자가 거래 내역 확인

REJECTED
→ 거래 확인 불가
```

### 주의사항

```text
사용자의 "송금 완료" 버튼만으로 실제 후원 완료 처리하지 않는다.
후원 금액 랭킹은 운영자 확인 후 반영한다.
계좌번호를 공개 텍스트로 노출하지 않고 QR 중심으로 제공한다.
```

---

## 18. 실제 커피쿠폰 전송

카카오 선물코드 등을 비공개로 전달받는 기능이다.

### 입력 필드

```text
프로젝트
브랜드
상품명 또는 쿠폰 종류
선물코드
액면가 — 선택
보낸 사람 닉네임 — 선택
응원 메시지 — 선택
익명 여부
처리 정책 동의
```

### 보안 흐름

```text
사용자가 선물코드 입력
→ 서버에서 즉시 암호화
→ 암호화된 데이터만 DB 저장
→ 관리자에게 코드 없는 알림
→ 관리자 페이지에서 확인
→ 사용 완료 처리
→ 설정 기간 후 삭제
```

### 상태

```text
SUBMITTED
→ NOTIFIED
→ VIEWED
→ REDEEMED
→ PURGED
```

### 저장 구조 예시

```text
gift_submissions
- id
- project_id
- brand
- encrypted_code
- encryption_nonce
- encryption_auth_tag
- code_fingerprint
- sender_name_encrypted
- message_encrypted
- status
- submitted_at
- first_viewed_at
- redeemed_at
- delete_at
```

### 암호화 기준

```text
AES-256-GCM
코드마다 새로운 무작위 nonce
마스터키는 DB 외부에 저장
로그와 이메일에 평문 코드 금지
중복 확인은 HMAC-SHA256 지문 사용
```

### 관리자 알림 예시

```text
새 커피쿠폰이 도착했습니다.
프로젝트: memory_node_graph
브랜드: 스타벅스
접수 시간: 2026-08-16 15:00
관리자 페이지에서 확인하세요.
```

이메일 본문에는 선물코드 전체를 넣지 않는다.

---

## 19. 관리자 콘솔과 공개 페이지 분리

### A. 비공개 관리자 콘솔

Mac mini 또는 보호된 서버에서 실행한다.

```text
저장소 관리
GitHub 쓰기 권한
SNS 토큰
콘텐츠 초안
커피쿠폰 관리
캠페인 분석
Draft PR 생성
```

접근 방식:

```text
localhost
Tailscale
Cloudflare Access
VPN
```

### B. 공개 Support·Landing 페이지

```text
프로젝트 소개
GitHub 저장소
라이브 데모
후원 버튼
토스 QR
커피쿠폰 제출 폼
```

공개 페이지에는 GitHub 쓰기 권한과 SNS 토큰을 보관하지 않는다.

---

## 20. 핵심 모듈

```text
repo-catalog
viral-readiness
repo-analysis
repo-brief
campaign-generator
asset-generator
funding-manager
publisher
metrics
```

### `repo-catalog`

```text
coreline-ai 저장소 전체 동기화
메타데이터 캐시
마지막 캠페인 기록
라이선스 분류
후원 적용 상태
```

### `viral-readiness`

```text
README·라이선스·데모·이미지 분석
홍보 준비도 점수
개선 작업 제안
```

### `repo-analysis`

```text
README와 코드 분석
핵심 기능 추출
설치 방법 추출
제한사항 추출
기능 주장 근거 연결
```

### `campaign-generator`

```text
채널별 글 생성
한국어·영어 생성
여러 톤 생성
문자 수 검증
근거 없는 표현 제거
```

### `asset-generator`

```text
대표 이미지
SNS 카드
GIF
Shorts 커버
Remotion 소개 영상
```

### `funding-manager`

```text
FUNDING.yml 감지
후원 가능 저장소 분류
프로젝트별 Support URL 생성
README 후원 섹션 생성
Draft PR 생성
```

### `publisher`

```text
복사
파일 다운로드
작성 페이지 열기
공식 API 게시
게시 결과 URL 기록
```

### `metrics`

```text
게시 전후 GitHub Star
Fork
Release 다운로드
데모 방문
후원 페이지 클릭
캠페인별 성과
```

---

## 21. 플랫폼 게시 기본 정책

| 채널 | MVP 모드 | 향후 모드 |
|---|---|---|
| Threads | 복사 또는 직접 게시 | 공식 API 게시 |
| X | 복사·작성 화면 열기 | 선택적 공식 API 게시 |
| LinkedIn | 복사 | 심사 후 공식 API 게시 |
| Reddit | 복사·서브레딧 열기 | 사용자 명시적 게시 |
| DEV.to | Markdown 다운로드 | 초안 저장 API |
| Show HN | 복사 | 수동 제출 유지 |
| GeekNews | 복사 | 수동 제출 유지 |
| Disquiet | 복사 | 수동 제출 유지 |
| Bluesky | 선택 | 공식 API 게시 |
| Mastodon | 선택 | 공식 API 게시 |

---

## 22. 권장 데이터베이스

본인 전용 시스템이므로 복잡한 멀티테넌트 구조는 필요하지 않다.

```text
repositories
repo_snapshots
repository_evidence
campaigns
content_drafts
content_draft_evidence
media_assets
publish_jobs
publish_attempts
support_settings
support_events
gift_submissions
metrics_snapshots
audit_logs
```

### 관계

```text
Repository
 ├─ RepoSnapshot
 │   └─ RepositoryEvidence
 │
 ├─ Campaign
 │   ├─ ContentDraft
 │   ├─ MediaAsset
 │   └─ PublishJob
 │
 └─ SupportSetting
     ├─ SupportEvent
     └─ GiftSubmission
```

---

## 23. 권장 기술 스택

### 관리자 콘솔

```text
Next.js
TypeScript
Tailwind CSS
Zod
Drizzle 또는 Prisma
SQLite 또는 PostgreSQL
```

### GitHub

```text
GitHub CLI
GitHub REST API
GitHub App — 필요 시
Repomix
```

### 로컬 AI

```text
Ollama
llama.cpp
9B급 양자화 모델
JSON Schema 기반 출력
```

### 이미지·영상

```text
HTML/CSS
Playwright
Satori
Sharp
Remotion
FFmpeg
```

### 배포

```text
Private Console
- Mac mini
- Tailscale 또는 Cloudflare Access

Public Support Page
- Vercel 또는 별도 HTTPS 서버

Database
- SQLite로 시작
- 외부 공개 폼 운영 시 PostgreSQL 권장
```

---

## 24. 보안 요구사항

### GitHub

```text
main 직접 Push 금지
Draft PR 기본
쓰기 권한 최소화
GitHub 토큰 로그 금지
```

### 저장소 분석

```text
저장소 코드 실행 금지
대형 파일 제한
바이너리 제외
.env·키·인증서 제외
ZIP 경로 탈출 차단
Prompt Injection 방어
```

### SNS

```text
OAuth 토큰 평문 저장 금지
브라우저 Local Storage 저장 금지
플랫폼별 토큰 분리
게시 전 승인
중복 게시 방지 키
```

### 후원

```text
선물코드 평문 로그 금지
이메일로 전체 코드 발송 금지
관리자 2FA
쿠폰 확인 이력 기록
사용 완료 후 자동 삭제
토스 송금 신고와 실제 확인 상태 분리
```

### 공개 Support 페이지

```text
Rate Limit
CAPTCHA
CSRF 방어
XSS 방어
입력값 길이 제한
외부 URL 입력 금지
파일 첨부 금지
관리자 페이지 접근 제한
```

---

## 25. 개발 단계

### Phase 1 — 저장소 분류

```text
coreline-ai 저장소 전체 동기화
→ 라이선스 분류
→ README 상태 확인
→ 데모·이미지·Release 확인
→ 바이럴 준비도 점수
```

#### 완료 조건

```text
모든 저장소가 다음 중 하나로 분류된다.

OPEN_SOURCE
SOURCE_AVAILABLE
PROPRIETARY
UNKNOWN
```

---

### Phase 2 — 첫 캠페인 대상 준비

초기 권장 대상:

```text
memory_node_graph
dev-plan-skill
mini-web-game
```

단, `mini-web-game`은 오픈소스가 아니라 제품·게임 캠페인으로 분리한다.

#### 작업

```text
README 정비
대표 이미지 확인
Quick Start 확인
영문 설명 생성
Release 준비
후원 적용 여부 결정
```

---

### Phase 3 — 후원 연결

```text
GitHub Sponsors 신청
공개 /support 페이지 생성
토스 QR 등록
커피쿠폰 암호화 폼
프로젝트별 Support URL
FUNDING.yml 생성
README 후원 섹션 생성
Draft PR
```

---

### Phase 4 — 출시팩 생성

```text
X 콘텐츠
Threads 콘텐츠
LinkedIn 콘텐츠
Reddit 콘텐츠
Show HN 콘텐츠
GeekNews 콘텐츠
DEV.to 콘텐츠
16:9 이미지
1:1 이미지
4:5 이미지
9:16 커버
15~30초 영상
```

---

### Phase 5 — 검토·배포

```text
초안 생성
→ 근거 확인
→ 문구 수정
→ 승인
→ 복사 또는 게시
→ 게시 URL 기록
```

---

### Phase 6 — 성과 분석

```text
게시 직전 기준점 저장
24시간 후 측정
7일 후 측정
30일 후 측정
```

측정 항목:

```text
GitHub Star 증가
Fork 증가
Issue 증가
Pull Request 증가
Release 다운로드
데모 방문
후원 페이지 클릭
GitHub Sponsors 이동
토스 QR 조회
커피쿠폰 제출
```

---

### Phase 7 — Release 자동 캠페인

```text
새 Release 생성
→ 이전 Release와 차이 분석
→ 업데이트 홍보 초안 생성
→ 이미지 생성
→ 관리자 알림
→ 승인
→ 게시
```

자동 생성은 허용하지만 자동 공개는 기본적으로 금지한다.

---

## 26. MVP 범위

### 포함

```text
coreline-ai 저장소 자동 동기화
라이선스 분류
바이럴 준비도 점수
Repomix 기반 RepoBrief
8개 채널용 콘텐츠 생성
이미지 4종 생성
검토·복사·다운로드
FUNDING.yml 생성
README 후원 섹션 생성
Draft PR 생성
GitHub Sponsors 연결
토스 QR 표시
커피쿠폰 암호화 수신함
캠페인별 Star 변화 기록
```

### 제외

```text
불특정 사용자 가입
다중 사용자 Workspace
비공개 저장소
무인 SNS 자동 게시
자동 댓글·멘션
여러 Reddit 커뮤니티 동시 게시
토스 송금 자동 검증
카카오 선물코드 자동 등록
결제·구독
고급 SNS 분석
Postiz 전체 통합
```

---

## 27. 초기 화면 구성

### Dashboard

```text
전체 저장소
홍보 준비 완료
후원 적용 완료
라이선스 확인 필요
최근 캠페인
이번 주 Star 증가
```

### Repositories

```text
저장소 목록
라이선스
준비도
후원 여부
최근 홍보일
Campaign 생성
```

### Campaign Studio

```text
RepoBrief
바이럴 각도 선택
채널별 초안
이미지 미리보기
근거 확인
승인
배포
```

### Funding Manager

```text
FUNDING.yml 상태
README 후원 섹션 상태
GitHub Sponsors 상태
Support URL
Draft PR
```

### Support Inbox

```text
토스 송금 신고
커피쿠폰 접수
확인 상태
사용 완료
자동 삭제 예정
```

### Metrics

```text
캠페인별 Star
Fork
Issue
Demo Visit
Support Click
Donation Conversion
```

---

## 28. 권장 첫 실행 순서

```text
1. coreline-ai 저장소 목록 동기화

2. 전체 저장소 라이선스 분류

3. memory_node_graph 분석
   - RepoBrief
   - 대표 이미지
   - README
   - 데모
   - 바이럴 준비도

4. dev-plan-skill 분석

5. 공개 /support 페이지 생성

6. GitHub Sponsors 신청 또는 상태 확인

7. 토스 QR 준비

8. 커피쿠폰 암호화 수신함 구현

9. 두 오픈소스 저장소에 FUNDING.yml Draft PR 생성

10. 첫 바이럴 캠페인 생성
    - memory_node_graph
    - dev-plan-skill

11. 게시 전 기준 Star 기록

12. Threads·X·GeekNews·Show HN 순서로 배포

13. 24시간·7일 성과 비교
```

---

## 29. 최종 권장 구조

```text
Private Coreline Launch Console
├─ coreline-ai 저장소 자동 동기화
├─ 라이선스 분류
├─ 바이럴 준비도 분석
├─ RepoBrief
├─ 채널별 콘텐츠 생성
├─ 이미지·영상 생성
├─ 검토·승인·게시
├─ README/FUNDING Draft PR
├─ 커피쿠폰 관리
└─ 성과 분석

Public Coreline Support Page
├─ 프로젝트 선택
├─ GitHub Sponsors
├─ 토스 QR
└─ 암호화된 커피쿠폰 전달
```

### 가장 먼저 구현할 핵심 범위

```text
coreline-ai 저장소 동기화
→ 오픈소스·제품 분류
→ memory_node_graph / dev-plan-skill 선택
→ RepoBrief 생성
→ 채널별 출시팩 생성
→ /support 페이지
→ FUNDING.yml Draft PR
→ 게시 전후 Star 변화 확인
```

이 범위로 시작하면 범용 SNS 스케줄러와 경쟁하지 않고, 다음 차별점을 명확하게 가져갈 수 있다.

> **내 GitHub 저장소의 실제 코드와 문서를 분석해, 프로젝트별 바이럴 출시팩과 후원 연결을 자동으로 만들어주는 개인용 오픈소스 런치 콘솔**

---

## 30. 참고 공식 문서

- GitHub Sponsors  
  https://docs.github.com/en/sponsors

- GitHub FUNDING.yml  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository

- GitHub REST API  
  https://docs.github.com/en/rest

- GitHub CLI  
  https://cli.github.com/manual/

- Repomix  
  https://github.com/yamadashy/repomix

- Threads API  
  https://developers.facebook.com/docs/threads

- X Developer Platform  
  https://developer.x.com/

- LinkedIn Developer  
  https://learn.microsoft.com/en-us/linkedin/

- DEV Community API  
  https://developers.forem.com/api

---

**문서 버전:** 1.0  
**작성 기준일:** 2026-08-16  
**대상:** `coreline-ai` 개인 GitHub 바이럴·후원 자동화 시스템

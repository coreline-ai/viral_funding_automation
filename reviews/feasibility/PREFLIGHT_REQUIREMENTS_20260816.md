# 개발·런치 사전 준비사항 점검

- 점검일: 2026-08-16 KST
- 기준 계획: `dev-plan/implement_20260816_180940.md`
- 현실성 기준: `FEASIBILITY_VERDICT_20260816.md`
- 점검 범위: 로컬 작업공간, GitHub 계정·저장소, Sponsors, 캠페인, Track B 개발 환경
- 변경 작업: 없음. 계정·저장소 설정은 읽기 전용으로만 확인함

## 1. 요약

현재는 **문서 검토는 완료됐지만 Phase 1을 바로 시작하기에는 6개 결정이 남아 있는 상태**다.

| 구분 | 상태 | 판단 |
|---|---|---|
| 로컬 Node/npm/git/gh | `READY` | Node 24.13.1, npm 11.8.0, git 2.50.1, gh 2.83.2 |
| GitHub 접근 | `READY_WITH_RISK` | `coreline-ai` 로그인·후보 저장소 admin·Traffic 읽기 가능. 현재 토큰은 Track B 최소권한 기준보다 넓음 |
| 운영 작업공간 | `BLOCKED` | 현재 폴더는 Git 저장소가 아니며 `docs/`, `artifacts/`, `src/`, `tests/`가 아직 없음 |
| 대상 저장소 | `DECISION_REQUIRED` | 후보 메타데이터는 확인했으나 한 개를 확정하지 않음 |
| Sponsors | `BLOCKED` | `coreline-ai`는 조직이 아닌 개인 User이고 Sponsors listing이 아직 없음 |
| 캠페인 계정·관측 | `USER_CONFIRM` | GeekNews/HN/DEV 계정과 활동 이력을 로컬에서 확인할 수 없음 |
| Track B | `NOT_YET` | `AUTO_CLI` 판정 전에는 토큰·CLI 저장소·LLM을 만들지 않음 |

## 2. 착수 전에 사용자가 결정해야 하는 6가지

아래 6개가 결정되지 않으면 Phase 1에서 같은 논의를 반복하거나 일정이 중단된다.

### D1. 첫 캠페인 대상 저장소

선택 기준의 우선순위를 먼저 정한다.

- `A`: 5분 안에 외부 자격증명 없이 실행 가능한 저장소 우선
- `B`: 기존 외부 관심 신호가 있는 저장소 우선
- `C`: 현재 가장 활발하게 개발 중인 저장소 우선

이번 실험 목적에는 **A를 최우선**으로 권고한다. 사용자가 실행할 수 없으면 캠페인 문안의 효과와 제품 장벽을 구분할 수 없기 때문이다.

### D2. `dev-plan-skill`과 `dev-plan-v2`의 공식 관계

- `dev-plan-skill`: 기존 MIT 프로젝트
- `dev-plan-v2`: 최근 주력 후보이나 현재 GitHub License API에서 라이선스 미감지

`dev-plan-v2`를 주력으로 사용할 경우 먼저 LICENSE 추가와 권리 확인이 필요하다. 두 저장소가 동시에 공식 프로젝트처럼 보이지 않도록 README에서 후속·폐기·이관 관계를 명시해야 한다.

### D3. GitHub Sponsors 수령 주체

실측상 `coreline-ai`는 **Organization이 아니라 User 계정**이며 접근 가능한 GitHub 조직도 없다. 따라서 계획의 “개인 또는 `coreline-ai` 조직” 선택지는 사실과 다르다.

가능한 선택:

1. 현재 개인 User `coreline-ai`로 Sponsors 신청
2. 법적 조직이 필요하면 실제 GitHub Organization을 별도로 만든 뒤 조직 Sponsors 검토
3. 초기 실험에서는 Sponsors를 보류하고 수요 검증만 수행

권고 기본값은 **1번으로 신청 준비만 시작하고, 공개 Sponsor 버튼은 수요 관측 뒤에 활성화**하는 것이다.

### D4. 운영·증거 저장소 위치

현재 `/Volumes/Eprojects/project_202608/viral_funding_automation`은 Git 저장소가 아니다.

결정할 항목:

- 현재 폴더를 운영 문서용 Git 저장소로 초기화할지
- 비공개 원자료 `artifacts/private/`를 커밋하지 않을지
- Track B CLI를 이 저장소에 둘지, 별도 저장소로 만들지

권고:

- 현재 폴더: 계획·결정 로그·공개 가능한 감사 자료
- `artifacts/private/`: `.gitignore` 처리
- Track B: `AUTO_CLI` 이후 별도 저장소 위치 확정

### D5. 캠페인 채널과 계정 상태

최소 확인 항목:

- GeekNews 계정 보유 여부와 가입 후 7일 경과 여부
- Hacker News 사람 계정과 평소 참여 이력
- DEV 계정과 실제 본문 게시 가능 여부
- 캠페인 게시 후 24~48시간 동안 댓글에 대응할 수 있는 일정

권고 기본 순서:

1. 한국어 개발자 도구면 GeekNews Show, 영문 도구면 DEV 본문
2. 7일 관측·README 수정
3. 다른 채널 한 번
4. Show HN은 별도 게이트 통과 시에만 사용

### D6. 실제 투입 가능 시간

계획은 1인 주 15~20시간을 전제로 한다. 아래를 캘린더에 먼저 확보해야 한다.

- W1~W4: 주 15~20시간 정비·검증 시간
- 캠페인 게시일: 게시 후 댓글 대응 시간
- 마지막 게시 후 14일: 매일 Traffic 스냅샷과 반응 확인
- GO 시: Lean CLI 5~6주 또는 Plan-complete 8~9주

## 3. 후보 저장소 사전 점검 결과

GitHub REST API와 README를 읽기 전용으로 확인했다.

| 후보 | 공개 | 라이선스 | 최근 상태 | Quick Start 신호 | 사전 판정 |
|---|---|---|---|---|---|
| `memory_node_graph` | 예 | MIT (`LICENSE.md`) | 2026-08-15 push | `npm install`, `npm run dev` | **조건부 1순위**. 청정환경 5분 테스트 필요 |
| `dev-plan-v2` | 예 | **미감지/파일 없음** | 2026-08-16 push | Python 테스트·Preflight 명확 | **라이선스 선행 시 후보** |
| `kakao_coreline_bot` | 예 | MIT (`LICENSE`) | 2026-05-03 push | 빠른 시작은 있으나 Android·프록시·외부 자격증명 가능성 | 실행 장벽과 기존 관심 신호의 혼입 확인 필요 |
| `dev-plan-skill` | 예 | MIT (`LICENSE`) | 2026-06-29 push | 설치·스크립트 사용법 존재 | 후속 프로젝트 관계를 먼저 정리해야 함 |

모든 후보에 관리자 권한이 있고 Issues는 활성화되어 있다. Discussions는 모두 비활성화 상태다. 따라서 Discussion을 수요 신호로 사용할 경우 대상 저장소에서 기능을 켜거나, 판정 신호에서 제외해야 한다.

### 대상 확정 게이트

아래를 모두 통과한 첫 저장소만 캠페인 대상으로 정한다.

- [ ] 운영자가 LICENSE 내용과 주요 매니페스트를 확인했다.
- [ ] 새 임시 디렉터리 또는 새 사용자 환경에서 README만 보고 설치했다.
- [ ] 외부 비밀키·유료 계정 없이 5분 안에 핵심 가치가 보인다.
- [ ] 실패 시 에러와 복구 방법이 README에 있다.
- [ ] 실제 화면·결과를 보여주는 이미지 또는 GIF 한 개가 있다.
- [ ] 사용자 데이터·토큰·내부 URL이 데모와 로그에 없다.
- [ ] 대상 사용자 한 문장과 해결 문제 한 문장이 합의됐다.

## 4. GitHub Sponsors 사전 준비

현재 확인 결과:

- `coreline-ai` 계정 유형: `User`
- Sponsors listing: 없음
- 대한민국: GitHub Sponsors 지원 지역
- 후보 저장소의 `.github/FUNDING.yml`: 모두 없음
- 2FA 상태: API로 확정하지 못했으므로 사용자가 설정 화면에서 확인 필요

개인 계정 신청에 필요한 준비:

- [ ] 2FA 활성화와 복구 코드 안전 보관
- [ ] Sponsors 공개 프로필 설명과 오픈소스 활동 근거
- [ ] 최소 후원 티어 초안
- [ ] Stripe Connect 또는 지원되는 fiscal host 선택
- [ ] 거주 지역과 일치하는 지급 계좌
- [ ] 개인이면 W-8BEN, 법인이면 적용되는 세금 서류 확인
- [ ] 실명·생년월일·주소·세금번호 표기 일치 확인
- [ ] GitHub 검토 기간을 일정과 분리

주의:

- 신청·신원·지급 준비는 W1에 시작한다.
- `FUNDING.yml`과 README 후원 CTA 공개는 수요 관측 또는 Show HN 관측 뒤로 미룬다.
- 세금 서류 선택과 국내 신고는 개별 상황에 따라 달라지므로 필요하면 세무 전문가 확인이 필요하다.

## 5. 캠페인 전 준비

### 제품·문서

- [ ] README 첫 화면에 대상 사용자·문제·결과가 보인다.
- [ ] Quick Start를 청정환경에서 직접 재현했다.
- [ ] 한계, 비용, 외부 계정 요구사항을 숨기지 않았다.
- [ ] 데모·스크린샷·GIF에서 개인정보와 토큰을 제거했다.
- [ ] RepoBrief Lite의 claim마다 commit SHA·경로·정확한 인용문을 기록했다.
- [ ] 후원 문구와 Sponsor 버튼은 아직 공개하지 않았다.

### 측정

- [ ] 게시 전 최소 7일 기준점을 확보한다.
- [ ] Traffic views/clones/referrers/paths를 매일 같은 시각에 저장한다.
- [ ] Star·빈 Fork·자기 조회를 수요 신호로 인정하지 않는다.
- [ ] CI·봇·운영자 계정 활동을 제외하는 규칙을 기록한다.
- [ ] GitHub Traffic API 403을 유입 0으로 처리하지 않는다.

현재 `gh` 인증으로 후보 3개의 Traffic 읽기는 성공했으므로 API 접근 자체는 준비됐다. 다만 현재 토큰은 `repo`, `workflow` 등을 포함한 광범위한 토큰이므로 산출물에 저장하면 안 된다.

### 커뮤니티 운영

- [ ] 캠페인 간 최소 72시간, 권장 7일을 확보한다.
- [ ] 게시글은 운영자가 직접 읽고 채널별로 다시 작성한다.
- [ ] 삭제·플래그·스팸 지적 시 다음 캠페인을 중단한다.
- [ ] Show HN 본문은 사람이 작성하고 펀드레이저로 보이지 않게 한다.
- [ ] 친구·지인에게 업보트나 댓글을 요청하지 않는다.

## 6. Track B 시작 전 준비

아래는 지금 만들 필요가 없다. Phase 5에서 `DEMAND_YES + AUTO_CLI`가 나온 뒤 준비한다.

### 필수 결정

- [ ] 라이선스 분류기 대신 운영자 승인 파일 + 해시 기반 `STALE` 사용
- [ ] LLM 대신 결정론적 템플릿을 먼저 구현
- [ ] ETag 캐시 제외, Octokit throttling/retry 사용
- [ ] Node 24 LTS와 TypeScript 직접 실행 방식 고정
- [ ] Track B 저장소와 패키지 이름 확정
- [ ] 실제 Draft PR 생성 검증용 별도 공개 저장소 확정

### 인증

현재 `gh` 토큰을 CLI 운영 토큰으로 재사용하지 않는다. 다음 조건의 별도 fine-grained PAT를 만든다.

- 대상 저장소 1개로 제한
- `Contents: Read/Write`
- `Pull requests: Read/Write`
- `Metadata: Read`
- Traffic 수집용 `Administration: Read` 실측 확인
- 90일 만료
- macOS Keychain 또는 gitignored `.envrc` 중 한 곳에만 보관

### 코드 이전에 고정할 계약

- [ ] 읽기 모드에서 모든 쓰기 메서드 차단
- [ ] 한 개의 `canonicalize()` 정의
- [ ] 초안 결정성 키와 LLM 실패 정책
- [ ] 열린·닫힌 PR, 브랜치만 존재, 기존 파일 상이 상태 매트릭스
- [ ] public 저장소 사전조건
- [ ] `NO_OP` 바이트 비교 규칙
- [ ] 임시 파일 후 rename 방식의 원자적 저장
- [ ] 부작용 감사 로그 형식
- [ ] 종료 코드 `0 정상 / 1 게이트 차단 / 2 오류`
- [ ] metrics 403 명시적 실패

## 7. 착수 판정

### 지금 바로 가능한 일

1. 운영 저장소 위치 결정
2. 대상 선택 우선순위 결정
3. Sponsors 수령 주체와 2FA 확인
4. GeekNews/HN/DEV 계정 상태 확인
5. 후보 한 개의 청정환경 Quick Start 테스트
6. W1~W10 실제 캘린더 확보

### Phase 1 시작 조건

다음 다섯 가지가 모두 충족되면 Phase 1을 시작할 수 있다.

- [ ] 운영 저장소 위치와 private artifact 정책 확정
- [ ] 캠페인 대상 선정 기준 승인
- [ ] Sponsors 주체 또는 보류 결정
- [ ] 캠페인 채널 계정 상태 확인
- [ ] 주 15~20시간 일정 확보

### 현재 최종 상태

**환경은 준비됐지만 의사결정과 계정 준비가 완료되지 않았다.** 특히 `coreline-ai`가 조직이 아닌 User라는 점, Sponsors 미신청, 대상 미확정, 현재 폴더가 비-Git 작업공간이라는 네 항목을 먼저 닫아야 한다.

## 8. 참조

- [현실성 종합 판정](./FEASIBILITY_VERDICT_20260816.md)
- [성장 실험 검토](./growth_experiment_review_20260816.md)
- [엔지니어링·보안 검토](./engineering_security_review_20260816.md)
- [개발 계획](../../dev-plan/implement_20260816_180940.md)
- [GitHub Sponsors 개인 계정 설정](https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account)
- [GitHub Sponsors 지원 지역](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors)
- [FUNDING.yml Sponsor 버튼](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository)
- [Show HN 가이드](https://news.ycombinator.com/showhn.html)
- [GeekNews 이용법](https://news.hada.io/guidelines)


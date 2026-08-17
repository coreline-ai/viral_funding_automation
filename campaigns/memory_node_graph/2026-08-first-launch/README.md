# AI Systems Atlas 첫 출시팩

대상 저장소: [coreline-ai/memory_node_graph](https://github.com/coreline-ai/memory_node_graph)  
직접 실행: [AI Systems Atlas 공개 데모](https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation)  
첫 제안 채널: `GeekNews Show`  
신규 6개 중 첫 선택 채널: `Product Hunt`
상태: `1차 원고·에셋·정책 검토 완료 / 실제 게시는 계정 확보 후 사용자 최종 검토 필요`

## 파일 구성

| 경로 | 역할 |
|---|---|
| `readiness.md` | 저장소·데모·라이선스·Quick Start 준비 상태 |
| `assets/ai-systems-atlas-live.png` | 실제 공개 데모를 직접 캡처한 대표 이미지 |
| `assets/ai-systems-atlas-shorts.mp4` | 실제 제품 화면 기반 20초 세로 Shorts MVP |
| `assets/product-hunt-hero.png` | 기존 공개 OG를 복사한 Product Hunt Gallery 원본 |
| `assets/product-hunt-thumbnail.svg` | 기존 공개 favicon을 복사한 Thumbnail 원본 |
| `assets/README.md` | 이미지·영상의 출처, 규격, 무결성 정보 |
| `generated/api-response.json` | 웹앱 `/api/generate` 실제 원본 응답 |
| `generated/project-summary.json` | 웹앱이 분석한 프로젝트 요약 |
| `generated/x-single-1.md` ~ `x-single-3.md` | X 단일 게시물 3안 |
| `generated/x-thread.md` | X 3개 구간 스레드 |
| `generated/threads-series.md` | Threads 대화형 연속 게시 |
| `generated/reddit-post.md` | Reddit 규칙 확인형 수동 게시 작업본 |
| `generated/linkedin-post.md` | LinkedIn 게시물 |
| `generated/disquiet-product.md` | Disquiet 제품 등록·연결 포스트 |
| `generated/facebook-post.md` | Facebook Reels·그룹 규칙 확인 작업본 |
| `generated/instagram-reels.md` | Instagram Reels 캡션·자산 작업본 |
| `generated/product-hunt-launch.md` | Product Hunt 자동 분석 입력 자료(HOLD) |
| `generated/peerlist-launchpad.md` | Peerlist Launchpad 입력 자료(HOLD) |
| `generated/indie-hackers-post.md` | Indie Hackers 작성자 보강 자료(HOLD) |
| `generated/okky-post.md` | OKKY 프로젝트 공유 작업본 |
| `generated/geeknews-show.md` | GeekNews Show 생성 초안 |
| `generated/dev-article.md` | DEV 사람 작성용 사실 검증 자료(HOLD) |
| `generated/youtube-shorts.md` | Shorts 제목·설명·20초 샷리스트 |
| `generated/show-hn.md` | Show HN 작성자 전용 사실 체크리스트(HOLD) |
| `generated/short-post.md` 등 3개 | 이전 파일명과의 호환 별칭 |
| `final/geeknews-show.md` | 사실 대조 후 다듬은 첫 게시 최종 초안 |
| `final/publish-checklist.md` | 실제 게시 직전 확인할 항목 |
| `final/product-hunt-launch.md` | Product Hunt 영문 제출 필드·Maker 첫 댓글·자산 순서 |
| `final/product-hunt-checklist.md` | Product Hunt 계정·Create Draft·예약 전 체크리스트 |
| `final/verified-channel-copy-pack.md` | 전문가·공식 자료 검토 후 채널별 최종 교정 원고와 HOLD 기준 |

## 현실적인 사용 순서

1. 채널별 최종 문구는 `final/verified-channel-copy-pack.md`에서 판정과 남은 조건을 확인합니다.
2. 첫 게시에는 `final/geeknews-show.md`와 대표 이미지를 사용합니다.
3. 운영자 본인의 말투로 제목과 본문을 마지막으로 검토합니다.
4. `final/publish-checklist.md`를 완료하고 GeekNews `Show`에 직접 등록합니다.
5. 게시 URL과 시각을 기록하고 최소 72시간, 권장 7일 동안 반응을 확인합니다.
6. 이후 Threads → X → LinkedIn·Disquiet → Shorts 순으로 필요한 채널만 진행합니다. Reddit·DEV·Show HN은 HOLD 조건을 해제하기 전 사용하지 않습니다.

신규 6개 채널에서는 Product Hunt를 먼저 선택했습니다. `final/product-hunt-launch.md`의 영문 원고와 실제 제품 자산을 사용해 `Create Draft`까지만 준비하고, 개인 계정·미리보기·게시일을 확인한 뒤 예약합니다.

## 게시 가능 상태

- X 3안과 스레드: 가중 문자 검사 통과, 문구·대표 이미지 최종 확인 필요
- Threads·LinkedIn: 수동 게시 원고 준비, 본인 말투 확인 필요
- Reddit: 생성 제목·본문 제거. 서브레딧·계정·규칙·언어 확인 후 작성자가 새로 작성
- Disquiet: 제품 등록·검토 후 연결 포스트로 사용
- GeekNews: 검토된 최종본 있음, 계정·가입 기간·중복 확인 필요
- DEV: 게시문이 아닌 검증 자료. 사람 기술 사례·AI 보조 공개 전 게시 금지
- Shorts: 실제 영상 제작 완료, 업로드 전 자막·링크·권리 최종 확인 필요
- Show HN: 생성·교정 문장 사용 금지. 작성자가 LLM 도움 없이 처음부터 직접 작성

모든 등록은 수동입니다. 업보트·Star 요청, 자동 댓글, 동일 원고의 다중 커뮤니티 반복 게시를 하지 않습니다.

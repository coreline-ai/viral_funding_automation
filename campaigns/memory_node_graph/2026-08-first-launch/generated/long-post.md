# AI Systems Atlas DEV 기술 글 초안

> 이 글은 GitHub README와 저장소 메타데이터에서 확인한 사실로 만든 기술 초안입니다. DEV 게시 전 실제 설계 과정과 실행 예제를 직접 보강하세요.

## 해결하려는 문제

Markdown 문서를 빛나는 관계형 지식 그래프로 변환·탐색하는 프로젝트입니다.

README 내용을 기준으로 다음 개발자와 팀이 검토할 수 있는 프로젝트입니다.

- 문서와 지식 관계를 탐색하려는 AI 개발자
- Markdown 문서를 구조화해 활용하려는 개발팀
- 브라우저 기반 데이터 시각화에 관심 있는 개발자

## 접근 방식

저장소가 공개한 핵심 기능은 다음과 같습니다.

- GPU 발광 그래프 — Three.js 점광·후광·관계선·배경 입자 렌더링
- 3가지 관점 — 별자리, 성운, 선택 노드 중심 궤도
- Markdown 지식 추출 — README와 개발 계획 전용 parser profile
- 근거 관계 — commit·path·line이 고정된 GitHub source evidence
- 관계 계층 — 구조, 명시, 추론, 비저장 화면 연결을 시각적으로 구분

각 기능을 실제로 구현하면서 선택한 이유와 대안을 게시 전에 이 섹션에 추가하면, 링크 소개가 아니라 독립적인 기술 글이 됩니다.

## 구현 구성

저장소 메타데이터와 패키지 정보에서 확인한 기술 구성입니다.

- TypeScript
- ai
- cloudflare-d1
- coreline-ai
- data-visualization
- document-parsing
- graph-rag
- knowledge-graph
- local-first
- markdown

구성 요소가 서로 어떻게 연결되는지, 핵심 데이터 흐름과 트레이드오프를 실제 코드 기준으로 보강하세요.

## 직접 실행하기

공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation

GitHub: https://github.com/coreline-ai/memory_node_graph

설치와 로컬 실행 명령은 원본 README에서 최신 내용을 확인하세요: https://github.com/coreline-ai/memory_node_graph/blob/main/README.md

## 현재 한계

- Node.js 22.13+
- 로컬 D1은 Wrangler/Miniflare가 자동 구성

## 소스와 라이선스

- 저장소: https://github.com/coreline-ai/memory_node_graph
- 라이선스: MIT
- 기본 브랜치: main

## 게시 전 보강할 내용

- [ ] 이 프로젝트를 만들게 된 실제 계기
- [ ] 핵심 구현을 보여주는 코드 또는 명령 예제
- [ ] 선택하지 않은 대안과 현재 설계의 트레이드오프
- [ ] 직접 실행해 확인한 결과와 알려진 실패 사례

## 피드백

AI Systems Atlas를 사용해 보고, 막히거나 이해하기 어려운 부분을 GitHub Issue로 알려주세요.

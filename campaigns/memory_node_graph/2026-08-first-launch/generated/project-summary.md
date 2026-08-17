# AI Systems Atlas

Markdown 문서를 빛나는 관계형 지식 그래프로 변환·탐색하는 AI Systems Atlas

## 대상 사용자

- 문서와 지식 관계를 탐색하려는 AI 개발자
- Markdown 문서를 구조화해 활용하려는 개발팀
- 브라우저 기반 데이터 시각화에 관심 있는 개발자

## 핵심 기능

- GPU 발광 그래프 — Three.js 점광·후광·관계선·배경 입자 렌더링
- 3가지 관점 — 별자리, 성운, 선택 노드 중심 궤도
- Markdown 지식 추출 — README와 개발 계획 전용 parser profile
- 근거 관계 — commit·path·line이 고정된 GitHub source evidence
- 관계 계층 — 구조, 명시, 추론, 비저장 화면 연결을 시각적으로 구분

## 구현 기술

- TypeScript
- @openai/codex-sdk
- d3-force-3d
- drizzle-orm
- next
- react
- react-dom
- remark-gfm
- remark-parse
- three
- unified
- unist-util-visit

## GitHub Topics

- ai
- cloudflare-d1
- coreline-ai
- data-visualization
- document-parsing
- graph-rag
- knowledge-graph
- local-first
- markdown
- nextjs
- rag
- react

## 링크

- GitHub: https://github.com/coreline-ai/memory_node_graph
- 공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
- 라이선스: MIT

## 공개 범위와 현재 한계

- 로그인 없이 Vercel 공개 배포본을 바로 열어 그래프를 회전·이동·확대하고 노드 관계를 탐색할 수 있습니다. 공개 앱은 GitHub에 커밋된 검증 JSON만 읽는 읽기 전용 정적 배포이며 운영 D1, API Route, OAuth 토큰을 포함하지 않습니다.

## 로컬 실행 요구사항

- Node.js 22.13+
- 로컬 D1은 Wrangler/Miniflare가 자동 구성

## 근거

- README: https://github.com/coreline-ai/memory_node_graph/blob/main/README.md

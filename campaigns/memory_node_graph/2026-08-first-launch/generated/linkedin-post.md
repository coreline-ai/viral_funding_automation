# LinkedIn 게시물 초안

AI Systems Atlas를 만들면서 해결하려고 했던 문제는 단순했습니다.

Markdown 문서를 빛나는 관계형 지식 그래프로 변환·탐색하는 프로젝트입니다.

이번 공개 버전에서는 다음 흐름을 확인할 수 있습니다.

- GPU 발광 그래프 — Three.js 점광·후광·관계선·배경 입자 렌더링
- 3가지 관점 — 별자리, 성운, 선택 노드 중심 궤도
- Markdown 지식 추출 — README와 개발 계획 전용 parser profile

기술 구성: TypeScript · ai · cloudflare-d1 · coreline-ai · data-visualization · document-parsing

누구에게 유용한가:

- 문서와 지식 관계를 탐색하려는 AI 개발자
- Markdown 문서를 구조화해 활용하려는 개발팀
- 브라우저 기반 데이터 시각화에 관심 있는 개발자

공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph
라이선스: MIT

현재 한계:

- Node.js 22.13+
- 로컬 D1은 Wrangler/Miniflare가 자동 구성

비슷한 문제를 해결해 본 분들의 구현 경험과 협업 피드백을 듣고 싶습니다.

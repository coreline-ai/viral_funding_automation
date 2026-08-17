# LinkedIn 게시물 초안

AI Systems Atlas의 공개 버전을 정리했습니다.

Markdown 문서를 빛나는 관계형 지식 그래프로 변환·탐색하는 프로젝트입니다.

이번 버전에서 직접 확인할 수 있는 흐름은 다음과 같습니다.

- GPU 발광 그래프 — Three.js 점광·후광·관계선·배경 입자 렌더링
- 3가지 관점 — 별자리, 성운, 선택 노드 중심 궤도
- Markdown 지식 추출 — README와 개발 계획 전용 parser profile

구현 구성: TypeScript · @openai/codex-sdk · d3-force-3d · drizzle-orm · next · react · react-dom · remark-gfm · remark-parse · three

누구에게 유용한가:

- 문서와 지식 관계를 탐색하려는 AI 개발자
- Markdown 문서를 구조화해 활용하려는 개발팀
- 브라우저 기반 데이터 시각화에 관심 있는 개발자

공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph
라이선스: MIT

공개 범위와 현재 한계:

- 로그인 없이 Vercel 공개 배포본을 바로 열어 그래프를 회전·이동·확대하고 노드 관계를 탐색할 수 있습니다. 공개 앱은 GitHub에 커밋된 검증 JSON만 읽는 읽기 전용 정적 배포이며 운영 D1, API Route, OAuth 토큰을 포함하지 않습니다.

첫 화면에서 프로젝트의 목적과 탐색 방법이 이해되는지, 실무 문서에 적용한다면 어떤 정보가 더 필요한지 의견을 듣고 싶습니다.

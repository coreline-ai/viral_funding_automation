# OKKY 프로젝트 소개·피드백 작업본

상태: `커뮤니티 규칙과 최종 말투 확인 후 게시`

- 커뮤니티: https://okky.kr/community

## 제목

[프로젝트 공유] AI Systems Atlas — Markdown 문서를 빛나는 관계형 지식 그래프로 변환·탐색하는 프로젝트

## 본문

안녕하세요. 직접 개발한 AI Systems Atlas의 현재 공개 버전을 공유합니다.

Markdown 문서를 빛나는 관계형 지식 그래프로 변환·탐색하는 프로젝트입니다.

현재 확인할 수 있는 기능:

- GPU 발광 그래프 — Three.js 점광·후광·관계선·배경 입자 렌더링
- 3가지 관점 — 별자리, 성운, 선택 노드 중심 궤도
- Markdown 지식 추출 — README와 개발 계획 전용 parser profile
- 근거 관계 — commit·path·line이 고정된 GitHub source evidence

공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph
라이선스: MIT

공개 범위와 현재 한계:

- 로그인 없이 Vercel 공개 배포본을 바로 열어 그래프를 회전·이동·확대하고 노드 관계를 탐색할 수 있습니다. 공개 앱은 GitHub에 커밋된 검증 JSON만 읽는 읽기 전용 정적 배포이며 운영 D1, API Route, OAuth 토큰을 포함하지 않습니다.

처음 사용하셨을 때 설명이 부족한 부분이나 실제 개발 업무에서 필요할 것 같은 사용 예시를 알려주시면 다음 수정에 참고하겠습니다.

## 게시 전 확인

- [ ] OKKY 게시판과 프로젝트 공유 규칙 확인
- [ ] 광고문이 아닌 개발 경험과 현재 한계 중심으로 최종 수정
- [ ] 데모·GitHub 링크가 외부에서 열림
- [ ] Star·추천·반복 댓글을 요청하지 않음

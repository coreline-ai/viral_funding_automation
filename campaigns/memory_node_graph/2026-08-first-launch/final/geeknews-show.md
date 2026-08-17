# GeekNews Show 첫 게시 최종 초안

상태: `게시 전 사용자 최종 검토 필요`  
등록 구분: `Show`  
대표 링크: `https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation`

## 제목

AI Systems Atlas – Markdown 문서를 근거가 남는 3D 지식 그래프로 탐색하는 오픈소스

## 한 줄 소개

README와 개발 계획 Markdown을 파싱해 노드와 관계를 만들고, 출처 근거와 함께 Three.js 그래프에서 탐색할 수 있게 만든 로컬 우선 지식 그래프 웹앱입니다.

## 본문

프로젝트를 진행하면서 README와 개발 계획이 계속 쌓이는데, 파일을 하나씩 검색하는 방식만으로는 “어떤 개념과 작업이 서로 연결되어 있는가”를 파악하기 어려웠습니다. 그래서 Markdown의 문서 구조와 명시된 관계를 추출해 직접 탐색할 수 있는 그래프로 만들었습니다.

AI Systems Atlas는 Markdown을 Remark AST로 파싱하고 문서·섹션·개념·Phase·Task를 노드로 구성합니다. 구조 관계와 명시 관계는 출처 경로와 함께 관리하고, 브라우저에서는 별자리·성운·선택 노드 중심 궤도 보기로 탐색할 수 있습니다.

공개 데모는 로그인 없이 바로 열립니다. 운영 데이터베이스나 OAuth 기능을 연결하지 않은 읽기 전용 정적 버전이며, 검색·필터·확대·회전과 노드 관계 탐색을 직접 시험할 수 있습니다.

- 공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
- GitHub: https://github.com/coreline-ai/memory_node_graph
- 라이선스: MIT
- 주요 기술: TypeScript, React, Three.js, Cloudflare D1

현재는 활성 프로토타입 단계입니다. 로컬 전체 기능은 Node.js 22.13 이상이 필요하고, 공개 데모는 검증된 정적 snapshot만 보여주는 읽기 전용 버전입니다.

첫 화면에서 출처 근거가 있는 관계와 화면 구성용 연결이 구분되는지, 노드를 탐색할 때 어떤 근거 정보가 가장 먼저 필요한지 의견을 듣고 싶습니다.

## 대표 이미지

`../assets/ai-systems-atlas-live.png`

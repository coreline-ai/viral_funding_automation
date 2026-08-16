# memory_node_graph 테마 적용 분석

작성일: 2026-08-16

## 확인 대상

- GitHub: https://github.com/coreline-ai/memory_node_graph
- 공개 앱: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
- 로컬 소스: `/Volumes/Eprojects/project_202608/node_wiki`
- 주요 파일:
  - `app/globals.css`
  - `app/knowledge-graph.tsx`
  - `app/layout.tsx`
  - `public/og.png`

## 실제 디자인 시스템

### 색상

| 역할 | 실제 값 |
|---|---|
| 배경 | `#07090b` |
| 반투명 표면 | `rgba(13, 16, 20, 0.88)` |
| 강한 표면 | `rgba(17, 20, 25, 0.97)` |
| 주 텍스트 | `#f3efe6` |
| 보조 텍스트 | `#b9b5ad` |
| 약한 텍스트 | `#777a80` |
| 파랑 | `#65b5ff` |
| 보라 | `#9f7aea` |
| 호박색 | `#f3b35b` |
| 민트 | `#79d5c0` |

### 타이포그래피

- UI: Aptos, Helvetica Neue, Pretendard 계열
- 기술 라벨: SFMono, Cascadia Code, Roboto Mono 계열
- 작은 대문자 eyebrow와 넓은 자간으로 기술적 맥락 표시

### 레이아웃과 컴포넌트

- 304px 고정 왼쪽 레일 + 전체 그래프 스테이지
- 1px 반투명 경계선
- 작은 원형 별자리 브랜드 마크
- 활성 상태에만 파란 선과 제한된 발광 사용
- 상단 검색 command, 하단 제어 dock
- 검은 배경 위에 희소한 점·관계선·색상 신호 사용

## viral_funding_automation 적용 판단

판정: **적용 가능성이 매우 높음**

| 원본 요소 | 변환 대상 | 적용 판단 |
|---|---|---|
| 304px 필터 레일 | 저장소 정보·근거 레일 | 직접 적용 가능 |
| 그래프 스테이지 | 콘텐츠 편집 영역 | 구조만 적용 |
| 상단 검색 | GitHub URL 입력 | 직접 적용 가능 |
| 하단 그래프 제어 | 복사·저장·전체 다운로드 dock | 직접 적용 가능 |
| 색상·표면·경계 토큰 | 전체 GUI 테마 | 직접 재사용 가능 |
| 별자리 브랜드 마크 | Coreline Launch 마크 | 변형 적용 가능 |
| 3D 그래프·GPU bloom | 장식 배경 | 적용하지 않음 |
| 매우 작은 8~10px 텍스트 | 본문·주요 컨트롤 | 그대로 적용하지 않음 |

## 적용 원칙

- 테마와 브랜드 연속성은 유지한다.
- 그래프 자체를 콘텐츠 편집 화면에 넣지 않는다.
- 글 편집 영역 뒤에는 노드와 연결선을 배치하지 않는다.
- 발광은 초점·검증 상태·브랜드 마크에만 제한한다.
- 본문은 최소 16px, UI는 최소 13~14px로 가독성을 높인다.
- 기존 Node.js 수집·생성 엔진은 변경하지 않는다.
- 테마는 HTML/CSS만으로 구현하며 Three.js 의존성을 추가하지 않는다.

## 적용 시안

- 원본 실제 캡처: `output/playwright/memory-node-graph-live.png`
- 적용 시안: `reviews/design/coreline-launch-memory-node-graph-theme-v3.png`

## 시안의 화면 변환

1. Atlas 왼쪽 필터 → 저장소 확인 및 콘텐츠 근거
2. Atlas 상단 검색 → GitHub URL 입력과 콘텐츠 생성
3. Atlas 그래프 영역 → 세 가지 콘텐츠 편집기
4. Atlas 하단 제어 → 복사, Markdown 저장, 전체 다운로드
5. Atlas 노드 색상 → README·License·Demo·기술 상태 신호

## 결론

memory_node_graph의 시각 언어는 같은 Coreline 프로젝트라는 인상을 주기에 적합하다. 단, 그래프와 강한 bloom을 그대로 복제하지 않고 `어두운 캔버스 + 얇은 경계 + mono 라벨 + 작은 발광 상태점`만 가져오는 방식이 맞다.

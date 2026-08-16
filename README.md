# Viral Funding Automation MVP

공개 GitHub 저장소 URL 하나를 읽어 프로젝트 요약과 사람이 검토할 바이럴 콘텐츠 초안을 생성하는 로컬 웹앱입니다.

## 현재 지원 범위

```text
공개 GitHub URL 1개 입력 → 프로젝트 요약 + 3종 바이럴 콘텐츠 생성
```

- 공개 저장소만 지원
- README, license, 저장소 metadata, 선택적 `package.json`만 읽음
- 원본 저장소 수정 없음
- 자동 게시 없음
- 후원 연결 없음
- 외부 패키지와 LLM API 없음
- 브라우저에서 콘텐츠 3종 편집·복사·Markdown 다운로드

## 요구사항

- Node.js 22 이상
- 공개 GitHub API 접근
- 선택: `GITHUB_TOKEN` 또는 `GH_TOKEN` 환경변수

## 웹 GUI 실행

```bash
npm run web
```

브라우저에서 다음 주소를 엽니다.

```text
http://127.0.0.1:4310
```

사용 순서:

1. 내 프로젝트는 공개 GitHub URL을 입력한 뒤 `콘텐츠 생성`을 누릅니다.
2. 빠르게 확인하려면 `memory_node_graph 예제로 1턴 실행`을 한 번만 누릅니다.
3. 짧은 소개·커뮤니티 글·상세 소개를 확인하고 수정합니다.
4. 현재 원고를 복사하거나 Markdown으로 내려받습니다.
5. 결과 아래 `직접 게시 전 준비`에서 `게시 직전 기준점 갱신`을 누릅니다.
6. Star·Fork·GitHub의 Open Issue/PR 수와 수집 시각을 확인합니다.
7. GeekNews 계정·공식 규칙·Show 분류·최종 원고·Traffic 캡처 항목을 직접 확인합니다.
8. 다섯 항목을 모두 체크한 뒤 `게시 준비 문서 내려받기`로 최종 원고와 기준점을 저장합니다.

게시 준비 패널은 [GeekNews 공식 이용법](https://news.hada.io/guidelines)과 [Show 목록](https://news.hada.io/show)만 연결합니다. GeekNews 로그인, 계정 연령 판정, 글 등록은 자동화하지 않습니다. GitHub Traffic도 관리자 전용 정보이므로 token을 브라우저에 저장하지 않고 사용자가 직접 캡처합니다.

예제 버튼은 가짜 데이터를 표시하지 않고 다음 공개 저장소를 실제로 분석합니다.

```text
https://github.com/coreline-ai/memory_node_graph
```

마지막으로 성공한 저장소 정보와 수정한 콘텐츠 3종은 현재 브라우저의 `localStorage`에만 저장됩니다. 같은 브라우저에서 새로고침하면 이전 작업을 복원하며, 최신 GitHub 내용이 필요하면 `콘텐츠 생성`을 다시 누르세요. GitHub 토큰과 요청 헤더는 브라우저에 저장하지 않습니다.

서버는 로컬 주소 `127.0.0.1`에만 열립니다. 종료할 때 실행한 터미널에서 `Ctrl+C`를 누릅니다.

## CLI 실행

```bash
npm run generate -- \
  --repo https://github.com/coreline-ai/memory_node_graph \
  --out output
```

생성 파일:

```text
output/memory_node_graph/
├─ project-summary.json
├─ project-summary.md
├─ viral-hooks.md
├─ short-post.md
├─ community-post.md
└─ long-post.md
```

생성 결과는 초안입니다. 사실과 링크를 사람이 확인한 뒤 직접 게시해야 합니다.

## GUI 테마

GUI는 `memory_node_graph`의 어두운 색상, 반투명 표면, 얇은 경계선, UI·monospace 조합만 참고합니다. 해당 프로젝트의 이미지·그래프·로고·Three.js 코드는 사용하지 않습니다.

## 테스트

```bash
npm test
```

# memory_node_graph 바이럴 준비 상태

점검 일시: `2026-08-16 KST`  
로컬 저장소: `/Volumes/Eprojects/project_202608/node_wiki`  
점검 commit: `d8b7ca3`  
판정: `첫 캠페인 준비 가능`

## 핵심 확인 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| 저장소 상태 | 통과 | 로컬 `main`과 `github/main`이 `d8b7ca3`에서 일치, 검증 후 working tree clean |
| 라이선스 | 통과 | `LICENSE.md`, MIT License |
| 한 줄 설명 | 통과 | “Markdown을 살아 있는 관계형 지식 우주로”와 프로젝트 개요 제공 |
| 대표 이미지 | 통과 | README hero·화면 갤러리 보유, 이번 출시팩에 실제 라이브 캡처 추가 |
| 공개 데모 | 통과 | 로그인 없는 읽기 전용 Vercel 배포, HTTP 200 |
| Quick Start | 통과 | Node.js 22.13+, `npm install`, `npm run dev` 제공 |
| 핵심 기능 설명 | 통과 | GPU 그래프, 3가지 관점, Markdown 추출, 근거 관계, 관계 계층 설명 |
| 기술 근거 | 통과 | TypeScript, React, Three.js, Cloudflare D1과 처리 구조 공개 |
| 공개 빌드 | 통과 | `npm run ci:public` 완료, Function·API Route·DB 연결 없는 정적 산출물 검증 |
| GitHub Topics | 통과 | knowledge graph·graph RAG·Markdown·data visualization 관련 topics 확인 |
| Release/Tag | 보완 가능 | 현재 로컬 tag 없음. 첫 캠페인의 필수 차단 조건은 아님 |
| 짧은 GIF/영상 | 보완 가능 | 실제 화면 이미지와 갤러리는 충분하나 30초 이하 GIF는 아직 없음 |
| 후원 연결 | 의도적 보류 | 첫 수요 실험과 Show HN 가능성을 오염시키지 않도록 후순위 유지 |

## 실제 검증 값

```text
npm run ci:public
→ public graph snapshot 검증
→ 500 nodes
→ 1,414 factual edges
→ 400 display edges
→ Vite production build 성공
→ Vercel 정적 산출물 검사 성공

GET https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
→ HTTP 200
```

## 현재 준비도 해석

기존 100점 표의 엄격한 점수로는 `70/100`이다. 아직 없는 짧은 GIF, Release/Tag, 영문 상세 소개와 의도적으로 미룬 후원 연결 점수를 제외했기 때문이다.

하지만 현재 캠페인의 목적은 점수 채우기가 아니라 **외부 사용자가 실제 데모를 열고 프로젝트를 이해할 수 있는지 확인하는 것**이다. 로그인 없는 공개 데모, 실제 화면, MIT 라이선스, Quick Start와 소스가 모두 있으므로 첫 저위험 캠페인은 진행할 수 있다.

## 게시 전 남은 사용자 확인

- GeekNews 계정이 링크 등록 요건을 충족하는지 확인한다.
- 반드시 `뉴스`가 아닌 `Show`에 등록한다.
- 제목과 소개문을 운영자 본인의 말투로 최종 확인한다.
- 게시 직전 GitHub Traffic·Star·Fork·Issue 기준점을 캡처한다.


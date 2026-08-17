# AI Systems Atlas 채널별 최종 교정 원고팩

검토 일시: `2026-08-17 KST`

검증 기준:

- 공개 저장소: https://github.com/coreline-ai/memory_node_graph
- 공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
- 라이선스: `MIT`
- 공개 데모 경계: 로그인 없는 읽기 전용 정적 snapshot
- 로컬 앱 경계: Markdown 가져오기·저장소 동기화 등 쓰기 기능은 로컬 앱에서 사용

이 문서의 `조건부 사용 가능`은 콘텐츠 형식과 사실성이 채널에 맞는다는 뜻이다. 실제 노출이나 반응을 보장한다는 뜻은 아니다. 계정·채널 규칙·자산 조건이 남은 원고는 해당 조건을 확인한 뒤 사용한다.

## 상태 요약

| 채널 원고 | 판정 | 남은 조건 |
|---|---|---|
| X 단일 3안·스레드 | 조건부 사용 가능 | 한 안만 선택, 대표 이미지·게시 시점 확인 |
| Threads | 조건부 사용 가능 | 첫 글에 실제 제품 화면 첨부 |
| LinkedIn | 조건부 사용 가능 | 운영자 경험·말투 최종 확인 |
| Disquiet | 조건부 사용 가능 | 제품 등록·검토와 연결 포스트 권한 확인 |
| Facebook Reels | 조건부 사용 가능 | 기존 세로 영상 검수 |
| Facebook 그룹 | 보류 | 그룹 규칙과 자기홍보 허용 확인 |
| Instagram Reels | 조건부 사용 가능 | 프로필 링크·표지·영상 검수 |
| Product Hunt | 조건부 사용 가능 | 별도 영문 정본과 계정·Create Draft 확인 |
| Peerlist | 보류 | 인증 프로필·프로젝트 100%·영문 최종 검토 |
| Indie Hackers | 보류 | 실제 제작 경험·실패·결정을 작성자가 추가 |
| OKKY | 조건부 사용 가능 | 카테고리와 운영정책 확인 |
| GeekNews Show | 조건부 사용 가능 | 별도 최종본과 가입 1주·중복 확인 |
| YouTube Shorts | 조건부 사용 가능 | 완성 영상·권리·자막 검수 |
| Reddit | 게시 금지 | 서브레딧·계정·Flair·언어 확정 후 새로 작성 |
| DEV | 게시 금지 | 사람의 기술 사례로 전면 작성하고 AI 보조 공개 |
| Show HN | 생성 원고 사용 금지 | 작성자가 LLM 도움 없이 처음부터 직접 작성 |

---

## X 단일 게시물 1안 — 문제 중심

```text
README와 dev-plan이 쌓일수록 검색만으로는 문서 사이 연결을 놓치기 쉽습니다.

AI Systems Atlas는 Markdown의 노드·관계와 출처 근거를 3D 그래프로 보여줍니다.

https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
```

## X 단일 게시물 2안 — 차별점 중심

```text
이 선은 실제 관계일까, 화면을 보기 좋게 잇는 연결일까?

AI Systems Atlas는 source path·line이 있는 관계와 시각화용 연결을 분리합니다. 로그인 없는 읽기 전용 데모에서 확인해 보세요.

https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
```

## X 단일 게시물 3안 — 구현 흐름 중심

```text
Markdown → Remark AST → 근거 관계 → Three.js 3가지 보기.

AI Systems Atlas는 문서 구조와 출처를 함께 탐색하는 오픈소스 웹앱입니다.

https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
```

## X 스레드 3개 구간

### 1/3

```text
1/3 README와 개발 계획이 쌓이면 파일은 검색할 수 있어도, 결정·개념·작업이 어떻게 연결되는지는 놓치기 쉽습니다.

그래서 Markdown 구조와 관계를 직접 탐색할 수 있는 AI Systems Atlas를 만들었습니다.
```

### 2/3

```text
2/3 Markdown을 Remark AST로 파싱해 문서·섹션·개념·작업을 노드로 만듭니다.

출처 path·line 근거가 있는 관계와 화면 구성용 연결을 분리하고, 별자리·성운·궤도 보기로 탐색합니다.
```

### 3/3

```text
3/3 공개 데모는 로그인 없는 읽기 전용 정적 snapshot입니다. Markdown 가져오기와 저장소 동기화는 로컬 앱에서 사용할 수 있습니다.

첫 화면에서 관계의 근거와 탐색 방법이 이해되는지 알려주세요.

https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
```

---

## Threads 연속 게시 3개

### 1/3

```text
README와 개발 계획이 계속 쌓이면 파일은 찾을 수 있어도, 개념과 작업이 어떻게 연결되는지는 놓치기 쉽습니다.

이 문제를 직접 탐색하기 위해 AI Systems Atlas를 만들었습니다. Markdown을 노드와 관계로 바꾸고 Three.js 그래프에서 보여주는 오픈소스 웹앱입니다.
```

### 2/3

```text
구현하면서 중요하게 본 건 “보이는 선이 모두 사실 관계처럼 보이지 않게 하는 것”이었습니다.

그래서 source path·line 근거가 있는 관계와 화면을 구성하기 위한 연결을 분리했습니다. 노드를 선택하면 별자리·성운·궤도 보기에서 주변 관계를 탐색할 수 있습니다.
```

### 3/3

```text
로그인 없이 읽기 전용 공개 데모를 열 수 있습니다. Markdown 가져오기와 저장소 동기화는 로컬 앱에서 사용합니다.

문서를 검색해서 파일은 찾았지만, 관련된 결정이나 작업 연결을 놓친 경험이 있나요? 첫 화면에서 가장 이해하기 어려운 부분도 알려주세요.

https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
```

---

## LinkedIn 게시물

```text
문서가 많아질수록 “어디에 적혀 있나”보다 “이 결정이 어떤 개념과 작업에 연결됐나”를 파악하기가 더 어려워졌습니다.

이 문제를 탐색하기 위해 AI Systems Atlas의 공개 버전을 만들었습니다.

README와 dev-plan Markdown을 Remark AST로 파싱해 문서·섹션·개념·작업 노드를 만들고, source path·line 근거가 있는 관계와 화면 구성용 연결을 분리합니다. 결과는 Three.js의 별자리·성운·궤도 보기에서 탐색할 수 있습니다.

공개 데모는 로그인 없는 읽기 전용 정적 snapshot입니다. Markdown 가져오기와 저장소 동기화는 로컬 앱에서 사용할 수 있습니다.

데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph
라이선스: MIT

기술 문서를 다룰 때 전체 맥락과 출처 추적 중 어느 쪽이 더 부족하다고 느끼시나요?
```

---

## Disquiet 제품 연결 포스트

제품 등록과 검토가 끝난 뒤 제품에 연결해서 사용한다.

```text
README와 개발 계획이 쌓일수록 파일 검색만으로는 개념·결정·작업 사이의 연결을 파악하기 어려웠습니다.

AI Systems Atlas는 Markdown을 문서·섹션·개념·작업 노드로 변환하고, 출처 근거가 있는 관계와 화면 구성용 연결을 분리해 Three.js 그래프에서 탐색하는 오픈소스 웹앱입니다.

로그인 없는 공개 데모에서는 별자리·성운·궤도 보기와 노드 관계 탐색을 확인할 수 있습니다. 공개 데모는 읽기 전용 정적 snapshot이며, Markdown 가져오기와 저장소 동기화는 로컬 앱에서 사용할 수 있습니다.

데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph

첫 30초 안에 문서에서 그래프로 이어지는 흐름이 이해되는지, 관계를 판단할 때 어떤 근거가 더 필요한지 알려주세요.
```

---

## Facebook Reels 캡션

```text
README와 개발 계획이 쌓일수록 문서 사이 연결은 찾기 어려워집니다.

AI Systems Atlas가 Markdown을 노드와 관계로 바꾸고, 출처 근거와 함께 3D 그래프에서 보여주는 흐름을 20초로 정리했습니다.

공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph
```

## Facebook 그룹 본문

`자기홍보와 외부 링크를 명시적으로 허용하는 그룹 한 곳`을 정한 뒤 해당 그룹 언어와 규칙에 맞춰 다시 작성한다. 동일 문구를 여러 그룹에 반복 게시하지 않는다.

---

## Instagram Reels

### 표지

```text
Markdown 관계를 3D로 보는 방법
```

### 캡션

```text
README와 개발 계획, 파일 검색만으로 문서 사이의 연결까지 보이시나요?

AI Systems Atlas가 Markdown을 노드·관계로 바꾸고, source path·line 근거와 함께 Three.js에서 보여주는 흐름을 20초로 담았습니다.

공개 데모는 로그인 없는 읽기 전용 정적 snapshot입니다. 데모와 GitHub는 프로필 링크에서 확인할 수 있습니다.

#opensource #buildinpublic #devtools
```

프로필 링크가 실제 데모 또는 링크 허브로 연결된 것을 확인한 경우에만 마지막 두 번째 문장을 사용한다.

---

## Product Hunt

영문 정본은 [`product-hunt-launch.md`](./product-hunt-launch.md)를 사용한다. 자동 생성된 한국어 Product Hunt 작업본은 게시하지 않는다.

---

## Peerlist Launchpad 영문 작업본

상태: `HOLD — 인증 프로필·프로젝트 완성도·실제 폼 확인 필요`

### Tagline

```text
Explore Markdown as a source-backed 3D knowledge graph
```

### Description

```text
AI Systems Atlas parses README and dev-plan Markdown into document, section, concept, and task nodes. It keeps source-backed relationships separate from display-only connections and renders the result in three interactive Three.js views. The live demo is a no-sign-up, read-only snapshot, and the source is available under the MIT license.
```

### Maker note

```text
I built AI Systems Atlas after long collections of READMEs and development plans made it difficult to see how concepts, decisions, and tasks connect. I would value feedback on whether the first screen explains the graph clearly and whether the source evidence is sufficient to trust each relationship.
```

---

## Indie Hackers 작성자 작업본

상태: `HOLD — 아래 구조에 실제 제작 경험과 실패를 작성자가 추가`

### 제목 후보가 아니라 작성 주제

```text
How do you keep source evidence visible in a knowledge graph?
```

본문에는 반드시 다음을 작성자 본인의 경험으로 추가한다.

1. 문서 관계를 놓쳐 실제로 겪은 문제
2. 출처 근거 관계와 화면 구성용 연결을 분리한 이유
3. 실패하거나 버린 접근 한 가지
4. 현재 공개 데모가 읽기 전용 정적 snapshot인 이유
5. `onboarding`과 `실제 저장소 import 데모` 중 무엇을 먼저 개선할지 묻는 질문

---

## OKKY 게시물

### 제목

```text
[프로젝트 공유] Markdown 문서 관계를 3D로 탐색하는 AI Systems Atlas
```

### 본문

```text
안녕하세요. README와 개발 계획이 쌓일수록 파일 검색만으로는 개념·결정·작업 사이의 연결을 파악하기 어려워 직접 만든 오픈소스 프로젝트를 공유합니다.

AI Systems Atlas는 Markdown을 Remark AST로 파싱해 문서·섹션·개념·작업 노드를 만들고, source path·line 근거가 있는 관계와 화면 구성용 연결을 분리해 Three.js 그래프에서 탐색할 수 있게 합니다.

공개 데모는 로그인 없는 읽기 전용 정적 snapshot입니다. Markdown 가져오기와 저장소 동기화는 로컬 앱에서 사용할 수 있습니다.

데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph
라이선스: MIT

노드를 클릭한 뒤 path·line 근거가 관계를 판단하기에 충분한지, 첫 화면에서 탐색 방법이 이해되는지 피드백을 부탁드립니다.
```

---

## GeekNews Show

검토된 정본은 [`geeknews-show.md`](./geeknews-show.md)를 사용한다. 자동 생성 `geeknews-show.md`는 README 요약 작업본이므로 대체하지 않는다.

---

## YouTube Shorts

### 제목

```text
Markdown 문서 관계를 3D로 탐색하는 AI Systems Atlas #Shorts
```

### 설명

```text
AI Systems Atlas는 README와 dev-plan Markdown을 노드와 출처 근거가 있는 관계로 변환해 Three.js에서 탐색하는 오픈소스 웹앱입니다.

공개 데모: https://ai-systems-atlas.vercel.app/?scope=corpus&view=constellation
GitHub: https://github.com/coreline-ai/memory_node_graph
라이선스: MIT
```

### 20초 자막

| 구간 | 자막 |
|---|---|
| 0~3초 | README가 쌓일수록 연결은 보이지 않습니다 |
| 3~7초 | Markdown을 노드와 관계로 변환 |
| 7~12초 | source path·line 근거 확인 |
| 12~16초 | 별자리·성운·궤도 3가지 보기 |
| 16~20초 | 로그인 없는 읽기 전용 공개 데모 |

---

## Reddit — 새로 작성하기 전 게시 금지

대상 서브레딧을 먼저 고르고 계정 연령·Karma·Flair·링크·자기홍보 규칙을 확인한다. 현재 생성본은 영어 제목과 한국어 본문이 섞인 범용 글이므로 사용하지 않는다.

## DEV — 기술 사례 완성 전 게시 금지

README 내용을 재배열한 생성본을 사용하지 않는다. 작성자가 실제 코드·명령, AST→저장→snapshot 흐름, 근거 관계와 화면 연결의 트레이드오프, 실패 사례를 포함해 기술 글을 새로 쓰고 AI 보조 사실을 공개한다.

## Show HN — 생성·교정 원고 사용 금지

Show HN 제목과 설명은 작성자가 LLM의 생성·편집·윤문 도움 없이 처음부터 본인의 영어로 직접 작성한다. 현재 프로젝트는 사실 체크리스트만 제공하며 게시문을 만들지 않는다.

# 게시 전 미리보기 QA 증거 인덱스 — 2026-08-22

## 범위

이 인덱스는 `dev-plan/implement_20260822_083934.md`의 X·Threads 및 17개 후속 preview 구현에서 보관한 로컬 Playwright 캡처 경로를 정리한다. 모든 화면은 local visual review이며 실제 소셜 API request/write, 업로드, 예약을 포함하지 않는다.

| 서비스 | 캡처 경로 | 확인 viewport |
|---|---|---|
| X | `output/playwright/x-high-fidelity-desktop.png`, `x-high-fidelity-mobile.png`, `x-high-fidelity-thread-390.png`, `x-high-fidelity-thread-mobile.png` | desktop, 390px, mobile |
| Threads | `output/playwright/threads-preview-desktop.png`, `threads-preview-mobile.png` | desktop, mobile |
| LinkedIn | `output/playwright/linkedin-preview-desktop.png`, `linkedin-preview-mobile.png` | desktop, mobile |
| Facebook | `output/playwright/facebook-reels-preview-desktop.png`, `facebook-reels-preview-mobile.png`, `facebook-group-context-gate.png`, `facebook-group-context-mobile.png` | desktop, mobile, group gate |
| Instagram | `output/playwright/instagram-reels-preview-desktop.png`, `instagram-reels-preview-mobile.png` | desktop, mobile |
| YouTube Shorts | `output/playwright/shorts-preview-desktop.png`, `shorts-preview-mobile.png` | desktop, mobile |
| TikTok | `output/playwright/tiktok-preview-desktop.png`, `tiktok-preview-mobile.png`, `tiktok-preview-320.png` | desktop, 390px, 320px |
| Product Hunt | `output/playwright/product-hunt-preview-desktop.png`, `product-hunt-preview-mobile.png`, `product-hunt-preview-320.png` | desktop, 390px, 320px |
| Peerlist | `output/playwright/peerlist-preview-desktop.png`, `peerlist-preview-mobile.png`, `peerlist-preview-320.png` | desktop, 390px, 320px |
| Disquiet | `output/playwright/disquiet-preview-desktop.png`, `disquiet-preview-mobile.png`, `disquiet-preview-320.png` | desktop, 390px, 320px |
| Reddit | `output/playwright/reddit-preview-desktop.png`, `reddit-preview-mobile.png`, `reddit-preview-320.png` | desktop, 390px, 320px |
| Indie Hackers | `output/playwright/indie-hackers-preview-desktop.png`, `indie-hackers-preview-mobile.png`, `indie-hackers-preview-320.png` | desktop, 390px, 320px |
| DEV | `output/playwright/dev-preview-desktop.png`, `dev-preview-mobile.png`, `dev-preview-320.png` | desktop, 390px, 320px |
| OKKY | `output/playwright/okky-preview-desktop.png`, `okky-preview-mobile.png`, `okky-preview-320.png` | desktop, 390px, 320px |
| GeekNews | `output/playwright/geeknews-preview-desktop.png`, `geeknews-preview-mobile.png`, `geeknews-preview-320.png` | desktop, 390px, 320px |
| Show HN | `output/playwright/show-hn-preview-desktop.png`, `show-hn-preview-mobile.png`, `show-hn-preview-320.png` | desktop, 390px, 320px |
| Discord | `output/playwright/discord-preview-desktop.png`, `discord-preview-mobile.png`, `discord-preview-320.png` | desktop, 390px, 320px |
| Bluesky | `output/playwright/bluesky-preview-desktop.png`, `bluesky-preview-mobile.png`, `bluesky-preview-320.png` | desktop, 390px, 320px |
| Mastodon | `output/playwright/mastodon-preview-desktop.png`, `mastodon-preview-mobile.png`, `mastodon-preview-320.png` | desktop, 390px, 320px |

각 Phase의 입력 계약·정책 확인 근거·browser request/console 검증 기록은 [구현 정본](../../dev-plan/implement_20260822_083934.md)에 남긴다. 최신 코드 단위/DOM/서버 검증은 `npm test`, `npm run api:contract:check`, `git diff --check`로 다시 확인한다.

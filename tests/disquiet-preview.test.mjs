import assert from "node:assert/strict";
import test from "node:test";

import { DISQUIET_PREVIEW_SCHEMA_VERSION, createDisquietPreviewModel } from "../src/disquiet-preview.mjs";

test("Disquiet preview model은 제품 필드와 제품 우선 readiness를 local-only로 분리한다", () => {
  const model = createDisquietPreviewModel({
    publishFields: {
      productName: "AI Systems Atlas",
      tagline: "Markdown 관계를 출처 근거와 함께 탐색하는 웹앱",
      productLink: "https://ai-systems-atlas.vercel.app/",
      postBody: "README와 개발 계획이 쌓이면 파일 검색만으로는 관계를 놓치기 쉽습니다. 첫 화면에서 근거와 시각 연결이 구분되는지 피드백을 받고 싶습니다.",
    },
    locale: "ko-KR",
    approvalStatus: "approved",
    campaignBrief: { publisherRole: "owner", ownershipConfirmed: true },
    operationInputs: { productRegistered: true, productReviewApproved: true },
  });

  assert.equal(model.schemaVersion, DISQUIET_PREVIEW_SCHEMA_VERSION);
  assert.equal(model.status.key, "approved");
  assert.equal(model.content.issues.length, 0);
  assert.equal(model.product.ready, true);
  assert.equal(model.product.items.find((item) => item.key === "product_review_approved")?.label, "제품 검토 승인 확인");
  assert.equal(model.externalWriteCount, 0);
  assert.equal(Object.isFrozen(model), true);
});

test("Disquiet preview model은 등록·검토 승인 전 연결 포스트를 제품 등록처럼 가장하지 않는다", () => {
  const incomplete = createDisquietPreviewModel({
    publishFields: { productName: "", tagline: "태그라인", productLink: "http://not-secure.example", postBody: "본문" },
    campaignBrief: { publisherRole: "curator", ownershipConfirmed: false },
    operationInputs: {},
  });

  assert.ok(incomplete.issues.some((issue) => issue.code === "EMPTY_PRODUCT_NAME"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "PRODUCT_LINK_INVALID"));
  assert.ok(incomplete.issues.some((issue) => issue.code === "PRODUCT_CONNECTION_PENDING"));
  assert.equal(incomplete.product.ready, false);
  assert.ok(incomplete.product.items.some((item) => item.key === "product_ownership_required"));
  assert.ok(incomplete.product.items.some((item) => item.key === "product_review_required"));
});

test("Disquiet preview model은 locale·stale·unsafe input을 안전하게 분리한다", () => {
  const empty = createDisquietPreviewModel({
    publishFields: { productName: "원문", tagline: "원문", productLink: "https://example.com", postBody: "원문" },
    locale: "en-US",
    localeAvailable: false,
  });
  const unsafe = createDisquietPreviewModel({
    publishFields: {
      productName: "Name",
      tagline: "Bearer abcdefghijklmnopqrstuvwxyz0123456789",
      productLink: "/Volumes/private/product",
      postBody: "client_secret=do-not-show",
    },
    localeStale: true,
    approvalStatus: "approved",
  });

  assert.equal(empty.status.key, "empty");
  assert.match(empty.emptyMessage, /원문으로 대체하지 않습니다/);
  assert.equal(unsafe.status.key, "stale");
  assert.equal(unsafe.content.tagline, "");
  assert.equal(unsafe.content.productLink, "");
  assert.equal(unsafe.content.postBody, "");
  assert.doesNotMatch(JSON.stringify(unsafe), /Bearer|client_secret|\/Volumes\/private/);
});

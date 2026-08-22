import assert from "node:assert/strict";
import test from "node:test";
import { createDevPreviewModel } from "../src/dev-preview.mjs";

test("DEV preview는 facts와 사람이 직접 쓴 article을 분리하고 외부 write를 만들지 않는다", () => {
  const model = createDevPreviewModel({ publishFields:{ facts:{ name:"Atlas", description:"Graph", repositoryUrl:"https://example.test" } }, authorInputs:{ realCase:"실제 사례", code:"npm test", failure:"실패 기록", aiDisclosure:"AI는 문법 교정에만 사용" }, brief:{ title:"A real technical lesson", body:"I verified this behavior from source.", disclosure:"AI grammar review only" } });
  assert.match(model.reference.facts,/Atlas/); assert.equal(model.article.title,"A real technical lesson"); assert.equal(model.externalWriteCount,0); assert.equal(Object.isFrozen(model),true);
});

test("DEV preview는 빈 사람 원고와 unsafe 입력을 ready로 보이지 않는다", () => {
  const model = createDevPreviewModel({ publishFields:{facts:{name:"Atlas"}}, brief:{title:"client_secret=no",body:"/Volumes/private"} });
  assert.equal(model.article.title,""); assert.ok(model.issues.length > 0); assert.doesNotMatch(JSON.stringify(model),/client_secret|\/Volumes\/private/);
});

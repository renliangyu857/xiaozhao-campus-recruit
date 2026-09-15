import { strict as assert } from "node:assert";
import { prepareApiRequest } from "./apiClient";

const request = prepareApiRequest({ json: { code: "123456" } });
assert.equal(request.method, "POST");
assert.equal(request.body, JSON.stringify({ code: "123456" }));
console.log("apiClient.test.ts passed");

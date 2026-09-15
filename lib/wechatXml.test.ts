import { strict as assert } from "node:assert";
import { parseWechatXml } from "./wechat";

const xml = `<xml><ToUserName><![CDATA[gh_fcb8c1df0aac]]></ToUserName><FromUserName><![CDATA[openid-demo]]></FromUserName><CreateTime>1789462277</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[登录]]></Content><MsgId>25618940662846809</MsgId></xml>`;
const parsed = parseWechatXml(xml);
assert.equal(parsed?.ToUserName, "gh_fcb8c1df0aac");
assert.equal(parsed?.FromUserName, "openid-demo");
assert.equal(parsed?.MsgType, "text");
assert.equal(parsed?.Content, "登录");
console.log("wechatXml.test.ts passed");

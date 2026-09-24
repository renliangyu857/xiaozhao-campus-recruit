import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";

const alipayModulePath = "./alipay.ts";

/** 测试用：生成临时 RSA key pair，不接触任何真实凭据 */
function generateTestKeyPair(): { privatePem: string; publicPem: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privatePem: privateKey, publicPem: publicKey };
}

/** 测试用：把 PEM 字符串缓存到 ALIPAY_APP_PRIVATE_KEY 环境变量（必须 ensureBase64 安全） */
function setAlipayEnv(privateKey: string, publicKey: string) {
  // 用 \n 字符串而不是真换行符，避免污染 .env 文件
  process.env.ALIPAY_APP_ID = "2021000000000000";
  process.env.ALIPAY_APP_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
  process.env.ALIPAY_PUBLIC_KEY = publicKey.replace(/\n/g, "\\n");
  process.env.ALIPAY_GATEWAY = "https://openapi.alipaydev.com/gateway.do";
  process.env.NEXT_PUBLIC_APP_URL = "https://www.example.com";
}

function clearAlipayEnv() {
  delete process.env.ALIPAY_APP_ID;
  delete process.env.ALIPAY_APP_PRIVATE_KEY;
  delete process.env.ALIPAY_PUBLIC_KEY;
  delete process.env.ALIPAY_GATEWAY;
}

test.afterEach(() => clearAlipayEnv());

test("配置缺失时抛出明确错误", async () => {
  clearAlipayEnv();
  const { getAlipayConfig, createAlipayOrder } = await import(alipayModulePath);
  assert.throws(() => getAlipayConfig(), /ALIPAY_APP_ID/);
  process.env.ALIPAY_APP_ID = "2021000000000000";
  assert.throws(() => createAlipayOrder({
    outTradeNo: "X",
    totalAmount: "0.01",
    subject: "X",
  }), /ALIPAY_APP_PRIVATE_KEY/);
  clearAlipayEnv();
});

test("buildAlipayCreatePayload 构造 form HTML 包含所有必填字段", async () => {
  const { privatePem, publicPem } = generateTestKeyPair();
  setAlipayEnv(privatePem, publicPem);

  const { buildAlipayCreatePayload, getAlipayConfig } = await import(alipayModulePath);
  const cfg = getAlipayConfig();

  const payload = buildAlipayCreatePayload(
    {
      outTradeNo: "ORDER_TEST_001",
      totalAmount: "19.90",
      subject: "校招喵永久会员",
      body: "终身VIP",
    },
    cfg
  );

  // HTML 含所有公共字段
  assert.match(payload.formHtml, /name="app_id"/);
  assert.match(payload.formHtml, /value="2021000000000000"/);
  assert.match(payload.formHtml, /name="method"/);
  assert.match(payload.formHtml, /value="alipay.trade.page.pay"/);
  assert.match(payload.formHtml, /name="sign_type"/);
  assert.match(payload.formHtml, /value="RSA2"/);
  assert.match(payload.formHtml, /name="version"/);
  assert.match(payload.formHtml, /name="timestamp"/);
  assert.match(payload.formHtml, /name="notify_url"/);
  assert.match(payload.formHtml, /name="return_url"/);
  assert.match(payload.formHtml, /name="biz_content"/);
  // biz_content 是 JSON，含业务参数
  const bizMatch = payload.formHtml.match(/value="(\{.*?\})"\s*\/>/);
  assert.ok(bizMatch, "biz_content 应为 JSON 字符串");
  const biz = JSON.parse(bizMatch![1].replace(/&quot;/g, '"'));
  assert.equal(biz.out_trade_no, "ORDER_TEST_001");
  assert.equal(biz.total_amount, "19.90");
  assert.equal(biz.subject, "校招喵永久会员");
  assert.equal(biz.product_code, "FAST_INSTANT_TRADE_PAY");
  // 含签名
  assert.match(payload.formHtml, /name="sign"/);
  // 含自动提交 JS
  assert.match(payload.formHtml, /document\.forms\.alipay_submit\.submit\(\)/);
});

test("签名是合法的 SHA256WithRSA base64（64 字节 → 88 字符 base64）", async () => {
  const { privatePem, publicPem } = generateTestKeyPair();
  setAlipayEnv(privatePem, publicPem);

  const { buildAlipayCreatePayload, getAlipayConfig } = await import(alipayModulePath);
  const cfg = getAlipayConfig();
  const payload = buildAlipayCreatePayload(
    { outTradeNo: "X", totalAmount: "0.01", subject: "X" },
    cfg
  );
  const signMatch = payload.formHtml.match(/name="sign"\s+value="([^"]+)"/);
  assert.ok(signMatch, "form 应含 sign 字段");
  const sign = signMatch![1];
  // 2048 位 RSA = 256 字节签名 → base64 编码后约 344 字符
  assert.ok(sign.length >= 300, `签名长度应 ≥ 300 字符（实际 ${sign.length}）`);
  assert.match(sign, /^[A-Za-z0-9+/=]+$/, "签名应是 base64 字符");
});

test("异步通知验签：用应用私钥签的内容，用支付宝公钥（这里用对应公钥）验签应通过", async () => {
  const { privatePem, publicPem } = generateTestKeyPair();
  setAlipayEnv(privatePem, publicPem);

  const { buildAlipayCreatePayload, getAlipayConfig, verifyAlipayNotifySign } = await import(alipayModulePath);
  const cfg = getAlipayConfig();

  // 模拟支付宝异步通知参数
  const payload = buildAlipayCreatePayload(
    { outTradeNo: "NOTIFY_TEST", totalAmount: "1.00", subject: "测试" },
    cfg
  );
  // 抠出 sign 和其它字段
  const params: Record<string, string> = {};
  const fieldRe = /name="([^"]+)"\s+value="([^"]*)"/g;
  let m;
  while ((m = fieldRe.exec(payload.formHtml)) !== null) {
    params[m[1]] = m[2].replace(/&quot;/g, '"');
  }
  assert.ok(params.sign, "form 应含 sign 字段");

  // 用支付宝公钥验签（这里用对应公钥）
  const valid = verifyAlipayNotifySign(params, publicPem);
  assert.equal(valid, true, "正确签名应验签通过");

  // 篡改 sign → 验签失败
  const tampered = { ...params, sign: params.sign!.slice(0, -5) + "AAAAA" };
  assert.equal(verifyAlipayNotifySign(tampered, publicPem), false);
});

test("createAlipayOrder 返回值含 formHtml + outTradeNo", async () => {
  const { privatePem, publicPem } = generateTestKeyPair();
  setAlipayEnv(privatePem, publicPem);

  const { createAlipayOrder } = await import(alipayModulePath);
  const out = createAlipayOrder({
    outTradeNo: "ORDER_X",
    totalAmount: "19.90",
    subject: "校招喵VIP",
  });
  assert.equal(out.outTradeNo, "ORDER_X");
  assert.equal(out.method, "alipay.trade.page.pay");
  assert.match(out.htmlFormSnippet, /document\.forms\.alipay_submit\.submit\(\)/);
});

test("v3 待签字符串：key=value 不编码（与官方 alipay-sdk-nodejs-all 源码一致）", async () => {
  const { privatePem, publicPem } = generateTestKeyPair();
  setAlipayEnv(privatePem, publicPem);

  const { buildAlipayCreatePayload, getAlipayConfig } = await import(alipayModulePath);
  const cfg = getAlipayConfig();

  const payload = buildAlipayCreatePayload(
    {
      outTradeNo: "ORDER_TEST_ENCODE",
      totalAmount: "19.90",
      subject: "永久会员",
    },
    cfg
  );

  // 抠 sign + 提取字段
  const signMatch = payload.formHtml.match(/name="sign"\s+value="([^"]+)"/);
  assert.ok(signMatch);
  const signFromHtml = signMatch![1];
  const fieldRegex = /name="([^"]+)"\s+value="((?:[^"\\]|\\.)*)"/g;
  const params: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = fieldRegex.exec(payload.formHtml)) !== null) {
    if (m[1] === "sign") continue;
    params[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }

  // 手动重算（按官方 alipay-sdk-nodejs-all：直接拼接，不编码）
  const signStr = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signStr, "utf8");
  const okVerify = verifier.verify(publicPem, signFromHtml, "base64");
  assert.equal(okVerify, true, "手动重算签名应匹配 form 里的 sign 字段");

  // 关键断言：notify_url 保持字面值（按官方 SDK 源码）
  assert.match(signStr, /notify_url=https:\/\//, "notify_url 应保持字面值，不做 URL 编码");
  // biz_content 含 JSON 原貌（不编码）
  assert.match(signStr, /biz_content=\{/, "biz_content 应为 JSON 字面值（不编码）");
});

test("v3 待签字符串包含特殊字符 (*、~、空格) 的编码", async () => {
  const { privatePem, publicPem } = generateTestKeyPair();
  setAlipayEnv(privatePem, publicPem);

  const { buildAlipayCreatePayload, getAlipayConfig } = await import(alipayModulePath);
  const cfg = getAlipayConfig();

  const payload = buildAlipayCreatePayload(
    {
      outTradeNo: "ORDER_SPECIAL",
      totalAmount: "19.90",
      subject: "校招喵 永久VIP*~test",
    },
    cfg
  );

  const signMatch = payload.formHtml.match(/name="sign"\s+value="([^"]+)"/);
  assert.ok(signMatch);
  const signFromHtml = signMatch![1];
  const fieldRegex = /name="([^"]+)"\s+value="((?:[^"\\]|\\.)*)"/g;
  const params: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = fieldRegex.exec(payload.formHtml)) !== null) {
    if (m[1] === "sign") continue;
    params[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }

  // 手动重算（按官方 alipay-sdk-nodejs-all：直接拼接，不编码）
  const signStr = Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signStr, "utf8");
  const okVerify = verifier.verify(publicPem, signFromHtml, "base64");
  assert.equal(okVerify, true, "特殊字符应能验签通过（不编码）");
});
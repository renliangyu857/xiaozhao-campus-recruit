#!/usr/bin/env node
/**
 * 实际调一次支付宝 v3 下单接口，看响应。
 * 用你 Vercel env 里真实的 ALIPAY_* 凭据（从 .env.alipay-test 读）。
 *
 * 不接触用户浏览器、不支付（0.01 元也没事，30 分钟会自动关闭）。
 * 如果返回 invalid-signature → 打印本次签名串 + 你报错时网关返回的签名串对照。
 *
 * 用法：
 *   cd /Users/apple/WorkBuddy/校招喵项目重构
 *   npx vercel env pull .env.alipay-test --environment production
 *   DOTENV_CONFIG_PATH=.env.alipay-test node scripts/diagnose-create-order.js
 */
require("dotenv").config({ path: process.env.DOTENV_CONFIG_PATH || ".env.production" });
const crypto = require("node:crypto");

function toPem(raw, header) {
  let s = (raw || "").replace(/\\n/g, "\n").trim();
  if (s.includes("-----BEGIN")) return s;
  const wrapped = s.match(/.{1,64}/g)?.join("\n") ?? s;
  return `-----BEGIN ${header}-----\n${wrapped}\n-----END ${header}-----`;
}

const APP_ID = (process.env.ALIPAY_APP_ID || "").trim();
const PRIVATE_KEY_RAW = process.env.ALIPAY_APP_PRIVATE_KEY || "";
const PUBLIC_KEY_RAW = process.env.ALIPAY_PUBLIC_KEY || "";
const GATEWAY = (process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do").trim();

if (!APP_ID || !PRIVATE_KEY_RAW) {
  console.error("✗ ALIPAY_APP_ID / ALIPAY_APP_PRIVATE_KEY 缺失");
  process.exit(1);
}
const PRIVATE_KEY = toPem(PRIVATE_KEY_RAW, "RSA PRIVATE KEY");
const PUBLIC_KEY = PUBLIC_KEY_RAW ? toPem(PUBLIC_KEY_RAW, "PUBLIC KEY") : "";

console.log("=== 配置 ===");
console.log("APP_ID:    ", APP_ID);
console.log("GATEWAY:   ", GATEWAY);
console.log("PRIVATE_KEY:", PRIVATE_KEY.length, "字符 (含 BEGIN/END + 换行)");
console.log("PUBLIC_KEY:", PUBLIC_KEY.length, "字符");
console.log();

// ====== 与 lib/alipay.ts 完全相同的 v3 签名算法 ======
function buildSignString(params) {
  return Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => {
      const v = String(params[k]);
      if (k === "notify_url" || k === "return_url") return `${k}=${v}`;
      let e = encodeURIComponent(v);
      e = e.replace(/\*/g, "%2A");
      e = e.replace(/%7E/g, "~");
      return `${k}=${e}`;
    })
    .join("&");
}

// ====== 纯调用支付宝，不写数据库 ======

(async () => {
  const testOrderNo = `DIAG_${Date.now()}`;

  const params = {
    app_id: APP_ID,
    method: "alipay.trade.page.pay",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
    version: "1.0",
    notify_url: "https://www.xiaozhaomiao.cn/api/payment/notify",
    return_url: "https://www.xiaozhaomiao.cn/vip?paid=1",
    biz_content: JSON.stringify({
      out_trade_no: testOrderNo,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: "0.01",
      subject: "诊断测试-不付款",
      timeout_express: "30m",
    }),
  };

  const signStr = buildSignString(params);
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signStr, "utf8");
  const signBase64 = sign.sign(PRIVATE_KEY, "base64");

  console.log("=== 待签字符串 ===");
  console.log(signStr);
  console.log();
  console.log("=== sign ===");
  console.log(signBase64);
  console.log();

  // 把 sign 加进 params 一起 POST
  const postParams = { ...params, sign };

  // form-urlencoded 提交
  const body = new URLSearchParams(postParams).toString();

  console.log("=== POST", GATEWAY, "?charset=utf-8 ===");
  const start = Date.now();
  const resp = await fetch(`${GATEWAY}?charset=utf-8`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await resp.text();
  const dur = Date.now() - start;

  console.log(`=== HTTP ${resp.status} (${dur}ms) ===`);
  console.log(text);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.log("(响应不是 JSON)");
    process.exit(0);
  }

  if (data.alipay_trade_page_pay_response) {
    const r = data.alipay_trade_page_pay_response;
    console.log();
    console.log("=== 支付宝响应解析 ===");
    console.log("code:", r.code);
    console.log("msg: ", r.msg);
    console.log("sub_code:", r.sub_code);
    console.log("sub_msg: ", r.sub_msg);
    console.log("out_trade_no:", r.out_trade_no);
    console.log("trade_no:", r.trade_no);
    if (r.code === "40004") {
      console.log();
      console.log("=== 40004 = invalid-signature（验签失败）===");
      console.log("可能原因：");
      console.log("  1. Vercel env 里 ALIPAY_APP_PRIVATE_KEY 被截断");
      console.log("  2. Vercel env 里 ALIPAY_APP_PRIVATE_KEY 与支付宝后台的应用公钥不配对");
      console.log("  3. 我代码 v3 签名算法还有未发现的差异");
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
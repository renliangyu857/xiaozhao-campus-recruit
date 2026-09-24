#!/usr/bin/env node
/**
 * 支付宝 v3 加签诊断脚本（密钥模式）
 *
 * 用法：在你自己终端跑（凭据不进 AI 对话）
 *   node scripts/diagnose-alipay.js
 *
 * 它会读 .env.production 里的 ALIPAY_APP_ID / ALIPAY_APP_PRIVATE_KEY，
 * 用你提供的真实私钥 + 真实订单号生成签名串 + sign 并打印。
 * 你可以拿这个签名串 + sign，去支付宝 OpenAPI 沙箱 / 文档对比。
 *
 * 同时校验：
 *  1. 私钥格式（PEM 头尾是否齐全）
 *  2. 私钥是否能成功签名（公钥能不能验签通过）
 *  3. 待签字符串排序 + 编码后，是否与支付宝文档示例一致
 */

require("dotenv").config({ path: process.env.DOTENV_CONFIG_PATH || process.env.ALIPAY_ENV_FILE || ".env.production" });
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

if (!APP_ID) { console.error("✗ ALIPAY_APP_ID 缺失"); process.exit(1); }
if (!PRIVATE_KEY_RAW) { console.error("✗ ALIPAY_APP_PRIVATE_KEY 缺失"); process.exit(1); }

const PRIVATE_KEY = toPem(PRIVATE_KEY_RAW, "RSA PRIVATE KEY");
const PUBLIC_KEY = toPem(PUBLIC_KEY_RAW, "PUBLIC KEY");

console.log("=== 1. 私钥格式 ===");
console.log("开头 5 行:");
PRIVATE_KEY.split("\n").slice(0, 5).forEach((l, i) => console.log(`  [${i}] ${l}`));
console.log("结尾 3 行:");
PRIVATE_KEY.split("\n").slice(-3).forEach((l, i) => console.log(`  [end-${3 - i - 1}] ${l}`));
const lineCount = PRIVATE_KEY.split("\n").length;
console.log(`总行数: ${lineCount}（标准 PKCS1 2048位 RSA 私钥应有 28 行：1 头 + 25 数据 + 2 尾）`);
console.log(`长度: ${PRIVATE_KEY.length} 字符`);

console.log();
console.log("=== 2. 公钥格式 ===");
if (PUBLIC_KEY) {
  console.log("开头 3 行:");
  PUBLIC_KEY.split("\n").slice(0, 3).forEach((l, i) => console.log(`  [${i}] ${l}`));
} else {
  console.log("⚠ ALIPAY_PUBLIC_KEY 缺失（验签需要）");
}

console.log();
console.log("=== 3. 私钥是否能签名 + 公钥能否验签（round-trip）===");
try {
  const params = {
    app_id: APP_ID,
    method: "alipay.trade.page.pay",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: "2026-09-24 07:00:00",
    version: "1.0",
    notify_url: "https://www.xiaozhaomiao.cn/api/payment/notify",
    return_url: "https://www.xiaozhaomiao.cn/vip?paid=1",
    biz_content: JSON.stringify({
      out_trade_no: "DIAG_TEST_001",
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: "0.01",
      subject: "诊断测试",
      timeout_express: "30m",
    }),
  };
  const signStr = Object.keys(params)
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

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signStr, "utf8");
  const signBase64 = sign.sign(PRIVATE_KEY, "base64");

  console.log("签名长度:", signBase64.length, "字符");
  console.log();
  console.log("=== 待签字符串（前 200 字）===");
  console.log(signStr.slice(0, 200) + "...");
  console.log();
  console.log("=== 签名（前 200 字）===");
  console.log(signBase64.slice(0, 200) + "...");

  if (PUBLIC_KEY) {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signStr, "utf8");
    const ok = verifier.verify(PUBLIC_KEY, signBase64, "base64");
    console.log();
    console.log("=== 4. round-trip 验签 ===");
    console.log(ok ? "✓ 本地私钥签名 + 公钥验签一致" : "✗ 签名不一致——私钥被截断或公私钥不匹配");
  } else {
    console.log();
    console.log("（未配置 ALIPAY_PUBLIC_KEY，跳过 round-trip 验签）");
  }
} catch (e) {
  console.log("✗ 签名失败:", e.message);
  console.log();
  console.log("可能原因：");
  console.log("  1. 私钥被 Vercel env 复制时漏字符 / 多空格");
  console.log("  2. 私钥没有正确换行（应含 BEGIN/END + 中间 25 行 base64 数据）");
  console.log("  3. 私钥是 PKCS8 格式但你以为是 PKCS1（PEM header 不同）");
  console.log();
  console.log("✗ 错误栈:", e.stack?.split("\n").slice(0, 5).join("\n"));
}
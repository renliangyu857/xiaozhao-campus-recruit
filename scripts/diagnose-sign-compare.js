#!/usr/bin/env node
/**
 * 诊断 v3 签名：把你看到的报错订单号+时间戳重新生成待签字符串+sign，
 * 你拿这个去支付宝签名工具（https://opendocs.alipay.com/open/291/03k3q0/intro.md?pathHash=4cf8b18c#%E8%87%AA%E5%8A%A9%E5%91%98%E5%B7%A5%E5%85%B7）
 * 对比两个算法生成的 sign 是否一致。
 *
 * 用法：
 *   cd /Users/apple/WorkBuddy/校招喵项目重构
 *   npx vercel env pull .env.alipay-test --environment production
 *   DOTENV_CONFIG_PATH=.env.alipay-test node scripts/diagnose-sign-compare.js <out_trade_no> <timestamp>
 *
 * 示例：
 *   node scripts/diagnose-sign-compare.js ORDER_20260924_090928_54T5NC "2026-09-24 09:09:28"
 *
 * 脚本会输出：
 *   1. 待签字符串（你拿去粘贴到签名工具"input"）
 *   2. 我的 sign（你拿去粘贴到签名工具"output"）
 *   3. 你的应用公钥前缀 30 字符（用来确认公钥就是上传的那个）
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

const [, , outTradeNo = "DIAG_TEST", timestamp = "2026-09-24 09:09:28"] = process.argv;

if (!APP_ID || !PRIVATE_KEY_RAW) {
  console.error("✗ ALIPAY_APP_ID / ALIPAY_APP_PRIVATE_KEY 缺失");
  process.exit(1);
}
const PRIVATE_KEY = toPem(PRIVATE_KEY_RAW, "RSA PRIVATE KEY");
const PUBLIC_KEY = PUBLIC_KEY_RAW ? toPem(PUBLIC_KEY_RAW, "PUBLIC KEY") : "";

const params = {
  app_id: APP_ID,
  method: "alipay.trade.page.pay",
  charset: "utf-8",
  sign_type: "RSA2",
  timestamp,
  version: "1.0",
  notify_url: "https://www.xiaozhaomiao.cn/api/payment/notify",
  return_url: "https://www.xiaozhaomiao.cn/vip?paid=1",
  biz_content: JSON.stringify({
    out_trade_no: outTradeNo,
    product_code: "FAST_INSTANT_TRADE_PAY",
    total_amount: "19.90",
    subject: "永久会员",
    timeout_express: "30m",
  }),
};

// ====== 与 lib/alipay.ts 完全相同的 v3 签名算法 ======
function buildSignString(params) {
  return Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => {
      const v = String(params[k]);
      if (k === "notify_url" || k === "return_url") return `${k}=${v}`;
      let e2 = encodeURIComponent(v);
      e2 = e2.replace(/\*/g, "%2A");
      e2 = e2.replace(/%7E/g, "~");
      return `${k}=${e2}`;
    })
    .join("&");
}

const signStr = buildSignString(params);
const sign = crypto.createSign("RSA-SHA256");
sign.update(signStr, "utf8");
const signBase64 = sign.sign(PRIVATE_KEY, "base64");

console.log("=========================================");
console.log("  支付宝 v3 签名诊断输出（对比用）");
console.log("=========================================");
console.log();
console.log("【1. 业务参数 out_trade_no】");
console.log("  ", outTradeNo);
console.log();
console.log("【2. 时间戳 timestamp】");
console.log("  ", timestamp);
console.log();
console.log("【3. 待签名字符串（拷贝到签名工具 input）】");
console.log();
console.log(signStr);
console.log();
console.log("【4. 我的 sign（拷贝到签名工具 output）】");
console.log();
console.log(signBase64);
console.log();
console.log("【5. 用到的应用公钥前缀（确认是上传到支付宝后台的那个）】");
const pubKeyPem = PUBLIC_KEY.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s+/g, "");
console.log("  ", pubKeyPem.slice(0, 60) + "...");
console.log();
console.log("【6. 算法信息（与签名工具对照）】");
console.log("  算法：SHA256withRSA");
console.log("  编码：UTF-8");
console.log("  签名 base64");
console.log();
console.log("=========================================");
console.log("  签名工具验证步骤");
console.log("=========================================");
console.log();
console.log("1. 打开 https://opendocs.alipay.com/open/291/03k3q0/intro.md");
console.log("2. 找到「自助员工具 / 自助测试」入口（在线版或下载 alipay-cli-tools）");
console.log("3. 粘贴 app_id = " + APP_ID);
console.log("4. 粘贴 上面的待签名字符串到 input");
console.log("5. 选择 SHA256withRSA，粘贴应用私钥 PEM");
console.log("6. 点 生成签名");
console.log("7. 把工具生成的 sign 与上面的 我的 sign 对比");
console.log();
console.log("如果两个 sign 完全一致：v3 签名算法对了，问题是 Vercel env 里 ALIPAY_APP_PRIVATE_KEY 与此不同。");
console.log("如果两个 sign 不一致：v3 算法还有差异，需要查 opendocs 最新签名规范。");
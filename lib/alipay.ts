/**
 * 支付宝 v3 通用接入 · PC 网站支付（电脑网站支付）
 * 文档：https://opendocs.alipay.com/open/270/105899
 *
 * 签名规则（v3 RSA2 / SHA256WithRSA）：
 *   1. 取所有「非空」参数（含公共参数 + 业务参数），排除 sign
 *   2. 按键名 ASCII 升序排序
 *   3. 拼接为 k=v&k=v...（值先做 urlencode，不能用 + 代替空格）
 *   4. 用应用私钥 SHA256WithRSA 签名 → base64 → sign
 *   5. sign_type=RSA2
 *
 * 接口：
 *   - 下单   alipay.trade.page.pay    → 返回 HTML form（前端自动 POST 跳转）
 *   - 查询   alipay.trade.query
 *   - 关闭   alipay.trade.close
 *
 * 环境变量（绝不进对话 / log / commit）：
 *   ALIPAY_APP_ID              16 位 APPID
 *   ALIPAY_APP_PRIVATE_KEY     应用私钥 PEM（原始 RSA 私钥）；推荐用 PKCS8
 *   ALIPAY_PUBLIC_KEY          支付宝公钥 PEM（验签回调用）
 *   ALIPAY_GATEWAY             网关：https://openapi.alipay.com/gateway.do（生产）
 *                              或 https://openapi.alipaydev.com/gateway.do（沙箱）
 *   ALIPAY_NOTIFY_URL          异步回调地址（也可由调用方传 out_notify_url 覆盖）
 *   ALIPAY_RETURN_URL          同步回调地址
 *
 * 调用方（lib/payment-config + app/api/payment/*）按 provider=ezfp/alipay 路由。
 */

import crypto from "crypto";

export interface AlipayConfig {
  appId: string;
  appPrivateKey: string;
  alipayPublicKey: string;
  gateway: string;
  notifyUrl: string;
  returnUrl: string;
  signType: "RSA2";
  charset: "utf-8";
  version: "1.0";
}

function toPem(raw: string, header: string): string {
  const s = (raw || "").replace(/\\n/g, "\n").trim();
  if (!s) return "";
  if (s.includes("-----BEGIN")) return s;
  const wrapped = s.match(/.{1,64}/g)?.join("\n") ?? s;
  return `-----BEGIN ${header}-----\n${wrapped}\n-----END ${header}-----`;
}

export function getAlipayConfig(): AlipayConfig {
  const appId = (process.env.ALIPAY_APP_ID || "").trim();
  const appPrivateKeyRaw = process.env.ALIPAY_APP_PRIVATE_KEY || "";
  const alipayPublicKeyRaw = process.env.ALIPAY_PUBLIC_KEY || "";
  const gateway = (process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do").trim();
  const notifyUrl =
    process.env.ALIPAY_NOTIFY_URL ||
    `${(process.env.NEXT_PUBLIC_APP_URL || "https://www.xiaozhaomiao.cn").replace(/\/+$/, "")}/api/payment/notify`;
  const returnUrl =
    process.env.ALIPAY_RETURN_URL ||
    `${(process.env.NEXT_PUBLIC_APP_URL || "https://www.xiaozhaomiao.cn").replace(/\/+$/, "")}/vip?paid=1`;

  if (!appId) {
    throw new Error("支付宝配置缺失：请在环境变量中配置 ALIPAY_APP_ID");
  }
  if (!appPrivateKeyRaw) {
    throw new Error("支付宝配置缺失：请在环境变量中配置 ALIPAY_APP_PRIVATE_KEY");
  }

  return {
    appId,
    appPrivateKey: toPem(appPrivateKeyRaw, "RSA PRIVATE KEY"),
    alipayPublicKey: toPem(alipayPublicKeyRaw, "PUBLIC KEY"),
    gateway,
    notifyUrl,
    returnUrl,
    signType: "RSA2",
    charset: "utf-8",
    version: "1.0",
  };
}

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.xiaozhaomiao.cn").replace(/\/+$/, "");
}

export interface AlipayCreateParams {
  outTradeNo: string;
  totalAmount: string; // 元，2 位小数，如 "19.90"
  subject: string;
  body?: string;
  timeoutExpress?: string; // 默认 "30m"
  productCode?: string; // 默认 "FAST_INSTANT_TRADE_PAY"
  returnUrl?: string;
  notifyUrl?: string;
  clientIp?: string; // 不参与签名；一些接口会用到
}

export interface AlipayCreateResult {
  /** 支付宝返回的 HTML form（前端直接渲染跳转） */
  htmlFormSnippet: string;
  /** 同步从表单提取的 trace_no（用于查询/关闭订单） */
  outTradeNo: string;
  method: string;
}

/** 计算待签名字符串（v3 规范 · 严格按官方 alipay-sdk-nodejs-all 源码） */
function buildSignString(params: Record<string, string>): string {
  // 官方 SDK (alipay/alipay-sdk-nodejs-all) src/util.ts:117-126 行：
  //   const signString = Object.keys(params).sort()
  //     .map(key => {
  //       let data = params[key];
  //       if (typeof data !== 'string') data = JSON.stringify(data);
  //       return `${key}=${data}`;  // ← 关键：直接拼接，不做 URL 编码
  //     })
  //     .join('&');
  //
  // 也就是说 v3 算法：
  //   1. 按 key ASCII 升序排序
  //   2. 每个 key=value 不做 URL 编码（JSON 等特殊字符原样保留）
  //   3. 排除 sign 字段自身
  return Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => {
      let data: unknown = params[k];
      if (typeof data !== "string") data = JSON.stringify(data);
      return `${k}=${data}`;
    })
    .join("&");
}

function signParams(params: Record<string, string>, privateKeyPem: string): string {
  const signStr = buildSignString(params);
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signStr, "utf8");
  return sign.sign(privateKeyPem, "base64");
}

export interface AlipayCreatePayload {
  /** POST 表单 HTML（含自动提交 JS） */
  formHtml: string;
  outTradeNo: string;
  method: string;
}

/**
 * 构造 alipay.trade.page.pay 请求参数（含签名 + form HTML）
 * 返回 HTML form 字符串，前端直接渲染跳转（用户浏览器自动 POST 到支付宝）
 */
export function buildAlipayCreatePayload(
  params: AlipayCreateParams,
  cfg: AlipayConfig
): AlipayCreatePayload {
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/, "");

  const bizContent = {
    out_trade_no: params.outTradeNo,
    product_code: params.productCode || "FAST_INSTANT_TRADE_PAY",
    total_amount: params.totalAmount,
    subject: params.subject,
    body: params.body,
    timeout_express: params.timeoutExpress || "30m",
  };

  // 业务参数 JSON 后 value 不参与签名；签名串只含公共参数
  const publicParams: Record<string, string> = {
    app_id: cfg.appId,
    method: "alipay.trade.page.pay",
    charset: cfg.charset,
    sign_type: cfg.signType,
    timestamp,
    version: cfg.version,
    notify_url: params.notifyUrl || cfg.notifyUrl,
    return_url: params.returnUrl || cfg.returnUrl,
    biz_content: JSON.stringify(bizContent),
  };

  publicParams.sign = signParams(publicParams, cfg.appPrivateKey);

  const formHtml =
    `<form id="alipay_submit" name="alipay_submit" action="${cfg.gateway}?charset=${cfg.charset}" method="POST">` +
    Object.keys(publicParams)
      .map((k) => `<input type="hidden" name="${k}" value="${String(publicParams[k]).replace(/"/g, "&quot;")}" />`)
      .join("") +
    `<input type="submit" value="正在跳转到支付宝..." /></form>` +
    `<script>document.forms.alipay_submit.submit();</script>`;

  return {
    formHtml,
    outTradeNo: params.outTradeNo,
    method: "alipay.trade.page.pay",
  };
}

/** 对外暴露：构造 HTML 表单 */
export function createAlipayOrder(params: AlipayCreateParams): AlipayCreateResult {
  const cfg = getAlipayConfig();
  const { formHtml, outTradeNo, method } = buildAlipayCreatePayload(params, cfg);
  return { htmlFormSnippet: formHtml, outTradeNo, method };
}

export interface AlipayQueryResult {
  tradeStatus: string; // TRADE_SUCCESS / TRADE_CLOSED / WAIT_BUYER_PAY / TRADE_FINISHED
  outTradeNo: string;
  tradeNo?: string; // 支付宝流水号
  totalAmount?: string;
  gmtPayment?: string;
}

export function queryAlipayOrder(outTradeNo: string): Promise<AlipayQueryResult> {
  const cfg = getAlipayConfig();
  const publicParams: Record<string, string> = {
    app_id: cfg.appId,
    method: "alipay.trade.query",
    charset: cfg.charset,
    sign_type: cfg.signType,
    timestamp: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
    version: cfg.version,
    biz_content: JSON.stringify({ out_trade_no: outTradeNo }),
  };
  publicParams.sign = signParams(publicParams, cfg.appPrivateKey);
  const body = new URLSearchParams(publicParams).toString();

  return fetch(`${cfg.gateway}?charset=${cfg.charset}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
    .then((r) => r.json())
    .then((data: Record<string, unknown>) => {
      const resp = (data.alipay_trade_query_response || {}) as Record<string, unknown>;
      if (!isAlipaySuccess(resp)) {
        throw new Error(`alipay 查询失败: ${String(resp.msg || resp.sub_msg || "")}`);
      }
      return {
        tradeStatus: String(resp.trade_status || ""),
        outTradeNo: String(resp.out_trade_no || outTradeNo),
        tradeNo: resp.trade_no ? String(resp.trade_no) : undefined,
        totalAmount: resp.total_amount ? String(resp.total_amount) : undefined,
        gmtPayment: resp.gmt_payment ? String(resp.gmt_payment) : undefined,
      };
    });
}

export function closeAlipayOrder(outTradeNo: string): Promise<{ closed: boolean }> {
  const cfg = getAlipayConfig();
  const publicParams: Record<string, string> = {
    app_id: cfg.appId,
    method: "alipay.trade.close",
    charset: cfg.charset,
    sign_type: cfg.signType,
    timestamp: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
    version: cfg.version,
    biz_content: JSON.stringify({ out_trade_no: outTradeNo }),
  };
  publicParams.sign = signParams(publicParams, cfg.appPrivateKey);
  const body = new URLSearchParams(publicParams).toString();
  return fetch(`${cfg.gateway}?charset=${cfg.charset}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
    .then((r) => r.json())
    .then((data: Record<string, unknown>) => {
      const resp = (data.alipay_trade_close_response || {}) as Record<string, unknown>;
      return { closed: isAlipaySuccess(resp) };
    });
}

/** 支付宝响应成功判定：code === '10000' && sub_code 不存在 */
function isAlipaySuccess(resp: Record<string, unknown>): boolean {
  return resp.code === "10000" && !resp.sub_code;
}

/** 验签异步通知（支付宝公钥） */
export function verifyAlipayNotifySign(
  params: Record<string, string>,
  publicKeyPem: string
): boolean {
  const sign = params.sign;
  if (!sign) return false;
  const signStr = buildSignString(params);
  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(signStr, "utf8");
  try {
    return verify.verify(publicKeyPem, sign, "base64");
  } catch {
    return false;
  }
}
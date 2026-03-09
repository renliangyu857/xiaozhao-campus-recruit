/**
 * 微信支付工具 - Native支付
 * 参考文档: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
 */

import crypto from "crypto";

// 微信支付配置
const WECHAT_PAY_CONFIG = {
  mchid: process.env.WECHAT_PAY_MCHID || "",
  appid: process.env.WECHAT_PAY_APPID || "",
  apiV3Key: process.env.WECHAT_PAY_APIV3_KEY || "",
  certSerialNo: process.env.WECHAT_PAY_CERT_SERIAL_NO || "",
  privateKey: process.env.WECHAT_PAY_PRIVATE_KEY || "",
  publicKey: process.env.WECHAT_PAY_PUBLIC_KEY || "",
};

// 微信支付API基础URL
const WECHAT_PAY_BASE_URL = "https://api.mch.weixin.qq.com";

/**
 * 检查微信支付配置是否完整
 */
export function validateWechatPayConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!WECHAT_PAY_CONFIG.mchid) missing.push("WECHAT_PAY_MCHID");
  if (!WECHAT_PAY_CONFIG.appid) missing.push("WECHAT_PAY_APPID");
  if (!WECHAT_PAY_CONFIG.apiV3Key) missing.push("WECHAT_PAY_APIV3_KEY");
  if (!WECHAT_PAY_CONFIG.certSerialNo) missing.push("WECHAT_PAY_CERT_SERIAL_NO");
  if (!WECHAT_PAY_CONFIG.privateKey) missing.push("WECHAT_PAY_PRIVATE_KEY");
  if (!WECHAT_PAY_CONFIG.publicKey) missing.push("WECHAT_PAY_PUBLIC_KEY");

  return { valid: missing.length === 0, missing };
}

/**
 * 生成随机字符串
 */
function generateNonceStr(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成时间戳
 */
function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * 生成签名（RSA-SHA256）
 * 参考: https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay4_0.shtml
 */
function generateSignature(method: string, url: string, timestamp: string, nonceStr: string, body: string): string {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;

  const privateKey = WECHAT_PAY_CONFIG.privateKey
    .replace(/\\n/g, "\n")
    .replace(/\n\n/g, "\n");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  return sign.sign(privateKey, "base64");
}

/**
 * 验证微信回调签名
 */
export function verifyWechatSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _serial: string
): boolean {
  try {
    const message = `${timestamp}\n${nonce}\n${body}\n`;

    const publicKey = WECHAT_PAY_CONFIG.publicKey
      .replace(/\\n/g, "\n")
      .replace(/\n\n/g, "\n");

    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(message);
    return verify.verify(publicKey, signature, "base64");
  } catch (error) {
    console.error("[WechatPay] Verify signature error:", error);
    return false;
  }
}

/**
 * 构建请求头
 */
function buildHeaders(method: string, urlPath: string, body: string = ""): Record<string, string> {
  const timestamp = generateTimestamp();
  const nonceStr = generateNonceStr();
  const signature = generateSignature(method, urlPath, timestamp, nonceStr, body);

  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_CONFIG.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${WECHAT_PAY_CONFIG.certSerialNo}"`;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: authorization,
  };
}

/**
 * Native支付统一下单
 * 参考: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml
 */
export interface NativeOrderParams {
  description: string;
  outTradeNo: string;
  amount: number; // 单位：分
  notifyUrl: string;
  clientIp?: string;
}

export interface NativeOrderResult {
  codeUrl: string; // 二维码URL
  prepayId: string;
}

export async function createNativeOrder(params: NativeOrderParams): Promise<NativeOrderResult> {
  const { valid, missing } = validateWechatPayConfig();
  if (!valid) {
    throw new Error(`微信支付配置缺失: ${missing.join(", ")}`);
  }

  const urlPath = "/v3/pay/transactions/native";
  const url = `${WECHAT_PAY_BASE_URL}${urlPath}`;

  const body = JSON.stringify({
    appid: WECHAT_PAY_CONFIG.appid,
    mchid: WECHAT_PAY_CONFIG.mchid,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: {
      total: params.amount,
      currency: "CNY",
    },
    scene_info: params.clientIp
      ? {
          payer_client_ip: params.clientIp,
        }
      : undefined,
  });

  const headers = buildHeaders("POST", urlPath, body);

  console.log("[WechatPay] Creating native order:", {
    outTradeNo: params.outTradeNo,
    amount: params.amount,
    description: params.description,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("[WechatPay] Create order failed:", responseText);
    throw new Error(`创建微信支付订单失败: ${responseText}`);
  }

  const data = JSON.parse(responseText);

  console.log("[WechatPay] Order created successfully:", {
    outTradeNo: params.outTradeNo,
    prepayId: data.prepay_id,
  });

  return {
    codeUrl: data.code_url,
    prepayId: data.prepay_id,
  };
}

/**
 * 查询订单状态
 * 参考: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_2.shtml
 */
export interface QueryOrderResult {
  tradeState: string; // SUCCESS, REFUND, NOTPAY, CLOSED, REVOKED, USERPAYING, PAYERROR
  transactionId?: string;
  outTradeNo: string;
  amount?: {
    total: number;
    payerTotal?: number;
  };
  successTime?: string;
}

export async function queryOrder(outTradeNo: string): Promise<QueryOrderResult> {
  const { valid, missing } = validateWechatPayConfig();
  if (!valid) {
    throw new Error(`微信支付配置缺失: ${missing.join(", ")}`);
  }

  const urlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${WECHAT_PAY_CONFIG.mchid}`;
  const url = `${WECHAT_PAY_BASE_URL}${urlPath}`;

  const headers = buildHeaders("GET", urlPath);

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("[WechatPay] Query order failed:", responseText);
    throw new Error(`查询订单失败: ${responseText}`);
  }

  const data = JSON.parse(responseText);

  return {
    tradeState: data.trade_state,
    transactionId: data.transaction_id,
    outTradeNo: data.out_trade_no,
    amount: data.amount,
    successTime: data.success_time,
  };
}

/**
 * 关闭订单
 * 参考: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_3.shtml
 */
export async function closeOrder(outTradeNo: string): Promise<void> {
  const { valid, missing } = validateWechatPayConfig();
  if (!valid) {
    throw new Error(`微信支付配置缺失: ${missing.join(", ")}`);
  }

  const urlPath = `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;
  const url = `${WECHAT_PAY_BASE_URL}${urlPath}`;

  const body = JSON.stringify({
    mchid: WECHAT_PAY_CONFIG.mchid,
  });

  const headers = buildHeaders("POST", urlPath, body);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const responseText = await response.text();
    console.error("[WechatPay] Close order failed:", responseText);
    throw new Error(`关闭订单失败: ${responseText}`);
  }

  console.log("[WechatPay] Order closed:", outTradeNo);
}

/**
 * 解析支付回调通知
 * 参考: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_5.shtml
 */
export interface PaymentNotification {
  id: string;
  createTime: string;
  eventType: string;
  resource: {
    algorithm: string;
    ciphertext: string;
    associatedData: string;
    originalType: string;
    nonce: string;
  };
}

/**
 * 解密后的支付通知数据
 */
export interface DecryptedPaymentNotification {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  success_time?: string;
  amount?: {
    total: number;
  };
}

/**
 * 解密回调数据
 */
export function decryptNotification(
  ciphertext: string,
  associatedData: string,
  nonce: string
): DecryptedPaymentNotification {
  const key = Buffer.from(WECHAT_PAY_CONFIG.apiV3Key, "utf8");
  const iv = Buffer.from(nonce, "utf8");

  // 构建AAD（Additional Authenticated Data）
  const authTag = Buffer.from(ciphertext.slice(-32), "hex");
  const encryptedData = Buffer.from(ciphertext.slice(0, -32), "hex");
  const aad = Buffer.from(associatedData, "utf8");

  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    console.error("[WechatPay] Decrypt notification failed:", error);
    throw new Error("解密通知数据失败");
  }
}

/**
 * 生成二维码图片（使用Google Charts API或本地生成）
 * 这里使用 qrcode 库
 */
export async function generateQRCode(codeUrl: string): Promise<Buffer> {
  // 动态导入 qrcode 库
  const QRCode = await import("qrcode");

  return QRCode.toBuffer(codeUrl, {
    type: "png",
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * 沙箱环境开关
 */
export function isSandboxMode(): boolean {
  return process.env.WECHAT_PAY_SANDBOX === "true";
}

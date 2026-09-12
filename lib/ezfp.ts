/**
 * ezfp.cn V2 支付网关客户端（SHA256WithRSA）
 * 文档: https://www.ezfp.cn/doc/index.html
 *
 * 签名规则（与官方文档一致）：
 *   - 取所有「非空」参数，排除 sign / sign_type
 *   - 按键名 ASCII 升序排序
 *   - 拼接为 k=v&k=v...（值原样，不做 urlencode）
 *   - 用商户私钥 SHA256WithRSA 签名，结果 base64 → sign
 *   - 提交时附带 sign_type=RSA
 *
 * 环境变量：
 *   EZFP_PID          商户 PID（数字字符串）
 *   EZFP_PRIVATE_KEY  商户私钥 PEM（允许以 \n 转义，也支持纯 base64 自动补全头）
 *   EZFP_PUBLIC_KEY   平台公钥 PEM（回调验签用）
 *   EZFP_API_URL      网关基础地址（默认 https://www.ezfp.cn，可在 Vercel 覆盖）
 */

import crypto from "crypto";

export interface EzfpConfig {
  pid: string;
  privateKey: string;
  publicKey: string;
  apiUrl: string;
}

function toPem(raw: string, header: "RSA PRIVATE KEY" | "PUBLIC KEY"): string {
  const s = (raw || "").replace(/\\n/g, "\n").trim();
  if (!s) return "";
  if (s.includes("-----BEGIN")) return s;
  const wrapped = s.match(/.{1,64}/g)?.join("\n") ?? s;
  return `-----BEGIN ${header}-----\n${wrapped}\n-----END ${header}-----`;
}

export function getEzfpConfig(): EzfpConfig {
  const pid = (process.env.EZFP_PID || "").trim();
  const privateKeyRaw = process.env.EZFP_PRIVATE_KEY || "";
  const publicKeyRaw = process.env.EZFP_PUBLIC_KEY || "";
  const apiUrl = (process.env.EZFP_API_URL || "https://www.ezfp.cn").replace(/\/+$/, "");

  if (!pid || !privateKeyRaw || !publicKeyRaw) {
    throw new Error(
      "ezfp 支付配置缺失：请在环境变量中配置 EZFP_PID / EZFP_PRIVATE_KEY / EZFP_PUBLIC_KEY"
    );
  }

  return {
    pid,
    privateKey: toPem(privateKeyRaw, "RSA PRIVATE KEY"),
    publicKey: toPem(publicKeyRaw, "PUBLIC KEY"),
    apiUrl,
  };
}

/** 对参数集生成 SHA256WithRSA 签名（参数值为字符串） */
export function signParams(params: Record<string, string>, privateKey: string): string {
  const signStr = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signStr, "utf8");
  return sign.sign(privateKey, "base64");
}

/** 校验回调签名（使用平台公钥） */
export function verifyNotifySign(params: Record<string, string>, publicKey: string): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const signStr = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(signStr, "utf8");
  try {
    return verify.verify(publicKey, sign, "base64");
  } catch {
    return false;
  }
}

export interface EzfpCreateParams {
  outTradeNo: string;
  name: string;
  moneyYuan: string; // 元，2 位小数，如 "19.90"
  notifyUrl: string;
  returnUrl?: string;
  type?: string; // 支付方式，默认 wxpay
}

export interface EzfpCreateResult {
  tradeNo: string;
  payInfo: string; // 二维码内容（字符串）
  payType: string;
}

export async function createEzfpOrder(params: EzfpCreateParams): Promise<EzfpCreateResult> {
  const cfg = getEzfpConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const payload: Record<string, string> = {
    pid: cfg.pid,
    method: "web",
    device: "pc",
    type: params.type || "wxpay",
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    return_url:
      params.returnUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"}/vip?paid=1`,
    name: params.name,
    money: params.moneyYuan,
    timestamp,
  };

  payload.sign = signParams(payload, cfg.privateKey);
  payload.sign_type = "RSA";

  const url = `${cfg.apiUrl}/api/pay/create`;
  const body = new URLSearchParams(payload).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }

  // ezfp V2：code === 0 表示成功
  if (data.code !== 0 && data.code !== "0") {
    throw new Error(`ezfp 创建订单失败: ${String(data.msg || data.message || text)}`);
  }

  return {
    tradeNo: String(data.trade_no ?? ""),
    payInfo: String(data.pay_info ?? data.qr_code ?? ""),
    payType: String(data.pay_type ?? "qrcode"),
  };
}

export interface EzfpQueryResult {
  status: number; // 1 = 已支付
  tradeNo?: string;
  outTradeNo?: string;
  money?: string;
}

export async function queryEzfpOrder(outTradeNo: string): Promise<EzfpQueryResult> {
  const cfg = getEzfpConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const payload: Record<string, string> = {
    pid: cfg.pid,
    out_trade_no: outTradeNo,
    timestamp,
  };
  payload.sign = signParams(payload, cfg.privateKey);
  payload.sign_type = "RSA";

  const url = `${cfg.apiUrl}/api/pay/query`;
  const body = new URLSearchParams(payload).toString();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }

  return {
    status: Number(data.status ?? data.code ?? 0),
    tradeNo: data.trade_no != null ? String(data.trade_no) : undefined,
    outTradeNo: data.out_trade_no != null ? String(data.out_trade_no) : undefined,
    money: data.money != null ? String(data.money) : undefined,
  };
}

/**
 * 生成二维码图片（复用 qrcode 库；原 wechat-pay.generateQRCode 已迁移至此）
 */
export async function generateQRCode(codeUrl: string): Promise<Buffer> {
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

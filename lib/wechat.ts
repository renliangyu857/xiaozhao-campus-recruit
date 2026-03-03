/**
 * 微信相关配置和工具函数
 * 配置预留位置，稍后填入真实值
 */

// 微信公众号配置（请填入真实值）
export const WECHAT_CONFIG = {
  APP_ID: process.env.WECHAT_APP_ID || "wxYOUR_APP_ID_HERE",
  APP_SECRET: process.env.WECHAT_APP_SECRET || "YOUR_APP_SECRET_HERE",
  // 授权回调地址，必须与公众号后台配置的域名一致
  get CALLBACK_URL() {
    return `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"}/api/auth/wechat/callback`;
  },
};

// 验证配置是否已设置
export function validateWechatConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // 检查 WECHAT_CONFIG 中的实际值（已经处理了 process.env 和默认值）
  const appId = WECHAT_CONFIG.APP_ID;
  const appSecret = WECHAT_CONFIG.APP_SECRET;

  // 检查是否是默认值或未设置
  const isDefaultAppId = !appId || appId === "wxYOUR_APP_ID_HERE" || appId.startsWith("wxYOUR_");
  const isDefaultSecret = !appSecret || appSecret === "YOUR_APP_SECRET_HERE" || appSecret.includes("YOUR_");

  if (isDefaultAppId) {
    missing.push("WECHAT_APP_ID");
    console.error("[WechatConfig] WECHAT_APP_ID not configured, current value:", appId);
  }

  if (isDefaultSecret) {
    missing.push("WECHAT_APP_SECRET");
    console.error("[WechatConfig] WECHAT_APP_SECRET not configured");
  }

  return { valid: missing.length === 0, missing };
}

// 微信 Token 响应
export interface WechatTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
  // 错误时返回
  errcode?: number;
  errmsg?: string;
}

// 微信用户信息响应
export interface WechatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
  // 错误时返回
  errcode?: number;
  errmsg?: string;
}

// State 数据结构（用于防 CSRF）
export interface AuthState {
  // 登录后跳转路径
  redirectPath: string;
  // 随机数防 CSRF
  nonce: string;
  // 二维码登录票据（PC端使用）
  ticket?: string;
}

/**
 * 生成授权 URL
 */
export function generateAuthUrl(params: {
  redirectPath?: string;
  ticket?: string;
}): string {
  const { redirectPath = "/", ticket } = params;

  const state: AuthState = {
    redirectPath,
    nonce: Math.random().toString(36).substring(2) + Date.now().toString(36),
    ...(ticket && { ticket }),
  };

  const stateStr = Buffer.from(JSON.stringify(state)).toString("base64url");
  const redirectUri = encodeURIComponent(WECHAT_CONFIG.CALLBACK_URL);
  const scope = "snsapi_userinfo"; // 获取用户昵称和头像

  return (
    `https://open.weixin.qq.com/connect/oauth2/authorize` +
    `?appid=${WECHAT_CONFIG.APP_ID}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(stateStr)}` +
    `#wechat_redirect`
  );
}

/**
 * 用 code 换取 access_token 和 openid
 */
export async function exchangeCodeForToken(
  code: string
): Promise<WechatTokenResponse> {
  const url =
    `https://api.weixin.qq.com/sns/oauth2/access_token` +
    `?appid=${WECHAT_CONFIG.APP_ID}` +
    `&secret=${WECHAT_CONFIG.APP_SECRET}` +
    `&code=${code}` +
    `&grant_type=authorization_code`;

  const res = await fetch(url);
  const data: WechatTokenResponse = await res.json();

  if (data.errcode) {
    throw new Error(`微信接口错误: ${data.errmsg} (code: ${data.errcode})`);
  }

  return data;
}

/**
 * 获取微信用户信息
 */
export async function getWechatUserInfo(
  accessToken: string,
  openid: string
): Promise<WechatUserInfo> {
  const url =
    `https://api.weixin.qq.com/sns/userinfo` +
    `?access_token=${accessToken}` +
    `&openid=${openid}` +
    `&lang=zh_CN`;

  const res = await fetch(url);
  const data: WechatUserInfo = await res.json();

  if (data.errcode) {
    throw new Error(`微信接口错误: ${data.errmsg} (code: ${data.errcode})`);
  }

  return data;
}

/**
 * 解析 state 参数
 */
export function parseState(stateStr: string): AuthState | null {
  try {
    const decoded = Buffer.from(stateStr, "base64url").toString();
    return JSON.parse(decoded) as AuthState;
  } catch {
    return null;
  }
}

/**
 * 检查是否在微信浏览器内
 */
export function isWechatBrowser(userAgent: string): boolean {
  return /MicroMessenger/i.test(userAgent);
}

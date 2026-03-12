/**
 * 微信相关配置和工具函数
 * 配置预留位置，稍后填入真实值
 */

import { logger } from "@/lib/logger";

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
  const rawRedirectUri = WECHAT_CONFIG.CALLBACK_URL;
  const redirectUri = encodeURIComponent(rawRedirectUri);
  const scope = "snsapi_userinfo"; // 获取用户昵称和头像

  const authUrl =
    `https://open.weixin.qq.com/connect/oauth2/authorize` +
    `?appid=${WECHAT_CONFIG.APP_ID}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(stateStr)}` +
    `#wechat_redirect`;

  // 打印调试日志
  console.log("[WechatAuth] Generated auth URL:", {
    rawRedirectUri,
    encodedRedirectUri: redirectUri,
    appId: WECHAT_CONFIG.APP_ID,
    fullUrl: authUrl,
  });

  return authUrl;
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

  console.log("[WechatToken] Exchanging code for token:", {
    appId: WECHAT_CONFIG.APP_ID,
    code: code.slice(0, 10) + "...",
    requestUrl: url.replace(WECHAT_CONFIG.APP_SECRET, "***SECRET***"),
  });

  const res = await fetch(url);
  const rawText = await res.text();

  console.log("[WechatToken] Raw response:", rawText);

  let data: WechatTokenResponse;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    console.error("[WechatToken] Failed to parse response:", e);
    throw new Error(`微信接口返回非 JSON: ${rawText.slice(0, 200)}`);
  }

  if (data.errcode) {
    console.error("[WechatToken] WeChat API error:", {
      errcode: data.errcode,
      errmsg: data.errmsg,
    });
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
 * 获取微信公众号 access_token（用于调用其他 API）
 */
export async function getWechatAccessToken(): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_CONFIG.APP_ID}&secret=${WECHAT_CONFIG.APP_SECRET}`;

  logger.info("wechat_access_token_request_started", {
    appIdConfigured: Boolean(WECHAT_CONFIG.APP_ID),
  });

  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    logger.error("wechat_access_token_request_failed", {
      errcode: data.errcode,
      errmsg: data.errmsg,
    });
    throw new Error(`获取 access_token 失败: ${data.errmsg}`);
  }

  logger.info("wechat_access_token_request_succeeded", {
    expiresIn: data.expires_in,
  });

  return data.access_token;
}

/**
 * 获取用户关注状态（是否已关注公众号）
 * 需要调用微信公众号的获取用户基本信息接口
 */
export async function getUserSubscribeStatus(
  accessToken: string,
  openid: string
): Promise<boolean> {
  try {
    const url = `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode) {
      console.error("[WechatSubscribe] Failed to get user info:", data);
      return false;
    }

    // subscribe: 用户是否订阅该公众号标识，值为0时，代表此用户没有关注该公众号
    return data.subscribe === 1;
  } catch (error) {
    console.error("[WechatSubscribe] Error checking subscribe status:", error);
    return false;
  }
}

/**
 * 检查是否在微信浏览器内
 */
export function isWechatBrowser(userAgent: string): boolean {
  return /MicroMessenger/i.test(userAgent);
}

// ==================== 带参数二维码（扫码关注自动登录）====================

export interface MpQrCodeResponse {
  ticket: string;
  expire_seconds: number;
  url: string;
}

// 微信代理服务器配置（用于解决 IP 白名单问题）
const WECHAT_PROXY_URL = process.env.WECHAT_PROXY_URL || "";
const WECHAT_PROXY_TOKEN = process.env.WECHAT_PROXY_TOKEN || "";

function getScenePreview(sceneStr: string): string {
  return sceneStr.length <= 12 ? sceneStr : `${sceneStr.slice(0, 6)}...${sceneStr.slice(-4)}`;
}

// 检查代理健康状态（带缓存，避免频繁检查）
let proxyHealthCheck: { healthy: boolean; timestamp: number } | null = null;
const PROXY_HEALTH_CACHE_MS = 30000; // 30秒内不再重复检查

async function isProxyHealthy(): Promise<boolean> {
  if (!WECHAT_PROXY_URL) return false;

  // 使用缓存的健康状态
  if (proxyHealthCheck && Date.now() - proxyHealthCheck.timestamp < PROXY_HEALTH_CACHE_MS) {
    return proxyHealthCheck.healthy;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3秒超时

    const res = await fetch(`${WECHAT_PROXY_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const healthy = res.ok;
    proxyHealthCheck = { healthy, timestamp: Date.now() };
    logger.info("wechat_proxy_health_checked", {
      proxyUrl: WECHAT_PROXY_URL,
      healthy,
      status: res.status,
    });
    return healthy;
  } catch (error) {
    proxyHealthCheck = { healthy: false, timestamp: Date.now() };
    logger.warn("wechat_proxy_health_failed", {
      proxyUrl: WECHAT_PROXY_URL,
      error: String(error),
    });
    return false;
  }
}

/**
 * 通过代理服务器生成微信公众号带参数二维码
 * 用户扫码关注后，可以通过事件获取 openid
 *
 * @param sceneStr 场景值字符串（如登录票据 ticket）
 * @param expireSeconds 二维码有效期（秒），默认 600 秒（10 分钟）
 */
export async function generateMpQrCode(
  sceneStr: string,
  expireSeconds = 600
): Promise<MpQrCodeResponse> {
  const hasProxyUrl = Boolean(WECHAT_PROXY_URL);
  const hasProxyToken = Boolean(WECHAT_PROXY_TOKEN);
  const hasFullProxyConfig = hasProxyUrl && hasProxyToken;

  logger.info("wechat_qrcode_generation_started", {
    scenePreview: getScenePreview(sceneStr),
    expireSeconds,
    hasProxyUrl,
    hasProxyToken,
    proxyUrl: hasProxyUrl ? WECHAT_PROXY_URL : undefined,
  });

  if (hasProxyUrl !== hasProxyToken) {
    logger.error("wechat_qrcode_proxy_config_invalid", {
      hasProxyUrl,
      hasProxyToken,
      proxyUrl: hasProxyUrl ? WECHAT_PROXY_URL : undefined,
    });
    throw new Error("二维码生成失败: WECHAT_PROXY_URL 和 WECHAT_PROXY_TOKEN 需要同时配置");
  }

  if (hasFullProxyConfig) {
    const proxyHealthy = await isProxyHealthy();
    if (!proxyHealthy) {
      logger.error("wechat_qrcode_proxy_unhealthy", {
        proxyUrl: WECHAT_PROXY_URL,
        scenePreview: getScenePreview(sceneStr),
      });
      throw new Error(`二维码生成失败: 微信代理服务不可用 (${WECHAT_PROXY_URL}/health)`);
    }

    console.log("[WechatQR] Using proxy:", WECHAT_PROXY_URL);
    logger.info("wechat_qrcode_proxy_selected", {
      proxyUrl: WECHAT_PROXY_URL,
      scenePreview: getScenePreview(sceneStr),
      expireSeconds,
    });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${WECHAT_PROXY_URL}/wechat/qrcode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WECHAT_PROXY_TOKEN}`,
        },
        body: JSON.stringify({
          scene_str: sceneStr,
          expire_seconds: expireSeconds,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();

      if (!res.ok || data.error) {
        logger.error("wechat_qrcode_proxy_response_invalid", {
          proxyUrl: WECHAT_PROXY_URL,
          scenePreview: getScenePreview(sceneStr),
          status: res.status,
          error: data.errmsg || data.error || res.statusText,
        });
        throw new Error(data.errmsg || data.error || res.statusText);
      }

      logger.info("wechat_qrcode_proxy_succeeded", {
        proxyUrl: WECHAT_PROXY_URL,
        scenePreview: getScenePreview(sceneStr),
        expireSeconds: data.expire_seconds,
      });

      return {
        ticket: data.ticket,
        expire_seconds: data.expire_seconds,
        url: data.url,
      };
    } catch (error) {
      console.error("[WechatQR] Proxy fetch failed:", error);
      logger.error("wechat_qrcode_proxy_failed", {
        proxyUrl: WECHAT_PROXY_URL,
        scenePreview: getScenePreview(sceneStr),
        error: String(error),
      });
      throw new Error(`二维码生成失败: 代理服务请求失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("[WechatQR] Using direct WeChat API");
  logger.warn("wechat_qrcode_direct_api_selected", {
    scenePreview: getScenePreview(sceneStr),
    expireSeconds,
  });
  try {
    const accessToken = await getWechatAccessToken();

    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;

    const body = {
      expire_seconds: expireSeconds,
      action_name: "QR_STR_SCENE",
      action_info: {
        scene: {
          scene_str: sceneStr,
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.errcode) {
      logger.error("wechat_qrcode_direct_api_error", {
        scenePreview: getScenePreview(sceneStr),
        errcode: data.errcode,
        errmsg: data.errmsg,
      });
      throw new Error(`生成带参数二维码失败: ${data.errmsg} (code: ${data.errcode})`);
    }

    logger.info("wechat_qrcode_direct_api_succeeded", {
      scenePreview: getScenePreview(sceneStr),
      expireSeconds: data.expire_seconds,
    });

    return {
      ticket: data.ticket,
      expire_seconds: data.expire_seconds,
      url: data.url,
    };
  } catch (error) {
    console.error("[WechatQR] Direct API failed:", error);
    logger.error("wechat_qrcode_direct_api_failed", {
      scenePreview: getScenePreview(sceneStr),
      error: String(error),
    });
    throw new Error(`二维码生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
export function getMpQrCodeImageUrl(ticket: string): string {
  return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
}

// ==================== 微信消息/事件处理 ====================

export interface WechatEventMessage {
  ToUserName: string;
  FromUserName: string; // 用户的 OpenID
  CreateTime: number;
  MsgType: string;
  Event?: string; // subscribe, unsubscribe, SCAN 等
  EventKey?: string; // 场景值，如 qrscene_ticket_xxx
  Ticket?: string; // 二维码的 ticket
}

/**
 * 解析微信推送的 XML 消息
 */
export function parseWechatXml(xml: string): WechatEventMessage | null {
  try {
    const result: Record<string, string> = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\w+>|<(\w+)>(.*?)<\/\w+>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] || match[4];
      if (key) {
        result[key] = value;
      }
    }

    return {
      ToUserName: result.ToUserName || "",
      FromUserName: result.FromUserName || "",
      CreateTime: parseInt(result.CreateTime || "0"),
      MsgType: result.MsgType || "",
      Event: result.Event,
      EventKey: result.EventKey,
      Ticket: result.Ticket,
    };
  } catch (error) {
    console.error("[WechatXml] Failed to parse XML:", error);
    return null;
  }
}

/**
 * 构建微信被动回复消息（文本）
 */
export function buildWechatReply(toUser: string, fromUser: string, content: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `
    <xml>
      <ToUserName><![CDATA[${toUser}]]></ToUserName>
      <FromUserName><![CDATA[${fromUser}]]></FromUserName>
      <CreateTime>${timestamp}</CreateTime>
      <MsgType><![CDATA[text]]></MsgType>
      <Content><![CDATA[${content}]]></Content>
    </xml>
  `.trim();
}

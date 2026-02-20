package com.campusrecruit.client;

/**
 * 微信公众号网页授权：用 code 换取 openid。
 * 生产环境调用微信 API；测试/开发可走 stub（如 code 即 openid）。
 */
public interface WeChatAuthClient {
    /**
     * 用授权 code 换取 openid。若失败返回 null。
     */
    String getOpenIdByCode(String code);
}

package com.campusrecruit.client;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 微信支付 JSAPI 下单。生产调用微信统一下单；测试/未配置时返回 stub 参数。
 */
public interface WeChatPayClient {
    /**
     * 创建 JSAPI 预支付订单，返回调起支付所需参数（appId, timeStamp, nonceStr, package, signType, paySign）。
     * 金额单位：元。
     */
    Map<String, String> createJsapiOrder(String orderNo, BigDecimal amountYuan, String openId);
}

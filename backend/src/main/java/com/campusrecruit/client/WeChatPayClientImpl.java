package com.campusrecruit.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Component
public class WeChatPayClientImpl implements WeChatPayClient {

    private final boolean useStub;

    public WeChatPayClientImpl(@Value("${wechat.pay.stub:true}") boolean useStub) {
        this.useStub = useStub;
    }

    @Override
    public Map<String, String> createJsapiOrder(String orderNo, BigDecimal amountYuan, String openId) {
        if (useStub) {
            return Map.of(
                    "appId", "stub_appid",
                    "timeStamp", String.valueOf(System.currentTimeMillis() / 1000),
                    "nonceStr", UUID.randomUUID().toString(),
                    "package", "prepay_id=stub_" + orderNo,
                    "signType", "MD5",
                    "paySign", "stub_sign"
            );
        }
        // TODO: 调用微信统一下单 API，返回 JSAPI 参数
        return Map.of(
                "appId", "stub_appid",
                "timeStamp", String.valueOf(System.currentTimeMillis() / 1000),
                "nonceStr", UUID.randomUUID().toString(),
                "package", "prepay_id=stub_" + orderNo,
                "signType", "MD5",
                "paySign", "stub_sign"
        );
    }
}

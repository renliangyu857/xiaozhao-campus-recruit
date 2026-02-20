package com.campusrecruit.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

@Component
public class WeChatAuthClientImpl implements WeChatAuthClient {

    private final String appId;
    private final String appSecret;
    private final boolean useStub;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WeChatAuthClientImpl(
            @Value("${wechat.app-id:}") String appId,
            @Value("${wechat.app-secret:}") String appSecret,
            @Value("${wechat.stub:false}") boolean useStub
    ) {
        this.appId = appId != null ? appId : "";
        this.appSecret = appSecret != null ? appSecret : "";
        this.useStub = useStub || this.appId.isBlank();
    }

    @Override
    public String getOpenIdByCode(String code) {
        if (code == null || code.isBlank()) return null;
        if (useStub) {
            return code;
        }
        String url = "https://api.weixin.qq.com/sns/oauth2/access_token"
                + "?appid=" + appId + "&secret=" + appSecret
                + "&code=" + code + "&grant_type=authorization_code";
        try {
            String body = restTemplate.getForObject(url, String.class);
            if (body == null) return null;
            JsonNode node = objectMapper.readTree(body);
            if (node.has("openid")) return node.get("openid").asText();
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}

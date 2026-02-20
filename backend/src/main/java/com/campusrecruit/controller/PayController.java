package com.campusrecruit.controller;

import com.campusrecruit.service.WeChatPayNotifyService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/pay")
public class PayController {

    private static final Pattern OUT_TRADE_NO = Pattern.compile("<out_trade_no><!\\[CDATA\\[(.*?)\\]\\]></out_trade_no>");
    private static final Pattern TRANSACTION_ID = Pattern.compile("<transaction_id><!\\[CDATA\\[(.*?)\\]\\]></transaction_id>");
    private static final Pattern RESULT_CODE = Pattern.compile("<result_code><!\\[CDATA\\[(.*?)\\]\\]></result_code>");

    private final WeChatPayNotifyService notifyService;

    public PayController(WeChatPayNotifyService notifyService) {
        this.notifyService = notifyService;
    }

    @PostMapping(value = "/wechat/notify", consumes = MediaType.APPLICATION_XML_VALUE, produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> wechatNotify(@RequestBody String xmlBody) {
        String resultCode = match(RESULT_CODE, xmlBody);
        if (!"SUCCESS".equals(resultCode)) {
            return ResponseEntity.ok(successXml());
        }
        String orderNo = match(OUT_TRADE_NO, xmlBody);
        String transactionId = match(TRANSACTION_ID, xmlBody);
        if (orderNo != null) {
            notifyService.handlePaySuccess(orderNo, transactionId);
        }
        return ResponseEntity.ok(successXml());
    }

    private static String match(Pattern p, String xml) {
        Matcher m = p.matcher(xml);
        return m.find() ? m.group(1) : null;
    }

    private static String successXml() {
        return "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
    }
}

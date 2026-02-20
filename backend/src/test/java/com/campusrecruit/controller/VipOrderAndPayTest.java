package com.campusrecruit.controller;

import com.campusrecruit.entity.PaymentOrder;
import com.campusrecruit.entity.User;
import com.campusrecruit.entity.UserMember;
import com.campusrecruit.repository.PaymentOrderRepository;
import com.campusrecruit.repository.UserMemberRepository;
import com.campusrecruit.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import org.springframework.data.domain.PageRequest;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VipOrderAndPayTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentOrderRepository paymentOrderRepository;

    @Autowired
    private UserMemberRepository userMemberRepository;

    @BeforeEach
    void setUp() {
        userMemberRepository.deleteAll();
        paymentOrderRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Nested
    @DisplayName("POST /vip/create-order")
    class CreateOrder {

        @Test
        @DisplayName("未登录返回 401")
        void unauthorized() throws Exception {
            mockMvc.perform(post("/vip/create-order")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"planId\":\"1_month\"}"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("登录后创建订单返回 orderNo 和 wechatJsapiParams")
        void success() throws Exception {
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_order"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();

            mockMvc.perform(post("/vip/create-order")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"planId\":\"3_month\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.orderNo").value(startsWith("VIP")))
                    .andExpect(jsonPath("$.wechatJsapiParams").isMap())
                    .andExpect(jsonPath("$.wechatJsapiParams.package").value(containsString("prepay_id")));
        }

        @Test
        @DisplayName("无效 planId 返回 400")
        void invalidPlan() throws Exception {
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_bad"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();

            mockMvc.perform(post("/vip/create-order")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"planId\":\"invalid_plan\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /pay/wechat/notify 支付回调")
    class WechatNotify {

        @Test
        @DisplayName("支付成功回调：订单状态更新为 success，并创建 user_member")
        void paySuccessCreatesMember() throws Exception {
            User user = new User();
            user.setOpenId("openid_pay");
            user.setNickname("payuser");
            user.setQueryCount(0);
            user.setQueryCountResetAt(LocalDate.now());
            user = userRepository.save(user);

            PaymentOrder order = new PaymentOrder();
            order.setOrderNo("VIP1234567890_abc");
            order.setUserId(user.getId());
            order.setPlanId("1_month");
            order.setAmount(java.math.BigDecimal.valueOf(8.8));
            order.setPayChannel("wechat_jsapi");
            order.setStatus("pending");
            paymentOrderRepository.save(order);

            String xml = "<xml><return_code><![CDATA[SUCCESS]]></return_code>" +
                    "<result_code><![CDATA[SUCCESS]]></result_code>" +
                    "<out_trade_no><![CDATA[VIP1234567890_abc]]></out_trade_no>" +
                    "<transaction_id><![CDATA[wx_txn_123]]></transaction_id></xml>";

            mockMvc.perform(post("/pay/wechat/notify")
                            .contentType(MediaType.APPLICATION_XML)
                            .content(xml))
                    .andExpect(status().isOk())
                    .andExpect(content().string(containsString("SUCCESS")));

            PaymentOrder updated = paymentOrderRepository.findByOrderNo("VIP1234567890_abc").orElseThrow();
            if (!"success".equals(updated.getStatus())) throw new AssertionError("order status should be success");
            if (updated.getTradeNo() == null || !updated.getTradeNo().equals("wx_txn_123"))
                throw new AssertionError("trade_no should be set");

            var members = userMemberRepository.findActiveByUserId(user.getId(), java.time.LocalDateTime.now(), PageRequest.of(0, 1));
            if (members.isEmpty()) throw new AssertionError("user_member should be created");
            if (!"1_month".equals(members.get(0).getPlanId())) throw new AssertionError("plan_id should be 1_month");
        }

        @Test
        @DisplayName("重复回调幂等：再次通知不重复创建 user_member")
        void idempotent() throws Exception {
            User user = new User();
            user.setOpenId("openid_idem");
            user = userRepository.save(user);
            PaymentOrder order = new PaymentOrder();
            order.setOrderNo("VIP_idem_001");
            order.setUserId(user.getId());
            order.setPlanId("1_month");
            order.setAmount(java.math.BigDecimal.valueOf(8.8));
            order.setStatus("pending");
            paymentOrderRepository.save(order);

            String xml = "<xml><return_code><![CDATA[SUCCESS]]></return_code>" +
                    "<result_code><![CDATA[SUCCESS]]></result_code>" +
                    "<out_trade_no><![CDATA[VIP_idem_001]]></out_trade_no>" +
                    "<transaction_id><![CDATA[wx_1]]></transaction_id></xml>";

            mockMvc.perform(post("/pay/wechat/notify").contentType(MediaType.APPLICATION_XML).content(xml))
                    .andExpect(status().isOk());
            mockMvc.perform(post("/pay/wechat/notify").contentType(MediaType.APPLICATION_XML).content(xml))
                    .andExpect(status().isOk());

            long count = userMemberRepository.findActiveByUserId(user.getId(), java.time.LocalDateTime.now(), PageRequest.of(0, 10)).size();
            if (count != 1) throw new AssertionError("expected 1 user_member, got " + count);
        }
    }
}

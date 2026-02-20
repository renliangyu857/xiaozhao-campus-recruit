package com.campusrecruit.service;

import com.campusrecruit.dto.CreateOrderResponse;
import com.campusrecruit.dto.VipPlanDto;
import com.campusrecruit.entity.PaymentOrder;
import com.campusrecruit.entity.User;
import com.campusrecruit.client.WeChatPayClient;
import com.campusrecruit.repository.PaymentOrderRepository;
import com.campusrecruit.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
public class VipOrderService {

    private final VipPlanService vipPlanService;
    private final PaymentOrderRepository paymentOrderRepository;
    private final UserRepository userRepository;
    private final WeChatPayClient weChatPayClient;

    public VipOrderService(VipPlanService vipPlanService,
                           PaymentOrderRepository paymentOrderRepository,
                           UserRepository userRepository,
                           WeChatPayClient weChatPayClient) {
        this.vipPlanService = vipPlanService;
        this.paymentOrderRepository = paymentOrderRepository;
        this.userRepository = userRepository;
        this.weChatPayClient = weChatPayClient;
    }

    @Transactional
    public Optional<CreateOrderResponse> createOrder(Long userId, String planId) {
        if (userId == null || planId == null || planId.isBlank()) return Optional.empty();
        Optional<VipPlanDto> planOpt = vipPlanService.getPlanById(planId);
        if (planOpt.isEmpty()) return Optional.empty();
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) return Optional.empty();

        VipPlanDto plan = planOpt.get();
        User user = userOpt.get();
        String orderNo = "VIP" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);

        PaymentOrder order = new PaymentOrder();
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setPlanId(planId);
        order.setAmount(plan.getPrice());
        order.setPayChannel("wechat_jsapi");
        order.setStatus("pending");
        paymentOrderRepository.save(order);

        String openId = user.getOpenId() != null ? user.getOpenId() : "";
        java.util.Map<String, String> jsapiParams = weChatPayClient.createJsapiOrder(orderNo, plan.getPrice(), openId);

        CreateOrderResponse response = new CreateOrderResponse();
        response.setOrderNo(orderNo);
        response.setWechatJsapiParams(jsapiParams);
        return Optional.of(response);
    }
}

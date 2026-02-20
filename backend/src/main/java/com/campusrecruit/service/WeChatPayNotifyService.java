package com.campusrecruit.service;

import com.campusrecruit.entity.PaymentOrder;
import com.campusrecruit.entity.UserMember;
import com.campusrecruit.repository.PaymentOrderRepository;
import com.campusrecruit.repository.UserMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class WeChatPayNotifyService {

    private final PaymentOrderRepository paymentOrderRepository;
    private final UserMemberRepository userMemberRepository;
    private final VipPlanService vipPlanService;

    public WeChatPayNotifyService(PaymentOrderRepository paymentOrderRepository,
                                  UserMemberRepository userMemberRepository,
                                  VipPlanService vipPlanService) {
        this.paymentOrderRepository = paymentOrderRepository;
        this.userMemberRepository = userMemberRepository;
        this.vipPlanService = vipPlanService;
    }

    /**
     * 处理支付成功回调：更新订单，开通会员（方案 A：写入 user_member）。幂等：已成功的订单不再处理。
     */
    @Transactional
    public boolean handlePaySuccess(String orderNo, String transactionId) {
        if (orderNo == null || orderNo.isBlank()) return false;
        Optional<PaymentOrder> orderOpt = paymentOrderRepository.findByOrderNo(orderNo);
        if (orderOpt.isEmpty()) return false;
        PaymentOrder order = orderOpt.get();
        if ("success".equals(order.getStatus())) return true;

        order.setStatus("success");
        order.setTradeNo(transactionId);
        order.setPaidAt(LocalDateTime.now());
        paymentOrderRepository.save(order);

        int months = vipPlanService.getDurationMonths(order.getPlanId());
        if (months <= 0) return true;

        LocalDateTime startAt = LocalDateTime.now();
        LocalDateTime endAt = startAt.plusMonths(months);

        UserMember member = new UserMember();
        member.setUserId(order.getUserId());
        member.setPlanId(order.getPlanId());
        member.setStartAt(startAt);
        member.setEndAt(endAt);
        userMemberRepository.save(member);
        return true;
    }
}

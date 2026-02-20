package com.campusrecruit.service;

import com.campusrecruit.dto.VipPlanDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class VipPlanService {

    private static final List<VipPlanDto> PLANS = List.of(
            plan("1_month", "月度会员", "1个月", "8.8", "19.9", "尝鲜"),
            plan("3_month", "季度会员", "3个月", "18.8", "49.9", "推荐"),
            plan("lifetime", "永久会员", "永久", "29.9", "99.9", "超值")
    );

    public List<VipPlanDto> listPlans() {
        return PLANS;
    }

    public Optional<VipPlanDto> getPlanById(String planId) {
        return PLANS.stream().filter(p -> p.getId().equals(planId)).findFirst();
    }

    /** 套餐有效月数，永久返回 1200（约 100 年） */
    public int getDurationMonths(String planId) {
        return switch (planId != null ? planId : "") {
            case "1_month" -> 1;
            case "3_month" -> 3;
            case "lifetime" -> 1200;
            default -> 0;
        };
    }

    private static VipPlanDto plan(String id, String name, String durationLabel,
                                    String price, String originalPrice, String tag) {
        VipPlanDto dto = new VipPlanDto();
        dto.setId(id);
        dto.setName(name);
        dto.setDurationLabel(durationLabel);
        dto.setPrice(new BigDecimal(price));
        dto.setOriginalPrice(new BigDecimal(originalPrice));
        dto.setTag(tag);
        return dto;
    }
}

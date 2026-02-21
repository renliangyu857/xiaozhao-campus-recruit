package com.campusrecruit.service;

import com.campusrecruit.config.VipPlanProperties;
import com.campusrecruit.dto.VipPlanDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class VipPlanService {

    /** 默认套餐定义（id/name/durationLabel/price/originalPrice/tag），价位可通过 app.vip.plans 覆盖 */
    private static final List<DefaultPlan> DEFAULTS = List.of(
            new DefaultPlan("1_month", "月度会员", "1个月", "8.8", "19.9", "尝鲜"),
            new DefaultPlan("3_month", "季度会员", "3个月", "16.6", "49.9", "超值推荐"),
            new DefaultPlan("lifetime", "永久会员", "永久", "29.9", "99.9", "超值")
    );

    private final VipPlanProperties vipPlanProperties;

    public VipPlanService(VipPlanProperties vipPlanProperties) {
        this.vipPlanProperties = vipPlanProperties;
    }

    public List<VipPlanDto> listPlans() {
        List<VipPlanDto> result = new ArrayList<>();
        for (DefaultPlan d : DEFAULTS) {
            VipPlanDto dto = new VipPlanDto();
            dto.setId(d.id);
            dto.setName(d.name);
            dto.setDurationLabel(d.durationLabel);
            VipPlanProperties.PlanEntry over = vipPlanProperties.getPlans() != null ? vipPlanProperties.getPlans().get(d.id) : null;
            dto.setPrice(over != null && over.getPrice() != null ? over.getPrice() : new BigDecimal(d.price));
            dto.setOriginalPrice(over != null && over.getOriginalPrice() != null ? over.getOriginalPrice() : new BigDecimal(d.originalPrice));
            dto.setTag(over != null && over.getTag() != null ? over.getTag() : d.tag);
            result.add(dto);
        }
        return result;
    }

    public Optional<VipPlanDto> getPlanById(String planId) {
        return listPlans().stream().filter(p -> p.getId().equals(planId)).findFirst();
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

    private record DefaultPlan(String id, String name, String durationLabel, String price, String originalPrice, String tag) {}
}

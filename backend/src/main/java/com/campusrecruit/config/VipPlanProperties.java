package com.campusrecruit.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 会员套餐配置，可通过 application.yml 或环境变量调整价位与标签，由 GET /vip/plans 接口下发。
 */
@Component
@ConfigurationProperties(prefix = "app.vip")
public class VipPlanProperties {

    /** 套餐 ID -> 配置（price/originalPrice/tag 等），未配置的套餐使用代码内默认值 */
    private Map<String, PlanEntry> plans = new LinkedHashMap<>();

    public Map<String, PlanEntry> getPlans() {
        return plans;
    }

    public void setPlans(Map<String, PlanEntry> plans) {
        this.plans = plans;
    }

    public static class PlanEntry {
        private BigDecimal price;
        private BigDecimal originalPrice;
        private String tag;

        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public BigDecimal getOriginalPrice() { return originalPrice; }
        public void setOriginalPrice(BigDecimal originalPrice) { this.originalPrice = originalPrice; }
        public String getTag() { return tag; }
        public void setTag(String tag) { this.tag = tag; }
    }
}

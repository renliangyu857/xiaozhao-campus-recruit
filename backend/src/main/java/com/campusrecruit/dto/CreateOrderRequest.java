package com.campusrecruit.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateOrderRequest {
    @NotBlank(message = "planId 不能为空")
    private String planId;

    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }
}

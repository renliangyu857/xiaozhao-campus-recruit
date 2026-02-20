package com.campusrecruit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class VipDashboardDto {
    private Boolean isVip;
    private String planId;
    private Boolean isTrial;
    private String vipExpiry;
    private Integer referralCodeCount;
    private Integer savedQueryCount;

    public Boolean getIsVip() { return isVip; }
    public void setIsVip(Boolean isVip) { this.isVip = isVip; }
    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }
    public Boolean getIsTrial() { return isTrial; }
    public void setIsTrial(Boolean isTrial) { this.isTrial = isTrial; }
    public String getVipExpiry() { return vipExpiry; }
    public void setVipExpiry(String vipExpiry) { this.vipExpiry = vipExpiry; }
    public Integer getReferralCodeCount() { return referralCodeCount; }
    public void setReferralCodeCount(Integer referralCodeCount) { this.referralCodeCount = referralCodeCount; }
    public Integer getSavedQueryCount() { return savedQueryCount; }
    public void setSavedQueryCount(Integer savedQueryCount) { this.savedQueryCount = savedQueryCount; }
}

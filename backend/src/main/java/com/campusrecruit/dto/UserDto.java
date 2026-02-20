package com.campusrecruit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDto {
    private String id;
    private String nickname;
    private String avatar;
    private Boolean isVip;
    private Boolean isTrial;
    private String vipExpiry;
    private Integer queryCount;
    private Integer remainingFreeQueries;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public Boolean getIsVip() { return isVip; }
    public void setIsVip(Boolean isVip) { this.isVip = isVip; }
    public Boolean getIsTrial() { return isTrial; }
    public void setIsTrial(Boolean isTrial) { this.isTrial = isTrial; }
    public String getVipExpiry() { return vipExpiry; }
    public void setVipExpiry(String vipExpiry) { this.vipExpiry = vipExpiry; }
    public Integer getQueryCount() { return queryCount; }
    public void setQueryCount(Integer queryCount) { this.queryCount = queryCount; }
    public Integer getRemainingFreeQueries() { return remainingFreeQueries; }
    public void setRemainingFreeQueries(Integer remainingFreeQueries) { this.remainingFreeQueries = remainingFreeQueries; }
}

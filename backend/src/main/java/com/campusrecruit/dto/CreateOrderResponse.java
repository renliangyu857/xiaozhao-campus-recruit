package com.campusrecruit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CreateOrderResponse {
    private String orderNo;
    private Map<String, String> wechatJsapiParams;

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }
    public Map<String, String> getWechatJsapiParams() { return wechatJsapiParams; }
    public void setWechatJsapiParams(Map<String, String> wechatJsapiParams) { this.wechatJsapiParams = wechatJsapiParams; }
}

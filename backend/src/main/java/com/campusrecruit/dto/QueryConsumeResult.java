package com.campusrecruit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class QueryConsumeResult {
    /** 是否允许本次查询（未超限或为 VIP） */
    private boolean allowed;
    /** 剩余免费次数，VIP 时为 null */
    private Integer remainingFreeQueries;

    public static QueryConsumeResult allowed(int remaining) {
        QueryConsumeResult r = new QueryConsumeResult();
        r.setAllowed(true);
        r.setRemainingFreeQueries(remaining);
        return r;
    }

    public static QueryConsumeResult allowedVip() {
        QueryConsumeResult r = new QueryConsumeResult();
        r.setAllowed(true);
        r.setRemainingFreeQueries(null);
        return r;
    }

    public static QueryConsumeResult denied() {
        QueryConsumeResult r = new QueryConsumeResult();
        r.setAllowed(false);
        r.setRemainingFreeQueries(0);
        return r;
    }

    public boolean isAllowed() { return allowed; }
    public void setAllowed(boolean allowed) { this.allowed = allowed; }
    public Integer getRemainingFreeQueries() { return remainingFreeQueries; }
    public void setRemainingFreeQueries(Integer remainingFreeQueries) { this.remainingFreeQueries = remainingFreeQueries; }
}

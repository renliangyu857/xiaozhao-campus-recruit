package com.campusrecruit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProgressStatsDto {
    /** 各状态数量：未投递、已投递、已笔试、已面试、已通过、已挂 */
    private Map<String, Integer> byStatus;
    /** 总投递数（排除未投递） */
    private Integer totalApplied;
    /** 按行业统计（仅统计已投递及之后的） */
    private List<IndustryCount> byIndustry;

    public static class IndustryCount {
        private String industry;
        private Integer count;

        public String getIndustry() { return industry; }
        public void setIndustry(String industry) { this.industry = industry; }
        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
    }

    public Map<String, Integer> getByStatus() { return byStatus; }
    public void setByStatus(Map<String, Integer> byStatus) { this.byStatus = byStatus; }
    public Integer getTotalApplied() { return totalApplied; }
    public void setTotalApplied(Integer totalApplied) { this.totalApplied = totalApplied; }
    public List<IndustryCount> getByIndustry() { return byIndustry; }
    public void setByIndustry(List<IndustryCount> byIndustry) { this.byIndustry = byIndustry; }
}

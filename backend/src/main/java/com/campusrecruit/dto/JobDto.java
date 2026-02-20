package com.campusrecruit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class JobDto {
    private String id;
    private String company;
    private String industry;
    private String type;
    private List<String> locations;
    private String status;   // 未投递、已投递、已笔试、已面试、已通过、已挂
    private String startDate;
    private String endDate;
    private Boolean noWrittenTest;
    private List<String> roles;
    private String announcementLink;
    private String applyLink;
    private String remark;
    private String batch;
    private String salary;
    private Boolean isNew;

    public static JobDto fromEntity(com.campusrecruit.entity.Job job, String status, boolean isNewToday) {
        JobDto dto = new JobDto();
        dto.setId(job.getId() != null ? job.getId().toString() : null);
        dto.setCompany(job.getCompany());
        dto.setIndustry(job.getIndustry());
        dto.setType(job.getRecruitType());
        dto.setLocations(parseJsonArray(job.getLocations()));
        dto.setStatus(status != null ? status : "未投递");
        dto.setStartDate(job.getStartDate());
        dto.setEndDate(job.getEndDate());
        dto.setNoWrittenTest(parseBoolean(job.getNoWrittenTest()));
        dto.setRoles(parseJsonArray(job.getRoles()));
        dto.setAnnouncementLink(job.getAnnouncementLink());
        dto.setApplyLink(job.getApplyLink());
        dto.setRemark(job.getRemark());
        dto.setBatch(job.getBatch());
        dto.setSalary(job.getSalary());
        dto.setIsNew(isNewToday);
        return dto;
    }

    private static Boolean parseBoolean(String v) {
        if (v == null || v.isBlank()) return false;
        String s = v.trim().toLowerCase();
        return "true".equals(s) || "1".equals(s) || "yes".equals(s);
    }

    private static List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        String s = json.trim();
        if (s.startsWith("[")) s = s.substring(1);
        if (s.endsWith("]")) s = s.substring(0, s.length() - 1);
        if (s.isBlank()) return List.of();
        return java.util.Arrays.stream(s.split(","))
                .map(String::trim)
                .map(x -> x.replaceAll("^\"|\"$", ""))
                .filter(x -> !x.isEmpty())
                .toList();
    }

    // getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public List<String> getLocations() { return locations; }
    public void setLocations(List<String> locations) { this.locations = locations; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }
    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
    public Boolean getNoWrittenTest() { return noWrittenTest; }
    public void setNoWrittenTest(Boolean noWrittenTest) { this.noWrittenTest = noWrittenTest; }
    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
    public String getAnnouncementLink() { return announcementLink; }
    public void setAnnouncementLink(String announcementLink) { this.announcementLink = announcementLink; }
    public String getApplyLink() { return applyLink; }
    public void setApplyLink(String applyLink) { this.applyLink = applyLink; }
    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
    public String getBatch() { return batch; }
    public void setBatch(String batch) { this.batch = batch; }
    public String getSalary() { return salary; }
    public void setSalary(String salary) { this.salary = salary; }
    public Boolean getIsNew() { return isNew; }
    public void setIsNew(Boolean isNew) { this.isNew = isNew; }
}

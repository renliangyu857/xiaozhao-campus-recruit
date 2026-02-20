package com.campusrecruit.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProgressItemDto {
    private String jobId;
    private String company;
    private String status;
    private LocalDateTime updatedAt;
    private List<String> locations;
    private String applyLink;
    private String announcementLink;
    private String note;

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<String> getLocations() { return locations; }
    public void setLocations(List<String> locations) { this.locations = locations; }
    public String getApplyLink() { return applyLink; }
    public void setApplyLink(String applyLink) { this.applyLink = applyLink; }
    public String getAnnouncementLink() { return announcementLink; }
    public void setAnnouncementLink(String announcementLink) { this.announcementLink = announcementLink; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}

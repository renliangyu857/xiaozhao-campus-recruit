package com.campusrecruit.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "job", indexes = {
    @Index(name = "idx_industry", columnList = "industry"),
    @Index(name = "idx_recruit_type", columnList = "recruit_type"),
    @Index(name = "idx_end_date", columnList = "end_date"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String company;

    @Column(nullable = false, length = 32)
    private String industry;

    @Column(name = "recruit_type", nullable = false, length = 32)
    private String recruitType;

    @Column(length = 512)
    private String locations; // JSON array string e.g. ["北京","上海"]

    @Column(name = "start_date", length = 32)
    private String startDate;

    @Column(name = "end_date", length = 32)
    private String endDate;

    @Column(name = "no_written_test", nullable = false, length = 16)
    private String noWrittenTest = "false";

    @Column(length = 512)
    private String roles; // JSON array string

    @Column(name = "announcement_link", length = 512)
    private String announcementLink;

    @Column(name = "apply_link", length = 512)
    private String applyLink;

    @Column(length = 1024)
    private String remark;

    @Column(length = 8)
    private String batch; // 25, 26

    @Column(length = 64)
    private String salary;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
    public String getRecruitType() { return recruitType; }
    public void setRecruitType(String recruitType) { this.recruitType = recruitType; }
    public String getLocations() { return locations; }
    public void setLocations(String locations) { this.locations = locations; }
    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }
    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }
    public String getNoWrittenTest() { return noWrittenTest; }
    public void setNoWrittenTest(String noWrittenTest) { this.noWrittenTest = noWrittenTest != null ? noWrittenTest : "false"; }
    public String getRoles() { return roles; }
    public void setRoles(String roles) { this.roles = roles; }
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

package com.campusrecruit.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_user", indexes = @Index(name = "uk_open_id", columnList = "open_id", unique = true))
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "open_id", nullable = false, unique = true, length = 64)
    private String openId;

    @Column(name = "union_id", length = 64)
    private String unionId;

    @Column(length = 64)
    private String nickname;

    @Column(length = 512)
    private String avatar;

    @Column(name = "query_count", nullable = false)
    private Integer queryCount = 0;

    @Column(name = "query_count_reset_at")
    private LocalDate queryCountResetAt;

    @Column(name = "bonus_queries", nullable = false, columnDefinition = "int not null default 0")
    private Integer bonusQueries = 0;

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

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOpenId() { return openId; }
    public void setOpenId(String openId) { this.openId = openId; }
    public String getUnionId() { return unionId; }
    public void setUnionId(String unionId) { this.unionId = unionId; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public Integer getQueryCount() { return queryCount; }
    public void setQueryCount(Integer queryCount) { this.queryCount = queryCount; }
    public LocalDate getQueryCountResetAt() { return queryCountResetAt; }
    public void setQueryCountResetAt(LocalDate queryCountResetAt) { this.queryCountResetAt = queryCountResetAt; }
    public Integer getBonusQueries() { return bonusQueries; }
    public void setBonusQueries(Integer bonusQueries) { this.bonusQueries = bonusQueries != null ? bonusQueries : 0; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

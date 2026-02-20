package com.campusrecruit.service;

import com.campusrecruit.dto.ProgressItemDto;
import com.campusrecruit.dto.ProgressStatsDto;
import com.campusrecruit.entity.Job;
import com.campusrecruit.entity.UserJobStatus;
import com.campusrecruit.repository.JobRepository;
import com.campusrecruit.repository.UserJobStatusRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.Arrays;
import java.util.stream.Collectors;

@Service
public class ProgressService {

    private static final List<String> STATUS_ORDER = List.of("未投递", "已投递", "已笔试", "已面试", "已通过", "已挂");
    private static final List<String> INDUSTRIES = List.of("互联网", "金融", "国央企", "外企", "制造业", "其他");

    private final UserJobStatusRepository userJobStatusRepository;
    private final JobRepository jobRepository;

    public ProgressService(UserJobStatusRepository userJobStatusRepository, JobRepository jobRepository) {
        this.userJobStatusRepository = userJobStatusRepository;
        this.jobRepository = jobRepository;
    }

    /**
     * 获取当前用户的投递进度统计。未登录返回空结构（全 0）。
     */
    public ProgressStatsDto getStats(Long userId) {
        ProgressStatsDto dto = new ProgressStatsDto();
        Map<String, Integer> byStatus = new LinkedHashMap<>();
        for (String s : STATUS_ORDER) {
            byStatus.put(s, 0);
        }
        dto.setByStatus(byStatus);
        dto.setTotalApplied(0);
        dto.setByIndustry(INDUSTRIES.stream()
                .map(industry -> {
                    ProgressStatsDto.IndustryCount ic = new ProgressStatsDto.IndustryCount();
                    ic.setIndustry(industry);
                    ic.setCount(0);
                    return ic;
                })
                .toList());

        if (userId == null) return dto;

        List<UserJobStatus> statuses = userJobStatusRepository.findByUserId(userId);
        if (statuses.isEmpty()) return dto;

        List<Long> jobIds = statuses.stream().map(UserJobStatus::getJobId).distinct().toList();
        Map<Long, Job> jobMap = jobRepository.findAllById(jobIds).stream().collect(Collectors.toMap(Job::getId, j -> j));

        int totalApplied = 0;
        Map<String, Integer> industryCount = new HashMap<>();
        for (String ind : INDUSTRIES) {
            industryCount.put(ind, 0);
        }

        for (UserJobStatus ujs : statuses) {
            String status = ujs.getStatus();
            if (status != null) {
                byStatus.merge(status, 1, Integer::sum);
                if (!"未投递".equals(status)) {
                    totalApplied++;
                    Job job = jobMap.get(ujs.getJobId());
                    if (job != null && job.getIndustry() != null) {
                        industryCount.merge(job.getIndustry(), 1, Integer::sum);
                    }
                }
            }
        }

        dto.setTotalApplied(totalApplied);
        dto.setByIndustry(INDUSTRIES.stream()
                .map(ind -> {
                    ProgressStatsDto.IndustryCount ic = new ProgressStatsDto.IndustryCount();
                    ic.setIndustry(ind);
                    ic.setCount(industryCount.getOrDefault(ind, 0));
                    return ic;
                })
                .toList());
        return dto;
    }

    /**
     * 获取当前用户的投递进度列表（排除"未投递"状态）
     */
    public List<ProgressItemDto> getProgressList(Long userId) {
        if (userId == null) return List.of();

        List<UserJobStatus> statuses = userJobStatusRepository.findByUserId(userId);
        if (statuses.isEmpty()) return List.of();

        // 过滤掉"未投递"状态
        List<UserJobStatus> filtered = statuses.stream()
                .filter(ujs -> ujs.getStatus() != null && !"未投递".equals(ujs.getStatus()))
                .sorted((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt())) // 按更新时间倒序
                .toList();

        if (filtered.isEmpty()) return List.of();

        List<Long> jobIds = filtered.stream().map(UserJobStatus::getJobId).distinct().toList();
        Map<Long, Job> jobMap = jobRepository.findAllById(jobIds).stream()
                .collect(Collectors.toMap(Job::getId, j -> j));

        return filtered.stream().map(ujs -> {
            Job job = jobMap.get(ujs.getJobId());
            if (job == null) return null;

            ProgressItemDto dto = new ProgressItemDto();
            dto.setJobId(job.getId() != null ? job.getId().toString() : null);
            dto.setCompany(job.getCompany());
            dto.setStatus(ujs.getStatus());
            dto.setUpdatedAt(ujs.getUpdatedAt());
            dto.setNote(ujs.getNote());

            // 解析 locations JSON
            if (job.getLocations() != null && !job.getLocations().isBlank()) {
                String locs = job.getLocations().trim();
                if (locs.startsWith("[")) locs = locs.substring(1);
                if (locs.endsWith("]")) locs = locs.substring(0, locs.length() - 1);
                if (!locs.isBlank()) {
                    dto.setLocations(Arrays.stream(locs.split(","))
                            .map(String::trim)
                            .map(x -> x.replaceAll("^\"|\"$", ""))
                            .filter(x -> !x.isEmpty())
                            .toList());
                }
            }

            dto.setApplyLink(job.getApplyLink());
            dto.setAnnouncementLink(job.getAnnouncementLink());
            return dto;
        }).filter(Objects::nonNull).toList();
    }

    /**
     * 更新用户对某职位的备注
     */
    public boolean updateNote(Long userId, Long jobId, String note) {
        if (userId == null || jobId == null) return false;

        UserJobStatus ujs = userJobStatusRepository.findByUserIdAndJobId(userId, jobId)
                .orElse(null);
        if (ujs == null) return false;

        ujs.setNote(note != null && note.length() > 1024 ? note.substring(0, 1024) : note);
        userJobStatusRepository.save(ujs);
        return true;
    }
}

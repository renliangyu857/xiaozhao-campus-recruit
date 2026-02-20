package com.campusrecruit.service;

import com.campusrecruit.dto.JobDto;
import com.campusrecruit.entity.Job;
import com.campusrecruit.entity.UserJobStatus;
import com.campusrecruit.repository.JobRepository;
import com.campusrecruit.repository.UserJobStatusRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class JobService {

    private static final Set<String> VALID_STATUSES = Set.of(
            "未投递", "已投递", "已笔试", "已面试", "已通过", "已挂"
    );

    private final JobRepository jobRepository;
    private final UserJobStatusRepository userJobStatusRepository;

    public JobService(JobRepository jobRepository, UserJobStatusRepository userJobStatusRepository) {
        this.jobRepository = jobRepository;
        this.userJobStatusRepository = userJobStatusRepository;
    }

    public Page<JobDto> listJobs(
            String industry,
            String type,
            String location,
            String deadlineDays,
            String roles,
            Boolean onlyNewToday,
            Integer page,
            Integer size,
            Long userId
    ) {
        int p = page != null && page > 0 ? page : 0;
        int s = size != null && size > 0 && size <= 500 ? size : 20;
        Pageable pageable = PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<Job> spec = JobQuerySpec.withFilters(industry, type, location, deadlineDays, roles, onlyNewToday);
        Page<Job> jobPage = jobRepository.findAll(spec, pageable);

        Map<Long, String> statusMap = new HashMap<>();
        if (userId != null && !jobPage.getContent().isEmpty()) {
            List<Long> jobIds = jobPage.getContent().stream().map(Job::getId).toList();
            List<UserJobStatus> statuses = userJobStatusRepository.findByUserIdAndJobIdIn(userId, jobIds);
            statusMap = statuses.stream().collect(Collectors.toMap(UserJobStatus::getJobId, UserJobStatus::getStatus));
        }

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        Map<Long, String> finalStatusMap = statusMap;
        return jobPage.map(job -> {
            String status = finalStatusMap.getOrDefault(job.getId(), "未投递");
            boolean isNewToday = job.getCreatedAt() != null && !job.getCreatedAt().isBefore(startOfToday);
            return JobDto.fromEntity(job, status, isNewToday);
        });
    }

    /**
     * 更新当前用户对某职位的投递进度。若 job 不存在返回 false；status 非法返回 false。
     */
    public boolean updateStatus(Long userId, Long jobId, String status) {
        if (userId == null || status == null || !VALID_STATUSES.contains(status.trim())) {
            return false;
        }
        if (!jobRepository.existsById(jobId)) {
            return false;
        }
        UserJobStatus ujs = userJobStatusRepository.findByUserIdAndJobId(userId, jobId)
                .orElseGet(() -> {
                    UserJobStatus newOne = new UserJobStatus();
                    newOne.setUserId(userId);
                    newOne.setJobId(jobId);
                    return newOne;
                });
        ujs.setStatus(status.trim());
        userJobStatusRepository.save(ujs);
        return true;
    }
}

package com.campusrecruit.repository;

import com.campusrecruit.entity.UserJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserJobStatusRepository extends JpaRepository<UserJobStatus, Long> {
    Optional<UserJobStatus> findByUserIdAndJobId(Long userId, Long jobId);
    List<UserJobStatus> findByUserId(Long userId);
    List<UserJobStatus> findByUserIdAndJobIdIn(Long userId, List<Long> jobIds);
}

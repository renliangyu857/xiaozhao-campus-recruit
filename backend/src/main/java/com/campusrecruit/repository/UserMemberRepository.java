package com.campusrecruit.repository;

import com.campusrecruit.entity.UserMember;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface UserMemberRepository extends JpaRepository<UserMember, Long> {

    @Query("SELECT m FROM UserMember m WHERE m.userId = :userId AND m.startAt <= :now AND m.endAt >= :now ORDER BY m.endAt DESC")
    List<UserMember> findActiveByUserId(Long userId, LocalDateTime now, Pageable pageable);
}

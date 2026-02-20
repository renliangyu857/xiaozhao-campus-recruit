package com.campusrecruit.repository;

import com.campusrecruit.entity.UserInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserInvitationRepository extends JpaRepository<UserInvitation, Long> {

    Optional<UserInvitation> findByInviteCodeAndInviteeIdIsNull(String inviteCode);

    long countByInviterIdAndInviteeIdIsNotNull(Long inviterId);

    /** Latest pending invitation by inviter (for displaying "my invite code"). */
    Optional<UserInvitation> findTopByInviterIdAndInviteeIdIsNullOrderByCreatedAtDesc(Long inviterId);

    boolean existsByInviteCode(String inviteCode);
}

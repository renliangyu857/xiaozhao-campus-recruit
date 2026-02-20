package com.campusrecruit.service;

import com.campusrecruit.dto.VipDashboardDto;
import com.campusrecruit.entity.UserMember;
import com.campusrecruit.repository.ReferralCodeRepository;
import com.campusrecruit.repository.UserMemberRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class VipDashboardService {

    private final UserMemberRepository userMemberRepository;
    private final ReferralCodeRepository referralCodeRepository;

    public VipDashboardService(UserMemberRepository userMemberRepository,
                               ReferralCodeRepository referralCodeRepository) {
        this.userMemberRepository = userMemberRepository;
        this.referralCodeRepository = referralCodeRepository;
    }

    public Optional<VipDashboardDto> getDashboard(Long userId) {
        if (userId == null) return Optional.empty();
        VipDashboardDto dto = new VipDashboardDto();
        List<UserMember> active = userMemberRepository.findActiveByUserId(
                userId, LocalDateTime.now(), PageRequest.of(0, 1));
        if (active.isEmpty()) {
            dto.setIsVip(false);
            dto.setPlanId(null);
            dto.setIsTrial(false);
            dto.setVipExpiry(null);
        } else {
            UserMember m = active.get(0);
            dto.setIsVip(true);
            dto.setPlanId(m.getPlanId());
            dto.setIsTrial(AuthService.PLAN_TRIAL.equals(m.getPlanId()));
            dto.setVipExpiry(m.getEndAt().toLocalDate().toString());
        }
        dto.setReferralCodeCount((int) referralCodeRepository.countByIsValidTrue());
        dto.setSavedQueryCount(0);
        return Optional.of(dto);
    }
}

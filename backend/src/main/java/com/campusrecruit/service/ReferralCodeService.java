package com.campusrecruit.service;

import com.campusrecruit.dto.ReferralCodeDto;
import com.campusrecruit.entity.ReferralCode;
import com.campusrecruit.repository.ReferralCodeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class ReferralCodeService {

    private final ReferralCodeRepository referralCodeRepository;

    public ReferralCodeService(ReferralCodeRepository referralCodeRepository) {
        this.referralCodeRepository = referralCodeRepository;
    }

    public Page<ReferralCodeDto> list(Pageable pageable, String companyName) {
        Page<ReferralCode> page = companyName == null || companyName.isBlank()
                ? referralCodeRepository.findAllByIsValidTrue(pageable)
                : referralCodeRepository.findByIsValidTrueAndCompanyNameContainingIgnoreCase(companyName.trim(), pageable);
        return page.map(this::toDto);
    }

    @Transactional
    public Optional<ReferralCodeDto> recordUse(Long id) {
        return referralCodeRepository.findById(id)
                .filter(ReferralCode::getIsValid)
                .map(rc -> {
                    rc.setUsageCount((rc.getUsageCount() == null ? 0 : rc.getUsageCount()) + 1);
                    return referralCodeRepository.save(rc);
                })
                .map(this::toDto);
    }

    private ReferralCodeDto toDto(ReferralCode r) {
        ReferralCodeDto dto = new ReferralCodeDto();
        dto.setId(r.getId());
        dto.setCompanyName(r.getCompanyName());
        dto.setCode(r.getCode());
        dto.setUsageCount(r.getUsageCount() != null ? r.getUsageCount() : 0);
        dto.setIsValid(r.getIsValid());
        dto.setCreatedAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        return dto;
    }
}

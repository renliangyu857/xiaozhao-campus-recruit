package com.campusrecruit.repository;

import com.campusrecruit.entity.ReferralCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralCodeRepository extends JpaRepository<ReferralCode, Long> {

    Page<ReferralCode> findAllByIsValidTrue(Pageable pageable);

    Page<ReferralCode> findByIsValidTrueAndCompanyNameContainingIgnoreCase(String companyName, Pageable pageable);

    long countByIsValidTrue();
}

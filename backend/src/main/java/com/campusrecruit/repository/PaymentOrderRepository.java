package com.campusrecruit.repository;

import com.campusrecruit.entity.PaymentOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {
    Optional<PaymentOrder> findByOrderNo(String orderNo);
    List<PaymentOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
}

package com.campusrecruit.service;

import com.campusrecruit.dto.QueryConsumeResult;
import com.campusrecruit.entity.User;
import com.campusrecruit.entity.UserMember;
import com.campusrecruit.repository.UserMemberRepository;
import com.campusrecruit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class QueryService {

    private final UserRepository userRepository;
    private final UserMemberRepository userMemberRepository;
    private final int maxFreeQueries;

    public QueryService(
            UserRepository userRepository,
            UserMemberRepository userMemberRepository,
            @Value("${app.max-free-queries:3}") int maxFreeQueries
    ) {
        this.userRepository = userRepository;
        this.userMemberRepository = userMemberRepository;
        this.maxFreeQueries = maxFreeQueries;
    }

    /**
     * 扣减一次查询。VIP 不扣减；非 VIP 按日重置后若未超限则 query_count+1。
     * 返回结果表示是否允许本次查询及剩余次数。
     */
    @Transactional
    public Optional<QueryConsumeResult> consume(Long userId) {
        if (userId == null) return Optional.empty();
        return userRepository.findById(userId).map(this::consumeForUser);
    }

    private QueryConsumeResult consumeForUser(User user) {
        List<UserMember> active = userMemberRepository.findActiveByUserId(
                user.getId(), LocalDateTime.now(), PageRequest.of(0, 1));
        if (!active.isEmpty()) {
            return QueryConsumeResult.allowedVip();
        }

        LocalDate today = LocalDate.now();
        if (user.getQueryCountResetAt() == null || user.getQueryCountResetAt().isBefore(today)) {
            user.setQueryCount(0);
            user.setQueryCountResetAt(today);
        }

        int used = user.getQueryCount() != null ? user.getQueryCount() : 0;
        if (used >= maxFreeQueries) {
            return QueryConsumeResult.denied();
        }

        user.setQueryCount(used + 1);
        userRepository.save(user);
        return QueryConsumeResult.allowed(maxFreeQueries - used - 1);
    }
}

package com.campusrecruit.service;

import com.campusrecruit.dto.UserDto;
import com.campusrecruit.entity.User;
import com.campusrecruit.entity.UserMember;
import com.campusrecruit.client.WeChatAuthClient;
import com.campusrecruit.repository.UserMemberRepository;
import com.campusrecruit.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    /** 体验会员 plan_id */
    public static final String PLAN_TRIAL = "trial";

    private final WeChatAuthClient weChatAuthClient;
    private final UserRepository userRepository;
    private final UserMemberRepository userMemberRepository;
    private final int maxFreeQueries;
    private final int trialVipDays;

    public AuthService(
            WeChatAuthClient weChatAuthClient,
            UserRepository userRepository,
            UserMemberRepository userMemberRepository,
            @Value("${app.max-free-queries:3}") int maxFreeQueries,
            @Value("${app.trial-vip-days:0}") int trialVipDays
    ) {
        this.weChatAuthClient = weChatAuthClient;
        this.userRepository = userRepository;
        this.userMemberRepository = userMemberRepository;
        this.maxFreeQueries = maxFreeQueries;
        this.trialVipDays = trialVipDays;
    }

    /** Session 中存放当前用户 ID 的 key */
    public static final String SESSION_USER_ID = "userId";

    /**
     * 用微信 code 登录，找到或创建用户并返回。失败返回 empty。
     */
    public Optional<User> loginWithCode(String code) {
        String openId = weChatAuthClient.getOpenIdByCode(code);
        if (openId == null || openId.isBlank()) return Optional.empty();
        return Optional.of(
                userRepository.findByOpenId(openId).orElseGet(() -> createUser(openId))
        );
    }

    public Optional<UserDto> getCurrentUserDto(Long userId) {
        if (userId == null) return Optional.empty();
        return userRepository.findById(userId).map(this::toDto);
    }

    public boolean isVip(Long userId) {
        if (userId == null) return false;
        return !userMemberRepository.findActiveByUserId(userId, LocalDateTime.now(), PageRequest.of(0, 1)).isEmpty();
    }

    private User createUser(String openId) {
        User user = new User();
        user.setOpenId(openId);
        user.setNickname("微信用户");
        user.setAvatar("");
        user.setQueryCount(0);
        user.setQueryCountResetAt(LocalDate.now());
        user = userRepository.save(user);
        if (trialVipDays > 0) {
            grantTrialVip(user.getId());
        }
        return user;
    }

    private void grantTrialVip(Long userId) {
        grantVipDays(userId, trialVipDays, PLAN_TRIAL);
    }

    /** 为用户增加 N 天 VIP（邀请奖励等），planId 如 "promo" 或 PLAN_TRIAL */
    public void grantVipDays(Long userId, int days, String planId) {
        if (userId == null || days <= 0) return;
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusDays(days);
        UserMember m = new UserMember();
        m.setUserId(userId);
        m.setPlanId(planId != null ? planId : "promo");
        m.setStartAt(start);
        m.setEndAt(end);
        userMemberRepository.save(m);
    }

    private UserDto toDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId() != null ? user.getId().toString() : null);
        dto.setNickname(user.getNickname() != null ? user.getNickname() : "微信用户");
        dto.setAvatar(user.getAvatar() != null ? user.getAvatar() : "");
        dto.setQueryCount(user.getQueryCount() != null ? user.getQueryCount() : 0);

        List<UserMember> active = userMemberRepository.findActiveByUserId(
                user.getId(), LocalDateTime.now(), PageRequest.of(0, 1));
        if (!active.isEmpty()) {
            UserMember m = active.get(0);
            dto.setIsVip(true);
            dto.setIsTrial(PLAN_TRIAL.equals(m.getPlanId()));
            dto.setVipExpiry(m.getEndAt().toLocalDate().toString());
            dto.setRemainingFreeQueries(null);
        } else {
            dto.setIsTrial(false);
            dto.setIsVip(false);
            dto.setVipExpiry(null);
            int used = effectiveUsedCount(user);
            int bonus = user.getBonusQueries() != null ? user.getBonusQueries() : 0;
            int remaining = Math.max(0, maxFreeQueries - used) + bonus;
            dto.setRemainingFreeQueries(remaining);
        }
        return dto;
    }

    private int effectiveUsedCount(User user) {
        LocalDate today = LocalDate.now();
        if (user.getQueryCountResetAt() == null || user.getQueryCountResetAt().isBefore(today)) {
            return 0;
        }
        return user.getQueryCount() != null ? user.getQueryCount() : 0;
    }
}

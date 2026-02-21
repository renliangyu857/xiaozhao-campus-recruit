package com.campusrecruit.service;

import com.campusrecruit.entity.User;
import com.campusrecruit.entity.UserInvitation;
import com.campusrecruit.repository.UserInvitationRepository;
import com.campusrecruit.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Service
public class InviteService {

    /** 前 5 人：每邀请 1 人邀请人获得的 VIP 天数 */
    private static final int VIP_DAYS_FIRST_5 = 2;
    /** 第 6 人起：每邀请 1 人邀请人获得的 VIP 天数 */
    private static final int VIP_DAYS_AFTER_5 = 4;
    /** 邀请人通过邀请获得的 VIP 天数上限（1 个月） */
    private static final int INVITER_VIP_CAP_DAYS = 30;
    /** 被邀请人：获得的 VIP 天数 */
    private static final int INVITEE_VIP_DAYS = 2;

    private final UserInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public InviteService(UserInvitationRepository invitationRepository,
                         UserRepository userRepository,
                         AuthService authService) {
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int INVITE_CODE_LENGTH = 6;
    private static final int MAX_GENERATE_ATTEMPTS = 20;
    private final Random random = new Random();

    public Optional<Map<String, String>> generate(Long inviterId) {
        if (inviterId == null) return Optional.empty();
        String code = generateUniqueInviteCode();
        if (code == null) return Optional.empty();
        UserInvitation inv = new UserInvitation();
        inv.setInviterId(inviterId);
        inv.setInviteCode(code);
        inv.setRewardStatus("pending");
        inv = invitationRepository.save(inv);
        return Optional.of(Map.of("inviteCode", inv.getInviteCode(), "link", "?inviteCode=" + inv.getInviteCode()));
    }

    /** 6位大写字母+数字唯一邀请码 */
    private String generateUniqueInviteCode() {
        for (int i = 0; i < MAX_GENERATE_ATTEMPTS; i++) {
            StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
            for (int j = 0; j < INVITE_CODE_LENGTH; j++) {
                sb.append(INVITE_CODE_CHARS.charAt(random.nextInt(INVITE_CODE_CHARS.length())));
            }
            String code = sb.toString();
            if (!invitationRepository.existsByInviteCode(code)) return code;
        }
        return null;
    }

    @Transactional
    public Optional<String> bind(Long inviteeUserId, String inviteCode) {
        if (inviteeUserId == null || inviteCode == null || inviteCode.isBlank()) return Optional.empty();
        UserInvitation inv = invitationRepository.findByInviteCodeAndInviteeIdIsNull(inviteCode.trim()).orElse(null);
        if (inv == null) return Optional.empty();
        inv.setInviteeId(inviteeUserId);
        inv.setRewardStatus("completed");
        invitationRepository.save(inv);

        long totalInvited = invitationRepository.countByInviterIdAndInviteeIdIsNotNull(inv.getInviterId());
        // 邀请人：前 5 人每人 2 天，第 6 人起每人 4 天，最高 30 天
        int inviterDays = totalInvited <= 5 ? VIP_DAYS_FIRST_5 : (totalInvited <= 10 ? VIP_DAYS_AFTER_5 : 0);
        if (inviterDays > 0) {
            authService.grantVipDays(inv.getInviterId(), inviterDays, "promo");
        }
        // 被邀请人：得 2 天 VIP
        authService.grantVipDays(inviteeUserId, INVITEE_VIP_DAYS, "invitee_trial");
        return Optional.of("ok");
    }

    public Map<String, Object> stats(Long userId) {
        if (userId == null) return Map.of("totalInvited", 0, "rewards", List.of(), "inviteCode", "");
        long total = invitationRepository.countByInviterIdAndInviteeIdIsNotNull(userId);
        List<String> rewards = new ArrayList<>();
        rewards.add("前 5 人每人得 " + VIP_DAYS_FIRST_5 + " 天 VIP，第 6 人起每人 " + VIP_DAYS_AFTER_5 + " 天，最高 1 个月 VIP");
        if (total >= 10) rewards.add("已邀请 10 人，已达最高 1 个月 VIP");
        else if (total >= 5) rewards.add("已邀请 " + total + " 人，再邀 " + (10 - total) + " 人可拿满 1 个月");
        else rewards.add("已邀请 " + total + " 人，前 5 人每人 2 天，之后每人 4 天");
        String inviteCode = getOrCreateInviteCode(userId);
        return Map.of("totalInvited", total, "rewards", rewards, "inviteCode", inviteCode);
    }

    /** Returns the user's current invite code (reused if they have a pending one, else creates). */
    private String getOrCreateInviteCode(Long inviterId) {
        Optional<UserInvitation> pending = invitationRepository.findTopByInviterIdAndInviteeIdIsNullOrderByCreatedAtDesc(inviterId);
        if (pending.isPresent()) return pending.get().getInviteCode();
        return generate(inviterId).map(m -> (String) m.get("inviteCode")).orElse("");
    }
}

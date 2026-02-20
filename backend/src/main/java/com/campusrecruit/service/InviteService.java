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

    private static final int REWARD_QUERIES = 3;
    private static final int TIER2_COUNT = 3;
    private static final int TIER2_VIP_DAYS = 5;
    private static final int TIER3_COUNT = 10;
    private static final int TIER3_VIP_DAYS = 30;

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

        User inviter = userRepository.findById(inv.getInviterId()).orElse(null);
        User invitee = userRepository.findById(inviteeUserId).orElse(null);
        if (inviter != null) {
            inviter.setBonusQueries((inviter.getBonusQueries() != null ? inviter.getBonusQueries() : 0) + REWARD_QUERIES);
            userRepository.save(inviter);
        }
        if (invitee != null) {
            invitee.setBonusQueries((invitee.getBonusQueries() != null ? invitee.getBonusQueries() : 0) + REWARD_QUERIES);
            userRepository.save(invitee);
        }

        long totalInvited = invitationRepository.countByInviterIdAndInviteeIdIsNotNull(inv.getInviterId());
        if (totalInvited >= TIER3_COUNT) {
            authService.grantVipDays(inv.getInviterId(), TIER3_VIP_DAYS, "promo");
        } else if (totalInvited >= TIER2_COUNT) {
            authService.grantVipDays(inv.getInviterId(), TIER2_VIP_DAYS, "promo");
        }
        return Optional.of("ok");
    }

    public Map<String, Object> stats(Long userId) {
        if (userId == null) return Map.of("totalInvited", 0, "rewards", List.of(), "inviteCode", "");
        long total = invitationRepository.countByInviterIdAndInviteeIdIsNotNull(userId);
        List<String> rewards = new ArrayList<>();
        rewards.add("每邀请 1 人，双方各得 " + REWARD_QUERIES + " 次免费查询");
        if (total >= TIER2_COUNT) rewards.add("已邀请 " + TIER2_COUNT + " 人，已获得 " + TIER2_VIP_DAYS + " 天 VIP");
        else rewards.add("邀请 " + TIER2_COUNT + " 人可获 " + TIER2_VIP_DAYS + " 天 VIP");
        if (total >= TIER3_COUNT) rewards.add("已邀请 " + TIER3_COUNT + " 人，已获得 " + TIER3_VIP_DAYS + " 天 VIP");
        else rewards.add("邀请 " + TIER3_COUNT + " 人可获 " + TIER3_VIP_DAYS + " 天 VIP");
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

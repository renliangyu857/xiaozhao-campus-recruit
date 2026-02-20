package com.campusrecruit.controller;

import com.campusrecruit.dto.ReferralCodeDto;
import com.campusrecruit.service.AuthService;
import com.campusrecruit.service.ReferralCodeService;
import jakarta.servlet.http.HttpSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/referral-codes")
public class ReferralCodeController {

    private final AuthService authService;
    private final ReferralCodeService referralCodeService;

    public ReferralCodeController(AuthService authService, ReferralCodeService referralCodeService) {
        this.authService = authService;
        this.referralCodeService = referralCodeService;
    }

    @GetMapping
    public ResponseEntity<Object> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String companyName,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        if (!authService.isVip(userId)) return ResponseEntity.status(403).body(Map.of("message", "仅会员可查看内推码库"));
        Page<ReferralCodeDto> result = referralCodeService.list(PageRequest.of(page, size), companyName);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/use")
    public ResponseEntity<Object> use(@PathVariable Long id, HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        if (!authService.isVip(userId)) return ResponseEntity.status(403).body(Map.of("message", "仅会员可使用内推码"));
        return referralCodeService.recordUse(id)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

package com.campusrecruit.controller;

import com.campusrecruit.service.AuthService;
import com.campusrecruit.service.InviteService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/invite")
public class InviteController {

    private final InviteService inviteService;

    public InviteController(InviteService inviteService) {
        this.inviteService = inviteService;
    }

    @PostMapping("/generate")
    public ResponseEntity<Object> generate(HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        return inviteService.generate(userId)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().<Object>body(Map.of("message", "生成失败")));
    }

    @GetMapping("/stats")
    public ResponseEntity<Object> stats(HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        return ResponseEntity.ok(inviteService.stats(userId));
    }

    @PostMapping("/bind")
    public ResponseEntity<Object> bind(@RequestBody Map<String, String> body, HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        String inviteCode = body != null ? body.get("inviteCode") : null;
        return inviteService.bind(userId, inviteCode)
                .<ResponseEntity<Object>>map(x -> ResponseEntity.ok(Map.of("message", "绑定成功")))
                .orElseGet(() -> ResponseEntity.badRequest().<Object>body(Map.of("message", "邀请码无效或已使用")));
    }
}

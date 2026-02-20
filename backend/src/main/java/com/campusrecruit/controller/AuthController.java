package com.campusrecruit.controller;

import com.campusrecruit.dto.UserDto;
import com.campusrecruit.entity.User;
import com.campusrecruit.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/wechat/login")
    public ResponseEntity<Object> wechatLogin(
            @RequestParam(required = false) String code,
            HttpSession session
    ) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少 code"));
        }
        return authService.loginWithCode(code)
                .map(user -> {
                    session.setAttribute(AuthService.SESSION_USER_ID, user.getId());
                    UserDto dto = authService.getCurrentUserDto(user.getId()).orElseThrow();
                    return ResponseEntity.<Object>ok(dto);
                })
                .orElse(ResponseEntity.status(401).<Object>body(Map.of("message", "微信登录失败")));
    }

    @GetMapping("/current")
    public ResponseEntity<Object> current(HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        return authService.getCurrentUserDto(userId)
                .map(dto -> ResponseEntity.<Object>ok(dto))
                .orElse(ResponseEntity.status(401).<Object>body(Map.of("message", "未登录")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "已登出"));
    }
}

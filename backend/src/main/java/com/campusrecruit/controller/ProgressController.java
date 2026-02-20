package com.campusrecruit.controller;

import com.campusrecruit.dto.ProgressItemDto;
import com.campusrecruit.dto.ProgressStatsDto;
import com.campusrecruit.service.AuthService;
import com.campusrecruit.service.ProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/progress")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    @GetMapping("/stats")
    public ResponseEntity<ProgressStatsDto> stats(HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        return ResponseEntity.ok(progressService.getStats(userId));
    }

    @GetMapping("/list")
    public ResponseEntity<List<ProgressItemDto>> list(HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(progressService.getProgressList(userId));
    }

    @PutMapping("/{jobId}/note")
    public ResponseEntity<?> updateNote(
            @PathVariable Long jobId,
            @RequestBody Map<String, String> body,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        }
        String note = body.get("note");
        boolean updated = progressService.updateNote(userId, jobId, note);
        if (!updated) {
            return ResponseEntity.badRequest().body(Map.of("message", "更新失败"));
        }
        return ResponseEntity.ok(Map.of("message", "已更新"));
    }
}

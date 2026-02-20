package com.campusrecruit.controller;

import com.campusrecruit.dto.JobDto;
import com.campusrecruit.dto.UpdateJobStatusRequest;
import com.campusrecruit.service.AuthService;
import com.campusrecruit.service.JobService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@RestController
@RequestMapping("/jobs")
public class JobController {

    private final JobService jobService;
    private final AuthService authService;

    public JobController(JobService jobService, AuthService authService) {
        this.jobService = jobService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String deadlineDays,
            @RequestParam(required = false) String roles,
            @RequestParam(required = false, defaultValue = "false") Boolean onlyNewToday,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录后操作"));
        }
        Page<JobDto> result = jobService.listJobs(industry, type, location, deadlineDays, roles, onlyNewToday, page, size, userId);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{jobId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long jobId,
            @Valid @RequestBody UpdateJobStatusRequest body,
            HttpSession session
    ) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        }
        boolean updated = jobService.updateStatus(userId, jobId, body.getStatus());
        if (!updated) {
            return ResponseEntity.badRequest().body(Map.of("message", "职位不存在或状态值无效"));
        }
        return ResponseEntity.ok(Map.of("message", "已更新"));
    }
}

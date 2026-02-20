package com.campusrecruit.controller;

import com.campusrecruit.dto.QueryConsumeResult;
import com.campusrecruit.service.AuthService;
import com.campusrecruit.service.QueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@RestController
@RequestMapping("/query")
public class QueryController {

    private final QueryService queryService;

    public QueryController(QueryService queryService) {
        this.queryService = queryService;
    }

    @PostMapping("/consume")
    public ResponseEntity<?> consume(HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        }
        return queryService.consume(userId)
                .map(result -> {
                    if (!result.isAllowed()) {
                        return ResponseEntity.status(403).body(Map.of(
                                "message", "今日免费次数已用完，请开通会员",
                                "remainingFreeQueries", 0
                        ));
                    }
                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.status(401).body(Map.of("message", "请先登录")));
    }
}

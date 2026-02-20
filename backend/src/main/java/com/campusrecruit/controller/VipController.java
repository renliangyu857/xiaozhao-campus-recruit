package com.campusrecruit.controller;

import com.campusrecruit.dto.CreateOrderRequest;
import com.campusrecruit.dto.CreateOrderResponse;
import com.campusrecruit.dto.VipPlanDto;
import com.campusrecruit.dto.VipDashboardDto;
import com.campusrecruit.service.AuthService;
import com.campusrecruit.service.VipPlanService;
import com.campusrecruit.service.VipOrderService;
import com.campusrecruit.service.VipDashboardService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/vip")
public class VipController {

    private final VipPlanService vipPlanService;
    private final VipOrderService vipOrderService;
    private final VipDashboardService vipDashboardService;

    public VipController(VipPlanService vipPlanService, VipOrderService vipOrderService,
                         VipDashboardService vipDashboardService) {
        this.vipPlanService = vipPlanService;
        this.vipOrderService = vipOrderService;
        this.vipDashboardService = vipDashboardService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Object> dashboard(HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        }
        return vipDashboardService.getDashboard(userId)
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).build());
    }

    @GetMapping("/plans")
    public ResponseEntity<List<VipPlanDto>> plans() {
        return ResponseEntity.ok(vipPlanService.listPlans());
    }

    @PostMapping("/create-order")
    public ResponseEntity<Object> createOrder(@Valid @RequestBody CreateOrderRequest request, HttpSession session) {
        Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "请先登录"));
        }
        return vipOrderService.createOrder(userId, request.getPlanId())
                .<ResponseEntity<Object>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.badRequest().<Object>body(Map.of("message", "套餐无效或用户不存在")));
    }
}

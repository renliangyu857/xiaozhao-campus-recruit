package com.campusrecruit.controller;

import com.campusrecruit.repository.UserRepository;
import com.campusrecruit.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Nested
    @DisplayName("GET /auth/wechat/login 微信登录")
    class WechatLogin {

        @Test
        @DisplayName("缺少 code 返回 400")
        void missingCode() throws Exception {
            mockMvc.perform(get("/auth/wechat/login"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("缺少 code"));
        }

        @Test
        @DisplayName("有效 code 时创建或找到用户并返回用户信息，Session 中有 userId")
        void loginSuccess() throws Exception {
            ResultActions result = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_abc123"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(notNullValue()))
                    .andExpect(jsonPath("$.nickname").value(notNullValue()))
                    .andExpect(jsonPath("$.isVip").value(false))
                    .andExpect(jsonPath("$.queryCount").value(0))
                    .andExpect(jsonPath("$.remainingFreeQueries").value(3));

            result.andExpect(request().sessionAttribute(AuthService.SESSION_USER_ID, notNullValue()));
        }

        @Test
        @DisplayName("同一 openid 再次登录返回同一用户")
        void loginSameUser() throws Exception {
            mockMvc.perform(get("/auth/wechat/login").param("code", "openid_same"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(notNullValue()));
            mockMvc.perform(get("/auth/wechat/login").param("code", "openid_same"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(notNullValue()));
            long count = userRepository.count();
            if (count != 1) throw new AssertionError("expected 1 user, got " + count);
        }
    }

    @Nested
    @DisplayName("GET /auth/current 当前用户")
    class CurrentUser {

        @Test
        @DisplayName("未登录返回 401")
        void notLoggedIn() throws Exception {
            mockMvc.perform(get("/auth/current"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("未登录"));
        }

        @Test
        @DisplayName("登录后携带 Session 请求返回用户信息")
        void loggedIn() throws Exception {
            var loginResult = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_curr"))
                    .andExpect(status().isOk())
                    .andReturn();
            var session = loginResult.getRequest().getSession();

            mockMvc.perform(get("/auth/current").session((MockHttpSession) session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(notNullValue()))
                    .andExpect(jsonPath("$.nickname").value(notNullValue()))
                    .andExpect(jsonPath("$.isVip").value(false))
                    .andExpect(jsonPath("$.remainingFreeQueries").value(3));
        }
    }

    @Nested
    @DisplayName("POST /auth/logout 登出")
    class Logout {

        @Test
        @DisplayName("登出返回 200，之后 current 为 401")
        void logoutInvalidatesSession() throws Exception {
            var session = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_logout"))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getRequest()
                    .getSession();
            if (session == null) throw new AssertionError("session should exist after login");

            mockMvc.perform(post("/auth/logout").session((MockHttpSession) session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("已登出"));

            mockMvc.perform(get("/auth/current").session((MockHttpSession) session))
                    .andExpect(status().isUnauthorized());
        }
    }
}

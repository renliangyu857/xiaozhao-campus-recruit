package com.campusrecruit.controller;

import com.campusrecruit.entity.User;
import com.campusrecruit.entity.UserMember;
import com.campusrecruit.repository.UserMemberRepository;
import com.campusrecruit.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QueryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserMemberRepository userMemberRepository;

    @BeforeEach
    void setUp() {
        userMemberRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Nested
    @DisplayName("POST /query/consume")
    class Consume {

        @Test
        @DisplayName("未登录返回 401")
        void unauthorized() throws Exception {
            mockMvc.perform(post("/query/consume"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("请先登录"));
        }

        @Test
        @DisplayName("登录后首次扣减返回 200，剩余 2 次")
        void firstConsume() throws Exception {
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_consume1"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();
            mockMvc.perform(post("/query/consume").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.allowed").value(true))
                    .andExpect(jsonPath("$.remainingFreeQueries").value(2));
        }

        @Test
        @DisplayName("扣减 3 次后再次扣减返回 403")
        void exceedLimit() throws Exception {
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_consume3"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();
            for (int i = 0; i < 3; i++) {
                mockMvc.perform(post("/query/consume").session(session))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.allowed").value(true));
            }
            mockMvc.perform(post("/query/consume").session(session))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value(containsString("免费次数已用完")))
                    .andExpect(jsonPath("$.remainingFreeQueries").value(0));
        }

        @Test
        @DisplayName("VIP 用户扣减不消耗次数，返回 allowed 且 remainingFreeQueries 为 null")
        void vipNoConsume() throws Exception {
            User user = new User();
            user.setOpenId("openid_vip_query");
            user.setNickname("VIP");
            user.setQueryCount(0);
            user.setQueryCountResetAt(LocalDate.now());
            user = userRepository.save(user);
            UserMember member = new UserMember();
            member.setUserId(user.getId());
            member.setPlanId("1_month");
            member.setStartAt(LocalDateTime.now().minusDays(1));
            member.setEndAt(LocalDateTime.now().plusMonths(1));
            userMemberRepository.save(member);

            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_vip_query"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();
            mockMvc.perform(post("/query/consume").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.allowed").value(true))
                    .andExpect(jsonPath("$.remainingFreeQueries").doesNotExist());
            mockMvc.perform(post("/query/consume").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.allowed").value(true));
            User after = userRepository.findById(user.getId()).orElseThrow();
            if (after.getQueryCount() != 0) throw new AssertionError("VIP should not increment query_count");
        }
    }
}

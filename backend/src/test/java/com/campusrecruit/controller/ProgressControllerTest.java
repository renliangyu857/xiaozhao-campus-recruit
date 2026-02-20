package com.campusrecruit.controller;

import com.campusrecruit.entity.Job;
import com.campusrecruit.entity.UserJobStatus;
import com.campusrecruit.repository.JobRepository;
import com.campusrecruit.repository.UserJobStatusRepository;
import com.campusrecruit.repository.UserRepository;
import com.campusrecruit.service.AuthService;
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
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProgressControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private UserJobStatusRepository userJobStatusRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userJobStatusRepository.deleteAll();
        jobRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Nested
    @DisplayName("GET /progress/stats 进度统计")
    class Stats {

        @Test
        @DisplayName("未登录时返回全 0 结构")
        void notLoggedIn() throws Exception {
            mockMvc.perform(get("/progress/stats"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.byStatus").isMap())
                    .andExpect(jsonPath("$.byStatus.未投递").value(0))
                    .andExpect(jsonPath("$.byStatus.已投递").value(0))
                    .andExpect(jsonPath("$.totalApplied").value(0))
                    .andExpect(jsonPath("$.byIndustry").isArray())
                    .andExpect(jsonPath("$.byIndustry.length()").value(greaterThanOrEqualTo(4)));
        }

        @Test
        @DisplayName("已登录无投递记录时返回全 0")
        void loggedInNoStatus() throws Exception {
            ResultActions login = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_progress"));
            MockHttpSession session = (MockHttpSession) login.andReturn().getRequest().getSession();

            mockMvc.perform(get("/progress/stats").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalApplied").value(0))
                    .andExpect(jsonPath("$.byStatus.已投递").value(0));
        }

        @Test
        @DisplayName("有投递记录时 byStatus、totalApplied、byIndustry 正确")
        void withData() throws Exception {
            ResultActions login = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_stats"));
            MockHttpSession session = (MockHttpSession) login.andReturn().getRequest().getSession();
            Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);
            if (userId == null) throw new AssertionError("userId in session");

            Job j1 = saveJob("公司A", "互联网");
            Job j2 = saveJob("公司B", "互联网");
            Job j3 = saveJob("公司C", "金融");

            saveStatus(userId, j1.getId(), "已投递");
            saveStatus(userId, j2.getId(), "已笔试");
            saveStatus(userId, j3.getId(), "已投递");

            mockMvc.perform(get("/progress/stats").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.byStatus.已投递").value(2))
                    .andExpect(jsonPath("$.byStatus.已笔试").value(1))
                    .andExpect(jsonPath("$.totalApplied").value(3))
                    .andExpect(jsonPath("$.byIndustry").isArray());

            // byIndustry: 互联网 2, 金融 1
            mockMvc.perform(get("/progress/stats").session(session))
                    .andExpect(jsonPath("$.byIndustry[?(@.industry=='互联网')].count").value(hasItem(2)))
                    .andExpect(jsonPath("$.byIndustry[?(@.industry=='金融')].count").value(hasItem(1)));
        }

        @Test
        @DisplayName("未投递不计入 totalApplied 与 byIndustry")
        void notAppliedExcluded() throws Exception {
            ResultActions login = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_excl"));
            MockHttpSession session = (MockHttpSession) login.andReturn().getRequest().getSession();
            Long userId = (Long) session.getAttribute(AuthService.SESSION_USER_ID);

            Job j = saveJob("公司X", "国央企");
            saveStatus(userId, j.getId(), "未投递");

            mockMvc.perform(get("/progress/stats").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.byStatus.未投递").value(1))
                    .andExpect(jsonPath("$.totalApplied").value(0))
                    .andExpect(jsonPath("$.byIndustry[?(@.industry=='国央企')].count").value(hasItem(0)));
        }
    }

    private Job saveJob(String company, String industry) {
        Job job = new Job();
        job.setCompany(company);
        job.setIndustry(industry);
        job.setRecruitType("秋招");
        job.setLocations("[\"北京\"]");
        job.setStartDate("2024-01-01");
        job.setEndDate("2024-12-31");
        job.setNoWrittenTest("false");
        job.setRoles("[\"后端\"]");
        job.setAnnouncementLink("https://a.com");
        job.setApplyLink("https://b.com");
        job.setCreatedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        return jobRepository.save(job);
    }

    private void saveStatus(Long userId, Long jobId, String status) {
        UserJobStatus ujs = new UserJobStatus();
        ujs.setUserId(userId);
        ujs.setJobId(jobId);
        ujs.setStatus(status);
        userJobStatusRepository.save(ujs);
    }
}

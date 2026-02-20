package com.campusrecruit.controller;

import com.campusrecruit.entity.Job;
import com.campusrecruit.repository.JobRepository;
import com.campusrecruit.repository.UserJobStatusRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.*;
import org.springframework.mock.web.MockHttpSession;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private UserJobStatusRepository userJobStatusRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userJobStatusRepository.deleteAll();
        jobRepository.deleteAll();
    }

    @Nested
    @DisplayName("GET /jobs 招聘列表与筛选")
    class ListJobs {

        @Test
        @DisplayName("无数据时返回空分页")
        void emptyList() throws Exception {
            mockMvc.perform(get("/jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)))
                    .andExpect(jsonPath("$.totalElements").value(0))
                    .andExpect(jsonPath("$.number").value(0));
        }

        @Test
        @DisplayName("有数据时返回分页列表，每条包含 id/company/industry/type/status 等")
        void listWithData() throws Exception {
            Job job = new Job();
            job.setCompany("测试公司");
            job.setIndustry("互联网");
            job.setRecruitType("秋招");
            job.setLocations("[\"北京\",\"上海\"]");
            job.setStartDate("2024-01-01");
            job.setEndDate("2024-12-31");
            job.setNoWrittenTest("false");
            job.setRoles("[\"前端\",\"后端\"]");
            job.setAnnouncementLink("https://a.com");
            job.setApplyLink("https://b.com");
            job.setRemark("备注");
            job.setBatch("25");
            job.setSalary("25k");
            job.setCreatedAt(LocalDateTime.now().minusDays(1));
            job.setUpdatedAt(LocalDateTime.now());
            jobRepository.save(job);

            mockMvc.perform(get("/jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].id").value(notNullValue()))
                    .andExpect(jsonPath("$.content[0].company").value("测试公司"))
                    .andExpect(jsonPath("$.content[0].industry").value("互联网"))
                    .andExpect(jsonPath("$.content[0].type").value("秋招"))
                    .andExpect(jsonPath("$.content[0].status").value("未投递"))
                    .andExpect(jsonPath("$.content[0].locations", hasSize(2)))
                    .andExpect(jsonPath("$.content[0].roles", hasSize(2)))
                    .andExpect(jsonPath("$.content[0].salary").value("25k"))
                    .andExpect(jsonPath("$.content[0].batch").value("25"));
        }

        @Test
        @DisplayName("按 industry 筛选")
        void filterByIndustry() throws Exception {
            saveJob("A公司", "互联网", "秋招");
            saveJob("B公司", "金融", "春招");

            mockMvc.perform(get("/jobs").param("industry", "互联网"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].company").value("A公司"));
        }

        @Test
        @DisplayName("按 type 筛选")
        void filterByType() throws Exception {
            saveJob("A公司", "互联网", "秋招");
            saveJob("B公司", "互联网", "实习");

            mockMvc.perform(get("/jobs").param("type", "秋招"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].company").value("A公司"));
        }

        @Test
        @DisplayName("按 location 模糊筛选")
        void filterByLocation() throws Exception {
            saveJobWithLocations("A公司", "[\"北京\",\"上海\"]");
            saveJobWithLocations("B公司", "[\"深圳\"]");

            mockMvc.perform(get("/jobs").param("location", "北京"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].company").value("A公司"));
        }

        @Test
        @DisplayName("按 deadlineDays 筛选：仅返回 end_date 在今日起 N 天内的记录")
        void filterByDeadlineDays() throws Exception {
            LocalDate today = LocalDate.now();
            saveJobWithEndDate("Soon", today.plusDays(2));   // 3天内
            saveJobWithEndDate("Later", today.plusDays(10)); // 超出7天

            mockMvc.perform(get("/jobs").param("deadlineDays", "7"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].company").value("Soon"));
        }

        @Test
        @DisplayName("按 roles 逗号分隔多关键词筛选")
        void filterByRoles() throws Exception {
            saveJobWithRoles("FrontendJob", "[\"前端\",\"React\"]");
            saveJobWithRoles("BackendJob", "[\"后端\",\"Java\"]");

            mockMvc.perform(get("/jobs").param("roles", "前端,React"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].company").value("FrontendJob"));
        }

        @Test
        @DisplayName("onlyNewToday=true 时仅返回今日创建的记录")
        void filterOnlyNewToday() throws Exception {
            Job todayJob = saveJob("TodayCo", "互联网", "秋招");
            todayJob.setCreatedAt(LocalDateTime.now());
            jobRepository.saveAndFlush(todayJob);

            // 先构造再保存，使 createdAt 在首次 persist 前即为昨天（createdAt 不可更新）
            Job oldJob = new Job();
            oldJob.setCompany("OldCo");
            oldJob.setIndustry("互联网");
            oldJob.setRecruitType("秋招");
            oldJob.setLocations("[\"北京\"]");
            oldJob.setStartDate(LocalDate.now().toString());
            oldJob.setEndDate(LocalDate.now().plusMonths(1).toString());
            oldJob.setNoWrittenTest("false");
            oldJob.setRoles("[\"开发\"]");
            oldJob.setCreatedAt(LocalDateTime.now().minusDays(1));
            oldJob.setUpdatedAt(LocalDateTime.now());
            jobRepository.saveAndFlush(oldJob);

            mockMvc.perform(get("/jobs").param("onlyNewToday", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].company").value("TodayCo"))
                    .andExpect(jsonPath("$.content[0].isNew").value(true));
        }

        @Test
        @DisplayName("分页参数 page/size 生效")
        void pagination() throws Exception {
            for (int i = 0; i < 5; i++) {
                saveJob("Company" + i, "互联网", "秋招");
            }
            mockMvc.perform(get("/jobs").param("page", "1").param("size", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(2)))
                    .andExpect(jsonPath("$.totalElements").value(5))
                    .andExpect(jsonPath("$.number").value(1))
                    .andExpect(jsonPath("$.size").value(2));
        }

        @Test
        @DisplayName("登录用户请求列表时返回该用户的投递进度")
        void listWithUserStatus() throws Exception {
            Job job = saveJob("进度公司", "互联网", "秋招");
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_progress"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();

            mockMvc.perform(put("/jobs/" + job.getId() + "/status")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"已笔试\"}"))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/jobs").session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].company").value("进度公司"))
                    .andExpect(jsonPath("$.content[0].status").value("已笔试"));
        }
    }

    @Nested
    @DisplayName("PUT /jobs/{jobId}/status 更新投递进度")
    class UpdateStatus {

        @Test
        @DisplayName("未登录返回 401")
        void unauthorized() throws Exception {
            Job job = saveJob("A", "互联网", "秋招");
            mockMvc.perform(put("/jobs/" + job.getId() + "/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"已投递\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("请先登录"));
        }

        @Test
        @DisplayName("登录后更新成功返回 200")
        void success() throws Exception {
            Job job = saveJob("B", "互联网", "秋招");
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_status"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();

            mockMvc.perform(put("/jobs/" + job.getId() + "/status")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"已面试\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("已更新"));
        }

        @Test
        @DisplayName("职位不存在返回 400")
        void jobNotFound() throws Exception {
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_404"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();

            mockMvc.perform(put("/jobs/99999/status")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"已投递\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(containsString("不存在")));
        }

        @Test
        @DisplayName("非法 status 返回 400")
        void invalidStatus() throws Exception {
            Job job = saveJob("C", "互联网", "秋招");
            var loginRes = mockMvc.perform(get("/auth/wechat/login").param("code", "openid_invalid"))
                    .andExpect(status().isOk())
                    .andReturn();
            MockHttpSession session = (MockHttpSession) loginRes.getRequest().getSession();

            mockMvc.perform(put("/jobs/" + job.getId() + "/status")
                            .session(session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"无效状态\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    private Job saveJob(String company, String industry, String recruitType) {
        Job job = new Job();
        job.setCompany(company);
        job.setIndustry(industry);
        job.setRecruitType(recruitType);
        job.setLocations("[\"北京\"]");
        job.setStartDate(LocalDate.now().toString());
        job.setEndDate(LocalDate.now().plusMonths(1).toString());
        job.setNoWrittenTest("false");
        job.setRoles("[\"开发\"]");
        job.setCreatedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        return jobRepository.save(job);
    }

    private void saveJobWithLocations(String company, String locations) {
        Job job = saveJob(company, "互联网", "秋招");
        job.setLocations(locations);
        jobRepository.save(job);
    }

    private void saveJobWithEndDate(String company, LocalDate endDate) {
        Job job = saveJob(company, "互联网", "秋招");
        job.setEndDate(endDate.toString());
        jobRepository.save(job);
    }

    private void saveJobWithRoles(String company, String roles) {
        Job job = saveJob(company, "互联网", "秋招");
        job.setRoles(roles);
        jobRepository.save(job);
    }
}

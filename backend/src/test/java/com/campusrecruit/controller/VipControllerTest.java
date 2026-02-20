package com.campusrecruit.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VipControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /vip/plans 返回 3 个套餐，含 1_month/3_month/lifetime 及价格")
    void plans() throws Exception {
        mockMvc.perform(get("/vip/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].id").value("1_month"))
                .andExpect(jsonPath("$[0].name").value("月度会员"))
                .andExpect(jsonPath("$[0].durationLabel").value("1个月"))
                .andExpect(jsonPath("$[0].price").value(8.8))
                .andExpect(jsonPath("$[1].id").value("3_month"))
                .andExpect(jsonPath("$[1].price").value(18.8))
                .andExpect(jsonPath("$[2].id").value("lifetime"))
                .andExpect(jsonPath("$[2].price").value(29.9));
    }
}

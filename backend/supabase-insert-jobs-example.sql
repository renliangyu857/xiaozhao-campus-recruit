-- ============================================================
-- 在 Supabase 中手动插入职位数据：只操作 public.job 表
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================
-- 表名：job（在 public schema 下）
-- 必填：company, industry, recruit_type, created_at, updated_at
-- 可选：locations, start_date, end_date, no_written_test, roles,
--       announcement_link, apply_link, remark, batch, salary
-- ============================================================

-- 示例：插入几条互联网/金融行业职位（id 可省略，自增）
INSERT INTO job (
    company,
    industry,
    recruit_type,
    locations,
    start_date,
    end_date,
    no_written_test,
    roles,
    announcement_link,
    apply_link,
    remark,
    batch,
    salary,
    created_at,
    updated_at
) VALUES
(
    '字节跳动',
    '互联网',
    '秋招',
    '["北京","上海","深圳"]',
    '2024-08-01',
    '2024-10-31',
    'false',
    '["前端","后端","算法"]',
    'https://example.com/announce',
    'https://example.com/apply',
    '早投递早筛选',
    '25',
    '25k-45k*15',
    NOW(),
    NOW()
),
(
    '腾讯',
    '互联网',
    '秋招',
    '["深圳","广州"]',
    '2024-08-10',
    '2024-11-15',
    'false',
    '["前端","后端"]',
    'https://example.com/tx',
    'https://example.com/tx-apply',
    '游戏部门',
    '25',
    '22k-40k*16',
    NOW(),
    NOW()
),
(
    '中金公司',
    '金融',
    '实习',
    '["北京","上海","香港"]',
    '2024-09-01',
    '2024-09-30',
    'true',
    '["分析师","IT"]',
    'https://example.com/cicc',
    'https://example.com/cicc-apply',
    '需尽快入职',
    '26',
    '300/day',
    NOW(),
    NOW()
);

-- 行业取值需与前端一致：互联网、金融、国央企、外企、制造业、其他
-- 类型取值：秋招、春招、实习
-- locations / roles 为 JSON 数组字符串，如 '["北京","上海"]'
-- start_date / end_date / no_written_test 为 TEXT：日期用 'yyyy-MM-dd'，免笔试用 'true'/'false'

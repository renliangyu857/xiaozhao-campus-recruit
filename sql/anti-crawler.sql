-- 反爬虫系统可选的数据库表
-- 这些表用于记录日志和溯源，不是功能必需的

-- ============================================
-- 1. API 请求日志表（用于分析爬虫行为）
-- ============================================
CREATE TABLE IF NOT EXISTS api_request_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id),
    path VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    ip_address INET,
    user_agent TEXT,
    signature_valid BOOLEAN NOT NULL DEFAULT true,
    rate_limited BOOLEAN NOT NULL DEFAULT false,
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引：用于查询用户的请求历史
CREATE INDEX idx_api_logs_user_id ON api_request_logs(user_id);
-- 索引：用于按时间分析
CREATE INDEX idx_api_logs_created_at ON api_request_logs(created_at);
-- 索引：用于检测异常 IP
CREATE INDEX idx_api_logs_ip ON api_request_logs(ip_address);

-- ============================================
-- 2. 频率限制违规记录表（长期跟踪）
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id),
    path VARCHAR(255) NOT NULL,
    violation_count INTEGER NOT NULL DEFAULT 1,
    first_violation_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_violation_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, path)
);

CREATE INDEX idx_rate_violations_user ON rate_limit_violations(user_id);

-- ============================================
-- 3. 蜜罐数据检测记录表（发现爬虫时记录）
-- ============================================
CREATE TABLE IF NOT EXISTS honeytoken_detections (
    id BIGSERIAL PRIMARY KEY,
    detected_user_id BIGINT NOT NULL REFERENCES app_users(id),
    leaked_to TEXT, -- 在哪里发现的（如：某竞品网站）
    honey_job_id INTEGER NOT NULL, -- 被泄露的蜜罐职位ID
    detection_source VARCHAR(255), -- 检测来源
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.9, -- 置信度
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_honey_detections_user ON honeytoken_detections(detected_user_id);
CREATE INDEX idx_honey_detections_created ON honeytoken_detections(created_at);

-- ============================================
-- 4. 临时封禁表（比 Redis 更持久的封禁）
-- ============================================
CREATE TABLE IF NOT EXISTS temporary_bans (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES app_users(id),
    ip_address INET,
    reason VARCHAR(50) NOT NULL, -- 'RATE_LIMIT', 'INVALID_SIGNATURE', 'SUSPICIOUS'
    banned_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (user_id IS NOT NULL OR ip_address IS NOT NULL)
);

CREATE INDEX idx_bans_user ON temporary_bans(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_bans_ip ON temporary_bans(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX idx_bans_until ON temporary_bans(banned_until);

-- ============================================
-- 5. 在白名单表（可信用户，放宽限制）
-- ============================================
CREATE TABLE IF NOT EXISTS api_whitelist (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES app_users(id),
    reason TEXT,
    created_by BIGINT REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 视图：用户 API 使用统计
-- ============================================
CREATE OR REPLACE VIEW user_api_stats AS
SELECT
    user_id,
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE rate_limited) as rate_limited_count,
    COUNT(*) FILTER (WHERE NOT signature_valid) as invalid_sig_count,
    COUNT(DISTINCT ip_address) as unique_ips
FROM api_request_logs
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at);

-- ============================================
-- 示例：查询可疑用户（5分钟内请求超过100次）
-- ============================================
-- SELECT user_id, COUNT(*) as cnt
-- FROM api_request_logs
-- WHERE created_at > NOW() - INTERVAL '5 minutes'
-- GROUP BY user_id
-- HAVING COUNT(*) > 100;

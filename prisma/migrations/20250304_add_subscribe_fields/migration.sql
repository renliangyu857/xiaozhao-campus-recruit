-- 添加用户关注相关字段到 app_user 表
-- 这些字段用于记录用户是否关注公众号以及关注时间

-- 添加 is_subscribed 字段（用户是否关注公众号）
ALTER TABLE "app_user"
ADD COLUMN IF NOT EXISTS "is_subscribed" BOOLEAN NOT NULL DEFAULT false;

-- 添加 subscribed_at 字段（关注时间）
ALTER TABLE "app_user"
ADD COLUMN IF NOT EXISTS "subscribed_at" TIMESTAMP(3);

-- 为 is_subscribed 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS "app_user_is_subscribed_idx" ON "app_user"("is_subscribed");

-- 更新注释
COMMENT ON COLUMN "app_user"."is_subscribed" IS '用户是否已关注微信公众号';
COMMENT ON COLUMN "app_user"."subscribed_at" IS '用户关注微信公众号的时间';

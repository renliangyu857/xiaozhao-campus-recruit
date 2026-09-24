-- 2026-09-24 支付宝支付 v3 集成：wx_code_url 是 VarChar(512) 太短装不下 form HTML
-- 加 alipay_form_html (TEXT) + alipay_trade_no (VarChar(64)) 两个新字段
-- 不动现有数据，向后兼容（已有订单这两列都 NULL）
--
-- 注意 1：Prisma schema `Order` model 用 @@map("order") 映射到小写 order 表
-- 注意 2：order 是 Postgres 保留字，必须用双引号包起来
--     不能写 ALTER TABLE order（裸），会触发 syntax error at or near "order"

ALTER TABLE "order"
  ADD COLUMN "alipay_form_html" TEXT,
  ADD COLUMN "alipay_trade_no" VARCHAR(64);

-- 索引：异步通知时按 alipay_trade_no 查订单
-- 注：Order model 未声明 @@index；Prisma 自动生成 <table>_<col>_idx 名称
CREATE INDEX IF NOT EXISTS "order_alipay_trade_no_idx" ON "order" ("alipay_trade_no");
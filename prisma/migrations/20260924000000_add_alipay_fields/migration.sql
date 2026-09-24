-- 2026-09-24 支付宝支付 v3 集成：wx_code_url 是 VarChar(512) 太短装不下 form HTML
-- 加 alipay_form_html (TEXT) + alipay_trade_no (VarChar(64)) 两个新字段
-- 不动现有数据，向后兼容（已有订单这两列都 NULL）

ALTER TABLE "Order"
  ADD COLUMN "alipay_form_html" TEXT,
  ADD COLUMN "alipay_trade_no" VARCHAR(64);

-- 索引：异步通知时按 alipay_trade_no 查订单
CREATE INDEX "Order_alipay_trade_no_idx" ON "Order" ("alipay_trade_no");
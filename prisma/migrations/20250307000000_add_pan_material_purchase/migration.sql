-- 笔面试资料单独购买记录表
CREATE TABLE IF NOT EXISTS pan_material_purchase (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    material_id VARCHAR(64) NOT NULL,
    material_name VARCHAR(256) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 6.60,
    order_no VARCHAR(64) UNIQUE,
    pay_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, material_id)
);

CREATE INDEX idx_pan_purchase_user_id ON pan_material_purchase(user_id);
CREATE INDEX idx_pan_purchase_material_id ON pan_material_purchase(material_id);
CREATE INDEX idx_pan_purchase_pay_status ON pan_material_purchase(pay_status);

# 微信Native支付接入设计方案

## 1. 项目概述

### 1.1 背景
当前VIP购买为模拟支付流程，需要接入真实的微信支付能力。本项目为**PC网站**，用户通过浏览器访问，因此选择**微信Native支付**（扫码支付）作为接入方式。

### 1.2 目标
- 实现真实的微信支付功能
- 支持VIP会员购买（月度/季度/年度）
- 支持笔面试资料单独购买
- 确保支付安全和可靠性
- 实现完整的订单管理和支付状态同步

---

## 2. 技术方案选择

### 2.1 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Native支付** | PC端体验好，生成二维码扫码支付 | 需要用户用手机扫码 | ✅ **PC网站** |
| JSAPI支付 | 直接在微信内完成，体验流畅 | 必须在微信浏览器内打开 | 微信内网页 |
| H5支付 | 支持外部浏览器 | 体验较差，需跳转到微信 | 移动端非微信环境 |

**结论**：选择 **Native支付**（扫码支付）

### 2.2 Native支付流程

```
┌──────────┐      ┌──────────┐      ┌─────────────┐      ┌───────────┐      ┌──────────┐
│   用户   │      │  PC网页  │      │  后端服务   │      │ 微信支付  │      │  用户    │
│ (浏览器) │      │          │      │  (Vercel)   │      │   平台    │      │ (微信)   │
└────┬─────┘      └────┬─────┘      └──────┬──────┘      └─────┬─────┘      └────┬─────┘
     │                 │                    │                   │                │
     │──1.点击购买────>│                    │                   │                │
     │                 │──2.创建订单───────>│                   │                │
     │                 │                    │──3.统一下单──────>│                │
     │                 │                    │                   │                │
     │                 │                    │<─4.返回code_url───│                │
     │                 │<─5.返回二维码URL───│                   │                │
     │                 │                    │                   │                │
     │<─6.显示二维码───│                    │                   │                │
     │                 │                    │                   │                │
     │                 │                    │                   │                │──7.扫码──>
     │                 │                    │                   │                │
     │                 │<─────────────────────────────────────────────────────────│
     │                 │                    │<─8.支付结果通知───────────────────────│
     │                 │                    │                   │                │
     │                 │                    │──9.开通会员/解锁资料                  │
     │                 │                    │                   │                │
     │<─10.WebSocket推送或轮询更新状态───────│                   │                │
```

---

## 3. 数据库设计

### 3.1 新增 Order 表

```prisma
model Order {
  id            BigInt    @id @default(autoincrement())
  orderNo       String    @unique @map("order_no") @db.VarChar(64)  // 系统订单号
  userId        BigInt    @map("user_id")

  // 商品信息
  productType   String    @map("product_type") @db.VarChar(32)      // vip / material
  productId     String    @map("product_id") @db.VarChar(32)        // 1_month / 3_month / 1_year / material_id
  productName   String    @map("product_name") @db.VarChar(128)
  amount        Int       @map("amount")                             // 订单金额（分）
  originalAmount Int?     @map("original_amount")                    // 原价（用于显示优惠）

  // 支付信息
  payStatus     String    @map("pay_status") @db.VarChar(32) @default("pending")  // pending / paid / failed / refunded
  payMethod     String?   @map("pay_method") @db.VarChar(32)        // wechat_native
  payTime       DateTime? @map("pay_time")                           // 支付时间

  // 微信支付信息（Native支付特有）
  wxCodeUrl     String?   @map("wx_code_url") @db.VarChar(512)      // 微信二维码URL（code_url）
  wxTransactionId String? @map("wx_transaction_id") @db.VarChar(64) // 微信支付流水号

  // 业务处理状态
  bizStatus     String    @map("biz_status") @db.VarChar(32) @default("pending")  // pending / processing / completed / failed
  bizResult     Json?     @map("biz_result")                        // 业务处理结果

  // 有效期（用于VIP订单）
  validStartAt  DateTime? @map("valid_start_at")
  validEndAt    DateTime? @map("valid_end_at")

  // 客户端信息
  clientIp      String?   @map("client_ip") @db.VarChar(64)
  userAgent     String?   @map("user_agent") @db.VarChar(512)

  // 回调记录
  notifyCount   Int       @default(0) @map("notify_count")
  lastNotifyAt  DateTime? @map("last_notify_at")
  notifyResult  String?   @map("notify_result") @db.Text

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@index([userId])
  @@index([orderNo])
  @@index([payStatus])
  @@index([productType, productId])
  @@index([createdAt])
  @@map("order")
}
```

### 3.2 价格配置（含首月优惠逻辑）

```typescript
// lib/payment-config.ts
export const PRODUCT_CONFIG = {
  vip: {
    "1_month": {
      name: "月度会员",
      getPrice: async (userId: bigint, prisma: PrismaClient) => {
        // 检查用户是否购买过VIP
        const hasPurchased = await prisma.order.findFirst({
          where: {
            userId,
            productType: "vip",
            payStatus: "paid"
          }
        });

        // 首月5.8元，之后9.9元
        return hasPurchased ? 990 : 580;
      },
      originalPrice: 990,  // 原价9.9元
      durationDays: 30
    },
    "3_month": {
      name: "季度会员",
      price: 1660,         // 16.6元
      originalPrice: 2970, // 29.7元（原价）
      durationDays: 90
    },
    "1_year": {
      name: "年度会员",
      price: 4990,         // 49.9元
      originalPrice: 11880,// 118.8元（原价）
      durationDays: 365
    },
  },
  material: {
    defaultPrice: 660,  // 6.6元
  }
};
```

---

## 4. API 接口设计

### 4.1 接口列表

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建支付订单 | POST | /api/payment/create | 创建订单并返回二维码URL |
| 查询订单状态 | GET | /api/payment/order/:orderNo | 查询订单支付状态 |
| 支付回调通知 | POST | /api/payment/notify | 微信支付结果通知 |
| 获取支付二维码 | GET | /api/payment/qrcode/:orderNo | 获取订单的支付二维码 |

### 4.2 创建支付订单

**Request:**
```typescript
POST /api/payment/create
{
  "productType": "vip",           // 商品类型: vip / material
  "productId": "1_month",         // 商品ID
  "materialId?": "material_001"   // 资料ID（购买资料时必填）
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "orderNo": "ORDER_20250308123456_789",
    "productName": "月度会员",
    "amount": 580,                  // 单位：分（首月优惠价）
    "originalAmount": 990,          // 原价
    "isFirstMonth": true,           // 是否首月优惠
    "qrcodeUrl": "weixin://wxpay/bizpayurl?pr=xxxxxxxx",  // 微信二维码URL
    "qrcodeImageUrl": "/api/payment/qrcode/ORDER_20250308123456_789", // 二维码图片
    "expiryTime": 1709893034        // 订单过期时间戳（5分钟）
  }
}
```

### 4.3 查询订单状态

**Request:**
```
GET /api/payment/order/ORDER_20250308123456_789
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "orderNo": "ORDER_20250308123456_789",
    "payStatus": "paid",            // pending / paid / failed
    "productType": "vip",
    "productName": "月度会员",
    "amount": 580,
    "payTime": "2024-03-08T12:34:56Z",
    "validEndAt": "2024-04-08T12:34:56Z"
  }
}
```

### 4.4 获取支付二维码图片

**Request:**
```
GET /api/payment/qrcode/ORDER_20250308123456_789
```

**Response:** 返回PNG格式的二维码图片

---

## 5. 核心流程设计

### 5.1 支付流程时序图

```
用户(PC浏览器)     前端页面            后端API          微信支付        用户(微信)
      │               │                 │               │              │
      │─1.点击购买───>│                 │               │              │
      │               │─2.创建订单─────>│               │              │
      │               │                 │─3.查价格─────>│              │
      │               │                 │<─4.返回金额───│              │
      │               │                 │               │              │
      │               │                 │─5.统一下单───>│              │
      │               │                 │<─6.code_url──│              │
      │               │<─7.订单信息─────│               │              │
      │               │                 │               │              │
      │<─8.显示二维码──│                 │               │              │
      │               │                 │               │              │
      │               │                 │               │              │─9.扫码支付──>
      │               │                 │               │              │
      │               │                 │<─10.支付通知─────────────────│
      │               │                 │─11.验签──────>│              │
      │               │                 │               │              │
      │               │                 │─12.更新订单───│              │
      │               │                 │─13.开通会员───│              │
      │               │                 │               │              │
      │               │<─14.WebSocket推送/轮询更新───────│              │
      │<─15.显示成功──│                 │               │              │
```

### 5.2 支付状态机

```
                    ┌─────────┐
         ┌─────────>│ pending │<────────┐
         │          │ (待支付) │         │
         │          └────┬────┘         │
         │               │              │
    用户取消            支付中          超时关闭(5分钟)
         │               │              │
         │          ┌────▼────┐         │
         │          │ paying  │         │
         │          │ (支付中) │         │
         │          └────┬────┘         │
         │               │              │
         │         ┌─────┴─────┐        │
         │         │           │        │
         ▼         ▼           ▼        ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │cancelled│ │  paid   │ │  failed │
    │ (已取消) │ │ (已支付) │ │ (失败)  │
    └─────────┘ └────┬────┘ └─────────┘
                     │
                     ▼
              ┌─────────────┐
              │  completed  │
              │ (业务已完成) │
              └─────────────┘
```

---

## 6. 前端交互设计

### 6.1 支付流程

```typescript
// lib/payment.ts
export async function initiatePayment(params: {
  productType: 'vip' | 'material';
  productId: string;
  materialId?: string;
}) {
  // 1. 创建订单
  const { data } = await apiFetch('/api/payment/create', {
    method: 'POST',
    json: params
  });

  const { orderNo, qrcodeImageUrl, expiryTime } = data;

  // 2. 显示二维码弹窗，开始轮询
  return {
    orderNo,
    qrcodeImageUrl,
    expiryTime,
    checkStatus: () => checkOrderStatus(orderNo)
  };
}

// 轮询查询订单状态
async function checkOrderStatus(orderNo: string): Promise<OrderStatus> {
  const { data } = await apiFetch(`/api/payment/order/${orderNo}`);
  return data;
}
```

### 6.2 UI 交互

1. **支付确认弹窗**
   - 显示商品名称、原价、优惠价
   - 如果是首月，显示"首月特惠"标签
   - 确认支付按钮

2. **二维码支付弹窗**
   - 居中显示微信支付二维码（大）
   - 提示"请使用微信扫一扫完成支付"
   - 显示倒计时（5分钟）
   - 刷新二维码按钮（如果过期）
   - 取消支付按钮

3. **支付结果处理**
   - 成功：关闭二维码弹窗，显示成功提示，刷新用户信息
   - 超时：提示"订单已过期"，提供"重新支付"按钮
   - 取消：关闭弹窗，返回商品页面

### 6.3 二维码弹窗组件

```typescript
interface PaymentQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNo: string;
  qrcodeImageUrl: string;
  amount: number;
  originalAmount?: number;
  productName: string;
  expiryTime: number;  // 过期时间戳
  onPaymentSuccess: () => void;
}
```

---

## 7. 安全设计

### 7.1 防重放攻击
- 订单号全局唯一，包含时间戳和随机数
- 同一订单号不能重复支付
- 支付回调使用签名验证

### 7.2 金额校验
- 后端计算订单金额，前端只传商品ID
- 支付回调时再次校验金额
- 防止前端篡改价格

### 7.3 签名验证
- 所有微信支付接口使用RSA签名
- 回调通知使用微信公钥验签

### 7.4 订单有效期
- 二维码有效期5分钟（微信默认）
- 过期后需要重新创建订单

---

## 8. 环境配置

### 8.1 需要的环境变量

```bash
# 微信支付配置
WECHAT_PAY_MCHID=商户号
WECHAT_PAY_APPID=公众号APPID
WECHAT_PAY_APIV3_KEY=APIv3密钥
WECHAT_PAY_CERT_SERIAL_NO=证书序列号
WECHAT_PAY_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----

# 微信支付公钥（回调验签用）
WECHAT_PAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----
```

### 8.2 证书获取方式

1. 登录微信支付商户平台
2. 账户中心 → API安全 → 申请API证书
3. 下载证书工具，生成证书
4. 获取私钥文件和证书序列号

---

## 9. 错误处理

### 9.1 常见错误码

| 错误码 | 说明 | 处理方案 |
|--------|------|----------|
| ORDER_EXISTS | 订单已存在 | 返回已有订单号 |
| ORDER_EXPIRED | 订单已过期 | 创建新订单 |
| PAY_FAILED | 支付失败 | 提示用户重试 |
| SIGN_ERROR | 签名错误 | 检查配置 |

---

## 10. 实施计划

### 10.1 开发阶段

| 阶段 | 内容 | 预计工时 |
|------|------|----------|
| 1 | 数据库迁移 + 配置 | 2h |
| 2 | 后端API开发（创建订单、回调、查询） | 6h |
| 3 | 前端二维码支付组件 | 4h |
| 4 | 联调测试 | 4h |
| 5 | 沙箱测试 | 2h |
| **总计** | | **18h** |

### 10.2 测试清单

- [ ] 创建订单成功（首月优惠价）
- [ ] 创建订单成功（非首月原价）
- [ ] 二维码生成成功
- [ ] 扫码支付成功
- [ ] 支付成功回调处理
- [ ] 订单查询接口
- [ ] 重复支付防护
- [ ] 金额篡改防护
- [ ] 签名验证

---

## 11. 待确认问题

在开发开始前，请确认以下信息：

1. **商户信息**
   - [ ] 微信支付商户号
   - [ ] 是否已开通Native支付权限
   - [ ] API证书是否已申请

2. **价格策略（已根据截图更新）**
   - [x] VIP月度会员：首月5.8元，之后9.9元
   - [x] VIP季度会员：16.6元（原价29.7元）
   - [x] VIP年度会员：49.9元（原价118.8元）
   - [ ] 笔面试资料价格（默认6.6元？）

3. **回调地址**
   - [ ] 生产环境域名
   - [ ] 是否支持HTTPS
   - [ ] 回调URL路径（建议：`/api/payment/notify`）

4. **其他**
   - [ ] 订单二维码有效期（建议5分钟）
   - [ ] 是否开启支付风控

---

## 12. 相关文档

- [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [Native支付开发指南](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_1.shtml)
- [支付结果通知](https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_4_5.shtml)

---

**设计版本**: v2.0
**更新日期**: 2025-03-08
**更新内容**:
1. 明确使用Native支付（PC扫码）
2. 更新价格配置（首月5.8元优惠）
3. 添加二维码获取接口

**状态**: 待确认

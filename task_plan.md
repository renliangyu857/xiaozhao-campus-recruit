# Task Plan: 微信Native支付接入

## Goal
接入微信Native支付（扫码支付），替换当前的模拟支付流程。

## Phases

### Phase 1: 设计确认 ✅
- **Status:** complete
- **Started:** 2026-03-08
- **Deliverable:** `docs/wechat-native-payment-design.md`
- **已确认:** 商户参数已预留，Native支付方式确认

### Phase 2: 数据库迁移 ✅
- **Status:** complete
- **Completed:** 2026-03-08
- **Tasks:**
  - [x] 更新 schema.prisma 添加 Order 表
  - [x] 同步到数据库 (prisma db push)
  - [x] 生成 Prisma Client

### Phase 3: 后端API开发 ✅
- **Status:** complete
- **Completed:** 2026-03-08
- **Tasks:**
  - [x] 创建 `lib/payment-config.ts` 价格配置
  - [x] 创建 `lib/wechat-pay.ts` 微信支付工具
  - [x] 创建 `/api/payment/create` 接口
  - [x] 创建 `/api/payment/notify` 回调接口
  - [x] 创建 `/api/payment/order/:orderNo` 查询接口
  - [x] 创建 `/api/payment/qrcode/:orderNo` 二维码接口

### Phase 4: 前端支付组件 ✅
- **Status:** complete
- **Completed:** 2026-03-08
- **Tasks:**
  - [x] 创建 `lib/payment.ts` 支付服务
  - [x] 创建 `PaymentQRCodeModal` 组件
  - [x] 更新VIP购买流程 ([app/vip/page.tsx])
  - [ ] 更新资料购买流程

### Phase 5: 测试与部署
- **Status:** pending
- **Tasks:**
  - [ ] 沙箱环境测试
  - [ ] 联调测试
  - [ ] 生产环境部署
  - [ ] 监控配置

## Current Phase

**Phase 4: 前端支付组件** - VIP页面已完成，资料购买流程待更新

## Files

- `docs/wechat-native-payment-design.md` - 详细设计文档
- `prisma/schema.prisma` - 数据库schema（已添加Order表）
- `lib/payment-config.ts` - 价格配置
- `lib/wechat-pay.ts` - 微信支付工具
- `lib/payment.ts` - 前端支付服务
- `app/api/payment/create/route.ts` - 创建订单API
- `app/api/payment/notify/route.ts` - 支付回调API
- `app/api/payment/order/[orderNo]/route.ts` - 查询订单API
- `app/api/payment/qrcode/[orderNo]/route.ts` - 二维码图片API
- `components/PaymentQRCodeModal.tsx` - 支付二维码弹窗组件
- `app/vip/page.tsx` - VIP页面（已接入微信支付）

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| P3006 Migration error | 1 | 使用 `prisma db push` 直接同步 |
| BigInt序列化错误 | 1 | 将 m.id 改为 String(m.id) |

## Decisions
| Date | Decision | Reason |
|------|----------|--------|
| 2026-03-08 | 选择Native支付（扫码） | PC网站，用户扫码支付 |
| 2026-03-08 | 新建Order表统一管理订单 | 支持VIP和资料两种业务 |
| 2026-03-08 | 首月优惠5.8元逻辑 | 后端检查是否购买过VIP |
| 2026-03-08 | 使用 `prisma db push` | 迁移状态不一致，直接同步 |

## 配置清单

### 环境变量（需要配置）
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

## 待完成任务

1. 更新资料购买流程（exam页面）
2. 沙箱环境测试
3. 配置生产环境微信支付参数
4. 生产环境部署


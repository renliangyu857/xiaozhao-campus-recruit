# Findings & Decisions

## Requirements

### 任务1：修复登录提示问题
- 问题：点击登录时弹出"请先登录后操作"提示
- 目标：定位并修复触发错误提示的代码

### 任务2：修复会员有效期顺延
- 问题：购买会员后有效期没有顺延叠加
- 例如：季度会员到期日6月7号，再买月度或季度应该往后叠加，但仍是6月7号
- 目标：修改会员购买逻辑，支持有效期叠加

### 任务3：修复年度会员购买
- 问题：点击年度会员提示"套餐无效或者用户不存在"
- 目标：检查并修复年度套餐配置或购买逻辑

### 任务4：笔面试资料单独购买
- 需求：除了季度和年度会员可以解锁下载外，增加单独购买选项（6.6元）
- 目标：实现单个资料的购买和解锁功能

## Research Findings

### 问题1：登录提示问题分析

**代码位置**：[app/page.tsx](app/page.tsx:86-88)

```typescript
const loadPage = async (page: number, resetPage: boolean, onlyNewTodayOverride?: boolean) => {
  if (!user) {
    alert("请先登录后操作");
    return;
  }
  ...
}
```

**问题分析**：
- `loadPage` 函数在 `user` 为 null 时会弹出 "请先登录后操作" alert
- 但是用户反映"点击登录时"弹出这个提示，而不是查询时
- 可能是登录按钮误触发了查询操作，或者登录流程有问题
- 需要检查登录按钮的 onClick 处理

### 问题2：会员有效期没有顺延 - **根本原因找到**

**代码位置**：[app/api/vip/create-order/route.ts](app/api/vip/create-order/route.ts:33-44)

```typescript
const now = new Date();
let endAt: Date;
if (planId === "1_month") {
  endAt = new Date(now); endAt.setMonth(endAt.getMonth() + 1);
} else if (planId === "3_month") {
  endAt = new Date(now); endAt.setMonth(endAt.getMonth() + 3);
} else {
  endAt = new Date(now); endAt.setFullYear(endAt.getFullYear() + 99);
}
await prisma.userMember.create({
  data: { userId, planId, startAt: now, endAt },
});
```

**问题分析**：
- 代码直接使用 `new Date()` 作为起始时间计算 `endAt`
- **没有检查用户是否已有有效会员**
- 应该查询用户当前会员的 `endAt`，如果还在有效期内，则在此基础上顺延

**修复方案**：
```typescript
// 先查询用户当前有效会员
const currentMember = await prisma.userMember.findFirst({
  where: { userId, endAt: { gte: new Date() } },
  orderBy: { endAt: "desc" },
});

// 从当前会员结束时间或现在时间开始计算
const startAt = currentMember ? currentMember.endAt : new Date();
let endAt: Date;
if (planId === "1_month") {
  endAt = new Date(startAt); endAt.setMonth(endAt.getMonth() + 1);
} else if (planId === "3_month") {
  endAt = new Date(startAt); endAt.setMonth(endAt.getMonth() + 3);
} else {
  endAt = new Date(startAt); endAt.setFullYear(endAt.getFullYear() + 99);
}
```

### 问题3：年度会员购买失败 - **根本原因找到**

**代码位置**：
- 套餐列表：[app/api/vip/plans/route.ts](app/api/vip/plans/route.ts:3-6)
- 订单创建：[app/api/vip/create-order/route.ts](app/api/vip/create-order/route.ts:7)

**问题分析**：

`plans/route.ts` 中定义的套餐：
```typescript
const DEFAULT_PLANS = [
  { id: "1_month", name: "月度会员", ... },
  { id: "3_month", name: "季度会员", ... },
  { id: "1_year", name: "年度会员", ... },  // <-- id 是 "1_year"
];
```

`create-order/route.ts` 中验证的套餐：
```typescript
const VALID_PLANS = ["1_month", "3_month", "lifetime"];  // <-- 没有 "1_year"!
```

**根本原因**：VALID_PLANS 数组中没有 `"1_year"`，只有 `"lifetime"`！
当用户选择年度会员（`1_year`）时，验证失败返回"套餐无效或用户不存在"。

**修复方案**：将 `"lifetime"` 改为 `"1_year"`，或者在 VALID_PLANS 中添加 `"1_year"`

### 问题4：笔面试资料单独购买

**当前代码位置**：[app/exam/page.tsx](app/exam/page.tsx)

**当前逻辑**：
- `canDownload()` 函数检查用户是否是季度或年度会员
- 如果不是会员，点击下载显示付费墙弹窗，引导去会员页面
- 没有单独购买单个资料的选项

**需要实现**：
1. 数据库模型：需要添加 `PanMaterialPurchase` 表记录用户已购买的单个资料
2. 支付接口：复用或扩展现有支付流程，支持6.6元购买单个资料
3. UI修改：在资料列表中添加"单独购买"按钮（6.6元解锁）

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 问题2修复 | 修改 create-order 路由，查询现有会员并在其结束时间上顺延 |
| 问题3修复 | VALID_PLANS 添加 `"1_year"`，移除 `"lifetime"` 或保留两者 |
| 问题4实现 | 新增 PanMaterialPurchase 表 + 支付接口 + UI按钮 |

## Implementation Plan

### Phase 2: 修复登录提示问题
- 状态: ⏸️ 需用户确认具体场景
- 需要: 截图或复现步骤

### Phase 3: 修复会员有效期顺延 ✅
- [x] 修改 app/api/vip/create-order/route.ts
- [x] 查询现有会员并顺延

**修复代码**:
```typescript
// 查询用户当前有效会员，用于计算顺延时间
const currentMember = await prisma.userMember.findFirst({
  where: { userId, endAt: { gte: new Date() } },
  orderBy: { endAt: "desc" },
});

// 从当前会员结束时间或现在时间开始计算新会员有效期
const startAt = currentMember ? currentMember.endAt : new Date();
let endAt: Date;
if (planId === "1_month") {
  endAt = new Date(startAt); endAt.setMonth(endAt.getMonth() + 1);
} else if (planId === "3_month") {
  endAt = new Date(startAt); endAt.setMonth(endAt.getMonth() + 3);
} else {
  endAt = new Date(startAt); endAt.setFullYear(endAt.getFullYear() + 1);
}
```

### Phase 4: 修复年度会员购买 ✅
- [x] 修改 app/api/vip/create-order/route.ts 中的 VALID_PLANS
- 将 `["1_month", "3_month", "lifetime"]` 改为 `["1_month", "3_month", "1_year"]`

### Phase 5: 笔面试资料单独购买 ✅
- [x] 创建数据库 migration 添加 PanMaterialPurchase 表
- [x] 创建购买接口 `/api/pan-materials/check` 和 `/api/pan-materials/purchase`
- [x] 修改 exam/page.tsx 添加购买按钮

**数据库模型**:
```prisma
model PanMaterialPurchase {
  id            BigInt    @id @default(autoincrement())
  userId        BigInt    @map("user_id")
  materialId    String    @map("material_id") @db.VarChar(64)
  materialName  String    @map("material_name") @db.VarChar(256)
  price         Decimal   @db.Decimal(10, 2) @default(6.60)
  orderNo       String?   @unique @map("order_no") @db.VarChar(64)
  payStatus     String    @map("pay_status") @db.VarChar(32) @default("pending")
  paidAt        DateTime? @map("paid_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@unique([userId, materialId])
  @@index([userId])
  @@map("pan_material_purchase")
}
```

**UI 交互**:
- 非会员点击下载时弹出选择弹窗
- 选项1: 单独购买 ¥6.6
- 选项2: 升级季度/年度会员

### Phase 6: E2E测试
- 状态: ⏸️ 需本地环境配置完整后运行

## Resources

- 笔面试资料页面：/exam
- 会员页面：/vip
- 后端项目：Next.js + Prisma + PostgreSQL

---

## 更新历史

- 2026-03-07: 完成问题分析，找到所有根本原因

## 2026-03-10 Ѳ�췢��

### ΢��֧��
- `app/api/payment/create/route.ts`
  - ��֧���������ô���д���� 30 ���ӣ��� `app/api/payment/qrcode/[orderNo]/route.ts` ��ǰ�˵���ʱֻ�� 5 ���ӣ��û������õ�һ����ʧЧ��ά�롣
  - ���ϵ���ʱ���� `materialName`�����¶�����֧��������Ʒ���˻�Ϊͨ���İ���
  - �����ѹ��򳡾�ȱ�ٷ���˶��ף�����ǰ��״̬����©���ظ��µ���

### ΢�ŵ�¼
- `app/api/auth/qrcode/poll/route.ts`
  - PC ɨ���¼�ɹ�ʱû��д�� `campus_api_secret`��ǩ�������ӿڻ�����������������ʼ���������ȶ���

### ֧���ص�
- `app/api/payment/notify/route.ts`
  - ���Ϲ���ص�ʹ�� `create` д `pan_material_purchase`�����������ʷ pending ��¼��߽糡���ظ���������ײΨһ������

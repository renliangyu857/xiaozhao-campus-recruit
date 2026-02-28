# 校招信息聚合站 - 定价策略与A/B测试方案

**文档版本**: v1.1
**更新时间**: 2026-02-27
**适用范围**: 产品定价优化与价格实验
**技术栈**: Next.js + Umami（国内部署）

---

## 目录

1. [当前定价结构分析](#一当前定价结构分析)
2. [定价策略评估](#二定价策略评估)
3. [优化建议](#三优化建议)
4. [A/B测试方案](#四ab测试方案)
5. [实施路线图](#五实施路线图)
6. [风险控制](#六风险控制)
7. [附录：技术实现方案](#附录技术实现方案)

---

## 一、当前定价结构分析

### 1.1 产品背景

| 维度 | 详情 |
|------|------|
| **产品类型** | 垂直领域 SaaS（校招求职信息聚合） |
| **目标市场** | 应届生、在校生（价格敏感型用户） |
| **核心价值** | 职位查询、内推码、笔面试资料、投递管理 |
| **商业模式** | Freemium（免费+增值） |

### 1.2 现有套餐结构

```
┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
│               │ 免费用户       │ 1个月VIP      │ 3个月VIP      │ 终身VIP       │
├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
│ 价格          │ ¥0            │ ¥8.8          │ ¥16.6         │ ¥29.9         │
│ 日均成本      │ -             │ ¥0.29/天      │ ¥0.18/天      │ 一次性        │
│ 查询次数      │ 3次/日        │ 无限          │ 无限          │ 无限          │
│ 内推码库      │ ❌            │ ✅            │ ✅            │ ✅            │
│ 笔面试资料    │ 部分          │ ✅            │ ✅            │ ✅            │
│ 个性化推送    │ ❌            │ ❌            │ ✅            │ ✅            │
│ 进度看板      │ ✅            │ ✅            │ ✅            │ ✅            │
└───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘
```

### 1.3 免费策略

| 策略 | 实现 | 效果评估 |
|------|------|----------|
| 每日免费查询 | 3次/日 | ✅ 合理，创造日常习惯 |
| 新用户试用 | 2天VIP体验 | ✅ 降低决策门槛 |
| 邀请奖励 | 邀请1人+3次，3人得5天VIP，10人得1月VIP | ✅ 病毒传播机制 |

---

## 二、定价策略评估

### 2.1 优势分析

| 优点 | 说明 |
|------|------|
| **价格亲民** | ¥8.8/月对在校生极其友好，低于一杯奶茶 |
| **Good-Better-Best 结构** | 3档套餐覆盖不同需求，3个月作为"推荐"锚点 |
| **试用机制** | 2天体验降低付费阻力，让用户先感受价值 |
| **邀请裂变** | 多层次奖励（查询次数→短期VIP→长期VIP） |
| **价值可视化** | VIP页展示权益对比、内推码数量、节省查询次数 |

### 2.2 风险与问题

| 问题 | 风险 | 建议 |
|------|------|------|
| **价格可能过低** | ARPU低，难以覆盖获客成本 | 考虑分层定价或增值服务 |
| **缺少年度套餐** | 流失风险高，LTV难以提升 | 增加年卡选项（6-8折） |
| **终身定价偏低** | ¥29.9终身难以持续服务成本 | 建议涨至¥49-69或限量 |
| **免费→付费转化弱** | 3次/日对轻度用户够用 | 降低免费额度或增加付费墙 |
| **缺少企业/学校版** | B端市场未开拓 | 考虑高校合作、企业招聘版 |

---

## 三、优化建议

### 3.1 优化后的套餐结构

**推荐新结构：**

```
┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
│               │ 免费版        │ 月卡          │ 季卡 ⭐推荐   │ 年卡 🔥超值   │
├───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤
│ 价格          │ ¥0            │ ¥9.9          │ ¥19.9         │ ¥59.9         │
│ 原价对比      │ -             │ -             │ 省¥9.8(33%)   │ 省¥58.9(50%)  │
│ 查询          │ 3次/日        │ 无限          │ 无限          │ 无限          │
│ 内推码        │ 限3个         │ 全部          │ 全部          │ 全部          │
│ 笔面试资料    │ 基础          │ 全部          │ 全部+更新提醒 │ 全部+下载     │
│ 个性化推送    │ ❌            │ ✅            │ ✅            │ ✅+优先       │
│ 简历优化      │ ❌            │ ❌            │ 1次/月        │ 3次/月        │
│ 专属社群      │ ❌            │ 普通群        │ 核心群        │ 1v1咨询       │
└───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘
```

**终身版建议：** ¥69-99（限时限量，制造稀缺性）

### 3.2 心理定价技巧

| 技巧 | 应用 |
|------|------|
| **锚定效应** | 先展示年卡¥59.9，再显示月卡¥9.9，显得月卡贵 |
| **中间价效应** | 季卡作为"推荐"选项，性价比感知最强 |
| **左侧数字效应** | ¥9.9比¥10感觉便宜很多 |
| **每日成本** | 强调"每天只需¥0.16"降低心理门槛 |
| **限时优惠** | 首月5.8元、毕业季促销、双11活动 |

### 3.3 转化漏斗优化

```
当前漏斗：  注册 → 试用2天 → 用完3次 → 付费?
                      ↓
优化漏斗：  注册 → 自动试用2天 → Day1引导使用核心功能
                                          ↓
                              Day2提醒"仅剩1天" + 展示已节省XX次
                                          ↓
                              试用结束 → 付费弹层（首月5.8元）
                                          ↓
                              未付费 → 签到送次数 → 任务墙 → 邀请
                                          ↓
                              7天后 → 推送"回归礼包"（3天VIP）
```

---

## 四、A/B测试方案

### 4.1 测试类型选择

| 测试类型 | 适用场景 | 风险控制 |
|----------|----------|----------|
| **纯价格测试** | 相同产品，不同价格 | 高风险，可能引发用户不满 |
| **包装重命名测试** | "月卡" vs "季卡拆分" | 中等风险 |
| **新套餐测试** | 增加新档位，不动旧价格 | 低风险，推荐首选 |
| **地域分层测试** | 不同城市不同价格 | 中等风险，需防套利 |
| **时间限定测试** | 限时活动价格 | 低风险，易解释 |

### 4.2 推荐测试方案

#### 方案 1：新增套餐测试（推荐首选）
```
对照组：现有 3档套餐（¥8.8/¥16.6/¥29.9）
实验组：新增 1档年卡（¥59.9），其他不变
目标：测试年卡接受度，不影响现有用户
风险评估：低
```

#### 方案 2：新用户专享价
```
对照组：新用户首月 ¥8.8
实验组 A：新用户首月 ¥5.8（低价获客）
实验组 B：新用户首月 ¥12.9（测试价格弹性）
目标：找到最优获客价格点
风险评估：中
```

#### 方案 3：限时活动测试
```
对照组：无活动，正常价格
实验组 A：双11特惠，月卡 ¥6.6
实验组 B：毕业季活动，季卡 ¥12.9
目标：测试促销敏感度和最佳时机
风险评估：低
```

### 4.3 测试参数设置

| 参数 | 建议值 | 说明 |
|------|--------|------|
| 样本量 | 每组 ≥ 1000 用户 | 统计学显著性 |
| 测试周期 | 2-4 周 | 覆盖完整用户行为周期 |
| 置信度 | 95% | 行业标准 |
| 统计功效 | 80% | 检测真实差异的能力 |
| 分流比例 | 50:50 或 80:20 | 风险控制 |

### 4.4 分流策略

```
┌─────────────────────────────────────────────────────────┐
│                    新用户流量                            │
├─────────────────────────────────────────────────────────┤
│  10%        │  45%           │  45%                     │
│  排除       │  对照组 A       │  实验组 B                │
│  (不参与)   │  ¥8.8/月       │  ¥12.9/月                │
└─────────────────────────────────────────────────────────┘

// 老用户保持不变，避免价格歧视投诉
```

### 4.5 用户分桶实现

```typescript
// lib/ab-test.ts
import { createHash } from 'crypto';

/**
 * 基于用户ID的一致性哈希分桶
 * 确保同一用户在同一实验中始终分配到同一组
 */
export const getExperimentGroup = (
  userId: string,
  experimentId: string
): 'control' | 'variant' => {
  const hash = createHash('md5')
    .update(userId + experimentId)
    .digest('hex')
    .substring(0, 8);
  const bucket = parseInt(hash, 16) % 100;
  return bucket < 50 ? 'control' : 'variant';
};

// 获取价格变体
export const getPriceVariant = (userId: string, basePrice: number): number => {
  const group = getExperimentGroup(userId, 'price-test-001');
  return group === 'control' ? basePrice : basePrice * 1.2; // 实验组提价20%
};
```

### 4.6 核心监控指标

#### 北极星指标

| 指标 | 计算公式 | 健康标准 |
|------|----------|----------|
| **付费转化率** | 付费用户数 / 浏览VIP页用户数 | >5% |
| **收入 per 用户** | 总收入 / 实验用户数 | 实验组 > 对照组 |
| **LTV 预估** | ARPU × 平均留存月数 | 实验组 > 对照组 |

#### 预警指标

| 指标 | 风险阈值 | 触发动作 |
|------|----------|----------|
| 页面跳出率 | > 对照组 +20% | 检查价格展示是否吓人 |
| 客服投诉率 | > 0.5% | 立即暂停实验 |
| 负面评价数 | 单日 > 3条 | 排查是否有BUG |
| 退款率 | > 对照组 2倍 | 价格可能过高 |

### 4.7 实时监控看板模板

```
┌──────────────────────────────────────────────────────┐
│  实验: PRICE_TEST_001                                │
│  状态: 运行中 (Day 12/14)                            │
├──────────────────────────────────────────────────────┤
│           │  对照组(¥8.8)  │  实验组(¥12.9)  │ 差异   │
├──────────────────────────────────────────────────────┤
│  用户数   │    1,245      │     1,238      │ -      │
│  转化率   │    6.2%       │     4.8%       │ -23% ⚠️│
│  ARPU     │    ¥0.55      │     ¥0.62      │ +13% ✅│
│  收入     │    ¥685       │     ¥768       │ +12% ✅│
│  投诉     │    0          │     2          │ 观察   │
└──────────────────────────────────────────────────────┘
结论: 转化率下降23%但在可接受范围，收入提升12%，继续观察
```

### 4.8 结果分析决策矩阵

| 结果 | 收入变化 | 决策 |
|------|----------|------|
| 转化率↑ 收入↑ | 双赢 | ✅ 全面推广新价格 |
| 转化率↓ 收入↑ | 牺牲量换价 | ✅ 采用新价格，监控长期LTV |
| 转化率↓ 收入↓ | 双输 | ❌ 放弃提价，保持原价格 |
| 转化率↑ 收入↓ | 量增价减 | ⚠️ 检查是否定价过低 |

---

## 五、实施路线图

### 5.1 第一批 A/B 测试计划

| 优先级 | 实验名称 | 对照组 | 实验组 | 目标样本 | 周期 |
|--------|----------|--------|--------|----------|------|
| P0 | 年卡接受度 | 无年卡 | 增加¥59.9年卡 | 2000 | 2周 |
| P1 | 首月优惠价 | ¥8.8 | ¥5.8 | 2000 | 2周 |
| P1 | 终身版提价 | ¥29.9 | ¥49.9 | 1000 | 2周 |
| P2 | 免费额度 | 3次/日 | 5次/日 | 2000 | 2周 |

### 5.2 分阶段实施

#### Phase 1: 基础设施（Week 1）
- [ ] 部署 Umami 分析系统（国内服务器）
- [ ] 创建 A/B 测试数据库表
- [ ] 实现用户分桶系统
- [ ] 完成核心事件埋点（注册、浏览VIP、支付）
- [ ] 建立实时监控看板

#### Phase 2: 低风险测试（Week 2-3）
- [ ] 年卡新增测试（对照组 vs 实验组）
- [ ] 监控转化率、收入、用户反馈
- [ ] 每日数据复盘

#### Phase 3: 价格优化（Week 4-5）
- [ ] 首月优惠价格测试
- [ ] 终身版价格测试
- [ ] 分析LTV变化

#### Phase 4: 全面推广（Week 6）
- [ ] 确定最优价格结构
- [ ] 100%流量切换
- [ ] 持续监控关键指标

### 5.3 渐进式 Rollout

```
Phase 1: A/B 测试 (2周)     → 验证假设
   ↓ 结果正面
Phase 2: 10% 全量 (1周)     → 观察真实环境
   ↓ 无异常
Phase 3: 50% 全量 (1周)     → 灰度发布
   ↓ 稳定
Phase 4: 100% 全量          → 正式生效
```

---

## 六、风险控制

### 6.1 自动熔断机制

```typescript
// lib/ab-test-monitor.ts
interface ExperimentMetrics {
  complaintRate: number;
  refundRate: number;
  controlRefundRate: number;
}

export const checkExperimentHealth = (metrics: ExperimentMetrics): boolean => {
  // 投诉率超过 1% 熔断
  if (metrics.complaintRate > 0.01) {
    alert('实验异常：投诉率超过阈值，已自动暂停');
    return false;
  }

  // 退款率超过对照组 2 倍熔断
  if (metrics.refundRate > metrics.controlRefundRate * 2) {
    alert('实验异常：退款率异常，已自动暂停');
    return false;
  }

  return true;
};
```

### 6.2 用户投诉处理话术

| 场景 | 话术 |
|------|------|
| "为什么别人更便宜？" | "我们正在进行限时优惠活动，不同用户看到的价格可能不同，您可以关注我们的活动通知~" |
| "我要退款重买" | "已为您申请差价补偿/优惠券，无需重新购买" |
| "你们这是欺诈" | "非常抱歉给您带来困扰，已为您调整为最优惠价格，并赠送VIP时长作为补偿" |

### 6.3 关键检查清单

- [ ] **互斥检查**：同一用户不会同时进入多个价格实验
- [ ] **缓存清理**：价格配置实时生效，无CDN缓存
- [ ] **支付链路**：各组价格正确传递到支付网关
- [ ] **退款处理**：明确实验期间退款归属哪个组
- [ ] **客服培训**：准备话术解释"为什么别人价格不同"

---

## 附录：技术实现方案

### 方案选型：Umami + 自建 A/B 测试

**选型理由：**
- ✅ Umami 轻量级，可部署在国内服务器，访问速度快
- ✅ 无 Cookie，符合国内隐私法规
- ✅ 代码开源，可魔改增加 A/B 测试功能
- ✅ Next.js 友好，集成简单

**方案对比：**

| 方案 | 部署难度 | 国内速度 | A/B测试 | 维护成本 | 推荐度 |
|------|----------|----------|---------|----------|--------|
| **Umami + 自建** | ⭐⭐ 低 | ⭐⭐⭐⭐⭐ | ✅ 需开发 | ⭐⭐ 低 | ⭐⭐⭐⭐⭐ |
| PostHog 云版 | ⭐ 极低 | ⭐⭐ 慢 | ✅ 原生 | ⭐ 极低 | ⭐⭐⭐ |
| PostHog 自托管 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ | ✅ 原生 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐ |
| 完全自建 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ | ✅ 需开发 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ |

---

### 1. Umami 部署方案

#### 1.1 Docker Compose 配置（国内服务器）

```yaml
# docker-compose.umami.yml
version: '3'
services:
  umami:
    image: ghcr.io/umami-software/umami:mysql-latest
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: mysql://umami:umami_password@db:3306/umami
      TRACKER_SCRIPT_NAME: umami.js
      COLLECT_API_ENDPOINT: /api/collect
    depends_on:
      - db
    restart: always
    # 使用国内镜像加速
    extra_hosts:
      - "ghcr.io:140.82.113.33"

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: umami
      MYSQL_USER: umami
      MYSQL_PASSWORD: umami_password
    volumes:
      - mysql-data:/var/lib/mysql
    restart: always
    # 优化 MySQL 配置
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci

volumes:
  mysql-data:
```

#### 1.2 部署命令

```bash
# 1. 创建目录
mkdir -p ~/umami && cd ~/umami

# 2. 创建 compose 文件
cat > docker-compose.yml << 'EOF'
[粘贴上面的配置]
EOF

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f umami

# 5. 初始登录
# 访问 http://your-server:3001
# 默认账号: admin / umami
```

#### 1.3 Nginx 反向代理（HTTPS）

```nginx
# /etc/nginx/conf.d/analytics.conf
server {
    listen 443 ssl http2;
    server_name analytics.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### 2. Next.js 集成

#### 2.1 项目结构

```
next-app/
├── lib/
│   ├── analytics.ts       # Umami 集成
│   ├── ab-test.ts         # A/B 测试核心
│   └── experiment-config.ts # 实验配置
├── hooks/
│   └── useABTest.ts       # React Hook
├── app/
│   ├── api/
│   │   └── analytics/
│   │       └── track/
│   │           └── route.ts  # 服务端追踪API
│   └── layout.tsx         # 注入追踪脚本
└── types/
    └── analytics.ts       # 类型定义
```

#### 2.2 类型定义

```typescript
// types/analytics.ts

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export interface ABTestConfig {
  id: string;
  name: string;
  variants: ('control' | 'variant')[];
  trafficAllocation: number; // 0-1
}

export interface ExperimentAssignment {
  userId: string;
  experimentId: string;
  variant: 'control' | 'variant';
  createdAt: Date;
}

export type PriceExperiment =
  | 'yearly-plan-test'
  | 'first-month-discount'
  | 'lifetime-price-test';
```

#### 2.3 A/B 测试核心逻辑

```typescript
// lib/ab-test.ts
import { createHash } from 'crypto';
import { PriceExperiment, ExperimentAssignment } from '@/types/analytics';

const STORAGE_KEY = 'ab_test_assignments';

/**
 * 生成确定性用户ID（基于设备指纹）
 */
export const getUserId = (): string => {
  if (typeof window === 'undefined') return '';

  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_id', userId);
  }
  return userId;
};

/**
 * 一致性哈希分桶
 */
export const getExperimentVariant = (
  userId: string,
  experimentId: string
): 'control' | 'variant' => {
  const hash = createHash('md5')
    .update(`${userId}:${experimentId}`)
    .digest('hex')
    .substring(0, 8);

  const bucket = parseInt(hash, 16) % 100;
  return bucket < 50 ? 'control' : 'variant';
};

/**
 * 获取或创建实验分配
 */
export const getExperimentAssignment = (
  experimentId: PriceExperiment
): 'control' | 'variant' => {
  const userId = getUserId();

  // 检查本地存储
  const stored = localStorage.getItem(STORAGE_KEY);
  const assignments: Record<string, ExperimentAssignment> = stored
    ? JSON.parse(stored)
    : {};

  if (assignments[experimentId]) {
    return assignments[experimentId].variant;
  }

  // 新建分配
  const variant = getExperimentVariant(userId, experimentId);
  assignments[experimentId] = {
    userId,
    experimentId,
    variant,
    createdAt: new Date(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));

  // 上报实验分配事件
  trackEvent('experiment_assigned', {
    experiment_id: experimentId,
    variant,
    user_id: userId,
  });

  return variant;
};

/**
 * 获取实验价格
 */
export const getExperimentPrice = (
  basePrice: number,
  experimentId: PriceExperiment,
  variantPrices: { control: number; variant: number }
): number => {
  const variant = getExperimentAssignment(experimentId);
  return variant === 'control' ? variantPrices.control : variantPrices.variant;
};
```

#### 2.4 Umami 集成

```typescript
// lib/analytics.ts
import { getUserId } from './ab-test';

const UMAMI_HOST = process.env.NEXT_PUBLIC_UMAMI_HOST;
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: object) => void;
    };
  }
}

/**
 * 追踪事件到 Umami
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // 客户端追踪
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(eventName, properties);
  }

  // 同时发送到自有 API（备份）
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: eventName,
      properties,
      userId: getUserId(),
      timestamp: Date.now(),
    }),
  }).catch(console.error);
};

/**
 * 预定义的业务事件
 */
export const analytics = {
  // 页面浏览
  pageView: (page: string, properties?: object) => {
    trackEvent(`pageview_${page}`, properties);
  },

  // VIP 页面事件
  vipPageViewed: (planId?: string) => {
    trackEvent('vip_page_viewed', { plan_id: planId });
  },

  // 支付流程
  checkoutStarted: (planId: string, price: number, experimentId?: string) => {
    trackEvent('checkout_started', {
      plan_id: planId,
      price,
      experiment_id: experimentId
    });
  },

  checkoutCompleted: (planId: string, price: number, orderNo: string) => {
    trackEvent('checkout_completed', {
      plan_id: planId,
      price,
      order_no: orderNo,
      revenue: price,
    });
  },

  checkoutFailed: (planId: string, price: number, reason: string) => {
    trackEvent('checkout_failed', {
      plan_id: planId,
      price,
      error_reason: reason
    });
  },

  // 功能使用
  jobSearched: (keyword: string, resultCount: number, isVip: boolean) => {
    trackEvent('job_searched', {
      keyword,
      result_count: resultCount,
      is_vip: isVip
    });
  },

  referralCodeUsed: (company: string) => {
    trackEvent('referral_code_used', { company });
  },

  panMaterialViewed: (materialName: string) => {
    trackEvent('pan_material_viewed', { material_name: materialName });
  },

  // 用户生命周期
  userRegistered: (source?: string) => {
    trackEvent('user_registered', { source });
  },

  trialStarted: (duration: number) => {
    trackEvent('trial_started', { duration_days: duration });
  },

  trialExpired: () => {
    trackEvent('trial_expired');
  },

  // 邀请系统
  inviteLinkGenerated: () => {
    trackEvent('invite_link_generated');
  },

  inviteeRegistered: (inviterId: string) => {
    trackEvent('invitee_registered', { inviter_id: inviterId });
  },
};
```

#### 2.5 React Hook

```typescript
// hooks/useABTest.ts
import { useMemo } from 'react';
import { getExperimentAssignment, getExperimentPrice } from '@/lib/ab-test';
import { PriceExperiment } from '@/types/analytics';

export const useABTest = (experimentId: PriceExperiment) => {
  return useMemo(() => {
    const variant = getExperimentAssignment(experimentId);
    return {
      variant,
      isControl: variant === 'control',
      isVariant: variant === 'variant',
    };
  }, [experimentId]);
};

export const useExperimentPrice = (
  basePrice: number,
  experimentId: PriceExperiment,
  variantPrices: { control: number; variant: number }
) => {
  return useMemo(() => {
    const variant = getExperimentAssignment(experimentId);
    const price = variant === 'control' ? variantPrices.control : variantPrices.variant;
    return {
      price,
      variant,
      displayPrice: `¥${price}`,
    };
  }, [basePrice, experimentId, variantPrices.control, variantPrices.variant]);
};
```

#### 2.6 服务端 API（备份追踪）

```typescript
// app/api/analytics/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres'; // 或你的数据库客户端

export async function POST(req: NextRequest) {
  try {
    const { event, properties, userId, timestamp } = await req.json();

    // 存储到数据库（作为 Umami 的备份）
    await sql`
      INSERT INTO analytics_events (user_id, event_name, properties, created_at)
      VALUES (${userId}, ${event}, ${JSON.stringify(properties)}, ${new Date(timestamp)})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

#### 2.7 数据库表结构

```sql
-- 创建分析事件表
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  event_name VARCHAR(128) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR(64)
);

-- 创建索引
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);

-- 创建实验分配表
CREATE TABLE ab_test_assignments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  experiment_id VARCHAR(64) NOT NULL,
  variant VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, experiment_id)
);

CREATE INDEX idx_ab_test_user ON ab_test_assignments(user_id);
CREATE INDEX idx_ab_test_experiment ON ab_test_assignments(experiment_id);

-- 创建转化统计视图
CREATE VIEW conversion_stats AS
SELECT
  DATE(created_at) as date,
  event_name,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM analytics_events
WHERE event_name IN ('vip_page_viewed', 'checkout_started', 'checkout_completed')
GROUP BY DATE(created_at), event_name;
```

#### 2.8 页面集成示例

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {/* Umami 追踪脚本 */}
        <script
          async
          defer
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          src={`${process.env.NEXT_PUBLIC_UMAMI_HOST}/umami.js`}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

// app/vip/page.tsx
'use client';
import { useABTest, useExperimentPrice } from '@/hooks/useABTest';
import { analytics } from '@/lib/analytics';
import { useEffect } from 'react';

export default function VIPPage() {
  // 年卡实验
  const { variant: yearlyVariant } = useABTest('yearly-plan-test');

  // 首月优惠价实验
  const { price: firstMonthPrice, variant: priceVariant } = useExperimentPrice(
    8.8,
    'first-month-discount',
    { control: 8.8, variant: 5.8 }
  );

  useEffect(() => {
    analytics.vipPageViewed();
  }, []);

  const handlePurchase = (planId: string) => {
    analytics.checkoutStarted(planId, firstMonthPrice, 'first-month-discount');
    // ... 支付逻辑
  };

  return (
    <div>
      {/* 实验组显示年卡 */}
      {yearlyVariant === 'variant' && (
        <YearlyPlanCard price={59.9} />
      )}

      {/* 显示实验价格 */}
      <MonthlyPlanCard
        price={firstMonthPrice}
        tag={priceVariant === 'variant' ? '特惠' : undefined}
        onPurchase={() => handlePurchase('1_month')}
      />
    </div>
  );
}
```

---

### 3. 监控报表 SQL

```sql
-- A/B 测试效果查询
WITH experiment_users AS (
  SELECT
    user_id,
    variant,
    created_at as assignment_date
  FROM ab_test_assignments
  WHERE experiment_id = 'first-month-discount'
),
conversions AS (
  SELECT
    a.user_id,
    MAX(CASE WHEN a.event_name = 'checkout_completed' THEN 1 ELSE 0 END) as converted,
    MAX(CASE WHEN a.event_name = 'checkout_completed' THEN a.properties->>'price' END)::float as revenue
  FROM analytics_events a
  JOIN experiment_users e ON a.user_id = e.user_id
  WHERE a.created_at >= e.assignment_date
  GROUP BY a.user_id
)
SELECT
  e.variant,
  COUNT(DISTINCT e.user_id) as total_users,
  SUM(COALESCE(c.converted, 0)) as conversions,
  ROUND(SUM(COALESCE(c.converted, 0)) * 100.0 / COUNT(DISTINCT e.user_id), 2) as conversion_rate,
  ROUND(SUM(COALESCE(c.revenue, 0)), 2) as total_revenue,
  ROUND(SUM(COALESCE(c.revenue, 0)) / COUNT(DISTINCT e.user_id), 2) as arpu
FROM experiment_users e
LEFT JOIN conversions c ON e.user_id = c.user_id
GROUP BY e.variant;
```

---

### 4. 部署检查清单

- [ ] 国内服务器已购买（推荐阿里云/腾讯云轻量应用服务器）
- [ ] 域名已备案并配置 HTTPS
- [ ] Umami Docker 部署完成
- [ ] 数据库表已创建
- [ ] 环境变量已配置（.env.local）
- [ ] Umami 追踪脚本已在 layout.tsx 中注入
- [ ] 核心页面已添加事件追踪
- [ ] A/B 测试分组逻辑已验证
- [ ] 监控报表 SQL 已测试
- [ ] 客服话术已准备

---

## 关键指标目标

| 指标 | 当前目标 | 优化后目标 |
|------|----------|------------|
| 免费→试用转化率 | - | >80%（自动开通） |
| 试用→付费转化率 | - | >15% |
| 月付费用户ARPU | ¥12 | ¥25（引入年卡） |
| 用户LTV | ¥36 | ¥75 |
| 月流失率 | - | <10% |
| NPS评分 | - | >40 |

---

## 总结

**核心策略：**
1. **降低付费门槛**：免费试用 → 体验价值 → 自然付费
2. **提升免费价值**：签到、任务 → 延长免费用户生命周期
3. **增强会员价值**：内推码、报告 → 提升付费意愿
4. **增加回访理由**：收藏、提醒 → 提升留存

**技术方案：**
- **Umami** 部署在国内服务器，保证访问速度
- **自建 A/B 测试** 系统，灵活可控
- **Next.js 深度集成**，开发体验好

**预期效果：**
- 用户留存率提升 50-100%
- 付费转化率从当前<2%提升至 5-8%
- 用户生命周期价值（LTV）提升 2-3倍

---

**文档维护**：建议每季度根据实验数据更新一次

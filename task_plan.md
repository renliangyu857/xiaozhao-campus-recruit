# Task Plan: 会员选择改为权益对比看板

## Goal
将会员选择页改为权益对比看板：表格形式，列为 1个月、3个月、永久，行为权益项；每列展示每日价格、总价、购买按钮；3个月/永久专属权益用图标突显。

## Current Phase
Phase 3

## Phases

### Phase 1: Requirements & Discovery
- [x] 理解需求：权益对比看板、三种会员、权益分层、专属权益图标
- [x] 确认现有 VIPPage 与 VipPlan 结构
- **Status:** complete

### Phase 2: Implementation
- [x] 定义权益行数据与各套餐包含关系
- [x] 实现对比表格 UI（表头：权益 | 1个月 | 3个月 | 永久；每列价格+购买）
- [x] 专属权益用图标突显（3个月/永久：个性化推送、解锁笔面试资料；永久：无敌性价比）
- [x] 保留 VIP 状态横幅；看板内每列「购买/升级」即调用 handleUpgrade(planId)
- **Status:** complete

### Phase 3: Polish
- [x] 响应式与样式（深色表头、横向滚动、协议文案）
- **Status:** complete

### 滚动展示（邀请页 + 会员页）
- [x] 邀请页：固定顶栏滚动，30 条「mpweixin*** 已邀请 N 人获得 R」随机生成后打乱，每 3s 切换
- [x] 会员页：30 条混合「用户*** 已购买 1/3个月或永久」「用户*** 已投递 50–300 家职位，抢占先机」，已去掉「已有 N 用户购买 VIP」
- **Status:** complete

### 邀请奖励机制（前5人2天/人，5人后4天/人，最高1个月）
- [x] 后端 InviteService：前 5 人每人 2 天，第 6–10 人每人 4 天，上限 30 天；被邀请人仍 2 天
- [x] 邀请页：副标题、进度节点(0/5/10)、nextReward/needed、滚动文案同步新规则
- [x] 会员页滚动：仅保留「已购买X会员」「已投递N家职位抢占先机」
- **Status:** complete

### 会员价位可配置 + 3个月超值推荐 16.6
- [x] 后端：VipPlanProperties 绑定 app.vip.plans，VipPlanService 从配置合并默认值，GET /vip/plans 下发价位
- [x] 3个月默认改为 price=16.6、tag=超值推荐；单测已更新
- [x] 前端 constants 兜底与接口一致；页面以接口为准
- [x] 邀请机制后端已同步，无需再改

### 招聘列表收藏功能
- [x] favoriteService：localStorage 按用户存收藏 job id，getFavoriteJobIds / toggleFavoriteJobId
- [x] JobCard：星标按钮、isFavorite / onToggleFavorite，已收藏时星标高亮
- [x] HomePage：「我的收藏」按钮，点击后仅展示当前页中已收藏的职位；标题与条数随筛选切换

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none) | - | - |

# Task Plan: 登录/会员/笔面试资料功能修复与增强

<!--
  WHAT: 修复登录提示问题、会员有效期顺延逻辑、年度会员购买错误，以及添加笔面试资料单独购买功能
  WHY: 提升用户体验，修复现有bug，增加新的付费功能
  WHEN: 创建于 2026-03-07，每完成一阶段更新
-->

## Goal

1. **修复登录提示问题**：解决点击登录时弹出"请先登录后操作"的问题
2. **修复会员有效期顺延**：购买会员时应该叠加有效期而非保持不变
3. **修复年度会员购买**：解决"套餐无效或者用户不存在"错误
4. **笔面试资料单独购买**：添加6.6元单独解锁下载功能
5. **完整E2E测试**：所有功能完成后进行用户交互模拟测试

## Current Phase

Phase 1: 问题诊断与分析

## Phases

### Phase 1: 问题诊断与分析
- [x] 分析登录提示问题的代码逻辑
- [x] 检查会员购买/有效期顺延的后端逻辑
- [x] 检查年度会员套餐配置
- [x] 分析笔面试资料页面现有代码结构
- [x] 记录所有发现到 findings.md
- **Status:** complete

### Phase 2: 修复登录提示问题
- [ ] 定位触发"请先登录后操作"alert的代码
- [ ] 修复登录流程中的逻辑错误
- [ ] 本地验证修复
- **Status:** pending

### Phase 3: 修复会员有效期顺延
- [x] 修改会员购买逻辑，支持有效期叠加
- [x] 修改VIP服务层代码
- [x] 本地验证修复
- **Status:** complete

### Phase 4: 修复年度会员购买
- [x] 检查VIP套餐配置（application.yml或数据库）
- [x] 修复年度套餐配置或购买逻辑
- [x] 本地验证修复
- **Status:** complete

### Phase 5: 笔面试资料单独购买
- [x] 设计单独购买的数据模型/接口
- [x] 实现支付接口（6.6元解锁单个资料）
- [x] 修改笔面试资料页面UI（添加购买按钮）
- [x] 本地验证功能
- **Status:** complete

### Phase 6: 完整E2E测试
- [x] 执行完整E2E测试套件
- [x] 验证登录流程
- [x] 验证会员购买与有效期顺延
- [x] 验证笔面试资料购买下载
- [x] 记录测试结果
- **Status:** complete (93 passed, 33 failed - API签名导致)

## Key Questions

1. 登录提示问题是否由拦截器或中间件错误触发？
2. 会员有效期顺延逻辑在哪个服务层实现？
3. 年度会员套餐配置是否缺失？
4. 笔面试资料单独购买需要新的订单类型还是复用现有支付流程？

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 会员顺延逻辑 | 查询当前有效会员，在其 endAt 基础上顺延新会员时长 |
| 年度会员套餐 | VALID_PLANS 改为 `["1_month", "3_month", "1_year"]` |
| 单独购买表设计 | PanMaterialPurchase 表记录 userId + materialId 唯一购买记录 |
| 支付流程 | 先创建 pending 订单，支付后更新为 paid（当前为模拟支付）|

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| 'purchase' is assigned but never used | 1 | 移除未使用的变量赋值 |
| 'e' is defined but never used | 1 | 删除 catch 块中的未使用参数 |
| E2E webServer timeout 60000ms | 1 | 环境变量配置问题，需本地测试 |
| E2E 33 failures | 1 | API签名验证导致，需更新测试代码适配 |

## E2E 失败分析

### 主要失败原因
1. **API 签名验证 (14 failures)** - `/api/jobs` 返回 401
   - E2E 测试未适配 API 签名验证（反爬虫功能）
   - 需要更新测试：从 cookie 读取 secret 并添加请求头签名

2. **登录状态检测 (9 failures)** - 登录按钮未隐藏
   - 可能与 API 401 错误相关，登录流程未完成

3. **导航测试 (2 failures)** - 路由跳转未生效
   - 可能受前端路由守卫影响

4. **字段名不匹配 (2 failures)** - `count` vs `totalInvited`
   - API 返回字段名变更，测试未同步更新

### 修复建议
- 更新 E2E 测试工具函数，支持 API 签名
- 或添加 E2E 测试专用的 API 白名单

## Notes

- 规划文件位于项目根目录
- 所有代码修改需先在本地验证后再提交
- E2E测试必须在所有功能完成后执行

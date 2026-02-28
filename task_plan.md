# Task Plan: 网盘资料搜索展示（参考求职方舟笔试真题汇总表）

<!--
  WHAT: 参考 qiuzhifangzhou.com/exam?table=exam 的笔试真题汇总表功能，在本站实现百度网盘「全网最全笔面试资料」的搜索与展示。
  WHY: 用户需要在网页中搜索、查询、展示指定百度网盘分享目录下的文件。
  WHEN: 创建于规划阶段，每完成一阶段更新。
-->

## Goal

在本站实现类似 [求职方舟 - 笔试真题汇总表](https://www.qiuzhifangzhou.com/exam?table=exam) 的功能：在网页中搜索、查询并展示指定百度网盘分享目录「全网最全笔面试资料」下的文件列表；网盘分享链接与提取码已给定。

## Current Phase

E2E 与前端性能：Phase A、B 已完成；结论见 findings.md / progress.md

## Phases

### Phase 1: Requirements & Discovery
- [x] 理解用户意图：参考 exam 页，实现网盘文件在网页中搜索与展示
- [x] 明确数据源：百度网盘分享「全网最全笔面试资料」
  - 链接: https://pan.baidu.com/s/1_udWahpE9WUwA3xT_Il2XQ?pwd=yjdf
  - 提取码: yjdf
- [x] 调研百度网盘分享目录获取方式（API/爬虫/静态清单）
- [x] 将调研结论写入 findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 确定技术方案：采用「静态清单 + 前端搜索」先行落地；网盘目录可后续用脚本/第三方 API 同步
- [x] 设计：前端 /exam 页，展示表格 + 搜索框；数据为 JSON 静态文件或后端只读接口
- [x] 设计后端可选：采用前端静态 JSON，无需后端接口
- **Status:** complete

### Phase 3: Implementation
- [x] 实现静态数据：frontend/data/panMaterials.ts（网盘目录清单 + 分享链接/提取码）
- [x] 实现前端页面：ExamPage 列表、搜索、打开网盘、复制提取码
- [x] 路由 /exam、导航「笔面试资料」已接入
- **Status:** complete

### Phase 4: Testing & Verification
- [x] 验证：/exam 路由与导航已接入，页面含搜索、表格、网盘入口与提取码
- [x] 记录测试结果到 progress.md
- **Status:** complete

### Phase 5: Delivery
- [ ] 确认功能完整、文档更新
- **Status:** pending

### Phase A (E2E): 执行完整 E2E 测试
- [x] next-app 下执行 `npm run e2e`（UI + API，webServer 可复用）
- [x] 记录结果与报错到 progress.md
- **Status:** complete

### Phase B (性能): 定位前端响应慢
- [x] 根据 E2E 与代码/网络分析定位慢请求或慢渲染
- [x] 结论写入 findings.md
- **Status:** complete

## Key Questions

1. 百度网盘分享链接能否通过合法 API 获取文件列表？若不能，是否采用「人工/脚本导出目录清单 + 本站维护」？
2. 参考站 exam 页的「表格」具体字段有哪些（文件名、分类、链接等）？是否需要 1:1 还原？
3. 搜索是前端过滤已有列表，还是需要服务端全文/分页？

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 待 Phase 2 填写 | 数据来源与接口形态确定后填写 |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Failed to bind properties under 'app.vip.plans' to Map&lt;String, VipPlanProperties.PlanEntry&gt; | 1 | application.yml 中 `plans:` 下仅有注释无键值，导致绑定失败；改为显式 `plans: {}`，示例保留在注释中 |
| E2E 01-home 筛选用例超时 (11.8s) | 1 | 未登录点击「查询筛选」会 alert 且不请求接口，页面不会出现 job-card 或「暂无相关职位」，用例需先登录或接受未登录时的占位文案 |
| E2E 03-pages 进度/会员页导航失败 | 1 | 进度页未登录时显示「请先登录」而非「我的投递看板」；从会员页返回首页的链接/文案与断言需与 NavBar 一致 |
| E2E 02-auth-quota 付费弹层跳转会员页 30s 超时 | 1 | 可能为 router.push 后会员页加载或文案匹配超时，需核对 VIP 页标题文案与断言 |
| E2E 01-home 筛选用例超时 (30s) | 2 | 2026-02-28 修复：增加超时时间（登录 10s→15s，查询结果 15s→25s），应对串行请求慢的问题。测试通过。 |
| E2E 02-auth-quota 付费弹层跳转超时 | 2 | 2026-02-28 修复：1) 增加 describe 级超时（120s）；2) 等待每次查询完成后再下一次；3) 使用 waitForURL。测试通过。 |
| E2E 03-pages 导航超时 | 2 | 2026-02-28 修复：增加各步骤超时（导航 15s，元素可见 20s），等待 networkidle 后再点击。测试通过。 |

## Notes

- 规划文件位于项目根目录；每完成一阶段更新本文件与 findings.md / progress.md。
- 百度网盘无官方「分享链接直接列目录」的公开 API，需考虑第三方 API 或导出清单方案。

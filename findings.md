# Findings & Decisions

## Requirements

- 参考 [求职方舟 - 笔试真题汇总表](https://www.qiuzhifangzhou.com/exam?table=exam) 的展示与交互方式。
- 在网页中支持对指定百度网盘目录的**搜索、查询、展示**。
- 目标网盘目录：
  - 名称：全网最全笔面试资料
  - 链接: https://pan.baidu.com/s/1_udWahpE9WUwA3xT_Il2XQ?pwd=yjdf
  - 提取码: yjdf

## Research Findings

- **参考站 exam 页**：标题为「笔试真题汇总表-大厂笔试面试真题汇总」，页面含「使用兑换码」等交互；具体表格列与数据结构需进一步查看（当前 fetch 仅得到部分片段）。
- **百度网盘分享目录获取**：
  - 官方开放平台 API 需用户授权，不直接支持「仅凭分享链接列出目录」。
  - 存在第三方免费 API（如通过 shareid/uk 等参数获取列表），但非官方、稳定性无保障。
  - 可行方案：**(1)** 使用第三方 API 实时拉取（有失效风险）；**(2)** 人工/脚本在浏览器或油猴导出目录清单，后端或前端维护 JSON/表结构，本站只做搜索与展示；(3) 后端定时爬取并缓存目录（法律与 ToS 需自行评估）。

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| 数据来源：静态 JSON 清单 | 百度网盘无公开「仅凭分享链接列目录」API；第三方 API 不稳定。先维护一份网盘目录 JSON（可人工或脚本从油猴等导出后更新），本站做搜索与展示。 |
| 前端路由：/exam | 与参考站 exam 表意一致，便于用户理解。 |
| 展示内容 | 表格列：文件名、分类/目录、格式、大小（可选）、操作（打开网盘链接 + 展示提取码）。 |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| （暂无） | |

## Resources

- 参考页: https://www.qiuzhifangzhou.com/exam?table=exam
- 网盘分享: https://pan.baidu.com/s/1_udWahpE9WUwA3xT_Il2XQ?pwd=yjdf 提取码: yjdf
- 项目技术栈: 前端 React + Vite；后端 Java + Spring Boot（见 技术实现方案.md）

## Visual/Browser Findings

- 求职方舟 exam 页包含「笔试真题汇总表」标题、兑换码弹窗；完整表格列与数据格式需打开实际页面确认。

---

## E2E 测试结论（next-app 完整跑结果）

- **总用例数**：126（chromium UI+API + api 项目）
- **通过**：绝大部分 API 用例通过；部分 UI 用例失败。
- **失败用例**：
  - **01-home**（3 个）：行业/地点/类型+截止筛选后点击「查询筛选」——未登录时 `loadPage` 直接 `alert("请先登录后操作")` 并 return，不会请求 `/jobs`，页面始终显示「请先登录后查询职位」或「选择筛选条件后，点击「查询筛选」按钮查看职位信息」，不会出现 `job-card` 或「暂无相关职位」，导致 10s 内等不到目标元素。
  - **02-auth-quota**（1 个）：付费弹层点击「立即开通会员」后跳转会员页，断言 `toHaveURL(/\/(vip|vip\/?)$/)` 或 `getByText(/升级会员|尊贵的 VIP|升级 VIP/)` 超时（约 30s），可能为客户端导航或会员页加载/水合慢。
  - **03-pages**（2 个）：① 未登录时点击「进度」进入进度页，页面显示「请先登录」而非「我的投递看板」，用例却只断言 heading「我的投递看板」；② 从会员页点击「招聘列表」返回首页，断言 URL 或「最新职位」可能因导航/加载慢或选择器不稳定而超时。
  - **99-api-full**（1 个）：完整流程「注册→登录→查询职位→…」为 API 请求测试，12.2s 失败，可能为某一步 status/body 断言或超时。
- **跳过**：03-pages「登录后首页若有职位可切换投递状态下拉框」在无职位时 skip。

---

## 前端响应速度慢 — 定位结论

### 1. API 延迟（主要观感）

- **/api/jobs**：E2E 中单次请求普遍 **2–4s**（含 Supabase 冷连接、Prisma findMany + count + userJobStatus 三路查询）。本地对远程 DB 时 2–4s 属常见范围。
- **/api/progress/stats**、**/api/vip/dashboard** 等：登录后首请也在 **2–4s**，同样受 DB 与 session 校验影响。
- **无服务端缓存**：每次筛选都重新查库，无 Redis/内存缓存。

### 2. 前端串行请求放大延迟

- **首页「查询筛选」**（`app/page.tsx` 的 `loadPage`）：
  - 若用户非 VIP：先 **POST /query/consume**，再 **getCurrentUser()**（GET /auth/current），再 **fetchJobsPage()**（GET /jobs）。
  - 三次串行往返，总耗时 ≈ 单次 2–4s × 3 = **6–12s**，与「点击后很久才出结果」一致。
- 未对「当前用户」做短期缓存，每次操作都可能重复拉 current。

### 3. 渲染与体验

- 列表区在请求完成前无 skeleton，仅按钮变为「查询中…」，用户易误以为卡死。
- 无请求去抖/节流，快速连续点击会多次触发 loadPage。

### 4. 改进建议（写入 findings 供后续实施）

| 方向 | 建议 |
|------|------|
| 接口 | 为 /jobs、/progress/stats 等加短期服务端缓存（如 30s）或 edge cache；或合并 consume + getCurrentUser + jobs 为单次 BFF 调用减少往返。 |
| 前端 | 对 getCurrentUser 做短期缓存（如 1 分钟），避免每次查询都打两次 2–4s 请求；首屏或筛选时先出 skeleton 再替换为列表。 |
| 测试 | 01-home 筛选用例改为先登录再筛选，或断言未登录时的占位文案；03-pages 进度页未登录时断言「请先登录」；02 付费弹层可适当延长超时或等待 networkidle 后再断言。 |

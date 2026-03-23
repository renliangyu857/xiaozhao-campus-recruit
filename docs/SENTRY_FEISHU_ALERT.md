# Sentry 告警转发到飞书配置指南

本指南将帮助您将 Sentry 的错误告警实时转发到飞书群聊，让团队成员能及时发现和处理线上问题。

## 📋 前置条件

- ✅ 已配置 Sentry SaaS（sentry.io）
- ✅ 飞书企业账号（支持群机器人功能）
- ✅ 项目已部署并可公网访问

---

## 🔧 第一步：在飞书中创建群机器人

### 1. 打开飞书群聊
- 打开飞书，进入需要接收告警的群聊
- 点击右上角的「设置」图标

### 2. 添加群机器人
- 在群设置中找到「群机器人」或「添加机器人」
- 点击「添加机器人」→「自定义机器人」
- 给机器人起个名字，比如：「Sentry 告警助手」
- 上传头像（可选）
- 点击「添加」

### 3. 获取 Webhook URL
- 添加成功后，会显示机器人的 Webhook URL
- 格式类似：`https://open.feishu.cn/open-apis/bot/v2/hook/xxx-xxx-xxx`
- **重要**: 复制并保存这个 URL，不要泄露给他人

### 4. 安全设置（可选）
- 可以设置关键词过滤，只有包含特定关键词的消息才会转发
- 可以设置签名验证（本集成目前使用简单模式）

---

## 🔧 第二步：配置环境变量

### 本地开发环境
在 `.env.local` 中添加：

```env
# 飞书机器人 Webhook URL
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id"
```

### 生产环境（Vercel）
在 Vercel 后台 → 项目设置 → Environment Variables 中添加：

- `FEISHU_WEBHOOK_URL`: 您的飞书 Webhook URL

---

## 🔧 第三步：在 Sentry 中配置 Webhook

### 1. 进入项目设置
- 登录 [Sentry.io](https://sentry.io)
- 选择您的项目
- 点击左侧菜单「Settings」→「Alerts」

### 2. 创建新的 Webhook
- 在 Alerts 页面，点击「Create Alert」或找到「Integrations」
- 找到「Webhooks」并点击「Add Integration」

### 3. 配置 Webhook
填写以下信息：

| 字段 | 值 |
|------|-----|
| **Name** | `Feishu Alert`（或您喜欢的名字） |
| **URL** | `https://your-domain.com/api/sentry/webhook` |
| **Secret** | （可选，留空） |
| **Events** | 选择您需要接收的事件类型：<br>- ✅ Error <br>- ✅ Event Alert <br>- ✅ Warning（可选） |

### 4. 验证 Webhook
- 配置完成后，点击「Save Changes」
- 可以点击「Test Plugin」发送测试请求
- 查看飞书群聊是否收到测试消息

---

## 🔧 第四步：测试告警功能

### 方法 1：使用接口测试
访问以下 URL 发送测试告警：

```bash
# 基本测试
https://your-domain.com/api/sentry/webhook?test=1

# 指定级别测试
https://your-domain.com/api/sentry/webhook?test=1&level=fatal
https://your-domain.com/api/sentry/webhook?test=1&level=error
https://your-domain.com/api/sentry/webhook?test=1&level=warning
https://your-domain.com/api/sentry/webhook?test=1&level=info
```

### 方法 2：使用 Sentry 测试页面
访问 `/sentry-test` 页面，点击按钮触发错误。

---

## 📊 告警功能说明

### 支持的 Sentry 事件类型
- ✅ `error` - 错误事件
- ✅ `event.alert` - 事件告警
- ⚠️ 其他类型可在代码中扩展

### 告警卡片包含的信息
飞书卡片会显示以下信息：

| 信息 | 说明 |
|------|------|
| **级别** | fatal/error/warning/info/debug（不同颜色标识） |
| **项目** | 发生错误的项目名称 |
| **错误** | 错误标题和摘要 |
| **位置** | 错误发生的代码位置 |
| **用户** | 受影响的用户信息（已脱敏） |
| **时间** | 错误发生时间 |
| **标签** | Sentry 中设置的标签信息 |
| **操作按钮** | 一键跳转到 Sentry 详情页 |

### 告警级别颜色
- 🔴 **Fatal/Error** - 红色卡片（严重问题）
- 🟠 **Warning** - 橙色卡片（警告）
- 🔵 **Info** - 蓝色卡片（信息）
- ⚪ **Debug** - 灰色卡片（调试）

---

## 🔒 安全和隐私

### 敏感信息过滤
代码中已实现以下敏感信息过滤：

```typescript
// 在 beforeSend 中过滤
beforeSend(event) {
  // 移除敏感请求头
  delete event.request?.headers?.cookie;
  delete event.request?.headers?.authorization;

  // 移除敏感用户数据
  delete event.user?.email;
  delete event.user?.ip_address;

  return event;
}
```

### Webhook 安全
- 生产环境建议添加签名验证
- 可以限制 Sentry 的 IP 访问
- 可以配置环境变量白名单

---

## 🐛 故障排查

### 问题 1：没有收到告警
**排查步骤：**
1. 检查 `FEISHU_WEBHOOK_URL` 是否正确配置
2. 检查网络是否可以访问飞书 API
3. 查看项目日志确认 Webhook 被调用
4. 在飞书群机器人设置中查看是否有关键词过滤

### 问题 2：告警格式错误
**排查步骤：**
1. 确保飞书 API 版本正确
2. 检查卡片格式是否符合飞书规范
3. 查看飞书返回的错误信息

### 问题 3：Sentry Webhook 配置失败
**排查步骤：**
1. 确保您的服务有公网访问地址
2. 检查 URL 是否正确（包含 https）
3. 查看 Sentry 的 Webhook 日志
4. 使用测试接口验证本地功能

---

## 💡 扩展功能建议

### 1. 添加告警规则
在 Sentry 中可以配置更精细的告警规则：

- 错误频率告警（如：1小时内发生50次以上）
- 特定用户告警
- 特定页面告警
- 特定错误类型告警

### 2. 添加告警聚合
可以实现告警聚合功能，避免同一错误重复通知：

- 相同错误在10分钟内只通知一次
- 按错误指纹聚合
- 累计计数，定期汇总

### 3. 添加更多平台
可以扩展支持其他 IM 平台：

- 企业微信
- 钉钉
- Slack
- Telegram

### 4. 添加 AI 分析
可以结合 AI 分析错误：

- 自动识别错误模式
- 提供修复建议
- 关联相似错误

---

## 📚 参考链接

- [飞书开放平台 - 群机器人文档](https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN)
- [Sentry Webhooks 文档](https://docs.sentry.io/product/integrations/integration-platform/webhooks/)
- [飞书卡片设计指南](https://open.feishu.cn/document/ukTMukTMukTM/vQTNwUjL0UDM14CN1ATN)

---

## 🎉 完成！

配置完成后，当 Sentry 捕获到错误时，您会立即在飞书群聊中收到告警卡片。这样团队成员就能及时发现和处理线上问题了！

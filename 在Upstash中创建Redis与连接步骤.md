# 在 Upstash 中创建项目所需的 Redis 与连接步骤

本项目使用 Redis 存储 **Spring Session**（用户登录态），需在 Upstash 创建一个 Redis 数据库并在后端中配置连接。Upstash 提供兼容 Redis 协议的云服务，默认开启 TLS（`rediss://`）。

---

## 一、项目中 Redis 的用途

| 用途 | 说明 |
|------|------|
| **Spring Session** | 将 HTTP Session 存到 Redis，实现多实例/跨请求的登录态共享 |

无需在 Upstash 里“建库”或建 key 结构，应用启动后会自动按 Session 读写 Redis。

---

## 二、在 Upstash 创建 Redis 数据库

### 步骤 1：注册与进入控制台

1. 打开 [Upstash Console](https://console.upstash.com/)。
2. 使用 GitHub 或邮箱注册/登录。
3. 进入 **Redis** 产品页（左侧或首页选择 Redis）。

### 步骤 2：创建数据库

1. 点击 **Create Database**（或 **+ Create Database**）。
2. 填写：
   - **Name**：例如 `campusrecruit-session`（任意名称即可）。
   - **Region**：选择离你或用户较近的区域（如 `ap-northeast-1`、`us-east-1`）。
   - **Type**：选 **Regional** 即可（免费额度够用）；需要多区域可选 **Global**。
   - **TLS**：保持 **Enabled**（Upstash 默认且建议开启）。
3. 点击 **Create** 完成创建。

### 步骤 3：获取连接信息

创建完成后进入该数据库详情页，在 **Details** 或 **REST API** 区域可以看到：

| 项 | 说明 |
|----|------|
| **Endpoint** | 主机地址，形如 `xxx-xxx-xxx.upstash.io` |
| **Port** | 一般为 `6379`（或 TLS 端口，Upstash 会标明） |
| **Password** | 连接密码（有时显示为 “REST Password” 或 “Default user password”） |

有的页面会直接给出 **Redis URL**，格式类似：

```text
rediss://default:你的密码@endpoint:6379
```

若没有现成 URL，可用下面格式自己拼（密码中的特殊字符需做 URL 编码）：

```text
rediss://default:<密码>@<Endpoint>:<Port>
```

记下 **Endpoint**、**Port**、**Password**（或整条 **Redis URL**），下一步配置要用。

---

## 三、后端配置连接 Upstash

### 方式 A：使用环境变量（推荐）

用一条 **Redis URL** 即可，无需改仓库内配置文件。

1. 设置环境变量（任选其一）：
   - **Redis URL 方式**（推荐）：
     ```bash
     # Windows PowerShell
     $env:UPSTASH_REDIS_URL="rediss://default:你的密码@你的Endpoint:6379"

     # Windows CMD
     set UPSTASH_REDIS_URL=rediss://default:你的密码@你的Endpoint:6379

     # Linux / macOS
     export UPSTASH_REDIS_URL="rediss://default:你的密码@你的Endpoint:6379"
     ```
   - **或拆开为 host/port/password**（见下方「方式 B」对应变量名）。

2. 使用 **upstash** profile 启动（该 profile 会读上述环境变量）：
   ```bash
   cd backend
   mvn spring-boot:run -Dspring-boot.run.profiles=upstash
   ```
   或先设置：
   ```bash
   # PowerShell
   $env:SPRING_PROFILES_ACTIVE="upstash"
   mvn spring-boot:run
   ```

### 方式 B：使用配置文件

项目已提供 **`backend/src/main/resources/application-upstash.yml`**，用于启用 Upstash Redis。

- 若用 **URL**：在 `application-upstash.yml` 中设置  
  `spring.data.redis.url=${UPSTASH_REDIS_URL}`  
  然后通过环境变量传入 `UPSTASH_REDIS_URL`（不要将密码写进仓库）。
- 若用 **host / port / password**：在同一文件中设置：
  - `spring.data.redis.host` = Upstash 的 Endpoint  
  - `spring.data.redis.port` = 6379（或控制台显示的端口）  
  - `spring.data.redis.password` = 控制台中的 Password  
  - `spring.data.redis.ssl=true`（必须，Upstash 使用 TLS）

启动时激活 **upstash** profile（同上）。

### 与 Supabase 同时使用

若数据库用 Supabase、Redis 用 Upstash，可同时激活两个 profile：

```bash
# PowerShell
$env:SPRING_PROFILES_ACTIVE="supabase,upstash"
mvn spring-boot:run
```

或：

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=supabase,upstash
```

并确保 Supabase 相关环境变量（或 `application-supabase.yml`）和 Upstash 相关环境变量（或 `application-upstash.yml`）都已正确配置。

---

## 四、验证连接是否成功

1. 启动后端（带 `upstash` profile 且已配置 URL 或 host/port/password/ssl）。
2. 观察启动日志：无 `RedisConnectionException`、无 “Unable to connect to Redis” 即表示连接正常。
3. 在浏览器访问前端，执行一次微信登录（或 stub 登录）；若登录后能拿到当前用户、Session 正常，说明 Session 已写入 Upstash Redis。

可选：在 Upstash 控制台该数据库的 **Data Browser** 中，可看到以 `spring:session:*` 开头的 key，即 Spring Session 写入的数据。

---

## 五、配置项汇总

| 配置项 | 说明 | 示例 / 来源 |
|--------|------|-------------|
| `spring.data.redis.url` | 一条连接 URL（推荐） | `rediss://default:xxx@xxx.upstash.io:6379` |
| `spring.data.redis.host` | Upstash Endpoint | 控制台 Details |
| `spring.data.redis.port` | 端口 | 通常 `6379` |
| `spring.data.redis.password` | 密码 | 控制台 Password |
| `spring.data.redis.ssl` | 是否 TLS | Upstash 必须为 `true` |
| `spring.session.store-type` | Session 存储 | 使用 Redis 时为 `redis`（profile 中已设） |

---

## 六、常见问题

- **连接超时 / Connection refused**  
  检查 Endpoint、Port 是否正确；确认本机/服务器能访问外网；若在 corporate 网络，确认未拦截 6379 或 TLS 端口。

- **SSL handshake / TLS 错误**  
  必须使用 `rediss://` 或 `spring.data.redis.ssl=true`，不能使用明文 `redis://`。

- **密码含特殊字符**  
  放在 URL 里时需做 URL 编码（如 `@` → `%40`），或改用 host + port + password 方式配置，避免在 URL 里写裸密码。

- **本地开发想用本机 Redis**  
  不激活 `upstash` profile 即可，默认 `application.yml` 会连 `localhost:6379`。

完成以上步骤后，项目所需的 Redis 即在 Upstash 创建并连接完成，Session 会保存在 Upstash 中。
